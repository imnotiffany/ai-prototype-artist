import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  ChevronRight, ChevronDown, Building2, UserPlus, Search, Trash2, X,
} from "lucide-react";


/* ───────── Mock directory ───────── */
interface Employee {
  workId: string;
  name: string;
  department: string;
  deptId: string;
}
interface OrgNode {
  id: string;
  name: string;
  children?: OrgNode[];
  members?: Employee[];
}

const MOCK_DIRECTORY: Employee[] = [
  { workId: "01441970", name: "廖奕通", department: "AI技术平台 / 智能体组", deptId: "d-ai-agent" },
  { workId: "01422596", name: "张毅超", department: "AI技术平台 / 智能体组", deptId: "d-ai-agent" },
  { workId: "01441971", name: "陈昊", department: "AI技术平台 / 智能体组", deptId: "d-ai-agent" },
  { workId: "01441972", name: "林思远", department: "AI技术平台 / 智能体组", deptId: "d-ai-agent" },
  { workId: "01419965", name: "杨彪龙", department: "AI技术平台 / 平台组", deptId: "d-ai-platform" },
  { workId: "01234567", name: "张三", department: "AI技术平台 / 平台组", deptId: "d-ai-platform" },
  { workId: "01419966", name: "郑清怡", department: "AI技术平台 / 平台组", deptId: "d-ai-platform" },
  { workId: "01419967", name: "何俊杰", department: "AI技术平台 / 平台组", deptId: "d-ai-platform" },
  { workId: "01234568", name: "李四", department: "AI技术平台 / 算法组", deptId: "d-ai-algo" },
  { workId: "01234569", name: "王五", department: "AI技术平台 / 算法组", deptId: "d-ai-algo" },
  { workId: "01234580", name: "苏映雪", department: "AI技术平台 / 算法组", deptId: "d-ai-algo" },
  { workId: "01234581", name: "梁子豪", department: "AI技术平台 / 算法组", deptId: "d-ai-algo" },
  { workId: "01234570", name: "赵六", department: "基础架构部 / 云平台组", deptId: "d-infra-cloud" },
  { workId: "01234575", name: "冯博文", department: "基础架构部 / 云平台组", deptId: "d-infra-cloud" },
  { workId: "01234576", name: "许安琪", department: "基础架构部 / 云平台组", deptId: "d-infra-cloud" },
  { workId: "01234573", name: "周九", department: "基础架构部 / 网络组", deptId: "d-infra-net" },
  { workId: "01234577", name: "曹景行", department: "基础架构部 / 网络组", deptId: "d-infra-net" },
  { workId: "01234571", name: "钱七", department: "市场部 / 品牌组", deptId: "d-mkt-brand" },
  { workId: "01234578", name: "宋婉婷", department: "市场部 / 品牌组", deptId: "d-mkt-brand" },
  { workId: "01234582", name: "袁嘉睿", department: "市场部 / 增长组", deptId: "d-mkt-growth" },
  { workId: "01234583", name: "顾茹馨", department: "市场部 / 增长组", deptId: "d-mkt-growth" },
  { workId: "01234572", name: "孙八", department: "数据中心 / 数据工程组", deptId: "d-data-eng" },
  { workId: "01234579", name: "夏文钦", department: "数据中心 / 数据工程组", deptId: "d-data-eng" },
  { workId: "01234574", name: "吴十", department: "数据中心 / 数据分析组", deptId: "d-data-ana" },
  { workId: "01234584", name: "沈欣然", department: "数据中心 / 数据分析组", deptId: "d-data-ana" },
  { workId: "01234585", name: "田睿泽", department: "数据中心 / 数据分析组", deptId: "d-data-ana" },
  { workId: "01234586", name: "叶知秋", department: "产品中心 / 增长产品组", deptId: "d-prod-growth" },
  { workId: "01234587", name: "范雨蒙", department: "产品中心 / 增长产品组", deptId: "d-prod-growth" },
  { workId: "01234588", name: "邓浩然", department: "产品中心 / 平台产品组", deptId: "d-prod-platform" },
];


const MOCK_ORG_TREE: OrgNode[] = [
  {
    id: "c-tech",
    name: "技术中心",
    children: [
      {
        id: "d-ai",
        name: "AI技术平台",
        children: [
          { id: "d-ai-agent", name: "智能体组", members: MOCK_DIRECTORY.filter((e) => e.deptId === "d-ai-agent") },
          { id: "d-ai-platform", name: "平台组", members: MOCK_DIRECTORY.filter((e) => e.deptId === "d-ai-platform") },
          { id: "d-ai-algo", name: "算法组", members: MOCK_DIRECTORY.filter((e) => e.deptId === "d-ai-algo") },
        ],
      },
      {
        id: "d-infra",
        name: "基础架构部",
        children: [
          { id: "d-infra-cloud", name: "云平台组", members: MOCK_DIRECTORY.filter((e) => e.deptId === "d-infra-cloud") },
          { id: "d-infra-net", name: "网络组", members: MOCK_DIRECTORY.filter((e) => e.deptId === "d-infra-net") },
        ],
      },
    ],
  },
  {
    id: "c-data",
    name: "数据中心",
    children: [
      { id: "d-data-eng", name: "数据工程组", members: MOCK_DIRECTORY.filter((e) => e.deptId === "d-data-eng") },
      { id: "d-data-ana", name: "数据分析组", members: MOCK_DIRECTORY.filter((e) => e.deptId === "d-data-ana") },
    ],
  },
  {
    id: "c-mkt",
    name: "市场中心",
    children: [
      { id: "d-mkt-brand", name: "品牌组", members: MOCK_DIRECTORY.filter((e) => e.deptId === "d-mkt-brand") },
      { id: "d-mkt-growth", name: "增长组", members: MOCK_DIRECTORY.filter((e) => e.deptId === "d-mkt-growth") },
    ],
  },
  {
    id: "c-prod",
    name: "产品中心",
    children: [
      { id: "d-prod-growth", name: "增长产品组", members: MOCK_DIRECTORY.filter((e) => e.deptId === "d-prod-growth") },
      { id: "d-prod-platform", name: "平台产品组", members: MOCK_DIRECTORY.filter((e) => e.deptId === "d-prod-platform") },
    ],
  },

];

function collectMembers(node: OrgNode): Employee[] {
  const out: Employee[] = [...(node.members ?? [])];
  node.children?.forEach((c) => out.push(...collectMembers(c)));
  return out;
}
function findEmployee(workId: string) {
  return MOCK_DIRECTORY.find((e) => e.workId === workId);
}

/* ───────── Permissions Panel ───────── */
interface Props {
  agentId: string;
  creatorWorkId: string;
  creatorName: string;
}

export default function AgentPermissionsPanel({ agentId: _agentId, creatorWorkId, creatorName }: Props) {
  const creator: Employee = {
    workId: creatorWorkId,
    name: creatorName,
    department: findEmployee(creatorWorkId)?.department ?? "-",
    deptId: findEmployee(creatorWorkId)?.deptId ?? "",
  };

  // Mock: creator + a handful of preloaded members for demo
  const initialMockIds = ["01234567", "01234568", "01234570", "01234572", "01234578", "01441971"];
  const initialMembers: Employee[] = [
    creator,
    ...MOCK_DIRECTORY.filter((e) => initialMockIds.includes(e.workId) && e.workId !== creatorWorkId),
  ];
  const [members, setMembers] = useState<Employee[]>(initialMembers);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Employee | null>(null);
  const [batchRemoveOpen, setBatchRemoveOpen] = useState(false);


  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) => m.workId.includes(q) || m.name.toLowerCase().includes(q) || m.department.toLowerCase().includes(q),
    );
  }, [members, query]);

  const isCreator = (workId: string) => workId === creatorWorkId;

  const addMembers = (emps: Employee[]) => {
    setMembers((prev) => {
      const map = new Map(prev.map((m) => [m.workId, m]));
      emps.forEach((e) => { if (!map.has(e.workId)) map.set(e.workId, e); });
      return Array.from(map.values());
    });
  };

  const removeSelected = () => {
    const toRemove = Array.from(selected).filter((id) => !isCreator(id));
    if (toRemove.length === 0) return;
    setMembers((prev) => prev.filter((m) => !toRemove.includes(m.workId)));
    setSelected(new Set());
    toast({ title: `已移除 ${toRemove.length} 位成员` });
  };

  const toggleSelect = (workId: string) => {
    if (isCreator(workId)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(workId)) next.delete(workId); else next.add(workId);
      return next;
    });
  };

  const removableCount = filtered.filter((m) => !isCreator(m.workId)).length;
  const allRemovableSelected =
    removableCount > 0 && filtered.every((m) => isCreator(m.workId) || selected.has(m.workId));
  const toggleSelectAll = () => {
    if (allRemovableSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.filter((m) => !isCreator(m.workId)).map((m) => m.workId)));
    }
  };

  return (
    <div className="space-y-3">
      {/* Toolbar: search left, count beside it, add entry right */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索工号 / 姓名 / 组织名称"
            className="h-8 text-xs pl-7"
          />
        </div>
        <div className="text-xs text-muted-foreground whitespace-nowrap">
          共 <span className="text-foreground font-medium">{members.length}</span> 人
        </div>
        <div className="flex-1" />
        {selected.size > 0 && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/5"
            onClick={() => setBatchRemoveOpen(true)}
          >
            <Trash2 className="w-3.5 h-3.5" />
            移除所选（{selected.size}）
          </Button>
        )}
        <Button size="sm" className="h-8 text-xs" onClick={() => setAddOpen(true)}>
          添加成员
        </Button>
      </div>

      {/* List (no outer frame) */}
      <div>
        <div className="flex items-center gap-3 px-2 py-2 border-b border-border text-[11px] text-muted-foreground">
          <Checkbox className="h-3.5 w-3.5 rounded-[3px] border-muted-foreground/40 data-[state=checked]:border-primary"
            checked={allRemovableSelected}
            onCheckedChange={toggleSelectAll}
            disabled={removableCount === 0}
            aria-label="全选"
          />
          <div className="w-28">工号</div>
          <div className="w-28">姓名</div>
          <div className="flex-1">组织名称</div>
          <div className="w-10 text-right">操作</div>
        </div>
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted-foreground">
            仅创建者可访问，添加成员后他们即可使用该智能体
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((m) => {
              const creatorRow = isCreator(m.workId);
              return (
                <li key={m.workId} className="flex items-center gap-3 px-2 py-2.5 text-xs hover:bg-muted/30">
                  <Checkbox className="h-3.5 w-3.5 rounded-[3px] border-muted-foreground/40 data-[state=checked]:border-primary"
                    checked={selected.has(m.workId)}
                    onCheckedChange={() => toggleSelect(m.workId)}
                    disabled={creatorRow}
                    aria-label={`选择 ${m.name}`}
                  />
                  <div className="w-28 font-mono text-muted-foreground">{m.workId}</div>
                  <div className="w-28">{m.name}</div>
                  <div className="flex-1 text-muted-foreground truncate">{m.department}</div>
                  <div className="w-10 flex items-center justify-end">
                    {!creatorRow && (
                      <button
                        aria-label={`移除 ${m.name}`}
                        className="w-6 h-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        onClick={() => setRemoveTarget(m)}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <AddMembersDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        existing={members.map((m) => m.workId)}
        onConfirm={(emps) => {
          addMembers(emps);
          toast({ title: `已添加 ${emps.length} 位成员` });
        }}
      />

      {/* Single row remove confirm */}
      <AlertDialog open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>移除成员</AlertDialogTitle>
            <AlertDialogDescription>
              确定要移除「{removeTarget?.name}（{removeTarget?.workId}）」吗？移除后该成员将无法再访问此智能体。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!removeTarget) return;
                const name = removeTarget.name;
                setMembers((prev) => prev.filter((x) => x.workId !== removeTarget.workId));
                setRemoveTarget(null);
                toast({ title: `已移除 ${name}` });
              }}
            >
              确认移除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch remove confirm */}
      <AlertDialog open={batchRemoveOpen} onOpenChange={setBatchRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>批量移除成员</AlertDialogTitle>
            <AlertDialogDescription>
              确定要移除所选的 {selected.size} 位成员吗？移除后他们将无法再访问此智能体。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { removeSelected(); setBatchRemoveOpen(false); }}
            >
              确认移除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>

  );
}

/* ───────── Unified Add Members Dialog (Tabs) ───────── */
interface AddMembersDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  existing: string[];
  onConfirm: (emps: Employee[]) => void;
}

function AddMembersDialog({ open, onOpenChange, existing, onConfirm }: AddMembersDialogProps) {
  const [tab, setTab] = useState<"org" | "id">("org");

  // Org tree state
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["c-tech", "d-ai"]));
  const [checkedDept, setCheckedDept] = useState<Set<string>>(new Set());
  const [checkedEmp, setCheckedEmp] = useState<Set<string>>(new Set());
  const [orgQ, setOrgQ] = useState("");

  // WorkId state
  const [raw, setRaw] = useState("");
  const [validated, setValidated] = useState<
    { workId: string; ok: boolean; emp?: Employee; reason?: string }[] | null
  >(null);

  const resetAll = () => {
    setTab("org");
    setExpanded(new Set(["c-tech", "d-ai"]));
    setCheckedDept(new Set());
    setCheckedEmp(new Set());
    setOrgQ("");
    setRaw("");
    setValidated(null);
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) resetAll();
    onOpenChange(o);
  };

  /* Org tree helpers */
  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleDept = (node: OrgNode) => {
    const emps = collectMembers(node);
    const isNowChecked = !checkedDept.has(node.id);
    setCheckedDept((prev) => {
      const next = new Set(prev);
      next.has(node.id) ? next.delete(node.id) : next.add(node.id);
      return next;
    });
    setCheckedEmp((prev) => {
      const next = new Set(prev);
      emps.forEach((e) => { isNowChecked ? next.add(e.workId) : next.delete(e.workId); });
      return next;
    });
  };

  const toggleEmp = (workId: string) =>
    setCheckedEmp((prev) => {
      const next = new Set(prev);
      next.has(workId) ? next.delete(workId) : next.add(workId);
      return next;
    });

  const matches = (node: OrgNode): boolean => {
    if (!orgQ.trim()) return true;
    const ql = orgQ.toLowerCase();
    if (node.name.toLowerCase().includes(ql)) return true;
    if (node.members?.some((m) => m.name.toLowerCase().includes(ql) || m.workId.includes(ql))) return true;
    return node.children?.some(matches) ?? false;
  };

  const renderNode = (node: OrgNode, depth = 0) => {
    if (!matches(node)) return null;
    const isOpen = expanded.has(node.id) || !!orgQ.trim();
    const hasChildren = (node.children?.length ?? 0) > 0;
    const members = node.members ?? [];
    return (
      <li key={node.id}>
        <div
          className="flex items-center gap-1.5 py-1 px-1 hover:bg-muted/40 rounded"
          style={{ paddingLeft: depth * 14 + 4 }}
        >
          <button
            className="w-4 h-4 flex items-center justify-center text-muted-foreground shrink-0"
            onClick={() => (hasChildren || members.length > 0) && toggleExpand(node.id)}
          >
            {(hasChildren || members.length > 0) ? (
              isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
            ) : null}
          </button>
          <Checkbox className="h-3.5 w-3.5 rounded-[3px] border-muted-foreground/40 data-[state=checked]:border-primary"
            checked={checkedDept.has(node.id)}
            onCheckedChange={() => toggleDept(node)}
          />
          <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs">{node.name}</span>
          <span className="text-[10px] text-muted-foreground">（{collectMembers(node).length} 人）</span>
        </div>
        {isOpen && (
          <ul>
            {node.children?.map((c) => renderNode(c, depth + 1))}
            {members
              .filter((m) => !orgQ.trim() || m.name.toLowerCase().includes(orgQ.toLowerCase()) || m.workId.includes(orgQ))
              .map((m) => (
                <li
                  key={m.workId}
                  className="flex items-center gap-1.5 py-1 px-1 hover:bg-muted/40 rounded"
                  style={{ paddingLeft: (depth + 1) * 14 + 22 }}
                >
                  <Checkbox className="h-3.5 w-3.5 rounded-[3px] border-muted-foreground/40 data-[state=checked]:border-primary"
                    checked={checkedEmp.has(m.workId)}
                    onCheckedChange={() => toggleEmp(m.workId)}
                  />
                  <span className="text-xs">{m.name}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{m.workId}</span>
                </li>
              ))}
          </ul>
        )}
      </li>
    );
  };

  const totalNewFromOrg = Array.from(checkedEmp).filter((id) => !existing.includes(id)).length;

  /* WorkId helpers */
  const parseIds = () =>
    Array.from(new Set(raw.split(/[\s,，、;；\n]+/).map((s) => s.trim()).filter(Boolean)));

  const handleValidate = () => {
    const ids = parseIds();
    if (ids.length === 0) {
      toast({ title: "请输入工号", variant: "destructive" });
      return;
    }
    const result = ids.map((id) => {
      const emp = findEmployee(id);
      if (!emp) return { workId: id, ok: false, reason: "工号不存在" };
      if (existing.includes(id)) return { workId: id, ok: false, emp, reason: "已在名单中" };
      return { workId: id, ok: true, emp };
    });
    setValidated(result);
  };

  const totalOkIds = validated?.filter((v) => v.ok).length ?? 0;

  const handleConfirm = () => {
    let emps: Employee[] = [];
    if (tab === "org") {
      emps = MOCK_DIRECTORY.filter((e) => checkedEmp.has(e.workId) && !existing.includes(e.workId));
    } else {
      emps = (validated ?? []).filter((v) => v.ok && v.emp).map((v) => v.emp!);
    }
    if (emps.length === 0) {
      toast({ title: "没有可添加的成员", variant: "destructive" });
      return;
    }
    onConfirm(emps);
    resetAll();
    onOpenChange(false);
  };

  const canConfirm = tab === "org" ? totalNewFromOrg > 0 : totalOkIds > 0;
  const confirmCount = tab === "org" ? totalNewFromOrg : totalOkIds;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" />添加成员
          </DialogTitle>
          <DialogDescription className="text-xs">
            选择成员并加入使用者名单，添加后成员即可访问并使用该智能体。
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "org" | "id")}>
          <TabsList className="h-8 bg-muted/40 p-0.5">
            <TabsTrigger value="org" className="h-7 px-3 text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Building2 className="w-3.5 h-3.5" />从组织架构选择
            </TabsTrigger>
            <TabsTrigger value="id" className="h-7 px-3 text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <UserPlus className="w-3.5 h-3.5" />按工号批量添加
            </TabsTrigger>
          </TabsList>

          <TabsContent value="org" className="mt-3 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={orgQ}
                onChange={(e) => setOrgQ(e.target.value)}
                placeholder="搜索组织名称或成员"
                className="h-8 text-xs pl-7"
              />
            </div>
            <div className="border border-border rounded max-h-[380px] overflow-auto p-2">
              <ul>{MOCK_ORG_TREE.map((n) => renderNode(n))}</ul>
            </div>
            <div className="text-[11px] text-muted-foreground">
              已选 {checkedEmp.size} 人（其中 {totalNewFromOrg} 位为新增）
            </div>
          </TabsContent>

          <TabsContent value="id" className="mt-3 space-y-3">
            <Textarea
              value={raw}
              onChange={(e) => { setRaw(e.target.value); setValidated(null); }}
              placeholder={"多个工号用逗号、空格或换行分隔，例如：\n01441970\n01234567, 01234568\n01234569 01234570"}
              className="min-h-[110px] text-xs font-mono"
            />
            <div className="flex justify-end">
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleValidate}>
                校验工号
              </Button>
            </div>
            {validated && (
              <div className="rounded border border-border max-h-52 overflow-auto">
                <ul className="divide-y divide-border text-xs">
                  {validated.map((v) => (
                    <li key={v.workId} className="flex items-center gap-2 px-3 py-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${v.ok ? "bg-green-500" : "bg-destructive"}`} />
                      <span className="font-mono w-24">{v.workId}</span>
                      {v.ok ? (
                        <>
                          <span className="w-20">{v.emp!.name}</span>
                          <span className="text-muted-foreground truncate flex-1">{v.emp!.department}</span>
                          <span className="text-green-600 text-[11px]">可添加</span>
                        </>
                      ) : (
                        <>
                          <span className="w-20 text-muted-foreground">{v.emp?.name ?? "-"}</span>
                          <span className="text-muted-foreground truncate flex-1">{v.emp?.department ?? "-"}</span>
                          <span className="text-destructive text-[11px]">{v.reason}</span>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => handleOpenChange(false)}>取消</Button>
          <Button size="sm" className="h-8 text-xs" disabled={!canConfirm} onClick={handleConfirm}>
            添加{confirmCount > 0 ? `（${confirmCount}）` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

