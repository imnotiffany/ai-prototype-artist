import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { mockAgents } from "@/data/mockData";

export type Section = "create" | "marketplace" | "manage" | "mcp";

export interface Tab {
  key: string;
  title: string;
  path: string;
  closable: boolean;
  section: Section;
}

interface ResolvedRoute {
  section: Section;
  tab?: Tab;
  isDynamic?: boolean;
}

function resolveRoute(pathname: string): ResolvedRoute | null {
  if (pathname.startsWith("/create")) {
    return {
      section: "create",
      tab: { key: "create", title: "新建作品", path: pathname, closable: false, section: "create" },
    };
  }
  if (pathname === "/") {
    return {
      section: "marketplace",
      tab: { key: "marketplace", title: "作品广场", path: "/", closable: false, section: "marketplace" },
    };
  }
  if (pathname === "/project") {
    return {
      section: "marketplace",
      tab: { key: "project", title: "项目作品", path: "/project", closable: false, section: "marketplace" },
    };
  }
  if (pathname === "/project-agents") {
    return {
      section: "manage",
      tab: { key: "manage", title: "作品管理", path: "/project-agents", closable: false, section: "manage" },
    };
  }
  if (pathname === "/vault") {
    return {
      section: "mcp",
      tab: { key: "mcp", title: "MCP 管理", path: "/vault", closable: false, section: "mcp" },
    };
  }

  const m = pathname.match(/^\/(app|chat|agent)\/(.+)$/);
  if (m) {
    const id = m[2];
    const agent = mockAgents.find((a) => a.id === id);
    return {
      section: "marketplace", // overridden by current activeSection in provider
      isDynamic: true,
      tab: {
        key: pathname,
        title: agent?.name ?? (m[1] === "app" ? "应用" : "智能体"),
        path: pathname,
        closable: true,
        section: "marketplace",
      },
    };
  }
  return null;
}

interface TabsCtx {
  tabs: Tab[]; // only current section
  activeKey: string | null;
  activeSection: Section | null;
  closeTab: (key: string) => void;
}

const TabsContext = createContext<TabsCtx>({
  tabs: [],
  activeKey: null,
  activeSection: null,
  closeTab: () => {},
});

const SECTION_HOME: Record<Section, string> = {
  create: "/create",
  marketplace: "/",
  manage: "/project-agents",
  mcp: "/vault",
};

export const TabsProvider = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [allTabs, setAllTabs] = useState<Tab[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<Section | null>(null);

  useEffect(() => {
    const r = resolveRoute(location.pathname);
    if (!r || !r.tab) return;

    const section: Section = r.isDynamic
      ? activeSection ?? r.section
      : r.section;
    const tab: Tab = { ...r.tab, section };

    setAllTabs((prev) => {
      const exists = prev.some((x) => x.key === tab.key);
      if (exists) {
        return prev.map((x) =>
          x.key === tab.key ? { ...x, path: tab.path, title: tab.title, section } : x
        );
      }
      return [...prev, tab];
    });
    setActiveKey(tab.key);
    setActiveSection(section);
  }, [location.pathname]);

  const closeTab = (key: string) => {
    setAllTabs((prev) => {
      const idx = prev.findIndex((x) => x.key === key);
      if (idx < 0) return prev;
      const closing = prev[idx];
      const next = prev.filter((x) => x.key !== key);
      if (key === activeKey) {
        const sectionTabs = next.filter((t) => t.section === closing.section);
        const fallback = sectionTabs[sectionTabs.length - 1] ?? null;
        navigate(fallback ? fallback.path : SECTION_HOME[closing.section]);
      }
      return next;
    });
  };

  const visibleTabs = activeSection
    ? allTabs.filter((t) => t.section === activeSection)
    : [];

  return (
    <TabsContext.Provider
      value={{ tabs: visibleTabs, activeKey, activeSection, closeTab }}
    >
      {children}
    </TabsContext.Provider>
  );
};

export const useTabs = () => useContext(TabsContext);

export const SECTION_PATHS: Record<Section, string[]> = {
  create: ["/create", "/create-web", "/create-agent", "/create-agent-manual", "/create-skill"],
  marketplace: ["/", "/project", "/app/", "/chat/", "/agent/"],
  manage: ["/project-agents"],
  mcp: ["/vault"],
};

export function pathToSection(pathname: string): Section | null {
  if (pathname.startsWith("/create")) return "create";
  if (
    pathname === "/" ||
    pathname === "/project" ||
    pathname.startsWith("/app/") ||
    pathname.startsWith("/chat/") ||
    pathname.startsWith("/agent/")
  )
    return "marketplace";
  if (pathname === "/project-agents") return "manage";
  if (pathname === "/vault") return "mcp";
  return null;
}
