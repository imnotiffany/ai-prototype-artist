import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { useTabs } from "@/contexts/TabsContext";
import { cn } from "@/lib/utils";

export const TabBar = () => {
  const { tabs, activeKey, closeTab } = useTabs();
  const navigate = useNavigate();

  if (tabs.length === 0) return null;

  return (
    <div className="flex items-end gap-1 px-3 pt-2 bg-secondary/40 border-b border-border shrink-0">
      {tabs.map((t) => {
        const active = t.key === activeKey;
        return (
          <div
            key={t.key}
            onClick={() => navigate(t.path)}
            className={cn(
              "group inline-flex items-center gap-1.5 pl-3 pr-2 h-8 text-xs rounded-t-md cursor-pointer border border-b-0 transition-colors",
              active
                ? "bg-background border-border text-primary font-medium"
                : "bg-transparent border-transparent text-muted-foreground hover:bg-background/60 hover:text-foreground"
            )}
          >
            <span className="truncate max-w-[160px]">{t.title}</span>
            {t.closable ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(t.key);
                }}
                className="opacity-60 hover:opacity-100 hover:bg-secondary rounded p-0.5"
                aria-label="关闭页签"
              >
                <X className="w-3 h-3" />
              </button>
            ) : (
              <span className="w-3 h-3" />
            )}
          </div>
        );
      })}
    </div>
  );
};
