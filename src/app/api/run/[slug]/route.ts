import { NextResponse } from "next/server";
import { z } from "zod";
import { registerAllDemos } from "@/lib/demos";
import {
  DemoNotFoundError,
  InvalidDemoInputError,
  submitRun,
} from "@/lib/demos/pipeline";

registerAllDemos();

const bodySchema = z.object({
  mode: z.enum(["FEATURED", "EXPLORE", "STAGE"]),
  scenarioId: z.string().optional(),
  input: z.unknown(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "invalid_body",
        issues: parsed.error.issues.map((i) => ({
          path: i.path,
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }

  try {
    const result = await submitRun({
      demoSlug: slug,
      mode: parsed.data.mode,
      scenarioId: parsed.data.scenarioId,
      input: parsed.data.input,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof DemoNotFoundError) {
      return NextResponse.json(
        { error: "demo_not_found", slug },
        { status: 404 },
      );
    }
    if (err instanceof InvalidDemoInputError) {
      return NextResponse.json(
        { error: "invalid_input", issues: err.issues },
        { status: 400 },
      );
    }
    console.error("submitRun failed", err);
    return NextResponse.json(
      { error: "internal_error" },
      { status: 500 },
    );
  }
}
