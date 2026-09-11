import { describe, expect, it } from "vitest";

import { createResourceRef, createStaticCatalog } from "../../../resources/index.js";
import { selectResourceOpenAction } from "./index.js";

const resources = {
  content: createStaticCatalog([]),
  folder: createStaticCatalog([]),
  externalShortcut: createStaticCatalog([
    {
      ref: createResourceRef("external-shortcut", "00000000-0000-4000-8000-000000000001"),
      name: "사이트",
      url: "https://example.com",
    },
  ]),
};

describe("selectResourceOpenAction", () => {
  it("Folder와 Content를 내부 Window Action으로 만든다", () => {
    const folder = createResourceRef("folder", "00000000-0000-4000-8000-000000000002");
    const content = createResourceRef("content", "00000000-0000-4000-8000-000000000003");
    expect(selectResourceOpenAction(folder, resources)).toEqual({ type: "open-folder", folder });
    expect(selectResourceOpenAction(content, resources)).toEqual({ type: "open-content", content });
  });

  it("현재 Catalog의 ExternalShortcut URL만 open intent로 만든다", () => {
    expect(
      selectResourceOpenAction(
        createResourceRef("external-shortcut", "00000000-0000-4000-8000-000000000001"),
        resources,
      ),
    ).toEqual({ type: "open-external-shortcut", url: "https://example.com", target: "_blank" });
    expect(
      selectResourceOpenAction(
        createResourceRef("external-shortcut", "00000000-0000-4000-8000-000000000004"),
        resources,
      ),
    ).toBeNull();
  });
});
