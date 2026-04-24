import { env } from "../env";
import type { Profile, Provider } from "./types";

export interface ProfileResolution {
  provider: Provider;
  model: string;
}

export function resolveProfile(profile: Profile): ProfileResolution {
  const e = env();
  switch (profile) {
    case "fast":
      return { provider: e.MODEL_FAST_PROVIDER, model: e.MODEL_FAST_NAME };
    case "strong":
      return { provider: e.MODEL_STRONG_PROVIDER, model: e.MODEL_STRONG_NAME };
    case "multilingual":
      return {
        provider: e.MODEL_MULTILINGUAL_PROVIDER,
        model: e.MODEL_MULTILINGUAL_NAME,
      };
    case "safe":
      return { provider: e.MODEL_SAFE_PROVIDER, model: e.MODEL_SAFE_NAME };
    case "compare":
      // `compare` currently reuses the strong profile. When we want to pit
      // two specific models against each other we can split this out to its
      // own env pair (MODEL_COMPARE_*).
      return { provider: e.MODEL_STRONG_PROVIDER, model: e.MODEL_STRONG_NAME };
    case "embedding":
      return { provider: e.MODEL_EMBED_PROVIDER, model: e.MODEL_EMBED_NAME };
  }
}
