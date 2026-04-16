/* ── Shared Types ── */

export interface Resource {
  id: string;
  name: string;
  type: "skill" | "mcp";
  description: string;
  status: "active" | "inactive";
  addedAt: string;
  usageCount: number;
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
  sessionCount: number;
  versions: Version[];
  creationType: "ai" | "upload";
  status: "published" | "draft" | "project";
  featured?: boolean;
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
  { id: "s1", name: "Web Search", type: "skill", description: "联网搜索能力，支持多搜索引擎", status: "active", addedAt: "2026-04-10", usageCount: 12 },
  { id: "s2", name: "Code Analysis", type: "skill", description: "代码分析与审查，支持多语言", status: "active", addedAt: "2026-04-08", usageCount: 8 },
  { id: "s3", name: "Email Parser", type: "skill", description: "邮件内容解析与结构化提取", status: "active", addedAt: "2026-04-05", usageCount: 5 },
  { id: "s4", name: "Translation Engine", type: "skill", description: "多语言翻译引擎，支持中英日韩", status: "active", addedAt: "2026-04-01", usageCount: 15 },
  { id: "s5", name: "Content Generation", type: "skill", description: "内容生成与创作", status: "inactive", addedAt: "2026-03-28", usageCount: 3 },
  { id: "s6", name: "SQL Generator", type: "skill", description: "SQL 查询自动生成与优化", status: "active", addedAt: "2026-03-25", usageCount: 7 },
  { id: "s7", name: "File Processor", type: "skill", description: "文件读写与格式转换", status: "active", addedAt: "2026-04-12", usageCount: 4 },
  { id: "s8", name: "Data Visualizer", type: "skill", description: "数据可视化图表生成", status: "inactive", addedAt: "2026-03-20", usageCount: 2 },
  { id: "s9", name: "Security Scanner", type: "skill", description: "安全漏洞扫描与检测", status: "active", addedAt: "2026-04-10", usageCount: 6 },
  { id: "s10", name: "Log Analyzer", type: "skill", description: "系统日志分析与异常检测", status: "active", addedAt: "2026-04-09", usageCount: 4 },
  { id: "s11", name: "Alert Manager", type: "skill", description: "告警管理与通知分发", status: "active", addedAt: "2026-04-08", usageCount: 3 },
  { id: "s12", name: "SEO Optimizer", type: "skill", description: "SEO 优化建议与关键词分析", status: "active", addedAt: "2026-04-07", usageCount: 5 },
  { id: "s13", name: "Schema Analyzer", type: "skill", description: "数据库 Schema 分析与优化", status: "active", addedAt: "2026-04-06", usageCount: 3 },
  { id: "m1", name: "GitHub MCP", type: "mcp", description: "GitHub 仓库、Issue、PR 管理", status: "active", addedAt: "2026-04-10", usageCount: 20 },
  { id: "m2", name: "Gmail MCP", type: "mcp", description: "Gmail 邮件收发与管理", status: "active", addedAt: "2026-04-08", usageCount: 10 },
  { id: "m3", name: "Slack MCP", type: "mcp", description: "Slack 消息与频道管理", status: "active", addedAt: "2026-04-05", usageCount: 6 },
  { id: "m4", name: "Notion MCP", type: "mcp", description: "Notion 页面与数据库操作", status: "active", addedAt: "2026-04-01", usageCount: 9 },
  { id: "m5", name: "Jira MCP", type: "mcp", description: "Jira 任务与项目管理", status: "inactive", addedAt: "2026-03-28", usageCount: 4 },
  { id: "m6", name: "Google Drive MCP", type: "mcp", description: "Google Drive 文件管理", status: "active", addedAt: "2026-03-25", usageCount: 11 },
  { id: "m7", name: "Confluence MCP", type: "mcp", description: "Confluence 文档协作", status: "inactive", addedAt: "2026-03-20", usageCount: 1 },
  { id: "m8", name: "Linear MCP", type: "mcp", description: "Linear 项目与 Issue 管理", status: "active", addedAt: "2026-04-13", usageCount: 3 },
  { id: "m9", name: "Outlook MCP", type: "mcp", description: "Outlook 邮件收发与日程管理", status: "active", addedAt: "2026-04-02", usageCount: 5 },
  { id: "m10", name: "Google Translate MCP", type: "mcp", description: "Google 翻译 API 服务", status: "active", addedAt: "2026-04-01", usageCount: 8 },
  { id: "m11", name: "Prometheus MCP", type: "mcp", description: "Prometheus 监控指标查询", status: "active", addedAt: "2026-04-05", usageCount: 3 },
  { id: "m12", name: "Grafana MCP", type: "mcp", description: "Grafana 仪表板与告警", status: "active", addedAt: "2026-04-04", usageCount: 2 },
  { id: "m13", name: "BigQuery MCP", type: "mcp", description: "BigQuery 数据查询与分析", status: "active", addedAt: "2026-04-03", usageCount: 6 },
  { id: "m14", name: "Snowflake MCP", type: "mcp", description: "Snowflake 数据仓库操作", status: "active", addedAt: "2026-04-02", usageCount: 4 },
];

/* ── Helper: get active resources as picker items ── */
export const getActiveSkills = () =>
  sharedResources.filter((r) => r.type === "skill" && r.status === "active").map((r) => ({ name: r.name, description: r.description }));

export const getActiveMCPs = () =>
  sharedResources.filter((r) => r.type === "mcp" && r.status === "active").map((r) => ({ name: r.name, description: r.description }));

/* ── Unified Agents (marketplace + project) ── */
export const mockAgents: Agent[] = [
  // Marketplace / published agents
  {
    id: "1", name: "inbox-searcher", avatar: "📧",
    description: "邮箱收件箱智能检索助手，可接入对应邮件相关上下文与检索目标，返回对应问题的答案",
    category: "数据分析", tags: ["数据分析", "高分智能体", "dataops"],
    platform: "AI技术平台", author: "张三", authorId: "01234567",
    updatedAt: "2026-04-04", downloads: 123,
    skills: ["Web Search", "Email Parser"], mcpServers: ["Gmail MCP", "Outlook MCP"],
    sessionCount: 89, creationType: "ai", status: "published",
    versions: [
      { version: "v0.0.3", createdAt: "2026-04-04", fileSize: "12KB", downloads: 45, status: "published", creator: "张三" },
      { version: "v0.0.2", createdAt: "2026-03-20", fileSize: "10KB", downloads: 60, status: "unpublished", creator: "张三" },
      { version: "v0.0.1", createdAt: "2026-03-01", fileSize: "8KB", downloads: 18, status: "unpublished", creator: "张三" },
    ],
  },
  {
    id: "2", name: "code-reviewer", avatar: "🔍",
    description: "智能代码审查助手，自动分析代码质量、安全漏洞和性能问题，生成详细审查报告",
    category: "编程开发", tags: ["编程开发", "代码审查", "devops"],
    platform: "AI技术平台", author: "李四", authorId: "01234568",
    updatedAt: "2026-04-10", downloads: 256,
    skills: ["Code Analysis", "Security Scanner"], mcpServers: ["GitHub MCP"],
    sessionCount: 150, creationType: "ai", status: "published",
    versions: [
      { version: "v0.1.0", createdAt: "2026-04-10", fileSize: "15KB", downloads: 120, status: "published", creator: "李四" },
    ],
  },
  {
    id: "3", name: "doc-translator", avatar: "🌐",
    description: "多语言文档翻译智能体，支持中英日韩等主流语言互译，保留原文格式与排版",
    category: "文档处理", tags: ["文档处理", "翻译", "多语言"],
    platform: "AI技术平台", author: "王五", authorId: "01234569",
    updatedAt: "2026-04-08", downloads: 412,
    skills: ["Translation Engine"], mcpServers: ["Google Translate MCP"],
    sessionCount: 230, creationType: "ai", status: "published",
    versions: [
      { version: "v1.0.0", createdAt: "2026-04-08", fileSize: "20KB", downloads: 412, status: "published", creator: "王五" },
    ],
  },
  {
    id: "4", name: "ops-monitor", avatar: "🖥️",
    description: "自动化运维监控智能体，实时分析系统日志与指标，自动告警并给出修复建议",
    category: "自动运维", tags: ["自动运维", "监控", "告警"],
    platform: "基础架构部", author: "赵六", authorId: "01234570",
    updatedAt: "2026-04-12", downloads: 87,
    skills: ["Log Analyzer", "Alert Manager"], mcpServers: ["Prometheus MCP", "Grafana MCP"],
    sessionCount: 45, creationType: "ai", status: "published",
    versions: [
      { version: "v0.2.0", createdAt: "2026-04-12", fileSize: "18KB", downloads: 87, status: "published", creator: "赵六" },
    ],
  },
  {
    id: "5", name: "content-writer", avatar: "✍️",
    description: "智能内容创作助手，支持营销文案、技术文档、社交媒体帖子等多种风格写作",
    category: "内容创作", tags: ["内容创作", "文案", "营销"],
    platform: "市场部", author: "钱七", authorId: "01234571",
    updatedAt: "2026-04-11", downloads: 198,
    skills: ["Content Generation", "SEO Optimizer"], mcpServers: [],
    sessionCount: 120, creationType: "ai", status: "published",
    versions: [
      { version: "v0.3.1", createdAt: "2026-04-11", fileSize: "14KB", downloads: 198, status: "published", creator: "钱七" },
    ],
  },
  {
    id: "6", name: "data-pipeline", avatar: "📊",
    description: "数据管道编排智能体，自动设计和优化ETL流程，支持多数据源接入与转换",
    category: "数据分析", tags: ["数据分析", "ETL", "数据工程"],
    platform: "数据中心", author: "孙八", authorId: "01234572",
    updatedAt: "2026-04-09", downloads: 156,
    skills: ["SQL Generator", "Schema Analyzer"], mcpServers: ["BigQuery MCP", "Snowflake MCP"],
    sessionCount: 78, creationType: "ai", status: "published",
    versions: [
      { version: "v0.1.2", createdAt: "2026-04-09", fileSize: "22KB", downloads: 156, status: "published", creator: "孙八" },
    ],
  },
  // Project-only agents (my creations)
  {
    id: "p1", name: "雨是神明放的烟花 副本", avatar: "🌧️",
    description: "暮色里的雨，是神明燃尽的烟花余烬，千万滴雨同时坠落，落满山川湖海，让每个抬头看天的人，都能接住一场专属的绽放。",
    category: "视觉设计", tags: ["视觉设计"],
    platform: "AI技术平台", author: "廖奕通", authorId: "01441970",
    updatedAt: "2026-04-13", downloads: 0,
    skills: [], mcpServers: [],
    sessionCount: 0, creationType: "ai", status: "project",
    versions: [],
  },
  {
    id: "p2", name: "Apple风证件照生成", avatar: "📷",
    description: "上传照片智能生成专业证件照。支持多比例、多张生成及迭代优化，打造专业职场形象",
    category: "视觉设计", tags: ["视觉设计", "图像处理"],
    platform: "AI技术平台", author: "廖奕通", authorId: "01441970",
    updatedAt: "2026-04-10", downloads: 34,
    skills: ["File Processor"], mcpServers: [],
    sessionCount: 12, creationType: "ai", status: "published",
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
    sessionCount: 0, creationType: "ai", status: "draft",
    versions: [],
  },
  {
    id: "p4", name: "JSON万能工具箱", avatar: "🟢",
    description: "集JSON格式检查、格式化、差异对比和转表格于一体的高效处理工具",
    category: "技术研发", tags: ["技术研发", "工具"],
    platform: "AI技术平台", author: "廖奕通", authorId: "01441970",
    updatedAt: "2026-04-01", downloads: 56,
    skills: ["File Processor"], mcpServers: [],
    sessionCount: 20, creationType: "ai", status: "published",
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
    sessionCount: 35, creationType: "ai", status: "published",
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
    sessionCount: 0, creationType: "ai", status: "draft",
    versions: [],
  },
  {
    id: "p7", name: "实时文字转语音", avatar: "🎵",
    description: "实时文字转语音，支持多种音色和语速调整",
    category: "精选应用", tags: ["精选应用", "语音"],
    platform: "AI技术平台", author: "张毅超", authorId: "01422596",
    updatedAt: "2026-03-25", downloads: 145,
    skills: [], mcpServers: [],
    sessionCount: 60, creationType: "upload", status: "published", featured: true,
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
    skills: ["File Processor"], mcpServers: ["Google Drive MCP"],
    sessionCount: 25, creationType: "upload", status: "published",
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
    sessionCount: 8, creationType: "ai", status: "project", featured: true,
    versions: [],
  },
];

/* ── Helper: filter agents by context ── */
export const getMarketplaceAgents = () => mockAgents.filter((a) => a.status === "published");
export const getMyAgents = () => mockAgents.filter((a) => ["01441970", "01422596", "01419965"].includes(a.authorId));
export const getRecentAgents = () => [...mockAgents].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6);

/* ── Sessions (reference real agent IDs) ── */
export const mockSessions: Session[] = [
  { id: "s1", agentId: "1", agentName: "inbox-searcher", agentAvatar: "📧", lastMessage: "已找到3封与项目预算相关的邮件", lastActiveAt: "2026-04-13 10:30", status: "ended" },
  { id: "s2", agentId: "2", agentName: "code-reviewer", agentAvatar: "🔍", lastMessage: "发现2个潜在安全漏洞，建议立即修复", lastActiveAt: "2026-04-13 09:15", status: "running" },
  { id: "s3", agentId: "3", agentName: "doc-translator", agentAvatar: "🌐", lastMessage: "文档翻译完成，共翻译1,200字", lastActiveAt: "2026-04-12 16:45", status: "ended" },
  { id: "s4", agentId: "p2", agentName: "Apple风证件照生成", agentAvatar: "📷", lastMessage: "证件照已生成，共3张不同比例", lastActiveAt: "2026-04-11 14:20", status: "ended" },
  { id: "s5", agentId: "p5", agentName: "Prompt精炼大师", agentAvatar: "🅿️", lastMessage: "已优化你的 Prompt，逻辑更清晰", lastActiveAt: "2026-04-10 16:00", status: "ended" },
];

/* ── Credentials (reference real MCP names) ── */
export const mockCredentials: Credential[] = [
  { id: "c1", name: "Gmail API Token", type: "Bearer Token", mcpServer: "Gmail MCP", createdAt: "2026-03-15" },
  { id: "c2", name: "GitHub OAuth", type: "OAuth 2.0", mcpServer: "GitHub MCP", createdAt: "2026-03-20" },
  { id: "c3", name: "Slack Bot Token", type: "Bearer Token", mcpServer: "Slack MCP", createdAt: "2026-04-01" },
  { id: "c4", name: "Notion Integration", type: "Bearer Token", mcpServer: "Notion MCP", createdAt: "2026-04-05" },
  { id: "c5", name: "Google Drive OAuth", type: "OAuth 2.0", mcpServer: "Google Drive MCP", createdAt: "2026-04-08" },
];
