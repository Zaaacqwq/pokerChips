"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { joinSession } from "@/lib/api-client";
import { savePlayerIdentity } from "@/lib/identity";

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p className="text-muted-foreground">加载中...</p></div>}>
      <JoinPageContent />
    </Suspense>
  );
}

function JoinPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [roomCode, setRoomCode] = useState(searchParams.get("code") || "");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    if (!roomCode.trim() || !nickname.trim()) {
      setError("请输入房间号和昵称");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await joinSession(roomCode.trim(), nickname.trim());
      savePlayerIdentity(
        result.sessionId,
        result.playerId,
        result.playerToken,
        nickname.trim()
      );
      router.push(`/session/${result.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加入失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-col items-center p-4 max-w-md mx-auto w-full gap-6">
      <div className="text-center pt-8 pb-4">
        <h1 className="text-3xl font-bold tracking-tight">加入牌局</h1>
        <p className="text-muted-foreground mt-1">输入房间号和你的昵称</p>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>加入</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">房间号</label>
            <Input
              placeholder="6 位房间号"
              value={roomCode}
              onChange={(e) => {
                setRoomCode(e.target.value.toUpperCase());
                setError("");
              }}
              maxLength={6}
              className="text-center text-lg tracking-widest font-mono"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">昵称</label>
            <Input
              placeholder="你的昵称"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <Button
            className="w-full"
            size="lg"
            onClick={handleJoin}
            disabled={loading}
          >
            {loading ? "加入中..." : "加入牌局"}
          </Button>
        </CardContent>
      </Card>

      <Button variant="link" onClick={() => router.push("/")}>
        ← 返回首页
      </Button>
    </main>
  );
}
