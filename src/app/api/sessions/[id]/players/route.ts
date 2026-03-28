import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/token";
import { broadcast } from "@/lib/sse";

// POST /api/sessions/[id]/players — host adds a player
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { nickname, hostToken } = body;

  if (!nickname) {
    return NextResponse.json({ error: "请输入昵称" }, { status: 400 });
  }

  // Verify host
  const session = await prisma.session.findUnique({ where: { id } });
  if (!session) {
    return NextResponse.json({ error: "牌局不存在" }, { status: 404 });
  }
  if (session.hostToken !== hostToken) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  // Check duplicate nickname
  const existing = await prisma.player.findUnique({
    where: { sessionId_nickname: { sessionId: id, nickname: nickname.trim() } },
  });
  if (existing) {
    return NextResponse.json({ error: "昵称已存在" }, { status: 409 });
  }

  const playerToken = generateToken();
  const player = await prisma.player.create({
    data: {
      sessionId: id,
      nickname: nickname.trim(),
      playerToken,
    },
  });

  broadcast(id, "player_joined", { player });

  return NextResponse.json(player);
}
