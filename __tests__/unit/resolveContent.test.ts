// __tests__/unit/resolveContent.test.ts
// NEW: Unit tests for multilingual content resolution and fallback logic
import { resolveMultilingual, resolveForUser } from "@/lib/resolveContent";

describe("resolveMultilingual", () => {
  const field = {
    en: "Soil Health",
    fr: "Santé du sol",
    rw: "Ubuzima bw'ubutaka",
  };

  test("returns preferred language when available", () => {
    expect(resolveMultilingual(field, "fr")).toBe("Santé du sol");
    expect(resolveMultilingual(field, "rw")).toBe("Ubuzima bw'ubutaka");
    expect(resolveMultilingual(field, "en")).toBe("Soil Health");
  });

  test("falls back to first item in fallback chain when preferred is missing", () => {
    const partial = { en: "Soil Health", fr: "", rw: "" };
    expect(resolveMultilingual(partial, "fr", ["en", "fr", "rw"])).toBe("Soil Health");
  });

  test("falls back through chain in order", () => {
    const partial = { en: "", fr: "Santé du sol", rw: "" };
    expect(resolveMultilingual(partial, "rw", ["en", "fr", "rw"])).toBe("Santé du sol");
  });

  test("returns empty string when all languages missing", () => {
    expect(resolveMultilingual({ en: "", fr: "", rw: "" }, "en")).toBe("");
  });

  test("returns empty string for null input", () => {
    expect(resolveMultilingual(null, "en")).toBe("");
  });

  test("returns empty string for array input", () => {
    expect(resolveMultilingual([] as any, "en")).toBe("");
  });

  test("handles missing preferred lang key gracefully", () => {
    const partial = { en: "Hello" };
    expect(resolveMultilingual(partial, "rw")).toBe("Hello");
  });

  test("resolveForUser uses standard 3-language fallback", () => {
    const field = { en: "English only" };
    expect(resolveForUser(field, "rw")).toBe("English only");
  });
});
