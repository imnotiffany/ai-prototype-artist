# 调试入口 vs 保存状态 一致性审计

全应用里所有"会跑调试"的入口都过了一遍，目前发现 **3 处需要修改**。

---

## 现状梳理

| 页面 | 调试入口 | 现状 |
|---|---|---|
| **CreateAgentPage**（自动组装 · step 3 调试） | 右侧 stepper 的"调试"页 | `hasSaved` 只有 false→true，**保存后再改配置不会重新锁** |
| **AgentDetail**（智能体管理 · 配置 → 调试 子标签） | 调试子标签的发送按钮 | `runDebug` 只判断 `debugRunning / 空输入`，**完全没有 dirty 门禁**，顶部黄条只起提示作用 |
| **CreateAgentManualPage**（手动拼装） | step 5 调试 | 流程顺序不合理：能力配完不保存就直接进对外接入和调试，并且头部"保存草稿/发布"两个按钮职责混杂 |
| 智能体管理 · 会话记录 · 新建会话（跳 `/chat/:id`） | — | 走的是已保存 agent 数据，天然安全 ✅ |

---

## 修改方案

### 1. `AgentDetail`（智能体管理 · 配置）

复用现有 `isDirty`：

- 切到「调试」子标签：`isDirty` 时按钮 disabled，title 提示「请先保存配置后再调试」。
- 调试面板顶部加一条警示条「配置已修改，未保存。<保存> 后才能调试」，按钮复用 `handleSave`。
- 调试输入框 & 发送按钮：`isDirty` 时全部 disabled。
- `runDebug` 入口加 `if (isDirty) return` 兜底。

### 2. `CreateAgentPage`（自动组装）

让 `hasSaved` 真正能反映 dirty：

- 新增 `savedConfigSnapshot: AgentConfig | null`，在保存确认（line 1726）处 `setSavedConfigSnapshot(structuredClone(agentConfig))`。
- 派生 `configDirty = hasSaved && JSON.stringify(agentConfig) !== JSON.stringify(savedConfigSnapshot)`。
- stepper "调试"按钮 disabled 条件改为 `!hasSaved || configDirty`：
  - `!hasSaved` → "请先保存配置后再调试"
  - `configDirty` → "配置已修改，请重新保存后再调试"
- 进入调试页若 `configDirty`，顶部贴提示条 + 禁用 preview 输入框 / 发送按钮，提供「保存并测试」入口。

### 3. `CreateAgentManualPage`（手动拼装）— 流程重构

按你的回答调整：

**新步骤顺序**

```
1 基础信息 → 2 能力配置(模型/MCP/Skill) → 3 系统提示词 → [保存] → 4 对外接入 → 5 调试
```

**头部按钮**

- 移除"保存草稿"按钮。
- 右上角只保留 **「发布」**，禁用条件不变（必须 step 1-3 完整 + 已保存 + 调试通过 + 对外接入凭证就绪）。

**保存按钮位置**

- 放在 **step 3「系统提示词」页面底部** 的「保存并继续」主按钮（结合"下一步"功能）；点击后：
  - 校验 step 1-3 全部完整。
  - 保存配置，存 `savedConfigSnapshot`。
  - `hasSaved = true`，跳到 step 4 对外接入。

**解锁/上锁规则**

- step 4「对外接入」、step 5「调试」的 stepper 圆点：未保存时 `locked` 灰色不可点。
- 监听 step 1/2/3 任一字段变化（name / avatar / category / model / selSkills / mcpBindings / selSubagents / systemPrompt）：
  - 重置 `hasSaved = false`、`savedConfigSnapshot = null`。
  - 重置 `debugPassed = false`、`debugAttempted = false`、`debugChanges = []`。
  - step 4/5 自动重新上锁。
  - 当前若停在 step 4/5，回弹到 step 3 并 toast「配置已修改，请重新保存」。

---

## 落地顺序（确认后我会按这个顺序改）

1. `CreateAgentManualPage` 流程重构（影响最大，先做）。
2. `AgentDetail` 调试子标签的 dirty 门禁。
3. `CreateAgentPage` 的 `savedConfigSnapshot` + dirty 检测。

如果都同意，回复"确认"或直接 Implement plan，我就开工。
