import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ApiConfigModal } from './components/ui/ApiConfigModal';
import { CollabChatWidget } from './components/ui/CollabChatWidget';
import { KeybindingsModal } from './components/ui/KeybindingsModal';
import { PreloadScreen } from './components/ui/PreloadScreen';
import { SettingsModal } from './components/ui/SettingsModal';
import { LeftPanel, type FloatingDrawerTab } from './components/ui/LeftPanel';
import { RightInspector } from './components/ui/RightInspector';
import { ShortcutHintsOverlay } from './components/ui/ShortcutHintsOverlay';
import { TimelineBar } from './components/ui/TimelineBar';
import { TopBar } from './components/ui/TopBar';
import {
  DualViewport,
  type DualViewportHandle,
} from './components/viewport/DualViewport';
import {
  runAssetAndEnginePreload,
  type PreloadProgressState,
} from './engine/preloadManager';
import { collabManager } from './collab/collabManager';
import { useStudioStore } from './store/useStudioStore';

export const App: React.FC = () => {
  const viewportRef = useRef<DualViewportHandle>(null);
  const [apiModalOpen, setApiModalOpen] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState<FloatingDrawerTab>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);

  const [preloadState, setPreloadState] = useState<PreloadProgressState>({
    progress: 4,
    stageTitle: '读取本地 IndexedDB 片场存档',
    stageDetail: '初始化工程配置与历史分镜数据...',
    warmedVariants: 0,
    totalVariants: 0,
    materialsReady: false,
    viewportReady: false,
  });
  const [enginePreloadDone, setEnginePreloadDone] = useState(false);
  const [fadingOutPreload, setFadingOutPreload] = useState(false);
  const [preloadOverlayMounted, setPreloadOverlayMounted] = useState(true);

  const initialized = useStudioStore((s) => s.initialized);
  const language = useStudioStore((s) => s.language);
  const initFromStorage = useStudioStore((s) => s.initFromStorage);
  const selectedId = useStudioStore((s) => s.selectedId);

  const dismissPreloadOverlay = useCallback(() => {
    const isEn = useStudioStore.getState().language === 'en';
    setPreloadState((prev) => ({
      ...prev,
      progress: 100,
      stageTitle: isEn
        ? 'Studio assets preloaded — launching workspace...'
        : '片场资源预加载完成，正在进入工作台...',
      stageDetail: isEn
        ? 'All asset thumbnails & WebGL pipelines ready'
        : '全部资产缩略图与 WebGL 管线已就绪',
      viewportReady: true,
    }));
    setFadingOutPreload(true);
    window.setTimeout(() => {
      setPreloadOverlayMounted(false);
    }, 320);
  }, []);

  useEffect(() => {
    document.title =
      language === 'en'
        ? 'AI 3D Previs Studio — 3D Blockout Previs'
        : 'AI 3D Previs Studio — 白模预演片场';
  }, [language]);

  useEffect(() => {
    let cancelled = false;
    collabManager.initFromUrlIfPresent();
    (async () => {
      await initFromStorage();
      if (cancelled) return;
      await runAssetAndEnginePreload((patch) => {
        if (cancelled) return;
        setPreloadState((prev) => ({ ...prev, ...patch }));
      });
      if (!cancelled) {
        setEnginePreloadDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initFromStorage]);

  const handleViewportWarmReady = useCallback(() => {
    const isEn = useStudioStore.getState().language === 'en';
    setPreloadState((prev) => ({
      ...prev,
      viewportReady: true,
      progress: Math.max(prev.progress, 94),
      stageTitle: isEn ? 'First Frame Ready' : '首帧渲染就绪',
      stageDetail: isEn
        ? '3D viewport and lighting shaders warmed'
        : '3D 视口与光影管线完成首帧预热',
    }));
  }, []);

  // Automatically transition into the studio once both engine preload & WebGL warmup finish
  useEffect(() => {
    if (!enginePreloadDone || !preloadOverlayMounted || fadingOutPreload) return;
    if (preloadState.viewportReady) {
      const isEn = useStudioStore.getState().language === 'en';
      setPreloadState((prev) => ({
        ...prev,
        progress: 100,
        stageTitle: isEn
          ? 'Studio assets preloaded — launching workspace...'
          : '片场资源预加载完成，正在进入工作台...',
        stageDetail: isEn
          ? 'All asset thumbnails & WebGL pipelines ready'
          : '全部资产缩略图与 WebGL 管线已就绪',
      }));
      const t = window.setTimeout(() => dismissPreloadOverlay(), 280);
      return () => window.clearTimeout(t);
    }
    // Safety fallback if WebGL driver delays first compile callback
    const fallbackTimer = window.setTimeout(() => {
      dismissPreloadOverlay();
    }, 3200);
    return () => window.clearTimeout(fallbackTimer);
  }, [
    enginePreloadDone,
    preloadState.viewportReady,
    preloadOverlayMounted,
    fadingOutPreload,
    dismissPreloadOverlay,
  ]);

  // Automatically open floating inspector when an object/camera is selected, and close it when deselected (e.g. clicking background / Esc)
  useEffect(() => {
    setInspectorOpen(Boolean(selectedId));
  }, [selectedId]);

  const handleExportVideo = async (
    channelOverride?: Parameters<DualViewportHandle['exportVideo']>[0]
  ) => {
    if (!viewportRef.current) return;
    try {
      await viewportRef.current.exportVideo(channelOverride);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('已取消') && !msg.toLowerCase().includes('cancel')) {
        alert(language === 'en' ? `Export failed: ${msg}` : `导出失败：${msg}`);
      }
    }
  };

  return (
    <div className="relative w-screen h-screen bg-[#d4e2ea] text-slate-800 overflow-hidden">
      {initialized && (
        <>
          {/* Full-Bleed Edge-to-Edge 3D Canvas + PiP Monitor */}
          <main className="absolute inset-0">
            <DualViewport
              ref={viewportRef}
              onBackgroundClick={() => setInspectorOpen(false)}
              onViewportWarmReady={handleViewportWarmReady}
            />
          </main>

          {/* Top Floating Pill HUDs */}
          <TopBar
            onExportVideo={handleExportVideo}
            shotsDrawerOpen={activeDrawer === 'shots'}
            onToggleShotsDrawer={() =>
              setActiveDrawer((d) => (d === 'shots' ? null : 'shots'))
            }
          />

          {/* Left Vertical Rail + Expandable Floating Drawers + Bottom-Center AI Bar */}
          <LeftPanel
            activeDrawer={activeDrawer}
            onChangeDrawer={setActiveDrawer}
            inspectorOpen={inspectorOpen}
            onToggleInspector={() => setInspectorOpen((v) => !v)}
            timelineOpen={timelineOpen}
            onToggleTimeline={() => setTimelineOpen((v) => !v)}
          />

          {/* Floating Right Inspector Drawer */}
          {inspectorOpen && (
            <RightInspector
              onClose={() => setInspectorOpen(false)}
              onMatchDirectorView={() => viewportRef.current?.matchShotToDirectorView()}
              onFocusShotCamera={() => viewportRef.current?.focusDirectorOnShotCamera()}
            />
          )}

          {/* Floating Bottom Timeline Scrubber */}
          {timelineOpen && (
            <TimelineBar
              onClose={() => setTimelineOpen(false)}
              onMatchDirectorView={() => viewportRef.current?.matchShotToDirectorView()}
              onGetShotCamera={() =>
                viewportRef.current?.getShotCameraState() ?? {
                  position: [0, 2, 7],
                  target: [0, 1, 0],
                  focalLength: 35,
                }
              }
            />
          )}

          {/* Subtle Low-Opacity Keyboard & Mouse Hints Overlay */}
          <ShortcutHintsOverlay />

          <CollabChatWidget inspectorOpen={inspectorOpen} />

          <KeybindingsModal />

          <SettingsModal onOpenApiModal={() => setApiModalOpen(true)} />

          <ApiConfigModal open={apiModalOpen} onClose={() => setApiModalOpen(false)} />
        </>
      )}

      {preloadOverlayMounted && (
        <PreloadScreen
          state={preloadState}
          initialized={initialized}
          fadingOut={fadingOutPreload}
          onEnterNow={dismissPreloadOverlay}
        />
      )}
    </div>
  );
};

export default App;
