import type { ClayVariant } from '../engine/channelMaterials';
import type { PropType, Vec3 } from '../types/scene';
import type { AssetVariantSpec, InventoryPart } from './assetInventory';

const r2 = (n: number) => Number(n.toFixed(2));

function box(
  pos: Vec3,
  size: Vec3,
  variant: ClayVariant = 'default',
  rot?: Vec3
): InventoryPart {
  return rot
    ? { shape: 'box', pos, size, variant, rot }
    : { shape: 'box', pos, size, variant };
}

function cyl(
  pos: Vec3,
  rTop: number,
  rBot: number,
  h: number,
  variant: ClayVariant = 'default',
  rot?: Vec3
): InventoryPart {
  return rot
    ? { shape: 'cylinder', pos, size: [r2(rTop), r2(rBot), r2(h)], variant, rot }
    : { shape: 'cylinder', pos, size: [r2(rTop), r2(rBot), r2(h)], variant };
}

function cone(
  pos: Vec3,
  r: number,
  h: number,
  seg = 10,
  variant: ClayVariant = 'accent',
  rot?: Vec3
): InventoryPart {
  return rot
    ? { shape: 'cone', pos, size: [r2(r), r2(h), seg], variant, rot }
    : { shape: 'cone', pos, size: [r2(r), r2(h), seg], variant };
}

function sph(
  pos: Vec3,
  sx: number,
  sy: number,
  sz: number,
  variant: ClayVariant = 'foliage',
  rot?: Vec3
): InventoryPart {
  return rot
    ? { shape: 'sphere', pos, size: [r2(sx), r2(sy), r2(sz)], variant, rot }
    : { shape: 'sphere', pos, size: [r2(sx), r2(sy), r2(sz)], variant };
}

function dodec(
  pos: Vec3,
  sx: number,
  sy: number,
  sz: number,
  variant: ClayVariant = 'rock',
  rot?: Vec3
): InventoryPart {
  return rot
    ? { shape: 'dodecahedron', pos, size: [r2(sx), r2(sy), r2(sz)], variant, rot }
    : { shape: 'dodecahedron', pos, size: [r2(sx), r2(sy), r2(sz)], variant };
}

function torus(
  pos: Vec3,
  radius: number,
  tube: number,
  seg = 16,
  variant: ClayVariant = 'dark',
  rot?: Vec3
): InventoryPart {
  return rot
    ? { shape: 'torus', pos, size: [r2(radius), r2(tube), seg], variant, rot }
    : { shape: 'torus', pos, size: [r2(radius), r2(tube), seg], variant };
}

function rampPart(
  pos: Vec3,
  size: Vec3,
  variant: ClayVariant = 'concrete',
  rot?: Vec3
): InventoryPart {
  return rot
    ? { shape: 'ramp', pos, size, variant, rot }
    : { shape: 'ramp', pos, size, variant };
}

/** Helper: cylindrical wheel with inner metallic hubcap along X axis */
function addWheelX(
  parts: InventoryPart[],
  x: number,
  y: number,
  z: number,
  radius: number,
  width: number
) {
  parts.push(
    cyl([r2(x), r2(y), r2(z)], radius, radius, width, 'dark', [0, 0, Math.PI / 2]),
    cyl([r2(x + (x >= 0 ? 0.02 : -0.02)), r2(y), r2(z)], radius * 0.56, radius * 0.56, width * 1.06, 'accent', [0, 0, Math.PI / 2])
  );
}

/** Helper: multi-piece traditional Chinese pitched roof with upturned flying eaves & ridge ornaments */
function addChineseRoof(
  parts: InventoryPart[],
  yBase: number,
  w: number,
  d: number,
  roofH: number,
  roofMat: ClayVariant = 'dark',
  trimMat: ClayVariant = 'accent'
) {
  // Eave soffit & bracket layer (斗拱层)
  parts.push(
    box([0, r2(yBase + 0.12), 0], [r2(w * 1.04), 0.24, r2(d * 1.04)], 'wood'),
    box([0, r2(yBase + 0.28), 0], [r2(w * 1.14), 0.14, r2(d * 1.14)], roofMat)
  );
  // Front & back pitched roof slopes
  const slopeH = r2(roofH * 0.72);
  parts.push(
    box([0, r2(yBase + 0.28 + slopeH * 0.42), r2(d * 0.24)], [r2(w * 1.1), 0.18, r2(d * 0.62)], roofMat, [0.46, 0, 0]),
    box([0, r2(yBase + 0.28 + slopeH * 0.42), r2(-d * 0.24)], [r2(w * 1.1), 0.18, r2(d * 0.62)], roofMat, [-0.46, 0, 0]),
    // Gable core
    cone([0, r2(yBase + 0.28 + slopeH * 0.48), 0], r2(Math.max(w, d) * 0.58), slopeH, 4, roofMat, [0, Math.PI / 4, 0]),
    // Main horizontal ridge (正脊) + 2 upturned ridge finials (鸱吻)
    box([0, r2(yBase + 0.3 + slopeH * 0.85), 0], [r2(w * 0.78), 0.22, 0.24], trimMat),
    box([r2(-w * 0.39), r2(yBase + 0.42 + slopeH * 0.88), 0], [0.22, 0.36, 0.28], trimMat, [0, 0, 0.25]),
    box([r2(w * 0.39), r2(yBase + 0.42 + slopeH * 0.88), 0], [0.22, 0.36, 0.28], trimMat, [0, 0, -0.25])
  );
  // 4 upturned flying corner horns (飞檐翘角)
  const cx = w * 0.56;
  const cz = d * 0.56;
  parts.push(
    cone([r2(-cx), r2(yBase + 0.42), r2(cz)], 0.28, 0.45, 4, trimMat, [-0.45, 0, 0.45]),
    cone([r2(cx), r2(yBase + 0.42), r2(cz)], 0.28, 0.45, 4, trimMat, [-0.45, 0, -0.45]),
    cone([r2(-cx), r2(yBase + 0.42), r2(-cz)], 0.28, 0.45, 4, trimMat, [0.45, 0, 0.45]),
    cone([r2(cx), r2(yBase + 0.42), r2(-cz)], 0.28, 0.45, 4, trimMat, [0.45, 0, -0.45])
  );
}

// ============================================================================
// 1. ROAD (精细化道路、桥梁、隧道洞门、收费站与轨道模块 · 160 款)
// ============================================================================
function buildMegaRoadVariants(): AssetVariantSpec[] {
  const out: AssetVariantSpec[] = [];

  const roadArchetypes: {
    key: string;
    name: string;
    baseW: number;
    baseD: number;
    deckVariant: ClayVariant;
    mode:
      | 'highway_lane'
      | 'overpass'
      | 'arch_bridge'
      | 'toll_gate'
      | 'tunnel_portal'
      | 'bus_bay'
      | 'rail_track'
      | 'runway'
      | 'dock_pier'
      | 'parking_lot';
  }[] = [
    { key: 'hwy_std', name: '城市柏油主干道', baseW: 8, baseD: 8, deckVariant: 'road', mode: 'highway_lane' },
    { key: 'hwy_exp', name: '快速路高架桥段', baseW: 10, baseD: 10, deckVariant: 'road', mode: 'overpass' },
    { key: 'stone_bridge', name: '中式单孔石拱桥', baseW: 5.2, baseD: 8.5, deckVariant: 'rock', mode: 'arch_bridge' },
    { key: 'toll_plaza', name: '高速收费站ETC岛台', baseW: 10, baseD: 8, deckVariant: 'road', mode: 'toll_gate' },
    { key: 'tunnel_gate', name: '山体公路隧道洞门', baseW: 9, baseD: 6.5, deckVariant: 'road', mode: 'tunnel_portal' },
    { key: 'bus_harbor', name: '港湾式公交候车亭站段', baseW: 9, baseD: 8, deckVariant: 'road', mode: 'bus_bay' },
    { key: 'hsr_viaduct', name: '高铁双线箱梁无砟轨道', baseW: 7.5, baseD: 10, deckVariant: 'concrete', mode: 'rail_track' },
    { key: 'air_runway', name: '机场跑道助航灯标段', baseW: 14, baseD: 12, deckVariant: 'road', mode: 'runway' },
    { key: 'canal_quay', name: '古镇河岸石驳岸系船码头', baseW: 6.5, baseD: 8, deckVariant: 'wood', mode: 'dock_pier' },
    { key: 'park_bays', name: '生态充电车位停车模块', baseW: 10, baseD: 6.5, deckVariant: 'road', mode: 'parking_lot' },
  ];

  const spanConfigs = [
    { suf: 's1', tag: '短跨标准段', wMul: 0.85, dMul: 0.82, hAdd: 0 },
    { suf: 's2', tag: '标准单跨段', wMul: 1.0, dMul: 1.0, hAdd: 0 },
    { suf: 's3', tag: '加宽双跨段', wMul: 1.2, dMul: 1.15, hAdd: 0.2 },
    { suf: 's4', tag: '长跨干线段', wMul: 1.0, dMul: 1.38, hAdd: 0.3 },
    { suf: 's5', tag: '宽幅四车道', wMul: 1.34, dMul: 1.0, hAdd: 0.1 },
    { suf: 's6', tag: '宽幅长跨段', wMul: 1.34, dMul: 1.32, hAdd: 0.4 },
    { suf: 's7', tag: '带防撞隔离带段', wMul: 1.42, dMul: 1.1, hAdd: 0.25 },
    { suf: 's8', tag: '带双侧路灯杆段', wMul: 1.12, dMul: 1.18, hAdd: 1.8 },
    { suf: 's9', tag: '带弧形声屏障段', wMul: 1.16, dMul: 1.1, hAdd: 1.4 },
    { suf: 's10', tag: '带龙门情报板段', wMul: 1.25, dMul: 1.1, hAdd: 2.6 },
    { suf: 's11', tag: '六车道枢纽段', wMul: 1.56, dMul: 1.2, hAdd: 0.2 },
    { suf: 's12', tag: '微拱景观桥段', wMul: 1.06, dMul: 1.25, hAdd: 0.6 },
    { suf: 's13', tag: '带行道树花箱段', wMul: 1.28, dMul: 1.0, hAdd: 1.2 },
    { suf: 's14', tag: '重型箱梁加固段', wMul: 1.22, dMul: 1.28, hAdd: 0.35 },
    { suf: 's15', tag: '带斑马线信号灯段', wMul: 1.18, dMul: 1.15, hAdd: 2.2 },
    { suf: 's16', tag: '片场主景长街段', wMul: 1.15, dMul: 1.48, hAdd: 0.4 },
  ];

  roadArchetypes.forEach((arch) => {
    spanConfigs.forEach((cfg, idx) => {
      const w = r2(arch.baseW * cfg.wMul);
      const d = r2(arch.baseD * cfg.dMul);
      const parts: InventoryPart[] = [];
      let h = 0.4;

      if (arch.mode === 'overpass') {
        const deckY = r2(3.0 + (idx % 3) * 0.5);
        h = r2(deckY + 2.4);
        // Box girder + deck + anti-crash barriers + T-piers + pier footings + street lamps
        parts.push(
          box([0, deckY - 0.32, 0], [w * 0.72, 0.48, d], 'concrete'),
          box([0, deckY, 0], [w, 0.22, d], arch.deckVariant),
          box([-w * 0.47, deckY + 0.36, 0], [0.26, 0.55, d], 'concrete'),
          box([w * 0.47, deckY + 0.36, 0], [0.26, 0.55, d], 'concrete'),
          box([-w * 0.47, deckY + 0.72, 0], [0.08, 0.12, d], 'dark'),
          box([w * 0.47, deckY + 0.72, 0], [0.08, 0.12, d], 'dark'),
          box([0, deckY + 0.12, -d * 0.28], [0.16, 0.04, d * 0.24], 'accent'),
          box([0, deckY + 0.12, d * 0.28], [0.16, 0.04, d * 0.24], 'accent'),
          // T-pier cap beams & cylindrical columns
          box([0, deckY - 0.68, -d * 0.3], [w * 0.82, 0.34, 0.9], 'concrete'),
          box([0, deckY - 0.68, d * 0.3], [w * 0.82, 0.34, 0.9], 'concrete'),
          cyl([0, (deckY - 0.8) * 0.5, -d * 0.3], 0.52, 0.64, deckY - 0.8, 'concrete'),
          cyl([0, (deckY - 0.8) * 0.5, d * 0.3], 0.52, 0.64, deckY - 0.8, 'concrete'),
          box([0, 0.18, -d * 0.3], [1.8, 0.36, 1.8], 'rock'),
          box([0, 0.18, d * 0.3], [1.8, 0.36, 1.8], 'rock'),
          cyl([-w * 0.46, deckY + 1.4, 0], 0.06, 0.08, 1.8, 'dark'),
          box([-w * 0.36, deckY + 2.25, 0], [0.65, 0.1, 0.22], 'emissiveLamp')
        );
      } else if (arch.mode === 'arch_bridge') {
        h = r2(2.3 + cfg.hAdd * 0.4);
        // Arch ring + stone spandrel + approach ramps + carved balusters & lotus finials
        parts.push(
          torus([0, 0.2, 0], d * 0.26, 0.42, 16, 'rock', [0, Math.PI / 2, 0]),
          box([0, 0.82, 0], [w, 0.38, d * 0.48], 'rock'),
          rampPart([0, 0.0, -d * 0.34], [w, 0.98, d * 0.32], 'rock'),
          rampPart([0, 0.0, d * 0.34], [w, 0.98, d * 0.32], 'rock', [0, Math.PI, 0]),
          box([-w * 0.45, 1.24, 0], [0.22, 0.48, d * 0.52], 'default'),
          box([w * 0.45, 1.24, 0], [0.22, 0.48, d * 0.52], 'default')
        );
        for (let z = -d * 0.36; z <= d * 0.37; z += d * 0.24) {
          parts.push(
            cyl([-w * 0.45, 1.36, r2(z)], 0.11, 0.12, 0.68, 'accent'),
            sph([-w * 0.45, 1.75, r2(z)], 0.13, 0.15, 0.13, 'default'),
            cyl([w * 0.45, 1.36, r2(z)], 0.11, 0.12, 0.68, 'accent'),
            sph([w * 0.45, 1.75, r2(z)], 0.13, 0.15, 0.13, 'default')
          );
        }
      } else if (arch.mode === 'tunnel_portal') {
        h = r2(4.6 + (idx % 3) * 0.4);
        parts.push(
          box([0, 0.08, 0], [w, 0.16, d], 'road'),
          box([-w * 0.44, 0.22, 0], [0.45, 0.28, d], 'concrete'),
          box([w * 0.44, 0.22, 0], [0.45, 0.28, d], 'concrete'),
          // Arch portal ring + retaining wing walls + mountain rock overburden
          box([-w * 0.38, h * 0.44, 0], [1.1, h * 0.88, d * 0.72], 'concrete'),
          box([w * 0.38, h * 0.44, 0], [1.1, h * 0.88, d * 0.72], 'concrete'),
          torus([0, h * 0.52, d * 0.32], w * 0.34, 0.48, 16, 'concrete'),
          box([0, h * 0.86, 0], [w * 1.06, h * 0.26, d * 0.76], 'concrete'),
          dodec([-w * 0.32, h * 0.96, -0.3], w * 0.28, 0.9, d * 0.32, 'rock'),
          dodec([w * 0.28, h * 0.98, -0.2], w * 0.3, 1.0, d * 0.34, 'rock'),
          box([-w * 0.18, h * 0.72, d * 0.38], [0.42, 0.16, 0.12], 'emissiveLamp'),
          box([w * 0.18, h * 0.72, d * 0.38], [0.42, 0.16, 0.12], 'emissiveLamp')
        );
      } else if (arch.mode === 'toll_gate') {
        h = 5.2;
        parts.push(
          box([0, 0.08, 0], [w, 0.16, d], 'road'),
          // Concrete crash islands + toll booths with windows + overhead canopy + boom arms
          box([-w * 0.28, 0.24, 0], [1.1, 0.32, d * 0.76], 'concrete'),
          box([w * 0.28, 0.24, 0], [1.1, 0.32, d * 0.76], 'concrete'),
          box([-w * 0.28, 1.45, -0.3], [0.92, 2.2, 2.1], 'default'),
          box([-w * 0.28, 1.65, 0.4], [0.78, 0.9, 0.8], 'water'),
          box([w * 0.28, 1.45, -0.3], [0.92, 2.2, 2.1], 'default'),
          box([w * 0.28, 1.65, 0.4], [0.78, 0.9, 0.8], 'water'),
          cyl([-w * 0.28, 2.6, 0], 0.22, 0.26, 4.6, 'dark'),
          cyl([w * 0.28, 2.6, 0], 0.22, 0.26, 4.6, 'dark'),
          box([0, 4.75, 0], [w * 1.08, 0.52, 3.2], 'accent'),
          box([0, 4.75, 1.62], [w * 0.92, 0.32, 0.08], 'emissiveLamp'),
          box([-w * 0.08, 1.05, 1.4], [1.8, 0.08, 0.08], 'accent')
        );
      } else if (arch.mode === 'rail_track') {
        h = 3.8;
        parts.push(
          box([0, 0.14, 0], [w, 0.28, d], 'concrete'),
          box([0, 0.34, 0], [w * 0.82, 0.16, d], 'rock'),
          box([-w * 0.22, 0.46, 0], [0.12, 0.12, d], 'dark'),
          box([-w * 0.08, 0.46, 0], [0.12, 0.12, d], 'dark'),
          box([w * 0.08, 0.46, 0], [0.12, 0.12, d], 'dark'),
          box([w * 0.22, 0.46, 0], [0.12, 0.12, d], 'dark'),
          // Overhead catenary portal frame (接触网龙门架)
          cyl([-w * 0.44, 1.9, 0], 0.1, 0.12, 3.6, 'dark'),
          cyl([w * 0.44, 1.9, 0], 0.1, 0.12, 3.6, 'dark'),
          box([0, 3.55, 0], [w * 0.94, 0.16, 0.16], 'dark')
        );
        for (let z = -d * 0.42; z <= d * 0.43; z += 1.2) {
          parts.push(box([0, 0.4, r2(z)], [w * 0.72, 0.08, 0.26], 'wood'));
        }
      } else if (arch.mode === 'bus_bay') {
        h = 2.9;
        parts.push(
          box([0, 0.08, 0], [w, 0.16, d], 'road'),
          box([-w * 0.38, 0.2, 0], [1.8, 0.24, d], 'concrete'),
          // Bus stop shelter with roof, glass back, ad lightbox & bench
          cyl([-w * 0.42, 1.45, -1.2], 0.07, 0.07, 2.5, 'dark'),
          cyl([-w * 0.42, 1.45, 1.2], 0.07, 0.07, 2.5, 'dark'),
          box([-w * 0.36, 2.68, 0], [1.3, 0.14, 3.4], 'dark'),
          box([-w * 0.44, 1.4, 0], [0.08, 1.9, 2.4], 'water'),
          box([-w * 0.38, 1.4, 1.45], [0.75, 1.8, 0.14], 'emissiveLamp'),
          box([-w * 0.34, 0.56, 0], [0.42, 0.1, 1.6], 'wood')
        );
      } else {
        h = r2(1.8 + cfg.hAdd);
        parts.push(
          box([0, 0.08, 0], [w, 0.16, d], arch.deckVariant),
          box([-w * 0.45, 0.18, 0], [0.55, 0.24, d], 'concrete'),
          box([w * 0.45, 0.18, 0], [0.55, 0.24, d], 'concrete'),
          // Dashed lane markings
          box([0, 0.17, -d * 0.3], [0.16, 0.03, d * 0.22], 'accent'),
          box([0, 0.17, d * 0.3], [0.16, 0.03, d * 0.22], 'accent'),
          // Roadside lamp & bollard or gantry
          cyl([-w * 0.44, 1.6, -d * 0.25], 0.07, 0.09, 3.0, 'dark'),
          box([-w * 0.34, 3.05, -d * 0.25], [0.75, 0.1, 0.22], 'emissiveLamp'),
          cyl([w * 0.44, 0.55, d * 0.25], 0.12, 0.16, 0.8, 'trunk'),
          sph([w * 0.44, 1.2, d * 0.25], 0.55, 0.55, 0.55, 'foliage')
        );
        if (cfg.suf === 's10') {
          parts.push(
            cyl([w * 0.44, 2.1, 0], 0.12, 0.14, 4.0, 'dark'),
            box([0, 3.8, 0], [w * 0.92, 0.68, 0.24], 'dark'),
            box([0, 3.8, 0.14], [w * 0.78, 0.48, 0.05], 'emissiveLamp')
          );
          h = 4.2;
        }
      }

      out.push({
        id: `m_road_${arch.key}_${cfg.suf}`,
        label: `${arch.name} · ${cfg.tag}`,
        heightM: h,
        widthM: w,
        depthM: d,
        parts,
      });
    });
  });

  return out;
}

// ============================================================================
// 2. VEHICLE (高精度海陆空载具：圆轮毂、斜挡风玻璃、车灯、旋翼、履带吊臂 · 180 款)
// ============================================================================
function buildMegaVehicleVariants(): AssetVariantSpec[] {
  const out: AssetVariantSpec[] = [];

  const families: {
    key: string;
    name: string;
    w: number;
    h: number;
    d: number;
    kind:
      | 'sedan'
      | 'suv'
      | 'van'
      | 'truck'
      | 'bus'
      | 'train'
      | 'construction'
      | 'boat'
      | 'heli'
      | 'plane'
      | 'cart'
      | 'tank';
  }[] = [
    { key: 'sedan_exec', name: '行政三厢轿车', w: 1.9, h: 1.48, d: 4.7, kind: 'sedan' },
    { key: 'coupe_gt', name: '双门宽体GT跑车', w: 1.98, h: 1.32, d: 4.55, kind: 'sedan' },
    { key: 'suv_offroad', name: '硬派越野SUV', w: 2.05, h: 1.88, d: 4.85, kind: 'suv' },
    { key: 'mpv_van', name: '剧组商务保姆车', w: 1.98, h: 1.95, d: 5.15, kind: 'van' },
    { key: 'swat_van', name: '特警防暴装甲车', w: 2.25, h: 2.35, d: 5.6, kind: 'van' },
    { key: 'cargo_truck', name: '重型厢式货车', w: 2.5, h: 3.3, d: 7.8, kind: 'truck' },
    { key: 'fire_ladder', name: '消防云梯救援车', w: 2.55, h: 3.45, d: 8.6, kind: 'truck' },
    { key: 'city_bus', name: '城市双门公交车', w: 2.55, h: 3.15, d: 10.5, kind: 'bus' },
    { key: 'metro_car', name: '地铁城轨列车车厢', w: 2.8, h: 3.6, d: 12.0, kind: 'train' },
    { key: 'hsr_head', name: '复兴号高铁流线车头', w: 3.1, h: 3.7, d: 12.5, kind: 'train' },
    { key: 'excavator', name: '履带液压挖掘机', w: 2.6, h: 3.1, d: 5.8, kind: 'construction' },
    { key: 'forklift', name: '仓储平衡重叉车', w: 1.35, h: 2.15, d: 2.8, kind: 'construction' },
    { key: 'patrol_boat', name: '河道巡逻快艇', w: 2.4, h: 2.1, d: 6.4, kind: 'boat' },
    { key: 'ancient_boat', name: '江南乌篷摇橹画舫', w: 1.85, h: 1.85, d: 6.4, kind: 'boat' },
    { key: 'chopper', name: '航拍救援直升机', w: 2.8, h: 3.1, d: 7.8, kind: 'heli' },
    { key: 'jet_liner', name: '双发支线客机', w: 9.2, h: 3.8, d: 11.5, kind: 'plane' },
    { key: 'horse_carriage', name: '古装雕花木马车', w: 1.85, h: 2.35, d: 4.1, kind: 'cart' },
    { key: 'armored_apc', name: '八轮步兵装甲战车', w: 2.7, h: 2.65, d: 6.8, kind: 'tank' },
  ];

  const editions = [
    { suf: 'v1', tag: '标准款', scale: [1, 1, 1], rack: false, lightbar: false },
    { suf: 'v2', tag: '紧凑款', scale: [0.92, 0.95, 0.9], rack: false, lightbar: false },
    { suf: 'v3', tag: '加长轴距款', scale: [1.02, 1.0, 1.15], rack: false, lightbar: false },
    { suf: 'v4', tag: '宽体运动款', scale: [1.1, 0.96, 1.04], rack: true, lightbar: false },
    { suf: 'v5', tag: '车顶行李架款', scale: [1.0, 1.05, 1.0], rack: true, lightbar: false },
    { suf: 'v6', tag: '警用爆闪灯款', scale: [1.0, 1.04, 1.02], rack: false, lightbar: true },
    { suf: 'v7', tag: '外挂影视跟拍架款', scale: [1.05, 1.08, 1.06], rack: true, lightbar: true },
    { suf: 'v8', tag: '高顶工程执勤款', scale: [1.04, 1.14, 1.05], rack: true, lightbar: false },
    { suf: 'v9', tag: '重装防护加固款', scale: [1.08, 1.06, 1.1], rack: false, lightbar: true },
    { suf: 'v10', tag: '片场主景精模款', scale: [1.02, 1.02, 1.02], rack: true, lightbar: false },
  ];

  families.forEach((f) => {
    editions.forEach((ed) => {
      const w = r2(f.w * ed.scale[0]);
      const h = r2(f.h * ed.scale[1]);
      const d = r2(f.d * ed.scale[2]);
      const parts: InventoryPart[] = [];

      if (f.kind === 'heli') {
        parts.push(
          sph([0, h * 0.44, -d * 0.14], w * 0.34, h * 0.28, d * 0.24, 'car'),
          sph([0, h * 0.48, -d * 0.22], w * 0.3, h * 0.22, d * 0.18, 'water'),
          cyl([0, h * 0.48, d * 0.22], 0.14, 0.26, d * 0.48, 'car', [Math.PI / 2, 0, 0]),
          box([0, h * 0.62, d * 0.42], [0.12, h * 0.32, 0.38], 'accent', [0.35, 0, 0]),
          torus([0.12, h * 0.62, d * 0.44], 0.28, 0.04, 12, 'dark', [0, Math.PI / 2, 0]),
          // Landing skids
          cyl([-w * 0.28, 0.08, -d * 0.12], 0.05, 0.05, d * 0.48, 'dark', [Math.PI / 2, 0, 0]),
          cyl([w * 0.28, 0.08, -d * 0.12], 0.05, 0.05, d * 0.48, 'dark', [Math.PI / 2, 0, 0]),
          cyl([-w * 0.22, h * 0.22, -d * 0.22], 0.04, 0.04, h * 0.28, 'dark', [0, 0, 0.28]),
          cyl([w * 0.22, h * 0.22, -d * 0.22], 0.04, 0.04, h * 0.28, 'dark', [0, 0, -0.28]),
          // Main rotor mast & 4 blades
          cyl([0, h * 0.82, -d * 0.12], 0.1, 0.14, h * 0.28, 'dark'),
          box([0, h * 0.94, -d * 0.12], [w * 1.65, 0.04, 0.18], 'dark'),
          box([0, h * 0.94, -d * 0.12], [0.18, 0.04, w * 1.65], 'dark')
        );
      } else if (f.kind === 'plane') {
        parts.push(
          cyl([0, h * 0.42, 0], w * 0.11, w * 0.11, d * 0.72, 'car', [Math.PI / 2, 0, 0]),
          cone([0, h * 0.42, -d * 0.44], w * 0.11, d * 0.18, 12, 'car', [-Math.PI / 2, 0, 0]),
          box([0, h * 0.48, -d * 0.34], [w * 0.16, 0.22, 0.55], 'water'),
          // Swept wings + twin engine nacelles
          box([0, h * 0.38, -d * 0.04], [w, 0.12, d * 0.18], 'accent'),
          cyl([-w * 0.24, h * 0.28, -d * 0.06], 0.28, 0.24, 1.4, 'dark', [Math.PI / 2, 0, 0]),
          cyl([w * 0.24, h * 0.28, -d * 0.06], 0.28, 0.24, 1.4, 'dark', [Math.PI / 2, 0, 0]),
          // Tail fin + horizontal stabilizer + tricycle landing gear
          box([0, h * 0.72, d * 0.34], [0.16, h * 0.52, d * 0.16], 'car', [-0.28, 0, 0]),
          box([0, h * 0.48, d * 0.36], [w * 0.34, 0.08, d * 0.1], 'accent'),
          addWheelX as unknown as InventoryPart
        );
        parts.pop();
        addWheelX(parts, 0, 0.22, -d * 0.32, 0.22, 0.16);
        addWheelX(parts, -w * 0.12, 0.24, d * 0.04, 0.24, 0.22);
        addWheelX(parts, w * 0.12, 0.24, d * 0.04, 0.24, 0.22);
      } else if (f.kind === 'boat') {
        const isAncient = f.key === 'ancient_boat';
        parts.push(
          box([0, h * 0.2, 0.2], [w * 0.86, h * 0.34, d * 0.68], isAncient ? 'wood' : 'car'),
          cone([0, h * 0.2, -d * 0.34], w * 0.43, d * 0.32, 4, isAncient ? 'wood' : 'car', [-Math.PI / 2, Math.PI / 4, 0]),
          // Arched canopy or pilot house
          isAncient
            ? cyl([0, h * 0.52, 0.15], w * 0.4, w * 0.4, d * 0.46, 'trunk', [Math.PI / 2, 0, 0])
            : box([0, h * 0.56, -0.2], [w * 0.64, h * 0.42, d * 0.36], 'default'),
          box([0, h * 0.6, -d * 0.2], [w * 0.58, h * 0.22, 0.12], 'water'),
          torus([w * 0.44, h * 0.36, 0], 0.22, 0.06, 12, 'accent', [0, Math.PI / 2, 0]),
          cyl([0, h * 0.85, -0.2], 0.04, 0.05, h * 0.35, 'dark')
        );
      } else if (f.kind === 'construction') {
        const isExc = f.key === 'excavator';
        parts.push(
          // Left & right crawler tracks or wheel base
          box([-w * 0.36, 0.32, 0], [0.42, 0.56, d * 0.62], 'dark'),
          box([w * 0.36, 0.32, 0], [0.42, 0.56, d * 0.62], 'dark'),
          cyl([-w * 0.36, 0.32, -d * 0.3], 0.28, 0.28, 0.44, 'dark', [0, 0, Math.PI / 2]),
          cyl([w * 0.36, 0.32, -d * 0.3], 0.28, 0.28, 0.44, 'dark', [0, 0, Math.PI / 2]),
          // Turntable + operator cab with glass + counterweight
          cyl([0, 0.68, 0], w * 0.34, w * 0.36, 0.22, 'dark'),
          box([-w * 0.16, 1.38, -0.15], [w * 0.44, 1.18, d * 0.36], 'car'),
          box([-w * 0.16, 1.48, -d * 0.18], [w * 0.38, 0.72, 0.18], 'water'),
          box([0, 1.18, d * 0.22], [w * 0.78, 0.78, d * 0.22], 'accent')
        );
        if (isExc) {
          // Articulated hydraulic boom + stick + bucket
          parts.push(
            box([w * 0.14, 1.85, -d * 0.24], [0.28, 1.9, 0.34], 'car', [0.58, 0, 0]),
            box([w * 0.14, 1.72, -d * 0.52], [0.22, 1.55, 0.26], 'car', [-0.42, 0, 0]),
            box([w * 0.14, 0.85, -d * 0.62], [0.68, 0.52, 0.62], 'dark', [0.35, 0, 0])
          );
        } else {
          // Forklift mast & forks
          parts.push(
            box([-w * 0.22, h * 0.52, -d * 0.38], [0.1, h * 0.92, 0.12], 'dark'),
            box([w * 0.22, h * 0.52, -d * 0.38], [0.1, h * 0.92, 0.12], 'dark'),
            box([-w * 0.18, 0.12, -d * 0.62], [0.12, 0.06, 0.95], 'dark'),
            box([w * 0.18, 0.12, -d * 0.62], [0.12, 0.06, 0.95], 'dark')
          );
        }
      } else if (f.kind === 'cart') {
        // Ancient wooden horse carriage with spoked big wheels & curved roof
        addWheelX(parts, -w * 0.46, 0.52, 0.1, 0.52, 0.12);
        addWheelX(parts, w * 0.46, 0.52, 0.1, 0.52, 0.12);
        parts.push(
          box([0, 0.62, 0], [w * 0.82, 0.18, d * 0.78], 'wood'),
          box([0, 1.28, 0.15], [w * 0.78, 1.15, d * 0.52], 'trunk'),
          cyl([0, 1.92, 0.15], w * 0.44, w * 0.44, d * 0.58, 'dark', [Math.PI / 2, 0, 0]),
          box([-w * 0.26, 0.58, -d * 0.44], [0.09, 0.09, d * 0.42], 'wood'),
          box([w * 0.26, 0.58, -d * 0.44], [0.09, 0.09, d * 0.42], 'wood')
        );
      } else {
        // Detailed road/rail vehicle: 4–6 cylindrical wheels + chassis + hood + sloped windshield + cabin windows + headlights + bumpers + mirrors
        const wr = f.kind === 'truck' || f.kind === 'bus' || f.kind === 'tank' ? 0.46 : 0.34;
        const ww = 0.24;
        addWheelX(parts, -w * 0.44, wr, -d * 0.3, wr, ww);
        addWheelX(parts, w * 0.44, wr, -d * 0.3, wr, ww);
        addWheelX(parts, -w * 0.44, wr, d * 0.3, wr, ww);
        addWheelX(parts, w * 0.44, wr, d * 0.3, wr, ww);
        if (f.kind === 'tank' || f.kind === 'truck') {
          addWheelX(parts, -w * 0.44, wr, 0, wr, ww);
          addWheelX(parts, w * 0.44, wr, 0, wr, ww);
        }

        // Lower body + front/rear bumpers + headlights + grille
        const bodyH = (h - wr * 0.7) * 0.52;
        const bodyY = wr * 0.75 + bodyH * 0.5;
        parts.push(
          box([0, r2(bodyY), 0], [w * 0.94, r2(bodyH), d * 0.94], 'car'),
          box([0, r2(wr * 0.72), r2(-d * 0.48)], [w * 0.96, 0.22, 0.16], 'dark'),
          box([0, r2(wr * 0.72), r2(d * 0.48)], [w * 0.96, 0.22, 0.16], 'dark'),
          // Headlights & grille
          box([r2(-w * 0.32), r2(bodyY + 0.04), r2(-d * 0.475)], [w * 0.18, 0.16, 0.06], 'emissiveLamp'),
          box([r2(w * 0.32), r2(bodyY + 0.04), r2(-d * 0.475)], [w * 0.18, 0.16, 0.06], 'emissiveLamp'),
          box([0, r2(bodyY - 0.02), r2(-d * 0.475)], [w * 0.34, 0.22, 0.05], 'dark'),
          // Side mirrors
          box([r2(-w * 0.51), r2(bodyY + bodyH * 0.48), r2(-d * 0.18)], [0.14, 0.12, 0.18], 'dark'),
          box([r2(w * 0.51), r2(bodyY + bodyH * 0.48), r2(-d * 0.18)], [0.14, 0.12, 0.18], 'dark')
        );

        // Cabin greenhouse + sloped windshield + side windows
        const cabD = f.kind === 'bus' || f.kind === 'train' || f.kind === 'van' ? d * 0.84 : d * 0.5;
        const cabZ = f.kind === 'truck' ? -d * 0.28 : f.kind === 'sedan' ? d * 0.04 : 0;
        const cabH = h - (bodyY + bodyH * 0.45);
        const cabY = bodyY + bodyH * 0.45 + cabH * 0.5;
        parts.push(
          box([0, r2(cabY), r2(cabZ)], [w * 0.84, r2(cabH), r2(cabD)], 'default'),
          // Sloped front windshield glass
          box([0, r2(cabY - 0.02), r2(cabZ - cabD * 0.5)], [w * 0.78, r2(cabH * 0.88), 0.1], 'water', [0.38, 0, 0]),
          // Side window glass band
          box([0, r2(cabY + 0.02), r2(cabZ)], [w * 0.86, r2(cabH * 0.62), r2(cabD * 0.82)], 'water')
        );

        if (f.kind === 'truck') {
          // Cargo box or fire ladder on rear
          parts.push(
            box([0, r2(wr + (h - wr) * 0.52), r2(d * 0.16)], [w * 0.96, r2((h - wr) * 0.95), r2(d * 0.58)], f.key === 'fire_ladder' ? 'accent' : 'default')
          );
          if (f.key === 'fire_ladder') {
            parts.push(box([0, r2(h + 0.18), r2(d * 0.05)], [0.65, 0.22, d * 0.78], 'default', [0.08, 0, 0]));
          }
        }
        if (f.kind === 'tank') {
          parts.push(
            cyl([0, r2(h * 0.82), -0.2], w * 0.34, w * 0.38, 0.48, 'dark'),
            cyl([0, r2(h * 0.86), -d * 0.36], 0.09, 0.11, d * 0.52, 'dark', [Math.PI / 2, 0, 0])
          );
        }
        if (ed.rack) {
          parts.push(box([0, r2(h + 0.06), r2(cabZ)], [w * 0.68, 0.1, cabD * 0.68], 'dark'));
        }
        if (ed.lightbar) {
          parts.push(box([0, r2(h + 0.12), r2(cabZ - cabD * 0.25)], [w * 0.52, 0.12, 0.24], 'emissiveLamp'));
        }
      }

      out.push({
        id: `m_veh_${f.key}_${ed.suf}`,
        label: `${f.name} · ${ed.tag}`,
        heightM: h,
        widthM: w,
        depthM: d,
        parts,
      });
    });
  });

  return out;
}

// ============================================================================
// 3. LAMP (精细化路灯、宫灯、石灯笼、信号灯与片场C架灯光 · 150 款)
// ============================================================================
function buildMegaLampVariants(): AssetVariantSpec[] {
  const out: AssetVariantSpec[] = [];

  const styles = [
    { key: 'city_single', name: '现代弧臂单挑路灯', baseH: 5.2, arms: 1, kind: 'pole' },
    { key: 'city_twin', name: '大道对称玉兰双臂路灯', baseH: 6.0, arms: 2, kind: 'pole' },
    { key: 'smart_pole', name: '5G智慧城市多功能灯杆', baseH: 5.6, arms: 1, kind: 'smart' },
    { key: 'palace_lantern', name: '古建雕花双联红绸宫灯柱', baseH: 4.2, arms: 2, kind: 'palace' },
    { key: 'stone_deng', name: '古典庭院六角青石灯笼', baseH: 2.2, arms: 1, kind: 'stone' },
    { key: 'euro_classic', name: '欧式古典五头皇冠铁艺街灯', baseH: 4.5, arms: 2, kind: 'euro' },
    { key: 'traffic_sig', name: '悬臂红绿灯电子抓拍杆', baseH: 5.8, arms: 1, kind: 'traffic' },
    { key: 'film_hmi', name: '片场18K镝灯三脚魔术腿架', baseH: 2.8, arms: 1, kind: 'film' },
    { key: 'film_softbox', name: '片场八角柔光箱C型灯架', baseH: 3.1, arms: 1, kind: 'softbox' },
    { key: 'stadium_mast', name: '广场阵列投光高杆灯塔', baseH: 9.2, arms: 2, kind: 'mast' },
  ];

  const heights = [
    { suf: 'h1', tag: '低矮近景型', hMul: 0.78 },
    { suf: 'h2', tag: '标准人行道型', hMul: 0.9 },
    { suf: 'h3', tag: '标准主街型', hMul: 1.0 },
    { suf: 'h4', tag: '加高干道型', hMul: 1.12 },
    { suf: 'h5', tag: '特高广场型', hMul: 1.25 },
    { suf: 'h6', tag: '带球机监控款', hMul: 1.02, cam: true },
    { suf: 'h7', tag: '带双侧道旗灯箱款', hMul: 1.05, banner: true },
    { suf: 'h8', tag: '带太阳能光伏板款', hMul: 1.08, solar: true },
    { suf: 'h9', tag: '四头加密灯具款', hMul: 1.1, extraHead: true },
    { suf: 'h10', tag: '带雕花石座款', hMul: 1.0, base: true },
    { suf: 'h11', tag: '高流明冷白光款', hMul: 0.96 },
    { suf: 'h12', tag: '暖黄氛围灯款', hMul: 0.94 },
    { suf: 'h13', tag: '防台风法兰底座款', hMul: 1.04, base: true },
    { suf: 'h14', tag: '片场双联灯组款', hMul: 1.15, extraHead: true },
    { suf: 'h15', tag: '旗舰地标景观款', hMul: 1.28, banner: true, solar: true },
  ];

  styles.forEach((st) => {
    heights.forEach((hc) => {
      const h = r2(st.baseH * hc.hMul);
      const w = st.kind === 'traffic' ? 3.8 : st.arms === 2 ? 2.4 : 1.5;
      const d = 1.2;
      const parts: InventoryPart[] = [];

      if (st.kind === 'stone') {
        // Multi-tiered carved stone lantern (底座+覆莲+中杆+中台+火袋+六角笠顶+宝珠)
        parts.push(
          cyl([0, 0.14, 0], 0.42, 0.48, 0.28, 'rock'),
          cyl([0, 0.34, 0], 0.32, 0.24, 0.16, 'concrete'),
          cyl([0, h * 0.44, 0], 0.14, 0.16, h * 0.48, 'rock'),
          cyl([0, h * 0.7, 0], 0.38, 0.28, 0.14, 'rock'),
          cyl([0, h * 0.8, 0], 0.24, 0.24, 0.28, 'emissiveLamp'),
          cone([0, h * 0.94, 0], 0.56, 0.32, 6, 'dark'),
          sph([0, h + 0.08, 0], 0.1, 0.12, 0.1, 'accent')
        );
      } else if (st.kind === 'film' || st.kind === 'softbox') {
        // 3 splayed tripod legs + central riser + yoke + barn-door lamp head or octagonal softbox
        parts.push(
          cyl([-0.38, 0.35, 0.32], 0.03, 0.03, 0.85, 'dark', [0.42, 0, -0.45]),
          cyl([0.38, 0.35, 0.32], 0.03, 0.03, 0.85, 'dark', [0.42, 0, 0.45]),
          cyl([0, 0.35, -0.45], 0.03, 0.03, 0.85, 'dark', [-0.52, 0, 0]),
          cyl([0, h * 0.5, 0], 0.04, 0.06, h * 0.82, 'dark'),
          box([0, h * 0.86, 0], [0.58, 0.42, 0.08], 'dark'),
          st.kind === 'softbox'
            ? cone([0, h * 0.88, 0.22], 0.58, 0.48, 8, 'default', [-Math.PI / 2, 0, 0])
            : cyl([0, h * 0.88, 0.14], 0.26, 0.22, 0.48, 'dark', [Math.PI / 2, 0, 0]),
          cyl([0, h * 0.88, 0.42], 0.24, 0.24, 0.06, 'emissiveLamp', [Math.PI / 2, 0, 0])
        );
      } else {
        // Octagonal/tapered flange base + main pole + collar rings
        parts.push(
          cyl([0, 0.18, 0], 0.24, 0.32, 0.36, hc.base ? 'rock' : 'dark'),
          cyl([0, 0.45, 0], 0.16, 0.22, 0.26, 'accent'),
          cyl([0, h * 0.52, 0], 0.07, 0.13, h * 0.9, st.kind === 'palace' ? 'trunk' : 'dark'),
          torus([0, h * 0.72, 0], 0.11, 0.03, 12, 'accent', [Math.PI / 2, 0, 0])
        );

        if (st.kind === 'traffic') {
          parts.push(
            box([1.35, h * 0.88, 0], [2.7, 0.12, 0.12], 'dark'),
            box([0.9, h * 0.8, 0], [1.6, 0.06, 0.06], 'dark', [0, 0, 0.18]),
            // 3-color signal box + camera flash unit
            box([2.15, h * 0.88, 0.12], [0.92, 0.32, 0.18], 'dark'),
            sph([1.88, h * 0.88, 0.22], 0.09, 0.09, 0.05, 'emissiveLamp'),
            sph([2.15, h * 0.88, 0.22], 0.09, 0.09, 0.05, 'emissiveLamp'),
            sph([2.42, h * 0.88, 0.22], 0.09, 0.09, 0.05, 'emissiveLamp'),
            box([1.2, h * 0.96, 0.14], [0.22, 0.18, 0.28], 'default')
          );
        } else if (st.kind === 'palace') {
          // Carved wood arms + hanging red palace lanterns + gold tassels
          parts.push(
            box([0, h * 0.9, 0], [1.6, 0.12, 0.14], 'wood'),
            cone([0, h + 0.08, 0], 0.24, 0.28, 6, 'accent'),
            sph([-0.68, h * 0.8, 0], 0.22, 0.28, 0.22, 'emissiveLamp'),
            cyl([-0.68, h * 0.68, 0], 0.06, 0.08, 0.18, 'accent'),
            sph([0.68, h * 0.8, 0], 0.22, 0.28, 0.22, 'emissiveLamp'),
            cyl([0.68, h * 0.68, 0], 0.06, 0.08, 0.18, 'accent')
          );
        } else {
          // Modern / European curved arm + cobra luminaire housing + LED lens
          parts.push(
            box([0.44, h * 0.91, 0], [0.88, 0.08, 0.1], 'dark', [0, 0, 0.22]),
            box([0.82, h * 0.96, 0], [0.46, 0.1, 0.26], 'dark'),
            box([0.82, h * 0.92, 0], [0.38, 0.05, 0.22], 'emissiveLamp')
          );
          if (st.arms === 2 || hc.extraHead) {
            parts.push(
              box([-0.44, h * 0.91, 0], [0.88, 0.08, 0.1], 'dark', [0, 0, -0.22]),
              box([-0.82, h * 0.96, 0], [0.46, 0.1, 0.26], 'dark'),
              box([-0.82, h * 0.92, 0], [0.38, 0.05, 0.22], 'emissiveLamp')
            );
          }
        }

        if (hc.banner) {
          parts.push(
            box([-0.32, h * 0.62, 0], [0.44, h * 0.22, 0.05], 'accent'),
            box([0.32, h * 0.62, 0], [0.44, h * 0.22, 0.05], 'accent')
          );
        }
        if (hc.solar) {
          parts.push(box([0, h + 0.12, 0], [0.78, 0.06, 0.56], 'dark', [0.38, 0, 0]));
        }
        if (hc.cam) {
          parts.push(
            box([0.22, h * 0.74, 0], [0.38, 0.06, 0.06], 'dark'),
            sph([0.36, h * 0.7, 0], 0.1, 0.1, 0.1, 'default')
          );
        }
      }

      out.push({
        id: `m_lamp_${st.key}_${hc.suf}`,
        label: `${st.name} · ${hc.tag}`,
        heightM: h,
        widthM: w,
        depthM: d,
        parts,
      });
    });
  });

  return out;
}

// ============================================================================
// 4. BARRIER (精细化汉白玉栏杆、锻铁尖矛栏、木马场栏与声屏障 · 160 款 · 沿 +X 轴连续拼接)
// ============================================================================
function buildMegaBarrierVariants(): AssetVariantSpec[] {
  const out: AssetVariantSpec[] = [];

  const fenceStyles = [
    { key: 'hanbaiyu', name: '古建汉白玉雕花望柱栏板', baseW: 2.6, baseH: 1.18, mat: 'default' as ClayVariant, postMat: 'accent' as ClayVariant },
    { key: 'wrought_eu', name: '欧式古典锻铁尖矛围栏', baseW: 3.0, baseH: 1.75, mat: 'dark' as ClayVariant, postMat: 'concrete' as ClayVariant },
    { key: 'wood_ranch', name: '庄园原木卯榫横梁马场栏', baseW: 3.2, baseH: 1.35, mat: 'wood' as ClayVariant, postMat: 'trunk' as ClayVariant },
    { key: 'bamboo_zen', name: '日式枯山水竹编菱格篱笆', baseW: 2.8, baseH: 1.5, mat: 'wood' as ClayVariant, postMat: 'trunk' as ClayVariant },
    { key: 'hwy_wbeam', name: '高速双波钢板防撞护栏', baseW: 3.4, baseH: 0.95, mat: 'accent' as ClayVariant, postMat: 'dark' as ClayVariant },
    { key: 'site_hoard', name: '装配式压型钢板施工围挡', baseW: 3.2, baseH: 2.1, mat: 'default' as ClayVariant, postMat: 'dark' as ClayVariant },
    { key: 'glass_bal', name: '现代不锈钢立柱夹胶玻璃栏杆', baseW: 2.6, baseH: 1.2, mat: 'water' as ClayVariant, postMat: 'dark' as ClayVariant },
    { key: 'mesh_sec', name: '边境安防Y型臂刀片铁丝网', baseW: 3.2, baseH: 2.25, mat: 'dark' as ClayVariant, postMat: 'concrete' as ClayVariant },
    { key: 'stone_parapet', name: '江南运河青石雕花驳岸栏', baseW: 2.8, baseH: 1.12, mat: 'rock' as ClayVariant, postMat: 'concrete' as ClayVariant },
    { key: 'sandbag_line', name: '战地掩体多层叠垒沙袋墙', baseW: 2.6, baseH: 1.15, mat: 'wood' as ClayVariant, postMat: 'trunk' as ClayVariant },
  ];

  const mods = [
    { suf: 'b1', tag: '标准2.8m段', wMul: 1.0, hMul: 1.0, rails: 2, plinth: true },
    { suf: 'b2', tag: '加高加密段', wMul: 1.0, hMul: 1.22, rails: 3, plinth: true },
    { suf: 'b3', tag: '低矮边界段', wMul: 0.95, hMul: 0.78, rails: 2, plinth: false },
    { suf: 'b4', tag: '带须弥座基座段', wMul: 1.0, hMul: 1.08, rails: 2, plinth: true, cap: true },
    { suf: 'b5', tag: '三望柱双跨段', wMul: 1.0, hMul: 1.0, rails: 3, plinth: true, midPost: true },
    { suf: 'b6', tag: '长跨度3.6m段', wMul: 1.25, hMul: 1.0, rails: 2, plinth: true },
    { suf: 'b7', tag: '带云龙柱头宝顶段', wMul: 1.0, hMul: 1.12, rails: 2, plinth: true, cap: true },
    { suf: 'b8', tag: '四横梁重型段', wMul: 1.05, hMul: 1.15, rails: 4, plinth: true },
    { suf: 'b9', tag: '带竖向剑矛密栅段', wMul: 1.0, hMul: 1.05, rails: 2, plinth: true, pickets: true },
    { suf: 'b10', tag: '带柱顶球灯段', wMul: 1.0, hMul: 1.18, rails: 2, plinth: true, lamp: true },
    { suf: 'b11', tag: '短跨转折段', wMul: 0.75, hMul: 1.0, rails: 2, plinth: true },
    { suf: 'b12', tag: '宽厚重型防护段', wMul: 1.1, hMul: 1.1, rails: 3, plinth: true, pickets: true },
    { suf: 'b13', tag: '镂空寻杖花格段', wMul: 1.0, hMul: 1.05, rails: 3, plinth: true, midPost: true, cap: true },
    { suf: 'b14', tag: '高密防攀爬段', wMul: 1.0, hMul: 1.3, rails: 4, plinth: true, pickets: true },
    { suf: 'b15', tag: '景区亲水步道段', wMul: 1.05, hMul: 0.92, rails: 2, plinth: true, cap: true },
    { suf: 'b16', tag: '片场主景精雕段', wMul: 1.15, hMul: 1.08, rails: 3, plinth: true, cap: true, pickets: true },
  ];

  fenceStyles.forEach((fs) => {
    mods.forEach((m) => {
      const w = r2(fs.baseW * m.wMul);
      const h = r2(fs.baseH * m.hMul);
      const d = 0.28;
      const parts: InventoryPart[] = [
        // Left & right main posts with base collars
        box([-w * 0.46, h * 0.5, 0], [0.22, h, 0.24], fs.postMat),
        box([w * 0.46, h * 0.5, 0], [0.22, h, 0.24], fs.postMat),
        box([-w * 0.46, 0.14, 0], [0.28, 0.28, 0.3], 'rock'),
        box([w * 0.46, 0.14, 0], [0.28, 0.28, 0.3], 'rock'),
      ];
      if (m.midPost) {
        parts.push(box([0, h * 0.48, 0], [0.18, h * 0.96, 0.2], fs.postMat));
      }
      if (m.plinth) {
        parts.push(box([0, 0.14, 0], [w * 0.98, 0.26, 0.26], 'concrete'));
      }
      for (let r = 0; r < m.rails; r++) {
        const ry = r2(0.32 + ((h - 0.42) * (r + 0.5)) / m.rails);
        parts.push(box([0, ry, 0], [w * 0.92, Math.max(0.08, h * 0.12), 0.1], fs.mat));
      }
      // Vertical balusters / pickets along the span so it never looks like 2 plain bars
      const picketCount = m.pickets ? 7 : 5;
      for (let p = 0; p < picketCount; p++) {
        const px = r2(-w * 0.36 + (w * 0.72 * p) / (picketCount - 1));
        parts.push(cyl([px, h * 0.5, 0], 0.04, 0.04, h * 0.68, fs.mat));
        if (fs.key === 'wrought_eu') {
          parts.push(cone([px, h * 0.88, 0], 0.06, 0.14, 4, 'accent'));
        }
      }
      if (m.cap || fs.key === 'hanbaiyu') {
        parts.push(
          cyl([-w * 0.46, h + 0.06, 0], 0.14, 0.1, 0.12, 'accent'),
          sph([-w * 0.46, h + 0.16, 0], 0.12, 0.14, 0.12, 'default'),
          cyl([w * 0.46, h + 0.06, 0], 0.14, 0.1, 0.12, 'accent'),
          sph([w * 0.46, h + 0.16, 0], 0.12, 0.14, 0.12, 'default')
        );
      }
      if (m.lamp) {
        parts.push(
          sph([-w * 0.46, h + 0.18, 0], 0.14, 0.16, 0.14, 'emissiveLamp'),
          sph([w * 0.46, h + 0.18, 0], 0.14, 0.16, 0.14, 'emissiveLamp')
        );
      }

      out.push({
        id: `m_bar_${fs.key}_${m.suf}`,
        label: `${fs.name} · ${m.tag}`,
        heightM: h,
        widthM: w,
        depthM: d,
        parts,
      });
    });
  });

  return out;
}

// ============================================================================
// 5. TREE (精细化分枝乔木、迎客松、垂柳、竹丛与盆景绿植 · 180 款)
// ============================================================================
function buildMegaTreeVariants(): AssetVariantSpec[] {
  const out: AssetVariantSpec[] = [];

  const species = [
    { key: 'camphor', name: '香樟古树', w: 4.6, h: 6.2, crown: 'cloud' },
    { key: 'ginkgo', name: '金秋银杏树', w: 3.6, h: 6.5, crown: 'cone_soft' },
    { key: 'willow', name: '临水垂丝柳树', w: 4.8, h: 5.8, crown: 'droop' },
    { key: 'pine_guest', name: '黄山迎客松', w: 4.6, h: 5.2, crown: 'tier_pine' },
    { key: 'cypress', name: '挺拔古侧柏', w: 2.1, h: 6.8, crown: 'spire' },
    { key: 'maple', name: '鸡爪红枫树', w: 3.8, h: 4.6, crown: 'cloud' },
    { key: 'banyan', name: '气根大榕树', w: 6.2, h: 6.8, crown: 'wide_banyan' },
    { key: 'cherry', name: '庭院八重樱花树', w: 3.8, h: 4.5, crown: 'cloud' },
    { key: 'palm_coco', name: '海滨弯曲椰子树', w: 3.6, h: 6.4, crown: 'palm' },
    { key: 'bamboo_grove', name: '潇湘翠竹丛林簇', w: 2.8, h: 5.6, crown: 'bamboo' },
    { key: 'hedge_trim', name: '法式修剪造型绿篱', w: 2.4, h: 1.8, crown: 'hedge' },
    { key: 'cactus_des', name: '戈壁多臂巨人柱仙人掌', w: 2.0, h: 3.8, crown: 'cactus' },
  ];

  const ages = [
    { suf: 't1', tag: '幼苗株', s: 0.65 },
    { suf: 't2', tag: '青年株', s: 0.82 },
    { suf: 't3', tag: '标准成树', s: 1.0 },
    { suf: 't4', tag: '茂密盛冠株', s: 1.15 },
    { suf: 't5', tag: '百年古木株', s: 1.32 },
    { suf: 't6', tag: '双干连理株', s: 1.08, twin: true },
    { suf: 't7', tag: '三株丛生簇', s: 1.12, triple: true },
    { suf: 't8', tag: '斜倚临水株', s: 1.0, lean: true },
    { suf: 't9', tag: '带青石树池株', s: 1.02, planter: true },
    { suf: 't10', tag: '高干林荫道株', s: 1.18 },
    { suf: 't11', tag: '庭院盆景造型株', s: 0.58, planter: true },
    { suf: 't12', tag: '疏朗远景株', s: 0.92 },
    { suf: 't13', tag: '宽冠遮阴大树', s: 1.24 },
    { suf: 't14', tag: '名园孤植主景株', s: 1.28, planter: true },
    { suf: 't15', tag: '片场前景框景株', s: 1.1, lean: true },
  ];

  species.forEach((sp) => {
    ages.forEach((ag) => {
      const w = r2(sp.w * ag.s);
      const h = r2(sp.h * ag.s);
      const parts: InventoryPart[] = [];

      if (ag.planter) {
        parts.push(
          box([0, 0.22, 0], [w * 0.52, 0.44, w * 0.52], 'rock'),
          box([0, 0.44, 0], [w * 0.46, 0.08, w * 0.46], 'trunk')
        );
      }

      if (sp.crown === 'hedge') {
        parts.push(
          box([0, h * 0.38, 0], [w, h * 0.68, w * 0.52], 'foliage'),
          sph([-w * 0.32, h * 0.84, 0], h * 0.22, h * 0.24, h * 0.22, 'foliage'),
          cone([0, h * 0.88, 0], h * 0.24, h * 0.38, 8, 'foliage'),
          sph([w * 0.32, h * 0.84, 0], h * 0.22, h * 0.24, h * 0.22, 'foliage')
        );
      } else if (sp.crown === 'bamboo') {
        const offsets = [
          [-0.45, -0.2], [-0.15, 0.25], [0.18, -0.18], [0.42, 0.2], [0, 0]
        ];
        offsets.forEach(([ox, oz], idx) => {
          const bh = r2(h * (0.78 + (idx % 3) * 0.1));
          parts.push(
            cyl([r2(ox * ag.s), bh * 0.48, r2(oz * ag.s)], 0.05, 0.07, bh * 0.94, 'foliage', [(idx - 2) * 0.05, 0, (idx - 2) * 0.06]),
            sph([r2(ox * 1.2 * ag.s), bh * 0.82, r2(oz * 1.2 * ag.s)], w * 0.24, h * 0.14, w * 0.24, 'foliage'),
            sph([r2(ox * 1.3 * ag.s), bh * 0.95, r2(oz * 1.1 * ag.s)], w * 0.2, h * 0.12, w * 0.2, 'foliage')
          );
        });
      } else if (sp.crown === 'cactus') {
        parts.push(
          cyl([0, h * 0.48, 0], 0.22 * ag.s, 0.26 * ag.s, h * 0.92, 'foliage'),
          sph([0, h * 0.94, 0], 0.22 * ag.s, 0.22 * ag.s, 0.22 * ag.s, 'foliage'),
          cyl([-w * 0.28, h * 0.56, 0], 0.15 * ag.s, 0.16 * ag.s, h * 0.38, 'foliage'),
          box([-w * 0.14, h * 0.38, 0], [w * 0.28, 0.24 * ag.s, 0.24 * ag.s], 'foliage'),
          cyl([w * 0.28, h * 0.64, 0], 0.14 * ag.s, 0.15 * ag.s, h * 0.34, 'foliage'),
          box([w * 0.14, h * 0.48, 0], [w * 0.28, 0.22 * ag.s, 0.22 * ag.s], 'foliage')
        );
      } else if (sp.crown === 'palm') {
        // Segmented curved trunk + coconuts + 6 radiating arched palm fronds
        parts.push(
          cyl([0, h * 0.22, 0], 0.18 * ag.s, 0.26 * ag.s, h * 0.45, 'trunk', [0, 0, 0.12]),
          cyl([-0.18 * ag.s, h * 0.58, 0], 0.14 * ag.s, 0.18 * ag.s, h * 0.42, 'trunk', [0, 0, 0.2]),
          sph([-0.32 * ag.s, h * 0.78, 0], 0.24 * ag.s, 0.2 * ag.s, 0.24 * ag.s, 'trunk')
        );
        for (let a = 0; a < 6; a++) {
          const ang = (a * Math.PI) / 3;
          const fx = -0.32 * ag.s + Math.cos(ang) * w * 0.28;
          const fz = Math.sin(ang) * w * 0.28;
          parts.push(
            box([r2(fx), r2(h * 0.82), r2(fz)], [w * 0.46, 0.12, 0.38], 'foliage', [0.25, -ang, 0.32])
          );
        }
      } else if (sp.crown === 'spire' || sp.crown === 'cone_soft') {
        // Multi-tiered conifer / ginkgo with trunk + 4 stacked conical/spherical layers
        parts.push(
          cyl([0, h * 0.2, 0], 0.15 * ag.s, 0.26 * ag.s, h * 0.4, 'trunk'),
          cone([0, h * 0.44, 0], w * 0.48, h * 0.38, 10, 'foliage'),
          cone([0, h * 0.62, 0], w * 0.39, h * 0.36, 10, 'foliage'),
          cone([0, h * 0.79, 0], w * 0.29, h * 0.32, 10, 'foliage'),
          cone([0, h * 0.92, 0], w * 0.18, h * 0.24, 10, 'foliage')
        );
      } else {
        // Multi-branch broadleaf / pine / willow / banyan: root flare + main trunk + 3 fork branches + 7 cloud foliage puffs
        const leanZ = ag.lean ? 0.18 : 0;
        parts.push(
          cyl([0, h * 0.08, 0], 0.22 * ag.s, 0.36 * ag.s, h * 0.16, 'trunk'),
          cyl([0, h * 0.28, 0], 0.16 * ag.s, 0.24 * ag.s, h * 0.46, 'trunk', [0, 0, leanZ]),
          // 3 primary limbs branching outward
          cyl([-w * 0.14, h * 0.48, 0.08], 0.09 * ag.s, 0.13 * ag.s, h * 0.28, 'trunk', [0.22, 0, 0.48]),
          cyl([w * 0.15, h * 0.5, -0.06], 0.09 * ag.s, 0.13 * ag.s, h * 0.28, 'trunk', [-0.2, 0, -0.46]),
          cyl([0.04, h * 0.52, -w * 0.12], 0.08 * ag.s, 0.12 * ag.s, h * 0.26, 'trunk', [-0.45, 0, 0.12]),
          // 6 layered foliage canopy pads
          sph([0, h * 0.78, 0], w * 0.36, h * 0.22, w * 0.36, 'foliage'),
          sph([-w * 0.24, h * 0.66, 0.16], w * 0.28, h * 0.18, w * 0.28, 'foliage'),
          sph([w * 0.26, h * 0.68, -0.14], w * 0.28, h * 0.18, w * 0.28, 'foliage'),
          sph([0.1, h * 0.65, w * 0.24], w * 0.25, h * 0.17, w * 0.25, 'foliage'),
          sph([-0.12, h * 0.67, -w * 0.24], w * 0.26, h * 0.17, w * 0.26, 'foliage'),
          sph([0, h * 0.9, 0], w * 0.24, h * 0.15, w * 0.24, 'foliage')
        );
        if (sp.crown === 'droop' || sp.crown === 'wide_banyan') {
          // Hanging willow curtains or banyan aerial roots
          const mat: ClayVariant = sp.crown === 'droop' ? 'foliage' : 'trunk';
          parts.push(
            cyl([-w * 0.3, h * 0.44, 0.18], 0.06, 0.03, h * 0.38, mat),
            cyl([w * 0.3, h * 0.44, -0.16], 0.06, 0.03, h * 0.38, mat),
            cyl([0.14, h * 0.44, w * 0.28], 0.06, 0.03, h * 0.38, mat)
          );
        }
        if (ag.twin) {
          parts.push(
            cyl([w * 0.14, h * 0.26, 0.1], 0.12 * ag.s, 0.18 * ag.s, h * 0.45, 'trunk', [0, 0, -0.26])
          );
        }
      }

      out.push({
        id: `m_tree_${sp.key}_${ag.suf}`,
        label: `${sp.name} · ${ag.tag}`,
        heightM: h,
        widthM: w,
        depthM: w,
        parts,
      });
    });
  });

  return out;
}

// ============================================================================
// 6. ROCK (精细化叠石假山、镂空太湖石、玄武岩柱群与苔藓奇石 · 150 款)
// ============================================================================
function buildMegaRockVariants(): AssetVariantSpec[] {
  const out: AssetVariantSpec[] = [];

  const rockTypes = [
    { key: 'taihu', name: '江南名园瘦漏透太湖石', w: 2.2, h: 2.9, d: 1.8 },
    { key: 'granite', name: '山岳风化花岗岩巨石组', w: 3.2, h: 2.4, d: 2.8 },
    { key: 'cliff_slab', name: '层状断层沉积岩悬崖壁', w: 4.5, h: 4.2, d: 2.6 },
    { key: 'karst_peak', name: '桂林喀斯特剑状孤峰群', w: 3.4, h: 5.6, d: 3.2 },
    { key: 'river_cobble', name: '溪流苔藓河滩卵石滩', w: 2.8, h: 1.2, d: 2.4 },
    { key: 'basalt_col', name: '火山六方玄武岩柱林', w: 2.8, h: 3.5, d: 2.6 },
    { key: 'desert_arch', name: '西北雅丹风蚀天生石拱桥', w: 4.2, h: 3.6, d: 2.4 },
    { key: 'yellow_rockery', name: '古典园林叠山黄石假山带亭', w: 3.8, h: 3.4, d: 2.6 },
    { key: 'stele_stone', name: '古道贔屭驮碑摩崖石刻', w: 1.9, h: 3.1, d: 1.4 },
    { key: 'ice_glacier', name: '极地棱角冰川晶簇岩', w: 3.6, h: 3.2, d: 3.0 },
  ];

  const formations = [
    { suf: 'r1', tag: '独石立峰型', s: [0.85, 1.0, 0.85], moss: false },
    { suf: 'r2', tag: '标准景石型', s: [1.0, 1.0, 1.0], moss: false },
    { suf: 'r3', tag: '横卧宽体叠石', s: [1.28, 0.78, 1.15], moss: true },
    { suf: 'r4', tag: '高耸险峰型', s: [0.95, 1.35, 0.95], moss: false },
    { suf: 'r5', tag: '双峰夹峙群', s: [1.22, 1.12, 1.05], moss: true },
    { suf: 'r6', tag: '三叠群石组', s: [1.18, 1.05, 1.18], moss: true },
    { suf: 'r7', tag: '悬挑危岩型', s: [1.15, 1.15, 1.1], moss: false },
    { suf: 'r8', tag: '阶梯汀步石群', s: [1.3, 0.68, 1.25], moss: true },
    { suf: 'r9', tag: '透漏穿孔奇石型', s: [1.12, 1.1, 1.0], moss: false },
    { suf: 'r10', tag: '山脚乱石坡群', s: [1.35, 0.82, 1.3], moss: true },
    { suf: 'r11', tag: '巨型远景山岳石', s: [1.5, 1.4, 1.4], moss: false },
    { suf: 'r12', tag: '庭院带座赏石', s: [0.72, 0.75, 0.72], moss: true },
    { suf: 'r13', tag: '水岸驳岸叠石群', s: [1.4, 0.72, 0.9], moss: true },
    { suf: 'r14', tag: '峡谷一线天障石', s: [1.25, 1.28, 1.15], moss: false },
    { suf: 'r15', tag: '片场主景假山群', s: [1.18, 1.22, 1.12], moss: true },
  ];

  rockTypes.forEach((rt) => {
    formations.forEach((fm, idx) => {
      const w = r2(rt.w * fm.s[0]);
      const h = r2(rt.h * fm.s[1]);
      const d = r2(rt.d * fm.s[2]);
      const mat: ClayVariant = rt.key === 'ice_glacier' ? 'water' : 'rock';
      const parts: InventoryPart[] = [];

      if (rt.key === 'taihu') {
        // Perforated scholar stone with pedestal + torus hole + top overhang
        parts.push(
          cyl([0, 0.16, 0], w * 0.34, w * 0.38, 0.32, 'concrete'),
          torus([0, h * 0.45, 0], w * 0.24, w * 0.13, 10, 'rock'),
          dodec([-w * 0.16, h * 0.68, 0.05], w * 0.28, h * 0.28, d * 0.26, 'rock', [0.3, 0.4, -0.2]),
          dodec([w * 0.14, h * 0.82, -0.04], w * 0.26, h * 0.22, d * 0.24, 'rock', [-0.2, 0.5, 0.3]),
          dodec([w * 0.24, h * 0.28, 0.12], w * 0.2, h * 0.22, d * 0.2, 'rock')
        );
      } else if (rt.key === 'basalt_col') {
        // Cluster of 7 hexagonal basalt columns at stepped heights
        const cols = [
          [0, 0, 1.0], [-0.26, 0.18, 0.82], [0.26, 0.16, 0.74],
          [-0.22, -0.22, 0.65], [0.24, -0.2, 0.88], [0, 0.28, 0.56], [0, -0.28, 0.48]
        ];
        cols.forEach(([cx, cz, hf]) => {
          parts.push(cyl([r2(cx * w), r2(h * hf * 0.5), r2(cz * d)], w * 0.14, w * 0.15, h * hf, mat));
        });
      } else if (rt.key === 'desert_arch') {
        parts.push(
          dodec([-w * 0.32, h * 0.42, 0], w * 0.24, h * 0.44, d * 0.38, 'rock'),
          dodec([w * 0.32, h * 0.42, 0], w * 0.24, h * 0.44, d * 0.38, 'rock'),
          torus([0, h * 0.52, 0], w * 0.32, h * 0.16, 12, 'rock'),
          dodec([0, h * 0.86, 0], w * 0.42, h * 0.16, d * 0.36, 'rock')
        );
      } else if (rt.key === 'stele_stone') {
        // Bixi tortoise pedestal + tall carved stone tablet + dragon crown cap
        parts.push(
          box([0, 0.12, 0], [w * 0.88, 0.24, d * 0.92], 'concrete'),
          sph([0, 0.38, 0], w * 0.36, 0.24, d * 0.42, 'rock'),
          sph([0, 0.42, d * 0.48], 0.18, 0.16, 0.22, 'rock'),
          box([0, h * 0.56, 0], [w * 0.58, h * 0.68, d * 0.22], 'rock'),
          cyl([0, h * 0.92, 0], d * 0.16, d * 0.16, w * 0.64, 'accent', [0, 0, Math.PI / 2])
        );
      } else {
        // Rich 7-boulder natural rock formation with ledges & moss cushions
        parts.push(
          dodec([0, h * 0.44, 0], w * 0.36, h * 0.44, d * 0.36, mat, [0.15 * (idx % 3), 0.4 * idx, 0.1]),
          dodec([-w * 0.28, h * 0.32, 0.16], w * 0.26, h * 0.32, d * 0.26, mat, [0.3, 0.2, -0.2]),
          dodec([w * 0.28, h * 0.36, -0.14], w * 0.25, h * 0.36, d * 0.25, mat, [-0.2, 0.6, 0.15]),
          dodec([0.08, h * 0.76, -0.06], w * 0.24, h * 0.26, d * 0.22, mat, [0.25, -0.3, 0.2]),
          dodec([-w * 0.16, h * 0.18, -d * 0.24], w * 0.22, h * 0.18, d * 0.22, mat),
          dodec([w * 0.18, h * 0.2, d * 0.24], w * 0.2, h * 0.2, d * 0.2, mat)
        );
        if (fm.moss) {
          parts.push(
            sph([-w * 0.14, h * 0.62, 0.12], w * 0.18, 0.12, d * 0.18, 'foliage'),
            sph([w * 0.22, h * 0.28, 0.18], w * 0.16, 0.1, d * 0.16, 'foliage')
          );
        }
      }

      out.push({
        id: `m_rock_${rt.key}_${fm.suf}`,
        label: `${rt.name} · ${fm.tag}`,
        heightM: h,
        widthM: w,
        depthM: d,
        parts,
      });
    });
  });

  return out;
}

// ============================================================================
// 7. FURNITURE (精细化太师椅、罗汉床、博古架、双层床、沙发与百子柜 · 180 款)
// ============================================================================
function buildMegaFurnitureVariants(): AssetVariantSpec[] {
  const out: AssetVariantSpec[] = [];

  const items = [
    { key: 'sofa_mod', name: '现代模块靠垫组合沙发', w: 2.2, h: 0.88, d: 0.95, kind: 'sofa' },
    { key: 'taishi_chair', name: '明清雕花圈背太师椅', w: 0.78, h: 1.05, d: 0.68, kind: 'taishi' },
    { key: 'luohan_bed', name: '中式三屏风炕几罗汉床', w: 2.1, h: 0.95, d: 1.15, kind: 'luohan' },
    { key: 'cinema_row', name: '剧院翻折扶手连排座椅', w: 2.6, h: 0.95, d: 0.82, kind: 'cinema' },
    { key: 'park_bench', name: '公园欧式铸铁曲木长椅', w: 1.8, h: 0.85, d: 0.68, kind: 'sofa' },
    { key: 'king_bed', name: '主卧软包床头双人床带床头柜', w: 2.2, h: 1.18, d: 2.15, kind: 'bed' },
    { key: 'bunk_bed', name: '宿舍带爬梯护栏双层铁床', w: 1.15, h: 1.88, d: 2.08, kind: 'bunk' },
    { key: 'icu_bed', name: '医院护栏输液架电动病床', w: 1.1, h: 1.55, d: 2.15, kind: 'bed' },
    { key: 'bookshelf', name: '满载藏书五层实木大书柜', w: 1.5, h: 2.2, d: 0.45, kind: 'shelf' },
    { key: 'bogujia', name: '中式错层瓷瓶多宝博古架', w: 1.65, h: 2.08, d: 0.42, kind: 'bogujia' },
    { key: 'wardrobe', name: '顶柜双开门铜把手大衣柜', w: 1.55, h: 2.18, d: 0.62, kind: 'cabinet' },
    { key: 'apothecary', name: '中药铺铜拉环百子柜药橱', w: 1.85, h: 2.12, d: 0.55, kind: 'cabinet' },
  ];

  const specs = [
    { suf: 'f1', tag: '紧凑窄款', wMul: 0.82, hMul: 0.96, dMul: 0.95 },
    { suf: 'f2', tag: '标准常规款', wMul: 1.0, hMul: 1.0, dMul: 1.0 },
    { suf: 'f3', tag: '加宽大号款', wMul: 1.25, hMul: 1.02, dMul: 1.05 },
    { suf: 'f4', tag: '豪华特大款', wMul: 1.46, hMul: 1.05, dMul: 1.1 },
    { suf: 'f5', tag: '高背尊享款', wMul: 1.05, hMul: 1.16, dMul: 1.02 },
    { suf: 'f6', tag: '极简低矮款', wMul: 1.08, hMul: 0.88, dMul: 1.06 },
    { suf: 'f7', tag: '带边几/脚踏组', wMul: 1.2, hMul: 1.0, dMul: 1.22, extra: true },
    { suf: 'f8', tag: 'L型转角贵妃组', wMul: 1.32, hMul: 1.0, dMul: 1.36, extra: true },
    { suf: 'f9', tag: '带顶冠雕花款', wMul: 1.06, hMul: 1.22, dMul: 1.04 },
    { suf: 'f10', tag: '原木温润款', wMul: 1.0, hMul: 1.02, dMul: 1.0, wood: true },
    { suf: 'f11', tag: '深胡桃木商务款', wMul: 1.04, hMul: 1.0, dMul: 1.02, dark: true },
    { suf: 'f12', tag: '对称双联组合款', wMul: 1.38, hMul: 1.0, dMul: 1.3, extra: true },
    { suf: 'f13', tag: '带抽屉储物座款', wMul: 1.05, hMul: 1.06, dMul: 1.05 },
    { suf: 'f14', tag: '剧组陈设加强款', wMul: 1.12, hMul: 1.04, dMul: 1.08 },
    { suf: 'f15', tag: '片场主景精装款', wMul: 1.18, hMul: 1.08, dMul: 1.12, extra: true },
  ];

  items.forEach((it) => {
    specs.forEach((sp) => {
      const w = r2(it.w * sp.wMul);
      const h = r2(it.h * sp.hMul);
      const d = r2(it.d * sp.dMul);
      const mat: ClayVariant = sp.wood ? 'wood' : sp.dark ? 'dark' : 'default';
      const parts: InventoryPart[] = [];

      if (it.kind === 'taishi' || it.kind === 'luohan') {
        // 4 turned legs + footrest stretcher + seat board + cushion + S-splat back + top rail + arms + central kang table
        const legH = h * 0.42;
        parts.push(
          cyl([-w * 0.44, legH * 0.5, -d * 0.42], 0.04, 0.04, legH, 'trunk'),
          cyl([w * 0.44, legH * 0.5, -d * 0.42], 0.04, 0.04, legH, 'trunk'),
          cyl([-w * 0.44, legH * 0.5, d * 0.42], 0.04, 0.04, legH, 'trunk'),
          cyl([w * 0.44, legH * 0.5, d * 0.42], 0.04, 0.04, legH, 'trunk'),
          box([0, 0.12, d * 0.42], [w * 0.88, 0.05, 0.08], 'wood'),
          box([0, legH, 0], [w, 0.08, d], 'trunk'),
          box([0, legH + 0.06, 0.02], [w * 0.92, 0.08, d * 0.88], 'accent'),
          // Backrest posts, central carved splat, winged top rail & armrests
          cyl([-w * 0.44, h * 0.7, -d * 0.42], 0.04, 0.04, h * 0.56, 'trunk'),
          cyl([w * 0.44, h * 0.7, -d * 0.42], 0.04, 0.04, h * 0.56, 'trunk'),
          box([0, h * 0.72, -d * 0.42], [w * 0.36, h * 0.48, 0.05], 'wood'),
          box([0, h * 0.96, -d * 0.42], [w * 1.08, 0.07, 0.09], 'trunk'),
          box([-w * 0.44, h * 0.64, 0], [0.08, 0.06, d * 0.88], 'trunk'),
          box([w * 0.44, h * 0.64, 0], [0.08, 0.06, d * 0.88], 'trunk')
        );
        if (it.kind === 'luohan') {
          // Small central tea kang table (炕几) on the Luohan bed
          parts.push(box([0, legH + 0.22, 0], [w * 0.28, 0.24, d * 0.48], 'wood'));
        }
      } else if (it.kind === 'sofa' || it.kind === 'cinema') {
        // 4 legs + base frame + 3 individual seat cushions + 3 tilted backrest cushions + armrests + throw pillows
        parts.push(
          cyl([-w * 0.44, 0.08, -d * 0.38], 0.04, 0.03, 0.16, 'dark'),
          cyl([w * 0.44, 0.08, -d * 0.38], 0.04, 0.03, 0.16, 'dark'),
          cyl([-w * 0.44, 0.08, d * 0.38], 0.04, 0.03, 0.16, 'dark'),
          cyl([w * 0.44, 0.08, d * 0.38], 0.04, 0.03, 0.16, 'dark'),
          box([0, 0.22, 0], [w, 0.16, d * 0.92], 'wood'),
          // 3 distinct seat cushions & 3 angled back cushions
          box([-w * 0.28, 0.36, 0.06], [w * 0.27, 0.16, d * 0.74], mat),
          box([0, 0.36, 0.06], [w * 0.27, 0.16, d * 0.74], mat),
          box([w * 0.28, 0.36, 0.06], [w * 0.27, 0.16, d * 0.74], mat),
          box([-w * 0.28, h * 0.68, -d * 0.32], [w * 0.27, h * 0.52, 0.2], 'accent', [-0.18, 0, 0]),
          box([0, h * 0.68, -d * 0.32], [w * 0.27, h * 0.52, 0.2], 'accent', [-0.18, 0, 0]),
          box([w * 0.28, h * 0.68, -d * 0.32], [w * 0.27, h * 0.52, 0.2], 'accent', [-0.18, 0, 0]),
          // Rolled armrests + throw pillows
          box([-w * 0.44, h * 0.46, 0], [w * 0.11, h * 0.44, d * 0.9], 'accent'),
          box([w * 0.44, h * 0.46, 0], [w * 0.11, h * 0.44, d * 0.9], 'accent'),
          box([-w * 0.32, 0.52, 0.04], [0.28, 0.26, 0.12], 'default', [0.2, 0.3, 0.25]),
          box([w * 0.32, 0.52, 0.04], [0.28, 0.26, 0.12], 'default', [0.2, -0.3, -0.25])
        );
      } else if (it.kind === 'bed' || it.kind === 'bunk') {
        // 4 corner posts + bed frame + mattress + folded blanket + 2 pillows + headboard + side nightstand lamp
        parts.push(
          cyl([-w * 0.46, h * 0.48, -d * 0.46], 0.05, 0.05, h * 0.96, 'trunk'),
          cyl([w * 0.46, h * 0.48, -d * 0.46], 0.05, 0.05, h * 0.96, 'trunk'),
          cyl([-w * 0.46, h * 0.32, d * 0.46], 0.05, 0.05, h * 0.64, 'trunk'),
          cyl([w * 0.46, h * 0.32, d * 0.46], 0.05, 0.05, h * 0.64, 'trunk'),
          box([0, 0.26, 0], [w * 0.94, 0.2, d * 0.94], 'wood'),
          box([0, 0.42, 0.02], [w * 0.88, 0.18, d * 0.88], 'default'),
          box([0, 0.46, d * 0.16], [w * 0.9, 0.16, d * 0.56], 'accent'),
          // 2 plump pillows + tufted headboard
          sph([-w * 0.22, 0.56, -d * 0.3], w * 0.18, 0.09, 0.18, 'default'),
          sph([w * 0.22, 0.56, -d * 0.3], w * 0.18, 0.09, 0.18, 'default'),
          box([0, h * 0.62, -d * 0.44], [w * 0.92, h * 0.58, 0.12], 'wood')
        );
        if (it.kind === 'bunk') {
          // Upper bunk mattress + pillows + safety rail + 4-rung climbing ladder
          parts.push(
            box([0, h * 0.74, 0], [w * 0.92, 0.16, d * 0.92], 'default'),
            sph([0, h * 0.86, -d * 0.3], w * 0.24, 0.08, 0.18, 'accent'),
            box([-w * 0.46, h * 0.88, 0], [0.05, 0.22, d * 0.86], 'dark'),
            box([w * 0.48, h * 0.48, d * 0.25], [0.05, h * 0.88, 0.42], 'dark')
          );
        }
      } else {
        // Multi-tier bookshelf / bogujia / cabinet with shelves, dividers, books & porcelain vases
        parts.push(
          box([-w * 0.46, h * 0.5, 0], [0.08, h, d], 'trunk'),
          box([w * 0.46, h * 0.5, 0], [0.08, h, d], 'trunk'),
          box([0, h * 0.5, -d * 0.44], [w, h, 0.06], 'wood'),
          box([0, h - 0.05, 0], [w * 1.06, 0.1, d * 1.08], 'trunk')
        );
        for (let s = 0; s < 4; s++) {
          const sy = r2(0.12 + ((h - 0.24) * s) / 3.5);
          parts.push(box([0, sy, 0], [w * 0.92, 0.06, d * 0.94], 'wood'));
          if (it.kind === 'bogujia' || it.kind === 'shelf') {
            // Books & vases on shelves
            parts.push(
              box([r2(-w * 0.24 + (s % 2) * 0.12), r2(sy + 0.18), 0], [w * 0.22, 0.28, d * 0.68], 'accent'),
              cyl([r2(w * 0.22 - (s % 2) * 0.1), r2(sy + 0.18), 0], 0.08, 0.11, 0.28, 'default')
            );
          } else {
            // Cabinet doors / apothecary drawer grid with handles
            parts.push(
              box([-w * 0.22, r2(sy + 0.18), d * 0.46], [w * 0.42, 0.32, 0.06], mat),
              box([w * 0.22, r2(sy + 0.18), d * 0.46], [w * 0.42, 0.32, 0.06], mat)
            );
          }
        }
      }

      if (sp.extra) {
        parts.push(
          cyl([w * 0.38, 0.28, d * 0.58], 0.26, 0.22, 0.48, 'wood'),
          cone([w * 0.38, 0.68, d * 0.58], 0.18, 0.24, 8, 'emissiveLamp')
        );
      }

      out.push({
        id: `m_furn_${it.key}_${sp.suf}`,
        label: `${it.name} · ${sp.tag}`,
        heightM: h,
        widthM: w,
        depthM: d,
        parts,
      });
    });
  });

  return out;
}

// ============================================================================
// 8. TABLE (精细化八仙桌、转盘圆桌、实验台、茶台与带椅桌组 · 150 款)
// ============================================================================
function buildMegaTableVariants(): AssetVariantSpec[] {
  const out: AssetVariantSpec[] = [];

  const tables = [
    { key: 'baxian', name: '明清雕花束腰八仙桌', w: 1.15, h: 0.84, d: 1.15, round: false },
    { key: 'banquet_rd', name: '酒店大圆桌带玻璃转盘与餐具', w: 1.85, h: 0.82, d: 1.85, round: true },
    { key: 'conf_long', name: '集团长条会议桌带麦克风组', w: 3.2, h: 0.78, d: 1.35, round: false },
    { key: 'school_desk', name: '教室双人课桌椅带书包挂钩', w: 1.25, h: 0.78, d: 0.9, round: false },
    { key: 'office_cubicle', name: '办公L型屏风工位带双显示器', w: 1.65, h: 1.22, d: 1.4, round: false },
    { key: 'lab_bench', name: '科研实验室带水龙头试剂架实验台', w: 2.6, h: 1.45, d: 1.2, round: false },
    { key: 'bar_counter', name: '酒馆带酒架吊杯架吧台', w: 2.4, h: 1.12, d: 0.95, round: false },
    { key: 'reception', name: '企业大厅弧形发光迎宾前台', w: 2.6, h: 1.15, d: 0.98, round: false },
    { key: 'tea_table', name: '新中式整木功夫茶台带茶具', w: 1.85, h: 0.78, d: 0.92, round: false },
    { key: 'pool_table', name: '斯诺克六袋台球桌带球杆', w: 2.55, h: 0.85, d: 1.42, round: false },
  ];

  const mods = [
    { suf: 'tb1', tag: '紧凑型', wMul: 0.82, dMul: 0.85, chairs: 2 },
    { suf: 'tb2', tag: '标准单桌', wMul: 1.0, dMul: 1.0, chairs: 0 },
    { suf: 'tb3', tag: '加长型', wMul: 1.28, dMul: 1.05, chairs: 2 },
    { suf: 'tb4', tag: '特大型', wMul: 1.48, dMul: 1.15, chairs: 4 },
    { suf: 'tb5', tag: '带双椅对坐组', wMul: 1.0, dMul: 1.2, chairs: 2 },
    { suf: 'tb6', tag: '带四椅围合组', wMul: 1.12, dMul: 1.28, chairs: 4 },
    { suf: 'tb7', tag: '带六椅宴会组', wMul: 1.32, dMul: 1.32, chairs: 6 },
    { suf: 'tb8', tag: '厚板原木整桌款', wMul: 1.05, dMul: 1.05, chairs: 2 },
    { suf: 'tb9', tag: '带双侧抽屉柜款', wMul: 1.08, dMul: 1.02, chairs: 1, cabinet: true },
    { suf: 'tb10', tag: '带桌上多层书架款', wMul: 1.06, dMul: 1.04, chairs: 1, hutch: true },
    { suf: 'tb11', tag: '带台灯与双屏电脑款', wMul: 1.04, dMul: 1.04, chairs: 1, hutch: true },
    { suf: 'tb12', tag: '双联并排长桌组', wMul: 1.56, dMul: 1.1, chairs: 4 },
    { suf: 'tb13', tag: '高脚吧台高度款', wMul: 0.95, dMul: 0.95, chairs: 2 },
    { suf: 'tb14', tag: '低矮榻榻米茶席款', wMul: 0.92, dMul: 0.92, chairs: 2 },
    { suf: 'tb15', tag: '片场主景全套摆件桌', wMul: 1.2, dMul: 1.18, chairs: 4, hutch: true },
  ];

  tables.forEach((tb) => {
    mods.forEach((m) => {
      const w = r2(tb.w * m.wMul);
      const d = r2(tb.d * m.dMul);
      const h = r2(0.78 * (m.suf === 'tb13' ? 1.32 : m.suf === 'tb14' ? 0.62 : 1.0));
      const parts: InventoryPart[] = [];

      if (tb.round) {
        // Pedestal column + 4 splayed feet + main round tabletop + Lazy Susan glass turntable + centerpiece
        parts.push(
          cyl([0, 0.08, 0], w * 0.32, w * 0.36, 0.12, 'trunk'),
          cyl([0, h * 0.48, 0], w * 0.14, w * 0.18, h * 0.84, 'trunk'),
          cyl([0, h - 0.04, 0], w * 0.48, w * 0.48, 0.08, 'wood'),
          cyl([0, h + 0.03, 0], w * 0.28, w * 0.28, 0.04, 'water'),
          cyl([0, h + 0.14, 0], 0.08, 0.11, 0.2, 'accent')
        );
      } else {
        // 4 turned legs + perimeter apron frame (牙板/束腰) + stretcher bars + tabletop + tabletop props
        parts.push(
          box([0, h - 0.04, 0], [w, 0.08, d], tb.key === 'pool_table' ? 'foliage' : 'wood'),
          box([0, h - 0.12, 0], [w * 0.9, 0.12, d * 0.9], 'trunk'),
          cyl([-w * 0.44, h * 0.46, -d * 0.42], 0.05, 0.04, h * 0.92, 'trunk'),
          cyl([w * 0.44, h * 0.46, -d * 0.42], 0.05, 0.04, h * 0.92, 'trunk'),
          cyl([-w * 0.44, h * 0.46, d * 0.42], 0.05, 0.04, h * 0.92, 'trunk'),
          cyl([w * 0.44, h * 0.46, d * 0.42], 0.05, 0.04, h * 0.92, 'trunk'),
          box([0, 0.18, 0], [w * 0.86, 0.05, 0.06], 'wood'),
          // Tabletop props (teapot / monitor / lamp / books)
          cyl([-w * 0.2, h + 0.08, 0], 0.08, 0.1, 0.16, 'accent'),
          box([w * 0.18, h + 0.05, -0.05], [0.28, 0.08, 0.22], 'default')
        );
      }

      if (m.cabinet) {
        parts.push(box([w * 0.28, h * 0.46, 0], [w * 0.32, h * 0.8, d * 0.82], 'default'));
      }
      if (m.hutch || tb.key === 'office_cubicle' || tb.key === 'lab_bench') {
        parts.push(
          box([0, h + 0.26, -d * 0.3], [w * 0.68, 0.44, 0.14], 'dark'),
          cyl([w * 0.28, h + 0.24, -d * 0.18], 0.12, 0.08, 0.32, 'emissiveLamp')
        );
      }
      if (m.chairs >= 2) {
        // Detailed matching chairs with seat + backrest + legs
        parts.push(
          box([0, h * 0.56, d * 0.56], [0.44, 0.06, 0.42], 'wood'),
          box([0, h * 0.84, d * 0.74], [0.44, 0.46, 0.06], 'accent'),
          box([0, h * 0.56, -d * 0.56], [0.44, 0.06, 0.42], 'wood'),
          box([0, h * 0.84, -d * 0.74], [0.44, 0.46, 0.06], 'accent')
        );
      }

      out.push({
        id: `m_tbl_${tb.key}_${m.suf}`,
        label: `${tb.name} · ${m.tag}`,
        heightM: r2(h + (m.hutch ? 0.48 : 0.2)),
        widthM: w,
        depthM: d,
        parts,
      });
    });
  });

  return out;
}

// ============================================================================
// 9. CRATE (精细化瓦楞集装箱、加强筋木箱、圆油桶、酒桶、电缆线盘与宝箱 · 150 款)
// ============================================================================
function buildMegaCrateVariants(): AssetVariantSpec[] {
  const out: AssetVariantSpec[] = [];

  const bases = [
    { key: 'iso_20ft', name: '标准瓦楞海运集装箱带锁杆', w: 2.44, h: 2.59, d: 6.0, kind: 'container' },
    { key: 'wood_case', name: '斜撑木条加固军工木箱', w: 1.25, h: 1.15, d: 1.25, kind: 'wood_crate' },
    { key: 'flight_case', name: '铝合金包角万向轮航空箱', w: 1.15, h: 0.98, d: 0.78, kind: 'flight' },
    { key: 'pallet_stack', name: '叉车木托盘多层货垛', w: 1.25, h: 1.45, d: 1.25, kind: 'pallet' },
    { key: 'oil_drum_set', name: '工业滚箍铁皮圆油桶组', w: 1.35, h: 1.05, d: 1.35, kind: 'drums' },
    { key: 'wine_cask', name: '酒庄铁箍卧式橡木酒桶架', w: 1.55, h: 1.28, d: 1.15, kind: 'casks' },
    { key: 'grain_sacks', name: '粮仓饱满麻袋错落堆垛', w: 1.85, h: 1.25, d: 1.45, kind: 'sacks' },
    { key: 'pipe_bundle', name: '工地枕木圆形钢管型材堆', w: 1.65, h: 1.05, d: 3.6, kind: 'pipes' },
    { key: 'cable_reel', name: '大型双法兰盘高压电缆木线盘', w: 1.65, h: 1.65, d: 1.25, kind: 'reel' },
    { key: 'ancient_chest', name: '古装拱盖包铜锁扣大宝箱', w: 1.15, h: 0.85, d: 0.76, kind: 'chest' },
  ];

  const layouts = [
    { suf: 'c1', tag: '单件小型', s: 0.78, stack: 1 },
    { suf: 'c2', tag: '单件标准', s: 1.0, stack: 1 },
    { suf: 'c3', tag: '单件大型', s: 1.24, stack: 1 },
    { suf: 'c4', tag: '双件并排组', s: 1.0, stack: 1, side: 2 },
    { suf: 'c5', tag: '三件并排组', s: 0.95, stack: 1, side: 3 },
    { suf: 'c6', tag: '上下双层叠放组', s: 1.0, stack: 2 },
    { suf: 'c7', tag: '2×2四件货垛', s: 0.95, stack: 2, side: 2 },
    { suf: 'c8', tag: '阶梯错落货堆', s: 1.02, stack: 2 },
    { suf: 'c9', tag: '带防雨篷布绑带款', s: 1.08, stack: 1, tarp: true },
    { suf: 'c10', tag: '带木托盘底座款', s: 1.05, stack: 1, pallet: true },
    { suf: 'c11', tag: '散乱片场掩体组', s: 1.12, stack: 2 },
    { suf: 'c12', tag: '加长码头仓储排', s: 1.0, stack: 1, side: 2, pallet: true },
    { suf: 'c13', tag: '高垛多层堆', s: 0.92, stack: 2, pallet: true },
    { suf: 'c14', tag: '重型钢带加固款', s: 1.15, stack: 1, pallet: true },
    { suf: 'c15', tag: '片场主景物资堆', s: 1.18, stack: 2, pallet: true, tarp: true },
  ];

  bases.forEach((b) => {
    layouts.forEach((ly) => {
      const w = r2(b.w * ly.s * (ly.side ?? 1));
      const h = r2(b.h * ly.s * ly.stack + (ly.pallet ? 0.16 : 0));
      const d = r2(b.d * ly.s);
      const y0 = ly.pallet ? 0.16 : 0;
      const parts: InventoryPart[] = [];

      if (ly.pallet || b.kind === 'pallet') {
        parts.push(
          box([0, 0.06, -d * 0.36], [w * 0.98, 0.12, 0.16], 'wood'),
          box([0, 0.06, 0], [w * 0.98, 0.12, 0.16], 'wood'),
          box([0, 0.06, d * 0.36], [w * 0.98, 0.12, 0.16], 'wood'),
          box([0, 0.14, 0], [w, 0.05, d], 'wood')
        );
      }

      if (b.kind === 'drums') {
        // 4 cylindrical oil drums with rolling hoops & bungs
        const positions = [[-0.26, -0.26], [0.26, -0.26], [-0.26, 0.26], [0.26, 0.26]];
        positions.forEach(([px, pz]) => {
          parts.push(
            cyl([r2(px * w), r2(y0 + (h - y0) * 0.48), r2(pz * d)], w * 0.2, w * 0.2, (h - y0) * 0.92, 'car'),
            torus([r2(px * w), r2(y0 + (h - y0) * 0.32), r2(pz * d)], w * 0.205, 0.025, 12, 'dark', [Math.PI / 2, 0, 0]),
            torus([r2(px * w), r2(y0 + (h - y0) * 0.66), r2(pz * d)], w * 0.205, 0.025, 12, 'dark', [Math.PI / 2, 0, 0])
          );
        });
      } else if (b.kind === 'casks') {
        // Cradle frame + horizontal wooden wine barrels with iron hoops
        parts.push(
          box([0, y0 + 0.16, -d * 0.3], [w * 0.9, 0.28, 0.16], 'trunk'),
          box([0, y0 + 0.16, d * 0.3], [w * 0.9, 0.28, 0.16], 'trunk'),
          cyl([-w * 0.24, y0 + (h - y0) * 0.56, 0], (h - y0) * 0.34, (h - y0) * 0.34, d * 0.86, 'wood', [Math.PI / 2, 0, 0]),
          cyl([w * 0.24, y0 + (h - y0) * 0.56, 0], (h - y0) * 0.34, (h - y0) * 0.34, d * 0.86, 'wood', [Math.PI / 2, 0, 0])
        );
      } else if (b.kind === 'pipes') {
        // Pyramid stack of 6 long cylindrical steel pipes on wooden chocks
        parts.push(
          box([0, y0 + 0.08, -d * 0.34], [w * 0.96, 0.16, 0.2], 'wood'),
          box([0, y0 + 0.08, d * 0.34], [w * 0.96, 0.16, 0.2], 'wood')
        );
        const rPipe = w * 0.14;
        [-w * 0.28, 0, w * 0.28].forEach((px) => {
          parts.push(cyl([r2(px), r2(y0 + 0.16 + rPipe), 0], rPipe, rPipe, d * 0.96, 'dark', [Math.PI / 2, 0, 0]));
        });
        [-w * 0.14, w * 0.14].forEach((px) => {
          parts.push(cyl([r2(px), r2(y0 + 0.16 + rPipe * 2.7), 0], rPipe, rPipe, d * 0.96, 'car', [Math.PI / 2, 0, 0]));
        });
        parts.push(cyl([0, r2(y0 + 0.16 + rPipe * 4.4), 0], rPipe, rPipe, d * 0.96, 'dark', [Math.PI / 2, 0, 0]));
      } else if (b.kind === 'reel') {
        // Left & right large wooden circular flanges + central wound cable drum + axle
        const rad = (h - y0) * 0.48;
        parts.push(
          cyl([0, y0 + rad, -d * 0.4], rad, rad, 0.1, 'wood', [Math.PI / 2, 0, 0]),
          cyl([0, y0 + rad, d * 0.4], rad, rad, 0.1, 'wood', [Math.PI / 2, 0, 0]),
          cyl([0, y0 + rad, 0], rad * 0.68, rad * 0.68, d * 0.72, 'dark', [Math.PI / 2, 0, 0]),
          cyl([0, y0 + rad, 0], 0.1, 0.1, d * 0.96, 'accent', [Math.PI / 2, 0, 0])
        );
      } else if (b.kind === 'sacks') {
        // 6 organic plump grain sacks stacked in layers
        for (let i = 0; i < 6; i++) {
          const sx = ((i % 3) - 1) * w * 0.26;
          const sy = y0 + 0.22 + Math.floor(i / 3) * 0.34;
          parts.push(sph([r2(sx), r2(sy), (i % 2) * 0.12 - 0.06], w * 0.22, 0.2, d * 0.36, 'wood'));
        }
      } else if (b.kind === 'chest') {
        // Arched-lid treasure chest with brass bands & front lock plate
        parts.push(
          box([0, y0 + (h - y0) * 0.34, 0], [w * 0.92, (h - y0) * 0.62, d * 0.88], 'trunk'),
          cyl([0, y0 + (h - y0) * 0.66, 0], d * 0.44, d * 0.44, w * 0.94, 'wood', [0, 0, Math.PI / 2]),
          box([-w * 0.34, y0 + (h - y0) * 0.46, 0], [0.08, (h - y0) * 0.84, d * 0.92], 'accent'),
          box([w * 0.34, y0 + (h - y0) * 0.46, 0], [0.08, (h - y0) * 0.84, d * 0.92], 'accent'),
          box([0, y0 + (h - y0) * 0.56, d * 0.46], [0.18, 0.24, 0.06], 'emissiveLamp')
        );
      } else {
        // Framed wooden crate / shipping container with corner posts, diagonal braces & lock bars
        parts.push(
          box([0, y0 + (h - y0) * 0.5, 0], [w * 0.92, (h - y0) * 0.94, d * 0.92], b.kind === 'container' ? 'car' : 'wood'),
          // Perimeter framing ribs & diagonal battens
          box([-w * 0.46, y0 + (h - y0) * 0.5, d * 0.46], [0.1, h - y0, 0.1], 'trunk'),
          box([w * 0.46, y0 + (h - y0) * 0.5, d * 0.46], [0.1, h - y0, 0.1], 'trunk'),
          box([-w * 0.46, y0 + (h - y0) * 0.5, -d * 0.46], [0.1, h - y0, 0.1], 'trunk'),
          box([w * 0.46, y0 + (h - y0) * 0.5, -d * 0.46], [0.1, h - y0, 0.1], 'trunk'),
          box([0, y0 + (h - y0) * 0.5, d * 0.47], [w * 0.88, 0.08, 0.06], 'dark', [0, 0, 0.58]),
          box([0, y0 + (h - y0) * 0.5, -d * 0.47], [w * 0.88, 0.08, 0.06], 'dark', [0, 0, -0.58])
        );
      }

      if (ly.tarp) {
        parts.push(box([0, h - 0.04, 0], [w * 1.04, 0.12, d * 1.04], 'accent'));
      }

      out.push({
        id: `m_crt_${b.key}_${ly.suf}`,
        label: `${b.name} · ${ly.tag}`,
        heightM: h,
        widthM: w,
        depthM: d,
        parts,
      });
    });
  });

  return out;
}

// ============================================================================
// 10. SCENE_PROP (精细化摄影机、摇臂车、青铜鼎、石狮、兵器架、三角钢琴、篮球架等 · 210 款)
// ============================================================================
function buildMegaScenePropVariants(): AssetVariantSpec[] {
  const out: AssetVariantSpec[] = [];

  const props = [
    { key: 'cine_cam', name: '电影摄影机三脚架与遮光斗', w: 0.95, h: 1.68, d: 0.98 },
    { key: 'jib_crane', name: '影视8米重型摇臂摄影车', w: 1.5, h: 2.8, d: 4.2 },
    { key: 'dir_monitor', name: '导演双联监看推车与图传天线', w: 1.15, h: 1.65, d: 0.88 },
    { key: 'green_screen', name: '片场移动桁架绿幕背景框', w: 3.6, h: 2.8, d: 0.9 },
    { key: 'market_stall', name: '古镇市集木轮遮阳篷摊位车', w: 2.4, h: 2.35, d: 1.65 },
    { key: 'vending_mac', name: '街头橱窗发光自动售货机', w: 1.15, h: 1.98, d: 0.88 },
    { key: 'phone_booth', name: '英伦复古圆顶玻璃电话亭', w: 1.08, h: 2.38, d: 1.08 },
    { key: 'ev_charger', name: '超充站双枪直流充电桩', w: 0.78, h: 1.82, d: 0.52 },
    { key: 'bronze_ding', name: '古建广场四足双耳青铜方鼎', w: 1.65, h: 2.15, d: 1.35 },
    { key: 'stone_lion', name: '古建须弥座戏球守门石狮', w: 1.15, h: 1.92, d: 1.42 },
    { key: 'weapon_rack', name: '武侠校场刀枪剑戟兵器架', w: 1.95, h: 1.85, d: 0.68 },
    { key: 'war_drum', name: '城楼雕龙立架牛皮大战鼓', w: 1.55, h: 1.95, d: 1.15 },
    { key: 'grand_piano', name: '音乐厅掀盖三角钢琴带琴凳', w: 1.6, h: 1.55, d: 2.15 },
    { key: 'bball_hoop', name: '标准伸臂篮球架带透明篮板篮筐', w: 1.85, h: 3.65, d: 2.45 },
  ];

  const editions = [
    { suf: 'sp1', tag: '紧凑款', s: 0.82 },
    { suf: 'sp2', tag: '标准款', s: 1.0 },
    { suf: 'sp3', tag: '大型款', s: 1.2 },
    { suf: 'sp4', tag: '特大主景款', s: 1.36 },
    { suf: 'sp5', tag: '带石砌台座款', s: 1.05, base: true },
    { suf: 'sp6', tag: '双联组合款', s: 1.05, base: true },
    { suf: 'sp7', tag: '带遮阳顶篷款', s: 1.08, canopy: true },
    { suf: 'sp8', tag: '带夜间发光款', s: 1.04, glow: true },
    { suf: 'sp9', tag: '带礼仪护栏款', s: 1.1, base: true },
    { suf: 'sp10', tag: '复古经典款', s: 0.96 },
    { suf: 'sp11', tag: '现代旗舰款', s: 1.02 },
    { suf: 'sp12', tag: '重型加强款', s: 1.15, base: true },
    { suf: 'sp13', tag: '室内精细特写款', s: 0.9 },
    { suf: 'sp14', tag: '户外防雨全套款', s: 1.12, canopy: true },
    { suf: 'sp15', tag: '片场主景精模款', s: 1.08, base: true, glow: true },
  ];

  props.forEach((p) => {
    editions.forEach((ed) => {
      const w = r2(p.w * ed.s);
      const h = r2(p.h * ed.s + (ed.base ? 0.22 : 0));
      const d = r2(p.d * ed.s);
      const y0 = ed.base ? 0.22 : 0;
      const parts: InventoryPart[] = [];

      if (ed.base) {
        parts.push(box([0, 0.11, 0], [w * 1.12, 0.22, d * 1.12], 'rock'));
      }

      if (p.key === 'cine_cam') {
        // 3 splayed tripod legs + fluid head + cinema camera body + dual top film magazines + lens barrel + matte box
        parts.push(
          cyl([-0.32, y0 + 0.56, 0.28], 0.025, 0.02, 1.2, 'dark', [0.32, 0, -0.35]),
          cyl([0.32, y0 + 0.56, 0.28], 0.025, 0.02, 1.2, 'dark', [0.32, 0, 0.35]),
          cyl([0, y0 + 0.56, -0.36], 0.025, 0.02, 1.2, 'dark', [-0.38, 0, 0]),
          box([0, y0 + 1.24, 0], [0.24, 0.26, 0.38], 'dark'),
          cyl([0, y0 + 1.46, -0.08], 0.14, 0.14, 0.08, 'accent', [0, 0, Math.PI / 2]),
          cyl([0, y0 + 1.46, 0.12], 0.14, 0.14, 0.08, 'accent', [0, 0, Math.PI / 2]),
          cyl([0, y0 + 1.24, -0.28], 0.08, 0.08, 0.22, 'car', [Math.PI / 2, 0, 0]),
          box([0, y0 + 1.24, -0.42], [0.28, 0.22, 0.1], 'dark')
        );
      } else if (p.key === 'jib_crane') {
        // 4-wheeled dolly base + central column + tilted 4m boom arm + rear counterweights + front hanging camera head
        addWheelX(parts, -w * 0.38, y0 + 0.18, -0.5, 0.18, 0.1);
        addWheelX(parts, w * 0.38, y0 + 0.18, -0.5, 0.18, 0.1);
        addWheelX(parts, -w * 0.38, y0 + 0.18, 0.5, 0.18, 0.1);
        addWheelX(parts, w * 0.38, y0 + 0.18, 0.5, 0.18, 0.1);
        parts.push(
          box([0, y0 + 0.24, 0], [w * 0.78, 0.14, 1.25], 'dark'),
          cyl([0, y0 + 0.92, 0], 0.12, 0.16, 1.35, 'dark'),
          box([0, y0 + 1.85, -0.35], [0.16, 0.18, d * 0.92], 'dark', [0.34, 0, 0]),
          box([0, y0 + 1.28, d * 0.36], [0.44, 0.38, 0.32], 'accent'),
          cyl([0, y0 + 2.25, -d * 0.42], 0.05, 0.05, 0.42, 'dark'),
          box([0, y0 + 2.0, -d * 0.42], [0.26, 0.24, 0.32], 'car')
        );
      } else if (p.key === 'bronze_ding') {
        // 4 bronze pillar legs + cauldron body with flange ribs + 2 upright loop handles + rising censer lid
        parts.push(
          cyl([-w * 0.34, y0 + h * 0.24, -d * 0.3], 0.11, 0.09, h * 0.48, 'dark'),
          cyl([w * 0.34, y0 + h * 0.24, -d * 0.3], 0.11, 0.09, h * 0.48, 'dark'),
          cyl([-w * 0.34, y0 + h * 0.24, d * 0.3], 0.11, 0.09, h * 0.48, 'dark'),
          cyl([w * 0.34, y0 + h * 0.24, d * 0.3], 0.11, 0.09, h * 0.48, 'dark'),
          box([0, y0 + h * 0.58, 0], [w * 0.86, h * 0.42, d * 0.82], 'dark'),
          box([0, y0 + h * 0.78, 0], [w * 0.94, 0.12, d * 0.9], 'accent'),
          torus([-w * 0.38, y0 + h * 0.88, 0], 0.18, 0.04, 12, 'accent', [0, Math.PI / 2, 0]),
          torus([w * 0.38, y0 + h * 0.88, 0], 0.18, 0.04, 12, 'accent', [0, Math.PI / 2, 0])
        );
      } else if (p.key === 'stone_lion') {
        // Carved须弥座 pedestal + seated lion torso + curly mane + head + front legs + embroidered ball
        parts.push(
          box([0, y0 + 0.26, 0], [w * 0.88, 0.52, d * 0.88], 'concrete'),
          box([0, y0 + 0.54, 0], [w * 0.94, 0.1, d * 0.94], 'accent'),
          cyl([0, y0 + 1.02, -0.06], w * 0.3, w * 0.36, 0.85, 'rock', [0.22, 0, 0]),
          sph([0, y0 + 1.48, 0.08], w * 0.34, 0.32, 0.34, 'rock'),
          sph([0, y0 + 1.52, 0.24], w * 0.24, 0.22, 0.22, 'rock'),
          cyl([-w * 0.2, y0 + 0.88, 0.26], 0.09, 0.08, 0.62, 'rock'),
          cyl([w * 0.2, y0 + 0.94, 0.26], 0.09, 0.08, 0.52, 'rock'),
          sph([w * 0.2, y0 + 0.68, 0.28], 0.14, 0.14, 0.14, 'accent')
        );
      } else if (p.key === 'weapon_rack') {
        // Wooden rack base & uprights + 5 vertical spears / halberds with metal blades
        parts.push(
          box([-w * 0.42, y0 + 0.1, 0], [0.16, 0.18, d * 0.88], 'trunk'),
          box([w * 0.42, y0 + 0.1, 0], [0.16, 0.18, d * 0.88], 'trunk'),
          box([-w * 0.42, y0 + h * 0.48, 0], [0.1, h * 0.86, 0.12], 'trunk'),
          box([w * 0.42, y0 + h * 0.48, 0], [0.1, h * 0.86, 0.12], 'trunk'),
          box([0, y0 + 0.32, 0], [w * 0.92, 0.08, 0.14], 'wood'),
          box([0, y0 + h * 0.68, 0], [w * 0.96, 0.1, 0.14], 'wood')
        );
        for (let i = -2; i <= 2; i++) {
          const sx = r2(i * w * 0.16);
          parts.push(
            cyl([sx, y0 + h * 0.48, 0], 0.025, 0.025, h * 0.88, 'wood'),
            cone([sx, y0 + h * 0.94, 0], 0.06, 0.22, 4, 'car')
          );
        }
      } else if (p.key === 'war_drum') {
        // Carved stand + horizontal barrel drum + brass rim hoops + top decorative canopy
        parts.push(
          box([-w * 0.36, y0 + h * 0.42, 0], [0.14, h * 0.84, d * 0.72], 'trunk'),
          box([w * 0.36, y0 + h * 0.42, 0], [0.14, h * 0.84, d * 0.72], 'trunk'),
          box([0, y0 + 0.2, 0], [w * 0.86, 0.12, d * 0.78], 'wood'),
          cyl([0, y0 + h * 0.56, 0], h * 0.28, h * 0.28, d * 0.76, 'accent', [Math.PI / 2, 0, 0]),
          torus([0, y0 + h * 0.56, d * 0.38], h * 0.28, 0.03, 16, 'default'),
          torus([0, y0 + h * 0.56, -d * 0.38], h * 0.28, 0.03, 16, 'default'),
          box([0, y0 + h * 0.92, 0], [w * 0.96, 0.14, d * 0.86], 'dark')
        );
      } else if (p.key === 'grand_piano') {
        // 3 piano legs + pedal lyre + curved soundboard body + keyboard + propped-open top lid + pianist bench
        parts.push(
          cyl([-w * 0.38, y0 + 0.36, d * 0.34], 0.05, 0.03, 0.68, 'dark'),
          cyl([w * 0.38, y0 + 0.36, d * 0.34], 0.05, 0.03, 0.68, 'dark'),
          cyl([0, y0 + 0.36, -d * 0.38], 0.05, 0.03, 0.68, 'dark'),
          box([0, y0 + 0.32, d * 0.28], [0.22, 0.56, 0.06], 'accent'),
          box([0, y0 + 0.76, 0.08], [w * 0.88, 0.26, d * 0.56], 'dark'),
          cyl([0, y0 + 0.76, -d * 0.18], w * 0.44, w * 0.44, 0.26, 'dark'),
          // White & black keys + open propped lid + bench
          box([0, y0 + 0.74, d * 0.38], [w * 0.82, 0.08, 0.22], 'default'),
          box([0, y0 + 1.18, -0.04], [w * 0.86, 0.05, d * 0.68], 'dark', [0, 0, 0.44]),
          cyl([w * 0.34, y0 + 1.02, 0.12], 0.015, 0.015, 0.52, 'accent', [0, 0, -0.22]),
          box([0, y0 + 0.46, d * 0.68], [0.72, 0.08, 0.34], 'wood')
        );
      } else if (p.key === 'bball_hoop') {
        // Counterweight base + angled upright pole + extension arm + glass backboard + orange rim torus
        parts.push(
          box([0, y0 + 0.24, -d * 0.26], [1.1, 0.46, 1.4], 'dark'),
          cyl([0, y0 + h * 0.48, -d * 0.08], 0.09, 0.11, h * 0.92, 'dark', [0.12, 0, 0]),
          box([0, y0 + h * 0.86, d * 0.18], [0.16, 0.16, d * 0.44], 'dark'),
          box([0, y0 + h * 0.88, d * 0.42], [1.8, 1.05, 0.06], 'water'),
          box([0, y0 + h * 0.84, d * 0.45], [0.58, 0.45, 0.02], 'accent'),
          torus([0, y0 + h * 0.76, d * 0.66], 0.24, 0.025, 16, 'emissiveLamp', [Math.PI / 2, 0, 0]),
          cyl([0, y0 + h * 0.66, d * 0.66], 0.23, 0.16, 0.36, 'default')
        );
      } else {
        // Detailed street kiosk / market cart / monitor cart / vending machine with frame, glass window, canopy & wheels
        addWheelX(parts, -w * 0.38, y0 + 0.16, 0, 0.16, 0.08);
        addWheelX(parts, w * 0.38, y0 + 0.16, 0, 0.16, 0.08);
        parts.push(
          box([0, y0 + (h - y0) * 0.36, 0], [w * 0.88, (h - y0) * 0.56, d * 0.84], 'wood'),
          box([0, y0 + (h - y0) * 0.72, -d * 0.04], [w * 0.82, (h - y0) * 0.36, d * 0.72], 'water'),
          cyl([-w * 0.42, y0 + (h - y0) * 0.52, d * 0.38], 0.04, 0.04, (h - y0) * 0.88, 'dark'),
          cyl([w * 0.42, y0 + (h - y0) * 0.52, d * 0.38], 0.04, 0.04, (h - y0) * 0.88, 'dark'),
          box([0, h - 0.08, 0], [w * 1.08, 0.16, d * 1.08], 'accent', [0.12, 0, 0])
        );
        if (ed.glow) {
          parts.push(box([0, y0 + (h - y0) * 0.72, d * 0.36], [w * 0.68, (h - y0) * 0.28, 0.05], 'emissiveLamp'));
        }
      }

      out.push({
        id: `m_sprop_${p.key}_${ed.suf}`,
        label: `${p.name} · ${ed.tag}`,
        heightM: h,
        widthM: w,
        depthM: d,
        parts,
      });
    });
  });

  return out;
}
// ============================================================================
// 11. BUILDING (精细化中西方建筑：立柱柱廊、多层窗格、阳台、飞檐斗拱、多级宝塔、马头墙、哥特玫瑰窗 · 180 款)
// ============================================================================
function buildMegaBuildingVariants(): AssetVariantSpec[] {
  const out: AssetVariantSpec[] = [];

  const archetypes = [
    { key: 'office_hq', name: '现代竖向遮阳百叶玻璃幕墙写字楼', w: 12, h: 18, d: 10, kind: 'modern_tower' },
    { key: 'resi_apt', name: '城市带外挑阳台花园住宅公寓楼', w: 14, h: 16, d: 9, kind: 'residential' },
    { key: 'shop_podium', name: '沿街柱廊拱券骑楼商业裙房', w: 14, h: 8.8, d: 9, kind: 'arcade_shop' },
    { key: 'school_wing', name: '校园带外廊楼梯间多层教学楼', w: 18, h: 12, d: 8.5, kind: 'school' },
    { key: 'hospital_blk', name: '综合医院带急救雨棚门诊住院楼', w: 16, h: 15, d: 11, kind: 'modern_tower' },
    { key: 'palace_hall', name: '明清重檐庑殿顶朱红廊柱大殿', w: 15, h: 11.5, d: 10, kind: 'chinese_hall' },
    { key: 'siheyuan', name: '老北京四合院带抄手游廊正房', w: 12, h: 6.2, d: 7.5, kind: 'chinese_hall' },
    { key: 'huizhou_hall', name: '徽派三叠马头墙白墙黛瓦大宅', w: 11, h: 7.6, d: 8.5, kind: 'huizhou' },
    { key: 'pagoda_tower', name: '古建五级八角飞檐塔刹宝塔', w: 7.5, h: 19.5, d: 7.5, kind: 'pagoda' },
    { key: 'city_gate', name: '古城墙城门洞带重檐箭楼', w: 16, h: 13.8, d: 10, kind: 'city_gate' },
    { key: 'gothic_church', name: '欧式哥特玫瑰花窗双尖塔大教堂', w: 12, h: 20, d: 16, kind: 'gothic' },
    { key: 'factory_hall', name: '重工业钢柱天窗带高烟囱厂房', w: 16, h: 9.8, d: 12, kind: 'factory' },
  ];

  const configs = [
    { suf: 'bd1', tag: '低层紧凑座', wMul: 0.82, hMul: 0.72, dMul: 0.85 },
    { suf: 'bd2', tag: '标准三层座', wMul: 0.92, hMul: 0.84, dMul: 0.92 },
    { suf: 'bd3', tag: '标准五层座', wMul: 1.0, hMul: 1.0, dMul: 1.0 },
    { suf: 'bd4', tag: '高层挺拔座', wMul: 0.95, hMul: 1.25, dMul: 0.95 },
    { suf: 'bd5', tag: '超高地标座', wMul: 1.05, hMul: 1.48, dMul: 1.05, setback: true },
    { suf: 'bd6', tag: '宽面阔展座', wMul: 1.3, hMul: 0.95, dMul: 1.0 },
    { suf: 'bd7', tag: '带侧翼副楼座', wMul: 1.24, hMul: 1.0, dMul: 1.1, wing: true },
    { suf: 'bd8', tag: 'L型转角街区座', wMul: 1.2, hMul: 1.05, dMul: 1.2, wing: true },
    { suf: 'bd9', tag: '带首层迎宾雨棚座', wMul: 1.05, hMul: 1.0, dMul: 1.12, porch: true },
    { suf: 'bd10', tag: '带高台须弥座台基', wMul: 1.1, hMul: 1.08, dMul: 1.1, podium: true },
    { suf: 'bd11', tag: '退台双层冠冕座', wMul: 1.08, hMul: 1.2, dMul: 1.08, setback: true },
    { suf: 'bd12', tag: '对称双翼综合体', wMul: 1.35, hMul: 1.18, dMul: 1.05, wing: true },
    { suf: 'bd13', tag: '带天台冷却塔机房座', wMul: 1.0, hMul: 1.12, dMul: 1.0, setback: true },
    { suf: 'bd14', tag: '围合内院式座', wMul: 1.28, hMul: 0.9, dMul: 1.22, wing: true },
    { suf: 'bd15', tag: '旗舰主景建筑座', wMul: 1.25, hMul: 1.16, dMul: 1.16, podium: true, porch: true },
  ];

  archetypes.forEach((ar) => {
    configs.forEach((cf) => {
      const w = r2(ar.w * cf.wMul);
      const h = r2(ar.h * cf.hMul);
      const d = r2(ar.d * cf.dMul);
      const parts: InventoryPart[] = [];

      if (ar.kind === 'pagoda') {
        // 5-tier octagonal/square pagoda with stone terrace, 5 diminishing stories, 5 projecting octagonal roof eaves & bronze spire
        parts.push(
          box([0, 0.45, 0], [w * 1.12, 0.9, d * 1.12], 'rock'),
          box([0, 0.35, d * 0.62], [w * 0.32, 0.7, 0.85], 'default')
        );
        const tiers = 5;
        const tierSpan = (h - 2.6) / tiers;
        for (let t = 0; t < tiers; t++) {
          const scale = 1 - t * 0.13;
          const tw = r2(w * 0.78 * scale);
          const ty = r2(0.9 + t * tierSpan);
          parts.push(
            cyl([0, r2(ty + tierSpan * 0.38), 0], tw * 0.46, tw * 0.48, tierSpan * 0.76, 'default'),
            box([0, r2(ty + tierSpan * 0.38), tw * 0.45], [tw * 0.24, tierSpan * 0.48, 0.08], 'trunk'),
            cone([0, r2(ty + tierSpan * 0.84), 0], tw * 0.72, tierSpan * 0.42, 8, 'dark')
          );
        }
        // Top bronze pagoda spire (塔刹)
        parts.push(
          cyl([0, h - 0.9, 0], 0.12, 0.28, 1.6, 'accent'),
          sph([0, h - 0.15, 0], 0.22, 0.26, 0.22, 'emissiveLamp')
        );
      } else if (ar.kind === 'chinese_hall' || ar.kind === 'city_gate') {
        // Stone须弥座 terrace + front御道 steps + perimeter vermilion columns + lattice doors + double-eave flying roof
        const baseH = ar.kind === 'city_gate' ? h * 0.48 : Math.max(1.1, h * 0.16);
        parts.push(
          box([0, baseH * 0.5, 0], [w * 1.06, baseH, d * 1.06], 'rock'),
          box([0, baseH + 0.08, 0], [w * 1.08, 0.16, d * 1.08], 'default'),
          // Front central steps
          box([0, baseH * 0.35, d * 0.6], [w * 0.28, baseH * 0.7, 1.2], 'default')
        );
        if (ar.kind === 'city_gate') {
          // Central arched city gate tunnel + battlements
          parts.push(
            box([0, baseH * 0.38, d * 0.54], [w * 0.22, baseH * 0.76, 0.12], 'dark'),
            torus([0, baseH * 0.72, d * 0.53], w * 0.11, 0.18, 12, 'default')
          );
        }
        const hallH = (h - baseH) * 0.56;
        const hallW = w * 0.86;
        const hallD = d * 0.82;
        parts.push(
          box([0, baseH + hallH * 0.5, 0], [hallW * 0.88, hallH, hallD * 0.86], 'default'),
          // Front carved red doors & lattice windows
          box([0, baseH + hallH * 0.45, hallD * 0.44], [hallW * 0.26, hallH * 0.82, 0.08], 'trunk'),
          box([-hallW * 0.28, baseH + hallH * 0.52, hallD * 0.44], [hallW * 0.18, hallH * 0.46, 0.08], 'wood'),
          box([hallW * 0.28, baseH + hallH * 0.52, hallD * 0.44], [hallW * 0.18, hallH * 0.46, 0.08], 'wood')
        );
        // 6 front & back vermilion cylindrical columns (廊柱)
        for (let c = -2; c <= 2; c++) {
          const cx = r2((c / 2) * hallW * 0.44);
          parts.push(
            cyl([cx, baseH + hallH * 0.5, hallD * 0.46], 0.18, 0.2, hallH, 'trunk'),
            cyl([cx, baseH + hallH * 0.5, -hallD * 0.46], 0.18, 0.2, hallH, 'trunk')
          );
        }
        addChineseRoof(parts, baseH + hallH, hallW, hallD, h - baseH - hallH, 'dark', 'accent');
      } else if (ar.kind === 'huizhou') {
        // White courtyard house + left & right 3-tier stepped horse-head walls (马头墙) + pitched dark tile roof + stone gate
        const bodyH = h * 0.74;
        parts.push(
          box([0, 0.2, 0], [w * 1.02, 0.4, d * 1.02], 'rock'),
          box([0, bodyH * 0.5, 0], [w * 0.94, bodyH, d * 0.88], 'default'),
          // Carved entrance门罩 & lattice windows
          box([0, 1.35, d * 0.45], [w * 0.22, 2.4, 0.22], 'rock'),
          box([0, 1.2, d * 0.47], [w * 0.15, 2.0, 0.08], 'trunk'),
          box([0, 2.65, d * 0.5], [w * 0.28, 0.24, 0.42], 'dark'),
          box([-w * 0.28, bodyH * 0.62, d * 0.45], [w * 0.16, 1.1, 0.08], 'dark'),
          box([w * 0.28, bodyH * 0.62, d * 0.45], [w * 0.16, 1.1, 0.08], 'dark'),
          // Pitched dark tile roof
          box([0, bodyH + 0.48, d * 0.2], [w * 0.94, 0.18, d * 0.52], 'dark', [0.42, 0, 0]),
          box([0, bodyH + 0.48, -d * 0.2], [w * 0.94, 0.18, d * 0.52], 'dark', [-0.42, 0, 0]),
          // Stepped 马头墙 gable end walls on left & right
          box([-w * 0.47, bodyH * 0.58, 0], [0.28, bodyH * 1.12, d * 0.92], 'default'),
          box([-w * 0.47, bodyH + 0.75, 0], [0.32, 0.7, d * 0.52], 'default'),
          box([-w * 0.47, bodyH + 1.15, 0], [0.36, 0.16, d * 0.56], 'dark'),
          box([w * 0.47, bodyH * 0.58, 0], [0.28, bodyH * 1.12, d * 0.92], 'default'),
          box([w * 0.47, bodyH + 0.75, 0], [0.32, 0.7, d * 0.52], 'default'),
          box([w * 0.47, bodyH + 1.15, 0], [0.36, 0.16, d * 0.56], 'dark')
        );
      } else if (ar.kind === 'gothic') {
        // Nave + side buttresses + central circular rose window + pointed portal + twin bell towers with tall octagonal spires
        const naveH = h * 0.56;
        parts.push(
          box([0, 0.25, 0], [w * 1.06, 0.5, d * 1.04], 'rock'),
          box([0, naveH * 0.5, 0], [w * 0.86, naveH, d * 0.92], 'default'),
          // Twin front bell towers + octagonal spires
          box([-w * 0.32, h * 0.36, d * 0.34], [w * 0.26, h * 0.72, d * 0.26], 'default'),
          box([w * 0.32, h * 0.36, d * 0.34], [w * 0.26, h * 0.72, d * 0.26], 'default'),
          cone([-w * 0.32, h * 0.86, d * 0.34], w * 0.16, h * 0.28, 8, 'dark'),
          cone([w * 0.32, h * 0.86, d * 0.34], w * 0.16, h * 0.28, 8, 'dark'),
          // Pitched nave roof + central rose window + arched portal
          box([0, naveH + 0.7, -d * 0.05], [w * 0.62, 1.4, d * 0.78], 'dark', [0, 0, Math.PI / 4]),
          torus([0, naveH * 0.68, d * 0.47], w * 0.12, 0.12, 16, 'accent'),
          cyl([0, naveH * 0.68, d * 0.46], w * 0.11, w * 0.11, 0.08, 'water', [Math.PI / 2, 0, 0]),
          box([0, 1.4, d * 0.47], [w * 0.18, 2.6, 0.16], 'dark')
        );
      } else if (ar.kind === 'factory') {
        // Industrial hall + 3 sawtooth skylight bays + side steel pilasters + rollup cargo gate + tall smokestack chimney
        const hallH = h * 0.68;
        parts.push(
          box([0, hallH * 0.5, 0], [w, hallH, d], 'concrete'),
          box([0, 1.8, d * 0.51], [w * 0.24, 3.4, 0.1], 'dark'),
          // 3 sawtooth skylight roof ridges with north-facing glass
          rampPart([0, hallH, -d * 0.32], [w * 0.98, 1.5, d * 0.3], 'dark'),
          rampPart([0, hallH, 0], [w * 0.98, 1.5, d * 0.3], 'dark'),
          rampPart([0, hallH, d * 0.32], [w * 0.98, 1.5, d * 0.3], 'dark'),
          // Tall brick/steel smokestack chimney on side
          cyl([w * 0.42, h * 0.55, -d * 0.34], 0.42, 0.68, h * 1.1, 'trunk'),
          torus([w * 0.42, h * 1.08, -d * 0.34], 0.45, 0.08, 12, 'dark', [Math.PI / 2, 0, 0])
        );
        for (let z = -d * 0.36; z <= d * 0.37; z += d * 0.36) {
          parts.push(
            box([-w * 0.51, hallH * 0.5, r2(z)], [0.22, hallH, 0.32], 'dark'),
            box([w * 0.51, hallH * 0.5, r2(z)], [0.22, hallH, 0.32], 'dark')
          );
        }
      } else {
        // Detailed Modern Office / Residential / School / Hospital / Arcade Shop:
        // Stone plinth + entrance canopy & glass doors + vertical pilasters + multi-storey window bands + balconies + rooftop penthouse/HVAC
        const podH = cf.podium ? 1.4 : 0.45;
        const bodyH = h * 0.84 - podH;
        const frontZ = d * 0.5;
        parts.push(
          box([0, podH * 0.5, 0], [w * 1.04, podH, d * 1.04], 'concrete'),
          box([0, podH + bodyH * 0.5, 0], [w, bodyH, d], 'default'),
          // Entrance canopy + glass lobby doors + support columns flush against front facade
          box([0, podH + 1.4, r2(frontZ + 0.04)], [w * 0.28, 2.6, 0.12], 'water'),
          box([0, podH + 2.85, r2(frontZ + 0.65)], [w * 0.36, 0.22, 1.4], 'dark'),
          cyl([-w * 0.14, podH + 1.4, r2(frontZ + 1.22)], 0.1, 0.1, 2.7, 'accent'),
          cyl([w * 0.14, podH + 1.4, r2(frontZ + 1.22)], 0.1, 0.1, 2.7, 'accent')
        );

        // Multi-storey window bands & floor slab cornices (4 to 6 visible levels)
        const bandCount = Math.max(3, Math.min(6, Math.round(bodyH / 2.8)));
        for (let b = 0; b < bandCount; b++) {
          const by = r2(podH + ((b + 0.55) / bandCount) * bodyH);
          parts.push(
            // Front & back window glass strips + floor ledge
            box([0, by, r2(frontZ + 0.03)], [w * 0.88, bodyH / (bandCount * 1.8), 0.06], 'water'),
            box([0, by, r2(-frontZ - 0.03)], [w * 0.88, bodyH / (bandCount * 1.8), 0.06], 'water'),
            box([0, r2(by - bodyH / (bandCount * 2.6)), 0], [w * 1.02, 0.12, d * 1.02], 'accent')
          );
          if (ar.kind === 'residential' && b > 0) {
            // Projecting residential balconies anchored cleanly to front facade with front + side glass railings
            const balW = r2(w * 0.26);
            const balD = 1.25;
            const balCenterZ = r2(frontZ + balD * 0.45);
            const railFrontZ = r2(frontZ + balD * 0.91);
            const sideRailZ = r2(frontZ + balD * 0.45);
            const slabY = r2(by - 0.36);
            const railY = r2(by + 0.05);
            [-w * 0.26, w * 0.26].forEach((bx) => {
              const xCenter = r2(bx);
              parts.push(
                box([xCenter, slabY, balCenterZ], [balW, 0.14, balD], 'concrete'),
                box([xCenter, railY, railFrontZ], [balW, 0.68, 0.06], 'water'),
                box([r2(xCenter - balW * 0.5 + 0.03), railY, sideRailZ], [0.06, 0.68, balD * 0.92], 'water'),
                box([r2(xCenter + balW * 0.5 - 0.03), railY, sideRailZ], [0.06, 0.68, balD * 0.92], 'water'),
                box([xCenter, r2(railY + 0.36), railFrontZ], [balW + 0.04, 0.06, 0.09], 'dark')
              );
            });
          }
        }

        // Vertical architectural mullions / corner pilasters
        [-w * 0.46, -w * 0.16, w * 0.16, w * 0.46].forEach((px) => {
          parts.push(box([r2(px), podH + bodyH * 0.5, r2(frontZ + 0.04)], [0.24, bodyH, 0.14], 'accent'));
        });

        // Roof parapet + elevator/HVAC penthouse + communication mast
        const roofY = podH + bodyH;
        parts.push(
          box([0, roofY + 0.24, 0], [w * 1.04, 0.48, d * 1.04], 'accent'),
          box([-w * 0.18, roofY + h * 0.07, -d * 0.12], [w * 0.36, h * 0.14, d * 0.38], 'concrete'),
          cyl([w * 0.22, roofY + 0.6, 0.1], 0.38, 0.38, 0.75, 'dark'),
          cyl([-w * 0.18, roofY + h * 0.16, -d * 0.12], 0.05, 0.08, h * 0.12, 'dark')
        );
        if (cf.wing) {
          parts.push(
            box([w * 0.44, podH + bodyH * 0.36, d * 0.18], [w * 0.36, bodyH * 0.72, d * 0.68], 'accent'),
            box([w * 0.44, podH + bodyH * 0.42, d * 0.53], [w * 0.28, bodyH * 0.45, 0.06], 'water')
          );
        }
      }

      out.push({
        id: `m_bldg_${ar.key}_${cf.suf}`,
        label: `${ar.name} · ${cf.tag}`,
        heightM: h,
        widthM: w,
        depthM: d,
        parts,
      });
    });
  });

  return out;
}

// ============================================================================
// 12. FACILITY (精细化塔吊、三叶风机、摩天轮、高压铁塔、变电站、人行天桥与八角凉亭 · 150 款)
// ============================================================================
function buildMegaFacilityVariants(): AssetVariantSpec[] {
  const out: AssetVariantSpec[] = [];

  const facilities = [
    { key: 'tower_crane', name: '工地桁架动臂塔式起重机', w: 12, h: 22, d: 6 },
    { key: 'wind_turbine', name: '三叶片风力发电机组风机塔', w: 10, h: 20, d: 6 },
    { key: 'hv_pylon', name: '特高压四腿角钢输电铁塔', w: 7.5, h: 18, d: 5.5 },
    { key: 'substation', name: '变电站散热片主变压器与绝缘子组', w: 8, h: 5.8, d: 6 },
    { key: 'cooling_tower', name: '发电厂斜支柱双曲线冷却塔', w: 9, h: 14, d: 9 },
    { key: 'ferris_wheel', name: '游乐园八轿厢双环摩天轮', w: 14, h: 16, d: 5 },
    { key: 'stage_truss', name: '演唱会龙门灯光音响舞台桁架', w: 14, h: 8.5, d: 9 },
    { key: 'ped_overpass', name: '城市带双侧折梯玻璃顶人行天桥', w: 14, h: 6.4, d: 5.5 },
    { key: 'gas_station', name: '双岛四机悬挑雨棚加油站', w: 12, h: 5.8, d: 9 },
    { key: 'ancient_pav', name: '古典园林重檐八角攒尖凉亭', w: 5.8, h: 6.4, d: 5.8 },
  ];

  const scales = [
    { suf: 'fc1', tag: '小型紧凑版', s: 0.78, base: true },
    { suf: 'fc2', tag: '中小型版', s: 0.88, base: true },
    { suf: 'fc3', tag: '标准工程版', s: 1.0, base: true },
    { suf: 'fc4', tag: '加高加强版', s: 1.15, base: true },
    { suf: 'fc5', tag: '特大型地标版', s: 1.3, base: true },
    { suf: 'fc6', tag: '带重型混凝土基座版', s: 1.02, base: true },
    { suf: 'fc7', tag: '带安全护栏围合版', s: 1.08, base: true },
    { suf: 'fc8', tag: '带夜间航空障碍灯版', s: 1.05, base: true, beacon: true },
    { suf: 'fc9', tag: '双联成组版', s: 1.1, base: true },
    { suf: 'fc10', tag: '带检修爬梯平台版', s: 1.06, base: true },
    { suf: 'fc11', tag: '远景天际线高耸版', s: 1.38, base: true },
    { suf: 'fc12', tag: '工业园区成套版', s: 1.18, base: true },
    { suf: 'fc13', tag: '带附属控制室版', s: 1.12, base: true, hut: true },
    { suf: 'fc14', tag: '重型防风抗震版', s: 1.22, base: true },
    { suf: 'fc15', tag: '片场主景精模版', s: 1.25, base: true, beacon: true },
  ];

  facilities.forEach((fc) => {
    scales.forEach((sc) => {
      const w = r2(fc.w * sc.s);
      const h = r2(fc.h * sc.s);
      const d = r2(fc.d * sc.s);
      const parts: InventoryPart[] = [];

      if (fc.key === 'tower_crane') {
        // Concrete pad + 4-chord mast with diagonal lattice + operator cab + main jib + counter-jib + counterweights + apex + trolley & hook
        const mastH = h * 0.82;
        parts.push(
          box([0, 0.35, 0], [3.2, 0.7, 3.2], 'concrete'),
          box([-0.45, mastH * 0.5, -0.45], [0.16, mastH, 0.16], 'car'),
          box([0.45, mastH * 0.5, -0.45], [0.16, mastH, 0.16], 'car'),
          box([-0.45, mastH * 0.5, 0.45], [0.16, mastH, 0.16], 'car'),
          box([0.45, mastH * 0.5, 0.45], [0.16, mastH, 0.16], 'car'),
          // Operator cab with glass + horizontal jib + counterweights + apex tower + hook cable
          box([0.65, mastH - 0.4, 0.55], [1.1, 1.3, 1.2], 'car'),
          box([0.65, mastH - 0.35, 1.16], [0.9, 0.8, 0.08], 'water'),
          box([w * 0.14, mastH + 0.3, 0], [w * 0.96, 0.55, 0.65], 'car'),
          box([-w * 0.28, mastH - 0.25, 0], [1.4, 1.1, 0.9], 'concrete'),
          cone([0, h - 0.9, 0], 0.65, 2.2, 4, 'car'),
          cyl([w * 0.38, mastH * 0.62, 0], 0.03, 0.03, mastH * 0.72, 'dark'),
          box([w * 0.38, mastH * 0.24, 0], [0.45, 0.55, 0.35], 'accent')
        );
      } else if (fc.key === 'wind_turbine') {
        // Foundation + tapered tubular tower + nacelle + nose cone + 3 blades at 120-deg intervals
        const hubY = h * 0.76;
        const bladeL = w * 0.48;
        parts.push(
          cyl([0, 0.3, 0], 1.4, 1.6, 0.6, 'concrete'),
          cyl([0, hubY * 0.5, 0], 0.38, 0.78, hubY, 'default'),
          box([0, hubY, -0.2], [1.1, 1.1, 2.6], 'default'),
          cone([0, hubY, 1.35], 0.55, 0.95, 12, 'accent', [Math.PI / 2, 0, 0]),
          // 3 radial blades (0, 120, 240 deg)
          box([0, r2(hubY + bladeL * 0.5), 1.05], [0.28, bladeL, 0.08], 'default'),
          box([r2(bladeL * 0.43), r2(hubY - bladeL * 0.25), 1.05], [0.28, bladeL, 0.08], 'default', [0, 0, (-2 * Math.PI) / 3]),
          box([r2(-bladeL * 0.43), r2(hubY - bladeL * 0.25), 1.05], [0.28, bladeL, 0.08], 'default', [0, 0, (2 * Math.PI) / 3])
        );
      } else if (fc.key === 'ferris_wheel') {
        // Twin A-frame support legs + central hub + 2 concentric torus rims + 4 diametric spokes + 8 hanging passenger cabins
        const cy = h * 0.56;
        const rad = Math.min(w, h) * 0.42;
        parts.push(
          box([0, 0.25, 0], [w * 0.72, 0.5, d * 0.88], 'concrete'),
          cyl([-w * 0.18, cy * 0.52, -0.7], 0.14, 0.18, cy * 1.08, 'dark', [0, 0, -0.32]),
          cyl([w * 0.18, cy * 0.52, -0.7], 0.14, 0.18, cy * 1.08, 'dark', [0, 0, 0.32]),
          cyl([-w * 0.18, cy * 0.52, 0.7], 0.14, 0.18, cy * 1.08, 'dark', [0, 0, -0.32]),
          cyl([w * 0.18, cy * 0.52, 0.7], 0.14, 0.18, cy * 1.08, 'dark', [0, 0, 0.32]),
          cyl([0, cy, 0], 0.38, 0.38, 1.8, 'accent', [Math.PI / 2, 0, 0]),
          torus([0, cy, -0.45], rad, 0.12, 24, 'car'),
          torus([0, cy, 0.45], rad, 0.12, 24, 'car'),
          torus([0, cy, 0], rad * 0.65, 0.08, 20, 'emissiveLamp')
        );
        for (let a = 0; a < 8; a++) {
          const ang = (a * Math.PI) / 4;
          const gx = r2(Math.cos(ang) * rad);
          const gy = r2(cy + Math.sin(ang) * rad);
          parts.push(
            box([gx, gy, 0], [0.85, 0.95, 0.85], a % 2 === 0 ? 'accent' : 'water')
          );
          if (a < 4) {
            parts.push(box([0, cy, 0], [0.08, rad * 2, 0.08], 'dark', [0, 0, ang]));
          }
        }
      } else if (fc.key === 'hv_pylon') {
        // Tapered steel tower + 3 tiers of wide cross-arms with hanging insulators
        parts.push(
          box([0, 0.25, 0], [w * 0.52, 0.5, d * 0.52], 'concrete'),
          cone([0, h * 0.48, 0], w * 0.24, h * 0.94, 4, 'dark', [0, Math.PI / 4, 0]),
          box([0, h * 0.52, 0], [w * 0.96, 0.26, 0.36], 'dark'),
          box([0, h * 0.72, 0], [w * 0.82, 0.24, 0.32], 'dark'),
          box([0, h * 0.9, 0], [w * 0.64, 0.2, 0.28], 'dark'),
          cyl([-w * 0.45, h * 0.46, 0], 0.08, 0.08, 0.75, 'water'),
          cyl([w * 0.45, h * 0.46, 0], 0.08, 0.08, 0.75, 'water'),
          cyl([-w * 0.38, h * 0.66, 0], 0.08, 0.08, 0.75, 'water'),
          cyl([w * 0.38, h * 0.66, 0], 0.08, 0.08, 0.75, 'water')
        );
      } else if (fc.key === 'cooling_tower') {
        // Slanted V-support legs + basin + hyperbolic lower & upper shells + steam rim
        parts.push(
          cyl([0, 0.3, 0], w * 0.48, w * 0.5, 0.6, 'concrete'),
          cyl([0, h * 0.34, 0], w * 0.33, w * 0.46, h * 0.58, 'concrete'),
          cyl([0, h * 0.76, 0], w * 0.38, w * 0.33, h * 0.42, 'concrete'),
          torus([0, h * 0.97, 0], w * 0.38, 0.14, 20, 'dark', [Math.PI / 2, 0, 0])
        );
      } else if (fc.key === 'ped_overpass') {
        // Elevated bridge deck + glass canopy + twin piers + left & right access stairs + railings
        const deckY = h * 0.58;
        parts.push(
          box([0, deckY, 0], [w, 0.36, d * 0.48], 'concrete'),
          box([0, deckY + 0.55, d * 0.22], [w, 0.85, 0.08], 'water'),
          box([0, deckY + 0.55, -d * 0.22], [w, 0.85, 0.08], 'water'),
          box([0, h - 0.16, 0], [w * 0.96, 0.22, d * 0.56], 'water'),
          cyl([-w * 0.34, deckY * 0.5, 0], 0.36, 0.42, deckY, 'concrete'),
          cyl([w * 0.34, deckY * 0.5, 0], 0.36, 0.42, deckY, 'concrete'),
          rampPart([-w * 0.42, 0, d * 0.36], [1.4, deckY, d * 0.48], 'concrete'),
          rampPart([w * 0.42, 0, d * 0.36], [1.4, deckY, d * 0.48], 'concrete')
        );
      } else if (fc.key === 'ancient_pav') {
        // Stepped stone platform + 8 circular vermilion columns + perimeter bench backrest + double-eave octagonal roof & finial
        parts.push(
          cyl([0, 0.28, 0], w * 0.48, w * 0.52, 0.56, 'rock'),
          cyl([0, 0.62, 0], w * 0.44, w * 0.46, 0.16, 'default')
        );
        const colR = w * 0.35;
        const colH = h * 0.48;
        for (let a = 0; a < 8; a++) {
          const ang = (a * Math.PI) / 4;
          parts.push(
            cyl([r2(Math.cos(ang) * colR), r2(0.7 + colH * 0.5), r2(Math.sin(ang) * colR)], 0.11, 0.12, colH, 'trunk')
          );
        }
        parts.push(
          torus([0, 1.05, 0], colR, 0.12, 8, 'wood', [Math.PI / 2, 0, 0]),
          cone([0, 0.7 + colH + h * 0.12, 0], w * 0.58, h * 0.24, 8, 'dark'),
          cone([0, 0.7 + colH + h * 0.28, 0], w * 0.46, h * 0.26, 8, 'dark'),
          sph([0, h - 0.1, 0], 0.18, 0.24, 0.18, 'emissiveLamp')
        );
      } else {
        // Substation / Stage Truss / Gas Station canopy with columns, roof truss, lighting bar & equipment islands
        parts.push(
          box([0, 0.22, 0], [w * 0.94, 0.44, d * 0.92], 'concrete'),
          cyl([-w * 0.36, h * 0.48, -d * 0.3], 0.18, 0.2, h * 0.88, 'dark'),
          cyl([w * 0.36, h * 0.48, -d * 0.3], 0.18, 0.2, h * 0.88, 'dark'),
          cyl([-w * 0.36, h * 0.48, d * 0.3], 0.18, 0.2, h * 0.88, 'dark'),
          cyl([w * 0.36, h * 0.48, d * 0.3], 0.18, 0.2, h * 0.88, 'dark'),
          box([0, h - 0.28, 0], [w, 0.48, d], 'accent'),
          box([0, h - 0.28, d * 0.51], [w * 0.88, 0.24, 0.06], 'emissiveLamp'),
          box([-w * 0.2, 1.25, 0], [1.1, 1.8, 0.85], 'car'),
          box([w * 0.2, 1.25, 0], [1.1, 1.8, 0.85], 'car')
        );
      }

      if (sc.hut) {
        parts.push(box([w * 0.34, 1.35, 0], [1.8, 2.3, 2.2], 'default'));
      }
      if (sc.beacon) {
        parts.push(sph([0, h + 0.16, 0], 0.2, 0.2, 0.2, 'emissiveLamp'));
      }

      out.push({
        id: `m_fac_${fc.key}_${sc.suf}`,
        label: `${fc.name} · ${sc.tag}`,
        heightM: h,
        widthM: w,
        depthM: d,
        parts,
      });
    });
  });

  return out;
}

// ============================================================================
// 13. WALL (精细化故宫红墙、徽派马头墙、苏式漏窗墙、城垛墙与浮雕景墙 · 150 款 · 沿 +X 轴连续拼接)
// ============================================================================
function buildMegaWallVariants(): AssetVariantSpec[] {
  const out: AssetVariantSpec[] = [];

  const wallTypes = [
    { key: 'palace_red', name: '故宫朱红宫墙双坡琉璃瓦顶', w: 4.0, h: 3.4, d: 0.48, mat: 'accent' as ClayVariant, cap: 'dark' as ClayVariant },
    { key: 'huizhou_matou', name: '徽派粉墙黛瓦跌落马头院墙', w: 4.0, h: 3.2, d: 0.38, mat: 'default' as ClayVariant, cap: 'dark' as ClayVariant },
    { key: 'suzhou_window', name: '苏式园林花格圆漏窗景墙', w: 4.0, h: 2.8, d: 0.34, mat: 'default' as ClayVariant, cap: 'dark' as ClayVariant },
    { key: 'ancient_city', name: '古城墙雉堞垛口射孔女墙段', w: 4.5, h: 4.2, d: 1.2, mat: 'rock' as ClayVariant, cap: 'concrete' as ClayVariant },
    { key: 'glass_curtain', name: '商业建筑横竖明框玻璃幕墙', w: 4.0, h: 3.6, d: 0.28, mat: 'water' as ClayVariant, cap: 'dark' as ClayVariant },
    { key: 'ind_brick', name: '工业风红砖壁柱带拱窗厂房墙', w: 4.0, h: 3.4, d: 0.42, mat: 'trunk' as ClayVariant, cap: 'concrete' as ClayVariant },
    { key: 'wood_slat', name: '新中式竖向木格栅半透隔断墙', w: 3.6, h: 2.9, d: 0.24, mat: 'wood' as ClayVariant, cap: 'trunk' as ClayVariant },
    { key: 'bunker_blast', name: '军事基地斜撑钢筋混凝土防爆墙', w: 4.0, h: 3.5, d: 0.65, mat: 'concrete' as ClayVariant, cap: 'dark' as ClayVariant },
    { key: 'euro_arcade', name: '欧式古典罗马柱壁龛浮雕外墙', w: 4.0, h: 3.6, d: 0.45, mat: 'default' as ClayVariant, cap: 'accent' as ClayVariant },
    { key: 'ruin_broken', name: '战损废墟露筋残垣断壁墙段', w: 4.0, h: 2.6, d: 0.42, mat: 'concrete' as ClayVariant, cap: 'rock' as ClayVariant },
  ];

  const variations = [
    { suf: 'w1', tag: '标准4m精装段', wMul: 1.0, hMul: 1.0, win: false, pilaster: true },
    { suf: 'w2', tag: '低矮1.8m半墙段', wMul: 1.0, hMul: 0.58, win: false, pilaster: true },
    { suf: 'w3', tag: '加高4.2m高墙段', wMul: 1.0, hMul: 1.25, win: false, pilaster: true },
    { suf: 'w4', tag: '带双壁柱浮雕段', wMul: 1.0, hMul: 1.0, win: false, pilaster: true },
    { suf: 'w5', tag: '带花格景窗开洞段', wMul: 1.0, hMul: 1.0, win: true, pilaster: true },
    { suf: 'w6', tag: '带圆漏窗与壁柱段', wMul: 1.05, hMul: 1.05, win: true, pilaster: true },
    { suf: 'w7', tag: '带青石须弥座勒脚段', wMul: 1.0, hMul: 1.08, win: false, pilaster: true, plinth: true },
    { suf: 'w8', tag: '长跨度5.2m段', wMul: 1.3, hMul: 1.0, win: true, pilaster: true },
    { suf: 'w9', tag: '短跨度2.4m转接段', wMul: 0.62, hMul: 1.0, win: false, pilaster: true },
    { suf: 'w10', tag: '双坡挑檐瓦顶段', wMul: 1.0, hMul: 1.12, win: false, pilaster: true, eave: true },
    { suf: 'w11', tag: '带双侧宫灯壁灯段', wMul: 1.0, hMul: 1.05, win: false, pilaster: true, lamp: true },
    { suf: 'w12', tag: '加厚扶壁承重段', wMul: 1.0, hMul: 1.05, win: false, pilaster: true, plinth: true },
    { suf: 'w13', tag: '高窗采光立面段', wMul: 1.0, hMul: 1.18, win: true, pilaster: true },
    { suf: 'w14', tag: '马头墙三阶跌落段', wMul: 1.05, hMul: 1.15, win: false, pilaster: true, eave: true },
    { suf: 'w15', tag: '片场主景雕花院墙段', wMul: 1.1, hMul: 1.1, win: true, pilaster: true, eave: true, lamp: true },
  ];

  wallTypes.forEach((wt) => {
    variations.forEach((vr) => {
      const w = r2(wt.w * vr.wMul);
      const h = r2(wt.h * vr.hMul);
      const d = wt.d;
      const parts: InventoryPart[] = [
        // Stone base plinth (青石勒脚) + waist moulding
        box([0, 0.2, 0], [w * 1.02, 0.4, d * 1.24], 'rock'),
        box([0, 0.44, 0], [w * 1.01, 0.08, d * 1.16], 'accent'),
      ];

      if (wt.key === 'wood_slat') {
        // Top & bottom timber frames + 9 vertical wooden louver slats
        for (let s = -4; s <= 4; s++) {
          parts.push(box([r2(s * w * 0.1), h * 0.5, 0], [0.09, h * 0.84, d * 0.72], 'wood'));
        }
      } else if (vr.win || wt.key === 'suzhou_window') {
        // Wall with circular lattice漏窗 window in the middle
        parts.push(
          box([0, h * 0.24, 0], [w, h * 0.42, d], wt.mat),
          box([0, h * 0.82, 0], [w, h * 0.22, d], wt.mat),
          box([-w * 0.35, h * 0.55, 0], [w * 0.3, h * 0.36, d], wt.mat),
          box([w * 0.35, h * 0.55, 0], [w * 0.3, h * 0.36, d], wt.mat),
          torus([0, h * 0.55, 0], Math.min(w, h) * 0.16, 0.08, 16, 'dark'),
          box([0, h * 0.55, 0], [w * 0.28, 0.04, 0.06], 'wood'),
          box([0, h * 0.55, 0], [0.04, h * 0.28, 0.06], 'wood')
        );
      } else {
        // Solid wall with recessed decorative relief panels (墙心框线)
        parts.push(
          box([0, h * 0.5, 0], [w, h * 0.84, d], wt.mat),
          box([-w * 0.2, h * 0.52, 0], [w * 0.3, h * 0.46, d * 1.1], 'accent'),
          box([w * 0.2, h * 0.52, 0], [w * 0.3, h * 0.46, d * 1.1], 'accent')
        );
      }

      // End pilasters + double-sloped tile roof coping or crenellated merlons
      parts.push(
        box([-w * 0.46, h * 0.5, 0], [0.34, h * 0.96, d * 1.32], wt.cap),
        box([w * 0.46, h * 0.5, 0], [0.34, h * 0.96, d * 1.32], wt.cap)
      );
      if (wt.key === 'ancient_city') {
        // 4 battlements (城垛雉堞) along top of city wall
        for (let m = -1.5; m <= 1.5; m += 1) {
          parts.push(box([r2(m * w * 0.24), h - 0.18, d * 0.3], [w * 0.16, 0.46, d * 0.38], 'rock'));
        }
      } else {
        // Double-pitched tiled wall coping + ridge bar
        parts.push(
          box([0, h - 0.12, d * 0.22], [w * 1.04, 0.12, d * 0.72], wt.cap, [0.42, 0, 0]),
          box([0, h - 0.12, -d * 0.22], [w * 1.04, 0.12, d * 0.72], wt.cap, [-0.42, 0, 0]),
          box([0, h - 0.02, 0], [w * 1.05, 0.12, 0.16], 'accent')
        );
      }
      if (vr.lamp) {
        parts.push(
          sph([-w * 0.46, h * 0.74, d * 0.72], 0.12, 0.15, 0.12, 'emissiveLamp'),
          sph([w * 0.46, h * 0.74, d * 0.72], 0.12, 0.15, 0.12, 'emissiveLamp')
        );
      }

      out.push({
        id: `m_wall_${wt.key}_${vr.suf}`,
        label: `${wt.name} · ${vr.tag}`,
        heightM: h,
        widthM: w,
        depthM: d,
        parts,
      });
    });
  });

  return out;
}

// ============================================================================
// 14. DOORWAY (精细化四柱三楼石牌坊、垂花门、月亮门、铜钉宫门与凯旋拱门 · 140 款)
// ============================================================================
function buildMegaDoorwayVariants(): AssetVariantSpec[] {
  const out: AssetVariantSpec[] = [];

  const doors = [
    { key: 'paifang', name: '中式四柱三间五楼雕花石牌坊', w: 6.4, h: 5.6, d: 1.3 },
    { key: 'chuihua', name: '四合院悬莲垂花门带抱鼓石', w: 3.6, h: 4.0, d: 1.2 },
    { key: 'moon_gate', name: '江南园林粉墙黛瓦圆月亮门', w: 3.8, h: 3.2, d: 0.45 },
    { key: 'palace_gate', name: '古建重檐铜钉铺首朱红宫门', w: 4.8, h: 4.6, d: 1.3 },
    { key: 'triumph_arch', name: '欧式罗马柱浮雕凯旋石拱门', w: 5.6, h: 5.8, d: 1.6 },
    { key: 'glass_lobby', name: '写字楼雨棚四翼旋转玻璃门厅', w: 4.2, h: 3.6, d: 1.5 },
    { key: 'hangar_gate', name: '机库桁架导轨巨型推拉大门', w: 5.6, h: 4.4, d: 0.65 },
    { key: 'scifi_airlock', name: '科幻基地八角液压气密闸门', w: 3.8, h: 3.5, d: 0.8 },
    { key: 'shrine_torii', name: '东方木构双横梁笠木朱红鸟居', w: 4.4, h: 4.3, d: 0.9 },
    { key: 'subway_gate', name: '地铁站刷卡摆闸三通道检票机', w: 3.6, h: 1.25, d: 1.65 },
  ];

  const editions = [
    { suf: 'd1', tag: '紧凑单门款', wMul: 0.8, hMul: 0.88 },
    { suf: 'd2', tag: '标准门楼款', wMul: 1.0, hMul: 1.0 },
    { suf: 'd3', tag: '加宽迎宾款', wMul: 1.22, hMul: 1.05 },
    { suf: 'd4', tag: '高耸礼仪款', wMul: 1.1, hMul: 1.24 },
    { suf: 'd5', tag: '带两侧八字影壁翼墙款', wMul: 1.35, hMul: 1.0, wing: true },
    { suf: 'd6', tag: '带门前守门石狮抱鼓石款', wMul: 1.05, hMul: 1.02, guard: true },
    { suf: 'd7', tag: '重檐飞檐翘角款', wMul: 1.12, hMul: 1.18, roof: true },
    { suf: 'd8', tag: '带三阶须弥座台基款', wMul: 1.08, hMul: 1.06, guard: true },
    { suf: 'd9', tag: '双扇门扉半开状态款', wMul: 1.0, hMul: 1.0, leaf: true },
    { suf: 'd10', tag: '带金字匾额红灯笼款', wMul: 1.04, hMul: 1.08, lamp: true },
    { suf: 'd11', tag: '三间四柱大通道款', wMul: 1.45, hMul: 1.1, wing: true },
    { suf: 'd12', tag: '加厚深拱券门洞款', wMul: 1.15, hMul: 1.12, guard: true },
    { suf: 'd13', tag: '现代极简精装款', wMul: 0.94, hMul: 0.96, leaf: true },
    { suf: 'd14', tag: '片场主景门楼精模款', wMul: 1.26, hMul: 1.16, roof: true, guard: true, lamp: true },
  ];

  doors.forEach((dr) => {
    editions.forEach((ed) => {
      const w = r2(dr.w * ed.wMul);
      const h = r2(dr.h * ed.hMul);
      const d = dr.d;
      const parts: InventoryPart[] = [];

      if (dr.key === 'paifang') {
        // 4 columns on carved drum-stone plinths + 3 bays + multi-layer carved lintel beams + 3 stepped Chinese flying-eave roofs + plaque
        const colX = [-w * 0.44, -w * 0.18, w * 0.18, w * 0.44];
        colX.forEach((cx, i) => {
          const ch = i === 1 || i === 2 ? h * 0.86 : h * 0.72;
          parts.push(
            cyl([r2(cx), ch * 0.5, 0], 0.16, 0.18, ch, 'rock'),
            box([r2(cx), 0.35, 0], [0.42, 0.7, d * 0.95], 'concrete'),
            cyl([r2(cx), 0.42, d * 0.48], 0.24, 0.24, 0.18, 'rock', [0, Math.PI / 2, 0])
          );
        });
        // Multi-tier lintels (额枋+花板+匾额)
        parts.push(
          box([0, h * 0.62, 0], [w * 0.92, 0.26, 0.28], 'accent'),
          box([0, h * 0.74, 0], [w * 0.4, 0.42, 0.26], 'trunk'),
          box([0, h * 0.74, 0.16], [w * 0.26, 0.36, 0.08], 'accent')
        );
        // Center main roof + left & right lower wing roofs with flying eaves
        addChineseRoof(parts, h * 0.82, w * 0.46, d, h * 0.18, 'dark', 'accent');
        parts.push(
          box([-w * 0.31, h * 0.72, 0], [w * 0.32, 0.22, d * 0.96], 'dark'),
          cone([-w * 0.31, h * 0.78, 0], w * 0.2, 0.32, 4, 'dark', [0, Math.PI / 4, 0]),
          box([w * 0.31, h * 0.72, 0], [w * 0.32, 0.22, d * 0.96], 'dark'),
          cone([w * 0.31, h * 0.78, 0], w * 0.2, 0.32, 4, 'dark', [0, Math.PI / 4, 0])
        );
      } else if (dr.key === 'moon_gate') {
        // White courtyard wall sections + circular moon arch torus + stone threshold + tiled coping
        parts.push(
          box([0, 0.14, 0], [w, 0.28, d * 1.2], 'rock'),
          box([-w * 0.36, h * 0.48, 0], [w * 0.28, h * 0.92, d], 'default'),
          box([w * 0.36, h * 0.48, 0], [w * 0.28, h * 0.92, d], 'default'),
          box([0, h * 0.86, 0], [w, h * 0.2, d], 'default'),
          torus([0, h * 0.46, 0], Math.min(w, h) * 0.34, 0.22, 24, 'dark'),
          box([0, h - 0.06, 0], [w * 1.06, 0.18, d * 1.45], 'dark')
        );
      } else if (dr.key === 'subway_gate') {
        // 4 stainless turnstile cabinets with card readers & red/blue swing barrier flaps
        for (let i = -1.5; i <= 1.5; i += 1) {
          parts.push(
            box([r2(i * w * 0.26), h * 0.46, 0], [0.28, h * 0.92, d * 0.88], 'car'),
            box([r2(i * w * 0.26), h * 0.94, -d * 0.32], [0.24, 0.08, 0.28], 'emissiveLamp')
          );
          if (i < 1.5) {
            parts.push(box([r2((i + 0.5) * w * 0.26), h * 0.45, 0], [w * 0.18, h * 0.58, 0.04], 'water'));
          }
        }
      } else {
        // Detailed Chuihua / Palace Gate / Triumphal Arch / Torii / Lobby Door:
        // Twin piers + engaged columns + arch/lintel + double doors with brass ring knockers + pitched Chinese roof or classical cornice
        parts.push(
          box([-w * 0.36, h * 0.42, 0], [w * 0.22, h * 0.82, d], 'default'),
          box([w * 0.36, h * 0.42, 0], [w * 0.22, h * 0.82, d], 'default'),
          cyl([-w * 0.25, h * 0.42, d * 0.48], 0.14, 0.16, h * 0.82, 'trunk'),
          cyl([w * 0.25, h * 0.42, d * 0.48], 0.14, 0.16, h * 0.82, 'trunk'),
          // Hanging lotus pendants (垂莲柱) or arch ring
          cyl([-w * 0.18, h * 0.68, d * 0.52], 0.08, 0.05, 0.42, 'accent'),
          cyl([w * 0.18, h * 0.68, d * 0.52], 0.08, 0.05, 0.42, 'accent')
        );
        // Double-leaf doors with brass knockers
        const doorAng = ed.leaf ? 0.48 : 0;
        parts.push(
          box([-w * 0.12, h * 0.36, 0], [w * 0.22, h * 0.68, 0.08], 'trunk', [0, doorAng, 0]),
          box([w * 0.12, h * 0.36, 0], [w * 0.22, h * 0.68, 0.08], 'trunk', [0, -doorAng, 0]),
          torus([-w * 0.05, h * 0.38, 0.06], 0.07, 0.018, 10, 'emissiveLamp'),
          torus([w * 0.05, h * 0.38, 0.06], 0.07, 0.018, 10, 'emissiveLamp')
        );
        addChineseRoof(parts, h * 0.78, w * 0.96, d, h * 0.22, 'dark', 'accent');
      }

      if (ed.guard) {
        parts.push(
          box([-w * 0.36, 0.28, d * 0.68], [0.42, 0.56, 0.52], 'rock'),
          sph([-w * 0.36, 0.68, d * 0.68], 0.22, 0.24, 0.22, 'rock'),
          box([w * 0.36, 0.28, d * 0.68], [0.42, 0.56, 0.52], 'rock'),
          sph([w * 0.36, 0.68, d * 0.68], 0.22, 0.24, 0.22, 'rock')
        );
      }
      if (ed.lamp) {
        parts.push(
          sph([-w * 0.24, h * 0.72, d * 0.56], 0.15, 0.18, 0.15, 'emissiveLamp'),
          sph([w * 0.24, h * 0.72, d * 0.56], 0.15, 0.18, 0.15, 'emissiveLamp')
        );
      }

      out.push({
        id: `m_door_${dr.key}_${ed.suf}`,
        label: `${dr.name} · ${ed.tag}`,
        heightM: h,
        widthM: w,
        depthM: d,
        parts,
      });
    });
  });

  return out;
}

// ============================================================================
// 15. STAIRS (精细化丹陛御道台阶、斜向扶手栏杆立柱楼梯、旋转梯与扶梯 · 140 款)
// ============================================================================
function buildMegaStairsVariants(): AssetVariantSpec[] {
  const out: AssetVariantSpec[] = [];

  const stairTypes = [
    { key: 'imperial_step', name: '古建大殿三路丹陛云龙御道石阶', w: 5.2, h: 1.8, d: 4.2, mat: 'default' as ClayVariant },
    { key: 'plaza_wide', name: '城市广场带中分扶手宽幅大台阶', w: 6.0, h: 1.6, d: 4.0, mat: 'concrete' as ClayVariant },
    { key: 'indoor_wood', name: '室内胡桃木车木栏杆直跑楼梯', w: 1.6, h: 2.8, d: 3.8, mat: 'wood' as ClayVariant },
    { key: 'fire_escape', name: '建筑外挂钢格栅消防逃生折梯', w: 1.8, h: 3.6, d: 3.6, mat: 'dark' as ClayVariant },
    { key: 'escalator', name: '商场全玻护栏自动扶梯模块', w: 1.8, h: 3.2, d: 5.2, mat: 'car' as ClayVariant },
    { key: 'spiral_stair', name: '中轴柱旋转雕花钢木艺术楼梯', w: 2.4, h: 3.2, d: 2.4, mat: 'wood' as ClayVariant },
    { key: 'u_switchback', name: '双跑折返休息平台楼梯间', w: 2.8, h: 3.2, d: 4.2, mat: 'concrete' as ClayVariant },
    { key: 'mountain_trail', name: '名山石栏杆青石板登山云梯', w: 2.2, h: 2.0, d: 4.5, mat: 'rock' as ClayVariant },
    { key: 'stage_steps', name: '演播厅灯带包边弧形舞台阶梯', w: 3.6, h: 1.2, d: 2.6, mat: 'dark' as ClayVariant },
    { key: 'boarding_stair', name: '机场带顶篷移动登机客梯车', w: 2.2, h: 3.5, d: 5.0, mat: 'car' as ClayVariant },
  ];

  const stepsCfg = [
    { suf: 'st1', tag: '6级低矮踏步', wMul: 0.9, hMul: 0.65, steps: 6 },
    { suf: 'st2', tag: '8级标准踏步', wMul: 1.0, hMul: 0.85, steps: 8 },
    { suf: 'st3', tag: '10级带望柱护栏', wMul: 1.0, hMul: 1.0, steps: 9 },
    { suf: 'st4', tag: '12级加高长跑', wMul: 1.05, hMul: 1.22, steps: 10 },
    { suf: 'st5', tag: '14级高差层间梯', wMul: 1.05, hMul: 1.38, steps: 10 },
    { suf: 'st6', tag: '加宽迎宾礼仪梯', wMul: 1.36, hMul: 1.0, steps: 8, midRail: true },
    { suf: 'st7', tag: '窄幅紧凑通道梯', wMul: 0.74, hMul: 1.0, steps: 8 },
    { suf: 'st8', tag: '带顶部宽平台款', wMul: 1.05, hMul: 1.05, steps: 8, landing: true },
    { suf: 'st9', tag: '三路分流中分扶手款', wMul: 1.28, hMul: 1.05, steps: 8, midRail: true },
    { suf: 'st10', tag: '带雕花垂带斜石栏款', wMul: 1.08, hMul: 1.0, steps: 8 },
    { suf: 'st11', tag: '缓坡宽踏面舒适款', wMul: 1.1, hMul: 0.82, steps: 8 },
    { suf: 'st12', tag: '陡峭紧凑工业款', wMul: 0.85, hMul: 1.26, steps: 9 },
    { suf: 'st13', tag: '双侧对称礼仪大梯', wMul: 1.4, hMul: 1.05, steps: 8, midRail: true },
    { suf: 'st14', tag: '片场主景御道大台阶', wMul: 1.48, hMul: 1.15, steps: 9, midRail: true, landing: true },
  ];

  stairTypes.forEach((st) => {
    stepsCfg.forEach((sc) => {
      const w = r2(st.w * sc.wMul);
      const h = r2(st.h * sc.hMul);
      const d = st.d;
      const parts: InventoryPart[] = [];

      if (st.key === 'spiral_stair') {
        // Central steel column + 10 radiating spiral treads + outer handrail posts
        parts.push(cyl([0, h * 0.52, 0], 0.16, 0.18, h * 1.04, 'dark'));
        for (let i = 0; i < 10; i++) {
          const ang = (i / 10) * Math.PI * 1.75;
          const sy = r2(((i + 0.5) / 10) * h);
          const rx = r2(Math.cos(ang) * w * 0.24);
          const rz = r2(Math.sin(ang) * d * 0.24);
          parts.push(
            box([rx, sy, rz], [w * 0.44, 0.08, 0.34], 'wood', [0, -ang, 0]),
            cyl([r2(Math.cos(ang) * w * 0.42), r2(sy + 0.42), r2(Math.sin(ang) * d * 0.42)], 0.03, 0.03, 0.84, 'accent')
          );
        }
      } else {
        for (let i = 0; i < sc.steps; i++) {
          const sh = r2(((i + 1) / sc.steps) * h);
          const sz = r2(d / sc.steps);
          const pz = r2(d * 0.5 - (i + 0.5) * sz);
          parts.push(box([0, sh * 0.5, pz], [w * 0.94, sh, sz * 1.02], st.mat));
        }
        // Sloped side stringers & handrails + vertical baluster posts + lotus finials
        const slopePitch = Math.atan2(h, d);
        const railLen = Math.hypot(h, d);
        parts.push(
          box([-w * 0.46, h * 0.5 + 0.42, 0], [0.14, 0.12, railLen], 'accent', [slopePitch, 0, 0]),
          box([w * 0.46, h * 0.5 + 0.42, 0], [0.14, 0.12, railLen], 'accent', [slopePitch, 0, 0]),
          // Bottom & top newel posts (望柱)
          cyl([-w * 0.46, 0.48, d * 0.46], 0.1, 0.11, 0.96, 'default'),
          sph([-w * 0.46, 1.02, d * 0.46], 0.12, 0.14, 0.12, 'accent'),
          cyl([w * 0.46, 0.48, d * 0.46], 0.1, 0.11, 0.96, 'default'),
          sph([w * 0.46, 1.02, d * 0.46], 0.12, 0.14, 0.12, 'accent'),
          cyl([-w * 0.46, h + 0.42, -d * 0.44], 0.1, 0.11, 0.96, 'default'),
          cyl([w * 0.46, h + 0.42, -d * 0.44], 0.1, 0.11, 0.96, 'default')
        );
        if (sc.midRail || st.key === 'imperial_step') {
          // Central carved dragon ramp slab (丹陛御路石) or center handrail
          parts.push(
            box([0, h * 0.5 + 0.16, 0], [w * 0.24, 0.16, railLen * 0.96], 'rock', [slopePitch, 0, 0])
          );
        }
      }

      out.push({
        id: `m_stair_${st.key}_${sc.suf}`,
        label: `${st.name} · ${sc.tag}`,
        heightM: r2(h + 0.6),
        widthM: w,
        depthM: d,
        parts,
      });
    });
  });

  return out;
}

// ============================================================================
// 16. RAMP (精细化带双层无障碍扶手坡道、防滑条纹车库坡道与登车桥 · 130 款)
// ============================================================================
function buildMegaRampVariants(): AssetVariantSpec[] {
  const out: AssetVariantSpec[] = [];

  const ramps = [
    { key: 'ada_ramp', name: '建筑入口双层扶手无障碍缓坡道', w: 2.2, h: 0.95, d: 4.8, mat: 'concrete' as ClayVariant },
    { key: 'garage_slope', name: '地下车库防滑条双车道斜坡', w: 5.8, h: 2.2, d: 7.5, mat: 'road' as ClayVariant },
    { key: 'dock_leveler', name: '物流仓库钢格板叉车登车桥斜坡', w: 2.8, h: 1.35, d: 4.6, mat: 'dark' as ClayVariant },
    { key: 'stunt_jump', name: '动作片桁架支撑飞车特技起跳坡', w: 3.6, h: 1.85, d: 5.2, mat: 'wood' as ClayVariant },
    { key: 'skate_qpipe', name: '滑板公园带护栏钢管冲刺坡台', w: 3.4, h: 1.65, d: 3.8, mat: 'concrete' as ClayVariant },
    { key: 'embankment', name: '河岸块石压顶堤坝护坡斜坡', w: 5.0, h: 2.0, d: 4.5, mat: 'rock' as ClayVariant },
    { key: 'siege_earth', name: '古战场木排桩加固攻城斜坡道', w: 4.2, h: 2.4, d: 6.2, mat: 'trunk' as ClayVariant },
    { key: 'overpass_ap', name: '高架桥带防撞墙引桥匝道坡', w: 6.5, h: 2.8, d: 8.5, mat: 'road' as ClayVariant },
    { key: 'stage_catwalk', name: '秀场灯带包边T台倾斜走秀坡', w: 2.6, h: 1.15, d: 5.0, mat: 'default' as ClayVariant },
    { key: 'ferry_slip', name: '渡口系船柱防滑汽车下水斜坡', w: 4.8, h: 1.45, d: 6.0, mat: 'concrete' as ClayVariant },
  ];

  const rampEditions = [
    { suf: 'rp1', tag: '缓坡低矮款', wMul: 0.9, hMul: 0.7, dMul: 1.0 },
    { suf: 'rp2', tag: '标准坡度款', wMul: 1.0, hMul: 1.0, dMul: 1.0 },
    { suf: 'rp3', tag: '加高陡坡款', wMul: 1.0, hMul: 1.3, dMul: 1.05 },
    { suf: 'rp4', tag: '加宽双通道款', wMul: 1.35, hMul: 1.0, dMul: 1.05 },
    { suf: 'rp5', tag: '加长缓升款', wMul: 1.0, hMul: 1.05, dMul: 1.35 },
    { suf: 'rp6', tag: '带双侧高护栏款', wMul: 1.08, hMul: 1.0, dMul: 1.0 },
    { suf: 'rp7', tag: '带顶部休息平台款', wMul: 1.05, hMul: 1.05, dMul: 1.2, topDeck: true },
    { suf: 'rp8', tag: '窄幅单人通道款', wMul: 0.74, hMul: 0.9, dMul: 0.92 },
    { suf: 'rp9', tag: '中分隔离双车道款', wMul: 1.45, hMul: 1.08, dMul: 1.1, midCurb: true },
    { suf: 'rp10', tag: '重型防滑肋条款', wMul: 1.12, hMul: 1.0, dMul: 1.08 },
    { suf: 'rp11', tag: '双向拱桥坡道组', wMul: 1.05, hMul: 1.0, dMul: 1.4, topDeck: true },
    { suf: 'rp12', tag: '紧凑短距坡道款', wMul: 0.95, hMul: 0.85, dMul: 0.78 },
    { suf: 'rp13', tag: '片场特技加强坡道', wMul: 1.2, hMul: 1.18, dMul: 1.18, topDeck: true },
  ];

  ramps.forEach((rm) => {
    rampEditions.forEach((re) => {
      const w = r2(rm.w * re.wMul);
      const h = r2(rm.h * re.hMul);
      const d = r2(rm.d * re.dMul);
      const slopeAngle = Math.atan2(h, d);
      const slopeLen = Math.hypot(h, d);
      const parts: InventoryPart[] = [
        rampPart([0, 0, 0], [w, h, d], rm.mat),
        // Left & right sloped curbs + sloped handrails + vertical handrail posts
        box([-w * 0.46, h * 0.5 + 0.14, 0], [0.2, 0.24, slopeLen * 0.96], 'concrete', [slopeAngle, 0, 0]),
        box([w * 0.46, h * 0.5 + 0.14, 0], [0.2, 0.24, slopeLen * 0.96], 'concrete', [slopeAngle, 0, 0]),
        box([-w * 0.46, h * 0.5 + 0.62, 0], [0.06, 0.06, slopeLen * 0.96], 'dark', [slopeAngle, 0, 0]),
        box([w * 0.46, h * 0.5 + 0.62, 0], [0.06, 0.06, slopeLen * 0.96], 'dark', [slopeAngle, 0, 0]),
        cyl([-w * 0.46, 0.36, d * 0.42], 0.04, 0.04, 0.7, 'dark'),
        cyl([w * 0.46, 0.36, d * 0.42], 0.04, 0.04, 0.7, 'dark'),
        cyl([-w * 0.46, h * 0.5 + 0.32, 0], 0.04, 0.04, 0.7, 'dark'),
        cyl([w * 0.46, h * 0.5 + 0.32, 0], 0.04, 0.04, 0.7, 'dark'),
        cyl([-w * 0.46, h + 0.28, -d * 0.42], 0.04, 0.04, 0.7, 'dark'),
        cyl([w * 0.46, h + 0.28, -d * 0.42], 0.04, 0.04, 0.7, 'dark'),
      ];

      if (re.midCurb) {
        parts.push(box([0, h * 0.5 + 0.12, 0], [0.18, 0.18, slopeLen * 0.94], 'accent', [slopeAngle, 0, 0]));
      }
      if (re.topDeck) {
        parts.push(box([0, h * 0.5, -d * 0.42], [w, h, d * 0.26], rm.mat));
      }

      out.push({
        id: `m_ramp_${rm.key}_${re.suf}`,
        label: `${rm.name} · ${re.tag}`,
        heightM: r2(h + 0.6),
        widthM: w,
        depthM: d,
        parts,
      });
    });
  });

  return out;
}

// ============================================================================
// 17. PILLAR (精细化盘龙华表、斗拱金丝楠木柱、科林斯罗马柱与盖梁桥墩 · 140 款)
// ============================================================================
function buildMegaPillarVariants(): AssetVariantSpec[] {
  const out: AssetVariantSpec[] = [];

  const pillars = [
    { key: 'palace_red_col', name: '古建大殿鼓形础石斗拱朱红楠木柱', w: 0.95, h: 4.6, round: true, mat: 'trunk' as ClayVariant },
    { key: 'huabiao_dragon', name: '皇家汉白玉云板望天吼盘龙华表柱', w: 1.35, h: 6.4, round: true, mat: 'default' as ClayVariant },
    { key: 'roman_doric', name: '欧式古典多立克20凹槽石柱', w: 1.0, h: 4.8, round: true, mat: 'default' as ClayVariant },
    { key: 'roman_corinth', name: '科林斯茛苕叶雕花柱头大理石柱', w: 1.1, h: 5.2, round: true, mat: 'accent' as ClayVariant },
    { key: 'viaduct_pier', name: '高架桥双支座T型盖梁混凝土桥墩', w: 3.2, h: 5.6, round: false, mat: 'concrete' as ClayVariant },
    { key: 'steel_hbeam', name: '工业厂房带牛腿H型钢结构立柱', w: 0.9, h: 5.0, round: false, mat: 'dark' as ClayVariant },
    { key: 'truss_column', name: '展览馆四肢缀条空间格构桁架柱', w: 1.15, h: 5.4, round: false, mat: 'dark' as ClayVariant },
    { key: 'stone_obelisk', name: '广场锥顶浮雕基座方尖碑石柱', w: 1.5, h: 7.5, round: false, mat: 'rock' as ClayVariant },
    { key: 'corridor_post', name: '江南游廊倒挂楣子雀替木立柱', w: 0.85, h: 3.5, round: true, mat: 'wood' as ClayVariant },
    { key: 'ruin_col', name: '古神庙遗址斜裂散落鼓石残柱', w: 1.2, h: 3.4, round: true, mat: 'concrete' as ClayVariant },
  ];

  const heights = [
    { suf: 'pl1', tag: '短柱款', hMul: 0.72, wMul: 0.92 },
    { suf: 'pl2', tag: '标准层高款', hMul: 0.88, wMul: 1.0 },
    { suf: 'pl3', tag: '通高大堂款', hMul: 1.0, wMul: 1.0 },
    { suf: 'pl4', tag: '加高殿堂款', hMul: 1.2, wMul: 1.06 },
    { suf: 'pl5', tag: '特高巨柱款', hMul: 1.4, wMul: 1.15 },
    { suf: 'pl6', tag: '粗壮重型承重款', hMul: 1.0, wMul: 1.3 },
    { suf: 'pl7', tag: '纤细修长款', hMul: 1.12, wMul: 0.82 },
    { suf: 'pl8', tag: '带三层须弥座础石款', hMul: 1.05, wMul: 1.08 },
    { suf: 'pl9', tag: '带十字斗拱挑头款', hMul: 1.08, wMul: 1.12, bracket: true },
    { suf: 'pl10', tag: '双联并立姐妹柱', hMul: 1.0, wMul: 1.65, twin: true },
    { suf: 'pl11', tag: '带双侧宫灯壁灯款', hMul: 1.02, wMul: 1.0, lamp: true },
    { suf: 'pl12', tag: '高台方座礼仪柱', hMul: 1.16, wMul: 1.12 },
    { suf: 'pl13', tag: '带雕花雀替额枋段', hMul: 1.05, wMul: 1.4, bracket: true },
    { suf: 'pl14', tag: '片场主景精雕大柱', hMul: 1.24, wMul: 1.18, bracket: true, lamp: true },
  ];

  pillars.forEach((pl) => {
    heights.forEach((hc) => {
      const w = r2(pl.w * hc.wMul);
      const h = r2(pl.h * hc.hMul);
      const parts: InventoryPart[] = [
        // Stepped square plinth + lotus/torus drum stone base (柱础)
        box([0, 0.16, 0], [w * 1.16, 0.32, pl.w * 1.16], 'rock'),
        cyl([0, 0.42, 0], pl.w * 0.48, pl.w * 0.56, 0.24, 'default'),
        torus([0, 0.54, 0], pl.w * 0.42, 0.06, 16, 'accent', [Math.PI / 2, 0, 0]),
      ];

      if (pl.round) {
        parts.push(
          cyl([0, h * 0.5, 0], pl.w * 0.34, pl.w * 0.4, h * 0.78, pl.mat),
          // Capital necking ring + echinus flare + abacus slab
          torus([0, h * 0.86, 0], pl.w * 0.36, 0.05, 16, 'accent', [Math.PI / 2, 0, 0]),
          cyl([0, h * 0.91, 0], pl.w * 0.52, pl.w * 0.36, 0.24, 'accent'),
          box([0, h - 0.12, 0], [w * 1.12, 0.22, pl.w * 1.12], 'default')
        );
        if (pl.key === 'huabiao_dragon') {
          // Transverse cloud board (云板) + top crouching beast (望天吼)
          parts.push(
            box([0, h * 0.82, 0], [w * 1.45, 0.22, 0.18], 'default'),
            cyl([0, h - 0.02, 0], pl.w * 0.54, pl.w * 0.54, 0.12, 'default'),
            sph([0, h + 0.18, 0], 0.22, 0.28, 0.22, 'accent')
          );
        }
      } else if (pl.key === 'viaduct_pier') {
        // Hammerhead T-pier with flared cap beam & 4 elastomeric bearing pads
        parts.push(
          box([0, h * 0.44, 0], [pl.w * 0.48, h * 0.76, pl.w * 0.42], 'concrete'),
          box([0, h * 0.86, 0], [w, h * 0.18, pl.w * 0.52], 'concrete'),
          box([-w * 0.34, h - 0.02, 0], [0.42, 0.12, 0.42], 'dark'),
          box([w * 0.34, h - 0.02, 0], [0.42, 0.12, 0.42], 'dark')
        );
      } else if (pl.key === 'stone_obelisk') {
        parts.push(
          box([0, 0.55, 0], [w * 0.88, 0.75, w * 0.88], 'rock'),
          cyl([0, h * 0.52, 0], w * 0.24, w * 0.38, h * 0.78, 'rock'),
          cone([0, h * 0.94, 0], w * 0.34, h * 0.14, 4, 'accent', [0, Math.PI / 4, 0])
        );
      } else {
        // Steel H-beam / Truss column with flanges, web plates & top bracket
        parts.push(
          box([0, h * 0.5, 0], [pl.w * 0.72, h * 0.84, pl.w * 0.24], pl.mat),
          box([0, h * 0.5, -pl.w * 0.34], [pl.w * 0.78, h * 0.84, 0.12], 'dark'),
          box([0, h * 0.5, pl.w * 0.34], [pl.w * 0.78, h * 0.84, 0.12], 'dark'),
          box([0, h - 0.14, 0], [w * 1.18, 0.28, pl.w * 1.12], 'accent')
        );
      }

      if (hc.bracket || pl.key === 'palace_red_col' || pl.key === 'corridor_post') {
        // Multi-tiered crossed 斗拱 brackets & carved 雀替 corbels
        parts.push(
          box([0, h - 0.34, 0], [w * 1.48, 0.18, 0.28], 'wood'),
          box([0, h - 0.34, 0], [0.28, 0.18, pl.w * 1.48], 'wood'),
          box([0, h - 0.18, 0], [w * 1.72, 0.2, 0.32], 'trunk')
        );
      }
      if (hc.lamp) {
        parts.push(
          sph([-w * 0.48, h * 0.72, 0], 0.14, 0.18, 0.14, 'emissiveLamp'),
          sph([w * 0.48, h * 0.72, 0], 0.14, 0.18, 0.14, 'emissiveLamp')
        );
      }

      out.push({
        id: `m_pil_${pl.key}_${hc.suf}`,
        label: `${pl.name} · ${hc.tag}`,
        heightM: h,
        widthM: w,
        depthM: r2(pl.w * 1.28),
        parts,
      });
    });
  });

  return out;
}

// ============================================================================
// 18. FLOOR (精细化汉白玉月台、拼花广场、亲水木平台、锦鲤池与拳击擂台 · 140 款)
// ============================================================================
function buildMegaFloorVariants(): AssetVariantSpec[] {
  const out: AssetVariantSpec[] = [];

  const floors = [
    { key: 'granite_plaza', name: '城市广场拼花花岗岩带树池地坪', w: 8, d: 8, h: 0.35, mat: 'concrete' as ClayVariant },
    { key: 'palace_terrace', name: '古建大殿汉白玉望柱栏杆须弥座月台', w: 10, d: 8, h: 1.35, mat: 'default' as ClayVariant },
    { key: 'wood_deck', name: '滨水公园带木桩护栏防腐木观景台', w: 6.5, d: 6.5, h: 0.95, mat: 'wood' as ClayVariant },
    { key: 'courtyard_brick', name: '四合院十字甬道青砖庭院地坪', w: 8, d: 8, h: 0.28, mat: 'rock' as ClayVariant },
    { key: 'stage_podium', name: '演播厅双层发光圆盘主舞台地台', w: 8, d: 6.5, h: 0.95, mat: 'dark' as ClayVariant },
    { key: 'helipad_slab', name: '楼顶带助航边灯H标线停机坪平台', w: 10, d: 10, h: 0.42, mat: 'road' as ClayVariant },
    { key: 'garden_pond', name: '中式园林叠石驳岸曲桥锦鲤方池', w: 7.5, d: 5.5, h: 0.85, mat: 'water' as ClayVariant },
    { key: 'swim_pool', name: '现代别墅带跳台扶梯无边泳池', w: 10, d: 6, h: 0.75, mat: 'water' as ClayVariant },
    { key: 'boxing_ring', name: '体育馆四角立柱三道围绳拳击擂台', w: 6.5, d: 6.5, h: 1.65, mat: 'accent' as ClayVariant },
    { key: 'marble_lobby', name: '酒店大堂波打线拼花大理石地面', w: 8, d: 8, h: 0.26, mat: 'default' as ClayVariant },
  ];

  const sizes = [
    { suf: 'fl1', tag: '紧凑块', wMul: 0.65, dMul: 0.65 },
    { suf: 'fl2', tag: '中小型块', wMul: 0.82, dMul: 0.82 },
    { suf: 'fl3', tag: '标准方块', wMul: 1.0, dMul: 1.0 },
    { suf: 'fl4', tag: '宽幅长方块', wMul: 1.3, dMul: 0.95 },
    { suf: 'fl5', tag: '12m大型广场块', wMul: 1.45, dMul: 1.45 },
    { suf: 'fl6', tag: '带石材收边压条款', wMul: 1.05, dMul: 1.05 },
    { suf: 'fl7', tag: '双层抬高阶梯地台款', wMul: 1.15, dMul: 1.15, twoTier: true },
    { suf: 'fl8', tag: '带四周望柱护栏围合款', wMul: 1.08, dMul: 1.08, rail: true },
    { suf: 'fl9', tag: '长条步道游廊款', wMul: 1.6, dMul: 0.6, rail: true },
    { suf: 'fl10', tag: '圆形礼仪中心广场款', wMul: 1.1, dMul: 1.1, round: true },
    { suf: 'fl11', tag: '带四角庭院柱灯地台款', wMul: 1.12, dMul: 1.12, rail: true, lamp: true },
    { suf: 'fl12', tag: '下沉式围合庭院地坪款', wMul: 1.2, dMul: 1.2 },
    { suf: 'fl13', tag: '加高观礼台带踏步款', wMul: 1.25, dMul: 1.1, twoTier: true, rail: true },
    { suf: 'fl14', tag: '片场主景大地面精模款', wMul: 1.5, dMul: 1.35, twoTier: true, rail: true, lamp: true },
  ];

  floors.forEach((fl) => {
    sizes.forEach((sz) => {
      const w = r2(fl.w * sz.wMul);
      const d = r2(fl.d * sz.dMul);
      const h = fl.h;
      const parts: InventoryPart[] = [];

      if (fl.key === 'garden_pond' || fl.key === 'swim_pool') {
        // Stone/tile coping rim + recessed water surface + corner rockery / diving board + zigzag bridge
        parts.push(
          box([0, 0.16, 0], [w, 0.32, d], 'water'),
          box([0, 0.24, -d * 0.46], [w, 0.48, d * 0.09], 'rock'),
          box([0, 0.24, d * 0.46], [w, 0.48, d * 0.09], 'rock'),
          box([-w * 0.46, 0.24, 0], [w * 0.09, 0.48, d], 'rock'),
          box([w * 0.46, 0.24, 0], [w * 0.09, 0.48, d], 'rock'),
          box([0, 0.38, 0], [w * 0.22, 0.1, d * 0.88], 'wood'),
          dodec([-w * 0.32, 0.48, -d * 0.28], 0.55, 0.48, 0.52, 'rock')
        );
      } else if (fl.key === 'boxing_ring') {
        // Raised platform + 4 corner padded turnbuckle posts + 3 perimeter ring ropes + access steps
        parts.push(
          box([0, 0.42, 0], [w * 0.92, 0.84, d * 0.92], 'dark'),
          box([0, 0.86, 0], [w * 0.96, 0.08, d * 0.96], 'default'),
          cyl([-w * 0.42, 1.25, -d * 0.42], 0.08, 0.08, 1.3, 'accent'),
          cyl([w * 0.42, 1.25, -d * 0.42], 0.08, 0.08, 1.3, 'car'),
          cyl([-w * 0.42, 1.25, d * 0.42], 0.08, 0.08, 1.3, 'default'),
          cyl([w * 0.42, 1.25, d * 0.42], 0.08, 0.08, 1.3, 'accent'),
          box([0, 1.15, -d * 0.42], [w * 0.84, 0.04, 0.04], 'default'),
          box([0, 1.45, -d * 0.42], [w * 0.84, 0.04, 0.04], 'default'),
          box([0, 1.15, d * 0.42], [w * 0.84, 0.04, 0.04], 'default'),
          box([0, 1.45, d * 0.42], [w * 0.84, 0.04, 0.04], 'default')
        );
      } else if (fl.key === 'helipad_slab') {
        // Concrete deck + yellow safety circle torus + H letter bars + 4 corner green/yellow perimeter lights
        parts.push(
          box([0, 0.14, 0], [w, 0.28, d], 'road'),
          torus([0, 0.3, 0], Math.min(w, d) * 0.38, 0.08, 24, 'accent', [Math.PI / 2, 0, 0]),
          box([-w * 0.12, 0.3, 0], [0.32, 0.04, d * 0.36], 'default'),
          box([w * 0.12, 0.3, 0], [0.32, 0.04, d * 0.36], 'default'),
          box([0, 0.3, 0], [w * 0.26, 0.04, 0.32], 'default'),
          sph([-w * 0.44, 0.34, -d * 0.44], 0.12, 0.12, 0.12, 'emissiveLamp'),
          sph([w * 0.44, 0.34, -d * 0.44], 0.12, 0.12, 0.12, 'emissiveLamp'),
          sph([-w * 0.44, 0.34, d * 0.44], 0.12, 0.12, 0.12, 'emissiveLamp'),
          sph([w * 0.44, 0.34, d * 0.44], 0.12, 0.12, 0.12, 'emissiveLamp')
        );
      } else {
        // Multi-layered plaza / palace terrace / stage podium with stone border, center medallion, front steps & optional perimeter balustrade
        const baseH = sz.twoTier || fl.key === 'palace_terrace' ? 0.56 : 0.22;
        parts.push(
          box([0, baseH * 0.5, 0], [w, baseH, d], fl.mat),
          box([0, baseH + 0.03, 0], [w * 0.88, 0.06, d * 0.88], 'accent'),
          cyl([0, baseH + 0.06, 0], Math.min(w, d) * 0.24, Math.min(w, d) * 0.26, 0.06, 'default'),
          // Front approach steps
          box([0, baseH * 0.35, d * 0.55], [w * 0.32, baseH * 0.7, 0.65], 'concrete')
        );
        if (sz.rail || fl.key === 'palace_terrace' || fl.key === 'wood_deck') {
          parts.push(
            box([0, baseH + 0.38, -d * 0.46], [w * 0.94, 0.48, 0.14], 'default'),
            box([-w * 0.46, baseH + 0.38, 0], [0.14, 0.48, d * 0.92], 'default'),
            box([w * 0.46, baseH + 0.38, 0], [0.14, 0.48, d * 0.92], 'default'),
            cyl([-w * 0.46, baseH + 0.48, d * 0.46], 0.12, 0.12, 0.88, 'accent'),
            cyl([w * 0.46, baseH + 0.48, d * 0.46], 0.12, 0.12, 0.88, 'accent'),
            cyl([-w * 0.46, baseH + 0.48, -d * 0.46], 0.12, 0.12, 0.88, 'accent'),
            cyl([w * 0.46, baseH + 0.48, -d * 0.46], 0.12, 0.12, 0.88, 'accent')
          );
        }
        if (sz.lamp) {
          parts.push(
            sph([-w * 0.46, baseH + 0.96, d * 0.46], 0.14, 0.16, 0.14, 'emissiveLamp'),
            sph([w * 0.46, baseH + 0.96, d * 0.46], 0.14, 0.16, 0.14, 'emissiveLamp')
          );
        }
      }

      out.push({
        id: `m_flr_${fl.key}_${sz.suf}`,
        label: `${fl.name} · ${sz.tag}`,
        heightM: h,
        widthM: w,
        depthM: d,
        parts,
      });
    });
  });

  return out;
}

// ============================================================================
// 19. ROOF (精细化重檐庑殿顶、飞檐歇山顶、祈年殿三重圆攒尖顶、玻璃采光穹顶与锯齿屋盖 · 140 款)
// ============================================================================
function buildMegaRoofVariants(): AssetVariantSpec[] {
  const out: AssetVariantSpec[] = [];

  const roofs = [
    { key: 'wudian_roof', name: '古建重檐庑殿顶带正脊吻兽大屋顶', w: 9.0, h: 3.0, d: 7.0, kind: 'chinese' },
    { key: 'xieshan_roof', name: '中式九脊飞檐翘角歇山顶屋盖', w: 8.5, h: 2.8, d: 6.5, kind: 'chinese' },
    { key: 'zanjian_oct', name: '古典八角重檐攒尖鎏金宝顶屋盖', w: 6.2, h: 3.5, d: 6.2, kind: 'oct_cone' },
    { key: 'tiantan_cone', name: '祈年殿式三重蓝瓦圆攒尖大屋顶', w: 8.2, h: 4.6, d: 8.2, kind: 'triple_cone' },
    { key: 'gable_tile', name: '江南民居山墙悬山青瓦双坡屋顶', w: 7.5, h: 2.4, d: 6.0, kind: 'gable' },
    { key: 'glass_skylight', name: '商业中庭钢网架金字塔玻璃采光顶', w: 8.0, h: 2.6, d: 8.0, kind: 'skylight' },
    { key: 'saw_factory', name: '工业厂房三跨锯齿北向天窗屋盖', w: 9.0, h: 2.2, d: 7.5, kind: 'saw' },
    { key: 'vault_barrel', name: '高铁站大跨拱形声学圆穹屋盖', w: 8.5, h: 2.6, d: 7.0, kind: 'vault' },
    { key: 'flat_hvac', name: '现代写字楼女儿墙带冷却塔光伏屋顶', w: 8.0, h: 2.0, d: 7.0, kind: 'flat_hvac' },
    { key: 'gothic_spire', name: '欧式哥特八角老虎窗高耸尖塔屋顶', w: 5.2, h: 5.6, d: 5.2, kind: 'spire' },
  ];

  const roofVariants = [
    { suf: 'rf1', tag: '紧凑小跨款', wMul: 0.78, hMul: 0.85, dMul: 0.78 },
    { suf: 'rf2', tag: '标准屋盖款', wMul: 1.0, hMul: 1.0, dMul: 1.0 },
    { suf: 'rf3', tag: '大跨度宽幅款', wMul: 1.26, hMul: 1.08, dMul: 1.18 },
    { suf: 'rf4', tag: '高耸陡坡款', wMul: 1.0, hMul: 1.3, dMul: 1.0 },
    { suf: 'rf5', tag: '深挑檐广宇款', wMul: 1.18, hMul: 0.88, dMul: 1.18 },
    { suf: 'rf6', tag: '重檐双层飞檐款', wMul: 1.12, hMul: 1.22, dMul: 1.12, doubleEave: true },
    { suf: 'rf7', tag: '带正脊吻兽仙人走兽款', wMul: 1.05, hMul: 1.14, dMul: 1.05 },
    { suf: 'rf8', tag: '带采光老虎窗天窗款', wMul: 1.06, hMul: 1.08, dMul: 1.06, dormer: true },
    { suf: 'rf9', tag: '长条连廊屋顶款', wMul: 1.42, hMul: 0.92, dMul: 0.74 },
    { suf: 'rf10', tag: '方形亭阁对称款', wMul: 1.0, hMul: 1.1, dMul: 1.0 },
    { suf: 'rf11', tag: '带斗拱平座基座款', wMul: 1.08, hMul: 1.14, dMul: 1.08, doubleEave: true },
    { suf: 'rf12', tag: '带光伏阵列设备款', wMul: 1.1, hMul: 1.04, dMul: 1.1 },
    { suf: 'rf13', tag: '十字抱厦交叉脊屋顶款', wMul: 1.2, hMul: 1.18, dMul: 1.2, dormer: true },
    { suf: 'rf14', tag: '片场主殿精雕大屋顶', wMul: 1.32, hMul: 1.25, dMul: 1.22, doubleEave: true, dormer: true },
  ];

  roofs.forEach((rf) => {
    roofVariants.forEach((rv) => {
      const w = r2(rf.w * rv.wMul);
      const h = r2(rf.h * rv.hMul);
      const d = r2(rf.d * rv.dMul);
      const parts: InventoryPart[] = [];

      if (rf.kind === 'triple_cone' || rf.kind === 'oct_cone') {
        const segs = rf.kind === 'oct_cone' ? 8 : 16;
        parts.push(
          cyl([0, 0.2, 0], w * 0.46, w * 0.48, 0.4, 'wood'),
          cone([0, h * 0.34, 0], w * 0.56, h * 0.38, segs, 'dark'),
          cyl([0, h * 0.52, 0], w * 0.36, w * 0.38, h * 0.22, 'accent'),
          cone([0, h * 0.68, 0], w * 0.44, h * 0.36, segs, 'dark'),
          cone([0, h * 0.88, 0], w * 0.3, h * 0.28, segs, 'dark'),
          sph([0, h + 0.08, 0], 0.22, 0.3, 0.22, 'emissiveLamp')
        );
      } else if (rf.kind === 'vault') {
        parts.push(
          box([0, 0.16, 0], [w, 0.32, d], 'concrete'),
          cyl([0, h * 0.42, 0], w * 0.46, w * 0.46, d * 0.96, 'car', [Math.PI / 2, 0, 0]),
          torus([0, h * 0.42, d * 0.46], w * 0.47, 0.12, 20, 'dark'),
          torus([0, h * 0.42, -d * 0.46], w * 0.47, 0.12, 20, 'dark')
        );
      } else if (rf.kind === 'saw') {
        parts.push(
          box([0, 0.16, 0], [w, 0.32, d], 'concrete'),
          rampPart([0, 0.32, -d * 0.3], [w * 0.96, h * 0.78, d * 0.3], 'dark'),
          rampPart([0, 0.32, 0], [w * 0.96, h * 0.78, d * 0.3], 'dark'),
          rampPart([0, 0.32, d * 0.3], [w * 0.96, h * 0.78, d * 0.3], 'dark')
        );
      } else if (rf.kind === 'flat_hvac') {
        parts.push(
          box([0, 0.22, 0], [w, 0.44, d], 'concrete'),
          box([0, 0.56, 0], [w * 0.9, 0.24, d * 0.9], 'default'),
          // Elevator machine room + 2 cylindrical cooling towers + solar panel array
          box([-w * 0.22, h * 0.58, -d * 0.18], [w * 0.34, h * 0.68, d * 0.38], 'accent'),
          cyl([w * 0.22, h * 0.52, -d * 0.2], 0.58, 0.62, h * 0.56, 'car'),
          cyl([w * 0.22, h * 0.52, d * 0.2], 0.58, 0.62, h * 0.56, 'car'),
          box([-w * 0.2, h * 0.45, d * 0.22], [w * 0.38, 0.1, d * 0.34], 'dark', [0.36, 0, 0])
        );
      } else if (rf.kind === 'skylight') {
        parts.push(
          box([0, 0.2, 0], [w, 0.4, d], 'dark'),
          cone([0, h * 0.56, 0], Math.max(w, d) * 0.54, h * 0.82, 4, 'water', [0, Math.PI / 4, 0]),
          box([0, h * 0.52, 0], [w * 0.92, 0.14, 0.14], 'dark'),
          box([0, h * 0.52, 0], [0.14, 0.14, d * 0.92], 'dark')
        );
      } else {
        // Full multi-part Chinese flying-eave roof (or double-eave)
        if (rv.doubleEave) {
          parts.push(
            box([0, 0.2, 0], [w * 1.12, 0.26, d * 1.12], 'dark'),
            box([0, 0.52, 0], [w * 0.86, 0.45, d * 0.86], 'trunk')
          );
          addChineseRoof(parts, 0.68, w * 0.88, d * 0.88, h - 0.68, 'dark', 'accent');
        } else {
          addChineseRoof(parts, 0, w, d, h, 'dark', 'accent');
        }
        if (rv.dormer) {
          parts.push(
            box([0, h * 0.52, d * 0.32], [w * 0.28, h * 0.38, d * 0.28], 'default'),
            cone([0, h * 0.78, d * 0.34], w * 0.2, h * 0.24, 4, 'dark', [0, Math.PI / 4, 0])
          );
        }
      }

      out.push({
        id: `m_roof_${rf.key}_${rv.suf}`,
        label: `${rf.name} · ${rv.tag}`,
        heightM: h,
        widthM: w,
        depthM: d,
        parts,
      });
    });
  });

  return out;
}

// ============================================================================
// 20. BOX (精细化建筑群落体块、穹顶罗亭、柱廊中庭、双子连廊与退台沙盘模型 · 140 款)
// ============================================================================
function buildMegaBoxVariants(): AssetVariantSpec[] {
  const out: AssetVariantSpec[] = [];

  const blocks = [
    { key: 'std_mass', name: '带基座腰线女儿墙建筑分镜体块', w: 3.2, h: 3.2, d: 3.2, kind: 'cornice' },
    { key: 'l_corner', name: 'L型街角双翼带内院转折体块', w: 4.5, h: 3.6, d: 4.5, kind: 'l_wing' },
    { key: 'u_court', name: 'U型三面合院带照壁门楼体块', w: 5.2, h: 3.4, d: 4.5, kind: 'u_court' },
    { key: 'ziggurat', name: '四阶退台金字塔观景台体块', w: 4.8, h: 4.2, d: 4.8, kind: 'ziggurat' },
    { key: 'cantilever', name: '悬挑二层架空底层柱廊体块', w: 4.6, h: 3.8, d: 3.2, kind: 'cantilever' },
    { key: 'skybridge', name: '双子塔带高空玻璃连廊体块', w: 5.8, h: 4.8, d: 3.2, kind: 'skybridge' },
    { key: 'arch_portal', name: '穿堂双拱门洞骑楼街区体块', w: 4.6, h: 3.8, d: 2.8, kind: 'portal' },
    { key: 'rotunda_cyl', name: '古典柱廊圆形穹顶万神殿体块', w: 4.2, h: 4.4, d: 4.2, kind: 'rotunda' },
    { key: 'podium_tower', name: '裙房退台加超高主塔复合体块', w: 5.0, h: 6.4, d: 4.5, kind: 'podium_tower' },
    { key: 'colonnade', name: '八柱双排古典柱廊敞厅体块', w: 5.4, h: 3.8, d: 3.0, kind: 'colonnade' },
  ];

  const proportions = [
    { suf: 'bx1', tag: '紧凑正方型', s: [0.78, 0.78, 0.78] },
    { suf: 'bx2', tag: '标准基准型', s: [1.0, 1.0, 1.0] },
    { suf: 'bx3', tag: '横向宽展1.5倍型', s: [1.42, 0.95, 1.0] },
    { suf: 'bx4', tag: '纵向深远1.5倍型', s: [1.0, 0.95, 1.42] },
    { suf: 'bx5', tag: '竖向高耸1.6倍型', s: [0.92, 1.55, 0.92] },
    { suf: 'bx6', tag: '低矮展馆基座型', s: [1.35, 0.62, 1.35] },
    { suf: 'bx7', tag: '大型体量2倍型', s: [1.6, 1.4, 1.45] },
    { suf: 'bx8', tag: '带顶冠尖塔型', s: [1.1, 1.22, 1.1], spire: true },
    { suf: 'bx9', tag: '带三阶台明基座型', s: [1.15, 1.12, 1.15] },
    { suf: 'bx10', tag: '带侧翼附楼连廊型', s: [1.32, 1.05, 1.12], wing: true },
    { suf: 'bx11', tag: '微缩沙盘小体块', s: [0.6, 0.6, 0.6] },
    { suf: 'bx12', tag: '狭长屏风街墙体块', s: [1.55, 1.15, 0.62] },
    { suf: 'bx13', tag: '高台塔楼复合型', s: [1.25, 1.45, 1.2], spire: true },
    { suf: 'bx14', tag: '片场远景城市综合体块', s: [1.75, 1.6, 1.55], wing: true, spire: true },
  ];

  blocks.forEach((bl) => {
    proportions.forEach((pr) => {
      const w = r2(bl.w * pr.s[0]);
      const h = r2(bl.h * pr.s[1]);
      const d = r2(bl.d * pr.s[2]);
      const parts: InventoryPart[] = [
        // Stepped plinth base & front steps on every blockout mass
        box([0, 0.14, 0], [w * 1.08, 0.28, d * 1.08], 'rock'),
        box([0, 0.12, d * 0.56], [w * 0.28, 0.24, 0.45], 'concrete'),
      ];

      if (bl.kind === 'rotunda') {
        // Drum cylinder + 8 perimeter columns + stepped dome + oculus lantern
        parts.push(
          cyl([0, h * 0.42, 0], w * 0.38, w * 0.4, h * 0.62, 'default'),
          cyl([0, h * 0.74, 0], w * 0.44, w * 0.44, 0.16, 'accent'),
          sph([0, h * 0.74, 0], w * 0.38, h * 0.24, d * 0.38, 'concrete'),
          cyl([0, h * 0.96, 0], 0.22, 0.26, 0.28, 'emissiveLamp')
        );
        for (let a = 0; a < 8; a++) {
          const ang = (a * Math.PI) / 4;
          parts.push(
            cyl([r2(Math.cos(ang) * w * 0.44), r2(h * 0.42), r2(Math.sin(ang) * d * 0.44)], 0.11, 0.12, h * 0.6, 'accent')
          );
        }
      } else if (bl.kind === 'skybridge') {
        parts.push(
          box([0, h * 0.16, 0], [w, h * 0.22, d], 'concrete'),
          box([-w * 0.32, h * 0.52, 0], [w * 0.3, h * 0.88, d * 0.88], 'default'),
          box([w * 0.32, h * 0.52, 0], [w * 0.3, h * 0.88, d * 0.88], 'default'),
          box([0, h * 0.72, 0], [w * 0.42, h * 0.2, d * 0.58], 'water'),
          box([-w * 0.32, h * 0.98, 0], [w * 0.24, 0.18, d * 0.72], 'accent'),
          box([w * 0.32, h * 0.98, 0], [w * 0.24, 0.18, d * 0.72], 'accent')
        );
      } else if (bl.kind === 'ziggurat') {
        for (let t = 0; t < 4; t++) {
          const s = 1 - t * 0.2;
          const th = (h - 0.28) / 4;
          parts.push(
            box([0, r2(0.28 + (t + 0.5) * th), 0], [r2(w * s), r2(th * 0.96), r2(d * s)], t % 2 === 0 ? 'default' : 'accent')
          );
        }
      } else if (bl.kind === 'colonnade' || bl.kind === 'cantilever') {
        parts.push(
          box([0, h * 0.72, 0], [w, h * 0.42, d], 'default'),
          box([0, h * 0.95, 0], [w * 1.04, 0.16, d * 1.04], 'accent'),
          box([-w * 0.36, h * 0.3, -d * 0.22], [w * 0.24, h * 0.48, d * 0.48], 'concrete')
        );
        for (let c = -2; c <= 2; c++) {
          parts.push(
            cyl([r2((c / 2) * w * 0.42), h * 0.3, d * 0.38], 0.12, 0.14, h * 0.48, 'accent')
          );
        }
      } else {
        // Multi-volume architectural blockout with podium, main mass, recessed window bands, side wing & rooftop crown
        parts.push(
          box([0, h * 0.24, 0], [w, h * 0.36, d], 'concrete'),
          box([-w * 0.12, h * 0.58, -d * 0.08], [w * 0.72, h * 0.68, d * 0.76], 'default'),
          box([w * 0.26, h * 0.46, d * 0.16], [w * 0.42, h * 0.48, d * 0.58], 'accent'),
          box([-w * 0.12, h * 0.62, d * 0.31], [w * 0.58, h * 0.22, 0.06], 'water'),
          box([-w * 0.12, h * 0.94, -d * 0.08], [w * 0.56, 0.22, d * 0.58], 'accent')
        );
      }

      if (pr.spire) {
        parts.push(
          cone([-w * 0.12, h + 0.35, -d * 0.08], w * 0.18, 0.7, 8, 'dark'),
          cyl([-w * 0.12, h + 0.85, -d * 0.08], 0.04, 0.06, 0.55, 'dark')
        );
      }

      out.push({
        id: `m_box_${bl.key}_${pr.suf}`,
        label: `${bl.name} · ${pr.tag}`,
        heightM: h,
        widthM: w,
        depthM: d,
        parts,
      });
    });
  });

  return out;
}

export const MEGA_INVENTORY_BY_TYPE: Record<PropType, AssetVariantSpec[]> = {
  road: buildMegaRoadVariants(),
  vehicle: buildMegaVehicleVariants(),
  lamp: buildMegaLampVariants(),
  barrier: buildMegaBarrierVariants(),
  tree: buildMegaTreeVariants(),
  rock: buildMegaRockVariants(),
  creature: [],
  furniture: buildMegaFurnitureVariants(),
  table: buildMegaTableVariants(),
  crate: buildMegaCrateVariants(),
  scene_prop: buildMegaScenePropVariants(),
  building: buildMegaBuildingVariants(),
  facility: buildMegaFacilityVariants(),
  wall: buildMegaWallVariants(),
  doorway: buildMegaDoorwayVariants(),
  stairs: buildMegaStairsVariants(),
  ramp: buildMegaRampVariants(),
  pillar: buildMegaPillarVariants(),
  floor: buildMegaFloorVariants(),
  roof: buildMegaRoofVariants(),
  box: buildMegaBoxVariants(),
};
