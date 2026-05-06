import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, Pencil, Trash2, KeyRound, ShieldCheck, Lock, Check, ChevronsUpDown, AlertTriangle, Bot, Plug, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { mockCredentials, sharedResources, mockAgents } from "@/data/mockData";
import { toast } from "@/hooks/use-toast";

type CredType = "Bearer Token" | "OAuth 2.0";

const VaultPage = () => {
  const [createOpen, setCreateOpen] = useState(false);
  const [credType, setCredType] = useState<CredType>("Bearer Token");
  const [credName, setCredName] = useState("");
  const [mcpServer, setMcpServer] = useState("");
  const [tokenValue, setTokenValue] = useState("");
  const [oauthClientId, setOauthClientId] = useState("");
  const [oauthClientSecret, setOauthClientSecret] = useState("");
  const [oauthAuthUrl, setOauthAuthUrl] = useState("");
  const [oauthTokenUrl, setOauthTokenUrl] = useState("");
  const [oauthScopes, setOauthScopes] = useState("");

  const mcpOptions = sharedResources.filter((r) => r.type === "mcp").map((r) => r.name);

  const reset = () => {
    setCredName(""); setMcpServer(""); setTokenValue("");
    setOauthClientId(""); setOauthClientSecret(""); setOauthAuthUrl(""); setOauthTokenUrl(""); setOauthScopes("");
    setCredType("Bearer Token");
  };

  const [mcpPickerOpen, setMcpPickerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<typeof mockCredentials[number] | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, "ok" | "fail">>({});
  const [formTesting, setFormTesting] = useState(false);
  const [formTestResult, setFormTestResult] = useState<"ok" | "fail" | null>(null);

  const runTest = (id: string, label: string) => {
    setTestingId(id);
    setTimeout(() => {
      const ok = Math.random() > 0.2;
      setTestResult((r) => ({ ...r, [id]: ok ? "ok" : "fail" }));
      setTestingId(null);
      toast({
        title: ok ? "连接成功" : "连接失败",
        description: ok ? `${label} 已与目标 MCP 完成握手` : `${label} 无法连接，请检查凭据值或 MCP 服务可达性`,
        variant: ok ? "default" : "destructive",
      });
    }, 900);
  };

  const runFormTest = () => {
    if (!mcpServer) {
      toast({ title: "请先选择关联 MCP", variant: "destructive" });
      return;
    }
    if (credType === "Bearer Token" && !tokenValue) {
      toast({ title: "请输入 Token 值", variant: "destructive" });
      return;
    }
    if (credType === "OAuth 2.0" && (!oauthClientId || !oauthClientSecret)) {
      toast({ title: "请填写 OAuth Client ID/Secret", variant: "destructive" });
      return;
    }
    setFormTesting(true);
    setFormTestResult(null);
    setTimeout(() => {
      const ok = Math.random() > 0.2;
      setFormTesting(false);
      setFormTestResult(ok ? "ok" : "fail");
    }, 900);
  };

  const linkedAgents = (mcpName: string) =>
    mockAgents.filter((a) => a.mcpServers?.includes(mcpName)).map((a) => a.name);

  const openCreate = () => {
    reset();
    setEditingId(null);
    setCreateOpen(true);
  };

  const openEdit = (cred: typeof mockCredentials[number]) => {
    reset();
    setEditingId(cred.id);
    setCredName(cred.name);
    setMcpServer(cred.mcpServer);
    setCredType(cred.type as CredType);
    setCreateOpen(true);
  };

  const handleSave = () => {
    if (!mcpServer) {
      toast({ title: "请选择关联 MCP", variant: "destructive" });
      return;
    }
    if (!credName.trim()) {
      toast({ title: "请填写凭据名称", variant: "destructive" });
      return;
    }
    toast({
      title: editingId ? "凭据已更新" : "凭据已保存",
      description: `${credName}（${credType}）${editingId ? "已更新并同步到使用中的智能体" : "已加密存入凭据库"}`,
    });
    setCreateOpen(false);
    setEditingId(null);
    reset();
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    toast({ title: "凭据已删除", description: `${deleteTarget.name} 已从凭据管理中移除` });
    setDeleteTarget(null);
  };

  return (
    <div className="p-6 max-w-[1100px] mx-auto animate-fade-in">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            凭据管理
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            集中管理外部 MCP Server 与第三方 API 的认证信息，支持在多个智能体中复用
          </p>
        </div>
        <Button onClick={() => { reset(); setCreateOpen(true); }} className="gap-1.5">
          <Plus className="w-4 h-4" />
          新增凭据
        </Button>
      </div>

      {/* Type info */}
      <div className="grid grid-cols-2 gap-3 my-5">
        <div className="border border-border rounded-lg p-3.5 bg-card flex items-start gap-3">
          <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <KeyRound className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-sm font-medium">Bearer Token</div>
            <div className="text-xs text-muted-foreground mt-1">静态 API 密钥，简单直接，适合内部服务</div>
          </div>
        </div>
        <div className="border border-border rounded-lg p-3.5 bg-card flex items-start gap-3">
          <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-sm font-medium">OAuth 2.0</div>
            <div className="text-xs text-muted-foreground mt-1">委托授权流，支持自动刷新 Token，适合 SaaS 接入</div>
          </div>
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-sm">凭据名称</TableHead>
              <TableHead className="text-sm">凭据类型</TableHead>
              <TableHead className="text-sm">关联 MCP</TableHead>
              <TableHead className="text-sm">使用情况</TableHead>
              <TableHead className="text-sm">创建时间</TableHead>
              <TableHead className="w-24 text-sm">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockCredentials.map((cred) => {
              const agents = linkedAgents(cred.mcpServer);
              return (
                <TableRow key={cred.id}>
                  <TableCell className="font-medium text-sm">{cred.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs gap-1 font-normal">
                      {cred.type === "OAuth 2.0" ? <Lock className="w-3 h-3" /> : <KeyRound className="w-3 h-3" />}
                      {cred.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{cred.mcpServer}</TableCell>
                  <TableCell>
                    {agents.length > 0 ? (
                      <Badge variant="secondary" className="text-xs gap-1 font-normal">
                        <Bot className="w-3 h-3" />
                        {agents.length} 个智能体
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">未使用</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{cred.createdAt}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(cred)} title="编辑">
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(cred)} title="删除">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "编辑凭据" : "新增凭据"}</DialogTitle>
            <DialogDescription className="text-xs">
              {editingId
                ? "可修改名称与凭据值；保存后将自动同步到使用该凭据的所有智能体"
                : "凭据将以加密形式存储，仅在智能体运行时由系统注入"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">关联 MCP <span className="text-destructive">*</span></Label>
              <Popover open={mcpPickerOpen} onOpenChange={setMcpPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="mt-1.5 h-8 w-full justify-between text-xs font-normal"
                  >
                    <span className={mcpServer ? "" : "text-muted-foreground"}>
                      {mcpServer || "搜索并选择需要绑定的 MCP"}
                    </span>
                    <ChevronsUpDown className="w-3 h-3 opacity-50 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                  <Command>
                    <CommandInput placeholder="输入 MCP 名称搜索…" className="h-8 text-xs" />
                    <CommandList>
                      <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">未找到匹配的 MCP</CommandEmpty>
                      <CommandGroup>
                        {mcpOptions.map((mcp) => (
                          <CommandItem
                            key={mcp}
                            value={mcp}
                            onSelect={() => { setMcpServer(mcp); setMcpPickerOpen(false); }}
                            className="text-xs"
                          >
                            <Check className={`mr-2 h-3 w-3 ${mcpServer === mcp ? "opacity-100" : "opacity-0"}`} />
                            {mcp}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-[10px] text-muted-foreground mt-1">同一 MCP 可保存多个凭据，运行时可在智能体内选择</p>
            </div>

            <div>
              <Label className="text-xs">凭据名称 <span className="text-destructive">*</span></Label>
              <Input className="mt-1.5 h-8 text-xs" value={credName} onChange={(e) => setCredName(e.target.value)} placeholder="自定义名称，例如 Gmail 工作账号" />
            </div>

            <div>
              <Label className="text-xs">凭据类型</Label>
              <RadioGroup value={credType} onValueChange={(v) => setCredType(v as CredType)} className="mt-1.5 grid grid-cols-2 gap-2">
                <label className={`border rounded p-2.5 cursor-pointer flex items-start gap-2 ${credType === "Bearer Token" ? "border-primary bg-primary/5" : "border-border"}`}>
                  <RadioGroupItem value="Bearer Token" className="mt-0.5" />
                  <div>
                    <div className="text-xs font-medium flex items-center gap-1"><KeyRound className="w-3 h-3" />Bearer Token</div>
                    <div className="text-[10px] text-muted-foreground">静态密钥</div>
                  </div>
                </label>
                <label className={`border rounded p-2.5 cursor-pointer flex items-start gap-2 ${credType === "OAuth 2.0" ? "border-primary bg-primary/5" : "border-border"}`}>
                  <RadioGroupItem value="OAuth 2.0" className="mt-0.5" />
                  <div>
                    <div className="text-xs font-medium flex items-center gap-1"><Lock className="w-3 h-3" />OAuth 2.0</div>
                    <div className="text-[10px] text-muted-foreground">委托授权</div>
                  </div>
                </label>
              </RadioGroup>
            </div>

            {credType === "Bearer Token" ? (
              <div>
                <Label className="text-xs">Token 值</Label>
                <Input className="mt-1.5 h-8 text-xs font-mono" type="password" value={tokenValue} onChange={(e) => setTokenValue(e.target.value)} placeholder="输入 Bearer Token" />
              </div>
            ) : (
              <div className="space-y-3 border border-border rounded p-3 bg-muted/30">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Client ID</Label>
                    <Input className="mt-1.5 h-8 text-xs font-mono" value={oauthClientId} onChange={(e) => setOauthClientId(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Client Secret</Label>
                    <Input className="mt-1.5 h-8 text-xs font-mono" type="password" value={oauthClientSecret} onChange={(e) => setOauthClientSecret(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Authorization URL</Label>
                  <Input className="mt-1.5 h-8 text-xs font-mono" value={oauthAuthUrl} onChange={(e) => setOauthAuthUrl(e.target.value)} placeholder="https://accounts.example.com/oauth/authorize" />
                </div>
                <div>
                  <Label className="text-xs">Token URL</Label>
                  <Input className="mt-1.5 h-8 text-xs font-mono" value={oauthTokenUrl} onChange={(e) => setOauthTokenUrl(e.target.value)} placeholder="https://accounts.example.com/oauth/token" />
                </div>
                <div>
                  <Label className="text-xs">Scopes</Label>
                  <Input className="mt-1.5 h-8 text-xs font-mono" value={oauthScopes} onChange={(e) => setOauthScopes(e.target.value)} placeholder="read:email send:email" />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
            <Button onClick={handleSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              确认删除凭据
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-xs">
                <p>
                  即将删除凭据「<span className="font-medium text-foreground">{deleteTarget?.name}</span>」（{deleteTarget?.type}）。
                  删除后无法恢复，且会立即从所有正在使用的智能体中移除。
                </p>
                {deleteTarget && (() => {
                  const agents = linkedAgents(deleteTarget.mcpServer);
                  if (agents.length === 0) {
                    return <p className="text-muted-foreground">该凭据当前未被任何智能体使用，可以安全删除。</p>;
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
