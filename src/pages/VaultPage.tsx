import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Server, AlertTriangle, Bot, Plug, Loader2, CheckCircle2, XCircle, Link2, X } from "lucide-react";
import { sharedResources, mockAgents } from "@/data/mockData";
import { toast } from "@/hooks/use-toast";

interface McpEntry {
  id: string;
  name: string;
  identifier: string;
  endpoint: string;
  deployment: string;
  createdAt: string;
}

const initialMcps: McpEntry[] = sharedResources
  .filter((r) => r.type === "mcp")
  .slice(0, 10)
  .map((r, i) => ({
    id: r.id,
    name: r.name,
    identifier: `mcp-${String(i + 1).padStart(2, "0")}`,
    endpoint:
      r.deployment === "本地"
        ? `http://localhost:${3000 + i}/mcp`
        : `https://mcp.example.com/${r.provider ?? "svc"}/${r.id}/http`,
    deployment: r.deployment ?? "云端",
    createdAt: r.addedAt,
  }));

const VaultPage = () => {
  const [mcps, setMcps] = useState<McpEntry[]>(initialMcps);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<McpEntry | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, "ok" | "fail">>({});

  // form state
  const [endpoint, setEndpoint] = useState("");
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [headers, setHeaders] = useState<{ key: string; value: string }[]>([]);
  const [timeout, setTimeoutVal] = useState("30");
  const [sseTimeout, setSseTimeout] = useState("300");
  const [tab, setTab] = useState<"headers" | "config">("headers");

  const reset = () => {
    setEndpoint(""); setName(""); setIdentifier("");
    setHeaders([]); setTimeoutVal("30"); setSseTimeout("300"); setTab("headers");
  };

  const linkedAgents = (mcpName: string) =>
    mockAgents.filter((a) => a.mcpServers?.includes(mcpName)).map((a) => a.name);

  const runTest = (id: string, label: string) => {
    setTestingId(id);
    setTimeout(() => {
      const ok = Math.random() > 0.2;
      setTestResult((r) => ({ ...r, [id]: ok ? "ok" : "fail" }));
      setTestingId(null);
      toast({
        title: ok ? "连接成功" : "连接失败",
        description: ok ? `${label} 已与目标服务完成握手` : `${label} 无法连接，请检查端点 URL 或服务可达性`,
        variant: ok ? "default" : "destructive",
      });
    }, 900);
  };

  const openCreate = () => {
    reset();
    setEditingId(null);
    setCreateOpen(true);
  };

  const openEdit = (m: McpEntry) => {
    reset();
    setEditingId(m.id);
    setEndpoint(m.endpoint);
    setName(m.name);
    setIdentifier(m.identifier);
    setCreateOpen(true);
  };

  const canSave = endpoint.trim() && name.trim() && identifier.trim();

  const handleSave = () => {
    if (!endpoint.trim()) return toast({ title: "请填写服务端点 URL", variant: "destructive" });
    if (!name.trim()) return toast({ title: "请填写名称", variant: "destructive" });
    if (!identifier.trim()) return toast({ title: "请填写服务器标识符", variant: "destructive" });

    if (editingId) {
      setMcps((arr) => arr.map((m) => m.id === editingId ? { ...m, endpoint, name, identifier } : m));
      toast({ title: "MCP 已更新", description: `${name} 已保存` });
    } else {
      const id = `m_${Date.now()}`;
      setMcps((arr) => [{ id, name, identifier, endpoint, deployment: "Remote", createdAt: new Date().toISOString().slice(0, 10) }, ...arr]);
      toast({ title: "MCP 已添加", description: `${name} 已加入 MCP 管理` });
    }
    setCreateOpen(false);
    setEditingId(null);
    reset();
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setMcps((arr) => arr.filter((m) => m.id !== deleteTarget.id));
    toast({ title: "MCP 已删除", description: `${deleteTarget.name} 已从 MCP 管理中移除` });
    setDeleteTarget(null);
  };

  return (
    <div className="p-6 max-w-[1100px] mx-auto animate-fade-in">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Server className="w-4 h-4 text-primary" />
            MCP 管理
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            集中管理已接入的 MCP 服务，支持 HTTP/SSE 接入，并在多个智能体中复用
          </p>
        </div>
        <Button onClick={openCreate} className="gap-1.5">
          <Plus className="w-4 h-4" />
          新增 MCP
        </Button>
      </div>

      <div className="border border-border rounded-lg overflow-hidden mt-5">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs h-9 whitespace-nowrap">名称</TableHead>
              <TableHead className="text-xs h-9 whitespace-nowrap">标识符</TableHead>
              <TableHead className="text-xs h-9 whitespace-nowrap">服务端点</TableHead>
              <TableHead className="text-xs h-9 whitespace-nowrap w-[110px]">使用情况</TableHead>
              <TableHead className="text-xs h-9 whitespace-nowrap w-[100px]">创建时间</TableHead>
              <TableHead className="text-xs h-9 whitespace-nowrap w-[90px]">连接状态</TableHead>
              <TableHead className="text-xs h-9 whitespace-nowrap w-[100px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mcps.map((m) => {
              const agents = linkedAgents(m.name);
              return (
                <TableRow key={m.id}>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center shrink-0">
                        <Server className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-xs font-medium truncate" title={m.name}>{m.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2 text-[11px] text-muted-foreground font-mono whitespace-nowrap">{m.identifier}</TableCell>
                  <TableCell className="py-2 text-[11px] text-muted-foreground font-mono max-w-[240px]">
                    <div className="flex items-center gap-1 min-w-0">
                      <Link2 className="w-3 h-3 shrink-0" />
                      <span className="truncate" title={m.endpoint}>{m.endpoint}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2 whitespace-nowrap">
                    {agents.length > 0 ? (
                      <Badge variant="secondary" className="text-[11px] gap-1 font-normal">
                        <Bot className="w-3 h-3" />
                        {agents.length} 个智能体
                      </Badge>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">未使用</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2 text-[11px] text-muted-foreground whitespace-nowrap">{m.createdAt}</TableCell>
                  <TableCell className="py-2 whitespace-nowrap">
                    {testingId === m.id ? (
                      <Badge variant="outline" className="text-[10px] gap-1 font-normal"><Loader2 className="w-3 h-3 animate-spin" />测试中</Badge>
                    ) : testResult[m.id] === "ok" ? (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-[10px] gap-1"><CheckCircle2 className="w-3 h-3" />已连通</Badge>
                    ) : testResult[m.id] === "fail" ? (
                      <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 text-[10px] gap-1"><XCircle className="w-3 h-3" />失败</Badge>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">未测试</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-0.5">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => runTest(m.id, m.name)} title="测试连接" disabled={testingId === m.id}>
                        <Plug className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(m)} title="编辑">
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(m)} title="删除">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "编辑 MCP 服务 (HTTP)" : "添加 MCP 服务 (HTTP)"}</DialogTitle>
            <DialogDescription className="sr-only">配置 MCP 服务端点与请求头</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div>
              <Label className="text-xs font-medium">服务端点 URL</Label>
              <Input
                className="mt-1.5 h-9 text-sm bg-muted/30"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="服务端点的 URL"
              />
            </div>

            <div>
              <Label className="text-xs font-medium">名称和图标</Label>
              <div className="mt-1.5 flex items-center gap-2">
                <Input
                  className="h-9 text-sm bg-muted/30 flex-1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="命名你的 MCP 服务"
                />
                <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center shrink-0">
                  <Server className="w-4 h-4 text-primary-foreground" />
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium">服务器标识符</Label>
              <p className="text-[11px] text-muted-foreground mt-1">
                工作空间内服务器的唯一标识。支持小写字母、数字、下划线和连字符，最多 24 个字符。
              </p>
              <Input
                className="mt-1.5 h-9 text-sm bg-muted/30"
                value={identifier}
                maxLength={24}
                onChange={(e) => setIdentifier(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                placeholder="服务器唯一标识，例如 my-mcp-server"
              />
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as "headers" | "config")} className="w-full">
              <TabsList className="grid grid-cols-2 w-full bg-muted/40">
                <TabsTrigger value="headers">请求头</TabsTrigger>
                <TabsTrigger value="config">配置</TabsTrigger>
              </TabsList>

              <TabsContent value="headers" className="space-y-3 mt-3">
                <div>
                  <div className="text-xs font-medium">请求头</div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    发送到 MCP 服务器的额外 HTTP 请求头
                  </p>
                </div>
                {headers.length === 0 ? (
                  <div className="text-[11px] text-muted-foreground">未配置自定义请求头</div>
                ) : (
                  <div className="space-y-2">
                    {headers.map((h, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input
                          className="h-8 text-xs flex-1"
                          placeholder="Header"
                          value={h.key}
                          onChange={(e) => setHeaders((arr) => arr.map((x, idx) => idx === i ? { ...x, key: e.target.value } : x))}
                        />
                        <Input
                          className="h-8 text-xs flex-1"
                          placeholder="Value"
                          value={h.value}
                          onChange={(e) => setHeaders((arr) => arr.map((x, idx) => idx === i ? { ...x, value: e.target.value } : x))}
                        />
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setHeaders((arr) => arr.filter((_, idx) => idx !== i))}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-xs gap-1 border-dashed"
                  onClick={() => setHeaders((arr) => [...arr, { key: "", value: "" }])}
                >
                  <Plus className="w-3.5 h-3.5" /> 添加请求头
                </Button>
              </TabsContent>

              <TabsContent value="config" className="space-y-3 mt-3">
                <div>
                  <Label className="text-xs font-medium">超时时间</Label>
                  <Input className="mt-1.5 h-9 text-sm bg-muted/30" value={timeout} onChange={(e) => setTimeoutVal(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs font-medium">SSE 读取超时时间</Label>
                  <Input className="mt-1.5 h-9 text-sm bg-muted/30" value={sseTimeout} onChange={(e) => setSseTimeout(e.target.value)} />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={!canSave}>
              {editingId ? "保存" : "添加并授权"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              确认删除 MCP
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-xs">
                <p>
                  即将删除 MCP「<span className="font-medium text-foreground">{deleteTarget?.name}</span>」。
                  删除后无法恢复，且会立即从所有正在使用的智能体中移除。
                </p>
                {deleteTarget && (() => {
                  const agents = linkedAgents(deleteTarget.name);
                  if (agents.length === 0) {
                    return <p className="text-muted-foreground">该 MCP 当前未被任何智能体使用，可以安全删除。</p>;
                  }
                  return (
                    <div className="border border-destructive/30 bg-destructive/5 rounded-md p-3">
                      <div className="flex items-center gap-1.5 text-destructive font-medium mb-2">
                        <Bot className="w-3.5 h-3.5" />
                        以下 {agents.length} 个智能体正在使用，删除后将无法调用对应 MCP：
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {agents.map((n) => (
                          <Badge key={n} variant="outline" className="text-[10px]">{n}</Badge>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default VaultPage;
