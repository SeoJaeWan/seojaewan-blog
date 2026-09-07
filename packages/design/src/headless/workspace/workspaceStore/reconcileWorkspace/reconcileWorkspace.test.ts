import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  type ContentResourceRef,
  createResourceRef,
  type ResourceLookup,
  type ResourceRef,
} from "../../../resources/index.js";
import type { WorkspaceState } from "../../model/index.js";
import { reconcileWorkspace } from "./index.js";

/**
 * 고정 UUID suffix와 Resource kind로 테스트용 ref를 만든다.
 */
const ref = <Kind extends ResourceRef["kind"]>(kind: Kind, suffix: string) =>
  createResourceRef(kind, `00000000-0000-4000-8000-${suffix}`);

/**
 * 지정한 Resource들만 존재하는 읽기 lookup fake를 만든다.
 */
const lookupFor = (
  resources: readonly ResourceRef[],
  observedKinds: ResourceRef["kind"][] = [],
): ResourceLookup => {
  const keys = new Set(resources.map((resource) => `${resource.kind}:${resource.id}`));
  return {
    /**
     * fixture에 주어진 Resource의 존재 여부를 반환한다.
     */
    hasResource(resource) {
      observedKinds.push(resource.kind);
      return keys.has(`${resource.kind}:${resource.id}`);
    },
  };
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(globalThis.crypto, "randomUUID").mockImplementation(() => {
    throw new Error("이 테스트에서는 ID를 발급하면 안 됩니다");
  });
});

describe("reconcileWorkspace", () => {
  it("저장된 Folder 이름, hierarchy와 사용자가 이동한 Content를 보존한다", () => {
    const inbox = ref("folder", "000000000001");
    const nested = ref("folder", "000000000002");
    const content = ref("content", "000000000003");
    const state: WorkspaceState = {
      schemaVersion: 1,
      contentInbox: inbox,
      folders: [
        { ref: inbox, name: "Writing" },
        { ref: nested, name: "Published" },
      ],
      placements: [
        { resource: inbox, parent: null },
        { resource: nested, parent: inbox },
        { resource: content, parent: null },
      ],
    };
    const before = JSON.stringify(state);

    const reconciled = reconcileWorkspace({
      state,
      currentContent: [content],
      resourceLookup: lookupFor([content]),
    });

    expect(reconciled).toEqual(state);
    expect(JSON.stringify(state)).toBe(before);
    expect(reconciled).not.toBe(state);
  });

  it("stale, duplicate, missing parent, self-parent와 cycle을 결정적으로 수리한다", () => {
    const first = ref("folder", "000000000001");
    const second = ref("folder", "000000000002");
    const third = ref("folder", "000000000003");
    const selfParent = ref("folder", "000000000004");
    const withoutPlacement = ref("folder", "000000000005");
    const missingParent = ref("folder", "000000000099");
    const keptContent = ref("content", "000000000010");
    const orphanContent = ref("content", "000000000011");
    const staleContent = ref("content", "000000000012");
    const staleShortcut = ref("external-shortcut", "000000000013");
    const newContent = ref("content", "000000000014");
    const observedKinds: ResourceRef["kind"][] = [];
    const state: WorkspaceState = {
      schemaVersion: 1,
      contentInbox: first,
      folders: [
        { ref: first, name: "First" },
        { ref: second, name: "Second" },
        { ref: third, name: "Third" },
        { ref: selfParent, name: "Self" },
        { ref: withoutPlacement, name: "Missing placement" },
      ],
      placements: [
        { resource: second, parent: third },
        { resource: first, parent: second },
        { resource: third, parent: first },
        { resource: selfParent, parent: selfParent },
        { resource: keptContent, parent: first },
        { resource: keptContent, parent: second },
        { resource: orphanContent, parent: missingParent },
        { resource: staleContent, parent: first },
        { resource: staleShortcut, parent: null },
      ],
    };
    const lookup = lookupFor([keptContent, orphanContent, newContent], observedKinds);

    const reconciled = reconcileWorkspace({
      state,
      currentContent: [keptContent, newContent],
      resourceLookup: lookup,
    });

    expect(reconciled.placements).toEqual([
      { resource: second, parent: third },
      { resource: first, parent: second },
      { resource: third, parent: null },
      { resource: selfParent, parent: null },
      { resource: keptContent, parent: first },
      { resource: orphanContent, parent: null },
      { resource: withoutPlacement, parent: null },
      { resource: newContent, parent: first },
    ]);
    expect(reconciled.folders).toEqual(state.folders);
    expect(observedKinds).not.toContain("folder");
    expect(JSON.parse(JSON.stringify(reconciled))).toEqual(reconciled);

    const secondPass = reconcileWorkspace({
      state: reconciled,
      currentContent: [keptContent, newContent],
      resourceLookup: lookup,
    });
    expect(secondPass).toEqual(reconciled);
  });

  it("missing inbox를 새 Blog Folder로 복구하고 새 Content를 그 아래 둔다", () => {
    const missingInbox = ref("folder", "000000000099");
    const existing = ref("folder", "000000000001");
    const movedContent = ref("content", "000000000002");
    const newContent = ref("content", "000000000003");
    const recoveredInbox = ref("folder", "000000000004");
    const state: WorkspaceState = {
      schemaVersion: 1,
      contentInbox: missingInbox,
      folders: [{ ref: existing, name: "Personal" }],
      placements: [
        { resource: existing, parent: null },
        { resource: movedContent, parent: existing },
      ],
    };
    const generateId = vi
      .spyOn(globalThis.crypto, "randomUUID")
      .mockReturnValue(recoveredInbox.id as `${string}-${string}-${string}-${string}-${string}`);

    const reconciled = reconcileWorkspace({
      state,
      currentContent: [movedContent, newContent, newContent] as readonly ContentResourceRef[],
      resourceLookup: lookupFor([movedContent, newContent]),
    });

    expect(generateId).toHaveBeenCalledOnce();
    expect(reconciled.contentInbox).toEqual(recoveredInbox);
    expect(reconciled.folders).toEqual([
      { ref: existing, name: "Personal" },
      { ref: recoveredInbox, name: "Blog" },
    ]);
    expect(reconciled.placements).toEqual([
      { resource: existing, parent: null },
      { resource: movedContent, parent: existing },
      { resource: recoveredInbox, parent: null },
      { resource: newContent, parent: recoveredInbox },
    ]);

    const secondPass = reconcileWorkspace({
      state: reconciled,
      currentContent: [movedContent, newContent],
      resourceLookup: lookupFor([movedContent, newContent]),
    });
    expect(secondPass).toEqual(reconciled);
  });

  it("IdGenerator가 기존 UUID를 반환하면 missing inbox 복구를 중단한다", () => {
    const missingInbox = ref("folder", "000000000099");
    const existing = ref("folder", "000000000001");
    const state: WorkspaceState = {
      schemaVersion: 1,
      contentInbox: missingInbox,
      folders: [{ ref: existing, name: "Existing" }],
      placements: [{ resource: existing, parent: null }],
    };

    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(
      existing.id as `${string}-${string}-${string}-${string}-${string}`,
    );
    expect(() =>
      reconcileWorkspace({
        state,
        currentContent: [],
        resourceLookup: lookupFor([]),
      }),
    ).toThrow(`IdGenerator가 이미 사용 중인 ResourceId를 반환했습니다: ${existing.id}`);
  });
});
