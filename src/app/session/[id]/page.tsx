"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChipCounter } from "@/components/ChipCounter";
import * as api from "@/lib/api-client";
import type { ApiSession } from "@/lib/api-client";
import { calculatePlayerSummary, checkBalance } from "@/lib/balance";
import type { Transaction as BalanceTransaction } from "@/lib/balance";
import { emptyBreakdown, breakdownTotal, DENOMINATIONS, CHIP_COLORS, type ChipBreakdown } from "@/lib/chips";
import { getIdentity, isHost as checkIsHost } from "@/lib/identity";
import { useSessionEvents } from "@/hooks/useSessionEvents";

function toBalanceTransactions(session: ApiSession): BalanceTransaction[] {
  return session.transactions
    .filter((t) => !t.voided)
    .map((t) => ({ id: t.id, playerId: t.playerId, type: t.type, chips: t.chips }));
}

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const [session, setSession] = useState<ApiSession | null>(null);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [buyinPlayerId, setBuyinPlayerId] = useState<string | null>(null);
  const [buyinBreakdown, setBuyinBreakdown] = useState<ChipBreakdown>(emptyBreakdown());
  const [loading, setLoading] = useState(true);

  const identity = typeof window !== "undefined" ? getIdentity(sessionId) : {};
  const hostMode = typeof window !== "undefined" ? checkIsHost(sessionId) : false;

  const reload = useCallback(async () => {
    try {
      const s = await api.getSession(sessionId);
      setSession(s);
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    reload();
  }, [reload]);

  // SSE: auto-reload on any event
  useSessionEvents(sessionId, reload);

  if (loading) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-muted-foreground">加载中...</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-muted-foreground">牌局不存在</p>
        <Button variant="link" onClick={() => router.push("/")}>返回首页</Button>
      </main>
    );
  }

  const balanceTxns = toBalanceTransactions(session);
  const balance = checkBalance(balanceTxns);
  const isActive = session.status === "active";

  async function handleAddPlayer() {
    if (!newPlayerName.trim() || !identity.hostToken) return;
    try {
      await api.addPlayer(sessionId, newPlayerName.trim(), identity.hostToken);
      setNewPlayerName("");
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "添加失败");
    }
  }

  async function handleChipBuyin(playerId: string) {
    const total = breakdownTotal(buyinBreakdown);
    if (total <= 0) return;
    try {
      await api.addTransaction(
        sessionId, playerId, "buyin", total, { ...buyinBreakdown },
        { hostToken: identity.hostToken, playerToken: identity.playerToken }
      );
      setBuyinBreakdown(emptyBreakdown());
      setBuyinPlayerId(null);
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "操作失败");
    }
  }

  async function handleVoid(txId: string) {
    if (!identity.hostToken) return;
    try {
      await api.voidTransaction(sessionId, txId, identity.hostToken);
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "撤销失败");
    }
  }

  async function handleStartSettle() {
    if (!identity.hostToken) return;
    try {
      await api.updateSessionStatus(sessionId, "settling", identity.hostToken);
      router.push(`/session/${sessionId}/settle`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "操作失败");
    }
  }

  return (
    <main className="flex flex-col items-center p-4 max-w-md mx-auto w-full gap-4">
      {/* Header */}
      <div className="w-full flex items-center justify-between pt-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
          ← 返回
        </Button>
        <div className="flex items-center gap-2">
          {hostMode && <Badge>房主</Badge>}
          <Badge variant="secondary" className="font-mono">{session.id}</Badge>
        </div>
      </div>

      <div className="text-center">
        <h1 className="text-2xl font-bold">{session.name}</h1>
        <p className="text-sm text-muted-foreground">
          1 chip = ¥{session.chipRate} · 默认 Buy-in: {session.defaultBuyin}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          分享房间号 <span className="font-mono font-bold">{session.id}</span> 给朋友加入
        </p>
      </div>

      {/* Balance Indicator */}
      <Card className="w-full">
        <CardContent className="pt-4">
          <div className="flex justify-between text-sm">
            <span>总发出筹码</span>
            <span className="font-mono font-bold">
              {balance.totalBuyinChips} chips (¥{balance.totalBuyinChips * session.chipRate})
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Add Player (host only) */}
      {isActive && hostMode && (
        <Card className="w-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">添加玩家</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="昵称"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddPlayer()}
              />
              <Button onClick={handleAddPlayer}>添加</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Player List */}
      <div className="w-full space-y-3">
        {session.players.map((player) => {
          const summary = calculatePlayerSummary(balanceTxns, player.id, session.chipRate);
          const playerTxns = session.transactions.filter(
            (t) => t.playerId === player.id && !t.voided
          );
          const canOperate = hostMode || identity.playerId === player.id;

          return (
            <Card key={player.id} className="w-full">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-lg">{player.nickname}</span>
                  <span className="font-mono text-sm">
                    Buy-in: {summary.totalBuyinChips} chips (¥{summary.totalBuyinAmount})
                  </span>
                </div>

                {isActive && canOperate && (
                  <div className="mb-2">
                    {buyinPlayerId === player.id ? (
                      <div className="space-y-2">
                        <ChipCounter
                          breakdown={buyinBreakdown}
                          onChange={setBuyinBreakdown}
                          chipRate={session.chipRate}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1"
                            disabled={breakdownTotal(buyinBreakdown) <= 0}
                            onClick={() => handleChipBuyin(player.id)}
                          >
                            确认 Buy-in
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setBuyinPlayerId(null); setBuyinBreakdown(emptyBreakdown()); }}
                          >
                            取消
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => { setBuyinPlayerId(player.id); setBuyinBreakdown(emptyBreakdown()); }}
                      >
                        Buy-in
                      </Button>
                    )}
                  </div>
                )}

                {playerTxns.length > 0 && (
                  <>
                    <Separator className="my-2" />
                    <div className="space-y-1">
                      {playerTxns.map((t) => (
                        <div key={t.id} className="text-xs text-muted-foreground">
                          <div className="flex items-center justify-between">
                            <span>
                              {t.type === "buyin" ? "Buy-in" : "Cash-out"}: {t.chips} chips
                            </span>
                            <div className="flex items-center gap-2">
                              <span>
                                {new Date(t.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                              {isActive && hostMode && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 text-xs text-destructive px-1"
                                  onClick={() => handleVoid(t.id)}
                                >
                                  撤销
                                </Button>
                              )}
                            </div>
                          </div>
                          {t.chipBreakdown && (
                            <div className="flex gap-1 mt-0.5 flex-wrap">
                              {DENOMINATIONS.filter((d) => (t.chipBreakdown?.[d] ?? 0) > 0).map((d) => (
                                <span
                                  key={d}
                                  className={`${CHIP_COLORS[d]} rounded-full px-1.5 py-0.5 text-[10px] font-bold`}
                                >
                                  {d}x{t.chipBreakdown![d]}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Actions */}
      {isActive && hostMode && session.players.length > 0 && (
        <Button className="w-full" size="lg" onClick={handleStartSettle}>
          开始结算
        </Button>
      )}

      {session.status === "settling" && (
        <Button
          className="w-full"
          size="lg"
          onClick={() => router.push(`/session/${sessionId}/settle`)}
        >
          继续结算
        </Button>
      )}
    </main>
  );
}
