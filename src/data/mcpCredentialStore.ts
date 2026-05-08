/**
 * 简易模块级 store：记录"已配置凭据"的 MCP 名称集合。
 *
 * 流转规则：
 * - 免凭据 MCP（requiresCredential=false）：默认即出现在 MCP 管理列表中，可直接在拼装时选用，不需要进入 store。
 * - 需凭据 MCP（requiresCredential=true）：用户必须在「MCP 管理 → 新增 MCP」中配置凭据后才会进入 store；
 *   只有进入 store 的 MCP 才会出现在 MCP 管理列表，并允许在拼装中开启选择；未配置的展示在拼装弹窗的「未配置」分组，
 *   不能开启，仅提供跳转 MCP 管理的链接。
 */

type Listener = () => void;

const configured = new Set<string>();
const listeners = new Set<Listener>();

const emit = () => listeners.forEach((l) => l());

export const isMcpConfigured = (name: string) => configured.has(name);

export const getConfiguredMcps = () => Array.from(configured);

export const setMcpConfigured = (name: string, value: boolean) => {
  if (value) configured.add(name);
  else configured.delete(name);
  emit();
};

export const subscribeMcpStore = (l: Listener) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
