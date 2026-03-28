import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/token";
import { broadcast } from "@/lib/sse";

// POST /api/sessions/join — join a session with room code + nickname
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { roomCode, nickname } = body;

  if (!roomCode || !nickname) {
    return NextResponse.json({ error: "请输入房间号和昵称" }, { status: 400 });
  }

  const code = roomCode.toUpperCase().trim();
  const session = await prisma.session.findUnique({ where: { id: code } });

  if (!session) {
    return NextResponse.json({ error: "房间不存在" }, { status: 404 });
  }

  if (session.status === "completed") {
    return NextResponse.json({ error: "牌局已结束" }, { status: 400 });
  }

  // Check if nickname already taken in this session
  const existing = await prisma.player.findUnique({
    where: { sessionId_nickname: { sessionId: code, nickname: nickname.trim() } },
  });

  if (existing) {
    // Return existing player token so they can rejoin
    return NextResponse.json({
      sessionId: code,
      playerId: existing.id,
      playerToken: existing.playerToken,
      isRejoin: true,
    });
  }

  const playerToken = generateToken();
  const player = await prisma.player.create({
    data: {
      sessionId: code,
      nickname: nickname.trim(),
      playerToken,
    },
  });

  broadcast(code, "player_joined", { player });

  return NextResponse.json({
    sessionId: code,
    playerId: player.id,
    playerToken: player.playerToken,
    isRejoin: false,
  });
}
