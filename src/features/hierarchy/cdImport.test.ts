import { describe, expect, it } from "vitest";
import { extractCdNames } from "@/features/hierarchy/cdImport";

describe("extractCdNames", () => {
  it("returns an empty list for no rows", () => {
    expect(extractCdNames([])).toEqual([]);
  });

  it("picks a column named Nome/CD/Name (case-insensitive) over the first column", () => {
    const rows = [
      { Codigo: "001", Nome: "CD Food Town" },
      { Codigo: "002", Nome: "CD Betim" },
    ];
    expect(extractCdNames(rows)).toEqual(["CD Food Town", "CD Betim"]);
  });

  it("falls back to the first column when no recognizable name column exists", () => {
    const rows = [{ Coluna1: "CD Food Town" }, { Coluna1: "CD Betim" }];
    expect(extractCdNames(rows)).toEqual(["CD Food Town", "CD Betim"]);
  });

  it("trims whitespace, drops empty rows, and dedupes case-insensitively", () => {
    const rows = [
      { Nome: "  CD Food Town  " },
      { Nome: "" },
      { Nome: "cd food town" },
      { Nome: "CD Betim" },
    ];
    expect(extractCdNames(rows)).toEqual(["CD Food Town", "CD Betim"]);
  });

  it("coerces non-string cell values to strings", () => {
    const rows = [{ Nome: 123 }];
    expect(extractCdNames(rows)).toEqual(["123"]);
  });
});
