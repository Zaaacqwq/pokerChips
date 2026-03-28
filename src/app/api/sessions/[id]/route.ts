import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/sessions/[id] — get session with players and transactions
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await prisma.session.findUnique({
    where: { id },
    include: {
      players: { orderBy: { joinedAt: "asc" } },
      transactions: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "牌局不存在" }, { status: 404 });
  }

  // Strip hostToken from public response
  const { hostToken: _, ...publicSession } = session;
  return NextResponse.json(publicSession);
}
