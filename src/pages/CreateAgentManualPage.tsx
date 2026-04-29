import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Rocket, Plus, X, Settings2, Cpu, Server, Zap, Shield, KeyRound, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { categories, getActiveSkills, getActiveMCPs, mockAgents } from "@/data/mockData";

const skills = getActiveSkills();
const mcps = getActiveMCPs();
const subagents = mockAgents.filter((a) => a.kind === "agent").slice(0, 8);

const CreateAgentManualPage = () => {
  const navigate = useNavigate();

  // Basic
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  // Model
  const [model, setModel] = useState("claude-sonnet-4-6");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(8000);
  const [stream, setStream] = useState(true);

  // Prompt
  const [systemPrompt, setSystemPrompt] = useState("你是一个专业的 AI 助手，请根据用户需求提供准确、结构化的回答。");

  // Bindings
  const [selSkills, setSelSkills] = useState<string[]>([]);
  const [selMCPs, setSelMCPs] = useState<string[]>([]);
  const [selSubagents, setSelSubagents] = useState<string[]>([]);

  // Env
  const [persistentFs, setPersistentFs] = useState(true);
  const [envVars, setEnvVars] = useState<{ k: string; v: string }[]>([{ k: "WORKSPACE", v: "/workspace" }]);

  // Network
  const [networkPolicy, setNetworkPolicy] = useState<"intranet" | "whitelist" | "open">("whitelist");
  const [whitelistInput, setWhitelistInput] = useState("");
  const [whitelist, setWhitelist] = useState<string[]>(["api.sf-express.com"]);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  const toggle = (list: string[], setList: (v: string[]) => void, name: string) =>
    setList(list.includes(name) ? list.filter((x) => x !== name) : [...list, name]);

  const addWhitelist = () => {
    const w = whitelistInput.trim();
    if (w && !whitelist.includes(w)) setWhitelist([...whitelist, w]);
    setWhitelistInput("");
  };

  const handleSave = (publish: boolean) => {
    if (!name.trim()) {
      toast({ title: "请填写智能体名称", variant: "destructive" });
      return;
    }
    toast({
      title: publish ? "已发布智能体" : "草稿已保存",
      description: `${name} · ${selSkills.length} Skill / ${selMCPs.length} MCP / ${selSubagents.length} Subagent`,
    });
    if (publish) navigate("/project-agents");
  };

  const PickerPopover = ({
    items,
    selected,
    onToggle,
    icon,
    label,
  }: {
    items: { name: string; description: string }[];
    selected: string[];
    onToggle: (n: string) => void;
    icon: React.ReactNode;
    label: string;
  }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
          <Plus className="w-3 h-3" />
          添加 {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <p className="text-[11px] text-muted-foreground px-2 py-1">从{label === "Skill" ? "Skill 市场" : "MCP 广场"}选择</p>
        <div className="max-h-64 overflow-auto">
          {items.map((it) => {
            const sel = selected.includes(it.name);
            return (
              <button
                key={it.name}
                onClick={() => onToggle(it.name)}
                className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-start gap-2 ${
                  sel ? "bg-primary/10 text-primary" : "hover:bg-muted"
                }`}
              >
                <div className="mt-0.5">{icon}</div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{it.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{it.description}</p>
                </div>
                {sel && <X className="w-3 h-3 shrink-0 mt-0.5" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="flex-1 overflow-auto animate-fade-in">
      {/* Header */}
      <div className="border-b border-border bg-card/40 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            返回
          </button>
          <div>
            <h1 className="text-sm font-semibold">手动组装智能体</h1>
            <p className="text-[11px] text-muted-foreground">面向开发者的精确配置模式</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => handleSave(false)}>
            <Save className="w-3.5 h-3.5" />
            保存草稿
          </Button>
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => handleSave(true)}>
            <Rocket className="w-3.5 h-3.5" />
            保存并发布
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-5">
        <Tabs defaultValue="basic">
          <TabsList className="grid grid-cols-6 h-9">
            <TabsTrigger value="basic" className="text-xs">基础信息</TabsTrigger>
            <TabsTrigger value="model" className="text-xs">模型配置</TabsTrigger>
            <TabsTrigger value="prompt" className="text-xs">系统提示词</TabsTrigger>
            <TabsTrigger value="bindings" className="text-xs">原子能力</TabsTrigger>
            <TabsTrigger value="env" className="text-xs">环境凭证</TabsTrigger>
            <TabsTrigger value="network" className="text-xs">网络策略</TabsTrigger>
          </TabsList>

          {/* Basic */}
          <TabsContent value="basic" className="mt-4 space-y-4">
            <div className="border border-border rounded-lg p-5 space-y-4 bg-card">
              <div>
                <Label className="text-xs">智能体名称 <span className="text-destructive">*</span></Label>
                <Input className="mt-1.5 h-8 text-xs" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：财务月报助手" />
              </div>
              <div>
                <Label className="text-xs">描述</Label>
                <Textarea className="mt-1.5 text-xs" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="一句话描述智能体能力，不超过 60 字" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">分类</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="mt-1.5 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">标签</Label>
                  <div className="flex gap-1.5 mt-1.5">
                    <Input className="h-8 text-xs flex-1" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTag()} placeholder="回车添加" />
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={addTag}>添加</Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tags.map((t) => (
                        <Badge key={t} variant="secondary" className="text-[10px] gap-1">
                          {t}
                          <button onClick={() => setTags(tags.filter((x) => x !== t))} className="hover:text-destructive">
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Model */}
          <TabsContent value="model" className="mt-4 space-y-4">
            <div className="border border-border rounded-lg p-5 space-y-5 bg-card">
              <div>
                <Label className="text-xs flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5" /> 基座模型</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className="mt-1.5 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claude-sonnet-4-6" className="text-xs">Claude Sonnet 4.6（推荐）</SelectItem>
                    <SelectItem value="claude-haiku-3-5" className="text-xs">Claude Haiku 3.5（快速）</SelectItem>
                    <SelectItem value="gpt-4o" className="text-xs">GPT-4o</SelectItem>
                    <SelectItem value="gemini-2.5-pro" className="text-xs">Gemini 2.5 Pro</SelectItem>
                    <SelectItem value="deepseek-v3" className="text-xs">DeepSeek V3</SelectItem>
                    <SelectItem value="qwen-max" className="text-xs">Qwen Max</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs">Temperature</Label>
                  <span className="text-xs font-mono text-muted-foreground">{temperature.toFixed(2)}</span>
                </div>
                <Slider value={[temperature]} onValueChange={([v]) => setTemperature(v)} min={0} max={1} step={0.05} />
                <p className="text-[10px] text-muted-foreground mt-1.5">较低值更确定性，较高值更具创造性</p>
              </div>
              <div>
                <Label className="text-xs">Max Tokens</Label>
                <Input type="number" className="mt-1.5 h-8 text-xs w-40" value={maxTokens} onChange={(e) => setMaxTokens(Number(e.target.value))} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs">流式输出</Label>
                  <p className="text-[10px] text-muted-foreground">启用 SSE 流式推送，长任务建议开启</p>
                </div>
                <Switch checked={stream} onCheckedChange={setStream} />
              </div>
            </div>
          </TabsContent>

          {/* Prompt */}
          <TabsContent value="prompt" className="mt-4">
            <div className="border border-border rounded-lg p-5 bg-card">
              <Label className="text-xs">系统提示词</Label>
              <p className="text-[10px] text-muted-foreground mb-2">定义智能体身份、行为约束和输出格式</p>
              <Textarea className="font-mono text-xs leading-relaxed" rows={18} value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} />
              <div className="flex items-center justify-between mt-2">
                <p className="text-[10px] text-muted-foreground">{systemPrompt.length} 字符</p>
                <Button size="sm" variant="ghost" className="h-7 text-xs">从模板导入</Button>
              </div>
            </div>
          </TabsContent>

          {/* Bindings */}
          <TabsContent value="bindings" className="mt-4 space-y-4">
            <div className="border border-border rounded-lg p-5 bg-card">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-xs flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Skill 绑定</Label>
                <PickerPopover items={skills} selected={selSkills} onToggle={(n) => toggle(selSkills, setSelSkills, n)} icon={<Zap className="w-3 h-3" />} label="Skill" />
              </div>
              {selSkills.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">未绑定任何 Skill</p>
              ) : (
                <div className="space-y-1.5">
                  {selSkills.map((s) => (
                    <div key={s} className="flex items-center justify-between border border-border rounded px-3 py-1.5 text-xs">
                      <span className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-primary" />{s}</span>
                      <button onClick={() => toggle(selSkills, setSelSkills, s)} className="text-muted-foreground hover:text-destructive"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border border-border rounded-lg p-5 bg-card">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-xs flex items-center gap-1.5"><Server className="w-3.5 h-3.5" /> MCP 服务绑定</Label>
                <PickerPopover items={mcps} selected={selMCPs} onToggle={(n) => toggle(selMCPs, setSelMCPs, n)} icon={<Server className="w-3 h-3" />} label="MCP" />
              </div>
              {selMCPs.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">未绑定任何 MCP 服务</p>
              ) : (
                <div className="space-y-1.5">
                  {selMCPs.map((s) => (
                    <div key={s} className="flex items-center justify-between border border-border rounded px-3 py-1.5 text-xs">
                      <span className="flex items-center gap-1.5"><Server className="w-3 h-3 text-primary" />{s}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px] h-4">需凭证</Badge>
                        <button onClick={() => toggle(selMCPs, setSelMCPs, s)} className="text-muted-foreground hover:text-destructive"><X className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-2">凭证将从「凭据金库」自动注入，未配置可前往金库添加</p>
            </div>

            <div className="border border-border rounded-lg p-5 bg-card">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Label className="text-xs flex items-center gap-1.5"><Bot className="w-3.5 h-3.5" /> Subagent 绑定</Label>
                  <p className="text-[10px] text-muted-foreground mt-0.5">允许当前智能体调用其他智能体作为子任务执行者</p>
                </div>
                <PickerPopover items={subagents.map((a) => ({ name: a.name, description: a.description }))} selected={selSubagents} onToggle={(n) => toggle(selSubagents, setSelSubagents, n)} icon={<Bot className="w-3 h-3" />} label="Subagent" />
              </div>
              {selSubagents.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">未绑定任何 Subagent</p>
              ) : (
                <div className="space-y-1.5">
                  {selSubagents.map((s) => (
                    <div key={s} className="flex items-center justify-between border border-border rounded px-3 py-1.5 text-xs">
                      <span className="flex items-center gap-1.5"><Bot className="w-3 h-3 text-primary" />{s}</span>
                      <button onClick={() => toggle(selSubagents, setSelSubagents, s)} className="text-muted-foreground hover:text-destructive"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Env */}
          <TabsContent value="env" className="mt-4 space-y-4">
            <div className="border border-border rounded-lg p-5 bg-card space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs flex items-center gap-1.5"><Settings2 className="w-3.5 h-3.5" /> 持久化文件系统</Label>
                  <p className="text-[10px] text-muted-foreground">容器重启后保留 /workspace 数据</p>
                </div>
                <Switch checked={persistentFs} onCheckedChange={setPersistentFs} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs">环境变量</Label>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEnvVars([...envVars, { k: "", v: "" }])}>
                    <Plus className="w-3 h-3" /> 添加
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mb-2">注入容器的非敏感运行时配置（如 workspace 路径、时区、日志级别等）。<span className="text-amber-600 dark:text-amber-500">API Key、Token 等敏感凭证请使用下方「凭据金库」</span></p>
                <div className="space-y-1.5">
                  {envVars.map((v, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <Input className="h-7 text-xs flex-1 font-mono" placeholder="KEY" value={v.k} onChange={(e) => { const c = [...envVars]; c[i].k = e.target.value; setEnvVars(c); }} />
                      <Input className="h-7 text-xs flex-1 font-mono" placeholder="VALUE" value={v.v} onChange={(e) => { const c = [...envVars]; c[i].v = e.target.value; setEnvVars(c); }} />
                      <button onClick={() => setEnvVars(envVars.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-border pt-3">
                <Label className="text-xs flex items-center gap-1.5 mb-1.5"><KeyRound className="w-3.5 h-3.5" /> 凭据金库</Label>
                <p className="text-[10px] text-muted-foreground">MCP 所需 API Key / OAuth Token 统一在金库中安全存储</p>
                <Button size="sm" variant="outline" className="h-7 text-xs mt-2" onClick={() => navigate("/vault")}>前往金库管理</Button>
              </div>
            </div>
          </TabsContent>

          {/* Network */}
          <TabsContent value="network" className="mt-4">
            <div className="border border-border rounded-lg p-5 bg-card">
              <Label className="text-xs flex items-center gap-1.5 mb-3"><Shield className="w-3.5 h-3.5" /> 网络访问策略</Label>
              <RadioGroup value={networkPolicy} onValueChange={(v) => setNetworkPolicy(v as typeof networkPolicy)} className="space-y-2">
                <label className="flex items-start gap-2 border border-border rounded-lg p-3 cursor-pointer hover:bg-muted/30">
                  <RadioGroupItem value="intranet" className="mt-0.5" />
                  <div>
                    <p className="text-xs font-medium">仅内网</p>
                    <p className="text-[10px] text-muted-foreground">只能访问公司内网资源，最高安全等级</p>
                  </div>
                </label>
                <label className="flex items-start gap-2 border border-border rounded-lg p-3 cursor-pointer hover:bg-muted/30">
                  <RadioGroupItem value="whitelist" className="mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-medium">白名单</p>
                    <p className="text-[10px] text-muted-foreground">允许访问指定域名</p>
                    {networkPolicy === "whitelist" && (
                      <div className="mt-2">
                        <div className="flex gap-1.5">
                          <Input className="h-7 text-xs flex-1 font-mono" placeholder="example.com" value={whitelistInput} onChange={(e) => setWhitelistInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addWhitelist()} />
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addWhitelist}>添加</Button>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {whitelist.map((w) => (
                            <Badge key={w} variant="secondary" className="text-[10px] gap-1 font-mono">
                              {w}
                              <button onClick={() => setWhitelist(whitelist.filter((x) => x !== w))} className="hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </label>
                <label className="flex items-start gap-2 border border-border rounded-lg p-3 cursor-pointer hover:bg-muted/30">
                  <RadioGroupItem value="open" className="mt-0.5" />
                  <div>
                    <p className="text-xs font-medium">全开放</p>
                    <p className="text-[10px] text-muted-foreground">允许访问任意公网，需安全审批</p>
                  </div>
                </label>
              </RadioGroup>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CreateAgentManualPage;
