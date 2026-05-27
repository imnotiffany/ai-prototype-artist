import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Cpu, Image as ImageIcon, Pencil, Trash2, Box, Search, Server, Layers, HelpCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { defaultEnvironments, getEnvironments, setEnvironments, projectImages, type EnvItem } from "@/data/environments";

const genEnvId = () => `env-${Math.random().toString(36).slice(2, 8)}`;

const DU_OPTIONS = [
  "TEST-SYSTEM-TIME-AI-MODELSERVICE",
  "AOP-EXPECT-INFO-AI-MODELSERVICE",
  "CDN-INFO-AI-MODELSERVICE",
  "CDN-AI-MODELSERVICE",
  "ENDEPT-A-DUBBO-K8S-AI-MODELSERVICE",
  "TST01453613-AI-MODELSERVICE",
  "ZY-TEST02-AI-MODELSERVICE",
  "SMART-BRIEFING-MCP3-AI-MODELSERVICE",
];

const specToValue = (spec: string) => {
  const s = spec.replace(/\s/g, "");
  if (s.startsWith("1C")) return "1C2G";
  if (s.startsWith("2C")) return "2C4G";
  if (s.startsWith("8C")) return "8C32G";
  return "4C8G";
};

const EnvironmentPage = () => {
  const [envs, setEnvs] = useState<EnvItem[]>(getEnvironments().length ? getEnvironments() : defaultEnvironments);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");

  const emptyForm = {
    name: "",
    description: "",
    spec: "4C8G",
    image: "img-default",
    duMode: "new" as "new" | "existing",
    du: "",
    instances: 1,
  };
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return envs;
    return envs.filter((e) => e.name.toLowerCase().includes(k) || e.envId.toLowerCase().includes(k));
  }, [envs, keyword]);

  const persist = (next: EnvItem[]) => {
    setEnvs(next);
    setEnvironments(next);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (e: EnvItem) => {
    setEditingId(e.id);
    setForm({
      name: e.name,
      description: e.description || "",
      spec: specToValue(e.spec),
      image: e.image || "img-default",
      duMode: e.duMode || "new",
      du: e.du || "",
      instances: e.instances || 1,
    });
    setOpen(true);
  };

  const submit = () => {
    if (!form.name.trim()) {
      toast({ title: "请填写环境名称", variant: "destructive" });
      return;
    }
    if (!form.du.trim()) {
      toast({ title: form.duMode === "new" ? "请填写部署单元 DU 名称" : "请选择已有 DU", variant: "destructive" });
      return;
    }
    const specLabel = form.spec === "1C2G" ? "1C 2G" : form.spec === "2C4G" ? "2C 4G" : form.spec === "4C8G" ? "4C 8G" : "8C 32G";
    const updatedAt = new Date().toISOString().slice(0, 16).replace("T", " ");

    if (editingId) {
      const next = envs.map((x) =>
        x.id === editingId
          ? { ...x, name: form.name.trim(), description: form.description, spec: specLabel, image: form.image, duMode: form.duMode, du: form.du.trim(), instances: form.instances, updatedAt }
          : x,
      );
      persist(next);
      toast({ title: "环境已更新", description: form.name });
    } else {
      const next: EnvItem[] = [
        {
          id: genEnvId(),
          envId: genEnvId(),
          name: form.name.trim(),
          spec: specLabel,
          deps: 0,
          agents: 0,
          updatedAt,
          description: form.description,
          image: form.image,
          duMode: form.duMode,
          du: form.du.trim(),
          instances: form.instances,
        },
        ...envs,
      ];
      persist(next);
      toast({ title: "环境已创建", description: form.name });
    }
    setOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const editingEnv = editingId ? envs.find((x) => x.id === editingId) : null;
  const readOnly = !!editingEnv?.preset;

  const imageName = (id?: string) => projectImages.find((x) => x.id === id)?.name || "—";

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
              Agent 执行任务时使用的一套可复用配置，包含资源规格、运行镜像、部署单元 DU 与实例数等
            </p>
          </div>
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={openCreate}>
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
        </div>

        <div className="border border-border rounded-lg bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">环境名称</TableHead>
                <TableHead className="text-xs">环境 ID</TableHead>
                <TableHead className="text-xs">规格</TableHead>
                <TableHead className="text-xs">镜像</TableHead>
                <TableHead className="text-xs">DU</TableHead>
                <TableHead className="text-xs">实例数</TableHead>
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
                  <TableCell className="text-xs text-muted-foreground font-mono">{imageName(e.image)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono max-w-[180px] truncate" title={e.du}>{e.du || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{e.instances ?? 1}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{e.agents}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{e.updatedAt}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(e)}>
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
                  <TableCell colSpan={9} className="text-center text-xs text-muted-foreground py-8">
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
            <DialogTitle className="text-sm">{readOnly ? "查看环境" : editingId ? "编辑环境" : "新建环境"}</DialogTitle>
            <DialogDescription className="text-[11px]">{readOnly ? "默认环境为系统预置，仅供查看" : "配置环境的资源、镜像与部署单元"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <Label className="text-xs">环境名称 <span className="text-destructive">*</span></Label>
              <Input
                className="mt-1.5 h-8 text-xs"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="例如：数据分析环境"
                disabled={readOnly}
              />
            </div>
            <div>
              <Label className="text-xs">描述</Label>
              <Textarea className="mt-1.5 text-xs" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="简要描述环境用途" disabled={readOnly} />
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1.5"><Cpu className="w-3 h-3" />资源配置</Label>
              <Select value={form.spec} onValueChange={(v) => setForm({ ...form, spec: v })} disabled={readOnly}>
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
              <Label className="text-xs flex items-center gap-1.5"><ImageIcon className="w-3 h-3" />镜像</Label>
              <p className="text-[11px] text-muted-foreground mt-1">从项目内已有的镜像中选择，未选择时使用默认镜像</p>
              <Select value={form.image} onValueChange={(v) => setForm({ ...form, image: v })} disabled={readOnly}>
                <SelectTrigger className="mt-1.5 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {projectImages.map((img) => (
                    <SelectItem key={img.id} value={img.id} className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{img.name}</span>
                        {img.isDefault && <Badge variant="secondary" className="h-4 text-[10px] px-1.5">默认</Badge>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs flex items-center gap-1.5">
                <Server className="w-3 h-3" />
                关联 DU <span className="text-destructive">*</span>
                <HelpCircle className="w-3 h-3 text-muted-foreground" />
              </Label>
              <p className="text-[11px] text-amber-600 dark:text-amber-500 mt-1 leading-relaxed">
                为遵循线上服务运维管理规范，线上生产服务要求关联顺丰云架构 DU，以便能在出现问题时快速追溯与定位。
              </p>
              <div className="flex items-center gap-4 mt-2">
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="radio"
                    name="duMode"
                    value="new"
                    checked={form.duMode === "new"}
                    onChange={() => setForm({ ...form, duMode: "new", du: "" })}
                    disabled={readOnly}
                    className="accent-primary"
                  />
                  新建 DU
                </label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="radio"
                    name="duMode"
                    value="existing"
                    checked={form.duMode === "existing"}
                    onChange={() => setForm({ ...form, duMode: "existing", du: "" })}
                    disabled={readOnly}
                    className="accent-primary"
                  />
                  已有 DU
                </label>
              </div>
              {form.duMode === "new" ? (
                <Input
                  className="mt-2 h-8 text-xs font-mono"
                  placeholder="请输入部署单元 DU 名称"
                  value={form.du}
                  onChange={(e) => setForm({ ...form, du: e.target.value })}
                  disabled={readOnly}
                />
              ) : (
                <Select value={form.du} onValueChange={(v) => setForm({ ...form, du: v })} disabled={readOnly}>
                  <SelectTrigger className="mt-2 h-8 text-xs">
                    <SelectValue placeholder="请选择顺丰云 DU" />
                  </SelectTrigger>
                  <SelectContent>
                    {DU_OPTIONS.map((d) => (
                      <SelectItem key={d} value={d} className="text-xs font-mono">{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <Label className="text-xs flex items-center gap-1.5">
                <Layers className="w-3 h-3" />
                实例数量 <span className="text-destructive">*</span>
              </Label>
              <p className="text-[11px] text-muted-foreground mt-1">最高 4 个实例，默认 1 个</p>
              <Select
                value={String(form.instances)}
                onValueChange={(v) => setForm({ ...form, instances: Number(v) })}
                disabled={readOnly}
              >
                <SelectTrigger className="mt-1.5 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map((n) => (
                    <SelectItem key={n} value={String(n)} className="text-xs">{n} 个实例</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setOpen(false)}>{readOnly ? "关闭" : "取消"}</Button>
            {!readOnly && (
              <Button size="sm" className="h-8 text-xs" onClick={submit}>{editingId ? "保存" : "创建"}</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnvironmentPage;
