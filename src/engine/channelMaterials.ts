import * as THREE from 'three';
import type { RenderChannel } from '../types/scene';

interface ChannelMaterialPool {
  // Natural colored PBR materials (default 'color' mode)
  colorDefault: THREE.MeshStandardMaterial;
  colorTerrain: THREE.MeshStandardMaterial;
  colorWater: THREE.MeshStandardMaterial;
  colorRoad: THREE.MeshStandardMaterial;
  colorAccent: THREE.MeshStandardMaterial;
  colorDark: THREE.MeshStandardMaterial;
  colorConcrete: THREE.MeshStandardMaterial;
  colorFoliage: THREE.MeshStandardMaterial;
  colorTrunk: THREE.MeshStandardMaterial;
  colorRock: THREE.MeshStandardMaterial;
  colorWood: THREE.MeshStandardMaterial;
  colorCar: THREE.MeshStandardMaterial;
  colorEmissiveLamp: THREE.MeshStandardMaterial;
  colorMannequinBody: THREE.MeshStandardMaterial;
  colorMannequinAccent: THREE.MeshStandardMaterial;
  colorSelected: THREE.MeshStandardMaterial;

  // Classic monochrome white-box / clay materials ('clay' mode)
  clay: THREE.MeshStandardMaterial;
  clayTerrain: THREE.MeshStandardMaterial;
  clayWater: THREE.MeshStandardMaterial;
  clayRoad: THREE.MeshStandardMaterial;
  clayAccent: THREE.MeshStandardMaterial;
  clayDark: THREE.MeshStandardMaterial;
  claySelected: THREE.MeshStandardMaterial;

  // Diagnostic channels
  depth: THREE.ShaderMaterial;
  normal: THREE.MeshNormalMaterial;
  wireframeBase: THREE.MeshStandardMaterial;
  wireframeOverlay: THREE.MeshBasicMaterial;
}

let pool: ChannelMaterialPool | null = null;

function createPool(): ChannelMaterialPool {
  // --- Natural Colored PBR Materials ---
  const colorDefault = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#e2ddd2'),
    roughness: 0.82,
    metalness: 0.04,
  });

  const colorTerrain = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#ffffff'),
    vertexColors: true,
    roughness: 0.93,
    metalness: 0.02,
  });
  colorTerrain.customProgramCacheKey = () => 'terrain_water_gloss_v1';
  colorTerrain.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute float aWaterMask;
varying float vWaterMask;
varying vec3 vTerrainWorldPos;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
vWaterMask = aWaterMask;
vTerrainWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying float vWaterMask;
varying vec3 vTerrainWorldPos;`
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
float wMask = smoothstep(0.2, 0.75, vWaterMask);
roughnessFactor = mix(roughnessFactor, 0.10, wMask);`
      )
      .replace(
        '#include <metalnessmap_fragment>',
        `#include <metalnessmap_fragment>
float wMaskM = smoothstep(0.2, 0.75, vWaterMask);
metalnessFactor = mix(metalnessFactor, 0.26, wMaskM);`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
if (vWaterMask > 0.15) {
  float wm = smoothstep(0.15, 0.7, vWaterMask);
  float wave = sin(vTerrainWorldPos.x * 1.15 + vTerrainWorldPos.z * 0.85) *
               cos(vTerrainWorldPos.z * 1.05 - vTerrainWorldPos.x * 0.65);
  vec3 waterTint = vec3(0.06, 0.56, 0.86) + vec3(0.08, 0.12, 0.14) * (wave * 0.5 + 0.5);
  diffuseColor.rgb = mix(diffuseColor.rgb, mix(diffuseColor.rgb, waterTint, 0.55), wm);
}`
      );
  };

  const colorWater = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#2782a6'),
    roughness: 0.14,
    metalness: 0.18,
    transparent: true,
    opacity: 0.84,
  });

  const colorRoad = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#767d87'),
    roughness: 0.9,
    metalness: 0.04,
  });

  const colorAccent = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#c2bbb0'),
    roughness: 0.78,
    metalness: 0.06,
  });

  const colorDark = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#3b4452'),
    roughness: 0.68,
    metalness: 0.16,
  });

  const colorConcrete = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#a3a9b3'),
    roughness: 0.88,
    metalness: 0.04,
  });

  const colorFoliage = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#4f8a46'),
    roughness: 0.86,
    metalness: 0.02,
  });

  const colorTrunk = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#6b4d36'),
    roughness: 0.92,
    metalness: 0.02,
  });

  const colorRock = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#7a7770'),
    roughness: 0.94,
    metalness: 0.03,
    flatShading: true,
  });

  const colorWood = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#b58453'),
    roughness: 0.82,
    metalness: 0.03,
  });

  const colorCar = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#456c8f'),
    roughness: 0.36,
    metalness: 0.42,
  });

  const colorEmissiveLamp = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#fef3c7'),
    emissive: new THREE.Color('#fbbf24'),
    emissiveIntensity: 0.45,
    roughness: 0.4,
    metalness: 0.1,
  });

  const colorMannequinBody = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#ebe4da'),
    roughness: 0.72,
    metalness: 0.06,
  });

  const colorMannequinAccent = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#48566a'),
    roughness: 0.7,
    metalness: 0.15,
  });

  const colorSelected = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#bae6fd'),
    emissive: new THREE.Color('#0284c7'),
    emissiveIntensity: 0.28,
    roughness: 0.72,
    metalness: 0.08,
  });

  // --- Classic White-Box Clay Materials ---
  const clay = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#f1efe9'),
    roughness: 0.86,
    metalness: 0.04,
  });

  const clayTerrain = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#ebe9e2'),
    vertexColors: false,
    roughness: 0.94,
    metalness: 0.02,
  });

  const clayWater = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#dfe3e8'),
    roughness: 0.55,
    metalness: 0.04,
  });

  const clayRoad = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#959ca6'),
    roughness: 0.9,
    metalness: 0.04,
  });

  const clayAccent = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#ebe8e0'),
    roughness: 0.8,
    metalness: 0.05,
  });

  const clayDark = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#a6aeb8'),
    roughness: 0.85,
    metalness: 0.07,
  });

  const claySelected = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#e0f2fe'),
    emissive: new THREE.Color('#0284c7'),
    emissiveIntensity: 0.24,
    roughness: 0.78,
    metalness: 0.05,
  });

  // --- Diagnostic Materials (Mesh & InstancedMesh) ---
  const depth = new THREE.ShaderMaterial({
    uniforms: {
      uNear: { value: 1.5 },
      uFar: { value: 45.0 },
    },
    vertexShader: /* glsl */ `
      varying float vViewZ;
      void main() {
        vec4 localPosition = vec4(position, 1.0);
        #ifdef USE_INSTANCING
          localPosition = instanceMatrix * localPosition;
        #endif
        vec4 mvPosition = modelViewMatrix * localPosition;
        vViewZ = -mvPosition.z;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uNear;
      uniform float uFar;
      varying float vViewZ;
      void main() {
        float denom = max(0.001, uFar - uNear);
        float d = clamp((vViewZ - uNear) / denom, 0.0, 1.0);
        float gray = 1.0 - d;
        gl_FragColor = vec4(vec3(gray), 1.0);
      }
    `,
  });

  const normal = new THREE.MeshNormalMaterial();

  const wireframeBase = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#d4d4d8'),
    roughness: 0.9,
    metalness: 0.02,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });

  const wireframeOverlay = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#18181b'),
    wireframe: true,
    transparent: true,
    opacity: 0.48,
  });

  return {
    colorDefault,
    colorTerrain,
    colorWater,
    colorRoad,
    colorAccent,
    colorDark,
    colorConcrete,
    colorFoliage,
    colorTrunk,
    colorRock,
    colorWood,
    colorCar,
    colorEmissiveLamp,
    colorMannequinBody,
    colorMannequinAccent,
    colorSelected,
    clay,
    clayTerrain,
    clayWater,
    clayRoad,
    clayAccent,
    clayDark,
    claySelected,
    depth,
    normal,
    wireframeBase,
    wireframeOverlay,
  };
}

export function getChannelMaterialPool(): ChannelMaterialPool {
  if (!pool) {
    pool = createPool();
  }
  return pool;
}

export function updateDepthUniforms(near: number, far: number): void {
  const p = getChannelMaterialPool();
  p.depth.uniforms.uNear.value = near;
  p.depth.uniforms.uFar.value = Math.max(near + 0.5, far);
}

export type ClayVariant =
  | 'default'
  | 'terrain'
  | 'water'
  | 'road'
  | 'accent'
  | 'dark'
  | 'concrete'
  | 'foliage'
  | 'trunk'
  | 'rock'
  | 'wood'
  | 'car'
  | 'emissiveLamp'
  | 'mannequinBody'
  | 'mannequinAccent';

export function getMaterialForChannel(
  channel: RenderChannel,
  isSelected = false,
  variant: ClayVariant = 'default'
): THREE.Material {
  const p = getChannelMaterialPool();
  switch (channel) {
    case 'depth':
      return p.depth;
    case 'normal':
      return p.normal;
    case 'wireframe':
      return p.wireframeBase;
    case 'clay':
      if (isSelected) return p.claySelected;
      if (variant === 'terrain') return p.clayTerrain;
      if (variant === 'water') return p.clayWater;
      if (variant === 'road') return p.clayRoad;
      if (variant === 'accent' || variant === 'mannequinBody') return p.clayAccent;
      if (variant === 'dark' || variant === 'trunk' || variant === 'mannequinAccent') {
        return p.clayDark;
      }
      return p.clay;
    case 'color':
    default:
      if (isSelected) return p.colorSelected;
      switch (variant) {
        case 'terrain':
          return p.colorTerrain;
        case 'water':
          return p.colorWater;
        case 'road':
          return p.colorRoad;
        case 'accent':
          return p.colorAccent;
        case 'dark':
          return p.colorDark;
        case 'concrete':
          return p.colorConcrete;
        case 'foliage':
          return p.colorFoliage;
        case 'trunk':
          return p.colorTrunk;
        case 'rock':
          return p.colorRock;
        case 'wood':
          return p.colorWood;
        case 'car':
          return p.colorCar;
        case 'emissiveLamp':
          return p.colorEmissiveLamp;
        case 'mannequinBody':
          return p.colorMannequinBody;
        case 'mannequinAccent':
          return p.colorMannequinAccent;
        case 'default':
        default:
          return p.colorDefault;
      }
  }
}

const TINTABLE_VARIANTS = new Set<ClayVariant>([
  'default',
  'accent',
  'foliage',
  'car',
  'concrete',
  'rock',
  'wood',
  'mannequinBody',
]);

const tintedMaterialCache = new Map<string, THREE.MeshStandardMaterial>();

export function getTintedMaterialForChannel(
  channel: RenderChannel,
  isSelected = false,
  variant: ClayVariant = 'default',
  tintColor?: string
): THREE.Material {
  const base = getMaterialForChannel(channel, isSelected, variant);
  if (
    !tintColor ||
    isSelected ||
    channel !== 'color' ||
    !TINTABLE_VARIANTS.has(variant) ||
    !(base instanceof THREE.MeshStandardMaterial)
  ) {
    return base;
  }
  const cacheKey = `${variant}_${tintColor}`;
  const cached = tintedMaterialCache.get(cacheKey);
  if (cached) return cached;

  const cloned = base.clone();
  cloned.color = new THREE.Color(tintColor);
  tintedMaterialCache.set(cacheKey, cloned);
  return cloned;
}

export function disposeChannelMaterials(): void {
  if (!pool) return;
  Object.values(pool).forEach((mat) => {
    if (mat && typeof (mat as THREE.Material).dispose === 'function') {
      (mat as THREE.Material).dispose();
    }
  });
  tintedMaterialCache.forEach((mat) => mat.dispose());
  tintedMaterialCache.clear();
  pool = null;
}
