import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, Loader2, Rocket, Upload, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { categories } from "@/data/mockData";

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
  kind?: "app" | "agent";
}

export const PublishAgentDialog = ({
  open,
  onOpenChange,
  agentName,
  agentDescription = "",
  agentCategory = "",
  agentAllowCopy = true,
  defaultScope = "marketplace",
  kind = "agent",
}: Props) => {
  const noun = kind === "app" ? "应用" : "智能体";
  const [name, setName] = useState(agentName);
  const [desc, setDesc] = useState(agentDescription);
  const [category, setCategory] = useState<string>(agentCategory || categories[0]);
  const [scope, setScope] = useState<"marketplace" | "project">(defaultScope);
  const [allowCopy, setAllowCopy] = useState(agentAllowCopy);
  const [avatarSeed, setAvatarSeed] = useState(() => agentName || Math.random().toString(36).slice(2, 10));
  const [generatingAvatar, setGeneratingAvatar] = useState(false);
  const [uploadedAvatar, setUploadedAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generatedAvatarUrl = `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(avatarSeed)}&backgroundColor=dbeafe,fde68a,bbf7d0,fecaca,e9d5ff`;
  const avatarUrl = uploadedAvatar || generatedAvatarUrl;
  const regenerateAvatar = () => {
    setUploadedAvatar(null);
    setGeneratingAvatar(true);
    setTimeout(() => {
      setAvatarSeed(Math.random().toString(36).slice(2, 10) + Date.now().toString(36));
      setGeneratingAvatar(false);
    }, 600);
  };
  const handleUploadClick = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "请选择图片文件", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "图片大小不能超过 2MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setUploadedAvatar(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  useEffect(() => {
    if (open) {
      setName(agentName);
      setDesc(agentDescription);
      setCategory(agentCategory || categories[0]);
      setScope(defaultScope);
      setAllowCopy(agentAllowCopy);
    }
  }, [open, agentName, agentDescription, agentCategory, agentAllowCopy, defaultScope]);

  const submit = () => {
    if (!name.trim()) {
      toast({ title: `请填写${noun}名称`, variant: "destructive" });
      return;
    }
    toast({
      title: "已提交发布",
      description: `${noun}「${name}」将发布到「${scope === "marketplace" ? "应用广场" : "项目内"}」`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-1.5">
            <Rocket className="w-4 h-4 text-primary" />
            发布{noun}
          </DialogTitle>
          <DialogDescription className="text-[11px]">
            基础信息可在保存时已填写，这里可再次确认；选择发布范围后即可发布。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {/* 头像 */}
          <div>
            <Label className="text-xs">头像</Label>
            <div className="mt-1.5 flex items-center gap-3">
              <div className="w-14 h-14 rounded-lg border border-border bg-muted/40 overflow-hidden flex items-center justify-center shrink-0">
                {generatingAvatar ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : (
                  <img src={avatarUrl} alt={`${noun}头像`} className="w-full h-full object-cover" />
                )}
              </div>
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={regenerateAvatar} disabled={generatingAvatar}>
                <RefreshCw className={`w-3 h-3 ${generatingAvatar ? "animate-spin" : ""}`} />
                {generatingAvatar ? "生成中…" : "AI 重新生成"}
              </Button>
            </div>
          </div>

          {/* 头像 */}
          <div>
            <Label className="text-xs">头像</Label>
            <div className="mt-1.5 flex items-center gap-3">
              <div className="relative w-14 h-14 rounded-lg border border-border bg-muted/40 overflow-hidden flex items-center justify-center shrink-0">
                {generatingAvatar ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : (
                  <img src={avatarUrl} alt={`${noun}头像`} className="w-full h-full object-cover" />
                )}
                {uploadedAvatar && !generatingAvatar && (
                  <button
                    type="button"
                    onClick={() => setUploadedAvatar(null)}
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-background/90 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
                    title="移除上传"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleUploadClick}>
                  <Upload className="w-3 h-3" />
                  上传头像
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={regenerateAvatar} disabled={generatingAvatar}>
                  <RefreshCw className={`w-3 h-3 ${generatingAvatar ? "animate-spin" : ""}`} />
                  {generatingAvatar ? "生成中…" : "AI 重新生成"}
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">支持 JPG/PNG/GIF/WEBP，建议正方形，不超过 2MB</p>
          </div>

          {/* 名称 */}
          <div>
            <Label className="text-xs">名称 <span className="text-destructive">*</span></Label>
            <Input
              className="mt-1.5 h-8 text-xs"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`请输入${noun}名称`}
            />
          </div>

          {/* 简介 */}
          <div>
            <Label className="text-xs">简介</Label>
            <Textarea
              className="mt-1.5 text-xs"
              rows={3}
              value={desc}
              onChange={(e) => setDesc(e.target.value.slice(0, 100))}
              placeholder={`简要描述${noun}用途`}
            />
          </div>

          {/* 分类 */}
          <div>
            <Label className="text-xs">分类</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1.5 h-8 text-xs"><SelectValue placeholder="选择分类" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 支持复制 */}
          <div className="flex items-center justify-between border border-border rounded-lg px-3 py-2">
            <div>
              <p className="text-xs text-foreground">支持复制</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">允许其他成员复制本{noun}作为模板</p>
            </div>
            <Switch checked={allowCopy} onCheckedChange={setAllowCopy} />
          </div>

          {/* 发布范围 — 发布独有 */}
          <div>
            <Label className="text-xs">发布范围 <span className="text-destructive">*</span></Label>
            <RadioGroup
              value={scope}
              onValueChange={(v) => setScope(v as "marketplace" | "project")}
              className="mt-1.5 flex items-center gap-6"
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
