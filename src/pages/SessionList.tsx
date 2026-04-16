import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Archive } from "lucide-react";
import { mockSessions } from "@/data/mockData";

const SessionList = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-[1000px] mx-auto animate-fade-in">
      <h1 className="text-lg font-semibold mb-6">会话记录</h1>
      <div className="space-y-3">
        {mockSessions.map((session) => (
          <div
            key={session.id}
            className="border border-border rounded-lg p-4 hover:shadow-sm transition-shadow cursor-pointer flex items-center justify-between"
            onClick={() => navigate(`/chat/${session.agentId}`)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-xl">
                {session.agentAvatar}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{session.agentName}</span>
                  <Badge variant={session.status === "running" ? "default" : "outline"} className="text-xs">
                    {session.status === "running" ? "运行中" : "已结束"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{session.lastMessage}</p>
                <span className="text-xs text-muted-foreground">{session.lastActiveAt}</span>
              </div>
            </div>
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <Button size="icon" variant="ghost" className="h-8 w-8">
                <Archive className="w-3.5 h-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SessionList;
