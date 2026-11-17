import * as THREE from 'three';
import type { AppLanguage, WorldEnvironment } from '../types/scene';

export interface TimePeriodInfo {
  tag: string;
  dotColor: string;
  isNight: boolean;
}

export interface ComputedTimeLighting {
  environment: WorldEnvironment;
  skyBgColor: string;
  sunColor: string;
  sunIntensity: number;
  ambientIntensity: number;
  hemiIntensity: number;
  hemiSkyColor: string;
  hemiGroundColor: string;
}

const KEYFRAMES: {
  min: number;
  bg: string;
  skyBg: string;
  sunColor: string;
  sunInt: number;
  ambInt: number;
  hemiInt: number;
  hemiSky: string;
  hemiGround: string;
}[] = [
  { min: 0, bg: '#161f2e', skyBg: '#121b2b', sunColor: '#9db8e8', sunInt: 0.42, ambInt: 0.24, hemiInt: 0.34, hemiSky: '#4f658a', hemiGround: '#1f2636' },
  { min: 300, bg: '#1e283b', skyBg: '#1d2b44', sunColor: '#a8bee6', sunInt: 0.46, ambInt: 0.26, hemiInt: 0.38, hemiSky: '#63789e', hemiGround: '#293040' },
  { min: 360, bg: '#cfc0c7', skyBg: '#dfb8bd', sunColor: '#ffbf96', sunInt: 0.95, ambInt: 0.36, hemiInt: 0.68, hemiSky: '#f2dad5', hemiGround: '#bfb6b2' },
  { min: 430, bg: '#e5ddd5', skyBg: '#c9dfef', sunColor: '#ffdfb8', sunInt: 1.45, ambInt: 0.42, hemiInt: 0.85, hemiSky: '#faf5ef', hemiGround: '#75826d' },
  { min: 555, bg: '#eae8e3', skyBg: '#c4def2', sunColor: '#fff8ec', sunInt: 1.75, ambInt: 0.45, hemiInt: 0.92, hemiSky: '#e8f4fc', hemiGround: '#6e7e64' },
  { min: 750, bg: '#f0efeb', skyBg: '#cbe3f7', sunColor: '#ffffff', sunInt: 1.95, ambInt: 0.48, hemiInt: 0.96, hemiSky: '#f2f8ff', hemiGround: '#78876d' },
  { min: 960, bg: '#ebe8e0', skyBg: '#cbe0f0', sunColor: '#fff2dc', sunInt: 1.7, ambInt: 0.44, hemiInt: 0.88, hemiSky: '#f7fbff', hemiGround: '#727c68' },
  { min: 1060, bg: '#d9c5b4', skyBg: '#e4c2a3', sunColor: '#ffbe85', sunInt: 1.35, ambInt: 0.38, hemiInt: 0.72, hemiSky: '#f5dec9', hemiGround: '#82735f' },
  { min: 1125, bg: '#b39ca6', skyBg: '#c299a3', sunColor: '#ff9d6e', sunInt: 0.85, ambInt: 0.32, hemiInt: 0.56, hemiSky: '#d4aeb7', hemiGround: '#6b6362' },
  { min: 1185, bg: '#2c3952', skyBg: '#243554', sunColor: '#9ab4e2', sunInt: 0.48, ambInt: 0.26, hemiInt: 0.4, hemiSky: '#5c729c', hemiGround: '#242e3b' },
  { min: 1350, bg: '#182233', skyBg: '#141e30', sunColor: '#9bb5e6', sunInt: 0.44, ambInt: 0.24, hemiInt: 0.35, hemiSky: '#4e648a', hemiGround: '#1b2430' },
  { min: 1440, bg: '#161f2e', skyBg: '#121b2b', sunColor: '#9db8e8', sunInt: 0.42, ambInt: 0.24, hemiInt: 0.34, hemiSky: '#4f658a', hemiGround: '#1f2636' },
];

const tmpC1 = new THREE.Color();
const tmpC2 = new THREE.Color();

export function clampTimeMinutes(minutes: number): number {
  const m = Math.round(minutes);
  return Math.max(0, Math.min(1439, m));
}

export function formatTimeHHMM(minutes: number): string {
  const m = clampTimeMinutes(minutes);
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function getTimePeriodInfo(minutes: number, lang: AppLanguage = 'zh'): TimePeriodInfo {
  const m = clampTimeMinutes(minutes);
  const en = lang === 'en';
  if (m < 310) return { tag: en ? 'Late Night' : '深夜', dotColor: '#6366f1', isNight: true };
  if (m < 420) return { tag: en ? 'Dawn' : '黎明', dotColor: '#f472b6', isNight: false };
  if (m < 630) return { tag: en ? 'Morning' : '晨光', dotColor: '#10b981', isNight: false };
  if (m < 870) return { tag: en ? 'Noon' : '正午', dotColor: '#eab308', isNight: false };
  if (m < 1010) return { tag: en ? 'Afternoon' : '午后', dotColor: '#f59e0b', isNight: false };
  if (m < 1125) return { tag: en ? 'Dusk' : '黄昏', dotColor: '#f97316', isNight: false };
  if (m < 1200) return { tag: en ? 'Twilight' : '暮色', dotColor: '#8b5cf6', isNight: true };
  return { tag: en ? 'Night' : '夜色', dotColor: '#6366f1', isNight: true };
}

/**
 * Computes continuous solar angles, sky/background tone, and studio lighting from 24h time.
 */
export function computeTimeOfDayState(
  minutesInput: number,
  currentFogDensity = 0.005
): ComputedTimeLighting {
  const m = clampTimeMinutes(minutesInput);

  // Sample interpolated visual keyframe
  let kfA = KEYFRAMES[0];
  let kfB = KEYFRAMES[KEYFRAMES.length - 1];
  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    if (m >= KEYFRAMES[i].min && m <= KEYFRAMES[i + 1].min) {
      kfA = KEYFRAMES[i];
      kfB = KEYFRAMES[i + 1];
      break;
    }
  }
  const span = Math.max(1, kfB.min - kfA.min);
  const t = (m - kfA.min) / span;
  const lerp = (a: number, b: number) => a + (b - a) * t;

  tmpC1.set(kfA.bg);
  tmpC2.set(kfB.bg);
  const bgColor = `#${tmpC1.lerp(tmpC2, t).getHexString()}`;

  tmpC1.set(kfA.skyBg);
  tmpC2.set(kfB.skyBg);
  const skyBgColor = `#${tmpC1.lerp(tmpC2, t).getHexString()}`;

  tmpC1.set(kfA.sunColor);
  tmpC2.set(kfB.sunColor);
  const sunColor = `#${tmpC1.lerp(tmpC2, t).getHexString()}`;

  tmpC1.set(kfA.hemiSky);
  tmpC2.set(kfB.hemiSky);
  const hemiSkyColor = `#${tmpC1.lerp(tmpC2, t).getHexString()}`;

  tmpC1.set(kfA.hemiGround);
  tmpC2.set(kfB.hemiGround);
  const hemiGroundColor = `#${tmpC1.lerp(tmpC2, t).getHexString()}`;

  // Continuous solar / lunar trajectory
  // Daytime arc: 06:00 (360) -> 12:30 (750) -> 18:45 (1125)
  let sunAzimuth: number;
  let sunElevation: number;
  if (m >= 340 && m <= 1140) {
    const dayProgress = (m - 340) / (1140 - 340); // 0..1
    sunAzimuth = Math.round((55 + dayProgress * 220) % 360);
    sunElevation = Math.round(7 + Math.sin(dayProgress * Math.PI) * 66);
  } else {
    // Moonlight keeps soft crisp white-box shadows during night
    const nightProgress = m > 1140 ? (m - 1140) / (1440 - 1140 + 340) : (m + 1440 - 1140) / (1440 - 1140 + 340);
    sunAzimuth = Math.round((190 + nightProgress * 120) % 360);
    sunElevation = Math.round(12 + Math.sin(nightProgress * Math.PI) * 18);
  }

  return {
    environment: {
      timeMinutes: m,
      sunAzimuth,
      sunElevation,
      fogDensity: currentFogDensity,
      bgColor,
    },
    skyBgColor,
    sunColor,
    sunIntensity: lerp(kfA.sunInt, kfB.sunInt),
    ambientIntensity: lerp(kfA.ambInt, kfB.ambInt),
    hemiIntensity: lerp(kfA.hemiInt, kfB.hemiInt),
    hemiSkyColor,
    hemiGroundColor,
  };
}

export function inferTimeMinutesFromEnv(env: WorldEnvironment): number {
  if (typeof env.timeMinutes === 'number' && Number.isFinite(env.timeMinutes)) {
    return clampTimeMinutes(env.timeMinutes);
  }
  const bg = (env.bgColor || '').toLowerCase();
  if (bg === '#182233' || bg === '#090d16' || bg === '#161f2e') return 1350; // 22:30
  if (env.sunElevation <= 22 || bg === '#d9c5b4') return 1060; // 17:40
  if (env.sunElevation >= 55) return 750; // 12:30
  return 555; // 09:15
}
