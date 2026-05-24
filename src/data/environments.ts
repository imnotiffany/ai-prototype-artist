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
}

export const defaultEnvironments: EnvItem[] = [
  {
    id: "env-default",
    envId: "env-default",
    name: "默认环境",
    spec: "4C 8G",
    deps: 32,
    agents: 8,
    updatedAt: "2026-05-20 10:23",
    preset: true,
    description: "已预装常用基础依赖：Python 3.11 / Node 20 / pandas / numpy / requests / playwright 等",
  },
];

let envStore: EnvItem[] = [...defaultEnvironments];

export const getEnvironments = () => envStore;
export const setEnvironments = (list: EnvItem[]) => {
  envStore = list;
};
