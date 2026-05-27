export type EnvDep = { manager: "apt" | "cargo" | "gem" | "go" | "npm" | "pip"; spec: string };

export interface EnvItem {
  id: string;
  envId: string;
  name: string;
  spec: string;
  deps: number;
  agents: number;
  updatedAt: string;
  preset?: boolean;
  description?: string;
  depList?: EnvDep[];
  /** 选用的镜像 ID */
  image?: string;
  /** DU 模式：new 新建 / existing 已有 */
  duMode?: "new" | "existing";
  /** DU 名称（new）或选中的 DU（existing） */
  du?: string;
  /** 实例数量（1-4，默认 1） */
  instances?: number;
}

/** 项目内可选镜像 */
export const projectImages: { id: string; name: string; description?: string; isDefault?: boolean }[] = [
  { id: "img-default", name: "默认镜像", description: "Python 3.11 + Node 20 + 常用 AI/数据科学依赖", isDefault: true },
  { id: "img-python-slim", name: "python-3.11-slim", description: "精简 Python 运行时" },
  { id: "img-node-20", name: "node-20-alpine", description: "Node.js 20 Alpine 镜像" },
  { id: "img-data-sci", name: "data-science-base", description: "pandas / numpy / scikit-learn 数据科学镜像" },
  { id: "img-playwright", name: "playwright-chromium", description: "内置 Playwright 与 Chromium 的浏览器自动化镜像" },
];

export const defaultEnvironments: EnvItem[] = [
  {
    id: "env-default",
    envId: "env-default",
    name: "默认环境",
    spec: "4C 8G",
    deps: 0,
    agents: 8,
    updatedAt: "2026-05-20 10:23",
    preset: true,
    description: "",
    image: "img-default",
    duMode: "new",
    du: "DEFAULT-AI-MODELSERVICE",
    instances: 1,
  },
];

let envStore: EnvItem[] = [...defaultEnvironments];

export const getEnvironments = () => envStore;
export const setEnvironments = (list: EnvItem[]) => {
  envStore = list;
};
