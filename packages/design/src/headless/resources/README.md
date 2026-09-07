# Resources

Resource의 전역 identity, 종류별 원본, 직렬화 가능한 참조와 조회 계약을 제공한다. 위치나 사용자 변경 상태는 [Workspace](../workspace/README.md)가 소유한다. 전체 연결과 정본 문서 위치는 [Headless 안내](../README.md)를 따른다.

## 파일별 역할

| 파일                                                               | 역할                                          | 인접 테스트                                                       |
| ------------------------------------------------------------------ | --------------------------------------------- | ----------------------------------------------------------------- |
| [index.ts](./index.ts)                                             | Resource public API 재노출                    | 자체 동작 없음                                                    |
| [resourceId/index.ts](./resourceId/index.ts)                       | UUID brand, 판별·파싱, 형식 오류              | [resourceId.test.ts](./resourceId/resourceId.test.ts)             |
| [model/index.ts](./model/index.ts)                                 | 종류별 원본과 ref type, ref 생성·파싱         | [model.test.ts](./model/model.test.ts)                            |
| [staticCatalog/index.ts](./staticCatalog/index.ts)                 | 고정 목록의 `has/get/list`, 입력 ID 중복 검증 | [staticCatalog.test.ts](./staticCatalog/staticCatalog.test.ts)    |
| [resourceLookup/index.ts](./resourceLookup/index.ts)               | 종류별 reader 계약과 전역 존재 확인 조합      | [resourceLookup.test.ts](./resourceLookup/resourceLookup.test.ts) |
| [contentDocumentReader/index.ts](./contentDocumentReader/index.ts) | Content metadata와 body를 비동기로 읽는 port  | type-only; 구현은 Application 책임                                |

## 원본, 참조, 조회의 차이

- `ResourceId`: 종류를 가로질러 공유하는 UUID. 형식 검증은 실제 원본의 존재 확인과 다르다.
- `ResourceRef`: `{ kind, id }`만 전달하는 참조. title, URL, Folder parent를 복사하지 않는다.
- `Content`, `Folder`, `ExternalShortcut`: 각각 metadata, 이름, 외부 링크 등의 원본. Folder의 parent는 여기에 없다.
- `StaticCatalog`: ID로 해당 종류의 원본을 `has/get/list`한다. Content와 ExternalShortcut의 구체 entries는 Application이 제공한다.
- `ResourceLookup`: ref의 존재 여부만 확인한다. 원본이나 Workspace 배치를 반환하지 않는다.
- `ContentDocumentReader`: 본문이 필요할 때 metadata와 body block을 함께 읽는다. 렌더링이나 목록 조회는 하지 않는다.

## 고정 Catalog 사용 예제

아래 symbol은 공개 진입점에서 가져온 것으로 가정한다. UUID는 예제용 고정값이며 실제 entries는 Application이 관리한다.

```ts
const shortcutRef = createResourceRef("external-shortcut", "e0a21641-6a0a-4ddd-a798-b7e568fe21ed");
const shortcuts = createStaticCatalog([
  { ref: shortcutRef, name: "문서", url: "https://example.com/docs" },
]);

shortcuts.has(shortcutRef.id); // true
shortcuts.get(shortcutRef.id); // 원본 또는 undefined
shortcuts.list(); // 생성 당시 순서의 읽기 전용 목록
```

`createResourceRef`는 UUID를 검증하고 ref를 동결한다. ref에는 primitive 필드만 있으므로 이 얕은 동결로 ref 변경을 막을 수 있다. TypeScript의 `Readonly`와 달리 `Object.freeze`는 runtime에서도 적용된다.

`createStaticCatalog`는 입력 목록, 각 원본의 top-level과 ref를 복제·동결한다. `Content.tags`나 `source` 같은 중첩 metadata까지 깊게 복제·동결하지는 않는다. 입력 원본의 중첩 데이터를 이후 수정하지 않는 것이 필요하다.

## Workspace와 조합할 때

`createResourceLookup({ content, folder, externalShortcut })`는 생성 시와 각 존재 조회 시 세 reader의 현재 목록을 합쳐 전역 ID 중복을 검사한다. 같은 ID를 다른 kind에서 재사용해도 오류다. 그 뒤 ref.kind에 해당하는 reader의 `has`를 호출한다.

Folder의 실제 reader는 [FolderCatalog](../workspace/folderCatalog/index.ts)이며 Store의 최신 `folders`를 읽는다. Store는 정적 Catalog만 최초 연결하여 초기화하고, 완료 후 이 FolderCatalog를 포함하는 전체 lookup을 구성한다. [Workspace 초기화 예제](../workspace/README.md#snapshot과-초기화)를 따른다. 초기화 전 FolderCatalog 조회는 여전히 허용하지 않는다.

Content를 이동하거나 Folder를 생성하는 작업은 Catalog 메서드가 아니라 `WorkspaceStore` 명령을 사용한다. 본문 조회나 외부 링크 열기는 Workspace 배치 변경과 별개의 동작이다.
