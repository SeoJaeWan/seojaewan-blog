import { describe, expect, it } from "vitest";

import { searchResources as headlessSearchResources } from "../headless/index.js";
import {
  type Content,
  createResourceRef,
  createStaticCatalog,
  type ExternalShortcut,
  type Folder,
  searchResources as featureSearchResources,
} from "../headless/resources/index.js";
import {
  normalizeResourceSearchQuery,
  type ResourceSearchInput,
  type ResourceSearchMatch,
  searchResources,
} from "../index.js";

describe("searchResources public API", () => {
  it("기존 package와 headless와 Resource entry에서 typed reader 검색을 사용할 수 있다", () => {
    const ref = createResourceRef("folder", "00000000-0000-4000-8000-000000000001");
    const input: ResourceSearchInput = {
      query: " React ㅅㅌ ",
      candidates: [ref],
      readers: {
        content: createStaticCatalog<Content>([]),
        folder: createStaticCatalog<Folder>([{ ref, name: "React 상태" }]),
        externalShortcut: createStaticCatalog<ExternalShortcut>([]),
      },
    };
    const expected: readonly ResourceSearchMatch[] = [{ ref, tier: "exact" }];
    expect(normalizeResourceSearchQuery(input.query)).toBe("react ㅅㅌ");
    expect(searchResources(input)).toEqual(expected);
    expect(headlessSearchResources(input)).toEqual(expected);
    expect(featureSearchResources(input)).toEqual(expected);
  });
});
