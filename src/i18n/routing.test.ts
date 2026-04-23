import { describe, expect, it } from "vitest";
import { getDirection, routing, RTL_LOCALES } from "./routing";

describe("i18n routing", () => {
  it("advertises sv/en/ar as supported locales", () => {
    expect(routing.locales).toEqual(["sv", "en", "ar"]);
  });

  it("defaults to Swedish", () => {
    expect(routing.defaultLocale).toBe("sv");
  });

  it("marks Arabic as RTL", () => {
    expect(RTL_LOCALES.has("ar")).toBe(true);
    expect(getDirection("ar")).toBe("rtl");
  });

  it("marks Swedish and English as LTR", () => {
    expect(RTL_LOCALES.has("sv")).toBe(false);
    expect(RTL_LOCALES.has("en")).toBe(false);
    expect(getDirection("sv")).toBe("ltr");
    expect(getDirection("en")).toBe("ltr");
  });
});
