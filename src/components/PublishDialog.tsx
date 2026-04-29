import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, Check, Globe, MessageSquare, Webhook, Activity, ShieldCheck, Eye, EyeOff, KeyRound } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultName?: string;
  defaultDescription?: string;
}

const channels = [
  { id: "marketplace", name: "智能体广场", desc: "在公司内部广场发布，所有人可发现订阅", icon: Globe, recommended: true },
  { id: "fengsheng", name: "丰声 NEXT 机器人", desc: "一键接入丰声群聊，@机器人即可调用", icon: MessageSquare, recommended: true },
  { id: "agenthub", name: "AgentHub", desc: "上报至 AgentHub 平台，便于统一观测和管理", icon: Activity },
  { id: "api", name: "开放 API", desc: "暴露 HTTP API 接口，可被其他系统调用", icon: Webhook },
];

export const PublishDialog = ({ open, onOpenChange, defaultName = "", defaultDescription = "" }: Props) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(defaultName);
  const [desc, setDesc] = useState(defaultDescription);
  const [version, setVersion] = useState("v1.0.0");
  const [selChannels, setSelChannels] = useState<string[]>(["marketplace"]);
  const [fsAppKey, setFsAppKey] = useState("");
  const [fsAppSecret, setFsAppSecret] = useState("");
  const [fsRobotCode, setFsRobotCode] = useState("");
  const [fsSecretVisible, setFsSecretVisible] = useState(false);

  const reset = () => { setStep(1); };
  const close = () => { onOpenChange(false); setTimeout(reset, 300); };

  const toggleChannel = (id: string) =>
    setSelChannels((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const fsSelected = selChannels.includes("fengsheng");

  const submit = () => {
    toast({
      title: "已提交审核",
      description: `${name} ${version} 已提交，将在 ${selChannels.length} 个渠道发布`,
    });
    close();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setTimeout(reset, 300); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            发布智能体
            <span className="text-xs font-normal text-muted-foreground">第 {step} / 3 步</span>
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-1">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
              <div className={`h-full transition-all ${s <= step ? "bg-primary" : ""}`} style={{ width: s <= step ? "100%" : "0%" }} />
            </div>
          ))}
        </div>

        {/* Step 1: Basic */}
        {step === 1 && (
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">填写基本信息，将展示在广场卡片上</p>
            <div>
              <Label className="text-xs">智能体名称 <span className="text-destructive">*</span></Label>
              <Input className="mt-1.5 h-8 text-xs" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">描述</Label>
              <Textarea className="mt-1.5 text-xs" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="不超过 60 字" />
            </div>
            <div>
              <Label className="text-xs">版本号</Label>
              <Input className="mt-1.5 h-8 text-xs w-32 font-mono" value={version} onChange={(e) => setVersion(e.target.value)} />
            </div>
          </div>
        )}

        {/* Step 2: Channels */}
        {step === 2 && (
          <div className="space-y-2 py-2">
            <p className="text-xs text-muted-foreground">选择智能体的触达渠道（可多选）</p>
            {channels.map((c) => {
              const Icon = c.icon;
              const sel = selChannels.includes(c.id);
              return (
                <label
                  key={c.id}
                  className={`flex items-start gap-2.5 border rounded-lg p-3 cursor-pointer transition-colors ${
                    sel ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                  }`}
                >
                  <Checkbox checked={sel} onCheckedChange={() => toggleChannel(c.id)} className="mt-0.5" />
                  <Icon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium">{c.name}</p>
                      {c.recommended && <Badge variant="secondary" className="text-[9px] h-4">推荐</Badge>}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{c.desc}</p>
                  </div>
                </label>
              );
            })}

            {fsSelected && (
              <div className="border border-primary/40 bg-primary/5 rounded-lg p-3 space-y-2.5 mt-2">
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  <KeyRound className="w-3.5 h-3.5 text-primary" />
                  丰声 NEXT 应用凭证
                </div>
                <div>
                  <Label className="text-[11px]">Client ID（AppKey） <span className="text-destructive">*</span></Label>
                  <Input className="mt-1 h-8 text-xs font-mono" placeholder="企业应用 AppKey" value={fsAppKey} onChange={(e) => setFsAppKey(e.target.value)} />
                </div>
                <div>
                  <Label className="text-[11px]">Client Secret（AppSecret） <span className="text-destructive">*</span></Label>
                  <div className="relative mt-1">
                    <Input
                      className="h-8 text-xs font-mono pr-9"
                      type={fsSecretVisible ? "text" : "password"}
                      placeholder="企业应用 AppSecret"
                      value={fsAppSecret}
                      onChange={(e) => setFsAppSecret(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setFsSecretVisible(!fsSecretVisible)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {fsSecretVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label className="text-[11px]">Robot Code <span className="text-destructive">*</span></Label>
                  <Input className="mt-1 h-8 text-xs font-mono" placeholder="机器人编码" value={fsRobotCode} onChange={(e) => setFsRobotCode(e.target.value)} />
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  在丰声 NEXT 开发者后台「机器人管理」获取，凭据将通过「凭据金库」加密存储
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <div className="space-y-3 py-2">
            <div className="border border-border rounded-lg p-3 bg-muted/30 space-y-2">
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">名称</span><span className="font-medium">{name || "未命名"}</span></div>
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">版本</span><span className="font-mono">{version}</span></div>
              <div className="flex justify-between text-xs items-start"><span className="text-muted-foreground">触达渠道</span>
                <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
                  {selChannels.map((id) => {
                    const c = channels.find((x) => x.id === id);
                    return <Badge key={id} variant="outline" className="text-[10px]">{c?.name}</Badge>;
                  })}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2 text-[11px] text-muted-foreground border border-border rounded-lg p-2.5 bg-muted/20">
              <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
              <p>提交后将进入审核流程，预计 1-2 小时内完成审核并上架对应渠道。审核通过后版本号将不可修改。</p>
            </div>
          </div>
        )}

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={step === 1 ? close : () => setStep(step - 1)}>
            {step === 1 ? "取消" : <><ArrowLeft className="w-3 h-3" />上一步</>}
          </Button>
          {step < 3 ? (
            <Button size="sm" className="h-8 text-xs gap-1" disabled={step === 1 && !name.trim()} onClick={() => setStep(step + 1)}>
              下一步<ArrowRight className="w-3 h-3" />
            </Button>
          ) : (
            <Button size="sm" className="h-8 text-xs gap-1" onClick={submit}>
              <Check className="w-3 h-3" />提交审核
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
