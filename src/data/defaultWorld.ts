import { compileSemanticProgram } from '../ai/spatialCompiler';
import { SCULPT_GRID_DEFAULT } from '../engine/terrain';
import type { ProjectData } from '../types/scene';

export function createEmptyOpenWorldProject(name = '空地片场 1'): ProjectData {
  const shotId = `shot_empty_${Date.now().toString(36)}`;
  return {
    id: `proj_empty_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
    name,
    updatedAt: Date.now(),
    world: {
      environment: {
        timeMinutes: 555,
        sunAzimuth: 52,
        sunElevation: 42,
        fogDensity: 0.004,
        bgColor: '#eae8e3',
      },
      terrain: {
        theme: 'urban_flat',
        relief: 0,
        hasWaterChannel: false,
        sculptGridRes: SCULPT_GRID_DEFAULT,
      },
      road: {
        pattern: 'none',
        width: 12,
      },
      districts: [],
      buildings: [],
      heroCompound: null,
      scatteredProps: [],
      assets: [],
      customModels: [],
      gltfModels: [],
      characters: [],
    },
    shots: [
      {
        id: shotId,
        name: 'Shot 01',
        focalLength: 35,
        aspectRatio: '16:9',
        duration: 5,
        fps: 24,
        lookAtTargetId: null,
        keyframes: [
          {
            id: `${shotId}_kf1`,
            time: 0,
            position: [0, 3.0, 22],
            target: [0, 1.4, 0],
            focalLength: 35,
          },
          {
            id: `${shotId}_kf2`,
            time: 5,
            position: [6, 3.2, 14],
            target: [0, 1.4, 0],
            focalLength: 35,
          },
        ],
      },
    ],
    activeShotId: shotId,
  };
}

export function createDefaultOpenWorldProject(): ProjectData {
  const compiled = compileSemanticProgram(
    {
      world_plan: {
        theme: '晨光海岸都市微缩片场 (09:15)',
        terrainSummary: '960m 连续海岸都市地形，西侧含浅蓝运河水道，外围浅绿缓坡丘陵过渡',
        districts: ['商业主街', '旧工业区', '高地广场', '河岸街区'],
        blockingArc: '主角驻留主街路口掩体旁，天台观察手俯瞰街区，远端角色沿街道推进；支持室外街道穿门进入两层英雄建筑大厅',
      },
      commands: [
        { cmd: 'set_terrain', theme: 'coastal_canal', relief: 0.55, has_water_channel: true },
        { cmd: 'build_road_grid', pattern: 'none', width: 12 },
        {
          cmd: 'spawn_district_buildings',
          zone: 'commercial_main',
          style: 'modern',
          count: 10,
          min_floors: 3,
          max_floors: 6,
          enterable_hero_building: true,
        },
        {
          cmd: 'spawn_district_buildings',
          zone: 'old_industrial',
          style: 'industrial',
          count: 6,
          min_floors: 2,
          max_floors: 4,
        },
        {
          cmd: 'spawn_district_buildings',
          zone: 'overpass_plaza',
          style: 'residential',
          count: 5,
          min_floors: 2,
          max_floors: 5,
        },
        { cmd: 'scatter_props', zone: 'commercial_main', preset: 'street_urban', density: 0.85 },
        { cmd: 'scatter_props', zone: 'old_industrial', preset: 'industrial_cargo', density: 0.7 },
        { cmd: 'scatter_props', zone: 'canal_bank', preset: 'canal_trees', density: 0.9 },
        {
          cmd: 'stage_characters',
          cast: [
            { role: '潜伏特工', action: 'crouch_cover', placement_rule: 'behind_nearest_cover', distance_m: 1.3 },
            { role: '巡逻哨兵', action: 'aim', placement_rule: 'down_the_street', distance_m: 16 },
            { role: '天台侦察员', action: 'look_over_edge', placement_rule: 'on_rooftop_edge', distance_m: 1 },
          ],
        },
        { cmd: 'generate_multi_shot_coverage', shot_count: 3 },
      ],
    },
    undefined,
    'replace'
  );

  compiled.world.environment = {
    timeMinutes: 555,
    sunAzimuth: 52,
    sunElevation: 42,
    fogDensity: 0.004,
    bgColor: '#eae8e3',
  };

  return {
    id: 'proj_openworld_morning_bay',
    name: '我的海滨片场 (960m)',
    updatedAt: Date.now(),
    world: compiled.world,
    shots: compiled.shots,
    activeShotId: compiled.shots[0].id,
  };
}
