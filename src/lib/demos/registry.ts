import type { DemoModule } from "./module";

const registry = new Map<string, DemoModule>();

export function registerDemo(mod: DemoModule): void {
  if (registry.has(mod.id) && registry.get(mod.id) !== mod) {
    throw new Error(
      `Demo module "${mod.id}" is already registered with a different instance.`,
    );
  }
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
