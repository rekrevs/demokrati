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
let registered = false;
export function registerAllDemos(): void {
  if (registered) return;
  // Demo modules land here as they are built:
  // import("./sprakdriften").then(({ sprakdriften }) => registerDemo(sprakdriften));
  // ...
  registered = true;
}
