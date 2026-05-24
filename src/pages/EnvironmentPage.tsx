import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Cpu, Package, Globe, Pencil, Trash2, Box, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { defaultEnvironments, getEnvironments, setEnvironments, type EnvItem } from "@/data/environments";

const genEnvId = () => `env-${Math.random().toString(36).slice(2, 8)}`;

const EnvironmentPage = () => {
  const [envs, setEnvs] = useState<EnvItem[]>(getEnvironments().length ? getEnvironments() : defaultEnvironments);
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  type DepRow = { manager: "pip" | "npm" | "apt"; pkg: string; version: string };
  const [form, setForm] = useState<{
    name: string;
    description: string;
    spec: string;
    deps: DepRow[];
    network: string;
  }>({
    name: "",
    description: "",
    spec: "4C8G",
    deps: [{ manager: "pip", pkg: "", version: "" }],
    network: "internet",
  });

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return envs;
    return envs.filter((e) => e.name.toLowerCase().includes(k) || e.envId.toLowerCase().includes(k));
  }, [envs, keyword]);

  const persist = (next: EnvItem[]) => {
    setEnvs(next);
    setEnvironments(next);
  };

  const submit = () => {
    if (!form.name.trim()) {
      toast({ title: "请填写环境名称", variant: "destructive" });
      return;
    }
    const validDeps = form.deps.filter((d) => d.pkg.trim() && d.version.trim());
    if (form.deps.some((d) => (d.pkg.trim() || d.version.trim()) && (!d.pkg.trim() || !d.version.trim()))) {
      toast({ title: "依赖包信息不完整", description: "包名和版本号均为必填", variant: "destructive" });
      return;
    }
    const specLabel = form.spec === "1C2G" ? "1C 2G" : form.spec === "2C4G" ? "2C 4G" : form.spec === "4C8G" ? "4C 8G" : "8C 32G";
    const next: EnvItem[] = [
      {
        id: genEnvId(),
        envId: genEnvId(),
        name: form.name.trim(),
        spec: specLabel,
        deps: validDeps.length,
        agents: 0,
        updatedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
        description: form.description,
      },
      ...envs,
    ];
    persist(next);
    toast({ title: "环境已创建", description: `${form.name}` });
    setOpen(false);
    setForm({ name: "", description: "", spec: "4C8G", deps: [{ manager: "pip", pkg: "", version: "" }], network: "internet" });
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <Box className="w-4 h-4 text-primary" />
              环境管理
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Agent 执行任务时使用的一套可复用配置，包含资源规格、基础运行时、依赖包、网络权限、存储和安全配置
            </p>
          </div>
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setOpen(true)}>
            <Plus className="w-3.5 h-3.5" /> 新建环境
          </Button>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              className="h-8 text-xs pl-8"
              placeholder="搜索环境名称或环境 ID"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
          <span className="text-[11px] text-muted-foreground">共 {filtered.length} 个环境</span>
        </div>

        <div className="border border-border rounded-lg bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">环境名称</TableHead>
                <TableHead className="text-xs">环境 ID</TableHead>
                <TableHead className="text-xs">规格</TableHead>
                <TableHead className="text-xs">依赖包</TableHead>
                <TableHead className="text-xs">关联 Agent</TableHead>
                <TableHead className="text-xs">最近更新</TableHead>
                <TableHead className="text-xs text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{e.name}</span>
                      {e.preset && <Badge variant="secondary" className="h-4 text-[10px] px-1.5">默认</Badge>}
                    </div>
                    {e.description && <p className="text-[11px] text-muted-foreground mt-0.5">{e.description}</p>}
                  </TableCell>
                  <TableCell className="text-xs">
                    <code className="text-[11px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">{e.envId}</code>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{e.spec}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{e.deps}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{e.agents}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{e.updatedAt}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive"
                        disabled={e.preset}
                        onClick={() => persist(envs.filter((x) => x.id !== e.id))}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-8">
                    没有匹配的环境
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">新建环境</DialogTitle>
            <DialogDescription className="text-[11px]">环境 ID 将在创建后自动生成，无需手动填写</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <Label className="text-xs">环境名称 <span className="text-destructive">*</span></Label>
              <Input
                className="mt-1.5 h-8 text-xs"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="例如：数据分析环境"
              />
            </div>
            <div>
              <Label className="text-xs">描述</Label>
              <Textarea className="mt-1.5 text-xs" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="简要描述环境用途" />
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1.5"><Cpu className="w-3 h-3" />CPU / 内存规格</Label>
              <Select value={form.spec} onValueChange={(v) => setForm({ ...form, spec: v })}>
                <SelectTrigger className="mt-1.5 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1C2G" className="text-xs">1 核 2G</SelectItem>
                  <SelectItem value="2C4G" className="text-xs">2 核 4G</SelectItem>
                  <SelectItem value="4C8G" className="text-xs">4 核 8G</SelectItem>
                  <SelectItem value="8C32G" className="text-xs">8 核 32G · GPU</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1.5"><Package className="w-3 h-3" />依赖包</Label>
              <Textarea className="mt-1.5 text-xs font-mono" rows={3} value={form.deps} onChange={(e) => setForm({ ...form, deps: e.target.value })} placeholder="例如：numpy, pandas, requests" />
              <p className="text-[10px] text-muted-foreground mt-1">英文逗号分隔，可指定版本：pandas==2.0.3</p>
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1.5"><Globe className="w-3 h-3" />网络策略</Label>
              <Select value={form.network} onValueChange={(v) => setForm({ ...form, network: v })}>
                <SelectTrigger className="mt-1.5 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="internet" className="text-xs">允许公网访问</SelectItem>
                  <SelectItem value="intranet" className="text-xs">仅内网</SelectItem>
                  <SelectItem value="isolated" className="text-xs">完全隔离</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setOpen(false)}>取消</Button>
            <Button size="sm" className="h-8 text-xs" onClick={submit}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnvironmentPage;
