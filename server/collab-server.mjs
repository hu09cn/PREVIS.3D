import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || process.env.COLLAB_PORT || 3001);
const HOST = process.env.HOST || '0.0.0.0';
const ROOM_STORE_DIR = path.resolve(
  process.env.COLLAB_STORE_DIR || path.join(__dirname, '.collab-rooms')
);
const DIST_DIR = path.resolve(process.env.COLLAB_STATIC_DIR || path.join(__dirname, '..', 'dist'));
const WS_MAGIC = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
};

fs.mkdirSync(ROOM_STORE_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Minimal Zero-Dependency RFC 6455 WebSocket Framing
// ---------------------------------------------------------------------------

function encodeWsFrame(opcode, payloadBuf) {
  const len = payloadBuf.length;
  let header;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x80 | opcode;
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, payloadBuf]);
}

function sendWsText(socket, obj) {
  if (!socket || socket.destroyed || !socket.writable) return false;
  try {
    const json = typeof obj === 'string' ? obj : JSON.stringify(obj);
    const frame = encodeWsFrame(0x1, Buffer.from(json, 'utf8'));
    socket.write(frame);
    return true;
  } catch {
    return false;
  }
}

function sendWsControl(socket, opcode, payload = Buffer.alloc(0)) {
  if (!socket || socket.destroyed || !socket.writable) return;
  try {
    socket.write(encodeWsFrame(opcode, payload));
  } catch {
    // Ignore broken pipe on control frame
  }
}

function attachWebSocket(socket, onMessage, onClose) {
  let buffer = Buffer.alloc(0);
  let fragmentedOpcode = null;
  let fragmentedChunks = [];
  let closed = false;

  const closeCleanly = () => {
    if (closed) return;
    closed = true;
    try {
      socket.destroy();
    } catch {
      // ignore
    }
    onClose();
  };

  socket.setNoDelay(true);
  socket.isAlive = true;

  socket.on('data', (chunk) => {
    buffer = buffer.length === 0 ? chunk : Buffer.concat([buffer, chunk]);
    // Cap buffered single-frame size to 24 MB to protect server memory
    if (buffer.length > 24 * 1024 * 1024) {
      sendWsControl(socket, 0x8);
      closeCleanly();
      return;
    }

    while (buffer.length >= 2) {
      const byte1 = buffer[0];
      const byte2 = buffer[1];
      const fin = (byte1 & 0x80) !== 0;
      const opcode = byte1 & 0x0f;
      const masked = (byte2 & 0x80) !== 0;
      let payloadLen = byte2 & 0x7f;
      let offset = 2;

      if (payloadLen === 126) {
        if (buffer.length < offset + 2) break;
        payloadLen = buffer.readUInt16BE(offset);
        offset += 2;
      } else if (payloadLen === 127) {
        if (buffer.length < offset + 8) break;
        const bigLen = buffer.readBigUInt64BE(offset);
        if (bigLen > BigInt(20 * 1024 * 1024)) {
          sendWsControl(socket, 0x8);
          closeCleanly();
          return;
        }
        payloadLen = Number(bigLen);
        offset += 8;
      }

      const maskLen = masked ? 4 : 0;
      if (buffer.length < offset + maskLen + payloadLen) break;

      const maskKey = masked ? buffer.subarray(offset, offset + 4) : null;
      offset += maskLen;

      const rawPayload = buffer.subarray(offset, offset + payloadLen);
      buffer = buffer.subarray(offset + payloadLen);

      let payload;
      if (masked && maskKey) {
        payload = Buffer.allocUnsafe(payloadLen);
        for (let i = 0; i < payloadLen; i += 1) {
          payload[i] = rawPayload[i] ^ maskKey[i & 3];
        }
      } else {
        payload = rawPayload;
      }

      if (opcode === 0x8) {
        sendWsControl(socket, 0x8);
        closeCleanly();
        return;
      }
      if (opcode === 0x9) {
        sendWsControl(socket, 0xA, payload);
        continue;
      }
      if (opcode === 0xA) {
        socket.isAlive = true;
        continue;
      }

      if (opcode === 0x1 || opcode === 0x2) {
        if (fin) {
          if (opcode === 0x1) {
            onMessage(payload.toString('utf8'));
          }
        } else {
          fragmentedOpcode = opcode;
          fragmentedChunks = [payload];
        }
      } else if (opcode === 0x0 && fragmentedOpcode !== null) {
        fragmentedChunks.push(payload);
        if (fin) {
          const full = Buffer.concat(fragmentedChunks);
          const origOpcode = fragmentedOpcode;
          fragmentedOpcode = null;
          fragmentedChunks = [];
          if (origOpcode === 0x1) {
            onMessage(full.toString('utf8'));
          }
        }
      }
    }
  });

  socket.on('error', closeCleanly);
  socket.on('close', closeCleanly);
  socket.on('end', closeCleanly);
}

// ---------------------------------------------------------------------------
// Room State + World Op Application (Models, Characters, Buildings, Terrain)
// ---------------------------------------------------------------------------

const ARRAY_COLLECTIONS = new Set([
  'assets',
  'characters',
  'buildings',
  'scatteredProps',
  'customModels',
  'gltfModels',
  'paintedRoads',
  'paintedFences',
]);

const OBJECT_FIELDS = new Set([
  'road',
  'heroCompound',
  'districts',
  'environment',
  'lastWorldPlan',
]);

function applyWorldSyncOps(world, ops) {
  if (!world || !Array.isArray(ops) || ops.length === 0) return world;
  const next = { ...world };

  for (const op of ops) {
    if (!op || typeof op !== 'object') continue;
    if (op.op === 'upsert_items' && ARRAY_COLLECTIONS.has(op.collection)) {
      const prevArr = Array.isArray(next[op.collection]) ? [...next[op.collection]] : [];
      const indexById = new Map();
      prevArr.forEach((item, idx) => {
        if (item && item.id) indexById.set(item.id, idx);
      });
      for (const item of op.items || []) {
        if (!item || !item.id) continue;
        const existingIdx = indexById.get(item.id);
        if (existingIdx !== undefined) {
          prevArr[existingIdx] = item;
        } else {
          indexById.set(item.id, prevArr.length);
          prevArr.push(item);
        }
      }
      next[op.collection] = prevArr;
    } else if (op.op === 'delete_items' && ARRAY_COLLECTIONS.has(op.collection)) {
      const delSet = new Set(op.ids || []);
      const prevArr = Array.isArray(next[op.collection]) ? next[op.collection] : [];
      next[op.collection] = prevArr.filter((item) => !item || !delSet.has(item.id));
    } else if (op.op === 'set_terrain_meta' && op.patch && typeof op.patch === 'object') {
      next.terrain = {
        ...(next.terrain || {}),
        ...op.patch,
      };
    } else if (op.op === 'patch_terrain_grid') {
      const prevTerrain = { ...(next.terrain || {}) };
      const res = Number(op.sculptGridRes || prevTerrain.sculptGridRes || 128);
      const total = (res + 1) * (res + 1);
      prevTerrain.sculptGridRes = res;

      if (Array.isArray(op.sculptChanges) && op.sculptChanges.length > 0) {
        const deltas = Array.isArray(prevTerrain.sculptDeltas) && prevTerrain.sculptDeltas.length === total
          ? [...prevTerrain.sculptDeltas]
          : new Array(total).fill(0);
        for (const pair of op.sculptChanges) {
          if (!Array.isArray(pair) || pair.length < 2) continue;
          const idx = pair[0] | 0;
          if (idx >= 0 && idx < total) deltas[idx] = Number(pair[1]) || 0;
        }
        prevTerrain.sculptDeltas = deltas;
      }

      if (Array.isArray(op.materialChanges) && op.materialChanges.length > 0) {
        const mats = Array.isArray(prevTerrain.paintMaterials) && prevTerrain.paintMaterials.length === total
          ? [...prevTerrain.paintMaterials]
          : new Array(total).fill(0);
        for (const pair of op.materialChanges) {
          if (!Array.isArray(pair) || pair.length < 2) continue;
          const idx = pair[0] | 0;
          if (idx >= 0 && idx < total) mats[idx] = Number(pair[1]) || 0;
        }
        prevTerrain.paintMaterials = mats;
      }

      next.terrain = prevTerrain;
    } else if (op.op === 'set_field' && OBJECT_FIELDS.has(op.field)) {
      next[op.field] = op.value;
    }
  }

  return next;
}

function sanitizeRoomId(raw) {
  return String(raw || 'default')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 48) || 'default';
}

const rooms = new Map();

function getRoomSnapshotPath(roomId) {
  return path.join(ROOM_STORE_DIR, `${sanitizeRoomId(roomId)}.json`);
}

function loadOrCreateRoom(rawRoomId) {
  const roomId = sanitizeRoomId(rawRoomId);
  let room = rooms.get(roomId);
  if (room) return room;

  let world = null;
  let revision = 0;
  let chatHistory = [];
  const snapPath = getRoomSnapshotPath(roomId);
  if (fs.existsSync(snapPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(snapPath, 'utf8'));
      if (parsed && parsed.world) {
        world = parsed.world;
        revision = Number(parsed.revision || 0);
      }
      if (parsed && Array.isArray(parsed.chatHistory)) {
        chatHistory = parsed.chatHistory.slice(-100);
      }
    } catch {
      // ignore corrupted snapshot
    }
  }

  room = {
    roomId,
    world,
    revision,
    chatHistory,
    updatedAt: Date.now(),
    clients: new Map(), // clientId -> { socket, awareness }
    saveTimer: null,
  };
  rooms.set(roomId, room);
  return room;
}

function summarizeWorld(world) {
  if (!world || typeof world !== 'object') {
    return { objectCount: 0, terrainTheme: 'flat_plain' };
  }
  const objectCount =
    (Array.isArray(world.assets) ? world.assets.length : 0) +
    (Array.isArray(world.characters) ? world.characters.length : 0) +
    (Array.isArray(world.buildings) ? world.buildings.length : 0) +
    (Array.isArray(world.customModels) ? world.customModels.length : 0) +
    (Array.isArray(world.gltfModels) ? world.gltfModels.length : 0) +
    (world.heroCompound ? 1 : 0);
  const terrainTheme = world.terrain?.theme || 'flat_plain';
  return { objectCount, terrainTheme };
}

function listDiscoverableRooms() {
  const result = new Map();

  for (const room of rooms.values()) {
    const peerNames = Array.from(room.clients.values()).map((c) => c.awareness.name);
    const { objectCount, terrainTheme } = summarizeWorld(room.world);
    result.set(room.roomId, {
      roomId: room.roomId,
      onlineCount: room.clients.size,
      peerNames,
      revision: room.revision,
      updatedAt: room.updatedAt || Date.now(),
      objectCount,
      terrainTheme,
    });
  }

  try {
    const files = fs.readdirSync(ROOM_STORE_DIR);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const roomId = file.slice(0, -5);
      if (result.has(roomId)) continue;
      try {
        const fullPath = path.join(ROOM_STORE_DIR, file);
        const parsed = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        const { objectCount, terrainTheme } = summarizeWorld(parsed?.world);
        result.set(roomId, {
          roomId,
          onlineCount: 0,
          peerNames: [],
          revision: Number(parsed?.revision || 0),
          updatedAt: Number(parsed?.updatedAt || fs.statSync(fullPath).mtimeMs),
          objectCount,
          terrainTheme,
        });
      } catch {
        // ignore invalid snapshot file
      }
    }
  } catch {
    // ignore fs errors
  }

  return Array.from(result.values()).sort((a, b) => {
    if (b.onlineCount !== a.onlineCount) return b.onlineCount - a.onlineCount;
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });
}

function clearHistoricalRooms() {
  const clearedIds = new Set();

  for (const [roomId, room] of rooms.entries()) {
    if (room && room.clients && room.clients.size > 0) continue;
    if (room && room.saveTimer) {
      clearTimeout(room.saveTimer);
      room.saveTimer = null;
    }
    rooms.delete(roomId);
    clearedIds.add(roomId);
  }

  try {
    if (fs.existsSync(ROOM_STORE_DIR)) {
      const files = fs.readdirSync(ROOM_STORE_DIR);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const roomId = file.slice(0, -5);
        const activeRoom = rooms.get(roomId);
        if (activeRoom && activeRoom.clients && activeRoom.clients.size > 0) {
          continue;
        }
        try {
          fs.unlinkSync(path.join(ROOM_STORE_DIR, file));
          clearedIds.add(roomId);
        } catch {
          // ignore individual unlink failures
        }
      }
    }
  } catch {
    // ignore store read failures
  }

  return {
    clearedCount: clearedIds.size,
    rooms: listDiscoverableRooms(),
  };
}

function scheduleSaveRoom(room) {
  if (!room || !room.world) return;
  if (room.saveTimer) clearTimeout(room.saveTimer);
  room.saveTimer = setTimeout(() => {
    room.saveTimer = null;
    try {
      fs.writeFileSync(
        getRoomSnapshotPath(room.roomId),
        JSON.stringify({
          roomId: room.roomId,
          revision: room.revision,
          updatedAt: Date.now(),
          world: room.world,
          chatHistory: (room.chatHistory || []).slice(-100),
        }),
        'utf8'
      );
    } catch (err) {
      console.error(`[collab] failed to persist room ${room.roomId}:`, err);
    }
  }, 1200);
}

function getRoomPeersList(room) {
  return Array.from(room.clients.values()).map((c) => c.awareness);
}

function broadcastRoom(room, payload, excludeClientId = null) {
  const json = JSON.stringify(payload);
  for (const [cid, entry] of room.clients.entries()) {
    if (excludeClientId && cid === excludeClientId) continue;
    sendWsText(entry.socket, json);
  }
}

function removeSocketFromRooms(socket) {
  for (const room of rooms.values()) {
    let removedId = null;
    for (const [cid, entry] of room.clients.entries()) {
      if (entry.socket === socket) {
        room.clients.delete(cid);
        removedId = cid;
        break;
      }
    }
    if (removedId) {
      broadcastRoom(room, {
        type: 'peers_update',
        roomId: room.roomId,
        peers: getRoomPeersList(room),
      });
    }
  }
}

function handleClientMessage(socket, rawText) {
  let msg;
  try {
    msg = JSON.parse(rawText);
  } catch {
    return;
  }
  if (!msg || typeof msg !== 'object') return;

  if (msg.type === 'join') {
    const room = loadOrCreateRoom(msg.roomId);
    const clientId = String(msg.clientId || crypto.randomUUID());
    const name = String(msg.name || '协作者').slice(0, 24);
    const color = String(msg.color || '#0ea5e9').slice(0, 24);

    // Ensure one socket isn't duplicated
    removeSocketFromRooms(socket);

    const isHost = !room.world;
    if (!room.world && msg.initialWorld) {
      room.world = msg.initialWorld;
      room.revision = 1;
      scheduleSaveRoom(room);
    }

    const awareness = {
      clientId,
      name,
      color,
      selectedId: null,
      isDragging: false,
      dragTransform: null,
      cameraPos: [0, 8, 16],
      cameraTarget: [0, 1, 0],
      updatedAt: Date.now(),
    };

    room.clients.set(clientId, { socket, awareness });

    sendWsText(socket, {
      type: 'joined',
      roomId: room.roomId,
      clientId,
      isHost,
      revision: room.revision,
      world: room.world,
      peers: getRoomPeersList(room),
      chatHistory: (room.chatHistory || []).slice(-50),
    });

    broadcastRoom(
      room,
      {
        type: 'peers_update',
        roomId: room.roomId,
        peers: getRoomPeersList(room),
      },
      clientId
    );
    return;
  }

  const room = rooms.get(sanitizeRoomId(msg.roomId));
  if (!room) return;
  const clientEntry = room.clients.get(msg.clientId);
  if (!clientEntry || clientEntry.socket !== socket) return;

  if (msg.type === 'world_ops' && Array.isArray(msg.ops) && msg.ops.length > 0) {
    if (!room.world && msg.fallbackWorld) {
      room.world = msg.fallbackWorld;
    }
    room.world = applyWorldSyncOps(room.world, msg.ops);
    room.revision += 1;
    room.updatedAt = Date.now();
    scheduleSaveRoom(room);

    broadcastRoom(
      room,
      {
        type: 'world_ops',
        roomId: room.roomId,
        revision: room.revision,
        senderId: msg.clientId,
        senderName: clientEntry.awareness.name,
        ops: msg.ops,
      },
      msg.clientId
    );
  } else if (msg.type === 'replace_world' && msg.world) {
    room.world = msg.world;
    room.revision += 1;
    room.updatedAt = Date.now();
    scheduleSaveRoom(room);

    broadcastRoom(
      room,
      {
        type: 'sync_full',
        roomId: room.roomId,
        revision: room.revision,
        senderId: msg.clientId,
        senderName: clientEntry.awareness.name,
        world: room.world,
      },
      msg.clientId
    );
  } else if (msg.type === 'awareness' && msg.state && typeof msg.state === 'object') {
    clientEntry.awareness = {
      ...clientEntry.awareness,
      ...msg.state,
      clientId: msg.clientId,
      updatedAt: Date.now(),
    };
    broadcastRoom(
      room,
      {
        type: 'awareness',
        roomId: room.roomId,
        clientId: msg.clientId,
        state: clientEntry.awareness,
      },
      msg.clientId
    );
  } else if (msg.type === 'chat' && typeof msg.text === 'string') {
    const cleanText = msg.text.trim().slice(0, 500);
    if (!cleanText) return;
    const chatMessage = {
      id: String(msg.id || crypto.randomUUID()),
      roomId: room.roomId,
      clientId: msg.clientId,
      senderName: clientEntry.awareness.name,
      color: clientEntry.awareness.color,
      text: cleanText,
      timestamp: Date.now(),
      kind: msg.kind === 'location' ? 'location' : 'text',
      cameraPos: Array.isArray(msg.cameraPos) ? msg.cameraPos.slice(0, 3) : undefined,
      cameraTarget: Array.isArray(msg.cameraTarget) ? msg.cameraTarget.slice(0, 3) : undefined,
    };
    room.chatHistory = [...(room.chatHistory || []), chatMessage].slice(-100);
    room.updatedAt = Date.now();
    scheduleSaveRoom(room);
    broadcastRoom(
      room,
      {
        type: 'chat',
        roomId: room.roomId,
        message: chatMessage,
      },
      msg.clientId
    );
  } else if (msg.type === 'leave') {
    room.clients.delete(msg.clientId);
    broadcastRoom(room, {
      type: 'peers_update',
      roomId: room.roomId,
      peers: getRoomPeersList(room),
    });
  }
}

// ---------------------------------------------------------------------------
// HTTP Server (/health + optional static fallback from ../dist)
// ---------------------------------------------------------------------------

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (reqUrl.pathname === '/health' || reqUrl.pathname === '/ws/health') {
    let totalPeers = 0;
    for (const r of rooms.values()) totalPeers += r.clients.size;
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(
      JSON.stringify({
        ok: true,
        rooms: rooms.size,
        onlinePeers: totalPeers,
        uptimeSec: Math.round(process.uptime()),
      })
    );
    return;
  }

  if (
    req.method === 'OPTIONS' &&
    (reqUrl.pathname === '/rooms' ||
      reqUrl.pathname === '/ws/rooms' ||
      reqUrl.pathname === '/rooms/clear' ||
      reqUrl.pathname === '/ws/rooms/clear')
  ) {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'no-store',
    });
    res.end();
    return;
  }

  if (
    (reqUrl.pathname === '/rooms/clear' ||
      reqUrl.pathname === '/ws/rooms/clear') &&
    (req.method === 'POST' || req.method === 'DELETE')
  ) {
    const result = clearHistoricalRooms();
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    });
    res.end(
      JSON.stringify({
        ok: true,
        clearedCount: result.clearedCount,
        rooms: result.rooms,
      })
    );
    return;
  }

  if (
    (reqUrl.pathname === '/rooms' || reqUrl.pathname === '/ws/rooms') &&
    req.method === 'DELETE'
  ) {
    const result = clearHistoricalRooms();
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    });
    res.end(
      JSON.stringify({
        ok: true,
        clearedCount: result.clearedCount,
        rooms: result.rooms,
      })
    );
    return;
  }

  if (reqUrl.pathname === '/rooms' || reqUrl.pathname === '/ws/rooms') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(
      JSON.stringify({
        ok: true,
        rooms: listDiscoverableRooms(),
      })
    );
    return;
  }

  // Optional static file serving when dist/ is present alongside server/
  if (fs.existsSync(DIST_DIR)) {
    let relPath = decodeURIComponent(reqUrl.pathname === '/' ? '/index.html' : reqUrl.pathname);
    if (relPath.includes('..')) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    let filePath = path.join(DIST_DIR, relPath.replace(/^\/+/, ''));
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(DIST_DIR, 'index.html');
    }
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=86400',
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    }
  }

  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Previs Co-Creation WebSocket Server is running.\nConnect via /ws');
});

const allSockets = new Set();

server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  if (!key || Array.isArray(key)) {
    socket.destroy();
    return;
  }

  const acceptKey = crypto
    .createHash('sha1')
    .update(key + WS_MAGIC)
    .digest('base64');

  socket.write(
    [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey}`,
      '',
      '',
    ].join('\r\n')
  );

  allSockets.add(socket);
  attachWebSocket(
    socket,
    (text) => handleClientMessage(socket, text),
    () => {
      allSockets.delete(socket);
      removeSocketFromRooms(socket);
    }
  );
});

const heartbeat = setInterval(() => {
  for (const socket of allSockets) {
    if (!socket.isAlive) {
      allSockets.delete(socket);
      removeSocketFromRooms(socket);
      try {
        socket.destroy();
      } catch {
        // ignore
      }
      continue;
    }
    socket.isAlive = false;
    sendWsControl(socket, 0x9);
  }
}, 25000);
heartbeat.unref();

function getLanIps() {
  const ips = [];
  const nets = os.networkInterfaces();
  for (const list of Object.values(nets)) {
    for (const net of list || []) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  return ips;
}

server.listen(PORT, HOST, () => {
  const lanIps = getLanIps();
  console.log('');
  console.log('==========================================================');
  console.log('  PREVIS.3D 多人共创同步服务已启动 (Zero-Dependency Node WS)');
  console.log(`  本机地址:   ws://127.0.0.1:${PORT}/ws`);
  if (lanIps.length > 0) {
    for (const ip of lanIps) {
      console.log(`  局域网地址: ws://${ip}:${PORT}/ws`);
      if (fs.existsSync(DIST_DIR)) {
        console.log(`  局域网网页: http://${ip}:${PORT}/`);
      }
    }
  }
  console.log(`  房间存档目录: ${ROOM_STORE_DIR}`);
  console.log('==========================================================');
  console.log('');
});
