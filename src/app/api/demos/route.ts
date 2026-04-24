import { NextResponse } from "next/server";
import { listDemos, registerAllDemos } from "@/lib/demos";

registerAllDemos();

export async function GET() {
  const demos = listDemos().map((m) => ({
    id: m.id,
    title: m.title,
    visibility: m.visibility,
    supportsLive: m.supportsLive,
    supportsCustomInput: m.supportsCustomInput,
    riskLevel: m.riskLevel,
  }));
  return NextResponse.json({ demos });
}
