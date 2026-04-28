/**
 * Catalog of all v1 demos with act assignment and build status.
 * Drives the home page demo index. Update `status` from "coming" to
 * "built" when a demo's launcher route lands.
 */
export type DemoAct = 1 | 2 | 3;
export type DemoStatus = "built" | "coming";

export interface DemoNavEntry {
  slug: string;
  act: DemoAct;
  status: DemoStatus;
}

export const DEMO_NAV: readonly DemoNavEntry[] = [
  { slug: "riksdagsradarn", act: 1, status: "built" },
  { slug: "oenighetskartan", act: 1, status: "coming" },
  { slug: "oppenhetsparadoxen", act: 1, status: "coming" },
  { slug: "sprakdriften", act: 2, status: "built" },
  { slug: "programkompassen", act: 2, status: "coming" },
  { slug: "persuasionmaskinen", act: 2, status: "coming" },
  { slug: "ai-konstitutionen", act: 3, status: "coming" },
] as const;

export function demosByAct(act: DemoAct): DemoNavEntry[] {
  return DEMO_NAV.filter((d) => d.act === act);
}
