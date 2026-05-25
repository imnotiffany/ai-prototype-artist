/* ── Artifacts model & mock data ── */

export type ArtifactType =
  | "image"
  | "doc"
  | "table"
  | "code"
  | "audio"
  | "video"
  | "pdf"
  | "file";

export type ArtifactSource = "agent" | "tool" | "user_upload";

export interface Artifact {
  id: string;
  /** 含目录的完整路径，如 "imgs/cover.png" */
  path: string;
  name: string;
  type: ArtifactType;
  mime: string;
  /** bytes */
  size: number;
  /** mock 下载/预览 url */
  url: string;
  /** 文本类产物的预览内容（md/txt/json/code） */
  preview?: string;
  createdAt: string;
  source: ArtifactSource;
  /** 来源工具名（source === 'tool' 时） */
  toolName?: string;
}

export const formatBytes = (b: number) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};

export const guessTypeFromName = (name: string): ArtifactType => {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext)) return "image";
  if (["md", "markdown", "txt", "log", "readme"].includes(ext)) return "doc";
  if (["csv", "xlsx", "xls"].includes(ext)) return "table";
  if (["json", "yaml", "yml", "js", "ts", "tsx", "jsx", "py", "go", "java", "html", "css"].includes(ext))
    return "code";
  if (["mp3", "wav", "m4a"].includes(ext)) return "audio";
  if (["mp4", "mov", "webm"].includes(ext)) return "video";
  if (ext === "pdf") return "pdf";
  return "file";
};

export const mockArtifacts: Artifact[] = [
  {
    id: "a1",
    path: "reports/api中转站行业调研.md",
    name: "api中转站行业调研.md",
    type: "doc",
    mime: "text/markdown",
    size: 12480,
    url: "#",
    createdAt: "2026-05-24 14:21",
    source: "tool",
    toolName: "report_writer",
    preview:
      "# API 中转站行业调研\n\n## 一、市场概况\nAPI 中转站作为大模型生态中的关键基础设施，承担着请求转发、计费、限流、模型路由等职责……\n\n## 二、主要玩家\n- OpenRouter\n- One API\n- New API\n\n## 三、定价模式\n按 token 加价、按请求加价、订阅制三种为主。",
  },
  {
    id: "a2",
    path: "reports/竞品矩阵.csv",
    name: "竞品矩阵.csv",
    type: "table",
    mime: "text/csv",
    size: 3210,
    url: "#",
    createdAt: "2026-05-24 14:25",
    source: "tool",
    toolName: "report_writer",
    preview: "name,country,pricing,users\nOpenRouter,US,token+5%,120k\nOne API,CN,token+3%,80k\nNew API,CN,subscription,40k",
  },
  {
    id: "a3",
    path: "imgs/市场结构图.png",
    name: "市场结构图.png",
    type: "image",
    mime: "image/png",
    size: 248000,
    url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format",
    createdAt: "2026-05-24 14:30",
    source: "tool",
    toolName: "chart_renderer",
  },
  {
    id: "a4",
    path: "imgs/定价对比.png",
    name: "定价对比.png",
    type: "image",
    mime: "image/png",
    size: 196000,
    url: "https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=800&auto=format",
    createdAt: "2026-05-24 14:32",
    source: "tool",
    toolName: "chart_renderer",
  },
  {
    id: "a5",
    path: "data/raw_metrics.json",
    name: "raw_metrics.json",
    type: "code",
    mime: "application/json",
    size: 5120,
    url: "#",
    createdAt: "2026-05-24 14:18",
    source: "tool",
    toolName: "researcher",
    preview: '{\n  "providers": 12,\n  "avg_markup": 0.045,\n  "top_region": "CN"\n}',
  },
  {
    id: "a6",
    path: "需求说明.pdf",
    name: "需求说明.pdf",
    type: "pdf",
    mime: "application/pdf",
    size: 820000,
    url: "#",
    createdAt: "2026-05-24 13:50",
    source: "user_upload",
  },
];

/** 文件树节点 */
export interface ArtifactTreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  artifact?: Artifact;
  children?: ArtifactTreeNode[];
}

export const buildArtifactTree = (artifacts: Artifact[]): ArtifactTreeNode[] => {
  const root: ArtifactTreeNode[] = [];
  for (const a of artifacts) {
    const parts = a.path.split("/");
    let cur = root;
    let acc = "";
    parts.forEach((part, i) => {
      acc = acc ? `${acc}/${part}` : part;
      const isLast = i === parts.length - 1;
      let node = cur.find((n) => n.name === part && n.isFolder === !isLast);
      if (!node) {
        node = { name: part, path: acc, isFolder: !isLast, children: isLast ? undefined : [] };
        if (isLast) node.artifact = a;
        cur.push(node);
      }
      if (!isLast) cur = node.children!;
    });
  }
  // 排序：文件夹优先
  const sort = (list: ArtifactTreeNode[]) => {
    list.sort((a, b) => (a.isFolder === b.isFolder ? a.name.localeCompare(b.name) : a.isFolder ? -1 : 1));
    list.forEach((n) => n.children && sort(n.children));
  };
  sort(root);
  return root;
};
