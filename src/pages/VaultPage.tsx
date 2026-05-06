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
import { Plus, Pencil, Trash2, KeyRound, ShieldCheck, Lock, Check, ChevronsUpDown, AlertTriangle, Bot } from "lucide-react";
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
      title: "凭据已保存",
      description: `${credName}（${credType}）已加密存入凭据库`,
    });
    setCreateOpen(false);
    reset();
  };

  return (
    <div className="p-6 max-w-[1100px] mx-auto animate-fade-in">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            凭据金库
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            集中管理外部 MCP Server 与第三方 API 的认证信息，支持在多个 Agent 中复用
          </p>
        </div>
        <Button onClick={() => { reset(); setCreateOpen(true); }} className="gap-1.5">
          <Plus className="w-4 h-4" />
          新增凭据
        </Button>
      </div>

      {/* Type info */}
      <div className="grid grid-cols-2 gap-3 my-5">
        <div className="border border-border rounded-lg p-3 bg-card flex items-start gap-2.5">
          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
            <KeyRound className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-xs font-medium">Bearer Token</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">静态 API 密钥，简单直接，适合内部服务</div>
          </div>
        </div>
        <div className="border border-border rounded-lg p-3 bg-card flex items-start gap-2.5">
          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-xs font-medium">OAuth 2.0</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">委托授权流，支持自动刷新 Token，适合 SaaS 接入</div>
          </div>
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>凭据名称</TableHead>
              <TableHead>凭据类型</TableHead>
              <TableHead>关联 MCP 服务器</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="w-24">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockCredentials.map((cred) => (
              <TableRow key={cred.id}>
                <TableCell className="font-medium text-xs">{cred.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px] gap-1">
                    {cred.type === "OAuth 2.0" ? <Lock className="w-3 h-3" /> : <KeyRound className="w-3 h-3" />}
                    {cred.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">{cred.mcpServer}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{cred.createdAt}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7"><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新增凭据</DialogTitle>
            <DialogDescription className="text-xs">凭据将以加密形式存储，仅在 Agent 运行时由系统注入</DialogDescription>
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
    </div>
  );
};

export default VaultPage;
