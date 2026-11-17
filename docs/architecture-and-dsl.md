# 白模世界与AI运镜视频生成平台 — 系统架构与 DSL 规范

## 1. 核心定位与解决的痛点

当前 AI 生视频存在两大核心痛点：
1. **结构抽卡与场景崩坏**：纯文本或单图生视频缺乏三维空间约束，镜头一动就容易出现透视错乱、建筑融化、人物比例失真。
2. **白模资产无法沉淀**：每次做新分镜都要重新让 AI 生成一次白模，无法在同一个连续世界中多机位拍摄。

**平台核心理念**：**「持久化 3D 白模世界」 + 「大模型语义化建造」 + 「手动/AI 协同运镜」 + 「多通道控制信号导出」**。
- **世界只需建造一次，并可无限扩建**：场景、地形、建筑、人偶全部以结构化场景图持久保存。
- **一景多拍**：在同一世界内自由架设多条运镜轨道，快速导出不同分镜的白模视频与控制通道（Depth / Normal / Edge）。

---

## 2. 总体技术架构

```text
+-------------------------------------------------------------------------+
|                           前端 Web 3D 工作台                              |
|  React 19 + TypeScript + Vite + Zustand (含 Undo/Redo 历史栈)            |
|                                                                         |
|  +-----------------------+  +-------------------+  +-----------------+  |
|  |   3D 视口与交互层      |  |  运镜与时间轴层    |  |  AI 对话与指令台 |  |
|  |  React Three Fiber    |  |  Catmull-Rom 轨道  |  |  自然语言 -> DSL |  |
|  |  TransformControls    |  |  FOV / LookAt 关键帧|  |  增量 Patch 预览 |  |
|  |  地形笔刷 / 参数化构件 |  |  双视口(上帝/机位)  |  |  运镜导演助手    |  |
|  +-----------+-----------+  +---------+---------+  +--------+--------+  |
|              |                        |                     |           |
|  +-----------v------------------------v---------------------v--------+  |
|  |                  多通道离屏渲染与导出管线 (Multi-Pass)              |  |
|  |  [1] Clay 白模   [2] Linear Depth   [3] Normal   [4] Edge 线稿    |  |
|  |  导出: WebM/MP4 (WebCodecs/MediaRecorder) / PNG 序列 / 相机 JSON   |  |
|  +-------------------------------------------------------------------+  |
+------------------------------------+------------------------------------+
                                     | REST / SSE (JSON Patch / DSL)
+------------------------------------v------------------------------------+
|                           AI 编排后端服务                                |
|  Node.js (Fastify) 或 Python (FastAPI)                                  |
|                                                                         |
|  +--------------------+  +--------------------+  +-------------------+  |
|  |  LLM 统一网关       |  |  场景状态压缩器     |  |  空间校验与修复器  |  |
|  |  OpenAI / Gemini / |  |  提取场景摘要 &     |  |  碰撞/贴地/防穿模  |  |
|  |  Claude / DeepSeek |  |  BBox 供 AI 感知    |  |  相机视线遮挡检测  |  |
|  +--------------------+  +--------------------+  +-------------------+  |
+-------------------------------------------------------------------------+
```

### 2.1 技术栈选型理由
| 模块 | 选型 | 理由 |
| :--- | :--- | :--- |
| **3D 渲染引擎** | Three.js + `@react-three/fiber` + `@react-three/drei` | 生态最成熟，自定义 Shader（Depth/Normal/Edge）与离屏渲染（`WebGLRenderTarget`）极易实现。 |
| **状态管理** | Zustand + Immer + Zundo | 支持高频率 3D 拖拽更新，天然支持操作撤销/重做（Undo/Redo）与 JSON 序列化存档。 |
| **视频编码导出** | WebCodecs API / `mp4-muxer`（降级 `MediaRecorder`） | 可在浏览器端按固定帧率（如 24fps / 30fps）逐帧精确渲染并合成 MP4，不掉帧、音画/通道帧级对齐。 |
| **AI 编排后端** | FastAPI (Python) 或 Fastify (Node.js) | 负责保护 API Key、组装 System Prompt、强校验 LLM 返回的 JSON Schema（Structured Outputs）。 |

---

## 3. 核心世界数据模型 (World Schema)

世界数据采用**语义化场景图（Semantic Scene Graph）**，单位统一为**米（m）**，坐标系采用 Three.js 标准右手系（`Y` 轴向上）。

```json
{
  "version": "1.0.0",
  "meta": {
    "id": "world_cyber_alley_01",
    "name": "赛博雨夜后巷",
    "unit": "meter"
  },
  "environment": {
    "skyPreset": "overcast_day",
    "fog": { "enabled": true, "near": 25, "far": 120 },
    "sunDirection": [30, 50, 20],
    "groundSize": [200, 200]
  },
  "terrain": {
    "mode": "heightmap",
    "resolution": 64,
    "baseHeight": 0,
    "modifiers": [
      { "type": "hill", "center": [-30, -40], "radius": 25, "height": 8 },
      { "type": "flatten", "bounds": [-15, -15, 15, 15], "height": 0 }
    ]
  },
  "nodes": [
    {
      "id": "bldg_left_01",
      "category": "building",
      "name": "左侧公寓楼",
      "prefab": "parametric_building",
      "transform": {
        "position": [-8, 0, 0],
        "rotation": [0, 0, 0],
        "scale": [1, 1, 1]
      },
      "params": {
        "width": 6,
        "depth": 14,
        "floors": 4,
        "floorHeight": 3.2,
        "roofType": "flat_with_parapet",
        "windowGrid": [3, 4]
      },
      "bounds": { "min": [-11, 0, -7], "max": [-5, 12.8, 7] }
    }
  ],
  "actors": [
    {
      "id": "hero_01",
      "name": "主角木偶",
      "height": 1.75,
      "pose": "walk",
      "waypoints": [
        { "t": 0.0, "position": [0, 0, 10], "rotationY": 3.14 },
        { "t": 5.0, "position": [0, 0, -5], "rotationY": 3.14 }
      ]
    }
  ],
  "shots": [
    {
      "id": "shot_intro",
      "name": "开场低角度推进",
      "duration": 5.0,
      "fps": 24,
      "keyframes": [
        { "t": 0.0, "pos": [2, 1.0, 14], "lookAt": [0, 1.4, 8], "fov": 35, "easing": "easeInOut" },
        { "t": 5.0, "pos": [-1.5, 1.8, 0], "lookAt": [0, 1.5, -5], "fov": 45, "easing": "easeInOut" }
      ]
    }
  ]
}
```

---

## 4. AI 自动化建世界协议 (World-Building DSL)

**核心设计原则**：大模型不直接生成底层三角面（Mesh Vertices），而是通过 **工具调用（Function Calling）** 输出**增量式建造指令（Operations）**。这样既节省 Token，又能保证模型几何拓扑合法、可随时手动拖拽修改。

### 4.1 建造操作指令集 (World Operations)

LLM 每次响应返回一个 `operations` 数组，前端按顺序执行并压入 Undo 栈：

| 操作类型 (`op`) | 用途 | 关键参数 |
| :--- | :--- | :--- |
| `set_environment` | 设置环境与光照/雾效 | `skyPreset`, `sunDirection`, `fog` |
| `sculpt_terrain` | 地形塑形 | `brush`: `raise \| lower \| flatten \| canyon \| road`, `center`, `radius`, `strength` |
| `spawn_primitive` | 生成基础几何体白模 | `shape`: `box \| cylinder \| sphere \| cone \| arch \| stairs \| ramp`, `size`, `placement` |
| `spawn_building` | 生成参数化建筑 | `width`, `depth`, `floors`, `floorHeight`, `roofType`, `balcony`, `windowGrid` |
| `scatter_assets` | 区域/沿线批量散布 | `prefab`: `tree \| street_lamp \| pillar \| crate \| rock`, `area` 或 `path`, `count`, `seed` |
| `place_actor` | 放置白模人偶及动作 | `id`, `height`, `pose`: `idle \| walk \| run \| sit \| crouch \| fight`, `waypoints` |
| `update_node` | 修改已有物体属性/位置 | `targetId`, `transform` / `params` |
| `delete_node` | 删除指定物体 | `targetId` |

### 4.2 语义化空间定位 (`placement`)
为了避免大模型算不准坐标而出现“悬空”或“穿模”，DSL 支持**相对空间约束**，由前端引擎自动解析为精确的世界坐标 `[x, y, z]`：
- `snapToGround: true`：自动贴合当前位置地形高度 `terrain.getHeightAt(x, z)`。
- `relativeTo: { targetId: "bldg_left_01", relation: "right_of | in_front_of | on_top_of", gap: 2.0 }`：基于目标物体的包围盒（BBox）自动计算不重叠的摆放位置。

---

## 5. 手动 + AI 协同运镜系统

### 5.1 手动运镜工作流
- **所见即所得双视口**：主视口自由漫游编辑，右下角悬浮**实时摄像机取景器（Viewfinder）**，带三分线/安全框。
- **样条曲线轨道**：在 3D 空间中可视化相机运动路径（Catmull-Rom Spline），支持直接拖拽路径点与控制柄。
- **跟踪模式**：`lookAt` 支持锁定世界坐标，也支持绑定到某个 `actor.id`（例如“始终跟拍主角头部”）。

### 5.2 AI 自动导演运镜 (`generate_camera_shot`)
当用户下达运镜指令（如：“帮我设计一个 5 秒的紧张追逐镜头，从高处俯冲跟拍主角穿过巷子”）时：
1. **上下文注入**：后端将当前世界的**精简场景摘要**（所有建筑的 BBox、街道走廊空隙、主角 `waypoints` 轨迹）发送给 LLM。
2. **生成运镜 DSL**：LLM 输出相机关键帧序列（`t`, `pos`, `lookAt` / `followTarget`, `fov`, `easing`）及运镜类型标签（`dolly_in`, `orbit`, `crane_down`, `dutch_angle`）。
3. **防穿模与防遮挡校验（引擎层兜底）**：
   - 遍历采样相机轨迹上的每个时间点，检测相机位置是否落入任何物体的 BBox 内部（若穿模则沿法线推离）。
   - 射线检测（Raycasting）相机到 `lookAt` 主体之间是否被建筑遮挡，若遮挡则自动微调高度或提醒用户。

---

## 6. 多通道白模导出管线（对接下游生视频）

为确保导出的视频能稳定驱动 ComfyUI、Runway、可灵（Kling）、Veo 等模型，平台在同一帧相机矩阵下同步渲染并支持打包导出以下 4 种通道：

| 通道 | 渲染实现方式 | 下游用途 |
| :--- | :--- | :--- |
| **1. Clay（白模通道）** | 统一哑光浅灰/纯白材质 (`#e8e8e8`) + 柔和方向光阴影 + 屏幕空间环境光遮蔽 (SSAO) | 作为图生视频 / 视频转绘（V2V）的构图与光影底图 |
| **2. Depth（深度图通道）** | 自定义 Shader 输出线性归一化深度（近白远黑：`0.0 ~ 1.0`），可调 `near`/`far` 映射范围 | 驱动 ControlNet Depth / ComfyUI Depth / 空间景深控制 |
| **3. Normal（法线通道）** | 视图空间/世界空间法线着色（`MeshNormalMaterial`） | 精准保留建筑立面朝向、棱角与表面结构 |
| **4. Edge（线稿轮廓通道）** | 基于 Depth + Normal 缓冲区的 Sobel 边缘检测后处理 | 输出干净的建筑透视线稿，适合风格化/动漫转绘 |

> **帧级同步导出策略**：导出时不依赖浏览器实时帧率，而是采用**离线步进渲染（Deterministic Frame Stepping）**：锁定时间步长 `dt = 1 / fps`，逐帧推进人偶与相机动画 -> 依次渲染选中通道到离屏 `RenderTarget` -> 写入 `VideoEncoder`（或 PNG 序列）-> 打包下载 ZIP / MP4，确保**零掉帧、多通道逐帧像素级对齐**。

---

## 7. 推荐开发路线图 (Roadmap)

### Phase 1：可运行 MVP（核心闭环）
- [ ] **基础 3D 沙盒**：React Three Fiber 视口 + 地面网格 + 物体选中/移动/旋转/缩放（`TransformControls`）。
- [ ] **参数化白模库**：基础几何体 + 参数化建筑（长宽高/层数）+ 静态/行走白模人偶。
- [ ] **AI 建世界对话**：接入大模型 API，实现 `spawn_building` / `spawn_primitive` / `place_actor` 等核心 DSL。
- [ ] **运镜与双通道导出**：相机关键帧路径编辑 + Clay 白模 & Depth 深度图双通道逐帧导出 MP4/WebM。

### Phase 2：效率与导演力升级
- [ ] **地形雕刻与批量散布**：高度图地形笔刷 + 沿路/区域批量生成树林、路灯。
- [ ] **AI 自动运镜**：场景 BBox 摘要注入 + AI 生成运镜轨道 + 相机防穿模检测。
- [ ] **全通道支持**：补充 Normal 法线通道与 Sobel Edge 线稿通道，支持多通道一键打包 ZIP。
- [ ] **工程存档**：世界 JSON 导入/导出、本地 IndexedDB 自动保存、多镜头分镜管理。

### Phase 3：下游生视频工作流直连
- [ ] 内置 ComfyUI API / 主流生视频 API 模板，导出白模与 Depth 后可直接触发抽卡并在平台内对比成片。
