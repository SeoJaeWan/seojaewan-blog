/**
 * @file immutable Resource snapshot을 조회하는 공통 static Catalog를 구현한다.
 *
 * runtime 등록과 persistence는 이 파일의 책임이 아니다.
 */
import type { ResourceRef } from "../model/index.js";
import type { ResourceId } from "../resourceId/index.js";

/**
 * 공통 static Catalog에 저장할 수 있는 최소 Resource 원본 형태다.
 *
 * kind별 metadata는 제한하지 않으며, 구체 Resource type이 `ref` 외의 필드를 소유한다.
 */
export type CatalogResource = Readonly<{
  ref: ResourceRef;
}>;

/**
 * 객체 instance 없이 Resource 원본을 조회하는 static Catalog 계약이다.
 *
 * mutable 등록과 persistence는 제공하지 않으며, concrete entries는 Application이 소유한다.
 */
export type StaticCatalog<Resource extends CatalogResource> = Readonly<{
  /**
   * 이 Catalog에 해당 ID의 원본이 있는지 확인한다.
   *
   * 다른 Catalog의 존재 여부는 확인하지 않는다.
   */
  has(id: ResourceId): boolean;
  /**
   * 해당 ID의 원본을 반환하고 없으면 undefined를 반환한다.
   *
   * Workspace 배치나 본문을 추가 조회하지 않는다.
   */
  get(id: ResourceId): Resource | undefined;
  /**
   * 이 Catalog가 제공하는 원본 목록을 읽는다.
   *
   * 목록 변경은 제공하지 않으며 구체 구현이 snapshot의 lifecycle을 소유한다.
   */
  list(): readonly Resource[];
}>;

/**
 * 둘 이상의 Resource가 같은 전역 `ResourceId`를 사용할 때 발생한다.
 *
 * UUID 형식 오류는 나타내지 않으며, 해당 경계에서는 `InvalidResourceIdError`를 사용한다.
 */
export class DuplicateResourceIdError extends Error {
  readonly id: ResourceId;

  /**
   * 충돌한 ID를 포함하는 진단 오류를 만든다.
   *
   * 중복 검사 자체는 호출한 검증 경계에서 수행한다.
   */
  constructor(id: ResourceId) {
    super(`전역 Resource namespace에서 이미 사용 중인 ResourceId입니다: ${id}`);
    this.name = "DuplicateResourceIdError";
    this.id = id;
  }
}

/**
 * 주어진 Resource 집합이 전역적으로 고유한 ID만 사용하는지 검증한다.
 *
 * Catalog를 생성하거나 Resource를 수정하지 않으며, 중복 시 `DuplicateResourceIdError`를 던진다.
 */
export const assertUniqueResourceIds = (resources: Iterable<CatalogResource>): void => {
  const ids = new Set<ResourceId>();

  for (const resource of resources) {
    if (ids.has(resource.ref.id)) {
      throw new DuplicateResourceIdError(resource.ref.id);
    }

    ids.add(resource.ref.id);
  }
};

/** 입력 Resource의 top-level 값과 ref를 복제하고 동결해 Catalog snapshot으로 만든다. */
const snapshotResource = <Resource extends CatalogResource>(resource: Resource): Resource =>
  Object.freeze({
    ...resource,
    ref: Object.freeze({ ...resource.ref }),
  });

/**
 * 고정된 Resource 목록으로 static `has`, `get`, `list` Catalog를 만든다.
 *
 * runtime 등록과 persistence는 소유하지 않으며, 입력 목록의 top-level snapshot만 보존한다.
 */
export const createStaticCatalog = <Resource extends CatalogResource>(
  resources: readonly Resource[],
): StaticCatalog<Resource> => {
  const entries = Object.freeze(resources.map(snapshotResource));
  assertUniqueResourceIds(entries);

  const resourcesById = new Map(entries.map((resource) => [resource.ref.id, resource]));

  class Catalog {
    /** instance 생성을 막고 고정 entries를 정적 메서드로만 노출한다. */
    private constructor() {}

    /**
     * 생성 당시 snapshot에 해당 ID가 있는지 확인한다.
     *
     * 외부 입력 목록의 이후 변경은 반영하지 않는다.
     */
    static has(id: ResourceId): boolean {
      return resourcesById.has(id);
    }

    /**
     * 생성 당시 보존한 원본을 ID로 읽고 없으면 undefined를 반환한다.
     *
     * 반환 객체의 top-level과 ref만 동결하며 중첩 metadata를 깊게 복제하지 않는다.
     */
    static get(id: ResourceId): Resource | undefined {
      return resourcesById.get(id);
    }

    /**
     * 생성 시 입력 순서대로 보존한 동일한 읽기 전용 목록을 반환한다.
     *
     * 조회마다 복사하거나 새로운 원본을 등록하지 않는다.
     */
    static list(): readonly Resource[] {
      return entries;
    }
  }

  return Catalog;
};
