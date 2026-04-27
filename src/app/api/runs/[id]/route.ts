import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const run = await prisma.run.findUnique({ where: { id } });
  if (!run) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({
    runId: run.id,
    demoSlug: run.demoSlug,
    status: run.status,
    mode: run.mode,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    output: run.outputJson,
    error: run.errorJson,
    progress: run.progress,
    cached: false,
  });
}
