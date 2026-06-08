import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Rocket } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { categories } from "@/data/mockData";
import { AvatarPicker } from "@/components/AvatarPicker";

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
  /** 已选好的描述（创建时填写） */
  agentDescription?: string;
  /** 已选好的分类（创建时填写） */
  agentCategory?: string;
  /** 已选好的支持复制开关（创建时填写） */
  agentAllowCopy?: boolean;
  versions?: AgentVersion[];
  defaultScope?: "marketplace" | "project";
  /** 锁定发布范围（隐藏单选），用于入口已经明确意图的场景 */
  lockScope?: boolean;
  kind?: "app" | "agent";
  /** 可发布的版本列表（仅未发布的版本） */
  publishableVersions?: string[];
  /** 预选版本号 */
  defaultVersion?: string;
  /** 发布成功回调 */
  onPublished?: (version: string, scope: "marketplace" | "project") => void;
}

export const PublishAgentDialog = ({
  open,
  onOpenChange,
  agentName,
  agentDescription = "",
  agentCategory = "",
  agentAllowCopy = true,
  defaultScope = "marketplace",
  lockScope = false,
  kind = "agent",
  publishableVersions,
  defaultVersion,
  onPublished,
}: Props) => {
  const noun = kind === "app" ? "应用" : "智能体";
  const [name, setName] = useState(agentName);
  const [desc, setDesc] = useState(agentDescription);
  const [category, setCategory] = useState<string>(agentCategory || categories[0]);
  const [scope, setScope] = useState<"marketplace" | "project">(defaultScope);
  const [allowCopy, setAllowCopy] = useState(agentAllowCopy);
  const [avatarSeed, setAvatarSeed] = useState(() => agentName || Math.random().toString(36).slice(2, 10));
  const [uploadedAvatar, setUploadedAvatar] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string | undefined>(defaultVersion ?? publishableVersions?.[0]);

  useEffect(() => {
    if (open) {
      setName(agentName);
      setDesc(agentDescription);
      setCategory(agentCategory || categories[0]);
      setScope(defaultScope);
      setAllowCopy(agentAllowCopy);
      setSelectedVersion(defaultVersion ?? publishableVersions?.[0]);
    }
  }, [open, agentName, agentDescription, agentCategory, agentAllowCopy, defaultScope, defaultVersion, publishableVersions]);

  const submit = () => {
    if (!name.trim()) {
      toast({ title: `请填写${noun}名称`, variant: "destructive" });
      return;
    }
    if (publishableVersions && publishableVersions.length > 0 && !selectedVersion) {
      toast({ title: "请选择要发布的版本", variant: "destructive" });
      return;
    }
    toast({
      title: "已提交发布",
      description: `${noun}「${name}」${selectedVersion ? selectedVersion + " " : ""}将发布到「${scope === "marketplace" ? "应用广场" : "项目内"}」`,
    });
    if (selectedVersion) onPublished?.(selectedVersion, scope);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-sm flex items-center gap-1.5">
            <Rocket className="w-3.5 h-3.5 text-primary" />
            发布{noun}
          </DialogTitle>
          <DialogDescription className="text-[11px] leading-snug">
            基础信息可在保存时已填写，这里可再次确认；选择发布范围后即可发布。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5">

          <AvatarPicker
            uploadedAvatar={uploadedAvatar}
            onUploadedAvatarChange={setUploadedAvatar}
            seed={avatarSeed}
            onSeedChange={setAvatarSeed}
            noun={noun}
          />

          {/* 版本选择 — 仅显示未发布的版本 */}
          {publishableVersions && (
            <div className="space-y-1">
              <Label className="text-[11px]">发布版本 <span className="text-destructive">*</span></Label>
              {publishableVersions.length === 0 ? (
                <p className="text-[11px] text-muted-foreground border border-border rounded-md px-2 py-1.5">
                  暂无可发布的版本（所有版本均已发布）
                </p>
              ) : (
                <Select value={selectedVersion} onValueChange={setSelectedVersion}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="选择要发布的版本" /></SelectTrigger>
                  <SelectContent>
                    {publishableVersions.map((v) => (
                      <SelectItem key={v} value={v} className="text-xs font-mono">{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}


          {/* 名称 */}
          <div className="space-y-1">
            <Label className="text-[11px]">名称 <span className="text-destructive">*</span></Label>
            <Input
              className="h-7 text-xs"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`请输入${noun}名称`}
            />
          </div>

          {/* 简介 */}
          <div className="space-y-1">
            <Label className="text-[11px]">简介</Label>
            <Textarea
              className="text-xs min-h-0 leading-snug"
              rows={2}
              value={desc}
              onChange={(e) => setDesc(e.target.value.slice(0, 100))}
              placeholder={`简要描述${noun}用途`}
            />
          </div>

          {/* 分类 */}
          <div className="space-y-1">
            <Label className="text-[11px]">分类</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="选择分类" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 支持复制 */}
          <div className="flex items-center justify-between border border-border rounded-lg px-3 py-1.5">
            <div className="leading-tight">
              <p className="text-xs text-foreground">支持复制</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">允许其他成员复制本{noun}作为模板</p>
            </div>
            <Switch checked={allowCopy} onCheckedChange={setAllowCopy} />
          </div>

          {/* 发布范围 — 入口未锁定时可选 */}
          {!lockScope && (
            <div className="space-y-1">
              <Label className="text-[11px]">发布范围 <span className="text-destructive">*</span></Label>
              <RadioGroup
                value={scope}
                onValueChange={(v) => setScope(v as "marketplace" | "project")}
                className="flex items-center gap-5"
              >
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="marketplace" id="scope-public" />
                  <span className="text-xs">发布至广场（所有人可见）</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="project" id="scope-project" />
                  <span className="text-xs">发布至项目（仅项目内可见）</span>
                </label>
              </RadioGroup>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={submit}>
            <Rocket className="w-3 h-3" /> 发布
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
