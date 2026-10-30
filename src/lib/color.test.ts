import { describe, expect, it } from "vitest";
import { parseHex, themeVars } from "./color";

describe("color", () => {
  it("valida el formato hexadecimal", () => {
    expect(parseHex("#FFC000")).toEqual([255, 192, 0]);
    expect(parseHex("rojo")).toBeNull();
  });

  it("elige texto negro sobre acentos claros y blanco sobre oscuros", () => {
    expect(themeVars("#FFC000")["--color-on-accent"]).toBe("#000000");
    expect(themeVars("#1a2b6d")["--color-on-accent"]).toBe("#ffffff");
  });
});
