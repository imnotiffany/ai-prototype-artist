import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import { getMyAgents } from "@/data/mockData";

const WorkspacePage = () => {
  const navigate = useNavigate();
  const myAgents = getMyAgents().slice(0, 6);

  return (
    <div className="p-6 max-w-[1200px] mx-auto animate-fade-in">
      <h1 className="text-lg font-semibold mb-6">工作台</h1>

      <h2 className="text-sm font-medium text-muted-foreground mb-3">我创建的智能体</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {myAgents.map((agent) => (
          <div
            key={agent.id}
            className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate(`/agent/${agent.id}`)}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center text-2xl shrink-0">
                {agent.avatar}
              </div>
              <div className="min-w-0">
                <h3 className="font-medium truncate">{agent.name}</h3>
                <div className="flex items-center gap-1.5 mt-1">
                  {agent.tags.slice(0, 2).map((tag, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                  ))}
                  <Badge variant="outline" className="text-[10px]">
                    {agent.status === "published" ? (agent.publishScope === "marketplace" ? "已发布到广场" : "已发布到项目") : "未发布"}
                  </Badge>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{agent.description}</p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{agent.updatedAt}更新</span>
              <span className="flex items-center gap-1"><Download className="w-3 h-3" />{agent.downloads}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkspacePage;
