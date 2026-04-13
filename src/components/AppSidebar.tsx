import { useLocation, useNavigate } from "react-router-dom";
import { Compass, LayoutGrid, FolderOpen, MessageSquare, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";

const menuSections = [
  {
    label: "探索",
    items: [
      { name: "智能体广场", path: "/", icon: Compass },
    ],
  },
  {
    label: "",
    items: [
      { name: "工作台", path: "/workspace", icon: LayoutGrid },
      { name: "项目智能体", path: "/project-agents", icon: FolderOpen },
      { name: "会话记录", path: "/sessions", icon: MessageSquare },
      { name: "凭据金库", path: "/vault", icon: KeyRound },
    ],
  },
];

export const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <aside className="w-[140px] border-r border-border bg-sidebar flex flex-col py-4 shrink-0">
      {menuSections.map((section, si) => (
        <div key={si} className="mb-2">
          {section.label && (
            <div className="px-4 py-1 text-xs font-medium text-muted-foreground">
              {section.label}
            </div>
          )}
          {section.items.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors",
                  isActive
                    ? "text-primary font-medium bg-accent"
                    : "text-sidebar-foreground hover:bg-secondary"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </button>
            );
          })}
        </div>
      ))}
    </aside>
  );
};
