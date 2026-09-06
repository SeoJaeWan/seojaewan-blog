import type { ResourceId } from "../resources/index.js";

/** Application-owned source of globally unique Resource UUIDs. */
export type IdGenerator = Readonly<{
  generateId(): ResourceId;
}>;
