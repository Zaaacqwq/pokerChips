import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/sse";

// PATCH /api/sessions/[id]/settle — update session status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { status, hostToken } = body;

  if (!["active", "settling", "completed"].includes(status)) {
    return NextResponse.json({ error: "无效状态" }, { status: 400 });
  }

  const session = await prisma.session.findUnique({ where: { id } });
  if (!session) {
    return NextResponse.json({ error: "牌局不存在" }, { status: 404 });
  }

  if (session.hostToken !== hostToken) {
    return NextResponse.json({ error: "只有房主可以操作" }, { status: 403 });
  }

  const updated = await prisma.session.update({
    where: { id },
    data: {
      status,
      settledAt: status === "completed" ? new Date() : session.settledAt,
    },
  });

  broadcast(id, "status_changed", { status: updated.status });

  return NextResponse.json(updated);
}
