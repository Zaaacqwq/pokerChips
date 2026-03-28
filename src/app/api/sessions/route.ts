import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken, generateRoomCode } from "@/lib/token";

// POST /api/sessions — create a new session
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, chipRate, defaultBuyin } = body;

  if (!name || !chipRate || !defaultBuyin) {
    return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
  }

  const id = generateRoomCode();
  const hostToken = generateToken();

  const session = await prisma.session.create({
    data: {
      id,
      name,
      hostToken,
      chipRate: parseFloat(chipRate),
      defaultBuyin: parseInt(defaultBuyin),
    },
    include: { players: true, transactions: true },
  });

  return NextResponse.json({ ...session, hostToken });
}
