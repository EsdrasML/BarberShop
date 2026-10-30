import { describe, expect, it } from "vitest";
import { branchWhere, canAccessBranch, isBranchScoped } from "./scope";

const global = { role: "ADMIN", branchId: null };
const s1 = { role: "ADMIN", branchId: "b1" };

describe("alcance por sucursal", () => {
  it("un administrador general ve todo", () => {
    expect(isBranchScoped(global)).toBe(false);
    expect(canAccessBranch(global, "b2")).toBe(true);
    expect(branchWhere(global)).toEqual({});
  });

  it("un administrador de sucursal solo accede a la suya", () => {
    expect(isBranchScoped(s1)).toBe(true);
    expect(canAccessBranch(s1, "b1")).toBe(true);
    expect(canAccessBranch(s1, "b2")).toBe(false);
    expect(canAccessBranch(s1, null)).toBe(false);
    expect(branchWhere(s1)).toEqual({ branchId: "b1" });
  });
});
