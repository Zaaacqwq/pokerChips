"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChipCounter } from "@/components/ChipCounter";
import * as api from "@/lib/api-client";
import type { ApiSession } from "@/lib/api-client";
import {
  calculatePlayerSummary,
  checkBalance,
  type Transaction as BalanceTransaction,
} from "@/lib/balance";
import { calculateSettlements } from "@/lib/settlement";
import { emptyBreakdown, breakdownTotal, DENOMINATIONS, CHIP_COLORS, type ChipBreakdown } from "@/lib/chips";
import { getIdentity, isHost as checkIsHost } from "@/lib/identity";
import { useSessionEvents } from "@/hooks/useSessionEvents";

function toBalanceTransactions(session: ApiSession): BalanceTransaction[] {
  return session.transactions
    .filter((t) => !t.voided)
    .map((t) => ({ id: t.id, playerId: t.playerId, type: t.type, chips: t.chips }));
}

export default function SettlePage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const [session, setSession] = useState<ApiSession | null>(null);
  const [cashoutBreakdowns, setCashoutBreakdowns] = useState<Record<string, ChipBreakdown>>({});
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
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

  useSessionEvents(sessionId, reload);

  const balanceTxns = useMemo(
    () => (session ? toBalanceTransactions(session) : []),
    [session]
  );
  const balance = useMemo(() => checkBalance(balanceTxns), [balanceTxns]);

  const playersCashedOut = useMemo(() => {
    return new Set(
      balanceTxns.filter((t) => t.type === "cashout").map((t) => t.playerId)
    );
  }, [balanceTxns]);

  const settlements = useMemo(() => {
    if (!session || !balance.isBalanced || balance.totalCashoutChips === 0) return [];
    const playerBalances = session.players.map((p) => {
      const summary = calculatePlayerSummary(balanceTxns, p.id, session.chipRate);
      return { playerId: p.id, profitLoss: summary.profitLoss };
    });
    return calculateSettlements(playerBalances);
  }, [session, balance, balanceTxns]);

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

  const allCashedOut =
    session.players.length > 0 &&
    session.players.every((p) => playersCashedOut.has(p.id));

  async function handleCashout(playerId: string) {
    const breakdown = cashoutBreakdowns[playerId] || emptyBreakdown();
    const chips = breakdownTotal(breakdown);
    if (chips < 0) return;
    try {
      await api.addTransaction(
        sessionId, playerId, "cashout", chips, { ...breakdown },
        { hostToken: identity.hostToken, playerToken: identity.playerToken }
      );
      setCashoutBreakdowns((prev) => {
        const next = { ...prev };
        delete next[playerId];
        return next;
      });
      setExpandedPlayerId(null);
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "操作失败");
    }
  }

  async function handleComplete() {
    if (!identity.hostToken) return;
    try {
      await api.updateSessionStatus(sessionId, "completed", identity.hostToken);
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "操作失败");
    }
  }

  async function handleBack() {
    if (hostMode && session!.status === "settling" && identity.hostToken) {
      await api.updateSessionStatus(sessionId, "active", identity.hostToken);
    }
    router.push(`/session/${sessionId}`);
  }

  function getPlayerName(playerId: string): string {
    return session!.players.find((p) => p.id === playerId)?.nickname ?? playerId;
  }

  const isCompleted = session.status === "completed";

  return (
    <main className="flex flex-col items-center p-4 max-w-md mx-auto w-full gap-4">
      {/* Header */}
      <div className="w-full flex items-center justify-between pt-4">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          ← 返回牌局
        </Button>
        <Badge variant={balance.isBalanced && allCashedOut ? "default" : "secondary"}>
          {isCompleted ? "已完成" : "结算中"}
        </Badge>
      </div>

      <h1 className="text-2xl font-bold">{session.name} - 结算</h1>

      {/* Balance Status */}
      <Card className="w-full">
        <CardContent className="pt-4">
          <div className="flex justify-between text-sm mb-1">
            <span>总 Buy-in</span>
            <span className="font-mono">{balance.totalBuyinChips} chips</span>
          </div>
          <div className="flex justify-between text-sm mb-1">
            <span>总 Cash-out</span>
            <span className="font-mono">{balance.totalCashoutChips} chips</span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between text-sm font-bold">
            <span>差额</span>
            <span className={balance.isBalanced ? "text-green-600" : "text-destructive"}>
              {balance.difference === 0
                ? "平账 ✓"
                : `${balance.difference > 0 ? "还剩" : "多出"} ${Math.abs(balance.difference)} chips`}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Cash-out inputs */}
      {!isCompleted && (
        <Card className="w-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">输入各玩家手上筹码</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {session.players.map((player) => {
              const hasCashedOut = playersCashedOut.has(player.id);
              const summary = calculatePlayerSummary(balanceTxns, player.id, session.chipRate);
              const isExpanded = expandedPlayerId === player.id;
              const playerBreakdown = cashoutBreakdowns[player.id] || emptyBreakdown();
              const canOperate = hostMode || identity.playerId === player.id;
              const cashoutTxn = session.transactions.find(
                (t) => t.playerId === player.id && t.type === "cashout" && !t.voided
              );

              return (
                <div key={player.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">{player.nickname}</span>
                      <span className="text-xs text-muted-foreground ml-2">(买入: {summary.totalBuyinChips})</span>
                    </div>
                    {hasCashedOut ? (
                      <div className="text-right">
                        <Badge variant="secondary">{summary.cashoutChips} chips ✓</Badge>
                        {cashoutTxn?.chipBreakdown && (
                          <div className="flex gap-1 mt-1 justify-end flex-wrap">
                            {DENOMINATIONS.filter((d) => (cashoutTxn.chipBreakdown?.[d] ?? 0) > 0).map((d) => (
                              <span
                                key={d}
                                className={`${CHIP_COLORS[d]} rounded-full px-1.5 py-0.5 text-[10px] font-bold`}
                              >
                                {d}x{cashoutTxn.chipBreakdown![d]}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : canOperate ? (
                      <Button
                        size="sm"
                        variant={isExpanded ? "secondary" : "outline"}
                        onClick={() => {
                          setExpandedPlayerId(isExpanded ? null : player.id);
                          if (!cashoutBreakdowns[player.id]) {
                            setCashoutBreakdowns((prev) => ({ ...prev, [player.id]: emptyBreakdown() }));
                          }
                        }}
                      >
                        {isExpanded ? "收起" : "数筹码"}
                      </Button>
                    ) : (
                      <Badge variant="outline">等待中</Badge>
                    )}
                  </div>
                  {isExpanded && !hasCashedOut && (
                    <div className="space-y-2">
                      <ChipCounter
                        breakdown={playerBreakdown}
                        onChange={(b) => setCashoutBreakdowns((prev) => ({ ...prev, [player.id]: b }))}
                        chipRate={session.chipRate}
                      />
                      <Button size="sm" className="w-full" onClick={() => handleCashout(player.id)}>
                        确认 Cash-out ({breakdownTotal(playerBreakdown)} chips)
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Settlement Results */}
      {allCashedOut && balance.isBalanced && (
        <Card className="w-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {settlements.length > 0 ? "转账方案" : "无需转账"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              {session.players.map((player) => {
                const summary = calculatePlayerSummary(balanceTxns, player.id, session.chipRate);
                return (
                  <div key={player.id} className="flex justify-between text-sm">
                    <span>{player.nickname}</span>
                    <span
                      className={
                        summary.profitLoss > 0
                          ? "text-green-600 font-bold"
                          : summary.profitLoss < 0
                            ? "text-destructive font-bold"
                            : "text-muted-foreground"
                      }
                    >
                      {summary.profitLoss > 0 ? "+" : ""}¥{summary.profitLoss}
                    </span>
                  </div>
                );
              })}
            </div>

            {settlements.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  {settlements.map((s, i) => (
                    <div key={i} className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{getPlayerName(s.from)}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-medium">{getPlayerName(s.to)}</span>
                      </div>
                      <span className="font-mono font-bold text-lg">¥{s.amount}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  共 {settlements.length} 笔转账（已优化为最少笔数）
                </p>
              </>
            )}

            {!isCompleted && hostMode && (
              <Button className="w-full mt-2" size="lg" onClick={handleComplete}>
                确认完成
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {allCashedOut && !balance.isBalanced && (
        <Card className="w-full border-destructive">
          <CardContent className="pt-4 text-center">
            <p className="text-destructive font-bold mb-2">
              筹码不平！差额: {Math.abs(balance.difference)} chips
            </p>
            <p className="text-sm text-muted-foreground">请检查各玩家的 Cash-out 数量是否正确</p>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
