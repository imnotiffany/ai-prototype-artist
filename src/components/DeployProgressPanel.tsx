import { useEffect, useState } from "react";
import { Loader2, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type DeployMode = "save" | "publish";

interface Step {
  title: string;
  desc: string;
}

const STEPS_PUBLISH: Step[] = [
  { title: "创建任务", desc: "准备发布版本" },
  { title: "部署环境", desc: "启动运行资源" },
  { title: "等待就绪", desc: "检查服务健康" },
  { title: "加载智能体", desc: "同步最新配置" },
  { title: "发布完成", desc: "已可正式使用" },
];

const STEPS_SAVE: Step[] = [
  { title: "校验配置", desc: "检查必填字段" },
  { title: "保存快照", desc: "写入草稿版本" },
  { title: "同步凭证", desc: "更新 MCP / 环境变量" },
  { title: "刷新缓存", desc: "重载运行时" },
  { title: "保存完成", desc: "配置已生效" },
];

interface Props {
  mode: DeployMode;
  onDone: () => void;
  /** 单步耗时（ms），默认 700 */
  stepMs?: number;
}

export const DeployProgressPanel = ({ mode, onDone, stepMs = 700 }: Props) => {
  const steps = mode === "publish" ? STEPS_PUBLISH : STEPS_SAVE;
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (current >= steps.length) {
      const t = window.setTimeout(onDone, 500);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setCurrent((c) => c + 1), stepMs);
    return () => window.clearTimeout(t);
  }, [current, steps.length, stepMs, onDone]);

  const title = mode === "publish" ? "正在创建发布任务" : "正在保存配置";
  const subtitle =
    mode === "publish"
      ? "发布通常需要 1-5 分钟，你可以停留在当前页等待。"
      : "保存通常在数秒内完成，请稍候。";

  return (
    <div className="mb-4 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background p-4 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">beta</Badge>
            <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal border-primary/40 text-primary bg-primary/5">
              {current >= steps.length ? "已完成" : "准备中"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-5 gap-2">
        {steps.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <div
              key={i}
              className={cn(
                "rounded-lg border px-3 py-2.5 transition-colors",
                done && "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20",
                active && "border-primary bg-primary/5",
                !done && !active && "border-border bg-muted/30",
              )}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className={cn(
                    "w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0",
                    done && "bg-emerald-500 text-white",
                    active && "bg-primary/15 text-primary",
                    !done && !active && "bg-muted text-muted-foreground",
                  )}
                >
                  {done ? <Check className="w-2.5 h-2.5" /> : active ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : i + 1}
                </span>
                <span
                  className={cn(
                    "text-xs font-medium truncate",
                    active ? "text-foreground" : done ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground",
                  )}
                >
                  {s.title}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground pl-5.5 truncate">{s.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
