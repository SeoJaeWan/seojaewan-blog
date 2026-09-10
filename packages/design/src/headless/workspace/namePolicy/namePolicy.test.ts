import { describe, expect, it } from "vitest";

import {
  compareFolderNames,
  getFolderNameComparisonKey,
  normalizeFolderName,
  validateFolderName,
} from "./index.js";

describe("Workspace Folder name policy", () => {
  it("NFC와 case-insensitive 비교 key를 모든 비교에 사용한다", () => {
    expect(normalizeFolderName("Cafe\u0301")).toBe("Caf\u00e9");
    expect(getFolderNameComparisonKey("CAFE\u0301")).toBe(getFolderNameComparisonKey("caf\u00e9"));
    expect(compareFolderNames("Blog", "archive")).toBeGreaterThan(0);
  });

  it.each([
    ["", "folder-name-empty"],
    [" \t", "folder-name-empty"],
    ["a".repeat(256), "folder-name-too-long"],
    ["bad/name", "folder-name-invalid-character"],
    ["control\u0001", "folder-name-invalid-character"],
    [".", "folder-name-relative-segment"],
    ["..", "folder-name-relative-segment"],
    ["trail ", "folder-name-trailing-space-or-period"],
    ["trail.", "folder-name-trailing-space-or-period"],
    ["con", "folder-name-reserved"],
    ["PRN.txt", "folder-name-reserved"],
    ["COM\u00b9.log", "folder-name-reserved"],
    ["lpt3.anything", "folder-name-reserved"],
  ] as const)("%j를 %s로 거절한다", (name, reason) => {
    expect(validateFolderName(name)).toEqual({ ok: false, reason });
  });

  it("Unicode code point 255개를 허용하고 surrogate pair를 한 문자로 센다", () => {
    const input = "\ud83d\udcc1".repeat(255);
    expect(validateFolderName(input)).toEqual({
      ok: true,
      name: input,
      comparisonKey: input,
    });
    expect(validateFolderName(`${input}\ud83d\udcc1`)).toEqual({
      ok: false,
      reason: "folder-name-too-long",
    });
  });
});
