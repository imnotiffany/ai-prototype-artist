# 丰声 NEXT 机器人连接 — 状态机 + 简化弹窗 + 说明卡

## 一、状态机

把 `fsConnected: boolean` 改为 `fsStatus`：

| 状态 | 含义 | 是否阻塞保存/发布/进入调试 | 卡片徽标 |
|---|---|---|---|
| `empty` | 三字段全空 | 否 | 「未配置」灰 |
| `draft` | 任一字段已填，未点过连接 | 是 | 「未连接」灰 |
| `connecting` | 校验中 | 是 | 「连接中…」蓝 + 转圈 |
| `connected` | 校验通过 | 否 | 「已连接」绿 |
| `failed` | 校验失败 | 是 | 「连接失败」红 |

迁移规则：
- 任一 `fsAppKey / fsAppSecret / fsRobotCode` onChange：若当前是 `connected` 或 `failed` → 回退 `draft`；空字符串且其他两个也空 → `empty`
- 点击「连接」：`draft|failed` → `connecting` → 800ms 后按 Mock 规则给出 `connected`（成功）或 `failed`（失败）
  - Mock 失败条件（便于走通原型）：`fsRobotCode` 以 `_fail` 结尾，或字段长度 < 4

## 二、弹窗（统一、简洁）

`FengshengIncompleteDialog` 接收 `status`，三种文案，**统一一个主按钮「返回修改」**（关闭弹窗，让用户自己回去改/连/删），不再有「删除配置内容」「去连接」等多按钮：

| status | 标题 | 描述 | 按钮 |
|---|---|---|---|
| `draft` | 丰声 NEXT 机器人尚未连接 | 已填写凭证但未点击「连接」测试。请先连接成功，或清空凭证后再保存 / 发布。 | 返回修改 |
| `connecting` | 正在连接丰声 NEXT… | 请等待连接完成后再保存 / 发布。 | 返回修改 |
| `failed` | 丰声 NEXT 连接失败 | 已填写的 Client ID / Secret / Robot Code 校验未通过，请检查凭证是否正确后重试。 | 返回修改 |

点击「返回修改」= 关闭弹窗 + 自动滚动到丰声卡片并聚焦 `#fs-app-key`。

## 三、连接失败 UI

`failed` 状态在卡片底部新增一条内联错误条：
> ⚠ 凭证校验未通过，请检查 Client ID / Client Secret / Robot Code 是否正确

「连接」按钮文案变为「重新连接」。

## 四、统一拦截

所有触发点调用 `guardFengsheng(action)`：
- `empty | connected` → 执行
- `draft | connecting | failed` → 打开弹窗

触发点：
- `AgentDetail.tsx`：保存、发布、切到「调试」Tab、切到「会话记录」Tab
- `CreateAgentManualPage.tsx`：保存草稿、发布、「下一步：调试」按钮
- `PublishDialog.tsx`：勾选丰声渠道 + 进入下一步前

移除现有 `fsAlertShown` 一次性逻辑（每次仍按状态判断；不再"第一次必弹"）。

## 五、说明卡（可收起）

新增 `src/components/FengshengHowToCard.tsx`：
- 默认收起，标题「如何创建丰声 NEXT 机器人？」
- 展开内容：两步指引 + 「丰声文档 ↗」跳转 + 可见范围提示框
- 文档常量 `FENGSHENG_DOC_URL`（占位，可后续替换）
- 嵌入位置：
  1. `CreateAgentManualPage.tsx` — 丰声卡片正文最上方
  2. `AgentDetail.tsx` — 配置 Tab 丰声卡片正文最上方
  3. `PublishDialog.tsx` — 勾选丰声后凭证表单上方

## 六、改动文件清单

- 新增 `src/components/FengshengHowToCard.tsx`
- 改 `src/components/FengshengIncompleteDialog.tsx`：按 `status` 三套文案，只保留「返回修改」单一按钮
- 改 `src/pages/AgentDetail.tsx`：`fsConnected` → `fsStatus`；onChange 回退；连接按钮 Mock 失败；卡片头徽标 + 失败提示条；嵌入 HowToCard；统一拦截
- 改 `src/pages/CreateAgentManualPage.tsx`：同上
- 改 `src/components/PublishDialog.tsx`：嵌入 HowToCard（PublishDialog 内的凭证填写仍保留原校验，不引入状态机）

确认后切到 Build 模式我立刻实现。
