import { BarChart3, TrendingUp, Coins, Users, Zap, Server, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const stats = [
  { label: "今日调用", value: "12,486", trend: "+18%", icon: TrendingUp, color: "text-primary" },
  { label: "Token 消耗", value: "2.4M", trend: "+12%", icon: Coins, color: "text-orange-500" },
  { label: "活跃用户", value: "326", trend: "+8%", icon: Users, color: "text-blue-500" },
  { label: "运行中容器", value: "47", trend: "稳定", icon: Server, color: "text-green-500" },
];

const dailyData = [
  { d: "04-22", calls: 8200 }, { d: "04-23", calls: 9100 }, { d: "04-24", calls: 7800 },
  { d: "04-25", calls: 10500 }, { d: "04-26", calls: 11200 }, { d: "04-27", calls: 10800 }, { d: "04-28", calls: 12486 },
];
const max = Math.max(...dailyData.map((d) => d.calls));

const topAgents = [
  { name: "邮箱智能检索", calls: 3420, tokens: "486K", rank: 1 },
  { name: "代码审查助手", calls: 2890, tokens: "612K", rank: 2 },
  { name: "多语言文档翻译", calls: 2156, tokens: "354K", rank: 3 },
  { name: "运维监控助手", calls: 1820, tokens: "278K", rank: 4 },
  { name: "内容创作大师", calls: 1240, tokens: "418K", rank: 5 },
];

const topResources = [
  { name: "GitHub MCP", type: "mcp", usage: 1820 },
  { name: "Web Search", type: "skill", usage: 1654 },
  { name: "Gmail MCP", type: "mcp", usage: 1240 },
  { name: "Translation Engine", type: "skill", usage: 980 },
  { name: "Code Analysis", type: "skill", usage: 856 },
];

const topUsers = [
  { name: "廖奕通", id: "01441970", calls: 486, agents: 6 },
  { name: "张毅超", id: "01422596", calls: 312, agents: 3 },
  { name: "李四", id: "01234568", calls: 248, agents: 2 },
  { name: "王五", id: "01234569", calls: 196, agents: 1 },
];

const GovernancePage = () => {
  return (
    <div className="flex-1 overflow-auto p-6 animate-fade-in">
      <div className="max-w-6xl mx-auto">
        <div className="mb-5">
          <h1 className="text-lg font-semibold flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" /> 治理数据看板</h1>
          <p className="text-xs text-muted-foreground mt-0.5">监控全平台 Agent 调用量、资源消耗、用户活跃情况</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="border border-border rounded-lg p-4 bg-card">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                  <Icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <div className="text-xl font-semibold mt-1.5">{s.value}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{s.trend} vs 昨日</div>
              </div>
            );
          })}
        </div>

        {/* Trend chart */}
        <div className="border border-border rounded-lg p-5 bg-card mb-6">
          <h3 className="text-sm font-medium mb-4">近 7 天调用趋势</h3>
          <div className="flex items-end gap-3 h-40">
            {dailyData.map((d) => (
              <div key={d.d} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="text-[10px] text-muted-foreground">{d.calls.toLocaleString()}</div>
                <div className="w-full bg-primary/20 rounded-t relative" style={{ height: `${(d.calls / max) * 100}%` }}>
                  <div className="absolute inset-0 bg-primary rounded-t" style={{ height: "100%" }} />
                </div>
                <div className="text-[10px] text-muted-foreground">{d.d}</div>
              </div>
            ))}
          </div>
        </div>

        <Tabs defaultValue="agents">
          <TabsList>
            <TabsTrigger value="agents" className="text-xs gap-1.5"><Crown className="w-3.5 h-3.5" />热门 Agent</TabsTrigger>
            <TabsTrigger value="resources" className="text-xs gap-1.5"><Zap className="w-3.5 h-3.5" />热门资源</TabsTrigger>
            <TabsTrigger value="users" className="text-xs gap-1.5"><Users className="w-3.5 h-3.5" />活跃用户</TabsTrigger>
          </TabsList>

          <TabsContent value="agents" className="mt-3">
            <div className="border border-border rounded-lg overflow-hidden bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">排名</TableHead>
                    <TableHead className="text-xs">智能体</TableHead>
                    <TableHead className="text-xs text-right">调用次数</TableHead>
                    <TableHead className="text-xs text-right">Token 消耗</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topAgents.map((a) => (
                    <TableRow key={a.name}>
                      <TableCell className="text-xs">
                        <Badge variant={a.rank <= 3 ? "default" : "outline"} className="w-6 h-5 justify-center text-[10px]">{a.rank}</Badge>
                      </TableCell>
                      <TableCell className="text-xs font-medium">{a.name}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{a.calls.toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-right font-mono text-muted-foreground">{a.tokens}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="resources" className="mt-3">
            <div className="border border-border rounded-lg overflow-hidden bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">资源</TableHead>
                    <TableHead className="text-xs">类型</TableHead>
                    <TableHead className="text-xs text-right">被调用次数</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topResources.map((r) => (
                    <TableRow key={r.name}>
                      <TableCell className="text-xs font-medium flex items-center gap-1.5">
                        {r.type === "skill" ? <Zap className="w-3 h-3 text-primary" /> : <Server className="w-3 h-3 text-primary" />}
                        {r.name}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="text-[10px]">{r.type === "skill" ? "Skill" : "MCP"}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono">{r.usage.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="users" className="mt-3">
            <div className="border border-border rounded-lg overflow-hidden bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">用户</TableHead>
                    <TableHead className="text-xs">工号</TableHead>
                    <TableHead className="text-xs text-right">调用次数</TableHead>
                    <TableHead className="text-xs text-right">创建 Agent 数</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="text-xs font-medium">{u.name}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{u.id}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{u.calls}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{u.agents}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default GovernancePage;
