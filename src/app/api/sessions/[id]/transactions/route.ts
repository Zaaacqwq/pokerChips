import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/sse";

// POST /api/sessions/[id]/transactions — add buy-in or cash-out
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { playerId, type, chips, chipBreakdown, hostToken, playerToken } = body;

  if (!playerId || !type || chips == null) {
    return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
  }

  if (type !== "buyin" && type !== "cashout") {
    return NextResponse.json({ error: "无效的交易类型" }, { status: 400 });
  }

  if (typeof chips !== "number" || chips < 0) {
    return NextResponse.json({ error: "筹码数无效" }, { status: 400 });
  }

  const session = await prisma.session.findUnique({ where: { id } });
  if (!session) {
    return NextResponse.json({ error: "牌局不存在" }, { status: 404 });
  }

  // Auth: either host or the player themselves
  const isHost = hostToken && session.hostToken === hostToken;
  if (!isHost) {
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player || player.playerToken !== playerToken) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }
  }

  const transaction = await prisma.transaction.create({
    data: {
      sessionId: id,
      playerId,
      type,
      chips,
      chipBreakdown: chipBreakdown || undefined,
    },
  });

  broadcast(id, "transaction_added", { transaction });

  return NextResponse.json(transaction);
}
