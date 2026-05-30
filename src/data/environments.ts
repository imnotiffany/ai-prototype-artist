/** 项目内可选镜像 */
export const projectImages: { id: string; name: string; description?: string; isDefault?: boolean }[] = [
  { id: "img-default", name: "默认镜像", description: "Python 3.11 + Node 20 + 常用 AI/数据科学依赖", isDefault: true },
  { id: "img-python-slim", name: "python-3.11-slim", description: "精简 Python 运行时" },
  { id: "img-node-20", name: "node-20-alpine", description: "Node.js 20 Alpine 镜像" },
  { id: "img-data-sci", name: "data-science-base", description: "pandas / numpy / scikit-learn 数据科学镜像" },
  { id: "img-playwright", name: "playwright-chromium", description: "内置 Playwright 与 Chromium 的浏览器自动化镜像" },
];

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
