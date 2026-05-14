import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { mockAgents } from "@/data/mockData";

export interface Tab {
  key: string;
  title: string;
  path: string;
  closable: boolean;
}

function resolveTab(pathname: string): Tab | null {
  if (pathname === "/")
    return { key: "marketplace", title: "作品广场", path: "/", closable: false };
  if (pathname.startsWith("/create"))
    return { key: "create", title: "新建作品", path: pathname, closable: false };
  if (pathname === "/project-agents")
    return { key: "manage", title: "作品管理", path: "/project-agents", closable: false };
  if (pathname === "/vault")
    return { key: "mcp", title: "MCP 管理", path: "/vault", closable: false };
  if (pathname === "/workspace")
    return { key: "workspace", title: "工作区", path: "/workspace", closable: true };

  const m = pathname.match(/^\/(app|chat|agent)\/(.+)$/);
  if (m) {
    const id = m[2];
    const agent = mockAgents.find((a) => a.id === id);
    return {
      key: pathname,
      title: agent?.name ?? (m[1] === "app" ? "应用" : "智能体"),
      path: pathname,
      closable: true,
    };
  }
  return null;
}

interface TabsCtx {
  tabs: Tab[];
  activeKey: string | null;
  closeTab: (key: string) => void;
}

const TabsContext = createContext<TabsCtx>({
  tabs: [],
  activeKey: null,
  closeTab: () => {},
});

export const TabsProvider = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  useEffect(() => {
    const t = resolveTab(location.pathname);
    if (!t) return;
    setTabs((prev) => {
      const exists = prev.some((x) => x.key === t.key);
      if (exists) {
        return prev.map((x) =>
          x.key === t.key ? { ...x, path: location.pathname, title: t.title } : x
        );
      }
      return [...prev, t];
    });
    setActiveKey(t.key);
  }, [location.pathname]);

  const closeTab = (key: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((x) => x.key === key);
      if (idx < 0) return prev;
      const next = prev.filter((x) => x.key !== key);
      if (key === activeKey) {
        const fallback = next[idx] ?? next[idx - 1] ?? null;
        navigate(fallback ? fallback.path : "/");
      }
      return next;
    });
  };

  return (
    <TabsContext.Provider value={{ tabs, activeKey, closeTab }}>
      {children}
    </TabsContext.Provider>
  );
};

export const useTabs = () => useContext(TabsContext);
