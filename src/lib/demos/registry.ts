import type { DemoModule } from "./module";

const registry = new Map<string, DemoModule>();

export function registerDemo(mod: DemoModule): void {
  // Overwrite an existing registration with the same id. This keeps the
  // registry stable across HMR reloads (which produce new module instances
  // with the same id) and across the pattern where multiple entry points
  // call registerAllDemos().
  registry.set(mod.id, mod);
}

export function getDemo(slug: string): DemoModule | null {
  return registry.get(slug) ?? null;
}

export function listDemos(): DemoModule[] {
  return [...registry.values()];
}

/** Test-only: drop registry state. */
export function _clearRegistryForTests(): void {
  registry.clear();
}
