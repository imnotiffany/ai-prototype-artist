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
  network?: string;
}

const DEFAULT_DEPS: EnvDep[] = [
  // Python
  { manager: "pip", spec: "pandas==2.2.0" },
  { manager: "pip", spec: "numpy==1.26.4" },
  { manager: "pip", spec: "requests==2.32.3" },
  { manager: "pip", spec: "httpx==0.27.0" },
  { manager: "pip", spec: "playwright==1.45.0" },
  { manager: "pip", spec: "beautifulsoup4==4.12.3" },
  { manager: "pip", spec: "lxml==5.2.2" },
  { manager: "pip", spec: "openpyxl==3.1.5" },
  { manager: "pip", spec: "pillow==10.4.0" },
  { manager: "pip", spec: "matplotlib==3.9.0" },
  { manager: "pip", spec: "scikit-learn==1.5.0" },
  { manager: "pip", spec: "pydantic==2.8.2" },
  { manager: "pip", spec: "fastapi==0.111.0" },
  { manager: "pip", spec: "uvicorn==0.30.1" },
  { manager: "pip", spec: "sqlalchemy==2.0.31" },
  { manager: "pip", spec: "redis==5.0.7" },
  { manager: "pip", spec: "pyyaml==6.0.1" },
  { manager: "pip", spec: "python-dotenv==1.0.1" },
  // Node
  { manager: "npm", spec: "axios@1.7.2" },
  { manager: "npm", spec: "lodash@4.17.21" },
  { manager: "npm", spec: "dayjs@1.11.11" },
  { manager: "npm", spec: "zod@3.23.8" },
  { manager: "npm", spec: "puppeteer@22.13.0" },
  { manager: "npm", spec: "cheerio@1.0.0" },
  { manager: "npm", spec: "typescript@5.5.3" },
  // System
  { manager: "apt", spec: "curl" },
  { manager: "apt", spec: "git" },
  { manager: "apt", spec: "ffmpeg" },
  { manager: "apt", spec: "poppler-utils" },
  { manager: "apt", spec: "imagemagick" },
  { manager: "apt", spec: "tesseract-ocr" },
  { manager: "apt", spec: "chromium" },
];

export const defaultEnvironments: EnvItem[] = [
  {
    id: "env-default",
    envId: "env-default",
    name: "默认环境",
    spec: "4C 8G",
    deps: DEFAULT_DEPS.length,
    agents: 8,
    updatedAt: "2026-05-20 10:23",
    preset: true,
    description: "",
    depList: DEFAULT_DEPS,
    network: "internet",
  },
];

let envStore: EnvItem[] = [...defaultEnvironments];

export const getEnvironments = () => envStore;
export const setEnvironments = (list: EnvItem[]) => {
  envStore = list;
};
