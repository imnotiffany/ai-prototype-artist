import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Plus, Upload } from "lucide-react";
import { mockAgents } from "@/data/mockData";
import { UploadAgentDialog } from "@/components/UploadAgentDialog";

const ProjectAgents = () => {
  const navigate = useNavigate();
  const [uploadOpen, setUploadOpen] = useState(false);
  const projectAgents = mockAgents.filter((_, i) => i < 4);

  return (
    <div className="p-6 max-w-[1200px] mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold">项目智能体</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-1.5" onClick={() => setUploadOpen(true)}>
            <Upload className="w-4 h-4" />
            上传智能体
          </Button>
          <Button className="gap-1.5" onClick={() => navigate("/create-agent")}>
            <Plus className="w-4 h-4" />
            创建智能体
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projectAgents.map((agent) => (
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
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{agent.description}</p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{agent.platform} | {agent.author}</span>
              <span className="flex items-center gap-1"><Download className="w-3 h-3" />{agent.downloads}</span>
            </div>
          </div>
        ))}
      </div>

      <UploadAgentDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  );
};

export default ProjectAgents;
