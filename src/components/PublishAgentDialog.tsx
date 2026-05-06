import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Globe, FolderKanban, Check, Rocket, AlertCircle, Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export interface AgentVersion {
  v: string;
  at: string;
  note: string;
  current?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  agentName: string;
  versions: AgentVersion[];
  /** Pre-selected scope when opening from a specific entry. */
  defaultScope?: "marketplace" | "project";
}

const scopes = [
  {
    id: "marketplace" as const,
    name: "发布到应用广场",
    desc: "面向公司内全体员工，可在广场被发现、订阅与使用",
    icon: Globe,
  },
  {
    id: "project" as const,
    name: "仅在项目内发布",
    desc: "只对当前项目成员可见，适合内部试用与小范围灰度",
    icon: FolderKanban,
  },
];

export const PublishAgentDialog = ({ open, onOpenChange, agentName, versions, defaultScope = "marketplace" }: Props) => {
  const [scope, setScope] = useState<"marketplace" | "project">(defaultScope);
  const [versionV, setVersionV] = useState<string>(versions.find((v) => v.current)?.v ?? versions[0]?.v ?? "");
  const [allowCopy, setAllowCopy] = useState(true);

  useEffect(() => {
    if (open) {
      setScope(defaultScope);
      setVersionV(versions.find((v) => v.current)?.v ?? versions[0]?.v ?? "");
    }
  }, [open, defaultScope, versions]);

  const selectedVersion = versions.find((v) => v.v === versionV);

  const submit = () => {
    toast({
      title: "已提交发布",
      description: `${agentName} ${versionV} 将发布到「${scope === "marketplace" ? "应用广场" : "项目内"}」`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Rocket className="w-4 h-4 text-primary" />
            发布智能体
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Scope */}
          <div className="space-y-1.5">
            <Label className="text-xs">发布范围</Label>
            <div className="space-y-2">
              {scopes.map((s) => {
                const Icon = s.icon;
                const sel = scope === s.id;
                return (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => setScope(s.id)}
                    className={`w-full text-left flex items-start gap-2.5 border rounded-lg p-3 transition-colors ${
                      sel ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                    }`}
                  >
                    <Icon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-medium">{s.name}</p>
                        {sel && <Check className="w-3 h-3 text-primary" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{s.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Version */}
          <div className="space-y-1.5">
            <Label className="text-xs">选择发布版本</Label>
            <Select value={versionV} onValueChange={setVersionV}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="选择版本" />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.v} value={v.v} className="text-xs">
                    <span className="font-mono mr-2">{v.v}</span>
                    <span className="text-muted-foreground">{v.note}</span>
                    {v.current && <span className="ml-2 text-primary">· 当前</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedVersion && (
              <p className="text-[10px] text-muted-foreground">
                {selectedVersion.at} · {selectedVersion.note}
              </p>
            )}
          </div>

          {/* Allow copy (only when publishing to marketplace) */}
          {scope === "marketplace" && (
            <div className="flex items-start gap-2.5 border border-border rounded-lg p-3">
              <Copy className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium">允许其他用户复制到项目内</p>
                  <Switch checked={allowCopy} onCheckedChange={setAllowCopy} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                  开启后，他人可在广场卡片点击「复制到项目内」获得独立可编辑副本；关闭则仅支持在线体验
                </p>
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="border border-border rounded-lg p-3 bg-muted/30 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">智能体</span>
              <span className="font-medium truncate max-w-[60%]">{agentName}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">范围</span>
              <Badge variant="outline" className="text-[10px]">
                {scope === "marketplace" ? "应用广场" : "项目内"}
              </Badge>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">版本</span>
              <span className="font-mono">{versionV}</span>
            </div>
          </div>

          <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <p>
              发布后该版本会立即生效；项目管理中的草稿不会被自动发布，每次修改后都需手动发布以更新线上版本。
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={submit} disabled={!versionV}>
            <Rocket className="w-3.5 h-3.5" />
            确认发布
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
