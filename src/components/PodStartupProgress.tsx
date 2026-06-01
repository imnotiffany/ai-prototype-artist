import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const POD_STEPS = [
  { key: "create", label: "创建任务", sub: "准备调试版本" },
  { key: "deploy", label: "部署环境", sub: "启动运行资源" },
  { key: "ready", label: "等待就绪", sub: "检查服务健康" },
  { key: "load", label: "加载智能体", sub: "同步最新配置" },
  { key: "done", label: "启动完成", sub: "可开始调试" },
] as const;

interface Props {
  /** 当前正在进行的步骤 index；当 >= POD_STEPS.length 表示全部完成 */
  stepIdx: number;
  title?: string;
  description?: string;
}

export const PodStartupProgress = ({
  stepIdx,
  title = "正在启动调试环境",
  description = "首次启动通常需要 30-60 秒，请稍候…",
}: Props) => {
  const allDone = stepIdx >= POD_STEPS.length;
  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-colors",
        allDone
          ? "border-green-500/30 bg-green-500/5"
          : "border-primary/30 bg-primary/5",
      )}
    >
      <div className="flex items-start gap-3 mb-4">
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
            allDone ? "bg-green-500/15 text-green-600" : "bg-primary/15 text-primary",
          )}
        >
          {allDone ? <CheckCircle2 className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">
            {allDone ? "调试环境已就绪" : title}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {allDone ? "正在进入调试对话…" : description}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {POD_STEPS.map((s, i) => {
          const done = i < stepIdx || allDone;
          const active = !allDone && i === stepIdx;
          return (
            <div
              key={s.key}
              className={cn(
                "rounded-md border px-2.5 py-2 transition-colors",
                done && "border-green-500/40 bg-green-500/5",
                active && "border-primary/50 bg-primary/5",
                !done && !active && "border-border bg-card",
              )}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span
                  className={cn(
                    "w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0",
                    done && "bg-green-500/15 text-green-600",
                    active && "bg-primary/15 text-primary",
                    !done && !active && "bg-muted text-muted-foreground",
                  )}
                >
                  {done ? <CheckCircle2 className="w-2.5 h-2.5" /> : active ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : i + 1}
                </span>
                <span
                  className={cn(
                    "text-[11px] font-medium truncate",
                    done && "text-green-700 dark:text-green-400",
                    active && "text-foreground",
                    !done && !active && "text-muted-foreground",
                  )}
                >
                  {s.label}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground/80 pl-5 truncate">{s.sub}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
