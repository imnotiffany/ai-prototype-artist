/** 平台镜像（含版本） */
export interface ImageVersion {
  version: string;
  tag?: "标准";
  isDefault?: boolean;
}
export interface PlatformImage {
  id: string;
  name: string;
  description?: string;
  versions: ImageVersion[];
}

export const platformImages: PlatformImage[] = [
  {
    id: "img-gurobi",
    name: "gurobi9.1.2-tensorflow2.11.0-pytorch1.12-py3.8-vscode",
    description: "Gurobi + TF + PyTorch 综合镜像",
    versions: [
      { version: "v1", tag: "标准", isDefault: true },
      { version: "v0.9" },
    ],
  },
  {
    id: "img-julia",
    name: "julia1.8-r4.1-py3.8-vscode",
    description: "Julia + R + Python",
    versions: [{ version: "v1", tag: "标准" }],
  },
  {
    id: "img-tf-py38",
    name: "tensorflow2.11.0-pytorch1.12-py3.8-vscode",
    versions: [
      { version: "v2", tag: "标准" },
      { version: "v1" },
    ],
  },
  {
    id: "img-tf-py39",
    name: "tensorflow2.11.0-pytorch1.12-py3.9-vscode",
    versions: [{ version: "v1" }],
  },
  {
    id: "img-algo-2023",
    name: "algorithm-match-2023-vscode",
    versions: [{ version: "v1" }, { version: "v0.9" }],
  },
];

/** 自定义镜像（用户上传/构建） */
export const customImages: PlatformImage[] = [
  {
    id: "img-custom-llm",
    name: "team-llm-serving",
    description: "团队自建 LLM 服务镜像",
    versions: [{ version: "v3", tag: "标准" }, { version: "v2" }, { version: "v1" }],
  },
];

export type ImageSource = "platform" | "custom";

/** 兼容旧引用 */
export const projectImages = platformImages;

/** 顺丰云已有 DU 列表 */
export const DU_OPTIONS = [
  "TEST-SYSTEM-TIME-AI-MODELSERVICE",
  "AOP-EXPECT-INFO-AI-MODELSERVICE",
  "CDN-INFO-AI-MODELSERVICE",
  "CDN-AI-MODELSERVICE",
  "ENDEPT-A-DUBBO-K8S-AI-MODELSERVICE",
  "TST01453613-AI-MODELSERVICE",
  "ZY-TEST02-AI-MODELSERVICE",
  "SMART-BRIEFING-MCP3-AI-MODELSERVICE",
];

/** 默认选择 */
export const DEFAULT_IMAGE = {
  source: "platform" as ImageSource,
  imageId: "img-gurobi",
  version: "v1",
};

export function findImage(source: ImageSource, imageId: string): PlatformImage | undefined {
  const list = source === "platform" ? platformImages : customImages;
  return list.find((i) => i.id === imageId);
}
