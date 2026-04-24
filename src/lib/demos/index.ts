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

let registered = false;
export function registerAllDemos(): void {
  if (registered) return;
  registerDemo(sprakdriften as Parameters<typeof registerDemo>[0]);
  registered = true;
}
