
# 计划：统一聊天输入组件 + 产物看板抽屉

## 一、统一 ChatComposer 组件（语音 + 文件上传）

### 1.1 新建 `src/components/ChatComposer.tsx`
一个受控组件，替换现有所有"聊天输入框"，统一交互。

**Props**
- `value / onChange` — 文本受控
- `onSend(payload: { text, attachments })` — 发送回调
- `placeholder?`
- `disabled?` / `isStreaming?`
- `enableVoice?` (默认 true)
- `enableAttachment?` (默认 true)
- `accept?` — 默认 `image/*,application/pdf,.md,.txt,.docx,.xlsx,.csv,.json,.zip`
- `maxFiles?` — 默认 10
- `maxSize?` — 默认 20MB
- `extraSlot?` — 右下角左侧自定义按钮（如"技能 / 全能"chip）

**内部结构**
```
┌─ 附件气泡区（有附件时显示）─────────────┐
│  [🖼 cover.png 1.2MB ✕]  [📄 spec.pdf 800KB ✕]  │
└──────────────────────────────────────┘
┌─ 录音条（录音中显示）─────────────────┐
│  ● 00:12  ▁▃▅▇▅▃▁ (waveform)   ✕ ✓  │
└──────────────────────────────────────┘
┌─ Textarea ──────────────────────────┐
│  请输入你的需求，按 Enter 发送          │
│  [📎] [🎙] [extraSlot]      [↑发送]  │
└──────────────────────────────────────┘
```

**交互细节**
- 📎 按钮 → 调 `<input type="file" multiple>`；同时整个 textarea 区域支持拖拽（dragover 高亮边框）
- 上传中：附件气泡显示一个细进度条（mock 用 setInterval 0→100）
- 单文件 >20MB 或 总数 >10 → 红色 toast「单文件 ≤ 20MB / 单次最多 10 个」
- 图片附件显示缩略图（FileReader → dataURL），其他显示文件类型图标 + 文件名 + 大小
- 🎙 点击开始录音 → 进入录音条状态：模拟波形（随机柱状）+ 计时器；再次点击 ✓ 停止 → 调 mock ASR（setTimeout 1.5s）→ 转写文本回填到 textarea，用户可编辑后再发送；点 ✕ 取消录音
- Enter 发送 / Shift+Enter 换行；发送时把 attachments 一起 emit，清空内部状态

### 1.2 消息气泡的附件渲染
在 `RunViews.tsx` 和 `ChatPage.tsx` 等渲染消息的位置：
- 用户消息：文本气泡下方追加附件子气泡卡片
  - 图片：点击放大（用现有 Dialog 做 lightbox）
  - 文件：显示图标 + 名称 + 大小 + ⬇下载按钮（mock：toast）

### 1.3 接入点（替换现有 textarea）
- `src/pages/ChatPage.tsx` — 智能体广场会话
- `src/components/RunViews.tsx` — 智能体详情会话（含历史会话继续对话）
- `src/pages/CreateAgentPage.tsx` step 3 调试对话
- `src/pages/CreateAgentManualPage.tsx` step 5 调试对话
- `src/pages/CreateWebPage.tsx` — 网页生成对话
- `src/pages/CreateSkillPage.tsx` — Skill 创建对话

不接入：`AgentDetail` 顶部搜索框这种非"对话"输入。

## 二、产物看板（Artifacts Drawer）

参考截图，做成右侧抽屉，按需打开，包含"当前进程 / 文件"两个 Tab + 文件夹树 + 右侧预览。

### 2.1 入口
- 在所有"会话视图"右上角加 `<Button>📁 产物</Button>`（次按钮）
- 出现位置：`ChatPage`、`RunViews`、`CreateAgentPage`/`CreateAgentManualPage` 的调试会话区
- 点击 → 打开右侧 Sheet（用 shadcn `Sheet`，宽度 ~720px）

### 2.2 新建 `src/components/ArtifactsDrawer.tsx`

**布局**（与截图一致）
```
┌─ Sheet Header ─────────────────────────┐
│  当前进程 | 文件                    [✕] │  ← Tab 切换
├────────────────────┬───────────────────┤
│ 文件          [⬇]   │                   │
│ ┌──────────────┐   │                   │
│ │ 搜索文件...   │   │   选择要查看的文件   │
│ └──────────────┘   │   （预览区）         │
│  ▸ imgs/          │                   │
│  ▸ reports/       │                   │
│   • summary.md    │                   │
│   • data.csv      │                   │
└────────────────────┴───────────────────┘
```

**两个 Tab**
- **当前进程**：当前任务实时产物时间线（按生成顺序，含 tool 来源）。复用现有 `AgentLogsPanel` 风格的 mini 时间线
- **文件**：文件夹树 + 搜索 + 右侧预览（截图样式）

**文件树**
- 复用 `CreateSkillPage` 里的 `FileTreeNode` 思路，做成独立小组件
- 数据：从 mock `artifacts` 数组按 path 字段构建树（path 形如 `imgs/cover.png`、`reports/summary.md`）
- 顶部「⬇」按钮 = 一键打包下载（toast mock）
- 搜索框：实时过滤文件名

**预览区（按类型）**
- 未选中：占位「选择要查看的文件」
- 图片：居中显示，附下载按钮
- md / txt / json / code：等宽字体渲染（md 可后续接 react-markdown，先纯文本）
- pdf：iframe 占位卡片 + 下载
- xlsx/docx：图标卡片 + 「下载查看」按钮
- audio/video：原生 `<audio>/<video>` 播放器

### 2.3 数据与按需加载
- 在 `src/data/mockData.ts` 增加 `mockArtifacts: Artifact[]`
- `Artifact` 类型：`{ id, path, name, type, mime, size, url, preview?, createdAt, source: 'agent'|'user_upload'|'tool', toolName? }`
- ArtifactsDrawer 用 `open` 控制：关闭时不渲染内部内容（按需加载）；首次打开模拟 300ms loading skeleton

### 2.4 与上传打通
- ChatComposer 上传的文件 → 同时 push 一条 `source: 'user_upload'` 的 artifact，使其在产物看板「文件」Tab 内可见
- AI 工具产出（mock）→ push `source: 'tool', toolName: 'report_writer'`

## 三、技术细节

- 录音：先用「mock」实现（不接 MediaRecorder），波形用 12 根随机高度柱条 + `setInterval` 动效；ASR 用 `setTimeout` 返回固定文案 `"（已转写）……"` 拼接，避免权限弹窗
- 拖拽：在 ChatComposer 根节点监听 `onDragOver/onDrop`，dragover 时加 `ring-2 ring-primary/40` 高亮
- 进度条：用 shadcn `Progress`，每个附件维护 `progress: 0..100`
- 设计 token：所有颜色走 `bg-primary / bg-muted / text-foreground` 等语义 token，不写裸色

## 四、改动文件清单

新增：
- `src/components/ChatComposer.tsx`
- `src/components/ArtifactsDrawer.tsx`
- `src/components/AttachmentBubble.tsx`（气泡 + lightbox）

修改：
- `src/data/mockData.ts` — 加 `mockArtifacts`、`Artifact` 类型
- `src/pages/ChatPage.tsx`
- `src/components/RunViews.tsx`
- `src/pages/CreateAgentPage.tsx`
- `src/pages/CreateAgentManualPage.tsx`
- `src/pages/CreateWebPage.tsx`
- `src/pages/CreateSkillPage.tsx`

## 五、不在本轮范围
- 真实 MediaRecorder / 真实 ASR 接入
- 真实文件上传后端
- AI 推荐 Proposal 三档分层等 P0 项（之前讨论的）—— 留到下一轮
