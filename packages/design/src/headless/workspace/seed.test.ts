import { describe, expect, it } from "vitest";

import { createResourceRef } from "../resources/index.js";
import { createWorkspaceSeed } from "./seed.js";

describe("createWorkspaceSeed", () => {
  it("Desktop의 Blog inbox와 그 아래의 초기 Content placement를 만든다", () => {
    const inbox = createResourceRef("folder", "00000000-0000-4000-8000-000000000001");
    const first = createResourceRef("content", "00000000-0000-4000-8000-000000000002");
    const second = createResourceRef("content", "00000000-0000-4000-8000-000000000003");
    const content = [first, second, first] as const;

    const state = createWorkspaceSeed({ contentInbox: inbox, content });

    expect(state).toEqual({
      schemaVersion: 1,
      contentInbox: inbox,
      folders: [{ ref: inbox, name: "Blog" }],
      placements: [
        { resource: inbox, parent: null },
        { resource: first, parent: inbox },
        { resource: second, parent: inbox },
      ],
    });
    expect(content).toEqual([first, second, first]);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });
});
