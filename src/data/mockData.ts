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

export const categories = [
  "文档处理", "数据分析", "编程开发", "自动运维", "内容创作", "企业办公", "其他类型"
];

export const mockAgents: Agent[] = [
  {
    id: "1",
    name: "inbox-searcher",
    avatar: "📧",
    description: "邮箱收件箱智能检索助手，可接入对应邮件相关上下文与检索目标，返回对应问题的答案",
    category: "数据分析",
    tags: ["数据分析", "高分智能体", "dataops"],
    platform: "AI技术平台",
    author: "张三",
    authorId: "01234567",
    updatedAt: "2026-04-04",
    downloads: 123,
    skills: ["Web Search", "Email Parser"],
    mcpServers: ["Gmail MCP", "Outlook MCP"],
    sessionCount: 89,
    versions: [
      { version: "v0.0.3", createdAt: "2026-04-04", fileSize: "12KB", downloads: 45, status: "published", creator: "张三" },
      { version: "v0.0.2", createdAt: "2026-03-20", fileSize: "10KB", downloads: 60, status: "unpublished", creator: "张三" },
      { version: "v0.0.1", createdAt: "2026-03-01", fileSize: "8KB", downloads: 18, status: "unpublished", creator: "张三" },
    ],
  },
  {
    id: "2",
    name: "code-reviewer",
    avatar: "🔍",
    description: "智能代码审查助手，自动分析代码质量、安全漏洞和性能问题，生成详细审查报告",
    category: "编程开发",
    tags: ["编程开发", "代码审查", "devops"],
    platform: "AI技术平台",
    author: "李四",
    authorId: "01234568",
    updatedAt: "2026-04-10",
    downloads: 256,
    skills: ["Code Analysis", "Security Scanner"],
    mcpServers: ["GitHub MCP"],
    sessionCount: 150,
    versions: [
      { version: "v0.1.0", createdAt: "2026-04-10", fileSize: "15KB", downloads: 120, status: "published", creator: "李四" },
    ],
  },
  {
    id: "3",
    name: "doc-translator",
    avatar: "🌐",
    description: "多语言文档翻译智能体，支持中英日韩等主流语言互译，保留原文格式与排版",
    category: "文档处理",
    tags: ["文档处理", "翻译", "多语言"],
    platform: "AI技术平台",
    author: "王五",
    authorId: "01234569",
    updatedAt: "2026-04-08",
    downloads: 412,
    skills: ["Translation Engine"],
    mcpServers: ["Google Translate MCP"],
    sessionCount: 230,
    versions: [
      { version: "v1.0.0", createdAt: "2026-04-08", fileSize: "20KB", downloads: 412, status: "published", creator: "王五" },
    ],
  },
  {
    id: "4",
    name: "ops-monitor",
    avatar: "🖥️",
    description: "自动化运维监控智能体，实时分析系统日志与指标，自动告警并给出修复建议",
    category: "自动运维",
    tags: ["自动运维", "监控", "告警"],
    platform: "基础架构部",
    author: "赵六",
    authorId: "01234570",
    updatedAt: "2026-04-12",
    downloads: 87,
    skills: ["Log Analyzer", "Alert Manager"],
    mcpServers: ["Prometheus MCP", "Grafana MCP"],
    sessionCount: 45,
    versions: [
      { version: "v0.2.0", createdAt: "2026-04-12", fileSize: "18KB", downloads: 87, status: "published", creator: "赵六" },
    ],
  },
  {
    id: "5",
    name: "content-writer",
    avatar: "✍️",
    description: "智能内容创作助手，支持营销文案、技术文档、社交媒体帖子等多种风格写作",
    category: "内容创作",
    tags: ["内容创作", "文案", "营销"],
    platform: "市场部",
    author: "钱七",
    authorId: "01234571",
    updatedAt: "2026-04-11",
    downloads: 198,
    skills: ["Content Generation", "SEO Optimizer"],
    mcpServers: [],
    sessionCount: 120,
    versions: [
      { version: "v0.3.1", createdAt: "2026-04-11", fileSize: "14KB", downloads: 198, status: "published", creator: "钱七" },
    ],
  },
  {
    id: "6",
    name: "data-pipeline",
    avatar: "📊",
    description: "数据管道编排智能体，自动设计和优化ETL流程，支持多数据源接入与转换",
    category: "数据分析",
    tags: ["数据分析", "ETL", "数据工程"],
    platform: "数据中心",
    author: "孙八",
    authorId: "01234572",
    updatedAt: "2026-04-09",
    downloads: 156,
    skills: ["SQL Generator", "Schema Analyzer"],
    mcpServers: ["BigQuery MCP", "Snowflake MCP"],
    sessionCount: 78,
    versions: [
      { version: "v0.1.2", createdAt: "2026-04-09", fileSize: "22KB", downloads: 156, status: "published", creator: "孙八" },
    ],
  },
];

export const mockSessions: Session[] = [
  { id: "s1", agentName: "inbox-searcher", agentAvatar: "📧", lastMessage: "已找到3封与项目预算相关的邮件", lastActiveAt: "2026-04-13 10:30", status: "ended" },
  { id: "s2", agentName: "code-reviewer", agentAvatar: "🔍", lastMessage: "发现2个潜在安全漏洞，建议立即修复", lastActiveAt: "2026-04-13 09:15", status: "running" },
  { id: "s3", agentName: "doc-translator", agentAvatar: "🌐", lastMessage: "文档翻译完成，共翻译1,200字", lastActiveAt: "2026-04-12 16:45", status: "ended" },
];

export const mockCredentials: Credential[] = [
  { id: "c1", name: "Gmail API Token", type: "Bearer Token", mcpServer: "Gmail MCP", createdAt: "2026-03-15" },
  { id: "c2", name: "GitHub OAuth", type: "OAuth 2.0", mcpServer: "GitHub MCP", createdAt: "2026-03-20" },
  { id: "c3", name: "Slack Bot Token", type: "Bearer Token", mcpServer: "Slack MCP", createdAt: "2026-04-01" },
];
