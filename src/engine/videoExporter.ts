import * as THREE from 'three';
import { Muxer, ArrayBufferTarget } from 'webm-muxer';
import { getExportResolution } from '../data/presets';
import { evaluateShotCamera } from '../store/useStudioStore';
import type { RenderChannel, ShotData, WorldState } from '../types/scene';

export interface ExportVideoOptions {
  gl: THREE.WebGLRenderer;
  scene: THREE.Scene;
  world: WorldState;
  shot: ShotData;
  channel: RenderChannel;
  projectName: string;
  onProgress: (progress: number) => void;
  onPrepareFrame?: (timeSeconds: number) => Promise<void> | void;
  signal?: AbortSignal;
}

/**
 * webm-muxer 5.x records the last frame's start timestamp as EBML Duration,
 * omitting that final frame's span. Patch only the EBML Duration float64 field
 * (Segment 0x18538067 -> Info 0x1549a966 -> Duration 0x4489) in-place.
 */
function setContainerDuration(
  buffer: ArrayBuffer,
  durationMilliseconds: number
): void {
  const bytes = new Uint8Array(buffer);
  const findElement = (
    id: number,
    start: number,
    limit: number
  ): { start: number; end: number } | undefined => {
    let offset = start;
    while (offset < limit) {
      let idLength = 1;
      let mask = 0x80;
      while (idLength <= 4 && !(bytes[offset] & mask)) {
        idLength++;
        mask >>= 1;
      }
      if (idLength > 4) return undefined;
      let elementId = 0;
      for (let i = 0; i < idLength; i++) {
        elementId = elementId * 256 + bytes[offset + i];
      }
      const sizeOffset = offset + idLength;
      let sizeLength = 1;
      mask = 0x80;
      while (sizeLength <= 8 && !(bytes[sizeOffset] & mask)) {
        sizeLength++;
        mask >>= 1;
      }
      if (sizeLength > 8 || sizeOffset + sizeLength > limit) return undefined;
      let size = bytes[sizeOffset] & (mask - 1);
      let unknown = size === mask - 1;
      for (let i = 1; i < sizeLength; i++) {
        size = size * 256 + bytes[sizeOffset + i];
        unknown &&= bytes[sizeOffset + i] === 255;
      }
      const contentStart = sizeOffset + sizeLength;
      const end = unknown ? limit : Math.min(contentStart + size, limit);
      if (elementId === id) return { start: contentStart, end };
      if (end <= offset) return undefined;
      offset = end;
    }
    return undefined;
  };

  const segment = findElement(0x18538067, 0, bytes.length);
  const info = segment && findElement(0x1549a966, segment.start, segment.end);
  const duration = info && findElement(0x4489, info.start, info.end);
  if (duration && duration.end - duration.start === 8) {
    new DataView(buffer).setFloat64(duration.start, durationMilliseconds, false);
  }
}

export async function exportDeterministicWebM(
  opts: ExportVideoOptions
): Promise<void> {
  const {
    gl,
    scene,
    world,
    shot,
    channel,
    projectName,
    onProgress,
    onPrepareFrame,
    signal,
  } = opts;
  const { width, height } = getExportResolution(shot.aspectRatio);
  const fps = shot.fps;
  const duration = shot.duration;

  if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') {
    const isEn = typeof window !== 'undefined' && window.localStorage.getItem('previs3d_lang_v1') === 'en';
    throw new Error(
      isEn
        ? 'Your browser does not support WebCodecs frame encoding. Please use modern Chrome / Edge.'
        : '当前浏览器不支持 WebCodecs 逐帧编码，请使用新版桌面 Chrome / Edge。'
    );
  }

  const targetBitrate = Math.max(4_000_000, Math.round(width * height * fps * 0.45));
  let chosenConfig: VideoEncoderConfig | null = null;
  let muxerCodec: 'V_VP9' | 'V_VP8' = 'V_VP9';

  for (const candidate of [
    { codec: 'vp09.00.10.08', muxer: 'V_VP9' as const },
    { codec: 'vp8', muxer: 'V_VP8' as const },
  ]) {
    const candidateConfig: VideoEncoderConfig = {
      codec: candidate.codec,
      width,
      height,
      bitrate: targetBitrate,
      framerate: fps,
    };
    try {
      const support = await VideoEncoder.isConfigSupported(candidateConfig);
      if (support.supported) {
        chosenConfig = support.config ?? candidateConfig;
        muxerCodec = candidate.muxer;
        break;
      }
    } catch {
      // Try next WebM codec profile
    }
  }

  if (!chosenConfig) {
    const isEn = typeof window !== 'undefined' && window.localStorage.getItem('previs3d_lang_v1') === 'en';
    throw new Error(
      isEn
        ? 'This device does not support VP9 / VP8 WebCodecs encoding.'
        : '当前设备不支持 VP9 / VP8 WebCodecs 编码。'
    );
  }

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: {
      codec: muxerCodec,
      width,
      height,
      frameRate: fps,
    },
    firstTimestampBehavior: 'strict',
  });

  let encoderError: Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (err) => {
      encoderError = err instanceof Error ? err : new Error(String(err));
    },
  });

  encoder.configure(chosenConfig);

  const prevSize = new THREE.Vector2();
  gl.getSize(prevSize);
  const prevPixelRatio = gl.getPixelRatio();
  const prevScissorTest = gl.getScissorTest();
  const prevAutoClear = gl.autoClear;
  const prevViewport = new THREE.Vector4();
  gl.getViewport(prevViewport);
  const prevToneMapping = gl.toneMapping;

  const hiddenHelpers: { obj: THREE.Object3D; prevVisible: boolean }[] = [];
  scene.traverse((obj) => {
    if (obj.userData?.isEditorHelper) {
      hiddenHelpers.push({ obj, prevVisible: obj.visible });
      obj.visible = false;
    }
  });

  const exportCamera = new THREE.PerspectiveCamera(45, width / height, 0.15, 420);
  const totalFrames = Math.max(1, Math.round(duration * fps));
  const drawBufferSize = new THREE.Vector2();

  try {
    gl.setPixelRatio(1);
    gl.setSize(width, height, false);
    gl.setScissorTest(false);
    gl.setViewport(0, 0, width, height);
    gl.autoClear = true;
    gl.toneMapping =
      channel === 'depth' || channel === 'normal'
        ? THREE.NoToneMapping
        : THREE.ACESFilmicToneMapping;

    for (let i = 0; i < totalFrames; i++) {
      if (signal?.aborted) {
        const isEn = typeof window !== 'undefined' && window.localStorage.getItem('previs3d_lang_v1') === 'en';
        throw new Error(isEn ? 'Video export cancelled' : '已取消视频导出');
      }
      if (encoderError) throw encoderError;
      if (encoder.encodeQueueSize >= 6) {
        await encoder.flush();
      }
      if (encoderError) throw encoderError;

      const t = i / fps;
      if (onPrepareFrame) {
        await onPrepareFrame(t);
      }
      const camState = evaluateShotCamera(shot, world, t);
      exportCamera.position.set(...camState.position);
      exportCamera.fov = camState.fov;
      exportCamera.aspect = width / height;
      exportCamera.lookAt(...camState.target);
      exportCamera.updateProjectionMatrix();
      exportCamera.updateMatrixWorld();

      // Re-assert full export viewport & clear state every frame so R3F View/scissor never clips output
      gl.getDrawingBufferSize(drawBufferSize);
      if (drawBufferSize.x !== width || drawBufferSize.y !== height || gl.getPixelRatio() !== 1) {
        gl.setPixelRatio(1);
        gl.setSize(width, height, false);
      }
      gl.setScissorTest(false);
      gl.setViewport(0, 0, width, height);
      gl.autoClear = true;
      gl.clear(true, true, true);
      gl.render(scene, exportCamera);

      const timestamp = Math.round((i * 1_000_000) / fps);
      const nextTimestamp = Math.round(((i + 1) * 1_000_000) / fps);
      const frame = new VideoFrame(gl.domElement, {
        timestamp,
        duration: nextTimestamp - timestamp,
        alpha: 'discard',
      });

      try {
        encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
      } finally {
        frame.close();
      }

      onProgress((i + 1) / totalFrames);
      if (i % 3 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    await encoder.flush();
    if (encoderError) throw encoderError;
    encoder.close();
    muxer.finalize();
    setContainerDuration(target.buffer, (totalFrames * 1000) / fps);

    const blob = new Blob([target.buffer], { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeProj = projectName.replace(/[^\w\u4e00-\u9fa5-]+/g, '_');
    const safeShot = shot.name.replace(/[^\w\u4e00-\u9fa5-]+/g, '_');
    a.href = url;
    a.download = `${safeProj}_${safeShot}_${channel}_${width}x${height}_${fps}fps.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } finally {
    if (encoder.state !== 'closed') {
      encoder.close();
    }
    for (const item of hiddenHelpers) {
      item.obj.visible = item.prevVisible;
    }
    gl.toneMapping = prevToneMapping;
    gl.autoClear = prevAutoClear;
    gl.setScissorTest(prevScissorTest);
    gl.setPixelRatio(prevPixelRatio);
    gl.setSize(prevSize.x, prevSize.y, false);
    gl.setViewport(prevViewport);
  }
}
