import { describe, expect, it } from "vitest";

import { createResourceRef } from "../../resources/index.js";
import type {
  WorkspaceStoreCommandContext,
  WorkspaceStoreResult,
} from "../workspaceStore/index.js";
import { WorkspaceOperations, type WorkspaceOperationStore } from "./index.js";

/** 완료 시점을 제어하는 Promise와 resolver를 만든다. */
const deferred = <Value>() => {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
};

/** Operation executor가 시작하도록 한 microtask를 진행한다. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(resolve));

describe("WorkspaceOperations", () => {
  it("Folder commit을 저장 완료보다 먼저 알리고 settled는 저장을 기다린다", async () => {
    const folder = createResourceRef("folder", "20000000-0000-4000-8000-000000000001");
    const value = {
      schemaVersion: 1,
      contentInbox: folder,
      folders: [{ ref: folder, name: "자료" }],
      placements: [{ resource: folder, parent: null }],
    } as const;
    const save = deferred<WorkspaceStoreResult>();
    const store = {
      createFolder: (_name: string, _parent: null, context?: WorkspaceStoreCommandContext) => {
        context?.onCommit(value);
        return save.promise;
      },
    } as unknown as WorkspaceOperationStore;
    const operations = new WorkspaceOperations({ store });
    const handle = operations.execute({ type: "create-folder", name: "자료", parent: null });
    await flush();

    await expect(handle.committed).resolves.toEqual({ status: "committed", value });
    let settled = false;
    void handle.settled.then(() => {
      settled = true;
    });
    await flush();
    expect(settled).toBe(false);
    save.resolve({ ok: true, value });
    await expect(handle.settled).resolves.toMatchObject({ status: "settled" });
  });
});
