import type { ResourceRef } from "./model.js";
import type { ResourceId } from "./resourceId.js";

export type CatalogResource = Readonly<{
  ref: ResourceRef;
}>;

export type StaticCatalog<Resource extends CatalogResource> = Readonly<{
  has(id: ResourceId): boolean;
  get(id: ResourceId): Resource | undefined;
  list(): readonly Resource[];
}>;

export class DuplicateResourceIdError extends Error {
  readonly id: ResourceId;

  constructor(id: ResourceId) {
    super(`ResourceId is already used in the global namespace: ${id}`);
    this.name = "DuplicateResourceIdError";
    this.id = id;
  }
}

export const assertUniqueResourceIds = (resources: Iterable<CatalogResource>): void => {
  const ids = new Set<ResourceId>();

  for (const resource of resources) {
    if (ids.has(resource.ref.id)) {
      throw new DuplicateResourceIdError(resource.ref.id);
    }

    ids.add(resource.ref.id);
  }
};

const snapshotResource = <Resource extends CatalogResource>(resource: Resource): Resource =>
  Object.freeze({
    ...resource,
    ref: Object.freeze({ ...resource.ref }),
  });

export const createStaticCatalog = <Resource extends CatalogResource>(
  resources: readonly Resource[],
): StaticCatalog<Resource> => {
  const entries = Object.freeze(resources.map(snapshotResource));
  assertUniqueResourceIds(entries);

  const resourcesById = new Map(entries.map((resource) => [resource.ref.id, resource]));

  class Catalog {
    private constructor() {}

    static has(id: ResourceId): boolean {
      return resourcesById.has(id);
    }

    static get(id: ResourceId): Resource | undefined {
      return resourcesById.get(id);
    }

    static list(): readonly Resource[] {
      return entries;
    }
  }

  return Catalog;
};
