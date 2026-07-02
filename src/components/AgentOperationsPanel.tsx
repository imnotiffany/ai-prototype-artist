import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Search, Calendar as CalendarIcon, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

type SourceKey = "all" | "fengsheng" | "web" | "api";

const SOURCE_TABS: { key: SourceKey; label: string }[] = [
  { key: "all", label: "全部渠道" },
  { key: "fengsheng", label: "丰声 NEXT" },
  { key: "web", label: "Web" },
  { key: "api", label: "API" },
];

function seeded(i: number, base: number, amp: number, freq = 0.6) {
  const n = Math.sin(i * freq + 1.3) * 10000;
  const r = n - Math.floor(n);
  return Math.max(0, Math.round(base + (r - 0.5) * amp * 2));
}

function buildDaily(from: Date, to: Date) {
  const arr = [];
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  const days = Math.max(1, Math.round((end - start) / 86400_000) + 1);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end - i * 86400_000);
    const label = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const uv = seeded(i, 120, 60, 0.4);
    const calls = uv * seeded(i, 4, 2, 0.7) + seeded(i, 60, 40, 0.9);
    const newUsers = Math.max(0, Math.round(uv * 0.18 + seeded(i, 4, 6, 0.55) - 4));
    const groups = seeded(i, 3, 3, 0.8);
    arr.push({ t: label, calls, uv, newUsers, groups });
  }
  return arr;
}

type UserRow = {
  name: string;
  jobId: string;
  calls: number;
  last: string;
  source: "丰声 NEXT" | "Web" | "API";
};

const MOCK_USERS: UserRow[] = [
  { name: "张伟", jobId: "01441970", calls: 328, last: "2026-07-02 14:32", source: "丰声 NEXT" },
  { name: "李娜", jobId: "01523841", calls: 214, last: "2026-07-02 14:20", source: "Web" },
  { name: "王强", jobId: "01330217", calls: 189, last: "2026-07-02 13:15", source: "API" },
  { name: "刘敏", jobId: "01488102", calls: 176, last: "2026-07-02 11:08", source: "丰声 NEXT" },
  { name: "陈晨", jobId: "01609934", calls: 142, last: "2026-07-02 10:22", source: "Web" },
  { name: "杨帆", jobId: "01554720", calls: 118, last: "2026-07-01 18:04", source: "丰声 NEXT" },
  { name: "赵磊", jobId: "01472085", calls: 96, last: "2026-07-01 09:47", source: "Web" },
  { name: "周瑶", jobId: "01388461", calls: 71, last: "2026-06-30 16:33", source: "API" },
  { name: "孙浩", jobId: "01502233", calls: 68, last: "2026-06-30 11:12", source: "丰声 NEXT" },
  { name: "郑爽", jobId: "01411678", calls: 64, last: "2026-06-29 15:45", source: "Web" },
  { name: "钱枫", jobId: "01655120", calls: 59, last: "2026-06-29 09:20", source: "丰声 NEXT" },
  { name: "冯洋", jobId: "01298744", calls: 52, last: "2026-06-28 17:58", source: "API" },
  { name: "褚青", jobId: "01377281", calls: 47, last: "2026-06-28 10:04", source: "Web" },
  { name: "卫涛", jobId: "01466019", calls: 41, last: "2026-06-27 14:22", source: "丰声 NEXT" },
  { name: "蒋雯", jobId: "01590482", calls: 36, last: "2026-06-27 08:51", source: "Web" },
  { name: "沈鹏", jobId: "01311856", calls: 33, last: "2026-06-26 19:07", source: "API" },
  { name: "韩梅", jobId: "01432107", calls: 28, last: "2026-06-26 10:36", source: "丰声 NEXT" },
  { name: "曹阳", jobId: "01521934", calls: 22, last: "2026-06-25 15:19", source: "Web" },
];

type GroupRow = { name: string; webhook: string; members: number; messages: number };

const MOCK_GROUPS: GroupRow[] = [
  { name: "【项目】领汇智能体接入群", webhook: "cidkbWdSCTNaI3/HBXryaXPxw==", members: 68, messages: 128 },
  { name: "研发效能助手交流", webhook: "cidA2fMlqQ7nzR9/LKpuwbXTma==", members: 42, messages: 76 },
  { name: "BI 数据周报讨论", webhook: "cidHnBpEt4rXs21/UYevkzDLpo==", members: 25, messages: 34 },
  { name: "产品评审 · Q3", webhook: "cidMR3xVdF8wJ56/AbNqPyGCik==", members: 88, messages: 210 },
  { name: "增长实验小组", webhook: "cidZK9tQrY2mL08/CvExOhWNud==", members: 18, messages: 45 },
  { name: "客户成功日报群", webhook: "cidPLQtEwR3xU29/FbNzMkAoRy==", members: 54, messages: 82 },
  { name: "运维告警通知群", webhook: "cidVX4nHmS7kJ08/QwErTyUiOp==", members: 96, messages: 156 },
  { name: "数据治理专项群", webhook: "cidDT8fLkP2yN44/HmXnQaVbCz==", members: 31, messages: 62 },
  { name: "AI 平台答疑群", webhook: "cidAI9pQrS7wM12/KtEuBnRxLo==", members: 120, messages: 245 },
  { name: "前端体验优化群", webhook: "cidFE3xNkT6vB90/GdWcJmPqHy==", members: 46, messages: 58 },
  { name: "供应链协同群", webhook: "cidSC5mZqW8pL71/YbFeKnHtGa==", members: 73, messages: 91 },
  { name: "HR 招聘沟通群", webhook: "cidHR4dRsC1nJ58/PxLoMzVaEu==", members: 22, messages: 27 },
];

function StatCard({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="border border-border rounded-md bg-card px-3 py-2.5">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-lg font-semibold tabular-nums">{value}</span>
        {unit && <span className="text-[11px] text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

const axisProps = {
  tick: { fontSize: 10, fill: "hsl(var(--muted-foreground))" },
  stroke: "hsl(var(--border))",
  tickLine: false,
};

const tooltipStyle = {
  contentStyle: {
    background: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 6,
    fontSize: 11,
  },
  labelStyle: { color: "hsl(var(--muted-foreground))", fontSize: 10 },
};

function formatDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const PAGE_SIZE = 10;

export function AgentOperationsPanel() {
  const today = useMemo(() => new Date(), []);
  const defaultFrom = useMemo(() => new Date(today.getTime() - 13 * 86400_000), [today]);
  const [from, setFrom] = useState<Date>(defaultFrom);
  const [to, setTo] = useState<Date>(today);
  const [source, setSource] = useState<SourceKey>("all");
  const [userQuery, setUserQuery] = useState("");
  const [groupQuery, setGroupQuery] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [groupPage, setGroupPage] = useState(1);

  const showGroups = source === "all" || source === "fengsheng";
  const data = useMemo(() => buildDaily(from, to), [from, to]);

  const totals = useMemo(() => {
    const calls = data.reduce((s, d) => s + d.calls, 0);
    const uv = data.reduce((s, d) => s + d.uv, 0);
    const newUsers = data.reduce((s, d) => s + d.newUsers, 0);
    const groups = data.reduce((s, d) => s + d.groups, 0);
    return { calls, uv, newUsers, groups };
  }, [data]);

  const filteredUsers = MOCK_USERS.filter((u) => {
    if (source === "fengsheng" && u.source !== "丰声 NEXT") return false;
    if (source === "web" && u.source !== "Web") return false;
    if (source === "api" && u.source !== "API") return false;
    if (!userQuery) return true;
    return u.name.includes(userQuery) || u.jobId.includes(userQuery);
  });
  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const pagedUsers = filteredUsers.slice((userPage - 1) * PAGE_SIZE, userPage * PAGE_SIZE);

  const filteredGroups = MOCK_GROUPS
    .filter((g) => (groupQuery ? g.name.includes(groupQuery) || g.webhook.includes(groupQuery) : true))
    .sort((a, b) => b.messages - a.messages);
  const totalGroupPages = Math.max(1, Math.ceil(filteredGroups.length / PAGE_SIZE));
  const pagedGroups = filteredGroups.slice((groupPage - 1) * PAGE_SIZE, groupPage * PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Toolbar — clean, borderless */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Date range */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="inline-flex items-center gap-1.5 h-7 px-2.5 border border-input rounded-md bg-background text-xs text-foreground hover:border-ring/40 transition-colors">
              <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="tabular-nums">{formatDate(from)}</span>
              <span className="text-muted-foreground">—</span>
              <span className="tabular-nums">{formatDate(to)}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={{ from, to }}
              onSelect={(range) => {
                if (range?.from) setFrom(range.from);
                if (range?.to) setTo(range.to);
              }}
              numberOfMonths={2}
              defaultMonth={from}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        {/* Source selector */}
        <Select value={source} onValueChange={(v) => setSource(v as SourceKey)}>
          <SelectTrigger className="h-7 w-[130px] text-xs md:text-xs">
            <SelectValue placeholder="选择渠道" />
          </SelectTrigger>
          <SelectContent>
            {SOURCE_TABS.map((s) => (
              <SelectItem key={s.key} value={s.key} className="text-xs">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <button className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <Download className="w-3.5 h-3.5" />
          导出
        </button>
      </div>

      {/* Stat cards */}
      <div className={cn("grid grid-cols-2 gap-2", showGroups ? "md:grid-cols-4" : "md:grid-cols-3")}>
        <StatCard label="总调用量" value={totals.calls.toLocaleString()} unit="次" />
        <StatCard label="总用户量" value={totals.uv.toLocaleString()} unit="人" />
        <StatCard label="新增用户" value={totals.newUsers.toLocaleString()} unit="人" />
        {showGroups && <StatCard label="被拉入群聊" value={totals.groups.toLocaleString()} unit="个" />}
      </div>

      {/* Combined chart: 访问趋势 + 新增用户 */}
      <div>
        <div className="px-3 h-9 flex items-center gap-2">
          <span className="text-xs font-semibold">访问趋势</span>
        </div>
        <div className="p-2 h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gCalls" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gUv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gNewUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="t" {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 10 }} iconSize={8} />
              <Area type="monotone" dataKey="newUsers" name="新增用户" stroke="#3b82f6" fill="url(#gNewUsers)" strokeWidth={1.5} />
              <Area type="monotone" dataKey="calls" name="总调用量" stroke="hsl(var(--primary))" fill="url(#gCalls)" strokeWidth={1.5} />
              <Area type="monotone" dataKey="uv" name="总用户量" stroke="#10b981" fill="url(#gUv)" strokeWidth={1.5} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Active users — no outer box */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold">活跃用户</span>
          <div className="ml-auto relative">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={userQuery}
              onChange={(e) => {
                setUserQuery(e.target.value);
                setUserPage(1);
              }}
              placeholder="搜索姓名 / 工号"
              className="h-7 w-[200px] text-[11px] pl-6 md:text-[11px]"
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-8 text-[11px]">用户</TableHead>
              <TableHead className="h-8 text-[11px]">工号</TableHead>
              <TableHead className="h-8 text-[11px]">来源</TableHead>
              <TableHead className="h-8 text-[11px] text-right">调用量</TableHead>
              <TableHead className="h-8 text-[11px]">最后访问</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedUsers.map((u) => (
              <TableRow key={u.jobId} className="text-xs">
                <TableCell className="py-2 font-medium">{u.name}</TableCell>
                <TableCell className="py-2 text-muted-foreground tabular-nums">{u.jobId}</TableCell>
                <TableCell className="py-2 text-muted-foreground">{u.source}</TableCell>
                <TableCell className="py-2 text-right tabular-nums">{u.calls}</TableCell>
                <TableCell className="py-2 text-muted-foreground">{u.last}</TableCell>
              </TableRow>
            ))}
            {pagedUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">
                  无匹配用户
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {filteredUsers.length > 0 && (
          <div className="flex items-center justify-end gap-3 mt-2 text-[11px] text-muted-foreground">
            <span>
              共 {filteredUsers.length} 条 · 第 {userPage} / {totalUserPages} 页
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                disabled={userPage <= 1}
                onClick={() => setUserPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                disabled={userPage >= totalUserPages}
                onClick={() => setUserPage((p) => Math.min(totalUserPages, p + 1))}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Group chats — 仅丰声 NEXT */}
      {showGroups && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold">被拉入的群聊</span>
            <div className="ml-auto relative">
              <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={groupQuery}
                onChange={(e) => {
                  setGroupQuery(e.target.value);
                  setGroupPage(1);
                }}
                placeholder="搜索群名 / Webhook"
                className="h-7 w-[220px] text-[11px] pl-6 md:text-[11px]"
              />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-8 text-[11px]">群名称</TableHead>
                <TableHead className="h-8 text-[11px]">群 Webhook</TableHead>
                <TableHead className="h-8 text-[11px] text-right">群人数</TableHead>
                <TableHead className="h-8 text-[11px] text-right">消息数</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedGroups.map((g) => (
                <TableRow key={g.webhook} className="text-xs">
                  <TableCell className="py-2 font-medium">{g.name}</TableCell>
                  <TableCell className="py-2 text-muted-foreground font-mono text-[11px] truncate max-w-[320px]">
                    {g.webhook}
                  </TableCell>
                  <TableCell className="py-2 text-right tabular-nums">{g.members}</TableCell>
                  <TableCell className="py-2 text-right tabular-nums">{g.messages}</TableCell>
                </TableRow>
              ))}
              {pagedGroups.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-6">
                    无匹配群聊
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {filteredGroups.length > 0 && (
            <div className="flex items-center justify-end gap-3 mt-2 text-[11px] text-muted-foreground">
              <span>
                共 {filteredGroups.length} 条 · 第 {groupPage} / {totalGroupPages} 页
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={groupPage <= 1}
                  onClick={() => setGroupPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={groupPage >= totalGroupPages}
                  onClick={() => setGroupPage((p) => Math.min(totalGroupPages, p + 1))}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AgentOperationsPanel;
