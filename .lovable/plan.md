# 自动创建智能体 · 全流程设计（修订版 v2）

## 一、入口衔接
- `CreatePage` 点「立即生成」→ `navigate("/create-agent", { state: { description, autoStart: true } })`。
- `CreateAgentPage` 检测到 `autoStart`，将需求作为首条用户消息插入对话，自动触发 AI 第一轮"需求澄清"。

## 二、布局（保持两栏）

```text
┌─────────────────────────┬──────────────────────────┐
│ 左：对话流（澄清 + 装配卡）│ 右：智能体配置面板（实时同步）│
└─────────────────────────┴──────────────────────────┘
```

复用现有 `CreateAgentPage` 两栏结构，所有装配过程作为消息卡片在左侧时间线中出现。

## 三、对话主流程

### 阶段 1 · 需求澄清（最多 1~2 轮）
- AI 用 `AIStatusPill`（"分析需求…"）后输出 2~4 个澄清问题。
- 用户回答后 AI 回复"我将为你装配如下能力"预览，点「确认装配」进入阶段 2。
- 也可「跳过，使用默认理解」。

### 阶段 2 · 自动拼装（一次性给齐 System Prompt + MCP + Skill + 子智能体）

按顺序在对话流中以卡片形式展示，**右侧配置面板同步更新**：

1. **基础信息卡**（自动填，可点笔编辑）
   - 名称（需求摘要生成）／分类（命中 `categories`）／模型默认 `claude-sonnet`／版本 `v0.0.1`（始终隐藏版本切换）。

2. **System Prompt 卡** — 默认收起前 6 行，"展开 / 编辑 / 重新生成"。

3. **MCP 装配卡**（重点 1）
   - AI 按需求语义匹配 Top-N，按 `requiresCredential` 分两组：
     - ✅ **免凭据**：默认勾选，标"开箱即用"。
     - 🔑 **需凭据**：默认勾选 + 红点"待配置凭据"，行尾按钮 **「去 MCP 配置 ↗」→ 跳转 `/mcp` 管理页**。
   - **「+ 添加 MCP」按钮 → 复用 `CapabilityPickerDialog`**（与之前手动装配一致的卡片）。

4. **Skill 装配卡**
   - 同上结构，**「+ 添加 Skill」→ 复用同一个 `CapabilityPickerDialog`**（Skill tab）。

5. **子智能体卡**（默认展开，不折叠）
   - AI 推荐 0~N 个；「+ 添加子智能体」复用现有选择器。

6. **收尾**：对话流末尾出现 AI 消息 + 两个按钮：
   - 「**保存**」：直接保存智能体（状态 `ready` 或 `pending_credentials`）。
   - 「立即调试」：进入 `AgentDetail`；若有未配置凭据，行内提示但不阻塞。

> 不再有"总结卡"。

## 四、凭据配置（重点 2 · 简化）
- **不在当前页做表单**。
- 需凭据 MCP 行尾按钮：「去 MCP 配置 ↗」，点击 `navigate("/mcp")` 跳到 MCP 管理页。
- 配置完成回到本页，通过 `subscribeMcpStore` 自动刷新红点 → 绿勾。

## 五、Downscale 与展示逻辑（重点 3）
触发条件（任一）：
- MCP + Skill 数量 > 8
- System Prompt > 4k tokens
- 命中"重型"MCP 但需求是轻量场景

展示：
- 装配卡顶部出现 `Downscale 提示条`：浅黄底 + ⚡ "为保证响应速度，已为你精简到 N 项核心能力"。
- 「查看被精简的 K 项」抽屉：列出剔除项 + 原因，每项可「仍要加入」捞回。
- 用户手动捞回后，提示条变为"已自定义，不再自动精简"。

## 六、版本（Version）

**只要还在本调试页（`/create-agent`），就不支持多版本，全程固定 `v0.0.1`：**
- 隐藏版本切换器、"新建版本"按钮。
- 用户的所有修改、重新装配、重生成 System Prompt 等操作都只更新当前这一版，不产生新版本号。
- 多版本概念仅在后续真实运行/发布之后的 `AgentDetail` 详情页出现（与本流程无关）。

## 七、状态机

```text
created(无凭据) ──去 MCP 配凭据──▶ ready ──发布──▶ published(项目/广场)
       ▲                              │
       └──────── 编辑装配 ────────────┘
```

## 八、需要研发确认的点
1. MCP 凭据状态变更后如何回流（事件/轮询/store 订阅）。
2. Downscale 判定逻辑放前端还是 AI 网关返回 `kept[] / dropped[] + reason`。
3. 自动装配是单次 AI 调用还是多步 function calling（影响 `AIStatusPill` 阶段粒度）。
4. 「去 MCP 配置」跳转后是否带 `returnTo` 让用户一键回流。

---

## 实施改动概览
- `CreatePage.tsx`：传 `autoStart`。
- `CreateAgentPage.tsx`：保持两栏，左侧增加阶段卡片渲染，隐藏所有版本相关 UI。
- 新增：`AssemblyBasicCard`、`SystemPromptCard`、`McpAssemblyCard`、`SkillAssemblyCard`、`SubAgentAssemblyCard`、`DownscaleNotice`。
- 复用：`CapabilityPickerDialog`、`AIStatusPill`、`mcpCredentialStore`。
- 数据：`mockData` 增加 `downscaleResult` mock。

确认后我按此实现。