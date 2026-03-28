"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import * as api from "@/lib/api-client";
import { saveHostIdentity, getMySessionIds } from "@/lib/identity";

interface SessionSummary {
  id: string;
  name: string;
  status: "active" | "settling" | "completed";
  playerCount: number;
  createdAt: string;
}

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [chipRate, setChipRate] = useState("1");
  const [defaultBuyin, setDefaultBuyin] = useState("200");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);

  useEffect(() => {
    // Load sessions the user has participated in
    const ids = getMySessionIds();
    Promise.all(
      ids.map((id) =>
        api.getSession(id).then((s) => ({
          id: s.id,
          name: s.name,
          status: s.status,
          playerCount: s.players.length,
          createdAt: s.createdAt,
        })).catch(() => null)
      )
    ).then((results) => {
      setSessions(results.filter((r): r is SessionSummary => r !== null));
    });
  }, []);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "请输入牌局名称";
    const rate = parseFloat(chipRate);
    if (!chipRate || isNaN(rate) || rate <= 0) next.chipRate = "请输入有效汇率";
    const buyin = parseInt(defaultBuyin);
    if (!defaultBuyin || isNaN(buyin) || buyin <= 0) next.defaultBuyin = "请输入有效数值";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleCreate() {
    if (!validate()) return;
    setCreating(true);
    try {
      const session = await api.createSession(
        name.trim(),
        parseFloat(chipRate),
        parseInt(defaultBuyin)
      );
      saveHostIdentity(session.id, session.hostToken);
      router.push(`/session/${session.id}`);
    } catch (err) {
      setErrors({ name: err instanceof Error ? err.message : "创建失败" });
    } finally {
      setCreating(false);
    }
  }

  const activeSessions = sessions.filter((s) => s.status !== "completed");
  const completedSessions = sessions.filter((s) => s.status === "completed");

  return (
    <main className="flex flex-col items-center p-4 max-w-md mx-auto w-full gap-6">
      <div className="text-center pt-8 pb-4">
        <h1 className="text-3xl font-bold tracking-tight">Poker Chips</h1>
        <p className="text-muted-foreground mt-1">德州扑克记账工具</p>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>创建新牌局</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">牌局名称</label>
            <Input
              placeholder="例：周五晚局"
              value={name}
              onChange={(e) => { setName(e.target.value); setErrors((prev) => ({ ...prev, name: "" })); }}
            />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">
                筹码汇率 (1 chip = ¥)
              </label>
              <Input
                type="number"
                step="0.1"
                min="0.01"
                value={chipRate}
                onChange={(e) => { setChipRate(e.target.value); setErrors((prev) => ({ ...prev, chipRate: "" })); }}
              />
              {errors.chipRate && <p className="text-xs text-destructive mt-1">{errors.chipRate}</p>}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                默认 Buy-in
              </label>
              <Input
                type="number"
                step="50"
                min="1"
                value={defaultBuyin}
                onChange={(e) => { setDefaultBuyin(e.target.value); setErrors((prev) => ({ ...prev, defaultBuyin: "" })); }}
              />
              {errors.defaultBuyin && <p className="text-xs text-destructive mt-1">{errors.defaultBuyin}</p>}
            </div>
          </div>
          <Button className="w-full" size="lg" onClick={handleCreate} disabled={creating}>
            {creating ? "创建中..." : "开始牌局"}
          </Button>
        </CardContent>
      </Card>

      {/* Join existing session */}
      <Card className="w-full">
        <CardContent className="pt-6">
          <Button
            variant="outline"
            className="w-full"
            size="lg"
            onClick={() => router.push("/join")}
          >
            加入牌局（输入房间号）
          </Button>
        </CardContent>
      </Card>

      {activeSessions.length > 0 && (
        <Card className="w-full">
          <CardHeader>
            <CardTitle>进行中的牌局</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeSessions.map((s) => (
              <Button
                key={s.id}
                variant="outline"
                className="w-full justify-between"
                onClick={() => router.push(`/session/${s.id}`)}
              >
                <span>{s.name}</span>
                <span className="text-muted-foreground text-xs">
                  {s.playerCount} 人 · {s.id}
                </span>
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {completedSessions.length > 0 && (
        <Card className="w-full">
          <CardHeader>
            <CardTitle>历史牌局</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {completedSessions.map((s) => (
              <Button
                key={s.id}
                variant="ghost"
                className="w-full justify-between"
                onClick={() => router.push(`/session/${s.id}`)}
              >
                <span>{s.name}</span>
                <span className="text-muted-foreground text-xs">
                  {new Date(s.createdAt).toLocaleDateString("zh-CN")}
                </span>
              </Button>
            ))}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
