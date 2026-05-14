import { useLocation, useNavigate } from "react-router-dom";
import { Compass, Plus, FolderOpen, Server } from "lucide-react";
import { cn } from "@/lib/utils";
import { pathToSection, type Section } from "@/contexts/TabsContext";

const menuSections: {
  label: string;
  items: { name: string; path: string; icon: typeof Plus; section: Section }[];
}[] = [
  {
    label: "工作台",
    items: [
      { name: "新建作品", path: "/create", icon: Plus, section: "create" },
      { name: "作品广场", path: "/", icon: Compass, section: "marketplace" },
    ],
  },
  {
    label: "管理",
    items: [
      { name: "作品管理", path: "/project-agents", icon: FolderOpen, section: "manage" },
      { name: "MCP 管理", path: "/vault", icon: Server, section: "mcp" },
    ],
  },
];

export const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentSection = pathToSection(location.pathname);

  return (
    <aside className="w-[130px] border-r border-border bg-sidebar flex flex-col py-3 shrink-0">
      {menuSections.map((section, si) => (
        <div key={si} className="mb-1">
          {section.label && (
            <div className="px-3 py-1 text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
              {section.label}
            </div>
          )}
          {section.items.map((item) => {
            const isActive = currentSection === item.section;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "w-full flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors",
                  isActive
                    ? "text-primary font-medium bg-accent"
                    : "text-sidebar-foreground hover:bg-secondary"
                )}
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.name}
              </button>
            );
          })}
        </div>
      ))}
    </aside>
  );
};
