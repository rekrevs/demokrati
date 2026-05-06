export * from "./module";
export {
  getDemo,
  listDemos,
  registerDemo,
  _clearRegistryForTests,
} from "./registry";
export * from "./pipeline";
export * from "./cache-key";

/**
 * Register every shipped demo. Called once from web and worker entry
 * points. Each demo is imported here so the registry is stable after a
 * single import.
 */
import { registerDemo } from "./registry";
import { sprakdriften } from "./sprakdriften";
import { riksdagsradarn } from "./riksdagsradarn";
import { oenighetskartan } from "./oenighetskartan";
import { aiKonstitutionen } from "./ai-konstitutionen";
import { oppenhetsparadoxen } from "./oppenhetsparadoxen";
import { persuasionmaskinen } from "./persuasionmaskinen";
import { programkompassen } from "./programkompassen";

export function registerAllDemos(): void {
  // registerDemo is idempotent — safe across HMR + multiple entry points.
  registerDemo(sprakdriften as Parameters<typeof registerDemo>[0]);
  registerDemo(riksdagsradarn as Parameters<typeof registerDemo>[0]);
  registerDemo(oenighetskartan as Parameters<typeof registerDemo>[0]);
  registerDemo(aiKonstitutionen as Parameters<typeof registerDemo>[0]);
  registerDemo(oppenhetsparadoxen as Parameters<typeof registerDemo>[0]);
  registerDemo(persuasionmaskinen as Parameters<typeof registerDemo>[0]);
  registerDemo(programkompassen as Parameters<typeof registerDemo>[0]);
}
