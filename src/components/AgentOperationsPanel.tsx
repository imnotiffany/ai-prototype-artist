import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, Users, UserPlus, MessagesSquare, TrendingUp, Search } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

type RangeKey = "7d" | "14d" | "30d" | "90d";
type SourceKey = "all" | "fengsheng" | "web" | "api";

const RANGE_OPTIONS: { key: RangeKey; label: string; days: number }[] = [
  { key: "7d", label: "近 7 天", days: 7 },
  { key: "14d", label: "近 14 天", days: 14 },
  { key: "30d", label: "近 30 天", days: 30 },
  { key: "90d", label: "近 90 天", days: 90 },
];

function seeded(i: number, base: number, amp: number, freq = 0.6) {
  const n = Math.sin(i * freq + 1.3) * 10000;
  const r = n - Math.floor(n);
  return Math.max(0, Math.round(base + (r - 0.5) * amp * 2));
}

function buildDaily(days: number) {
  const arr = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400_000);
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
  { name: "张伟", jobId: "01441970", calls: 328, last: "2 分钟前", source: "丰声 NEXT" },
  { name: "李娜", jobId: "01523841", calls: 214, last: "12 分钟前", source: "Web" },
  { name: "王强", jobId: "01330217", calls: 189, last: "1 小时前", source: "API" },
  { name: "刘敏", jobId: "01488102", calls: 176, last: "3 小时前", source: "丰声 NEXT" },
  { name: "陈晨", jobId: "01609934", calls: 142, last: "今天 10:22", source: "Web" },
  { name: "杨帆", jobId: "01554720", calls: 118, last: "昨天 18:04", source: "丰声 NEXT" },
  { name: "赵磊", jobId: "01472085", calls: 96, last: "昨天 09:47", source: "Web" },
  { name: "周瑶", jobId: "01388461", calls: 71, last: "2 天前", source: "API" },
];

type GroupRow = {
  name: string;
  webhook: string;
  messages: number;
};

const MOCK_GROUPS: GroupRow[] = [
  { name: "【项目】领汇智能体接入群", webhook: "cidkbWdSCTNaI3/HBXryaXPxw==", messages: 128 },
  { name: "研发效能助手交流", webhook: "cidA2fMlqQ7nzR9/LKpuwbXTma==", messages: 76 },
  { name: "BI 数据周报讨论", webhook: "cidHnBpEt4rXs21/UYevkzDLpo==", messages: 34 },
  { name: "产品评审 · Q3", webhook: "cidMR3xVdF8wJ56/AbNqPyGCik==", messages: 210 },
  { name: "增长实验小组", webhook: "cidZK9tQrY2mL08/CvExOhWNud==", messages: 45 },
];

function StatCard({
  icon,
  label,
  value,
  unit,
  delta,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  delta?: number;
}) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div className="border border-border rounded-lg bg-card px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-lg font-semibold tabular-nums">{value}</span>
        {unit && <span className="text-[11px] text-muted-foreground">{unit}</span>}
        {typeof delta === "number" && (
          <span className={`ml-auto text-[11px] tabular-nums ${positive ? "text-emerald-600" : "text-rose-600"}`}>
            {positive ? "+" : ""}
            {delta}%
          </span>
        )}
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-lg bg-card">
      <div className="px-3 h-9 border-b border-border flex items-center gap-2">
        <span className="text-xs font-semibold">{title}</span>
        {subtitle && <span className="text-[11px] text-muted-foreground">{subtitle}</span>}
      </div>
      <div className="p-2 h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          {children as any}
        </ResponsiveContainer>
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

export function AgentOperationsPanel() {
  const [rangeKey, setRangeKey] = useState<RangeKey>("14d");
  const [source, setSource] = useState<SourceKey>("all");
  const [userQuery, setUserQuery] = useState("");

  const days = RANGE_OPTIONS.find((r) => r.key === rangeKey)!.days;
  const data = useMemo(() => buildDaily(days), [days]);

  // 只有「丰声 NEXT」渠道才有群聊数据
  const showGroups = source === "all" || source === "fengsheng";

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

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex items-center gap-2 text-[11px] flex-wrap">
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">时间范围</span>
          <Select value={rangeKey} onValueChange={(v) => setRangeKey(v as RangeKey)}>
            <SelectTrigger className="h-7 w-[92px] text-[11px] px-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((r) => (
                <SelectItem key={r.key} value={r.key} className="text-xs">
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">来源</span>
          <Select value={source} onValueChange={(v) => setSource(v as SourceKey)}>
            <SelectTrigger className="h-7 w-[110px] text-[11px] px-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">全部渠道</SelectItem>
              <SelectItem value="fengsheng" className="text-xs">丰声 NEXT</SelectItem>
              <SelectItem value="web" className="text-xs">Web</SelectItem>
              <SelectItem value="api" className="text-xs">API</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1 ml-auto">
          <TrendingUp className="w-3 h-3" />
          导出数据
        </Button>
      </div>

      {/* Stat cards */}
      <div className={`grid grid-cols-2 gap-2 ${showGroups ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
        <StatCard icon={<Eye className="w-3.5 h-3.5" />} label="总调用量" value={totals.calls.toLocaleString()} unit="次" delta={12} />
        <StatCard icon={<Users className="w-3.5 h-3.5" />} label="总用户量" value={totals.uv.toLocaleString()} unit="人" delta={8} />
        <StatCard icon={<UserPlus className="w-3.5 h-3.5" />} label="新增用户" value={totals.newUsers.toLocaleString()} unit="人" delta={-3} />
        {showGroups && (
          <StatCard icon={<MessagesSquare className="w-3.5 h-3.5" />} label="被拉入群聊" value={totals.groups.toLocaleString()} unit="个" delta={18} />
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ChartCard title="访问趋势" subtitle="总调用量 / 总用户量">
          <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gCalls" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gUv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="t" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip {...tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 10 }} iconSize={8} />
            <Area type="monotone" dataKey="calls" name="总调用量" stroke="hsl(var(--primary))" fill="url(#gCalls)" strokeWidth={1.5} />
            <Area type="monotone" dataKey="uv" name="总用户量" stroke="#10b981" fill="url(#gUv)" strokeWidth={1.5} />
          </AreaChart>
        </ChartCard>

        <ChartCard title="新增用户" subtitle="每日新增">
          <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="t" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="newUsers" name="新增用户" fill="#3b82f6" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ChartCard>

        {showGroups && (
          <ChartCard title="被拉入群聊" subtitle="每日新增群数 · 仅丰声 NEXT">
            <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="t" {...axisProps} />
              <YAxis allowDecimals={false} {...axisProps} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="groups" name="群聊" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ChartCard>
        )}
      </div>

      {/* Top users */}
      <div className="border border-border rounded-lg bg-card">
        <div className="px-3 h-9 border-b border-border flex items-center gap-2">
          <span className="text-xs font-semibold">活跃用户</span>
          <span className="text-[11px] text-muted-foreground">按调用量排序</span>
          <div className="ml-auto relative">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="搜索姓名 / 工号"
              className="h-6 w-[180px] text-[11px] pl-6 md:text-[11px]"
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
            {filteredUsers.map((u) => (
              <TableRow key={u.jobId} className="text-xs">
                <TableCell className="py-2 font-medium">{u.name}</TableCell>
                <TableCell className="py-2 text-muted-foreground tabular-nums">{u.jobId}</TableCell>
                <TableCell className="py-2 text-muted-foreground">{u.source}</TableCell>
                <TableCell className="py-2 text-right tabular-nums">{u.calls}</TableCell>
                <TableCell className="py-2 text-muted-foreground">{u.last}</TableCell>
              </TableRow>
            ))}
            {filteredUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">
                  无匹配用户
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Group chats — 仅丰声 NEXT */}
      {showGroups && (
        <div className="border border-border rounded-lg bg-card">
          <div className="px-3 h-9 border-b border-border flex items-center gap-2">
            <span className="text-xs font-semibold">被拉入的群聊</span>
            <span className="text-[11px] text-muted-foreground">仅丰声 NEXT · 按消息数倒序</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-8 text-[11px]">群名称</TableHead>
                <TableHead className="h-8 text-[11px]">群 Webhook</TableHead>
                <TableHead className="h-8 text-[11px] text-right">消息数</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...MOCK_GROUPS].sort((a, b) => b.messages - a.messages).map((g) => (
                <TableRow key={g.webhook} className="text-xs">
                  <TableCell className="py-2 font-medium">{g.name}</TableCell>
                  <TableCell className="py-2 text-muted-foreground font-mono text-[11px] truncate max-w-[280px]">{g.webhook}</TableCell>
                  <TableCell className="py-2 text-right tabular-nums">{g.messages}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export default AgentOperationsPanel;
