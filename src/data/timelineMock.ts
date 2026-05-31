/**
 * 统一时间线事件模型（对应"日志聚合方案"中的 L0-L4）。
 *
 * - L0 任务结果：user / agent / summary
 * - L1 阶段：phase
 * - L2 类别：phase.categories
 * - L3 事件：category.events
 * - L4 原始：event.raw
 *
 * 另外有横切类：permission / notification / error / artifact，强制可见。
 */

export type CategoryKey =
  | "file"
  | "bash"
  | "search"
  | "mcp"
  | "skill"
  | "subagent"
  | "permission"
  | "context"
  | "artifact"
  | "error";

export type RunStatus = "running" | "success" | "failed" | "pending" | "skipped";

export interface TimelineArtifact {
  id: string;
  name: string;
  kind: "doc" | "sheet" | "md" | "image" | "code" | "other";
  size?: string;
}

export interface TimelineSubEvent {
  id: string;
  category: CategoryKey;
  title: string;
  status: RunStatus;
  durationMs?: number;
  /** L4：原始 payload，开启"原始事件"后展示 */
  raw?: Record<string, unknown>;
  error?: string;
  artifacts?: TimelineArtifact[];
  /** 是否为外部写操作 / 高风险副作用，需突出展示 */
  sideEffect?: boolean;
}

export interface TimelineCategory {
  key: CategoryKey;
  label: string;
  status: RunStatus;
  events: TimelineSubEvent[];
}

export type TimelineEvent =
  | { id: string; kind: "user"; text: string }
  | { id: string; kind: "agent"; text: string; final?: boolean }
  | {
      id: string;
      kind: "summary";
      status: "success" | "failed" | "cancelled";
      durationMs: number;
      text: string;
      artifacts?: TimelineArtifact[];
    }
  | {
      id: string;
      kind: "phase";
      title: string;
      status: RunStatus;
      durationMs?: number;
      currentAction?: string;
      categories: TimelineCategory[];
    }
  | {
      id: string;
      kind: "permission";
      action: string;
      reason?: string;
      status: "pending" | "approved" | "denied";
    }
  | { id: string; kind: "notification"; text: string }
  | { id: string; kind: "error"; title: string; detail?: string }
  /** 直接渲染一组事件胶囊（用于无明确阶段的实时对话流） */
  | { id: string; kind: "events"; events: TimelineSubEvent[] };

export interface TimelineScenario {
  id: string;
  title: string;
  /** 顶部聊天/任务级状态（影响完成态收拢） */
  status: "running" | "waiting" | "done" | "failed";
  events: TimelineEvent[];
}

/* ─────────────────────────── 场景 1：完成态（默认收拢） ─────────────────────────── */

const scenario_done_doc: TimelineScenario = {
  id: "tl-done-618",
  title: "完成态 · 生成 618 促销对比文档",
  status: "done",
  events: [
    {
      id: "u1",
      kind: "user",
      text: "帮我对比 2026 vs 2025 年 618 促销力度，生成更正版文档",
    },
    {
      id: "p1",
      kind: "phase",
      title: "复核原文结构与格式",
      status: "success",
      durationMs: 12_000,
      categories: [
        {
          key: "file",
          label: "文件处理",
          status: "success",
          events: [
            {
              id: "p1-e1",
              category: "file",
              title: "读取 2025年618促销复盘.docx",
              status: "success",
              durationMs: 612,
              raw: { tool: "Read", path: "/uploads/2025年618促销复盘.docx", bytes: 184_321 },
            },
            {
              id: "p1-e2",
              category: "file",
              title: "读取 2026年618计划草案.md",
              status: "success",
              durationMs: 88,
              raw: { tool: "Read", path: "/uploads/2026年618计划草案.md", bytes: 12_044 },
            },
          ],
        },
      ],
    },
    {
      id: "p2",
      kind: "phase",
      title: "按更正信息重写对比正文",
      status: "success",
      durationMs: 48_000,
      categories: [
        {
          key: "search",
          label: "信息检索",
          status: "success",
          events: [
            {
              id: "p2-e1",
              category: "search",
              title: "检索 618 行业大盘公开数据",
              status: "success",
              durationMs: 1_812,
              raw: { tool: "web_search", q: "618 2025 vs 2026 promotion overview" },
            },
            {
              id: "p2-e2",
              category: "search",
              title: "读取 syntun.com 行业月报",
              status: "success",
              durationMs: 2_106,
            },
            {
              id: "p2-e3",
              category: "search",
              title: "读取 nielseniq.com 数据",
              status: "success",
              durationMs: 1_840,
            },
          ],
        },
        {
          key: "skill",
          label: "内容生成",
          status: "success",
          events: [
            {
              id: "p2-e4",
              category: "skill",
              title: "使用「文档结构化」技能重写正文",
              status: "success",
              durationMs: 38_120,
              raw: { tool: "Skill", name: "doc_structurer", tokens: 4_812 },
            },
          ],
        },
        {
          key: "mcp",
          label: "外部服务",
          status: "success",
          events: [
            {
              id: "p2-m1",
              category: "mcp",
              title: "通过「Notion」MCP 读取《618 复盘》页面",
              status: "success",
              durationMs: 1_240,
              raw: { tool: "mcp__notion__get_page", page_id: "618-recap-2025" },
            },
            {
              id: "p2-m2",
              category: "mcp",
              title: "通过「Linear」MCP 拉取相关 issue 列表",
              status: "success",
              durationMs: 980,
              raw: { tool: "mcp__linear__list_issues", project: "618-2026" },
            },
          ],
        },
        {
          key: "subagent",
          label: "子任务",
          status: "success",
          events: [
            {
              id: "p2-s1",
              category: "subagent",
              title: "派发子任务「核对历年大促优惠券面额」",
              status: "success",
              durationMs: 12_400,
              raw: { sub: "skill_subagent", skill: "promo_coupon_audit", years: ["2023", "2024", "2025"] },
            },
          ],
        },
      ],
    },
    {
      id: "p3",
      kind: "phase",
      title: "生成新版 Word / Excel / Markdown",
      status: "success",
      durationMs: 51_000,
      categories: [
        {
          key: "bash",
          label: "命令执行",
          status: "success",
          events: [
            {
              id: "p3-e1",
              category: "bash",
              title: "执行脚本：md → docx 转换",
              status: "success",
              durationMs: 4_120,
              raw: { tool: "Bash", cmd: "python /tmp/md2docx.py revised.md" },
            },
            {
              id: "p3-e2",
              category: "bash",
              title: "执行脚本：生成 Excel 对比表",
              status: "success",
              durationMs: 3_680,
            },
          ],
        },
        {
          key: "artifact",
          label: "产物生成",
          status: "success",
          events: [
            {
              id: "p3-e3",
              category: "artifact",
              title: "生成 2026vs2025年618促销力度对比_更正版.docx",
              status: "success",
              durationMs: 220,
              sideEffect: true,
              artifacts: [{ id: "a1", name: "2026vs2025年618促销力度对比_更正版.docx", kind: "doc", size: "168 KB" }],
            },
            {
              id: "p3-e4",
              category: "artifact",
              title: "生成 2026vs2025年618促销力度对比_更正版表格.xlsx",
              status: "success",
              durationMs: 196,
              sideEffect: true,
              artifacts: [{ id: "a2", name: "2026vs2025年618促销力度对比_更正版表格.xlsx", kind: "sheet", size: "42 KB" }],
            },
            {
              id: "p3-e5",
              category: "artifact",
              title: "生成 2026vs2025年618促销力度对比_更正版.md",
              status: "success",
              durationMs: 12,
              sideEffect: true,
              artifacts: [{ id: "a3", name: "2026vs2025年618促销力度对比_更正版.md", kind: "md", size: "11 KB" }],
            },
          ],
        },
      ],
    },
    {
      id: "s1",
      kind: "summary",
      status: "success",
      durationMs: 151_000,
      text: "已生成更正版《2026 vs 2025 年 618 促销力度对比》，包含 Word、Excel 和 Markdown 三个文件。",
      artifacts: [
        { id: "a1", name: "2026vs2025年618促销力度对比_更正版.docx", kind: "doc", size: "168 KB" },
        { id: "a2", name: "2026vs2025年618促销力度对比_更正版表格.xlsx", kind: "sheet", size: "42 KB" },
        { id: "a3", name: "2026vs2025年618促销力度对比_更正版.md", kind: "md", size: "11 KB" },
      ],
    },
  ],
};

/* ─────────────────────────── 场景 2：执行中（阶段进度） ─────────────────────────── */

const scenario_running_deploy: TimelineScenario = {
  id: "tl-running-deploy",
  title: "执行中 · 部署到测试环境",
  status: "running",
  events: [
    { id: "u1", kind: "user", text: "把当前分支构建并部署到测试环境，跑完冒烟测试" },
    {
      id: "p1",
      kind: "phase",
      title: "准备运行环境与拉取代码",
      status: "success",
      durationMs: 18_400,
      categories: [
        {
          key: "bash",
          label: "命令执行",
          status: "success",
          events: [
            { id: "p1-e1", category: "bash", title: "git fetch && git checkout feat/promo-2026", status: "success", durationMs: 1_240 },
            { id: "p1-e2", category: "bash", title: "pnpm install --frozen-lockfile", status: "success", durationMs: 16_980 },
          ],
        },
      ],
    },
    {
      id: "p2",
      kind: "phase",
      title: "构建与单元测试",
      status: "running",
      currentAction: "正在运行 pnpm test:unit……（已通过 142 / 168）",
      categories: [
        {
          key: "bash",
          label: "构建检查",
          status: "success",
          events: [
            { id: "p2-e1", category: "bash", title: "pnpm build", status: "success", durationMs: 28_300 },
          ],
        },
        {
          key: "bash",
          label: "测试验证",
          status: "running",
          events: [
            { id: "p2-e2", category: "bash", title: "pnpm test:unit", status: "running" },
          ],
        },
      ],
    },
    {
      id: "perm1",
      kind: "permission",
      action: "部署到 staging.example.com",
      reason: "该操作会重启 staging 集群中的 3 个 pod",
      status: "pending",
    },
  ],
};

/* ─────────────────────────── 场景 3：失败 + 重试 ─────────────────────────── */

const scenario_failed_notify: TimelineScenario = {
  id: "tl-failed-notify",
  title: "失败 · 通过钉钉发送变更通知",
  status: "failed",
  events: [
    { id: "u1", kind: "user", text: "把刚才的发布说明通过钉钉机器人发到「发布通知」群" },
    {
      id: "p1",
      kind: "phase",
      title: "查找目标群与拼装消息",
      status: "success",
      durationMs: 2_120,
      categories: [
        {
          key: "mcp",
          label: "外部服务",
          status: "success",
          events: [
            {
              id: "p1-e1",
              category: "mcp",
              title: "通过「机器人消息」MCP 检索 openConversationId",
              status: "success",
              durationMs: 612,
              raw: { tool: "mcp__dingtalk__search_conversation", keyword: "发布通知" },
            },
          ],
        },
        {
          key: "skill",
          label: "内容生成",
          status: "success",
          events: [
            { id: "p1-e2", category: "skill", title: "生成 Markdown 消息正文", status: "success", durationMs: 980 },
          ],
        },
      ],
    },
    {
      id: "p2",
      kind: "phase",
      title: "发送钉钉消息",
      status: "failed",
      durationMs: 8_400,
      categories: [
        {
          key: "mcp",
          label: "外部服务（写操作）",
          status: "failed",
          events: [
            {
              id: "p2-e1",
              category: "mcp",
              title: "调用「机器人消息」MCP 发送消息（第 1 次）",
              status: "failed",
              durationMs: 3_120,
              sideEffect: true,
              error: "HTTP 429 too_many_requests · 命中钉钉机器人限流",
              raw: { tool: "mcp__dingtalk__send_message", retry: 0, http_status: 429 },
            },
            {
              id: "p2-e2",
              category: "mcp",
              title: "调用「机器人消息」MCP 发送消息（重试 1）",
              status: "failed",
              durationMs: 2_840,
              sideEffect: true,
              error: "HTTP 429 too_many_requests",
              raw: { tool: "mcp__dingtalk__send_message", retry: 1, http_status: 429 },
            },
            {
              id: "p2-e3",
              category: "mcp",
              title: "调用「机器人消息」MCP 发送消息（重试 2）",
              status: "failed",
              durationMs: 2_400,
              sideEffect: true,
              error: "HTTP 429 too_many_requests",
              raw: { tool: "mcp__dingtalk__send_message", retry: 2, http_status: 429 },
            },
          ],
        },
      ],
    },
    {
      id: "err1",
      kind: "error",
      title: "外部服务持续失败，已停止重试",
      detail: "钉钉机器人在 60 秒窗口内被限流，请稍后重试或更换机器人 webhook",
    },
    {
      id: "s1",
      kind: "summary",
      status: "failed",
      durationMs: 10_520,
      text: "通知未能成功发送。建议 5 分钟后重试，或改用「钉钉文档」评论方式触达。",
    },
  ],
};

/* ─────────────────────────── 场景 4：子任务并行 + 权限批准 ─────────────────────────── */

const scenario_subagent: TimelineScenario = {
  id: "tl-subagent-research",
  title: "子任务 · 并行调研三家友商",
  status: "done",
  events: [
    { id: "u1", kind: "user", text: "并行调研 顺丰 / 京东 / 菜鸟 的最近一季度运力变化" },
    {
      id: "p1",
      kind: "phase",
      title: "派发并行子任务",
      status: "success",
      durationMs: 240,
      categories: [
        {
          key: "subagent",
          label: "子任务处理",
          status: "success",
          events: [
            { id: "sub-1", category: "subagent", title: "启动子任务：调研 顺丰", status: "success", durationMs: 80 },
            { id: "sub-2", category: "subagent", title: "启动子任务：调研 京东", status: "success", durationMs: 80 },
            { id: "sub-3", category: "subagent", title: "启动子任务：调研 菜鸟", status: "success", durationMs: 80 },
          ],
        },
      ],
    },
    {
      id: "p2",
      kind: "phase",
      title: "子任务并行执行",
      status: "success",
      durationMs: 42_000,
      categories: [
        {
          key: "subagent",
          label: "子任务进展",
          status: "success",
          events: [
            {
              id: "sub-1d", category: "subagent",
              title: "子任务「调研 顺丰」完成 · 6 条信息源 · 1 段摘要",
              status: "success", durationMs: 38_120,
              raw: { sub: "research", target: "SF", sources: 6 },
            },
            {
              id: "sub-2d", category: "subagent",
              title: "子任务「调研 京东」完成 · 9 条信息源 · 1 段摘要",
              status: "success", durationMs: 41_220,
            },
            {
              id: "sub-3d", category: "subagent",
              title: "子任务「调研 菜鸟」完成 · 4 条信息源 · 1 段摘要",
              status: "success", durationMs: 36_010,
            },
          ],
        },
      ],
    },
    {
      id: "perm-approved",
      kind: "permission",
      action: "向用户邮箱发送整合后的调研报告",
      status: "approved",
    },
    {
      id: "p3",
      kind: "phase",
      title: "整合并交付",
      status: "success",
      durationMs: 6_200,
      categories: [
        {
          key: "skill",
          label: "内容生成",
          status: "success",
          events: [
            { id: "p3-e1", category: "skill", title: "合并三份摘要为统一对比表", status: "success", durationMs: 4_120 },
          ],
        },
        {
          key: "artifact",
          label: "产物生成",
          status: "success",
          events: [
            {
              id: "p3-e2",
              category: "artifact",
              title: "生成 友商运力对比_Q2.md",
              status: "success",
              durationMs: 80,
              sideEffect: true,
              artifacts: [{ id: "ra1", name: "友商运力对比_Q2.md", kind: "md", size: "8 KB" }],
            },
          ],
        },
      ],
    },
    {
      id: "s1",
      kind: "summary",
      status: "success",
      durationMs: 48_440,
      text: "已并行完成 3 个子任务，并整合输出友商运力对比报告。",
      artifacts: [{ id: "ra1", name: "友商运力对比_Q2.md", kind: "md", size: "8 KB" }],
    },
  ],
};

export const TIMELINE_SCENARIOS: TimelineScenario[] = [
  scenario_done_doc,
  scenario_running_deploy,
  scenario_failed_notify,
  scenario_subagent,
];

export const getTimelineScenario = (id?: string | null): TimelineScenario | undefined =>
  TIMELINE_SCENARIOS.find((s) => s.id === id);
