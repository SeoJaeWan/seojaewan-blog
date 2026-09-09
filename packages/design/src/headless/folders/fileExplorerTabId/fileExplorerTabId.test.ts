import { describe, expect, expectTypeOf, it } from "vitest";

import type { ChromeTabId } from "../../chrome/index.js";
import type { ResourceId } from "../../resources/index.js";
import type { WindowSessionId } from "../../windows/windowSessionId/index.js";
import {
  type FileExplorerTabId,
  InvalidFileExplorerTabIdError,
  isFileExplorerTabId,
  parseFileExplorerTabId,
} from "./index.js";

const UUID = "550494b7-ce24-4dca-b59c-77da9be2da16";

describe("parseFileExplorerTabId", () => {
  it("유효한 UUID를 다른 identity와 구분되는 FileExplorerTabId로 해석한다", () => {
    const tabId = parseFileExplorerTabId(UUID);

    expect(tabId).toBe(UUID);
    expectTypeOf<FileExplorerTabId>().not.toEqualTypeOf<ResourceId>();
    expectTypeOf<FileExplorerTabId>().not.toEqualTypeOf<WindowSessionId>();
    expectTypeOf<FileExplorerTabId>().not.toEqualTypeOf<ChromeTabId>();
  });

  it.each(["", "folder-tab", "00000000-0000-0000-0000-000000000000"])(
    "지원하지 않는 UUID %s를 거부한다",
    (value) => {
      expect(() => parseFileExplorerTabId(value)).toThrow(InvalidFileExplorerTabIdError);
    },
  );
});

describe("isFileExplorerTabId", () => {
  it("유효한 UUID이면 true를 반환한다", () => {
    expect(isFileExplorerTabId(UUID)).toBe(true);
  });
  it.each(["", "invalid-id", "00000000-0000-0000-0000-000000000000"])(
    "잘못된 UUID %s이면 예외 없이 false를 반환한다",
    (value) => {
      expect(isFileExplorerTabId(value)).toBe(false);
    },
  );
});
