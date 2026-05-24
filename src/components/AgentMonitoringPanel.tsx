import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { RefreshCw, ExternalLink, Activity, Clock, AlertTriangle, Cpu, MemoryStick } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
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

/* ───────── Time range presets ───────── */
type RangeKey = "30m" | "1h" | "3h" | "6h" | "12h" | "1d" | "3d" | "7d" | "custom";
const RANGE_PRESETS: { key: RangeKey; label: string; minutes: number }[] = [
  { key: "30m", label: "半小时", minutes: 30 },
  { key: "1h", label: "1小时", minutes: 60 },
  { key: "3h", label: "3小时", minutes: 180 },
  { key: "6h", label: "6小时", minutes: 360 },
  { key: "12h", label: "12小时", minutes: 720 },
  { key: "1d", label: "1天", minutes: 1440 },
  { key: "3d", label: "3天", minutes: 4320 },
  { key: "7d", label: "7天", minutes: 10080 },
];

type GranKey = "1m" | "5m" | "15m" | "30m" | "1h" | "1d";
const GRAN_OPTIONS: { key: GranKey; label: string; minutes: number }[] = [
  { key: "1m", label: "1分钟", minutes: 1 },
  { key: "5m", label: "5分钟", minutes: 5 },
  { key: "15m", label: "15分钟", minutes: 15 },
  { key: "30m", label: "30分钟", minutes: 30 },
  { key: "1h", label: "1小时", minutes: 60 },
  { key: "1d", label: "1天", minutes: 1440 },
];

const fmt = (d: Date) =>
  `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

const fmtInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/* deterministic pseudo-random based on index */
function seeded(i: number, base: number, amp: number, freq = 0.6) {
  const n = Math.sin(i * freq) * 10000;
  const r = n - Math.floor(n);
  return Math.max(0, base + (r - 0.5) * amp * 2);
}

interface Point {
  t: string;
  calls: number;
  qpm: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  avg: number;
  max: number;
  cpu: number;
  mem: number;
  sent: number;
  recv: number;
  errRate: number;
}

function buildSeries(start: Date, end: Date, granMin: number): Point[] {
  const points: Point[] = [];
  const stepMs = granMin * 60_000;
  const total = Math.max(1, Math.floor((end.getTime() - start.getTime()) / stepMs));
  const cap = Math.min(total, 200);
  const actualStep = (end.getTime() - start.getTime()) / cap;
  for (let i = 0; i < cap; i++) {
    const t = new Date(start.getTime() + i * actualStep);
    const callsPerMin = seeded(i, 40, 25);
    const minutesInBucket = actualStep / 60_000;
    const calls = Math.round(callsPerMin * minutesInBucket);
    const avg = seeded(i, 320, 120, 0.4);
    points.push({
      t: fmt(t),
      calls,
      qpm: Math.round(callsPerMin),
      avg: Math.round(avg),
      p50: Math.round(avg * 0.7),
      p90: Math.round(avg * 1.3),
      p95: Math.round(avg * 1.55),
      p99: Math.round(avg * 1.95),
      max: Math.round(avg * 2.4 + seeded(i, 100, 80, 1.1)),
      cpu: +seeded(i, 38, 18, 0.5).toFixed(1),
      mem: +seeded(i, 55, 12, 0.35).toFixed(1),
      sent: +seeded(i, 1.6, 0.9, 0.7).toFixed(2),
      recv: +seeded(i, 2.4, 1.2, 0.45).toFixed(2),
      errRate: +seeded(i, 1.2, 1.0, 0.55).toFixed(2),
    });
  }
  return points;
}

/* ───────── Small UI helpers ───────── */
function StatCard({
  icon,
  label,
  value,
  unit,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  tone?: "default" | "warning";
}) {
  return (
    <div className="border border-border rounded-lg bg-card px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className={tone === "warning" ? "text-amber-500" : "text-primary"}>{icon}</span>
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-lg font-semibold tabular-nums">{value}</span>
        {unit && <span className="text-[11px] text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
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

/* ───────── Main ───────── */
export function AgentMonitoringPanel({ langfuseUrl = "https://cloud.langfuse.com" }: { langfuseUrl?: string }) {
  const [rangeKey, setRangeKey] = useState<RangeKey>("1h");
  const [granKey, setGranKey] = useState<GranKey>("1m");
  const [now, setNow] = useState(() => new Date());

  const [customStart, setCustomStart] = useState<string>(() => fmtInput(new Date(Date.now() - 60 * 60_000)));
  const [customEnd, setCustomEnd] = useState<string>(() => fmtInput(new Date()));

  const { start, end } = useMemo(() => {
    if (rangeKey === "custom") {
      return { start: new Date(customStart), end: new Date(customEnd) };
    }
    const preset = RANGE_PRESETS.find((p) => p.key === rangeKey)!;
    return { start: new Date(now.getTime() - preset.minutes * 60_000), end: now };
  }, [rangeKey, customStart, customEnd, now]);

  const granMin = GRAN_OPTIONS.find((g) => g.key === granKey)!.minutes;
  const data = useMemo(() => buildSeries(start, end, granMin), [start, end, granMin]);

  const totals = useMemo(() => {
    const totalCalls = data.reduce((s, p) => s + p.calls, 0);
    const avgResp = data.length ? Math.round(data.reduce((s, p) => s + p.avg, 0) / data.length) : 0;
    const errRate = +(seeded(data.length, 1.2, 0.6) ).toFixed(2);
    const avgCpu = data.length ? +(data.reduce((s, p) => s + p.cpu, 0) / data.length).toFixed(1) : 0;
    const avgMem = data.length ? +(data.reduce((s, p) => s + p.mem, 0) / data.length).toFixed(1) : 0;
    return { totalCalls, avgResp, errRate, avgCpu, avgMem };
  }, [data]);

  const rangeLabel =
    rangeKey === "custom"
      ? `${fmt(start)} ~ ${fmt(end)}`
      : `${fmt(start)} ~ ${fmt(end)}`;

  return (
    <div className="space-y-3">
      {/* ───── Filter bar ───── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-x-3 gap-y-2 flex-wrap min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground shrink-0">时间范围</span>
            <Select value={rangeKey} onValueChange={(v) => setRangeKey(v as RangeKey)}>
              <SelectTrigger className="h-8 w-[96px] text-xs font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGE_PRESETS.map((p) => (
                  <SelectItem key={p.key} value={p.key} className="text-xs">
                    {p.label}
                  </SelectItem>
                ))}
                <SelectItem value="custom" className="text-xs">自定义</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5 min-w-0">
            <Input
              type="datetime-local"
              value={rangeKey === "custom" ? customStart : fmtInput(start)}
              onChange={(e) => {
                setCustomStart(e.target.value);
                if (rangeKey !== "custom") setCustomEnd(fmtInput(end));
                setRangeKey("custom");
              }}
              className="h-8 w-[190px] text-xs pr-2"
            />
            <span className="text-xs text-muted-foreground">~</span>
            <Input
              type="datetime-local"
              value={rangeKey === "custom" ? customEnd : fmtInput(end)}
              onChange={(e) => {
                setCustomEnd(e.target.value);
                if (rangeKey !== "custom") setCustomStart(fmtInput(start));
                setRangeKey("custom");
              }}
              className="h-8 w-[190px] text-xs pr-2"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground shrink-0">粒度</span>
            <Select value={granKey} onValueChange={(v) => setGranKey(v as GranKey)}>
              <SelectTrigger className="h-8 w-[84px] text-xs font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GRAN_OPTIONS.map((g) => (
                  <SelectItem key={g.key} value={g.key} className="text-xs">
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground"
            onClick={() => setNow(new Date())}
            title="刷新"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>

        <Button
          asChild
          size="sm"
          variant="secondary"
          className="h-8 text-xs gap-1.5 shrink-0"
        >
          <a href={langfuseUrl} target="_blank" rel="noreferrer">
            Langfuse 看板
            <ExternalLink className="w-3 h-3" />
          </a>
        </Button>
      </div>

      {/* ───── Stat cards ───── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <StatCard icon={<Activity className="w-3.5 h-3.5" />} label="总调用量" value={totals.totalCalls.toLocaleString()} unit="次" />
        <StatCard icon={<Clock className="w-3.5 h-3.5" />} label="平均响应时间" value={String(totals.avgResp)} unit="ms" />
        <StatCard icon={<AlertTriangle className="w-3.5 h-3.5" />} label="错误率" value={String(totals.errRate)} unit="%" tone="warning" />
        <StatCard icon={<Cpu className="w-3.5 h-3.5" />} label="平均 CPU 使用率" value={String(totals.avgCpu)} unit="%" />
        <StatCard icon={<MemoryStick className="w-3.5 h-3.5" />} label="平均内存使用率" value={String(totals.avgMem)} unit="%" />
      </div>

      {/* ───── Charts ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ChartCard title="调用趋势" subtitle="（次）">
          <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gCalls" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="t" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip {...tooltipStyle} />
            <Area type="monotone" dataKey="calls" stroke="hsl(var(--primary))" fill="url(#gCalls)" strokeWidth={1.5} />
          </AreaChart>
        </ChartCard>

        <ChartCard title="每分钟请求数">
          <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="t" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="qpm" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="响应时间" subtitle="（ms）">
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="t" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip {...tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 10 }} iconSize={8} />
            <Line type="monotone" dataKey="p50" stroke="#10b981" dot={false} strokeWidth={1.2} />
            <Line type="monotone" dataKey="p90" stroke="#3b82f6" dot={false} strokeWidth={1.2} />
            <Line type="monotone" dataKey="p95" stroke="#8b5cf6" dot={false} strokeWidth={1.2} />
            <Line type="monotone" dataKey="p99" stroke="#ef4444" dot={false} strokeWidth={1.2} />
            <Line type="monotone" dataKey="avg" stroke="hsl(var(--primary))" dot={false} strokeWidth={1.5} />
            <Line type="monotone" dataKey="max" stroke="#f59e0b" dot={false} strokeWidth={1.2} strokeDasharray="3 3" />
          </LineChart>
        </ChartCard>

        <ChartCard title="CPU 使用率" subtitle="（%）">
          <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gCpu" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="t" {...axisProps} />
            <YAxis domain={[0, 100]} {...axisProps} />
            <Tooltip {...tooltipStyle} />
            <Area type="monotone" dataKey="cpu" stroke="#3b82f6" fill="url(#gCpu)" strokeWidth={1.5} />
          </AreaChart>
        </ChartCard>

        <ChartCard title="内存使用率" subtitle="（%）">
          <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gMem" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="t" {...axisProps} />
            <YAxis domain={[0, 100]} {...axisProps} />
            <Tooltip {...tooltipStyle} />
            <Area type="monotone" dataKey="mem" stroke="#8b5cf6" fill="url(#gMem)" strokeWidth={1.5} />
          </AreaChart>
        </ChartCard>

        <ChartCard title="网络流量" subtitle="（MB/s）">
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="t" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip {...tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 10 }} iconSize={8} />
            <Line type="monotone" dataKey="sent" name="发送" stroke="#10b981" dot={false} strokeWidth={1.5} />
            <Line type="monotone" dataKey="recv" name="接收" stroke="#3b82f6" dot={false} strokeWidth={1.5} />
          </LineChart>
        </ChartCard>
      </div>
    </div>
  );
}
