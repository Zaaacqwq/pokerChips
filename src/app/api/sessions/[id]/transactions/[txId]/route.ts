import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/sse";

// PATCH /api/sessions/[id]/transactions/[txId] — void a transaction
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; txId: string }> }
) {
  const { id, txId } = await params;
  const body = await req.json();
  const { hostToken } = body;

  const session = await prisma.session.findUnique({ where: { id } });
  if (!session) {
    return NextResponse.json({ error: "牌局不存在" }, { status: 404 });
  }

  if (session.hostToken !== hostToken) {
    return NextResponse.json({ error: "只有房主可以撤销" }, { status: 403 });
  }

  const transaction = await prisma.transaction.update({
    where: { id: txId },
    data: { voided: true, voidedAt: new Date() },
  });

  broadcast(id, "transaction_voided", { transaction });

  return NextResponse.json(transaction);
}
