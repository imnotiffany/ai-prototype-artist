import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Info, History, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockAgents } from "@/data/mockData";

const AppRunner = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const app = mockAgents.find((a) => a.id === id);

  if (!app) return <div className="p-6">应用不存在</div>;

  return (
    <div className="flex flex-col h-full bg-background animate-fade-in">
      {/* Top return bar */}
      <div className="h-12 px-4 border-b border-border flex items-center justify-between shrink-0 bg-card/40">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="返回"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center text-base shrink-0">
            {app.avatar}
          </div>
          <div className="min-w-0 flex items-center gap-2">
            <span className="text-sm font-medium truncate">{app.name}</span>
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-primary border-primary/30 shrink-0">
              应用
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title="智能体详情"
            onClick={() => navigate(`/agent/${app.id}`)}
          >
            <Info className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title="版本管理"
            onClick={() => navigate(`/agent/${app.id}?tab=versions`)}
          >
            <History className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title="分享"
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* App content area — placeholder for the running app */}
      <div className="flex-1 overflow-auto">
        <div className="h-full flex items-center justify-center bg-muted/10">
          <div className="text-center max-w-md px-6">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 text-4xl">
              {app.avatar}
            </div>
            <h2 className="text-base font-semibold mb-2">{app.name}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{app.description}</p>
            <p className="text-xs text-muted-foreground/60 mt-6">
              这里会嵌入应用的运行界面（iframe / 内嵌页面）
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppRunner;
