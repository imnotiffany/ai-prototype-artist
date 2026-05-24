import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, ChevronUp, ChevronDown, Copy, Download, Maximize2 } from "lucide-react";

/* deterministic color for instance ids */
const INSTANCE_COLORS = [
  "bg-orange-500/80 text-white",
  "bg-sky-500/80 text-white",
  "bg-emerald-500/80 text-white",
  "bg-violet-500/80 text-white",
  "bg-pink-500/80 text-white",
];
const INSTANCES = [
  "c-6a12ab97-15f8e4fe-f13a07de20d0",
  "c-7b34cd21-29a1b07c-e44b18fa31e1",
  "c-9d56ef43-3bc2d18d-a55c29ab42f2",
];

interface LogLine {
  instance: string;
  ts: string;
  level?: "WARNING" | "INFO" | "ERROR";
  source?: string;
  text: string;
}

function pad(n: number) { return String(n).padStart(2, "0"); }
function fmtInputLocal(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fmtTs(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const SAMPLE_LINES: Omit<LogLine, "instance" | "ts">[] = [
  { level: "WARNING", source: "/code/python/agentrun/__init__.py:4", text: "当前您正在使用 AgentRun Python SDK 版本 0.0.36。早期版本通常包含许多新功能，这些功能可能引入不兼容的变更" },
  { text: "You are currently using AgentRun Python SDK version 0.0.36. Early versions often include breaking changes." },
  { text: "  pip install 'agentrun-sdk==0.0.36'" },
  { text: "" },
  { text: "增加 DISABLE_BREAKING_CHANGES_WARNING=1 到您的环境变量以关闭此警告。" },
  { text: "Add DISABLE_BREAKING_CHANGES_WARNING=1 to your environment variables to disable this warning." },
  { text: "" },
  { text: "Releases: https://github.com/Serverless-Devs/agentrun-sdk-python/releases" },
  { source: "/code/python/oss2/api.py:698", text: 'Sys: """生成签名 URL。' },
  { text: "OpenBLAS WARNING - could not determine the L2 cache size on this system" },
  { source: "/code/prompts/expert.py:1", text: "SyntaxWarning: invalid escape sequence" },
  { text: "  PROMPT = '''" },
  { text: "" },
  { level: "WARNING", source: "/code/python/agentrun/integration/utils.py", text: "failed to register AgentScope adapters, due to No module named 'agentscope'" },
  { text: "FC Invoke Start RequestId: 1-6a12ab97-15d41fce-f24377a28672" },
  { text: "FC Invoke End RequestId: 1-6a12ab97-15d41fce-f24377a28672" },
  { text: "[INFO] handler entered, building runtime context..." },
  { text: "[INFO] tools loaded: web_search, code_interpreter, file_read" },
  { text: "[INFO] streaming response started, model=claude-sonnet-4-6" },
  { text: "[INFO] streaming response finished in 6510ms, tokens=1552" },
];

function buildLines(base: Date, count: number): LogLine[] {
  const out: LogLine[] = [];
  for (let i = 0; i < count; i++) {
    const t = new Date(base.getTime() + i * 1500);
    const tmpl = SAMPLE_LINES[i % SAMPLE_LINES.length];
    out.push({
      instance: INSTANCES[i % INSTANCES.length],
      ts: fmtTs(t),
      ...tmpl,
    });
  }
  return out;
}

function instanceColor(id: string) {
  const idx = INSTANCES.indexOf(id);
  return INSTANCE_COLORS[(idx >= 0 ? idx : 0) % INSTANCE_COLORS.length];
}

function levelClass(l?: string) {
  if (l === "WARNING") return "text-amber-300";
  if (l === "ERROR") return "text-red-400";
  if (l === "INFO") return "text-sky-300";
  return "";
}

export function AgentLogsPanel() {
  const [now, setNow] = useState(() => new Date());
  const [start, setStart] = useState(() => fmtInputLocal(new Date(Date.now() - 60 * 60_000)));
  const [end, setEnd] = useState(() => fmtInputLocal(new Date()));
  const [query, setQuery] = useState("");
  const [instance, setInstance] = useState<string>("all");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const all = useMemo(() => buildLines(new Date(start), 60), [start, now]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((l) => {
      if (instance !== "all" && l.instance !== instance) return false;
      if (!q) return true;
      return (
        l.text.toLowerCase().includes(q) ||
        l.instance.toLowerCase().includes(q) ||
        (l.source || "").toLowerCase().includes(q)
      );
    });
  }, [all, query, instance]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => setNow(new Date()), 5000);
    return () => clearInterval(id);
  }, [autoRefresh]);

  useEffect(() => {
    if (autoRefresh && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filtered, autoRefresh]);

  const copyAll = () => {
    const text = filtered
      .map((l) => `${l.instance} ${l.ts} ${l.level ? l.level + " " : ""}${l.source ? l.source + ": " : ""}${l.text}`)
      .join("\n");
    navigator.clipboard?.writeText(text);
  };
  const downloadAll = () => {
    const text = filtered
      .map((l) => `${l.instance} ${l.ts} ${l.level ? l.level + " " : ""}${l.source ? l.source + ": " : ""}${l.text}`)
      .join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `agent-logs-${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const containerClass = fullscreen
    ? "fixed inset-0 z-50 bg-background p-3 flex flex-col gap-3"
    : "space-y-3";

  return (
    <div className={containerClass}>
      {/* filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="text-muted-foreground">时间范围</span>
          <Input
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="h-7 w-[176px] text-[11px] px-2 pr-1"
          />
          <span className="text-muted-foreground">~</span>
          <Input
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="h-7 w-[176px] text-[11px] px-2 pr-1"
          />
        </div>

        <div className="relative">
          <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索关键字"
            className="h-7 pl-7 text-[11px] w-[200px]"
          />
        </div>

        <Select value={instance} onValueChange={setInstance}>
          <SelectTrigger className="h-7 w-[180px] text-[11px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">全部实例</SelectItem>
            {INSTANCES.map((i) => (
              <SelectItem key={i} value={i} className="text-xs font-mono">
                {i.slice(0, 18)}…
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5">
          <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
          <span className="text-[11px] text-muted-foreground">自动刷新</span>
        </div>

        <div className="ml-auto flex items-center gap-0.5">
          <Button
            size="icon" variant="ghost" className="h-7 w-7"
            onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
            title="回到顶部"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="icon" variant="ghost" className="h-7 w-7"
            onClick={() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })}
            title="跳到底部"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={copyAll} title="复制">
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={downloadAll} title="下载">
            <Download className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="icon" variant="ghost" className="h-7 w-7"
            onClick={() => setFullscreen((v) => !v)}
            title={fullscreen ? "退出全屏" : "全屏"}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* terminal */}
      <div
        ref={scrollRef}
        className={`bg-zinc-950 rounded-lg border border-border overflow-auto font-mono text-[12px] leading-relaxed text-zinc-100 ${
          fullscreen ? "flex-1 min-h-0" : "h-[640px]"
        }`}
      >
        <div className="p-3 space-y-0.5">
          {filtered.length === 0 ? (
            <div className="text-zinc-500 text-xs text-center py-12">无匹配的日志</div>
          ) : (
            filtered.map((l, i) => (
              <div key={i} className="flex flex-wrap gap-x-2 items-baseline">
                <span className={`inline-block px-1.5 rounded text-[11px] font-medium ${instanceColor(l.instance)}`}>
                  {l.instance}
                </span>
                <span className="text-zinc-400">{l.ts}</span>
                {l.level && <span className={`font-semibold ${levelClass(l.level)}`}>{l.level}</span>}
                {l.source && <span className="text-zinc-400 italic">{l.source}</span>}
                <span className="whitespace-pre-wrap break-words">{l.text}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
