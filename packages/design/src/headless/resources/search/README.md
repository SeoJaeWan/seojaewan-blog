# Resource 검색

기존 ResourceRef 후보와 typed Catalog reader에서 공통 matching과 ranking을 계산하는 pure API다. Resource 원본이나 identity를 재정의하지 않고 ref와 일치 tier를 반환한다. 제품별 후보 범위·주소 판별·화면 투영·recent·debounce·IME·focus는 소비 제품이 연결한다.

## 진입점과 사용

`searchResources`, `normalizeResourceSearchQuery`, `ResourceSearchInput`, `ResourceSearchMatch`, `ResourceSearchTier`는 resources, headless와 package 공개 entry에서 사용할 수 있다.

```ts
// candidates는 제품이 허용한 ResourceRef 목록이다.
// readers는 기존 Content/Folder/ExternalShortcut Catalog reader 집합이다.
const rawQuery = "  React ㅅㅌ  ";
const matches = searchResources({ query: rawQuery, candidates, readers });
// [{ ref, tier: "exact" | "prefix" | "contains" | "words" | "metadata" }, ...]
const isEmptyQuery = normalizeResourceSearchQuery(rawQuery) === "";
```

검색은 원문을 NFC·대소문자 무시·whitespace 축약 기준으로 비교한다. 일반 문자와 한글 음절 초성의 혼합을 지원하며 여러 단어는 AND다. Content는 title·각 tag·slug를, Folder와 ExternalShortcut은 현재 name을 사용한다. 여러 단어가 필드에 걸쳐 충족될 수 있지만 한 단어를 필드 경계에서 이어 붙이지 않는다.

전체 name/title exact → 전체 문구 prefix → contains → name/title 단어 AND → Content metadata 필요 순으로 정렬한다. 같은 tier에서는 Content → Folder → ExternalShortcut, Content date 최신순 또는 현재 이름의 명시적 ko-KR 순서, 마지막 id 고정 문자열 순서를 적용한다. 날짜를 해석할 수 없는 Content는 같은 종류·tier의 유효 날짜 뒤에서 id 순서로 정렬한다.

빈 정규화 query는 reader를 조회하지 않고 빈 결과를 반환한다. 제품의 기본 화면은 이 결과와 별개로 소비 제품이 선택한다. 중복 ref는 한 번만 반환하며 없는 후보는 제외한다. 모든 결과를 반환하므로 표시 상한과 scroll도 제품 책임이다. reader의 오류는 전파하고 입력 배열·원본·raw query는 변경하지 않는다.

Folder reader는 호출 시 Workspace 초기화가 완료되어 조회할 수 있어야 한다. 매 검색마다 typed reader의 현재 원본을 읽으므로 Folder 이름 변경을 별도 검색 index에 복제할 필요가 없다. 원본에서 경로·URL·summary·body를 검색하지 않으며 주소/경로 parser 대신 사용하지 않는다.

## 파일과 검증

- [index.ts](./index.ts): 공개 계약과 selector 재노출.
- [model/index.ts](./model/index.ts): 입력·결과·tier type.
- [selectors/index.ts](./selectors/index.ts): 정규화·matching·정렬.
- [selectors.test.ts](./selectors/selectors.test.ts): 일반·초성·혼합·AND·ranking·tie·원본 불변 fixture.
- [resourceSearchPublic.test.ts](../../../testing/resourceSearchPublic.test.ts): 기존 공개 entry의 소비 예제.

```sh
pnpm --filter @window/design exec vitest run --project headless src/headless/resources src/testing/resourceSearchPublic.test.ts src/testing/architecture.test.ts
pnpm --filter @window/design typecheck
```

정본은 Workbench Local Work Memory project `seojaewan/seojaewan-blog`의 `resource-search`(공통 Resource 검색 계약), `resource-model`, `workspace-resource-placement`다. 검색을 소비하는 제품의 별도 수명·navigation 계약도 함께 따른다. Explorer·Chrome의 기존 검색 연결은 후속 작업이다.
