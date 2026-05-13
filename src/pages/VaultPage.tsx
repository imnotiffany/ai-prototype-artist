import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Server, Loader2, CheckCircle2, XCircle, Link2, X, ExternalLink, Lock, Pencil, Plug, RefreshCw } from "lucide-react";
import { setMcpConfigured, isMcpConfigured, subscribeMcpStore } from "@/data/mcpCredentialStore";
import { toast } from "@/hooks/use-toast";

type McpType = "studio" | "sse" | "http";
const typeLabel = (t: McpType) => (t === "studio" ? "STDIO" : t === "sse" ? "SSE" : "StreamableHTTP");

interface PresetMcp {
  id: string;            // identifier
  name: string;          // 显示名称
  description: string;
  type: McpType;
  /** 跳转去复制服务地址的页面（服务提供方文档/控制台） */
  copyUrl: string;
  /** 已配置时的服务地址（mock：仅 dingtalk_robot 默认配置） */
  defaultEndpoint?: string;
}

const presetMcps: PresetMcp[] = [
  { id: "dingtalk_robot", name: "机器人消息", description: "钉钉机器人消息MCP服务，支持创建企业机器人、根据关键词搜索群会话openConversationId、将企业机器人添加到群等", type: "http", copyUrl: "https://open.dingtalk.com/document/robot", defaultEndpoint: "https://mcp-gw.dingtalk.com/server/a5a2eb03a10b7a3a92bec597027f57ce76aac6ba2ff75cd68e35881da2/http" },
  { id: "dingtalk_journal", name: "钉钉日志", description: "钉钉日志MCP，包含获取日志模板、读取日志内容、写日志等功能", type: "http", copyUrl: "https://open.dingtalk.com/document/journal" },
  { id: "dingtalk_ai_sheet", name: "钉钉 AI 表格", description: "钉钉 AI 表格 MCP 让 AI 直接操作表格数据与字段，快速打通查询、维护与自动化办公流程。", type: "http", copyUrl: "https://open.dingtalk.com/document/ai-sheet" },
  { id: "dingtalk_doc", name: "钉钉文档", description: "钉钉文档MCP支持查找、创建文档，助力高效协同与内容管理。", type: "http", copyUrl: "https://open.dingtalk.com/document/doc" },
  { id: "dingtalk_contacts", name: "钉钉通讯录", description: "钉钉通讯录MCP支持搜索人员/部门、查询成员详情及部门结构，快速获取组织架构信息。", type: "http", copyUrl: "https://open.dingtalk.com/document/contacts" },
  { id: "dingtalk_calendar", name: "钉钉日历", description: "支持创建日程、查询日程、约空闲会议室等能力", type: "http", copyUrl: "https://open.dingtalk.com/document/calendar" },
  { id: "dingtalk_todo", name: "钉钉待办", description: "钉钉待办MCP服务提供高效的任务管理能力，支持创建待办事项、更新任务状态（如完成/未完成）、以及按条件查询任务等。", type: "http", copyUrl: "https://open.dingtalk.com/document/todo" },
  { id: "dingtalk_sheet", name: "钉钉表格", description: "钉钉表格 MCP 支持新建、编辑等操作，助力高效协同与内容管理", type: "http", copyUrl: "https://open.dingtalk.com/document/sheet" },
  { id: "amap", name: "高德地图", description: "高德地图MCP服务，包含搜索周边服务、骑行、公交、驾车、步行路径规划，地理编码查询和天气查询功能", type: "http", copyUrl: "https://lbs.amap.com/api/mcp-server" },
  { id: "dingtalk_group", name: "钉钉群聊", description: "钉钉群聊MCP支持通过自然语言进行群聊管理、消息发送等操作", type: "http", copyUrl: "https://open.dingtalk.com/document/group" },
  { id: "bocha_search", name: "博查搜索", description: "在全网搜索用户查询的网页信息，支持中英文、多语种网页检索", type: "http", copyUrl: "https://bochaai.com/docs/mcp" },
  { id: "train_query", name: "火车班次查询", description: "根据用户指定的出发车站、到达车站、出发日期，查询火车班次", type: "http", copyUrl: "https://example.com/mcp/train-query" },
  { id: "flight_query", name: "飞机航班查询", description: "根据用户指定的出发城市/机场、到达城市/机场、出发日期，查询航班", type: "http", copyUrl: "https://example.com/mcp/flight-query" },
  { id: "news_headlines", name: "新闻头条", description: "提供最新的新闻头条信息，包括国内、国际、科技、体育等分类", type: "http", copyUrl: "https://example.com/mcp/news" },
  { id: "zhima_enterprise", name: "芝麻企业信用-查企业", description: "服务来自蚂蚁集团旗下专业的企业信用信息查询", type: "http", copyUrl: "https://b.zmxy.com.cn/mcp/enterprise" },
  { id: "zhima_risk", name: "芝麻企业信用-查风险", description: "服务来自蚂蚁集团旗下专业的企业风险信息查询", type: "http", copyUrl: "https://b.zmxy.com.cn/mcp/risk" },
];

interface FormState {
  endpoint: string;
  headers: { key: string; value: string }[];
  stdioCommand: string;
  stdioArgs: string;
  envVars: { key: string; value: string }[];
}

const emptyForm: FormState = { endpoint: "", headers: [], stdioCommand: "npx", stdioArgs: "", envVars: [] };

const VaultPage = () => {
  // identifier -> 已保存的端点配置
  const [configs, setConfigs] = useState<Record<string, FormState>>(() => {
    const init: Record<string, FormState> = {};
    presetMcps.forEach((m) => {
      if (m.defaultEndpoint) init[m.id] = { ...emptyForm, endpoint: m.defaultEndpoint };
    });
    return init;
  });
  // identifier -> 连接状态
  const [linkStatus, setLinkStatus] = useState<Record<string, "linked" | "unlinked">>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  // 跨页面同步（创建 Agent 时需要查询「已配置」状态）
  const [, setTick] = useState(0);
  useEffect(() => {
    const unsub = subscribeMcpStore(() => setTick((t) => t + 1));
    return () => { unsub(); };
  }, []);
  // 初次同步：把已配置的 MCP 名称推入 store
  useEffect(() => {
    Object.keys(configs).forEach((id) => {
      const p = presetMcps.find((x) => x.id === id);
      if (p) setMcpConfigured(p.name, true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const editingPreset = useMemo(() => presetMcps.find((m) => m.id === editingId) ?? null, [editingId]);

  const openEdit = (m: PresetMcp) => {
    setEditingId(m.id);
    setForm(configs[m.id] ?? { ...emptyForm });
  };
  const closeEdit = () => { setEditingId(null); setForm(emptyForm); };

  const handleSave = () => {
    if (!editingPreset) return;
    if (editingPreset.type === "studio") {
      if (!form.stdioCommand.trim()) return toast({ title: "请填写启动命令", variant: "destructive" });
    } else if (!form.endpoint.trim()) {
      return toast({ title: "请填写服务地址", variant: "destructive" });
    }
    setConfigs((c) => ({ ...c, [editingPreset.id]: form }));
    setMcpConfigured(editingPreset.name, true);
    toast({ title: "MCP 已保存", description: `${editingPreset.name} 配置已更新` });
    closeEdit();
  };

  const runTest = (m: PresetMcp) => {
    if (!configs[m.id]) {
      toast({ title: "请先配置", description: `请先编辑 ${m.name} 并填写服务地址`, variant: "destructive" });
      return;
    }
    setTestingId(m.id);
    setTimeout(() => {
      const ok = Math.random() > 0.2;
      setLinkStatus((s) => ({ ...s, [m.id]: ok ? "linked" : "unlinked" }));
      setTestingId(null);
      toast({
        title: ok ? "连接成功" : "连接失败",
        description: ok ? `${m.name} 已与目标服务完成握手` : `${m.name} 无法连接，请检查服务地址或网络`,
        variant: ok ? "default" : "destructive",
      });
    }, 900);
  };

  return (
    <div className="p-6 max-w-[1200px] mx-auto animate-fade-in">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Server className="w-4 h-4 text-primary" />
            MCP 管理
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            列表内 MCP 的名称、标识、简介与类型已固定，仅需配置服务地址等凭据即可启用
          </p>
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden mt-5">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs h-9 whitespace-nowrap">名称</TableHead>
              <TableHead className="text-xs h-9 whitespace-nowrap w-[110px]">类型</TableHead>
              <TableHead className="text-xs h-9 whitespace-nowrap w-[80px]">鉴权</TableHead>
              <TableHead className="text-xs h-9 whitespace-nowrap w-[90px]">是否配置</TableHead>
              <TableHead className="text-xs h-9 whitespace-nowrap w-[100px]">状态</TableHead>
              <TableHead className="text-xs h-9 whitespace-nowrap w-[180px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {presetMcps.map((m) => {
              const configured = !!configs[m.id];
              const status = linkStatus[m.id];
              const testing = testingId === m.id;
              return (
                <TableRow key={m.id}>
                  <TableCell className="py-2.5">
                    <div className="flex items-start gap-2 min-w-0">
                      <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Server className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium truncate" title={m.name}>{m.name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{m.id}</div>
                        <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5 max-w-[360px]" title={m.description}>{m.description}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-2 whitespace-nowrap">
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-mono font-normal">
                      {typeLabel(m.type)}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2 whitespace-nowrap">
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal border-cyan-300 text-cyan-700 bg-cyan-50/60">
                      Query
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2 whitespace-nowrap">
                    {configured ? (
                      <Badge className="text-[10px] h-5 px-1.5 font-normal bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" />已配置
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal border-amber-300 text-amber-700 bg-amber-50/60">
                        未配置
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="py-2 whitespace-nowrap">
                    {status === "linked" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
                        <CheckCircle2 className="w-3 h-3" />已链接
                      </span>
                    ) : status === "unlinked" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-destructive">
                        <XCircle className="w-3 h-3" />未连接
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />未连接
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="py-2 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 px-2" onClick={() => openEdit(m)}>
                        <Pencil className="w-3 h-3" />编辑
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] gap-1 px-2"
                        onClick={() => runTest(m)}
                        disabled={testing}
                      >
                        {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : status ? <RefreshCw className="w-3 h-3" /> : <Plug className="w-3 h-3" />}
                        {status ? "重新连接" : "连接"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* 编辑弹窗：手动创建表单（名称/标识/简介/类型 锁定） */}
      <Dialog open={!!editingId} onOpenChange={(o) => { if (!o) closeEdit(); }}>
        <DialogContent className="max-w-[520px] p-4">
          <DialogHeader>
            <DialogTitle className="text-sm">
              配置 MCP{editingPreset ? ` · ${editingPreset.name}` : ""}
            </DialogTitle>
          </DialogHeader>

          {editingPreset && (
            <div className="space-y-3 max-h-[480px] overflow-auto -mx-1 px-1">
              {/* 1. 显示名称 */}
              <div>
                <Label className="text-[11px] font-medium flex items-center gap-1">
                  显示名称 <Lock className="w-2.5 h-2.5 text-muted-foreground" />
                </Label>
                <div className="mt-1 flex items-center gap-2">
                  <Input className="h-8 text-xs bg-muted/30 flex-1" value={editingPreset.name} readOnly disabled />
                  <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center shrink-0">
                    <Server className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                </div>
              </div>

              {/* 2. 英文标识 */}
              <div>
                <Label className="text-[11px] font-medium flex items-center gap-1">
                  英文标识 <Lock className="w-2.5 h-2.5 text-muted-foreground" />
                </Label>
                <Input className="mt-1 h-8 text-xs bg-muted/30 font-mono" value={editingPreset.id} readOnly disabled />
              </div>

              {/* 3. 简介 */}
              <div>
                <Label className="text-[11px] font-medium flex items-center gap-1">
                  简介 <Lock className="w-2.5 h-2.5 text-muted-foreground" />
                </Label>
                <Textarea className="mt-1 text-xs bg-muted/30 min-h-[56px]" value={editingPreset.description} readOnly disabled />
              </div>

              {/* 4. 类型 */}
              <div>
                <Label className="text-[11px] font-medium flex items-center gap-1">
                  类型 <Lock className="w-2.5 h-2.5 text-muted-foreground" />
                </Label>
                <div className="mt-1.5">
                  <Badge variant="outline" className="text-[11px] h-6 px-2 font-mono font-normal">
                    {typeLabel(editingPreset.type)}
                  </Badge>
                </div>
              </div>

              {/* 5. 服务地址（可填） + 跳转复制链接 */}
              {editingPreset.type !== "studio" && (
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-medium">服务地址</Label>
                    <a
                      href={editingPreset.copyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-primary hover:underline inline-flex items-center gap-0.5"
                    >
                      去复制服务地址 <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">前往服务提供方页面复制 MCP 服务地址，再粘贴到此处</p>
                  <Input
                    className="mt-1 h-8 text-xs"
                    value={form.endpoint}
                    onChange={(e) => setForm((f) => ({ ...f, endpoint: e.target.value }))}
                    placeholder="例如 https://mcp-gw.example.com/server/xxx/http"
                  />
                </div>
              )}

              {/* 6. 请求头 */}
              {editingPreset.type === "http" && (
                <div>
                  <Label className="text-[11px] font-medium">请求头</Label>
                  <p className="text-[10px] text-muted-foreground mt-0.5">发送到 MCP 服务器的额外 HTTP 请求头（如 Authorization、X-API-Key 等）</p>
                  {form.headers.length > 0 && (
                    <div className="space-y-1.5 mt-1.5">
                      {form.headers.map((h, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <Input className="h-7 text-xs flex-1" placeholder="Header" value={h.key}
                            onChange={(e) => setForm((f) => ({ ...f, headers: f.headers.map((x, idx) => idx === i ? { ...x, key: e.target.value } : x) }))} />
                          <Input className="h-7 text-xs flex-1" placeholder="Value" value={h.value}
                            onChange={(e) => setForm((f) => ({ ...f, headers: f.headers.map((x, idx) => idx === i ? { ...x, value: e.target.value } : x) }))} />
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setForm((f) => ({ ...f, headers: f.headers.filter((_, idx) => idx !== i) }))}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-1 border-dashed mt-1.5"
                    onClick={() => setForm((f) => ({ ...f, headers: [...f.headers, { key: "", value: "" }] }))}>
                    <Plus className="w-3 h-3" /> 添加请求头
                  </Button>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeEdit}>取消</Button>
            <Button onClick={handleSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VaultPage;
