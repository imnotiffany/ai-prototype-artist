/* ── Shared Types ── */

export type McpProvider = "lh" | "dd";

/** MCP 评级：official=平台官方收录 / verified=企业认证 / community=社区贡献 */
export type McpTrustLevel = "official" | "verified" | "community";

export interface Resource {
  id: string;
  name: string;
  type: "skill" | "mcp";
  description: string;
  status: "active" | "inactive";
  addedAt: string;
  usageCount: number;
  /** MCP only: 所属服务商 — lh=领慧, dd=钉钉 */
  provider?: McpProvider;
  /** MCP only: 是否需要绑定凭据（默认 false） */
  requiresCredential?: boolean;
  /** MCP only: 部署形态徽标，如 "云端" / "本地" / "Remote" */
  deployment?: string;
  /** MCP only: 评级 */
  trustLevel?: McpTrustLevel;
  /** Skill only: 来源范围 — market=Skill 广场公共，project=项目自建 */
  scope?: "market" | "project";
}

export interface Agent {
  id: string;
  name: string;
  avatar: string;
  description: string;
  category: string;
  tags: string[];
  platform: string;
  author: string;
  authorId: string;
  updatedAt: string;
  downloads: number;
  skills: string[];
  mcpServers: string[];
  /** 子智能体名称列表（可引用其他智能体） */
  subagents?: string[];
  sessionCount: number;
  versions: Version[];
  creationType: "ai" | "upload";
  status: "published" | "project";
  /** "agent" = 对话型智能体（点击进入对话），"app" = 网页应用（点击直接运行） */
  kind: "agent" | "app";
  /** 仅当 status==="published" 时有意义：marketplace=已发布到广场，project=已发布到项目内 */
  publishScope?: "marketplace" | "project";
  featured?: boolean;
  /** 是否允许其他用户复制到自己项目内（由创建者发布时设置，默认 true） */
  allowCopy?: boolean;
}

export interface Version {
  version: string;
  createdAt: string;
  fileSize: string;
  downloads: number;
  status: "published" | "unpublished";
  creator: string;
}

export interface Session {
  id: string;
  agentId: string;
  agentName: string;
  agentAvatar: string;
  lastMessage: string;
  lastActiveAt: string;
  status: "running" | "ended";
}

export interface Credential {
  id: string;
  name: string;
  type: "Bearer Token" | "OAuth 2.0";
  mcpServer: string;
  createdAt: string;
}

/* ── Categories ── */
export const categories = [
  "视觉设计", "技术研发", "数据分析", "编程开发", "自动运维", "内容创作", "企业办公", "精选应用", "文档处理", "其他类型"
];

/* ── Unified Resources (Skills & MCPs) ── */
export const sharedResources: Resource[] = [
  { id: "s1", name: "Web Search", type: "skill", scope: "market", description: "联网搜索能力，支持多搜索引擎", status: "active", addedAt: "2026-04-10", usageCount: 12 },
  { id: "s2", name: "Code Analysis", type: "skill", scope: "market", description: "代码分析与审查，支持多语言", status: "active", addedAt: "2026-04-08", usageCount: 8 },
  { id: "s3", name: "Email Parser", type: "skill", scope: "market", description: "邮件内容解析与结构化提取", status: "active", addedAt: "2026-04-05", usageCount: 5 },
  { id: "s4", name: "Translation Engine", type: "skill", scope: "market", description: "多语言翻译引擎，支持中英日韩", status: "active", addedAt: "2026-04-01", usageCount: 15 },
  { id: "s5", name: "Content Generation", type: "skill", scope: "market", description: "内容生成与创作", status: "inactive", addedAt: "2026-03-28", usageCount: 3 },
  { id: "s6", name: "SQL Generator", type: "skill", scope: "market", description: "SQL 查询自动生成与优化", status: "active", addedAt: "2026-03-25", usageCount: 7 },
  { id: "s7", name: "File Processor", type: "skill", scope: "market", description: "文件读写与格式转换", status: "active", addedAt: "2026-04-12", usageCount: 4 },
  { id: "s8", name: "Data Visualizer", type: "skill", scope: "market", description: "数据可视化图表生成", status: "inactive", addedAt: "2026-03-20", usageCount: 2 },
  { id: "s9", name: "Security Scanner", type: "skill", scope: "market", description: "安全漏洞扫描与检测", status: "active", addedAt: "2026-04-10", usageCount: 6 },
  { id: "s10", name: "Log Analyzer", type: "skill", scope: "project", description: "系统日志分析与异常检测（项目自建）", status: "active", addedAt: "2026-04-09", usageCount: 4 },
  { id: "s11", name: "Alert Manager", type: "skill", scope: "project", description: "告警管理与通知分发（项目自建）", status: "active", addedAt: "2026-04-08", usageCount: 3 },
  { id: "s12", name: "SEO Optimizer", type: "skill", scope: "market", description: "SEO 优化建议与关键词分析", status: "active", addedAt: "2026-04-07", usageCount: 5 },
  { id: "s13", name: "Schema Analyzer", type: "skill", scope: "project", description: "数据库 Schema 分析与优化（项目自建）", status: "active", addedAt: "2026-04-06", usageCount: 3 },
  { id: "s14", name: "灵慧 Skill", type: "skill", scope: "market", description: "公司内部灵慧平台技能集，覆盖知识检索、流程自动化、智能问答等通用能力", status: "active", addedAt: "2026-04-15", usageCount: 22 },
  { id: "s15", name: "钉钉 Skill", type: "skill", scope: "market", description: "钉钉工作流技能集，支持发送消息、创建日程、审批发起、待办通知等钉钉原生操作", status: "active", addedAt: "2026-04-15", usageCount: 18 },
  // ── 领慧 MCP（公司内部业务 MCP，多数无需凭据，使用 SSO/内部鉴权）──
  { id: "lh1", name: "测试管理-MCP", type: "mcp", provider: "lh", deployment: "云端", requiresCredential: false, description: "测试用例查询：通过用例ID查询用例详情。版本缺陷查询：通过缺陷ID查询缺陷详情及变更记录。其它功能持续增加中", status: "active", addedAt: "2026-04-29", usageCount: 12 },
  { id: "lh2", name: "丰景台", type: "mcp", provider: "lh", deployment: "云端", requiresCredential: false, description: "丰景台MCP全家桶，支持按个人权限查数", status: "active", addedAt: "2026-04-24", usageCount: 18 },
  { id: "lh3", name: "知识运营平台(sf-knx)", type: "mcp", provider: "lh", deployment: "云端", requiresCredential: false, description: "基于知识运营平台，提供知识召回的mcp能力", status: "active", addedAt: "2026-04-10", usageCount: 9 },
  { id: "lh4", name: "sfdoc-mcp", type: "mcp", provider: "lh", deployment: "本地", requiresCredential: true, description: "sfdoc-mcp是一个基于 Model Context Protocol (MCP) 的服务器，专门用于读取顺丰内部腾讯文档平台上的文档内容。", status: "active", addedAt: "2026-04-07", usageCount: 6 },
  { id: "lh5", name: "城市名称转换城市代码工具", type: "mcp", provider: "lh", deployment: "云端", requiresCredential: false, description: "将中文城市名称 转换成 城市代码以及机场三字码，例如 深圳转换后 755、SZX，杭州转换后571、HGH", status: "active", addedAt: "2026-04-03", usageCount: 4 },
  { id: "lh6", name: "根据网点名称查询网点信息", type: "mcp", provider: "lh", deployment: "云端", requiresCredential: false, description: "根据网点名称查询网点信息", status: "active", addedAt: "2026-04-01", usageCount: 3 },
  { id: "lh7", name: "QMP-自动审核", type: "mcp", provider: "lh", deployment: "云端", requiresCredential: false, description: "QMP自动审核", status: "active", addedAt: "2026-04-01", usageCount: 2 },
  { id: "lh8", name: "丰景台数据查询v2", type: "mcp", provider: "lh", deployment: "本地", requiresCredential: true, description: "通过mcp去查询丰景台的数据。使用扫码登录个人账号。", status: "active", addedAt: "2026-03-31", usageCount: 7 },
  { id: "lh9", name: "智水-MCP服务", type: "mcp", provider: "lh", deployment: "云端", requiresCredential: false, description: "智水-MCP服务是面向研发团队的AI辅助工具集，通过MCP协议将研发流程中的关键环节暴露给AI助手，使开发人员能够通过自然语言与研发系统交互。", status: "active", addedAt: "2026-03-23", usageCount: 5 },
  { id: "lh10", name: "豆包Seedance视频生成", type: "mcp", provider: "lh", deployment: "云端", requiresCredential: true, description: "豆包Seedance视频生成MCP服务，提供文生视频、图生视频、首尾帧生成视频等功能。", status: "active", addedAt: "2026-03-16", usageCount: 8 },
  { id: "lh11", name: "yapi-mcp-server", type: "mcp", provider: "lh", deployment: "本地", requiresCredential: true, description: "一个基于Model Context Protocol (MCP)的YApi集成服务，用于在AI助手中访问YApi文档平台的API信息", status: "active", addedAt: "2026-03-13", usageCount: 4 },
  { id: "lh12", name: "confluence-mcp", type: "mcp", provider: "lh", deployment: "本地", requiresCredential: true, description: "顺丰 Confluence MCP 客户端，为AI助手提供Confluence集成功能。", status: "active", addedAt: "2026-03-04", usageCount: 6 },

  // ── 钉钉 MCP（钉钉官方平台 MCP，多数 Remote 接入需 OAuth 凭据）──
  { id: "dd1", name: "机器人消息", type: "mcp", provider: "dd", deployment: "Remote", requiresCredential: true, description: "钉钉机器人消息MCP服务，支持创建企业机器人、根据关键词搜索群会话openConversationId、将企业机器人添加到群等", status: "active", addedAt: "2026-04-15", usageCount: 10 },
  { id: "dd2", name: "钉钉日志", type: "mcp", provider: "dd", deployment: "Remote", requiresCredential: true, description: "钉钉日志MCP，包含获取日志模板、读取日志内容、写日志等功能", status: "active", addedAt: "2026-04-10", usageCount: 5 },
  { id: "dd3", name: "钉钉 AI 表格", type: "mcp", provider: "dd", deployment: "Remote", requiresCredential: true, description: "钉钉 AI 表格 MCP 让 AI 直接操作表格数据与字段，快速打通查询、维护与自动化办公流程。", status: "active", addedAt: "2026-04-08", usageCount: 6 },
  { id: "dd4", name: "钉钉文档", type: "mcp", provider: "dd", deployment: "Remote", requiresCredential: true, description: "钉钉文档MCP支持查找、创建文档，助力高效协同与内容管理。", status: "active", addedAt: "2026-04-05", usageCount: 7 },
  { id: "dd5", name: "钉钉通讯录", type: "mcp", provider: "dd", deployment: "Remote", requiresCredential: true, description: "钉钉通讯录MCP支持搜索人员/部门、查询成员详情及部门结构，快速获取组织架构信息。", status: "active", addedAt: "2026-04-02", usageCount: 4 },
  { id: "dd6", name: "钉钉日历", type: "mcp", provider: "dd", deployment: "Remote", requiresCredential: true, description: "支持创建日程、查询日程、约空闲会议室等能力", status: "active", addedAt: "2026-04-01", usageCount: 3 },
  { id: "dd7", name: "钉钉待办", type: "mcp", provider: "dd", deployment: "Remote", requiresCredential: true, description: "钉钉待办MCP服务提供高效的任务管理能力，支持创建待办事项、更新任务状态（如完成/未完成）、以及按条件查询任务等。", status: "active", addedAt: "2026-03-28", usageCount: 4 },
  { id: "dd8", name: "钉钉表格", type: "mcp", provider: "dd", deployment: "Remote", requiresCredential: true, description: "钉钉表格 MCP 支持新建、编辑等操作，助力高效协同与内容管理", status: "active", addedAt: "2026-03-25", usageCount: 3 },
  { id: "dd9", name: "高德地图", type: "mcp", provider: "dd", deployment: "Remote", requiresCredential: true, description: "高德地图MCP服务，包含搜索周边服务、骑行、公交、驾车、步行路径规划，地理编码查询和天气查询功能", status: "active", addedAt: "2026-03-20", usageCount: 5 },
];

/* ── Helper: get active resources as picker items ── */
/** Skill 分类标签（统一分类，单选其一） */
export const SKILL_CATEGORIES = [
  "文档处理",
  "数据分析",
  "编程开发",
  "内容创作",
  "企业办公",
  "前端开发",
  "后端开发",
  "产品经理",
  "测试开发",
  "算法工程",
  "运维支持",
  "研究分析",
  "视觉设计",
  "市场营销",
  "营运规划",
  "财务分析",
  "人力资源",
  "国际业务",
  "智水平台",
  "其他",
] as const;

const SKILL_TAGS: Record<string, string[]> = {
  "Web Search": ["研究分析"],
  "Code Analysis": ["编程开发"],
  "Email Parser": ["企业办公"],
  "Translation Engine": ["国际业务"],
  "Content Generation": ["内容创作"],
  "SQL Generator": ["数据分析"],
  "File Processor": ["文档处理"],
  "Data Visualizer": ["数据分析"],
  "Security Scanner": ["运维支持"],
  "Log Analyzer": ["运维支持"],
  "Alert Manager": ["运维支持"],
  "SEO Optimizer": ["市场营销"],
  "Schema Analyzer": ["后端开发"],
  "灵慧 Skill": ["企业办公"],
  "钉钉 Skill": ["企业办公"],
};

export const getActiveSkills = () =>
  sharedResources.filter((r) => r.type === "skill" && r.status === "active").map((r) => ({ name: r.name, description: r.description, scope: r.scope ?? "market", tags: SKILL_TAGS[r.name] ?? [] }));

export const getActiveMCPs = () =>
  sharedResources
    .filter((r) => r.type === "mcp" && r.status === "active")
    .map((r) => ({ name: r.name, description: r.description, provider: r.provider, deployment: r.deployment, requiresCredential: !!r.requiresCredential }));

/** MCP 分类标签（与 Skill 分类共用同一组） */
const MCP_TAGS: Record<string, string> = {
  lh4: "文档处理",
  lh8: "数据分析",
  lh10: "视觉设计",
  lh11: "编程开发",
  lh12: "企业办公",
  dd1: "企业办公",
  dd2: "企业办公",
  dd3: "企业办公",
  dd4: "文档处理",
  dd5: "人力资源",
  dd6: "企业办公",
  dd7: "企业办公",
  dd8: "企业办公",
  dd9: "营运规划",
};

/** 所有需要凭据的 MCP（用于 MCP 管理 → 新增 MCP → 市场列表） */
export const getCredentialRequiredMcps = () =>
  sharedResources
    .filter((r) => r.type === "mcp" && r.status === "active" && r.requiresCredential)
    .map((r) => ({ id: r.id, name: r.name, description: r.description, provider: r.provider, deployment: r.deployment, tag: MCP_TAGS[r.id] ?? "其他" }));

/** 所有免凭据 MCP（默认即出现在 MCP 管理列表） */
export const getCredentialFreeMcps = () =>
  sharedResources
    .filter((r) => r.type === "mcp" && r.status === "active" && !r.requiresCredential)
    .map((r) => ({ id: r.id, name: r.name, description: r.description, provider: r.provider, deployment: r.deployment, addedAt: r.addedAt }));

export const mcpRequiresCredential = (name: string): boolean =>
  !!sharedResources.find((r) => r.type === "mcp" && r.name === name)?.requiresCredential;

/* ── Unified Agents (marketplace + project) ── */
export const mockAgents: Agent[] = [
  // ── Marketplace / published ──
  {
    id: "1", name: "邮箱智能检索", avatar: "📧",
    description: "邮箱收件箱智能检索助手，可接入对应邮件相关上下文与检索目标，返回对应问题的答案",
    category: "数据分析", tags: ["数据分析", "高分智能体", "dataops"],
    platform: "AI技术平台", author: "张三", authorId: "01234567",
    updatedAt: "2026-04-04", downloads: 123,
    skills: ["Web Search", "Email Parser"], mcpServers: ["钉钉文档", "钉钉通讯录"],
    sessionCount: 89, creationType: "ai", status: "published", kind: "agent",
    versions: [
      { version: "v0.0.3", createdAt: "2026-04-04", fileSize: "12KB", downloads: 45, status: "published", creator: "张三" },
      { version: "v0.0.2", createdAt: "2026-03-20", fileSize: "10KB", downloads: 60, status: "unpublished", creator: "张三" },
      { version: "v0.0.1", createdAt: "2026-03-01", fileSize: "8KB", downloads: 18, status: "unpublished", creator: "张三" },
    ],
  },
  {
    id: "2", name: "代码审查助手", avatar: "🔍",
    description: "智能代码审查助手，自动分析代码质量、安全漏洞和性能问题，生成详细审查报告",
    category: "编程开发", tags: ["编程开发", "代码审查", "devops"],
    platform: "AI技术平台", author: "李四", authorId: "01234568",
    updatedAt: "2026-04-10", downloads: 256,
    skills: ["Code Analysis", "Security Scanner"], mcpServers: ["yapi-mcp-server"],
    sessionCount: 150, creationType: "ai", status: "published", kind: "agent",
    versions: [
      { version: "v0.1.0", createdAt: "2026-04-10", fileSize: "15KB", downloads: 120, status: "published", creator: "李四" },
    ],
  },
  {
    id: "3", name: "多语言文档翻译", avatar: "🌐",
    description: "多语言文档翻译智能体，支持中英日韩等主流语言互译，保留原文格式与排版",
    category: "文档处理", tags: ["文档处理", "翻译", "多语言"],
    platform: "AI技术平台", author: "王五", authorId: "01234569",
    updatedAt: "2026-04-08", downloads: 412,
    skills: ["Translation Engine"], mcpServers: ["知识运营平台(sf-knx)"],
    sessionCount: 230, creationType: "ai", status: "published", kind: "agent",
    versions: [
      { version: "v1.0.0", createdAt: "2026-04-08", fileSize: "20KB", downloads: 412, status: "published", creator: "王五" },
    ],
  },
  {
    id: "4", name: "运维监控助手", avatar: "🖥️",
    description: "自动化运维监控智能体，实时分析系统日志与指标，自动告警并给出修复建议",
    category: "自动运维", tags: ["自动运维", "监控", "告警"],
    platform: "基础架构部", author: "赵六", authorId: "01234570",
    updatedAt: "2026-04-12", downloads: 87,
    skills: ["Log Analyzer", "Alert Manager"], mcpServers: ["智水-MCP服务", "丰景台"],
    sessionCount: 45, creationType: "ai", status: "published", kind: "agent",
    versions: [
      { version: "v0.2.0", createdAt: "2026-04-12", fileSize: "18KB", downloads: 87, status: "published", creator: "赵六" },
    ],
  },
  {
    id: "5", name: "内容创作大师", avatar: "✍️",
    description: "智能内容创作助手，支持营销文案、技术文档、社交媒体帖子等多种风格写作",
    category: "内容创作", tags: ["内容创作", "文案", "营销"],
    platform: "市场部", author: "钱七", authorId: "01234571",
    updatedAt: "2026-04-11", downloads: 198,
    skills: ["Content Generation", "SEO Optimizer"], mcpServers: [],
    sessionCount: 120, creationType: "ai", status: "published", kind: "agent",
    versions: [
      { version: "v0.3.1", createdAt: "2026-04-11", fileSize: "14KB", downloads: 198, status: "published", creator: "钱七" },
    ],
  },
  {
    id: "6", name: "数据管道编排", avatar: "📊",
    description: "数据管道编排智能体，自动设计和优化ETL流程，支持多数据源接入与转换",
    category: "数据分析", tags: ["数据分析", "ETL", "数据工程"],
    platform: "数据中心", author: "孙八", authorId: "01234572",
    updatedAt: "2026-04-09", downloads: 156,
    skills: ["SQL Generator", "Schema Analyzer"], mcpServers: ["丰景台数据查询v2", "丰景台"],
    sessionCount: 78, creationType: "ai", status: "published", kind: "agent",
    versions: [
      { version: "v0.1.2", createdAt: "2026-04-09", fileSize: "22KB", downloads: 156, status: "published", creator: "孙八" },
    ],
  },
  // ── Project agents (我的) ──
  {
    id: "p1", name: "雨是神明放的烟花 副本", avatar: "🌧️",
    description: "暮色里的雨，是神明燃尽的烟花余烬，千万滴雨同时坠落，落满山川湖海，让每个抬头看天的人，都能接住一场专属的绽放。",
    category: "视觉设计", tags: ["视觉设计"],
    platform: "AI技术平台", author: "廖奕通", authorId: "01441970",
    updatedAt: "2026-04-13", downloads: 0,
    skills: [], mcpServers: [],
    sessionCount: 0, creationType: "ai", status: "project", kind: "app",
    versions: [],
  },
  {
    id: "p2", name: "Apple风证件照生成", avatar: "📷",
    description: "上传照片智能生成专业证件照。支持多比例、多张生成及迭代优化，打造专业职场形象",
    category: "视觉设计", tags: ["视觉设计", "图像处理"],
    platform: "AI技术平台", author: "廖奕通", authorId: "01441970",
    updatedAt: "2026-04-10", downloads: 34,
    skills: ["File Processor"], mcpServers: [],
    sessionCount: 12, creationType: "ai", status: "published", kind: "app",
    versions: [
      { version: "v1.0.0", createdAt: "2026-04-10", fileSize: "16KB", downloads: 34, status: "published", creator: "廖奕通" },
    ],
  },
  {
    id: "p3", name: "漫画工坊", avatar: "🎨",
    description: "一键生成精美漫画，轻松将创意变成生动的漫画作品",
    category: "视觉设计", tags: ["视觉设计", "漫画"],
    platform: "AI技术平台", author: "廖奕通", authorId: "01441970",
    updatedAt: "2026-04-01", downloads: 0,
    skills: ["Content Generation"], mcpServers: [],
    sessionCount: 0, creationType: "ai", status: "project", kind: "app",
    versions: [],
  },
  {
    id: "p4", name: "JSON万能工具箱", avatar: "🟢",
    description: "集JSON格式检查、格式化、差异对比和转表格于一体的高效处理工具",
    category: "技术研发", tags: ["技术研发", "工具"],
    platform: "AI技术平台", author: "廖奕通", authorId: "01441970",
    updatedAt: "2026-04-01", downloads: 56,
    skills: ["File Processor"], mcpServers: [],
    sessionCount: 20, creationType: "ai", status: "published", kind: "app",
    versions: [
      { version: "v1.0.0", createdAt: "2026-04-01", fileSize: "10KB", downloads: 56, status: "published", creator: "廖奕通" },
    ],
  },
  {
    id: "p5", name: "Prompt精炼大师", avatar: "🅿️",
    description: "智能润色优化你的Prompt，使其更完整、更有逻辑，支持中英文输出切换",
    category: "技术研发", tags: ["技术研发", "Prompt"],
    platform: "AI技术平台", author: "廖奕通", authorId: "01441970",
    updatedAt: "2026-03-31", downloads: 78,
    skills: ["Content Generation", "Translation Engine"], mcpServers: [],
    sessionCount: 35, creationType: "ai", status: "published", kind: "agent",
    versions: [
      { version: "v1.0.0", createdAt: "2026-03-31", fileSize: "8KB", downloads: 78, status: "published", creator: "廖奕通" },
    ],
  },
  {
    id: "p6", name: "小说秒变漫画", avatar: "⬛",
    description: "输入小说内容，AI自动将文字转为精美漫画画面，一键生成漫画作品。",
    category: "视觉设计", tags: ["视觉设计", "漫画"],
    platform: "AI技术平台", author: "廖奕通", authorId: "01441970",
    updatedAt: "2026-03-31", downloads: 0,
    skills: ["Content Generation"], mcpServers: [],
    sessionCount: 0, creationType: "ai", status: "project", kind: "app",
    versions: [],
  },
  {
    id: "p7", name: "实时文字转语音", avatar: "🎵",
    description: "实时文字转语音，支持多种音色和语速调整",
    category: "精选应用", tags: ["精选应用", "语音"],
    platform: "AI技术平台", author: "张毅超", authorId: "01422596",
    updatedAt: "2026-03-25", downloads: 145,
    skills: [], mcpServers: [],
    sessionCount: 60, creationType: "upload", status: "published", kind: "app", featured: true,
    versions: [
      { version: "v1.0.0", createdAt: "2026-03-25", fileSize: "25KB", downloads: 145, status: "published", creator: "张毅超" },
    ],
  },
  {
    id: "p8", name: "豆包视频生成", avatar: "🎬",
    description: "调用Seedance 1.5 Pro为您生成短视频，支持配置参考图片、时长、画幅、运镜方式",
    category: "视觉设计", tags: ["视觉设计", "视频"],
    platform: "AI技术平台", author: "廖奕通", authorId: "01441970",
    updatedAt: "2026-03-25", downloads: 67,
    skills: ["File Processor"], mcpServers: ["sfdoc-mcp"],
    sessionCount: 25, creationType: "upload", status: "published", kind: "app",
    versions: [
      { version: "v1.0.0", createdAt: "2026-03-25", fileSize: "30KB", downloads: 67, status: "published", creator: "廖奕通" },
    ],
  },
  {
    id: "p9", name: "智能重绘助手", avatar: "🎨",
    description: "上传图片，AI帮你重新绘制生成新的图像",
    category: "视觉设计", tags: ["视觉设计", "图像"],
    platform: "AI技术平台", author: "杨彪龙", authorId: "01419965",
    updatedAt: "2026-03-24", downloads: 23,
    skills: ["File Processor"], mcpServers: [],
    sessionCount: 8, creationType: "ai", status: "project", kind: "app", featured: true,
    versions: [],
  },
];

/* 给历史已发布数据补默认 publishScope（mock 兜底） */
mockAgents.forEach((a) => {
  if (a.status === "published" && !a.publishScope) a.publishScope = "marketplace";
});

/* ── Helper: filter agents by context ── */
export const getMarketplaceAgents = () =>
  mockAgents.filter((a) => a.status === "published" && a.publishScope === "marketplace");
export const getMyAgents = () => mockAgents.filter((a) => ["01441970", "01422596", "01419965"].includes(a.authorId));
export const getRecentAgents = () => [...mockAgents].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6);

/* ── Sessions (reference real agent IDs) ── */
export const mockSessions: Session[] = [
  { id: "s1", agentId: "1", agentName: "邮箱智能检索", agentAvatar: "📧", lastMessage: "已找到3封与项目预算相关的邮件", lastActiveAt: "2026-04-13 10:30", status: "ended" },
  { id: "s2", agentId: "2", agentName: "代码审查助手", agentAvatar: "🔍", lastMessage: "发现2个潜在安全漏洞，建议立即修复", lastActiveAt: "2026-04-13 09:15", status: "running" },
  { id: "s3", agentId: "3", agentName: "多语言文档翻译", agentAvatar: "🌐", lastMessage: "文档翻译完成，共翻译1,200字", lastActiveAt: "2026-04-12 16:45", status: "ended" },
  { id: "s4", agentId: "p2", agentName: "Apple风证件照生成", agentAvatar: "📷", lastMessage: "证件照已生成，共3张不同比例", lastActiveAt: "2026-04-11 14:20", status: "ended" },
  { id: "s5", agentId: "p5", agentName: "Prompt精炼大师", agentAvatar: "🅿️", lastMessage: "已优化你的 Prompt，逻辑更清晰", lastActiveAt: "2026-04-10 16:00", status: "ended" },
];

/* ── Chat Sessions（用户与智能体的历史对话） ── */
import type { ToolCall } from "@/components/ToolCallCard";

export type ChatMessage =
  | { role: "user"; content: string }
  | { role: "agent"; content: string }
  | { role: "tools"; calls: ToolCall[] };

export interface ChatSession {
  id: string;
  agentId: string;
  title: string;
  lastActiveAt: string;
  messages: ChatMessage[];
}

export const mockChatSessions: ChatSession[] = [
  // ── Agent 1：邮箱智能检索 ──
  {
    id: "cs-1-a", agentId: "1", title: "查找上周的项目预算邮件", lastActiveAt: "2026-05-06 10:32",
    messages: [
      { role: "user", content: "帮我找一下上周关于项目预算的邮件" },
      { role: "tools", calls: [{
        id: "tc-1a-1", kind: "mcp", name: "search_emails", provider: "钉钉文档（钉钉 MCP）",
        endpoint: "mcp.dingtalk.search_emails", summary: "搜索关键词「项目预算」",
        status: "success", resultSummary: "命中 3 封 · 268ms",
        params: [{ key: "query", value: "项目预算" }, { key: "time_range", value: "last_7d" }],
        steps: [
          { label: "建立连接", ms: 92, status: "done" },
          { label: "执行检索", ms: 176, status: "done" },
        ],
        resultItems: [
          { title: "Q2 预算评审会议纪要", meta: "周一 09:18" },
          { title: "RE: 预算调整说明", meta: "周三 14:22" },
          { title: "FW: 预算最终确认", meta: "周五 17:05" },
        ],
      }]},
      { role: "agent", content: "已找到 3 封相关邮件，按时间倒序：\n1. **预算最终确认**（周五）— 已签字版本\n2. **预算调整说明**（周三）— 含变更明细\n3. **Q2 预算评审会议纪要**（周一）" },
    ],
  },
  {
    id: "cs-1-b", agentId: "1", title: "整理客户回复", lastActiveAt: "2026-05-04 15:10",
    messages: [
      { role: "user", content: "帮我归类本周客户的回复邮件" },
      { role: "agent", content: "已将本周 12 封客户邮件按「咨询/投诉/反馈」三类整理完毕。" },
    ],
  },
  {
    id: "cs-1-c", agentId: "1", title: "查找招聘相关邮件", lastActiveAt: "2026-04-28 09:40",
    messages: [
      { role: "user", content: "搜一下 HR 发的招聘邮件" },
      { role: "agent", content: "找到 5 封 HR 招聘相关邮件，已按职位汇总。" },
    ],
  },

  // ── Agent 2：代码审查助手 ──
  {
    id: "cs-2-a", agentId: "2", title: "审查 PR #482", lastActiveAt: "2026-05-06 16:08",
    messages: [
      { role: "user", content: "帮我 review 一下 PR #482" },
      { role: "tools", calls: [{
        id: "tc-2a-1", kind: "skill", name: "Code Analysis", provider: "内置 Skill",
        endpoint: "skill.code_analysis.review", summary: "扫描 PR #482 全部变更",
        status: "success", resultSummary: "扫描 12 个文件 · 1.4s",
        steps: [
          { label: "拉取 diff", ms: 210, status: "done" },
          { label: "静态分析", ms: 920, status: "done" },
          { label: "生成报告", ms: 270, status: "done" },
        ],
        resultItems: [
          { title: "潜在 SQL 注入：UserService.ts:88" },
          { title: "未处理的 Promise rejection：api/order.ts:142" },
        ],
      }]},
      { role: "agent", content: "发现 2 个高危问题：\n1. UserService.ts 存在 SQL 注入风险\n2. order.ts 有未处理的 Promise rejection\n\n建议先修复后再合并。" },
    ],
  },
  {
    id: "cs-2-b", agentId: "2", title: "解释一段递归代码", lastActiveAt: "2026-05-02 11:00",
    messages: [
      { role: "user", content: "这段递归是怎么跑的？" },
      { role: "agent", content: "这是一个典型的尾递归实现，每次调用把累计值传下去……" },
    ],
  },

  // ── Agent 3：多语言文档翻译 ──
  {
    id: "cs-3-a", agentId: "3", title: "翻译产品发布稿（中→英）", lastActiveAt: "2026-05-05 19:45",
    messages: [
      { role: "user", content: "把这份发布稿翻译成英文，保留 Markdown 格式" },
      { role: "agent", content: "已翻译完成，共 1,240 字，专业术语已采用业界通用译法。" },
    ],
  },
  {
    id: "cs-3-b", agentId: "3", title: "日文邮件回复草稿", lastActiveAt: "2026-04-30 10:22",
    messages: [
      { role: "user", content: "帮我用日文写一封回复邮件" },
      { role: "agent", content: "已生成日文邮件草稿，使用敬语体。" },
    ],
  },

  // ── Agent 4：运维监控助手 ──
  {
    id: "cs-4-a", agentId: "4", title: "排查 node-3 报警", lastActiveAt: "2026-05-06 22:15",
    messages: [
      { role: "user", content: "node-3 一直在报警，帮我看看" },
      { role: "tools", calls: [{
        id: "tc-4a-1", kind: "mcp", name: "query_logs", provider: "智水-MCP服务（领慧 MCP）",
        endpoint: "mcp.smartwater.query_logs", summary: "拉取 node-3 最近 1h 日志",
        status: "success", resultSummary: "返回 3 条 · 412ms",
        steps: [
          { label: "建立 MCP 连接", ms: 124, status: "done" },
          { label: "执行 query_logs", ms: 412, status: "done" },
        ],
        resultItems: [
          { title: "[ERROR] connection refused @ node-3", meta: "22:10:18" },
          { title: "[WARN] cpu usage 92% @ node-1", meta: "22:09:16" },
        ],
      }]},
      { role: "agent", content: "根因：node-3 网络抖动导致连接被拒。建议重启网卡并检查交换机端口。" },
    ],
  },
  {
    id: "cs-4-b", agentId: "4", title: "本周告警汇总", lastActiveAt: "2026-05-03 09:00",
    messages: [
      { role: "user", content: "本周一共有多少条 P1 告警？" },
      { role: "agent", content: "本周共 7 条 P1 告警，集中在周二和周五。" },
    ],
  },

  // ── Agent 5：内容创作大师 ──
  {
    id: "cs-5-a", agentId: "5", title: "写一篇产品发布博客", lastActiveAt: "2026-05-06 14:30",
    messages: [
      { role: "user", content: "帮我写一篇关于新功能上线的博客，风格活泼一点" },
      { role: "agent", content: "已生成 800 字博客稿，含 3 个小节标题和 emoji 点缀。" },
    ],
  },

  // ── Agent 6：数据管道编排 ──
  {
    id: "cs-6-a", agentId: "6", title: "设计订单宽表 ETL", lastActiveAt: "2026-05-05 17:20",
    messages: [
      { role: "user", content: "我想把订单、用户、商品三张表合成一张宽表，怎么设计？" },
      { role: "agent", content: "建议按 order_id 为主键左连接 user 与 product，并物化为日级增量表……" },
    ],
  },

  // ── Agent p5：Prompt 精炼大师 ──
  {
    id: "cs-p5-a", agentId: "p5", title: "优化客服话术 Prompt", lastActiveAt: "2026-05-06 11:10",
    messages: [
      { role: "user", content: "帮我润色一下这个客服 Prompt" },
      { role: "agent", content: "已重写为结构化指令，明确角色/风格/约束三段。" },
    ],
  },
];

export const getSessionsByAgent = (agentId: string): ChatSession[] =>
  mockChatSessions
    .filter((s) => s.agentId === agentId)
    .sort((a, b) => b.lastActiveAt.localeCompare(a.lastActiveAt));

export const getChatSession = (sessionId: string): ChatSession | undefined =>
  mockChatSessions.find((s) => s.id === sessionId);

/* ── Credentials (reference real MCP names) ── */
export const mockCredentials: Credential[] = [
  { id: "c1", name: "腾讯文档 Token (个人)", type: "Bearer Token", mcpServer: "sfdoc-mcp", createdAt: "2026-03-15" },
  { id: "c2", name: "YApi 个人 Token", type: "Bearer Token", mcpServer: "yapi-mcp-server", createdAt: "2026-03-20" },
  { id: "c3", name: "Confluence OAuth", type: "OAuth 2.0", mcpServer: "confluence-mcp", createdAt: "2026-04-01" },
  { id: "c4", name: "丰景台扫码登录", type: "Bearer Token", mcpServer: "丰景台数据查询v2", createdAt: "2026-04-05" },
  { id: "c5", name: "钉钉企业 OAuth", type: "OAuth 2.0", mcpServer: "机器人消息", createdAt: "2026-04-08" },
  { id: "c6", name: "钉钉文档 OAuth", type: "OAuth 2.0", mcpServer: "钉钉文档", createdAt: "2026-04-08" },
  { id: "c7", name: "钉钉通讯录 OAuth", type: "OAuth 2.0", mcpServer: "钉钉通讯录", createdAt: "2026-04-08" },
  { id: "c8", name: "豆包 API Key", type: "Bearer Token", mcpServer: "豆包Seedance视频生成", createdAt: "2026-04-08" },
];
