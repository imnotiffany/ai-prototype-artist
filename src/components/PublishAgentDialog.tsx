import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Upload, Sparkles } from "lucide-react";
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
  versions?: AgentVersion[];
  defaultScope?: "marketplace" | "project";
  kind?: "app" | "agent";
}

const categories = ["效率办公", "研发工程", "数据分析", "客户服务", "市场营销", "人力资源"];

const RequiredLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-sm text-foreground mb-2">
    <span className="text-destructive mr-1">*</span>
    {children}
  </label>
);

export const PublishAgentDialog = ({ open, onOpenChange, agentName, defaultScope = "marketplace", kind = "agent" }: Props) => {
  const noun = kind === "app" ? "应用" : "智能体";
  const [name, setName] = useState(agentName);
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState<string>("");
  const [scope, setScope] = useState<"marketplace" | "project">(defaultScope);
  const [allowCopy, setAllowCopy] = useState(false);
  const [iconFile, setIconFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(agentName);
      setDesc("");
      setCategory("");
      setScope(defaultScope);
      setAllowCopy(false);
      setIconFile(null);
    }
  }, [open, agentName, defaultScope]);

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setIconFile(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAIGenerate = () => {
    toast({ title: "AI 生成图标", description: "正在为你生成专属图标..." });
  };

  const submit = () => {
    if (!name.trim() || !desc.trim() || !category) {
      toast({ title: "请填写完整信息", variant: "destructive" });
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
      <DialogContent className="max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">发布{noun}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Name */}
          <div>
            <RequiredLabel>{noun}名称</RequiredLabel>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 text-sm"
              placeholder={`请输入${noun}名称`}
            />
          </div>

          {/* Description */}
          <div>
            <RequiredLabel>{noun}描述</RequiredLabel>
            <div className="relative">
              <Textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value.slice(0, 100))}
                className="text-sm resize-none min-h-[110px]"
                placeholder={`简要描述${noun}用途`}
              />
              <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">
                {desc.length} / 100
              </span>
            </div>
          </div>

          {/* Category */}
          <div>
            <RequiredLabel>分类</RequiredLabel>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder="选择分类" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c} className="text-sm">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Version selection removed: editing now saves directly without version bumps */}

          {/* Scope */}
          <div>
            <RequiredLabel>发布范围</RequiredLabel>
            <RadioGroup
              value={scope}
              onValueChange={(v) => setScope(v as "marketplace" | "project")}
              className="flex items-center gap-8"
            >
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="marketplace" id="scope-public" />
                <span className="text-sm">公开（所有人可见）</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="project" id="scope-project" />
                <span className="text-sm">仅项目内可见</span>
              </label>
            </RadioGroup>
          </div>

          {/* App Icon */}
          <div>
            <RequiredLabel>{noun}图标</RequiredLabel>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleIconUpload}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 text-sm gap-1.5"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-3.5 h-3.5" />
                选择图标
              </Button>
              <button
                type="button"
                onClick={handleAIGenerate}
                className="text-sm text-primary hover:underline inline-flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                AI 生成图标
              </button>
              {iconFile && (
                <img src={iconFile} alt="icon preview" className="w-9 h-9 rounded-md object-cover border border-border" />
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" className="h-9 px-5 text-sm" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button size="sm" className="h-9 px-5 text-sm" onClick={submit}>
            发布
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
