import crypto from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { decrypt, encrypt, signPayload, verifyPayload } from "./crypto";

beforeAll(() => { process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64"); });

describe("crypto", () => {
  it("cifra y descifra, y el cifrado no es predecible", () => {
    const a = encrypt("token-secreto"), b = encrypt("token-secreto");
    expect(a).not.toContain("token-secreto");
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe("token-secreto");
  });

  it("rechaza datos alterados", () => {
    const t = encrypt("hola");
    const parts = t.split(".");
    parts[3] = Buffer.from("otra-cosa").toString("base64");
    expect(() => decrypt(parts.join("."))).toThrow();
  });

  it("firma y verifica el estado OAuth", () => {
    const s = signPayload({ b: "barber1", n: 1 }, "secreto");
    expect(verifyPayload<{ b: string }>(s, "secreto")?.b).toBe("barber1");
    expect(verifyPayload(s, "otro-secreto")).toBeNull();
    expect(verifyPayload(s.replace(/.$/, "x"), "secreto")).toBeNull();
  });
});
