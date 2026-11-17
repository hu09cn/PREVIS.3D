import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Canvas, type ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import {
  Grid,
  Line,
  OrbitControls,
  PerspectiveCamera,
  TransformControls,
  View,
} from '@react-three/drei';
import { ArrowLeftRight, Camera } from 'lucide-react';
import * as THREE from 'three';
import {
  disposeChannelMaterials,
  updateDepthUniforms,
} from '../../engine/channelMaterials';
import { matchesKeyCombo } from '../../engine/keybindings';
import {
  buildRoadRibbonGeometry,
  computeRoadCrossFrames,
  groundPolylinePoints,
  simplifyAndSmoothStroke,
} from '../../engine/paintedPaths';
import { getGroundY, getTerrainHalf, getTerrainSize } from '../../engine/terrain';
import { exportDeterministicWebM } from '../../engine/videoExporter';
import { getAspectNumeric } from '../../data/presets';
import { collabManager } from '../../collab/collabManager';
import { useCollabStore } from '../../store/useCollabStore';
import { evaluateShotCamera, useStudioStore } from '../../store/useStudioStore';
import {
  SHOT_CAMERA_ID,
  SHOT_TARGET_ID,
  type RenderChannel,
  type Vec3,
  type WorldState,
} from '../../types/scene';
import { Collaborators3D } from './Collaborators3D';
import { PlacementGhost } from './PlacementGhost';
import { WorldContent } from './WorldContent';

export interface DualViewportHandle {
  exportVideo: (channelOverride?: RenderChannel) => Promise<void>;
  getShotCameraState: () => {
    position: Vec3;
    target: Vec3;
    focalLength: number;
  };
  getDirectorCameraState: () => {
    position: Vec3;
    target: Vec3;
  };
  matchShotToDirectorView: () => void;
  focusDirectorOnShotCamera: () => void;
}

function formatTimecode(seconds: number, fps: number): string {
  const totalFrames = Math.floor(seconds * fps);
  const f = totalFrames % fps;
  const totalSec = Math.floor(seconds);
  const s = totalSec % 60;
  const m = Math.floor(totalSec / 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(
    f
  ).padStart(2, '0')}`;
}

interface DirectorCameraCollisionProps {
  camRef: React.RefObject<THREE.PerspectiveCamera | null>;
  orbitRef: React.RefObject<React.ComponentRef<typeof OrbitControls> | null>;
  collidersGroupRef: React.RefObject<THREE.Group | null>;
  world: WorldState;
  resetSignal: string | number;
}

const CAMERA_WALL_PADDING = 0.28;
const CAMERA_GROUND_CLEARANCE = 0.45;

function hasNoCameraCollideAncestor(obj: THREE.Object3D): boolean {
  let cur: THREE.Object3D | null = obj;
  while (cur) {
    if (cur.userData?.noCameraCollide) return true;
    cur = cur.parent;
  }
  return false;
}

function collectSolidColliderObjects(root: THREE.Group | null): THREE.Object3D[] {
  const list: THREE.Object3D[] = [];
  if (!root) return list;
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    if (!obj.visible) return;
    if (hasNoCameraCollideAncestor(obj)) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    const hasSolidMat = mats.some((m) => {
      if (!m) return false;
      const mat = m as THREE.Material & { wireframe?: boolean };
      if (mat.wireframe) return false;
      if (mat.depthWrite === false) return false;
      if (mat.transparent && mat.opacity < 0.85) return false;
      return true;
    });
    if (!hasSolidMat) return;
    list.push(obj);
  });
  return list;
}

const DirectorCameraCollision: React.FC<DirectorCameraCollisionProps> = ({
  camRef,
  orbitRef,
  collidersGroupRef,
  world,
  resetSignal,
}) => {
  const cameraCollision = useStudioStore((s) => s.cameraCollision);
  const collidersRef = useRef<THREE.Object3D[]>([]);
  const prevSafePosRef = useRef(new THREE.Vector3());
  const prevTargetRef = useRef(new THREE.Vector3());
  const hasPrevRef = useRef(false);

  const raycasterRef = useRef(new THREE.Raycaster());
  const tmpDirRef = useRef(new THREE.Vector3());
  const tmpMoveRef = useRef(new THREE.Vector3());
  const tmpDesiredRef = useRef(new THREE.Vector3());
  const tmpBlockedRef = useRef(new THREE.Vector3());
  const tmpDeltaRef = useRef(new THREE.Vector3());
  const tmpTargetDeltaRef = useRef(new THREE.Vector3());
  const tmpNormalRef = useRef(new THREE.Vector3());
  const tmpNormalMatRef = useRef(new THREE.Matrix3());
  const tmpRemainRef = useRef(new THREE.Vector3());

  useEffect(() => {
    hasPrevRef.current = false;
  }, [resetSignal, cameraCollision]);

  useEffect(() => {
    if (!cameraCollision) {
      collidersRef.current = [];
      return;
    }
    const raf = requestAnimationFrame(() => {
      collidersRef.current = collectSolidColliderObjects(collidersGroupRef.current);
    });
    return () => cancelAnimationFrame(raf);
  }, [world, cameraCollision, collidersGroupRef]);

  useFrame(() => {
    const cam = camRef.current;
    const orbit = orbitRef.current;
    if (!cam || !orbit) return;

    if (!cameraCollision) {
      prevSafePosRef.current.copy(cam.position);
      prevTargetRef.current.copy(orbit.target);
      hasPrevRef.current = true;
      return;
    }

    let adjusted = false;
    const raycaster = raycasterRef.current;
    const colliders = collidersRef.current;

    // 1. Keep camera safely above analytic terrain heightfield
    const gStart = getGroundY(
      cam.position.x,
      cam.position.z,
      world.terrain,
      world.road
    );
    if (cam.position.y < gStart + CAMERA_GROUND_CLEARANCE) {
      cam.position.y = gStart + CAMERA_GROUND_CLEARANCE;
      adjusted = true;
    }

    // 2. Short-range camera-body movement sweep (prevSafePos -> desiredPos) against solid structures.
    // Never pull the camera inward along distant sightlines (which snaps onto distant trees/props),
    // and slide tangentially along wall normals so the camera never gets pinned/stuck.
    if (colliders.length > 0 && hasPrevRef.current) {
      const desiredPos = tmpDesiredRef.current.copy(cam.position);
      const moveVec = tmpMoveRef.current
        .copy(desiredPos)
        .sub(prevSafePosRef.current);
      const moveLen = moveVec.length();
      if (moveLen > 0.002 && moveLen < 40) {
        const moveDir = tmpDirRef.current.copy(moveVec).divideScalar(moveLen);
        raycaster.set(prevSafePosRef.current, moveDir);
        raycaster.near = 0;
        raycaster.far = moveLen + CAMERA_WALL_PADDING;
        const sweepHits = raycaster.intersectObjects(colliders, false);
        if (sweepHits.length > 0) {
          const hit = sweepHits[0];
          const worldNormal = tmpNormalRef.current.set(0, 1, 0);
          if (hit.face) {
            tmpNormalMatRef.current.getNormalMatrix(hit.object.matrixWorld);
            worldNormal
              .copy(hit.face.normal)
              .applyMatrix3(tmpNormalMatRef.current)
              .normalize();
          } else {
            worldNormal.copy(moveDir).negate();
          }

          // Only block when moving INTO the surface (never block moving away or parallel)
          const inwardDot = worldNormal.dot(moveDir);
          if (inwardDot < -0.05 && hit.distance < moveLen + CAMERA_WALL_PADDING) {
            const stopDist = Math.max(0, hit.distance - CAMERA_WALL_PADDING);
            const blockedPos = tmpBlockedRef.current
              .copy(prevSafePosRef.current)
              .addScaledVector(moveDir, stopDist);

            // Slide remaining tangential travel along the wall plane so the camera glides smoothly
            const remainingLen = Math.max(0, moveLen - stopDist);
            if (remainingLen > 0.001) {
              const remVec = tmpRemainRef.current
                .copy(moveDir)
                .multiplyScalar(remainingLen);
              const proj = remVec.dot(worldNormal);
              remVec.addScaledVector(worldNormal, -proj);
              if (remVec.lengthSq() > 1e-6) {
                blockedPos.add(remVec);
              }
            }

            const targetDelta = tmpTargetDeltaRef.current
              .copy(orbit.target)
              .sub(prevTargetRef.current);
            if (targetDelta.lengthSq() > 1e-6) {
              const clampShift = tmpDeltaRef.current
                .copy(blockedPos)
                .sub(desiredPos);
              orbit.target.add(clampShift);
            }
            cam.position.copy(blockedPos);
            adjusted = true;
          }
        }
      }
    }

    // Final terrain clearance pass after wall slide
    const gFinal = getGroundY(
      cam.position.x,
      cam.position.z,
      world.terrain,
      world.road
    );
    if (cam.position.y < gFinal + CAMERA_GROUND_CLEARANCE) {
      cam.position.y = gFinal + CAMERA_GROUND_CLEARANCE;
      adjusted = true;
    }

    if (adjusted) {
      orbit.update();
    }

    prevSafePosRef.current.copy(cam.position);
    prevTargetRef.current.copy(orbit.target);
    hasPrevRef.current = true;
  });

  return null;
};

/* ---------------- Director View (God's-Eye 3D Stage) ---------------- */
interface DirectorViewProps {
  directorViewOutRef: React.MutableRefObject<{ position: Vec3; target: Vec3 }>;
  onBackgroundClick?: () => void;
  onShiftDuplicatingChange?: (active: boolean) => void;
}

const DirectorViewContent: React.FC<DirectorViewProps> = ({
  directorViewOutRef,
  onBackgroundClick,
  onShiftDuplicatingChange,
}) => {
  const { gl, events } = useThree();
  const objectRefs = useRef<Record<string, THREE.Group | null>>({});
  const worldCollidersRef = useRef<THREE.Group>(null);
  const cameraRigRef = useRef<THREE.Group>(null);
  const cameraTargetRef = useRef<THREE.Mesh>(null);
  const directorCamRef = useRef<THREE.PerspectiveCamera>(null);
  const orbitRef = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const zoomVelocityRef = useRef(0);
  const zoomOffsetVecRef = useRef(new THREE.Vector3());
  const zoomForwardVecRef = useRef(new THREE.Vector3());
  const lastRecordTimeRef = useRef<number>(-1);
  const transformActiveRef = useRef(false);
  const lastPointerDownRef = useRef<{ x: number; y: number; button: number } | null>(null);
  const pointerDownSeqRef = useRef(0);
  const lastSelectionSeqRef = useRef(-1);
  const [selectedGroup, setSelectedGroup] = useState<THREE.Object3D | null>(null);

  const projects = useStudioStore((s) => s.projects);
  const activeProjectId = useStudioStore((s) => s.activeProjectId);
  const project = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? projects[0],
    [projects, activeProjectId]
  );
  const shot = useMemo(
    () => project.shots.find((s) => s.id === project.activeShotId) ?? project.shots[0],
    [project]
  );

  const selectedId = useStudioStore((s) => s.selectedId);
  const selectObject = useStudioStore((s) => s.selectObject);
  const collabStatus = useCollabStore((s) => s.status);
  const collabPeers = useCollabStore((s) => s.peers);
  const collabClientId = useCollabStore((s) => s.clientId);
  const lockedByPeer = useMemo(() => {
    if (
      collabStatus !== 'connected' ||
      !selectedId ||
      selectedId === SHOT_CAMERA_ID ||
      selectedId === SHOT_TARGET_ID
    ) {
      return null;
    }
    return (
      collabPeers.find(
        (p) =>
          p.clientId !== collabClientId &&
          p.isDragging &&
          p.selectedId === selectedId
      ) ?? null
    );
  }, [collabStatus, collabPeers, collabClientId, selectedId]);

  useEffect(() => {
    const syncId =
      selectedId && selectedId !== SHOT_CAMERA_ID && selectedId !== SHOT_TARGET_ID
        ? selectedId
        : null;
    collabManager.updateSelectedId(syncId);
  }, [selectedId]);
  const transformMode = useStudioStore((s) => s.transformMode);
  const gridSnap = useStudioStore((s) => s.gridSnap);
  const snapStep = useStudioStore((s) => s.snapStep);
  const channel = useStudioStore((s) => s.channel);
  const cameraCollision = useStudioStore((s) => s.cameraCollision);
  const depthNear = useStudioStore((s) => s.depthNear);
  const depthFar = useStudioStore((s) => s.depthFar);
  const isTransforming = useStudioStore((s) => s.isTransforming);
  const setIsTransforming = useStudioStore((s) => s.setIsTransforming);
  const terrainBrush = useStudioStore((s) => s.terrainBrush);
  const terrainBrushOrbitHold = useStudioStore((s) => s.terrainBrushOrbitHold);
  const terrainPointerOver = useStudioStore((s) => s.terrainPointerOver);
  const [ctrlHeld, setCtrlHeld] = useState(false);
  const [altHeld, setAltHeld] = useState(false);
  const shiftHeldRef = useRef(false);
  const shiftDupRef = useRef<{
    active: boolean;
    spawned: boolean;
    sourceId: string;
    startPos: Vec3;
    startRot: Vec3;
    startScale: Vec3;
  } | null>(null);
  const updateObjectTransform = useStudioStore((s) => s.updateObjectTransform);
  const duplicateInPlaceAt = useStudioStore((s) => s.duplicateInPlaceAt);
  const updateShotCameraPosition = useStudioStore((s) => s.updateShotCameraPosition);
  const updateShotCameraTarget = useStudioStore((s) => s.updateShotCameraTarget);
  const pushHistory = useStudioStore((s) => s.pushHistory);
  const currentTime = useStudioStore((s) => s.currentTime);
  const isPlaying = useStudioStore((s) => s.isPlaying);
  const isExporting = useStudioStore((s) => s.isExporting);
  const isRecordingCamera = useStudioStore((s) => s.isRecordingCamera);
  const pendingDirectorCamera = useStudioStore((s) => s.pendingDirectorCamera);
  const clearPendingDirectorCamera = useStudioStore(
    (s) => s.clearPendingDirectorCamera
  );
  const [collisionResetTick, setCollisionResetTick] = useState(0);
  const pendingPlacement = useStudioStore((s) => s.pendingPlacement);
  const setPendingPlacement = useStudioStore((s) => s.setPendingPlacement);
  const addAsset = useStudioStore((s) => s.addAsset);
  const addCharacter = useStudioStore((s) => s.addCharacter);
  const addPaintedRoad = useStudioStore((s) => s.addPaintedRoad);
  const addPaintedFence = useStudioStore((s) => s.addPaintedFence);
  const scatterTreesInRadius = useStudioStore((s) => s.scatterTreesInRadius);
  const scatterRocksInRadius = useStudioStore((s) => s.scatterRocksInRadius);
  const eraseObjectsInRadius = useStudioStore((s) => s.eraseObjectsInRadius);
  const ghostGroupRef = useRef<THREE.Group>(null);
  const placementDownClientRef = useRef<{ x: number; y: number; button: number } | null>(
    null
  );
  const isDrawingStrokeRef = useRef(false);
  const isAreaBrushingRef = useRef(false);
  const lastAreaBrushPosRef = useRef<[number, number] | null>(null);
  const strokeRawPointsRef = useRef<Vec3[]>([]);
  const strokePreviewRef = useRef<Vec3[]>([]);
  const [strokePreviewPoints, setStrokePreviewPoints] = useState<Vec3[]>([]);

  useEffect(() => {
    updateDepthUniforms(depthNear, depthFar);
  }, [depthNear, depthFar]);

  // Keep Depth & Normal mathematically linear without filmic tone mapping compression
  useEffect(() => {
    gl.toneMapping =
      channel === 'depth' || channel === 'normal'
        ? THREE.NoToneMapping
        : THREE.ACESFilmicToneMapping;
  }, [gl, channel]);

  useEffect(() => {
    const syncMods = (e: KeyboardEvent) => {
      setCtrlHeld(e.ctrlKey || e.metaKey);
      setAltHeld(e.altKey);
      shiftHeldRef.current = e.shiftKey;
    };
    const resetMods = () => {
      setCtrlHeld(false);
      setAltHeld(false);
      shiftHeldRef.current = false;
    };
    const trackDown = (e: PointerEvent) => {
      pointerDownSeqRef.current += 1;
      lastPointerDownRef.current = { x: e.clientX, y: e.clientY, button: e.button };
      shiftHeldRef.current = e.shiftKey;
    };
    const resetBrushGestures = () => {
      isAreaBrushingRef.current = false;
      lastAreaBrushPosRef.current = null;
      if (isDrawingStrokeRef.current) {
        isDrawingStrokeRef.current = false;
        strokeRawPointsRef.current = [];
        strokePreviewRef.current = [];
        setStrokePreviewPoints([]);
      }
    };
    window.addEventListener('keydown', syncMods);
    window.addEventListener('keyup', syncMods);
    window.addEventListener('blur', resetMods);
    window.addEventListener('blur', resetBrushGestures);
    window.addEventListener('pointercancel', resetBrushGestures);
    window.addEventListener('pointerdown', trackDown, true);
    return () => {
      window.removeEventListener('keydown', syncMods);
      window.removeEventListener('keyup', syncMods);
      window.removeEventListener('blur', resetMods);
      window.removeEventListener('blur', resetBrushGestures);
      window.removeEventListener('pointercancel', resetBrushGestures);
      window.removeEventListener('pointerdown', trackDown, true);
    };
  }, []);

  useEffect(() => {
    const wheelEl = (events.connected as HTMLElement | null) ?? gl.domElement;
    if (!wheelEl) return;
    const onWheel = (e: WheelEvent) => {
      if (useStudioStore.getState().isTransforming) return;
      e.preventDefault();
      const modeScale =
        e.deltaMode === 1 ? 24 : e.deltaMode === 2 ? 320 : 1;
      let dy = e.deltaY * modeScale;
      if (e.ctrlKey) dy *= 2.4;
      const precision = e.altKey ? 0.25 : 1;
      const impulse = THREE.MathUtils.clamp(dy * 0.0045 * precision, -0.85, 0.85);
      zoomVelocityRef.current = THREE.MathUtils.clamp(
        zoomVelocityRef.current + impulse,
        -4.5,
        4.5
      );
    };
    wheelEl.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      wheelEl.removeEventListener('wheel', onWheel);
    };
  }, [events.connected, gl.domElement]);

  useEffect(() => {
    if (!selectedGroup) {
      setIsTransforming(false);
      shiftDupRef.current = null;
      onShiftDuplicatingChange?.(false);
    }
  }, [selectedGroup, setIsTransforming, onShiftDuplicatingChange]);

  const isStrokeBrushActive =
    pendingPlacement?.kind === 'road_brush' ||
    pendingPlacement?.kind === 'fence_brush' ||
    pendingPlacement?.kind === 'tree_brush' ||
    pendingPlacement?.kind === 'rock_brush' ||
    pendingPlacement?.kind === 'object_eraser';

  const isPlacementSingleClick =
    pendingPlacement?.kind === 'asset' || pendingPlacement?.kind === 'character';

  const isOrbitNavigationActive = terrainBrush.active || Boolean(pendingPlacement);

  const allowLeftOrbitInBrush =
    terrainBrushOrbitHold ||
    ctrlHeld ||
    (Boolean(pendingPlacement) && altHeld) ||
    isPlacementSingleClick ||
    (!terrainPointerOver && !isStrokeBrushActive);

  const orbitMouseButtons = useMemo(
    () =>
      isOrbitNavigationActive
        ? {
            LEFT: allowLeftOrbitInBrush
              ? THREE.MOUSE.ROTATE
              : (-1 as unknown as THREE.MOUSE),
            MIDDLE: THREE.MOUSE.PAN,
            RIGHT: THREE.MOUSE.ROTATE,
          }
        : {
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.PAN,
            RIGHT: THREE.MOUSE.DOLLY,
          },
    [isOrbitNavigationActive, allowLeftOrbitInBrush]
  );

  useEffect(() => {
    const ctrl = orbitRef.current;
    if (!ctrl) return;
    ctrl.mouseButtons = orbitMouseButtons;
    ctrl.enableRotate = true;
    ctrl.enablePan = true;
    ctrl.update();
  }, [orbitMouseButtons]);

  const commitActiveStroke = React.useCallback(() => {
    if (!isDrawingStrokeRef.current) return;
    isDrawingStrokeRef.current = false;
    const pts = strokePreviewRef.current;
    strokeRawPointsRef.current = [];
    strokePreviewRef.current = [];
    setStrokePreviewPoints([]);
    const placement = useStudioStore.getState().pendingPlacement;
    if (!placement || pts.length === 0) return;

    let totalLen = 0;
    for (let i = 1; i < pts.length; i++) {
      totalLen += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][2] - pts[i - 1][2]);
    }

    if (placement.kind === 'road_brush') {
      if (pts.length >= 2 && totalLen >= 1.2) {
        lastSelectionSeqRef.current = pointerDownSeqRef.current;
        addPaintedRoad(
          placement.roadStyle ?? 'asphalt_2lane',
          placement.roadWidth ?? 8,
          pts,
          placement.label
        );
      }
      return;
    }

    if (placement.kind === 'fence_brush') {
      const propType = (placement.propType === 'wall' ? 'wall' : 'barrier') as
        | 'barrier'
        | 'wall';
      lastSelectionSeqRef.current = pointerDownSeqRef.current;
      if (pts.length >= 2 && totalLen >= 1.4) {
        addPaintedFence(
          propType,
          placement.variantId ?? 'jersey',
          pts,
          placement.label
        );
      } else {
        addAsset(propType, pts[0], placement.variantId);
      }
    }
  }, [addAsset, addPaintedFence, addPaintedRoad]);

  useEffect(() => {
    const onWinUp = () => {
      isAreaBrushingRef.current = false;
      lastAreaBrushPosRef.current = null;
      commitActiveStroke();
    };
    window.addEventListener('pointerup', onWinUp);
    return () => window.removeEventListener('pointerup', onWinUp);
  }, [commitActiveStroke]);

  useEffect(() => {
    if (!isStrokeBrushActive && isDrawingStrokeRef.current) {
      isDrawingStrokeRef.current = false;
      strokeRawPointsRef.current = [];
      strokePreviewRef.current = [];
      setStrokePreviewPoints([]);
    }
  }, [isStrokeBrushActive]);

  const previewRibbonGeo = useMemo(() => {
    if (
      pendingPlacement?.kind !== 'road_brush' ||
      strokePreviewPoints.length < 2
    ) {
      return null;
    }
    const width = pendingPlacement.roadWidth ?? 8;
    const isViaduct = pendingPlacement.roadStyle === 'viaduct';
    const lift = isViaduct ? 4.8 : 0;
    const smoothed = simplifyAndSmoothStroke(strokePreviewPoints, 1.4);
    const grounded = groundPolylinePoints(
      smoothed,
      project.world.terrain,
      project.world.road,
      lift,
      1.4
    );
    if (grounded.length < 2) return null;
    const frames = computeRoadCrossFrames(
      grounded,
      width,
      isViaduct
        ? undefined
        : (x, z) => getGroundY(x, z, project.world.terrain, project.world.road),
      { maxCrossSlope: 0.22, clearance: 0.16 }
    );
    return buildRoadRibbonGeometry(grounded, width, 0.16, 0.14, 0, {
      roadFrames: frames,
      anchorSkirtToGround: !isViaduct,
    });
  }, [
    pendingPlacement,
    strokePreviewPoints,
    project.world.terrain,
    project.world.road,
  ]);

  useEffect(() => {
    return () => {
      previewRibbonGeo?.dispose();
    };
  }, [previewRibbonGeo]);

  useEffect(() => {
    if (!pendingDirectorCamera) return;
    if (directorCamRef.current) {
      directorCamRef.current.position.set(...pendingDirectorCamera.position);
    }
    if (orbitRef.current) {
      orbitRef.current.target.set(...pendingDirectorCamera.target);
      orbitRef.current.update();
    }
    setCollisionResetTick((n) => n + 1);
    clearPendingDirectorCamera();
  }, [pendingDirectorCamera, clearPendingDirectorCamera]);

  // Keep Director Camera & Orbit target safely above ground whenever terrain template or seed changes
  useEffect(() => {
    const cam = directorCamRef.current;
    const ctrl = orbitRef.current;
    if (!cam || !ctrl) return;
    const { terrain, road } = useStudioStore.getState().getActiveProject().world;
    const camGround = getGroundY(cam.position.x, cam.position.z, terrain, road);
    const minCamY = Math.max(-0.2, camGround + 4.2);
    if (cam.position.y < minCamY) {
      cam.position.y = minCamY;
    }
    const tgtGround = getGroundY(ctrl.target.x, ctrl.target.z, terrain, road);
    const minTgtY = Math.max(-0.8, tgtGround + 1.4);
    if (ctrl.target.y < minTgtY) {
      ctrl.target.y = minTgtY;
    }
    ctrl.update();
  }, [project.world.terrain.theme, project.world.terrain.seed]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedGroup(null);
      return;
    }
    if (selectedId === SHOT_CAMERA_ID) {
      setSelectedGroup(cameraRigRef.current);
      return;
    }
    if (selectedId === SHOT_TARGET_ID) {
      setSelectedGroup(cameraTargetRef.current);
      return;
    }
    const immediate = objectRefs.current[selectedId] ?? null;
    setSelectedGroup(immediate);
    if (!immediate) {
      const raf = requestAnimationFrame(() => {
        setSelectedGroup(objectRefs.current[selectedId] ?? null);
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [
    selectedId,
    project.world.assets,
    project.world.buildings,
    project.world.characters,
    project.world.customModels,
    project.world.gltfModels,
    project.world.heroCompound,
    shot.id,
  ]);

  const camEval = useMemo(
    () => evaluateShotCamera(shot, project.world, currentTime),
    [shot, project.world, currentTime]
  );

  // Orient 3D camera rig and target sphere towards evaluated state
  useEffect(() => {
    if (!isTransforming) {
      if (cameraRigRef.current) {
        cameraRigRef.current.position.set(...camEval.position);
        cameraRigRef.current.lookAt(...camEval.target);
      }
      if (cameraTargetRef.current) {
        cameraTargetRef.current.position.set(...camEval.target);
      }
    }
  }, [camEval, isTransforming]);

  // Stepless viewport zoom + adaptive frustum + camera state sync & recording
  useFrame((_, delta) => {
    if (!directorCamRef.current || !orbitRef.current) return;
    const cam = directorCamRef.current;
    const orbit = orbitRef.current;
    const dt = Math.min(0.05, Math.max(0.001, delta));
    const offset = zoomOffsetVecRef.current.copy(cam.position).sub(orbit.target);
    let dist = offset.length();
    if (dist < 0.001) {
      offset.set(0, 0, 0.05);
      dist = 0.05;
      cam.position.copy(orbit.target).add(offset);
    }

    if (Math.abs(zoomVelocityRef.current) > 0.0005) {
      const factor = Math.exp(zoomVelocityRef.current * dt * 8);
      zoomVelocityRef.current *= Math.exp(-12 * dt);
      if (Math.abs(zoomVelocityRef.current) < 0.0005) zoomVelocityRef.current = 0;

      const pivotFloor = 0.65;
      const nextDist = dist * factor;
      if (factor < 1 && nextDist < pivotFloor) {
        // Dolly smoothly past target so close-up zoom never stalls
        const forward = zoomForwardVecRef.current
          .copy(offset)
          .divideScalar(dist)
          .negate();
        const stepFwd = Math.max(0.015, dist * (1 - factor));
        cam.position.addScaledVector(forward, stepFwd);
        orbit.target.addScaledVector(forward, stepFwd);
        dist = cam.position.distanceTo(orbit.target);
      } else {
        const clampedDist = THREE.MathUtils.clamp(nextDist, 0.05, 4000);
        offset.multiplyScalar(clampedDist / dist);
        cam.position.copy(orbit.target).add(offset);
        dist = clampedDist;
      }
      orbit.update();
    }

    const targetNear = THREE.MathUtils.clamp(dist * 0.004, 0.015, 1.5);
    const targetFar = Math.max(3500, dist * 8);
    if (
      Math.abs(cam.near - targetNear) > Math.max(0.005, cam.near * 0.15) ||
      Math.abs(cam.far - targetFar) > Math.max(50, cam.far * 0.15)
    ) {
      cam.near = targetNear;
      cam.far = targetFar;
      cam.updateProjectionMatrix();
    }

    const p = cam.position;
    const tgt = orbit.target;
    const posArr: Vec3 = [
      Number(p.x.toFixed(2)),
      Number(Math.max(0.25, p.y).toFixed(2)),
      Number(p.z.toFixed(2)),
    ];
    const tgtArr: Vec3 = [
      Number(tgt.x.toFixed(2)),
      Number(tgt.y.toFixed(2)),
      Number(tgt.z.toFixed(2)),
    ];
    directorViewOutRef.current = { position: posArr, target: tgtArr };

    const state = useStudioStore.getState();
    if (!state.isRecordingCamera) {
      lastRecordTimeRef.current = -1;
      return;
    }
    const t = state.currentTime;
    if (
      lastRecordTimeRef.current < 0 ||
      Math.abs(t - lastRecordTimeRef.current) >= 0.25
    ) {
      lastRecordTimeRef.current = t;
      state.recordCameraSample(t, posArr, tgtArr, shot.focalLength);
    }
  });

  // Trajectory spline points
  const pathPoints = useMemo(() => {
    if (shot.keyframes.length < 2) return null;
    const pts: Vec3[] = [];
    const steps = 48;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * shot.duration;
      pts.push(evaluateShotCamera(shot, project.world, t).position);
    }
    return pts;
  }, [shot, project.world]);

  // Frustum wireframe vertices in camera local space (looking down +Z in Three's Object3D.lookAt? Wait: Object3D.lookAt points +Z towards target for non-Camera, so we orient frustum along +Z!)
  const frustumSegments = useMemo(() => {
    const aspect = getAspectNumeric(shot.aspectRatio);
    const fovRad = THREE.MathUtils.degToRad(camEval.fov);
    const dist = 1.6;
    const halfH = Math.tan(fovRad / 2) * dist;
    const halfW = halfH * aspect;
    const tl: Vec3 = [-halfW, halfH, dist];
    const tr: Vec3 = [halfW, halfH, dist];
    const br: Vec3 = [halfW, -halfH, dist];
    const bl: Vec3 = [-halfW, -halfH, dist];
    const origin: Vec3 = [0, 0, 0];
    return [
      [origin, tl],
      [origin, tr],
      [origin, br],
      [origin, bl],
      [tl, tr],
      [tr, br],
      [br, bl],
      [bl, tl],
    ] as [Vec3, Vec3][];
  }, [shot.aspectRatio, camEval.fov]);

  const isCamSelected = selectedId === SHOT_CAMERA_ID;

  const handleSelectInViewport = (id: string) => {
    lastSelectionSeqRef.current = pointerDownSeqRef.current;
    selectObject(id);
  };

  const canClearSelectionFromPointer = () => {
    const s = useStudioStore.getState();
    return (
      !transformActiveRef.current &&
      lastSelectionSeqRef.current !== pointerDownSeqRef.current &&
      !s.pendingPlacement &&
      !s.terrainBrush.active
    );
  };

  return (
    <>
      <PerspectiveCamera
        ref={directorCamRef}
        makeDefault
        position={[14, 11, 28]}
        fov={45}
        near={0.05}
        far={4000}
      />

      {(channel !== 'color' || terrainBrush.active) && (() => {
        const terrainSize = getTerrainSize(project.world.terrain);
        return (
          <Grid
            args={[terrainSize, terrainSize]}
            cellSize={4}
            cellThickness={0.35}
            cellColor={channel === 'clay' || channel === 'color' ? '#94a3b8' : '#22252D'}
            sectionSize={20}
            sectionThickness={0.75}
            sectionColor={channel === 'clay' || channel === 'color' ? '#64748b' : '#333844'}
            fadeDistance={Math.min(600, terrainSize * 0.48)}
            fadeStrength={1.4}
            position={[0, 0.015, 0]}
          />
        );
      })()}

      <group
        onPointerMissed={(e) => {
          const down = lastPointerDownRef.current;
          if (
            e.type !== 'click' ||
            e.button !== 0 ||
            !down ||
            down.button !== 0 ||
            Math.hypot(e.clientX - down.x, e.clientY - down.y) >= 5
          ) {
            return;
          }
          const st = useStudioStore.getState();
          if (st.pendingPlacement) {
            if (
              !st.terrainBrushOrbitHold &&
              lastSelectionSeqRef.current !== pointerDownSeqRef.current
            ) {
              st.setPendingPlacement(null);
              onBackgroundClick?.();
            }
            return;
          }
          if (canClearSelectionFromPointer()) {
            st.selectObject(null);
            onBackgroundClick?.();
          }
        }}
      >
        <WorldContent
          world={project.world}
          channel={channel}
          selectedId={selectedId}
          onSelect={handleSelectInViewport}
          objectRefs={objectRefs}
          collidersGroupRef={worldCollidersRef}
          interactive
          shot={shot}
          currentTime={currentTime}
          animateCycle={isPlaying || isExporting}
          onEmptyGroundClick={() => {
            if (canClearSelectionFromPointer()) {
              useStudioStore.getState().selectObject(null);
              onBackgroundClick?.();
            }
          }}
        placementSurfaceHandlers={
          pendingPlacement
            ? {
                onPointerMove: (e: ThreeEvent<PointerEvent>) => {
                  if (!pendingPlacement) return;
                  e.stopPropagation();
                  const mapBound = Math.max(4, getTerrainHalf(project.world.terrain) - 0.5);
                  const clampedX = Math.max(-mapBound, Math.min(mapBound, e.point.x));
                  const clampedZ = Math.max(-mapBound, Math.min(mapBound, e.point.z));
                  const clampedY =
                    e.point.y <= -38
                      ? getGroundY(clampedX, clampedZ, project.world.terrain, project.world.road)
                      : e.point.y;
                  if (ghostGroupRef.current) {
                    const orbitOverride =
                      terrainBrushOrbitHold || e.ctrlKey || e.metaKey || e.altKey;
                    ghostGroupRef.current.position.set(clampedX, clampedY, clampedZ);
                    ghostGroupRef.current.visible = !orbitOverride;
                  }
                  if (
                    isAreaBrushingRef.current &&
                    (pendingPlacement.kind === 'tree_brush' ||
                      pendingPlacement.kind === 'rock_brush' ||
                      pendingPlacement.kind === 'object_eraser')
                  ) {
                    const prev = lastAreaBrushPosRef.current;
                    const isScatter =
                      pendingPlacement.kind === 'tree_brush' ||
                      pendingPlacement.kind === 'rock_brush';
                    const r =
                      pendingPlacement.brushRadius ??
                      (pendingPlacement.kind === 'tree_brush' ? 12 : 10);
                    const stepThreshold = isScatter
                      ? Math.max(2.8, r * 0.5)
                      : Math.max(1.2, r * 0.25);
                    if (
                      !prev ||
                      Math.hypot(clampedX - prev[0], clampedZ - prev[1]) >=
                        stepThreshold
                    ) {
                      lastAreaBrushPosRef.current = [clampedX, clampedZ];
                      const hitPt: Vec3 = [clampedX, clampedY, clampedZ];
                      if (pendingPlacement.kind === 'tree_brush') {
                        scatterTreesInRadius(
                          hitPt,
                          r,
                          pendingPlacement.brushDensity ?? 6,
                          pendingPlacement.variantId,
                          pendingPlacement.mixGroupVariants ?? true,
                          false
                        );
                      } else if (pendingPlacement.kind === 'rock_brush') {
                        scatterRocksInRadius(
                          hitPt,
                          r,
                          pendingPlacement.brushDensity ?? 7,
                          pendingPlacement.variantId,
                          pendingPlacement.mixGroupVariants ?? true,
                          false
                        );
                      } else {
                        eraseObjectsInRadius(
                          hitPt,
                          r,
                          pendingPlacement.eraseFilter ?? 'all',
                          false
                        );
                      }
                    }
                    return;
                  }
                  if (
                    isDrawingStrokeRef.current &&
                    (pendingPlacement.kind === 'road_brush' ||
                      pendingPlacement.kind === 'fence_brush')
                  ) {
                    const curPt: Vec3 = [
                      Number(clampedX.toFixed(2)),
                      Number(clampedY.toFixed(2)),
                      Number(clampedZ.toFixed(2)),
                    ];
                    if (e.shiftKey && strokeRawPointsRef.current.length > 0) {
                      const nextPreview = [strokeRawPointsRef.current[0], curPt];
                      strokePreviewRef.current = nextPreview;
                      setStrokePreviewPoints(nextPreview);
                    } else {
                      const raw = strokeRawPointsRef.current;
                      const prev = raw[raw.length - 1];
                      if (!prev || Math.hypot(curPt[0] - prev[0], curPt[2] - prev[2]) >= 0.9) {
                        const nextRaw = [...raw, curPt];
                        strokeRawPointsRef.current = nextRaw;
                        strokePreviewRef.current = nextRaw;
                        setStrokePreviewPoints(nextRaw);
                      }
                    }
                  }
                },
                onPointerOut: () => {
                  if (pendingPlacement && ghostGroupRef.current) {
                    ghostGroupRef.current.visible = false;
                  }
                },
                onPointerDown: (e: ThreeEvent<PointerEvent>) => {
                  if (!pendingPlacement) return;
                  placementDownClientRef.current = {
                    x: e.clientX,
                    y: e.clientY,
                    button: e.button,
                  };
                  const mapBound = Math.max(4, getTerrainHalf(project.world.terrain) - 0.5);
                  const clampedX = Math.max(-mapBound, Math.min(mapBound, e.point.x));
                  const clampedZ = Math.max(-mapBound, Math.min(mapBound, e.point.z));
                  const clampedY =
                    e.point.y <= -38
                      ? getGroundY(clampedX, clampedZ, project.world.terrain, project.world.road)
                      : e.point.y;
                  if (
                    (pendingPlacement.kind === 'tree_brush' ||
                      pendingPlacement.kind === 'rock_brush' ||
                      pendingPlacement.kind === 'object_eraser') &&
                    e.button === 0 &&
                    !e.ctrlKey &&
                    !e.metaKey &&
                    !e.altKey &&
                    !terrainBrushOrbitHold
                  ) {
                    e.stopPropagation();
                    lastSelectionSeqRef.current = pointerDownSeqRef.current;
                    isAreaBrushingRef.current = true;
                    lastAreaBrushPosRef.current = [clampedX, clampedZ];
                    pushHistory();
                    const hitPt: Vec3 = [clampedX, clampedY, clampedZ];
                    const r =
                      pendingPlacement.brushRadius ??
                      (pendingPlacement.kind === 'tree_brush' ? 12 : 10);
                    if (pendingPlacement.kind === 'tree_brush') {
                      scatterTreesInRadius(
                        hitPt,
                        r,
                        pendingPlacement.brushDensity ?? 6,
                        pendingPlacement.variantId,
                        pendingPlacement.mixGroupVariants ?? true,
                        false
                      );
                    } else if (pendingPlacement.kind === 'rock_brush') {
                      scatterRocksInRadius(
                        hitPt,
                        r,
                        pendingPlacement.brushDensity ?? 7,
                        pendingPlacement.variantId,
                        pendingPlacement.mixGroupVariants ?? true,
                        false
                      );
                    } else {
                      eraseObjectsInRadius(
                        hitPt,
                        r,
                        pendingPlacement.eraseFilter ?? 'all',
                        false
                      );
                    }
                    return;
                  }
                  if (
                    (pendingPlacement.kind === 'road_brush' ||
                      pendingPlacement.kind === 'fence_brush') &&
                    e.button === 0 &&
                    !e.ctrlKey &&
                    !e.metaKey &&
                    !e.altKey &&
                    !terrainBrushOrbitHold
                  ) {
                    e.stopPropagation();
                    const startPt: Vec3 = [
                      Number(clampedX.toFixed(2)),
                      Number(clampedY.toFixed(2)),
                      Number(clampedZ.toFixed(2)),
                    ];
                    isDrawingStrokeRef.current = true;
                    strokeRawPointsRef.current = [startPt];
                    strokePreviewRef.current = [startPt];
                    setStrokePreviewPoints([startPt]);
                  }
                },
                onPointerUp: (e: ThreeEvent<PointerEvent>) => {
                  if (!pendingPlacement) return;
                  if (e.button === 2 || e.button === 1) {
                    // Right/middle mouse release stays in placement/eraser mode so orbiting never exits the tool
                    placementDownClientRef.current = null;
                    lastSelectionSeqRef.current = pointerDownSeqRef.current;
                    return;
                  }
                  e.stopPropagation();
                  const down = placementDownClientRef.current;
                  placementDownClientRef.current = null;
                  if (isAreaBrushingRef.current) {
                    isAreaBrushingRef.current = false;
                    lastAreaBrushPosRef.current = null;
                    lastSelectionSeqRef.current = pointerDownSeqRef.current;
                    return;
                  }
                  if (
                    pendingPlacement.kind === 'tree_brush' ||
                    pendingPlacement.kind === 'rock_brush' ||
                    pendingPlacement.kind === 'object_eraser'
                  ) {
                    return;
                  }
                  if (isDrawingStrokeRef.current && e.button === 0) {
                    commitActiveStroke();
                    return;
                  }
                  if (
                    terrainBrushOrbitHold ||
                    e.ctrlKey ||
                    e.metaKey ||
                    e.altKey ||
                    !down ||
                    down.button !== 0 ||
                    Math.hypot(e.clientX - down.x, e.clientY - down.y) >= 6
                  ) {
                    return;
                  }
                  if (e.button !== 0) return;
                  lastSelectionSeqRef.current = pointerDownSeqRef.current;
                  const mapBound = Math.max(4, getTerrainHalf(project.world.terrain) - 0.5);
                  const px = Math.max(-mapBound, Math.min(mapBound, e.point.x));
                  const pz = Math.max(-mapBound, Math.min(mapBound, e.point.z));
                  const rawY =
                    e.point.y <= -38
                      ? getGroundY(px, pz, project.world.terrain, project.world.road)
                      : e.point.y;
                  const pos: Vec3 = [
                    Number(px.toFixed(2)),
                    Number(
                      (pendingPlacement.kind === 'asset' &&
                      pendingPlacement.propType === 'floor'
                        ? rawY - 0.15
                        : rawY
                      ).toFixed(2)
                    ),
                    Number(pz.toFixed(2)),
                  ];
                  if (pendingPlacement.kind === 'character') {
                    addCharacter(
                      pendingPlacement.pose ?? 'idle',
                      pos,
                      pendingPlacement.variantId
                    );
                  } else if (pendingPlacement.propType) {
                    addAsset(
                      pendingPlacement.propType,
                      pos,
                      pendingPlacement.variantId
                    );
                  }
                  if (!e.shiftKey && !pendingPlacement.continuous) {
                    setPendingPlacement(null);
                  }
                },
              }
            : undefined
        }
      />

      {pendingPlacement && (
        <PlacementGhost placement={pendingPlacement} groupRef={ghostGroupRef} />
      )}

      {/* Live Road / Fence Brush Stroke Preview */}
      {strokePreviewPoints.length >= 2 && (
        <group>
          <Line
            points={strokePreviewPoints.map(([x, y, z]) => [x, y + 0.25, z] as Vec3)}
            color="#0ea5e9"
            lineWidth={3.5}
          />
          {previewRibbonGeo && (
            <mesh geometry={previewRibbonGeo}>
              <meshBasicMaterial
                color="#38bdf8"
                transparent
                opacity={0.48}
                depthWrite={false}
              />
            </mesh>
          )}
        </group>
      )}

      {/* Camera Trajectory Spline & Keyframe Nodes */}
      {pathPoints && (
        <Line
          points={pathPoints}
          color={isRecordingCamera ? '#ef4444' : '#38BDF8'}
          lineWidth={2}
          dashed
          dashScale={2}
          dashSize={0.35}
          gapSize={0.2}
        />
      )}
      {shot.keyframes.map((kf, idx) => (
        <mesh key={kf.id} position={kf.position}>
          <sphereGeometry args={[0.12, 12, 12]} />
          <meshBasicMaterial color={idx === 0 ? '#22c55e' : '#38BDF8'} />
        </mesh>
      ))}

      {/* Look-At Sight Line & Interactive Target Sphere */}
      <Line points={[camEval.position, camEval.target]} color="#EAB308" lineWidth={1} />
        <mesh
          ref={cameraTargetRef}
          position={camEval.target}
          onPointerDown={(e) => {
            e.stopPropagation();
            handleSelectInViewport(SHOT_TARGET_ID);
          }}
        >
          <sphereGeometry
            args={[selectedId === SHOT_TARGET_ID ? 0.16 : 0.12, 12, 12]}
          />
          <meshBasicMaterial
            color={selectedId === SHOT_TARGET_ID ? '#f97316' : '#EAB308'}
          />
        </mesh>

        {/* Physical 3D Cinema Camera Model + Frustum */}
        <group
          ref={cameraRigRef}
          onPointerDown={(e) => {
            e.stopPropagation();
            handleSelectInViewport(SHOT_CAMERA_ID);
          }}
        >
          {/* Camera Body */}
          <mesh position={[0, 0, -0.15]}>
            <boxGeometry args={[0.28, 0.22, 0.36]} />
            <meshStandardMaterial
              color={isCamSelected ? '#EAB308' : '#3f3f46'}
              roughness={0.4}
              metalness={0.6}
            />
          </mesh>
          {/* Lens Barrel (+Z forward for Object3D.lookAt) */}
          <mesh position={[0, 0, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.09, 0.08, 0.2, 16]} />
            <meshStandardMaterial color="#18181b" roughness={0.3} metalness={0.8} />
          </mesh>
          {/* Frustum Wireframe */}
          {frustumSegments.map((seg, i) => (
            <Line
              key={i}
              points={seg}
              color={isCamSelected ? '#EAB308' : '#38BDF8'}
              lineWidth={1.2}
            />
          ))}
        </group>
      </group>

      <Collaborators3D
        directorCamRef={directorCamRef}
        orbitRef={orbitRef}
        objectRefs={objectRefs}
      />

      {/* TransformControls */}
      {selectedGroup && !lockedByPeer && (
        <TransformControls
          object={selectedGroup}
          mode={
            selectedId === SHOT_CAMERA_ID || selectedId === SHOT_TARGET_ID
              ? 'translate'
              : transformMode
          }
          translationSnap={gridSnap ? snapStep : null}
          rotationSnap={gridSnap ? Math.PI / 12 : null}
          scaleSnap={gridSnap ? 0.1 : null}
          onMouseDown={() => {
            lastSelectionSeqRef.current = pointerDownSeqRef.current;
            transformActiveRef.current = true;
            pushHistory();
            setIsTransforming(true);
            if (
              selectedId &&
              selectedId !== SHOT_CAMERA_ID &&
              selectedId !== SHOT_TARGET_ID &&
              selectedGroup
            ) {
              const gp = selectedGroup.position;
              const gr = selectedGroup.rotation;
              const gs = selectedGroup.scale;
              collabManager.updateDragState(true, {
                objectId: selectedId,
                position: [Number(gp.x.toFixed(2)), Number(gp.y.toFixed(2)), Number(gp.z.toFixed(2))],
                rotation: [Number(gr.x.toFixed(3)), Number(gr.y.toFixed(3)), Number(gr.z.toFixed(3))],
                scale: [Number(Math.max(0.01, gs.x).toFixed(3)), Number(Math.max(0.01, gs.y).toFixed(3)), Number(Math.max(0.01, gs.z).toFixed(3))],
              });
            }
            if (
              selectedId &&
              selectedId !== SHOT_CAMERA_ID &&
              selectedId !== SHOT_TARGET_ID &&
              selectedGroup &&
              shiftHeldRef.current
            ) {
              const p = selectedGroup.position;
              const r = selectedGroup.rotation;
              const s = selectedGroup.scale;
              shiftDupRef.current = {
                active: true,
                spawned: false,
                sourceId: selectedId,
                startPos: [Number(p.x.toFixed(2)), Number(p.y.toFixed(2)), Number(p.z.toFixed(2))],
                startRot: [Number(r.x.toFixed(3)), Number(r.y.toFixed(3)), Number(r.z.toFixed(3))],
                startScale: [
                  Number(Math.max(0.01, s.x).toFixed(3)),
                  Number(Math.max(0.01, s.y).toFixed(3)),
                  Number(Math.max(0.01, s.z).toFixed(3)),
                ],
              };
            } else {
              shiftDupRef.current = null;
            }
          }}
          onObjectChange={() => {
            if (
              selectedId &&
              selectedId !== SHOT_CAMERA_ID &&
              selectedId !== SHOT_TARGET_ID &&
              selectedGroup &&
              transformActiveRef.current
            ) {
              const gp = selectedGroup.position;
              const gr = selectedGroup.rotation;
              const gs = selectedGroup.scale;
              collabManager.updateDragState(true, {
                objectId: selectedId,
                position: [Number(gp.x.toFixed(2)), Number(gp.y.toFixed(2)), Number(gp.z.toFixed(2))],
                rotation: [Number(gr.x.toFixed(3)), Number(gr.y.toFixed(3)), Number(gr.z.toFixed(3))],
                scale: [Number(Math.max(0.01, gs.x).toFixed(3)), Number(Math.max(0.01, gs.y).toFixed(3)), Number(Math.max(0.01, gs.z).toFixed(3))],
              });
            }
            const st = shiftDupRef.current;
            if (!st || !st.active || st.spawned || !selectedGroup || !selectedId) return;
            const p = selectedGroup.position;
            const r = selectedGroup.rotation;
            const s = selectedGroup.scale;
            const posDist = Math.hypot(
              p.x - st.startPos[0],
              p.y - st.startPos[1],
              p.z - st.startPos[2]
            );
            const rotDiff =
              Math.abs(r.x - st.startRot[0]) +
              Math.abs(r.y - st.startRot[1]) +
              Math.abs(r.z - st.startRot[2]);
            const scaleDiff =
              Math.abs(s.x - st.startScale[0]) +
              Math.abs(s.y - st.startScale[1]) +
              Math.abs(s.z - st.startScale[2]);
            if (posDist > 0.03 || rotDiff > 0.015 || scaleDiff > 0.015) {
              st.spawned = true;
              duplicateInPlaceAt(
                st.sourceId,
                {
                  position: st.startPos,
                  rotation: st.startRot,
                  scale: st.startScale,
                },
                false
              );
              updateObjectTransform(
                st.sourceId,
                {
                  position: [
                    Number(p.x.toFixed(2)),
                    Number(p.y.toFixed(2)),
                    Number(p.z.toFixed(2)),
                  ],
                  rotation: [
                    Number(r.x.toFixed(3)),
                    Number(r.y.toFixed(3)),
                    Number(r.z.toFixed(3)),
                  ],
                  scale: [
                    Number(Math.max(0.01, s.x).toFixed(3)),
                    Number(Math.max(0.01, s.y).toFixed(3)),
                    Number(Math.max(0.01, s.z).toFixed(3)),
                  ],
                },
                false
              );
              onShiftDuplicatingChange?.(true);
            }
          }}
          onMouseUp={() => {
            collabManager.updateDragState(false, null);
            setTimeout(() => {
              transformActiveRef.current = false;
            }, 60);
            setIsTransforming(false);
            shiftDupRef.current = null;
            onShiftDuplicatingChange?.(false);
            if (!selectedId || !selectedGroup) return;
            const p = selectedGroup.position;
            if (selectedId === SHOT_CAMERA_ID) {
              const clampedY = Math.max(0.25, p.y);
              selectedGroup.position.y = clampedY;
              updateShotCameraPosition([
                Number(p.x.toFixed(2)),
                Number(clampedY.toFixed(2)),
                Number(p.z.toFixed(2)),
              ]);
              return;
            }
            if (selectedId === SHOT_TARGET_ID) {
              const clampedY = Math.max(0.05, p.y);
              selectedGroup.position.y = clampedY;
              updateShotCameraTarget([
                Number(p.x.toFixed(2)),
                Number(clampedY.toFixed(2)),
                Number(p.z.toFixed(2)),
              ]);
              return;
            }
            const r = selectedGroup.rotation;
            const s = selectedGroup.scale;
            const mapBound = Math.max(4, getTerrainHalf(project.world.terrain) - 0.5);
            const clampedX = Math.max(-mapBound, Math.min(mapBound, p.x));
            const clampedZ = Math.max(-mapBound, Math.min(mapBound, p.z));
            if (clampedX !== p.x || clampedZ !== p.z) {
              selectedGroup.position.x = clampedX;
              selectedGroup.position.z = clampedZ;
            }
            const groundY = getGroundY(clampedX, clampedZ, project.world.terrain, project.world.road);
            const isFloorAsset = project.world.assets.some(
              (a) => a.id === selectedId && a.type === 'floor'
            );
            let finalY = p.y;
            if (!isFloorAsset && p.y < groundY) {
              finalY = groundY;
              selectedGroup.position.y = finalY;
            } else if (!isFloorAsset && gridSnap && transformMode === 'translate' && Math.abs(p.y - groundY) < 0.25) {
              finalY = groundY;
              selectedGroup.position.y = finalY;
            }
            updateObjectTransform(selectedId, {
              position: [
                Number(clampedX.toFixed(2)),
                Number(finalY.toFixed(2)),
                Number(clampedZ.toFixed(2)),
              ],
              rotation: [
                Number(r.x.toFixed(3)),
                Number(r.y.toFixed(3)),
                Number(r.z.toFixed(3)),
              ],
              scale: [
                Number(Math.max(0.01, s.x).toFixed(3)),
                Number(Math.max(0.01, s.y).toFixed(3)),
                Number(Math.max(0.01, s.z).toFixed(3)),
              ],
            });
          }}
        />
      )}

      <OrbitControls
        ref={orbitRef}
        makeDefault
        enabled={!isTransforming}
        enableZoom={false}
        mouseButtons={orbitMouseButtons}
        enableDamping
        dampingFactor={0.08}
        minDistance={0.02}
        maxDistance={4000}
        maxPolarAngle={cameraCollision ? Math.PI * 0.58 : Math.PI * 0.92}
      />

      <DirectorCameraCollision
        camRef={directorCamRef}
        orbitRef={orbitRef}
        collidersGroupRef={worldCollidersRef}
        world={project.world}
        resetSignal={`${activeProjectId}_${collisionResetTick}`}
      />
    </>
  );
};

/* ---------------- Shot Camera View (PiP / Monitor) ---------------- */
interface ShotViewProps {
  onBridgeReady: (bridge: {
    gl: THREE.WebGLRenderer;
    scene: THREE.Scene;
  }) => void;
}

const ShotCameraViewContent: React.FC<ShotViewProps> = ({ onBridgeReady }) => {
  const { gl, scene, camera } = useThree();
  const projects = useStudioStore((s) => s.projects);
  const activeProjectId = useStudioStore((s) => s.activeProjectId);
  const project = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? projects[0],
    [projects, activeProjectId]
  );
  const shot = useMemo(
    () => project.shots.find((s) => s.id === project.activeShotId) ?? project.shots[0],
    [project]
  );
  const channel = useStudioStore((s) => s.channel);
  const currentTime = useStudioStore((s) => s.currentTime);
  const isPlaying = useStudioStore((s) => s.isPlaying);
  const isExporting = useStudioStore((s) => s.isExporting);

  useEffect(() => {
    onBridgeReady({ gl, scene });
  }, [gl, scene, onBridgeReady]);

  useFrame((_, delta) => {
    const state = useStudioStore.getState();
    let t = state.currentTime;
    if (state.isPlaying && !state.isExporting) {
      const rate = state.playbackRate || 1;
      t += Math.min(delta, 0.1) * rate;
      if (t >= shot.duration) {
        if (state.isRecordingCamera) {
          t = shot.duration;
          state.setCurrentTime(t);
          state.stopCameraRecording();
        } else if (state.isLooping) {
          t = 0;
          state.setCurrentTime(t);
        } else {
          t = shot.duration;
          state.setCurrentTime(t);
          state.setIsPlaying(false);
        }
      } else {
        state.setCurrentTime(t);
      }
    }

    const latestShot = state.getActiveShot();
    const camEval = evaluateShotCamera(latestShot, project.world, t);
    camera.position.set(...camEval.position);
    if (camera instanceof THREE.PerspectiveCamera) {
      if (Math.abs(camera.fov - camEval.fov) > 0.01) {
        camera.fov = camEval.fov;
        camera.updateProjectionMatrix();
      }
    }
    camera.lookAt(...camEval.target);
  });

  return (
    <>
      <PerspectiveCamera makeDefault fov={35} near={0.15} far={1400} />
      <WorldContent
        world={project.world}
        channel={channel}
        selectedId={null}
        onSelect={() => {}}
        interactive={false}
        shot={shot}
        currentTime={currentTime}
        animateCycle={isPlaying || isExporting}
      />
    </>
  );
};

const ViewportClearController: React.FC<{
  pipSlotRef: React.RefObject<HTMLDivElement | null>;
}> = ({ pipSlotRef }) => {
  // Phase 1: clear entire shared framebuffer before Main View (index=2)
  useFrame(({ gl }) => {
    if (useStudioStore.getState().isExporting) return;
    gl.setScissorTest(false);
    gl.setClearColor('#d4e2ea', 1);
    gl.clear(true, true, true);
  }, 1);

  // Phase 3: clear only the PiP rectangle's color + depth before PiP View (index=4)
  useFrame(({ gl }) => {
    if (useStudioStore.getState().isExporting) return;
    const pipEl = pipSlotRef.current;
    if (!pipEl) return;
    const canvasRect = gl.domElement.getBoundingClientRect();
    const pipRect = pipEl.getBoundingClientRect();
    if (
      pipRect.width <= 0 ||
      pipRect.height <= 0 ||
      canvasRect.width <= 0 ||
      canvasRect.height <= 0
    ) {
      return;
    }
    const left = pipRect.left - canvasRect.left;
    const bottom = canvasRect.bottom - pipRect.bottom;
    gl.setViewport(left, bottom, pipRect.width, pipRect.height);
    gl.setScissor(left, bottom, pipRect.width, pipRect.height);
    gl.setScissorTest(true);
    gl.setClearColor('#0f172a', 1);
    gl.clear(true, true, true);
    gl.setScissorTest(false);
  }, 3);

  return null;
};

/* ---------------- WebGL Shader Warmup Controller ---------------- */
const ViewportWarmupController: React.FC<{
  onReady?: () => void;
}> = ({ onReady }) => {
  const { gl, scene, camera } = useThree();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    let cancelled = false;
    let raf1 = 0;
    let raf2 = 0;

    raf1 = requestAnimationFrame(() => {
      if (cancelled) return;
      try {
        gl.compile(scene, camera);
      } catch {
        // Ignore non-fatal shader compile quirks on partial View scenes
      }
      raf2 = requestAnimationFrame(() => {
        if (cancelled || firedRef.current) return;
        firedRef.current = true;
        onReady?.();
      });
    });

    return () => {
      cancelled = true;
      if (raf1) cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [gl, scene, camera, onReady]);

  return null;
};

/* ---------------- Dual Viewport Shell ---------------- */
interface DualViewportProps {
  onBackgroundClick?: () => void;
  onViewportWarmReady?: () => void;
}

export const DualViewport = forwardRef<DualViewportHandle, DualViewportProps>(
  ({ onBackgroundClick, onViewportWarmReady }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null!);
  const pipSlotRef = useRef<HTMLDivElement | null>(null);
  const exportBridgeRef = useRef<{
    gl: THREE.WebGLRenderer;
    scene: THREE.Scene;
  } | null>(null);
  const exportAbortRef = useRef<AbortController | null>(null);
  const directorViewLiveRef = useRef<{ position: Vec3; target: Vec3 }>({
    position: [14, 11, 28],
    target: [0, 1.5, 0],
  });

  const projects = useStudioStore((s) => s.projects);
  const activeProjectId = useStudioStore((s) => s.activeProjectId);
  const project = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? projects[0],
    [projects, activeProjectId]
  );
  const shot = useMemo(
    () => project.shots.find((s) => s.id === project.activeShotId) ?? project.shots[0],
    [project]
  );

  const pipSwapped = useStudioStore((s) => s.pipSwapped);
  const togglePipSwap = useStudioStore((s) => s.togglePipSwap);
  const channel = useStudioStore((s) => s.channel);
  const language = useStudioStore((s) => s.language);
  const graphicsQuality = useStudioStore((s) => s.graphicsQuality);
  const currentTime = useStudioStore((s) => s.currentTime);
  const isPlaying = useStudioStore((s) => s.isPlaying);
  const isRecordingCamera = useStudioStore((s) => s.isRecordingCamera);
  const isExporting = useStudioStore((s) => s.isExporting);
  const [isShiftDuplicating, setIsShiftDuplicating] = useState(false);
  const exportProgress = useStudioStore((s) => s.exportProgress);
  const setExportState = useStudioStore((s) => s.setExportState);

  const selectedId = useStudioStore((s) => s.selectedId);
  const selectObject = useStudioStore((s) => s.selectObject);
  const setTransformMode = useStudioStore((s) => s.setTransformMode);
  const deleteSelected = useStudioStore((s) => s.deleteSelected);
  const undo = useStudioStore((s) => s.undo);
  const redo = useStudioStore((s) => s.redo);
  const setIsPlaying = useStudioStore((s) => s.setIsPlaying);
  const pendingPlacement = useStudioStore((s) => s.pendingPlacement);
  const applyDirectorViewAsKeyframe = useStudioStore(
    (s) => s.applyDirectorViewAsKeyframe
  );

  const collabStatusOuter = useCollabStore((s) => s.status);
  const collabPeersOuter = useCollabStore((s) => s.peers);
  const collabClientIdOuter = useCollabStore((s) => s.clientId);
  const lockedByPeerOuter = useMemo(() => {
    if (
      collabStatusOuter !== 'connected' ||
      !selectedId ||
      selectedId === SHOT_CAMERA_ID ||
      selectedId === SHOT_TARGET_ID
    ) {
      return null;
    }
    return (
      collabPeersOuter.find(
        (p) =>
          p.clientId !== collabClientIdOuter &&
          p.isDragging &&
          p.selectedId === selectedId
      ) ?? null
    );
  }, [collabStatusOuter, collabPeersOuter, collabClientIdOuter, selectedId]);

  const rightDragInViewportRef = useRef(false);

  useEffect(() => {
    const suppressDraggedContextMenu = (e: MouseEvent) => {
      if (rightDragInViewportRef.current) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const clearRightDrag = () => {
      if (!rightDragInViewportRef.current) return;
      window.setTimeout(() => {
        rightDragInViewportRef.current = false;
      }, 0);
    };
    window.addEventListener('contextmenu', suppressDraggedContextMenu, true);
    window.addEventListener('pointerup', clearRightDrag, true);
    window.addEventListener('pointercancel', clearRightDrag, true);
    window.addEventListener('blur', clearRightDrag);
    return () => {
      window.removeEventListener('contextmenu', suppressDraggedContextMenu, true);
      window.removeEventListener('pointerup', clearRightDrag, true);
      window.removeEventListener('pointercancel', clearRightDrag, true);
      window.removeEventListener('blur', clearRightDrag);
    };
  }, []);

  useEffect(() => {
    return () => {
      disposeChannelMaterials();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return;
      }
      const state = useStudioStore.getState();
      if (state.keybindingsOpen) return;

      const kb = state.keybindings;
      if (matchesKeyCombo(e, kb.undo)) {
        e.preventDefault();
        undo();
        return;
      }
      if (
        matchesKeyCombo(e, kb.redo) ||
        (kb.redo === 'Ctrl+Y' && matchesKeyCombo(e, 'Ctrl+Shift+Z'))
      ) {
        e.preventDefault();
        redo();
        return;
      }
      if (matchesKeyCombo(e, kb.translate)) {
        setTransformMode('translate');
        return;
      }
      if (matchesKeyCombo(e, kb.rotate)) {
        setTransformMode('rotate');
        return;
      }
      if (matchesKeyCombo(e, kb.scale)) {
        setTransformMode('scale');
        return;
      }
      if (matchesKeyCombo(e, kb.toggleBrush)) {
        state.setTerrainBrush({ active: !state.terrainBrush.active });
        return;
      }
      if (matchesKeyCombo(e, kb.brushSmaller)) {
        if (state.terrainBrush.active) {
          state.setTerrainBrush({ radius: Math.max(2, state.terrainBrush.radius - 2) });
        } else if (
          state.pendingPlacement?.kind === 'tree_brush' ||
          state.pendingPlacement?.kind === 'rock_brush' ||
          state.pendingPlacement?.kind === 'object_eraser'
        ) {
          const curR = state.pendingPlacement.brushRadius ?? 10;
          state.setPendingPlacement({
            ...state.pendingPlacement,
            brushRadius: Math.max(2, curR - 2),
          });
        }
        return;
      }
      if (matchesKeyCombo(e, kb.brushLarger)) {
        if (state.terrainBrush.active) {
          state.setTerrainBrush({ radius: Math.min(45, state.terrainBrush.radius + 2) });
        } else if (
          state.pendingPlacement?.kind === 'tree_brush' ||
          state.pendingPlacement?.kind === 'rock_brush' ||
          state.pendingPlacement?.kind === 'object_eraser'
        ) {
          const curR = state.pendingPlacement.brushRadius ?? 10;
          state.setPendingPlacement({
            ...state.pendingPlacement,
            brushRadius: Math.min(120, curR + 2),
          });
        }
        return;
      }
      if (
        matchesKeyCombo(e, kb.deleteSelected) ||
        (kb.deleteSelected === 'Delete' && matchesKeyCombo(e, 'Backspace'))
      ) {
        deleteSelected();
        return;
      }
      if (matchesKeyCombo(e, kb.cancelOrDeselect)) {
        if (state.pendingPlacement) {
          state.setPendingPlacement(null);
        } else if (state.selectedId) {
          state.selectObject(null);
          onBackgroundClick?.();
        } else {
          onBackgroundClick?.();
        }
        return;
      }
      if (matchesKeyCombo(e, kb.toggleKeyHints)) {
        state.toggleKeyHints();
        return;
      }
      if (matchesKeyCombo(e, kb.playPause)) {
        e.preventDefault();
        if (state.terrainBrush.active || state.pendingPlacement) {
          state.setTerrainBrushOrbitHold(true);
        } else {
          setIsPlaying(!state.isPlaying);
        }
        return;
      }
      if (
        (state.terrainBrush.active || state.pendingPlacement) &&
        (e.code === 'Space' || e.key === ' ')
      ) {
        e.preventDefault();
        state.setTerrainBrushOrbitHold(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const state = useStudioStore.getState();
      if (
        state.terrainBrushOrbitHold &&
        (e.code === 'Space' || e.key === ' ' || matchesKeyCombo(e, state.keybindings.playPause))
      ) {
        state.setTerrainBrushOrbitHold(false);
      }
    };
    const onBlur = () => {
      const state = useStudioStore.getState();
      if (state.terrainBrushOrbitHold) {
        state.setTerrainBrushOrbitHold(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [setTransformMode, deleteSelected, undo, redo, setIsPlaying]);

  useImperativeHandle(ref, () => ({
    exportVideo: async (channelOverride?: RenderChannel) => {
      if (!exportBridgeRef.current) return;
      const state = useStudioStore.getState();
      const proj = state.getActiveProject();
      const targetChannel = channelOverride ?? state.channel;
      const prevChannel = state.channel;
      const prevTime = state.currentTime;

      const abortController = new AbortController();
      exportAbortRef.current = abortController;

      state.setIsPlaying(false);
      if (targetChannel !== prevChannel) {
        state.setChannel(targetChannel);
      }
      setExportState(true, 0);
      // Wait two animation frames so <View visible={false}> pauses and new channel/scene updates commit
      await new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r()))
      );
      try {
        await exportDeterministicWebM({
          gl: exportBridgeRef.current.gl,
          scene: exportBridgeRef.current.scene,
          world: useStudioStore.getState().getActiveProject().world,
          shot: useStudioStore.getState().getActiveShot(),
          channel: targetChannel,
          projectName: proj.name,
          onProgress: (p) => setExportState(true, p),
          onPrepareFrame: async (t) => {
            useStudioStore.getState().setCurrentTime(t);
            await new Promise<void>((r) => requestAnimationFrame(() => r()));
          },
          signal: abortController.signal,
        });
      } finally {
        exportAbortRef.current = null;
        useStudioStore.getState().setChannel(prevChannel);
        useStudioStore.getState().setCurrentTime(prevTime);
        setExportState(false, 0);
      }
    },
    getShotCameraState: () => {
      const cam = evaluateShotCamera(shot, project.world, currentTime);
      return {
        position: cam.position,
        target: cam.target,
        focalLength: Math.round(cam.focalLength),
      };
    },
    getDirectorCameraState: () => ({
      position: [...directorViewLiveRef.current.position],
      target: [...directorViewLiveRef.current.target],
    }),
    matchShotToDirectorView: () => {
      const { position, target } = directorViewLiveRef.current;
      applyDirectorViewAsKeyframe(position, target);
    },
    focusDirectorOnShotCamera: () => {
      const cam = evaluateShotCamera(shot, project.world, currentTime);
      useStudioStore.setState({
        pendingDirectorCamera: {
          position: [...cam.position],
          target: [...cam.target],
          nonce: Date.now() + Math.random(),
        },
      });
    },
  }));

  const camEval = useMemo(
    () => evaluateShotCamera(shot, project.world, currentTime),
    [shot, project.world, currentTime]
  );

  // Aspect ratio sizing for Shot Monitor box
  const monitorAspectCss =
    shot.aspectRatio === '2.39:1'
      ? 'aspect-[239/100]'
      : shot.aspectRatio === '9:16'
      ? 'aspect-[9/16]'
      : 'aspect-video';

  return (
    <div
      ref={containerRef}
      onPointerDownCapture={(e) => {
        if (e.button === 2) {
          rightDragInViewportRef.current = true;
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
      }}
      className={`relative w-full h-full bg-[#d4e2ea] overflow-hidden select-none ${
        pendingPlacement ? 'cursor-crosshair' : ''
      }`}
    >
      {/* Main Viewport Slot */}
      <div
        className="absolute inset-0 flex items-center justify-center bg-[#d4e2ea]"
        onClick={(e) => {
          if (e.target === e.currentTarget && !useStudioStore.getState().pendingPlacement) {
            selectObject(null);
            onBackgroundClick?.();
          }
        }}
      >
        {!pipSwapped ? (
          <View index={2} visible={!isExporting} className="w-full h-full">
            <DirectorViewContent
              directorViewOutRef={directorViewLiveRef}
              onBackgroundClick={onBackgroundClick}
              onShiftDuplicatingChange={setIsShiftDuplicating}
            />
          </View>
        ) : (
          <div
            className={`relative max-w-full max-h-full h-full ${monitorAspectCss} border border-white/60 overflow-hidden`}
          >
            <View index={2} visible={!isExporting} className="w-full h-full">
              <ShotCameraViewContent
                onBridgeReady={(b) => {
                  exportBridgeRef.current = b;
                }}
              />
            </View>
            <CinemaHudOverlay
              shotName={shot.name}
              focalLength={Math.round(camEval.focalLength)}
              aspectRatio={shot.aspectRatio}
              channel={channel}
              timecode={formatTimecode(currentTime, shot.fps)}
              fps={shot.fps}
              isPlaying={isPlaying}
              isRecording={isRecordingCamera}
              isMain
              language={language}
              onSnapView={() =>
                applyDirectorViewAsKeyframe(
                  directorViewLiveRef.current.position,
                  directorViewLiveRef.current.target
                )
              }
              onSwap={togglePipSwap}
            />
          </div>
        )}
      </div>

      {/* Floating PiP Window (Bottom-Right) */}
      <div
        ref={pipSlotRef}
        className={`absolute bottom-4 right-4 z-20 pointer-events-none rounded-2xl border border-white/80 bg-transparent shadow-2xl overflow-hidden flex items-center justify-center ${
          shot.aspectRatio === '9:16' && !pipSwapped
            ? 'w-40 h-68'
            : 'w-76 h-44'
        }`}
      >
        {!pipSwapped ? (
          <div className={`relative max-w-full max-h-full w-full ${monitorAspectCss} overflow-hidden`}>
            <View index={4} visible={!isExporting} className="w-full h-full">
              <ShotCameraViewContent
                onBridgeReady={(b) => {
                  exportBridgeRef.current = b;
                }}
              />
            </View>
            <CinemaHudOverlay
              shotName={shot.name}
              focalLength={Math.round(camEval.focalLength)}
              aspectRatio={shot.aspectRatio}
              channel={channel}
              timecode={formatTimecode(currentTime, shot.fps)}
              fps={shot.fps}
              isPlaying={isPlaying}
              isRecording={isRecordingCamera}
              isMain={false}
              language={language}
              onSnapView={() =>
                applyDirectorViewAsKeyframe(
                  directorViewLiveRef.current.position,
                  directorViewLiveRef.current.target
                )
              }
              onSwap={togglePipSwap}
            />
          </div>
        ) : (
          <div className="relative w-full h-full">
            <View index={4} visible={!isExporting} className="w-full h-full">
              <DirectorViewContent
                directorViewOutRef={directorViewLiveRef}
                onBackgroundClick={onBackgroundClick}
                onShiftDuplicatingChange={setIsShiftDuplicating}
              />
            </View>
            <div className="pointer-events-none absolute top-1.5 left-2 z-30 glass-dark-pill px-2 py-0.5 rounded-full text-[10px] font-mono text-zinc-200">
              DIRECTOR
            </div>
            <button
              onClick={togglePipSwap}
              title={language === 'en' ? 'Swap with Main Viewport' : '与主视口对调'}
              className="pointer-events-auto absolute top-1.5 right-1.5 z-30 p-1.5 rounded-full glass-dark-pill hover:bg-slate-800/80 text-zinc-100 transition"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Single Shared WebGL Canvas (renders above backgrounds, below HUDs) */}
      <Canvas
        shadows={graphicsQuality !== 'low'}
        dpr={graphicsQuality === 'low' ? 1 : graphicsQuality === 'medium' ? [1, 1.5] : [1, 2]}
        eventSource={containerRef}
        gl={{
          antialias: graphicsQuality !== 'low',
          powerPreference: 'high-performance',
        }}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}
      >
        <ViewportClearController pipSlotRef={pipSlotRef} />
        <ViewportWarmupController onReady={onViewportWarmReady} />
        <View.Port />
      </Canvas>

      {/* Peer Active Drag Lock Notice */}
      {lockedByPeerOuter && (
        <div
          data-testid="collab-lock-pill"
          className="pointer-events-none absolute top-14 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-full glass-dark-pill text-sky-200 border-sky-400/50 text-xs font-medium flex items-center gap-2"
        >
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: lockedByPeerOuter.color }}
          />
          {language === 'en'
            ? `${lockedByPeerOuter.name} is dragging this item (locked)`
            : `${lockedByPeerOuter.name} 正在拖拽此物体，已临时锁定防冲突`}
        </div>
      )}

      {/* Shift + Drag Duplicate Status Pill */}
      {isShiftDuplicating && (
        <div
          data-testid="shift-duplicate-pill"
          className="pointer-events-none absolute top-14 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-full glass-dark-pill text-amber-300 border-amber-400/50 text-xs font-medium flex items-center gap-2"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          {language === 'en'
            ? 'Shift Duplicate active · Drag to target and release'
            : '已按住 Shift 原地复制 · 拖动至目标位置松手完成摆放'}
        </div>
      )}

      {/* Deterministic Export Progress Overlay */}
      {isExporting && (
        <div className="absolute inset-0 z-50 bg-[#0B0C0E]/90 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
          <div className="text-sm font-medium text-zinc-100">
            {language === 'en'
              ? `Rendering & encoding WebM (${shot.aspectRatio}) frame-by-frame...`
              : `正在按 ${shot.aspectRatio} 画幅逐帧同步角色动作并编码 WebM 视频...`}
          </div>
          <div className="w-72 h-1.5 bg-[#22252D] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#EAB308] transition-all duration-100"
              style={{ width: `${Math.round(exportProgress * 100)}%` }}
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-[#EAB308]">
              {Math.round(exportProgress * 100)}%
            </span>
            <button
              onClick={() => exportAbortRef.current?.abort()}
              className="px-3 py-1 rounded-full bg-white/10 hover:bg-rose-500/80 text-white text-xs font-medium transition"
            >
              {language === 'en' ? 'Cancel Export' : '取消导出'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

DualViewport.displayName = 'DualViewport';

/* ---------------- Cinema Monitor HUD Overlay ---------------- */
interface CinemaHudProps {
  shotName: string;
  focalLength: number;
  aspectRatio: string;
  channel: string;
  timecode: string;
  fps: number;
  isPlaying: boolean;
  isRecording: boolean;
  isMain: boolean;
  language: 'zh' | 'en';
  onSnapView: () => void;
  onSwap: () => void;
}

const CinemaHudOverlay: React.FC<CinemaHudProps> = ({
  shotName,
  focalLength,
  aspectRatio,
  channel,
  timecode,
  fps,
  isPlaying,
  isRecording,
  isMain,
  language,
  onSnapView,
  onSwap,
}) => (
  <div className="pointer-events-none absolute inset-0 z-30">
    {/* Safe Frame */}
    <div className="absolute inset-3 border border-white/15" />

    {/* Rule of Thirds Grid */}
    <div className="absolute inset-x-0 top-1/3 h-px bg-white/10" />
    <div className="absolute inset-x-0 top-2/3 h-px bg-white/10" />
    <div className="absolute inset-y-0 left-1/3 w-px bg-white/10" />
    <div className="absolute inset-y-0 right-1/3 w-px bg-white/10" />

    {/* Top-Left: REC + Shot */}
    <div className="absolute top-1.5 left-2 flex items-center gap-1.5 bg-black/65 px-1.5 py-0.5 rounded text-[10px] font-mono text-zinc-200">
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isRecording
            ? 'bg-red-500 animate-ping'
            : isPlaying
            ? 'bg-red-500 animate-pulse'
            : 'bg-red-500/80'
        }`}
      />
      <span>{isRecording ? 'LIVE REC' : 'MON'}</span>
      <span className="text-[#EAB308]">{shotName}</span>
      <span className="text-zinc-400">{fps}P</span>
    </div>

    {/* Top-Right: Snap Director View + Swap Button */}
    <div className="pointer-events-auto absolute top-1.5 right-1.5 flex items-center gap-1">
      {!isMain && (
        <button
          onClick={onSnapView}
          title={
            language === 'en'
              ? 'Save Director view as Camera Keyframe'
              : '将当前导演视角记为镜头关键帧'
          }
          className="p-1 rounded bg-[#121418]/85 hover:bg-sky-600 text-zinc-200 border border-[#22252D] transition"
        >
          <Camera className="w-3 h-3" />
        </button>
      )}
      <button
        onClick={onSwap}
        title={
          isMain
            ? language === 'en'
              ? 'Return to PiP'
              : '切回画中画'
            : language === 'en'
              ? 'Swap Monitor & Director View'
              : '与主视口对调大小'
        }
        className="p-1 rounded bg-[#121418]/85 hover:bg-[#22252D] text-zinc-200 border border-[#22252D] transition"
      >
        <ArrowLeftRight className="w-3 h-3" />
      </button>
    </div>

    {/* Bottom-Left: Focal Length + Aspect */}
    <div className="absolute bottom-1.5 left-2 flex items-center gap-1.5 bg-black/65 px-1.5 py-0.5 rounded text-[10px] font-mono">
      <span className="text-[#38BDF8] font-semibold">{focalLength}mm</span>
      <span className="text-zinc-400">{aspectRatio}</span>
    </div>

    {/* Bottom-Right: Timecode + Channel */}
    <div className="absolute bottom-1.5 right-2 flex items-center gap-1.5 bg-black/65 px-1.5 py-0.5 rounded text-[10px] font-mono text-zinc-300">
      <span>{timecode}</span>
      <span className="text-[#EAB308]">{channel.toUpperCase()}</span>
    </div>
  </div>
);
