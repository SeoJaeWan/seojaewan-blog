# Notion Content Pipeline Model

## Purpose

`window-blog`에서 Notion을 CMS로 쓰는 콘텐츠 파이프라인의 설계 모델이다.

원본 `blog`(neu-blog) 프로젝트의 Notion 연동을 분석한 결과를 근거로, 새 구현이 피해야 할 구조와
채택할 구조를 먼저 고정한다. 구현 코드보다 결정과 근거를 기록하는 문서다.

## Source Evidence (원본 분석)

- 원본 코어: `/c/Users/sjw73/OneDrive/Desktop/dev/blog/src/lib/notion/core.ts`
- 원본 HTML 변환기: `src/lib/notion/notionToHtml.ts`
- 원본 파서/에러: `src/lib/notion/parser.ts`, `src/lib/notion/error.ts`
- 원본 상세 렌더: `src/components/templates/detailPage/index.tsx` (SSR HTML),
  `src/components/molecules/notionViewer/NotionContentUI.tsx` (react-notion-x)

## 원본 구조와 문제

원본은 같은 콘텐츠를 **두 파이프라인으로 두 번** 가져와 두 번 렌더한다.

```txt
공식 API(@notionhq/client, NOTION_API_KEY)
  dataSources.query → pages.retrieve + blocks.children.list
  → 자체 renderBlocksToHtml → HTML 문자열
  → DetailPage에서 dangerouslySetInnerHTML (SEO용 SSR)

비공식 API(notion-client, NOTION_TOKEN_V2)
  getPage → recordMap 전체
  → jotai store → 창 UI에서 react-notion-x 렌더 (실제 화면용)
```

| 문제            | 내용                                                                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 중복 전송       | SSR HTML + recordMap(수백 KB)이 같은 본문을 이중으로 전송. Lighthouse 저하의 직접 원인                                                                       |
| 비공식 API 의존 | `TOKEN_V2`는 개인 세션 토큰 — 만료 시 빌드 파손, 사설 API라 변경 리스크 상시 존재                                                                            |
| 변환기 미완성   | children 재귀 없음(토글/중첩 리스트 소실), 페이지네이션 없음(100블록 초과 잘림), 표 placeholder, 컬럼·수식 미지원. 이 미완성이 react-notion-x를 못 버린 원인 |
| 만료 이미지     | Notion 파일 URL은 1시간 서명 URL — SSG HTML에 구워지면 만료 후 본문/OG 이미지 파손. 원본은 GitHub 수동 업로드로 회피(만료는 없지만 글마다 수작업)            |
| slug 설계       | 제목에서 즉석 생성 — 제목 수정 시 URL 파손, slug 1건 해석에 카테고리 목록 전체 재쿼리                                                                        |
| 캐싱 부재       | React `cache()`는 렌더 패스 내 dedupe일 뿐. revalidate는 주석 처리 — 콘텐츠 갱신 = 재배포                                                                    |

### ISR 규모 문제 (글 100개 이상 가정)

Notion API 실질 제한은 평균 3 req/s다. 시간 기반 ISR은 이 규모에서 다음이 겹친다.

- 빌드: 목록 3개 + 글당 3~4콜 → 수백 콜, 429 리스크. 글 수에 선형 악화
- 재검증 폭풍: 크롤러가 훑으면 TTL 지난 페이지가 동시 재검증 → 순간 수백 콜 → 429 → stale 고착
- 헛수고: 변경 여부를 모르니 안 바뀐 글도 계속 재수집, 새 글은 TTL까지 미노출

결론: 시간 기반 ISR 단독은 부적합. **트리거를 시간에서 변경 이벤트로 바꾼다.**

## 새 설계 결정

### 1. 공식 API 단일화

- `@notionhq/client`(NOTION_API_KEY)만 사용한다. `NOTION_TOKEN_V2`, `notion-client`,
  `react-notion-x`는 도입하지 않는다.
- 변환기는 다음을 필수로 지원한다: 페이지네이션 cursor 루프(목록·블록 모두),
  `has_children` 재귀 수집, 리스트 그룹핑, 표, 토글(중첩 포함), 컬럼, 콜아웃, 수식.
- 원본의 `withRetry`/에러 분류(`error.ts`)는 잘 만들어져 있으므로 이식 대상이다.

### 2. 렌더링 — "Notion처럼 보이는 우리 소유 스타일"

원본이 react-notion-x를 쓴 실제 이유는 데이터가 아니라 **딸려오는 스타일시트**였다.
시각 스타일은 데이터 파이프라인과 분리 가능한 문제로 본다.

- 본문 렌더는 `packages/ui`의 **`components/notion/` 영역**이 소유한다. desktop/taskbar/window와
  같은 급의 영역 폴더로, 영역 루트에 `notionContent`(블록 트리 → 본문 전체), kind 폴더
  `block/`(블록별 컴포넌트 — callout, codeBlock, toggle, table, image 등)과 `richText/`
  (annotation·색상 인라인 렌더러)를 둔다. 스토리 title은 폴더 미러링 규칙을 따른다
  (`"Notion/NotionContentUI"`, `"Notion/Block/NotionCalloutUI"`).
- 변환 산출물은 HTML 문자열이 아니라 **정규화된 블록 트리(JSON)**다. HTML 문자열이면 ui가
  가질 것이 CSS + `dangerouslySetInnerHTML` wrapper뿐이라 컴포넌트 소유가 불가능하다.
  블록 트리 렌더는 토글 접기·코드 복사·이미지 확대 같은 인터랙션을 컴포넌트가 소유하게
  하고, XSS 표면을 없애며, 블록 단위 스토리 검증을 가능하게 한다.
- **ui는 `@notionhq/client` 타입에 의존하지 않는다.** ui가 자체 블록 union 타입
  (블록 인벤토리에서 확정한 지원 목록 = 그 union)을 정의하고, Notion 응답 → 그 타입 매핑은
  동기화 레이어가 담당한다. `TaskbarAppItem`/`WindowsPanelItem`과 같은 패턴 — ui는 "그리는 데
  필요한 데이터 모양"만 계약으로 선언한다.
- 매퍼가 anti-corruption layer다: 공식 구조(`block.callout.rich_text`, icon union 등)를 읽는
  코드는 매퍼 한 파일에만 존재한다. SDK 메이저 변경(v5 dataSources류)의 수정 범위가 매퍼로
  한정되고, "공식 API가 제공하는 요소만 쓴다"는 보증은 매퍼의 입력 타입(`BlockObjectResponse`)이
  담당한다 — API가 주지 않는 필드는 매퍼에서 채울 값이 없어 컴파일되지 않는다.
  `satisfies`로 블록 type 전수 매핑을 강제해 공식 타입에 새 블록이 생기면 컴파일 에러로 드러낸다.
- 블록 트리는 JSON으로 저장되는 산출물이므로 저장 스키마는 ui 타입이 소유한다 — SDK 버전이
  저장 포맷을 좌우하지 않게 한다.
- 스타일은 노션의 타이포·간격·콜아웃/코드 팔레트를 차용한다(react-notion-x CSS 참고 가능).
- 공식 API가 제공하는 시각 어휘: 텍스트/배경 색(블록·rich text `color`), bold/italic/code/
  취소선/밑줄, 링크, 인라인 수식, 콜아웃(아이콘+색), 토글, 표(헤더), 코드(언어+캡션),
  인용, 컬럼, to-do 체크, 이미지 캡션 — 개인 블로그 본문 어휘는 사실상 전부 온다.
- 공식 API의 실제 한계(짧고 명확): 본문 임베드 DB 뷰의 레이아웃, 페이지 폰트/전체 너비
  설정, 컬럼 비율 일부. 본문에 DB 뷰를 임베드하지 않는 것을 콘텐츠 규칙으로 둔다.
- 구현 전에 **블록 타입 인벤토리**를 먼저 뜬다: 전체 글을 순회해 등장 블록 타입을 집계
  → 지원 블록 목록이 유한한 스펙이 된다. 미지원 타입은 변환 시 경고 로그로 드러낸다.

### 3. 이미지 — 동기화 시점 자산화 (수동 업로드의 자동화)

글 작성 시에는 Notion에 이미지를 그냥 붙여넣는다. 동기화 단계가 자산화를 대신한다.

```txt
변환 중 image 블록(file type) 발견
→ 그 시점의 서명 URL은 유효하므로 즉시 다운로드
→ 내용 해시로 명명 (예: public/notion/{hash}.png) — 동일 이미지는 중복 저장 없음
→ 저장소 커밋 또는 스토리지(R2/S3) 업로드
→ 변환 HTML의 src를 자산 경로로 교체
```

- 사이트가 서빙하는 이미지는 전부 자체 자산 — 만료 없음(기존 GitHub 방식의 장점 유지).
- Notion 서명 URL은 다운로드하는 몇 초 동안만 사용하고 버린다.
- 커버(OG) 이미지도 동일하게 처리한다.
- 자산화는 반드시 동기화/빌드 시점에 한다. Vercel 런타임(ISR 재검증 포함)에서는 로컬
  파일시스템(`public/`) 쓰기가 서빙에 반영되지 않는다 — "재검증 중 public 저장"은 불가능한
  수단이다. (외부 스토리지 업로드나 프록시 route는 기술적으로 가능하지만 sync-to-repo 채택으로
  불필요해졌다 — 5번 참고)

### 4. slug — Notion 속성으로 승격

- Notion DB에 명시적 `Slug` 속성을 두고, 제목 파생 slug를 폐기한다.
- 단건 해석은 목록 스캔이 아니라 `Slug` equals filter 쿼리로 한다.
- 제목 수정이 URL을 바꾸지 않게 되고, slug 충돌은 작성 시점에 관리한다.

### 5. 갱신 트리거 — **sync-to-repo 채택 (B안 확정)**

두 방식 모두 무료 티어(Vercel Hobby, Notion 통합 웹훅, GitHub Actions)로 가능하지만
**B(sync-to-repo)를 채택한다.** 근거: 이미지 자산화가 sync 단계에 자연 내장되고(별도
스토리지/프록시 불필요), 요청·빌드 시점에 Notion 의존이 사라져 3 req/s 제한·429가 무관해지며,
타입 매퍼(결정 2)가 살 곳도 sync 단계라 파이프라인이 한 줄로 정렬된다.

|                     | A. on-demand revalidate (미채택)                                                                                                     | B. sync-to-repo (**채택**)                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| 흐름                | Notion 웹훅 → Route Handler(`app/api/revalidate`) → secret 검증 → 해당 page의 category/slug 계산 → `revalidatePath` (글 + 목록 경로) | Notion 웹훅 → GitHub Actions(`repository_dispatch`) → sync 스크립트가 변환·이미지 자산화·커밋 → push가 Vercel 자동 배포 트리거 |
| 재빌드              | 없음 — 해당 경로 캐시만 무효화, 다음 요청에서 그 페이지만 재렌더                                                                     | 커밋마다 전체 빌드(배포) 발생                                                                                                  |
| 요청 시 Notion 의존 | 남음 (재렌더 시 3~4콜)                                                                                                               | 없음 — 빌드가 로컬 산출물만 읽음. Notion 장애/제한과 완전 무관                                                                 |
| 새 글 노출          | `dynamicParams`(기본 true)로 첫 요청 시 on-demand 렌더                                                                               | 다음 배포부터                                                                                                                  |
| 이미지 자산화       | 별도 단계 필요(스토리지 업로드) — repo 커밋과 궁합 낮음                                                                              | sync 단계에 자연 통합                                                                                                          |

sync 실행 트리거는 단계적으로 확장한다 (전부 무료):

1. **수동(시작점)**: 글 작성 후 로컬에서 sync 명령 실행 → 커밋/푸시 → Vercel 자동 배포.
   인프라 0으로 파이프라인을 검증한다.
2. **cron 폴링**: GitHub Actions cron(30분~1시간)이 sync 실행. `last_edited_time` 비교로
   변경 없으면 커밋하지 않는다(= 배포도 없음). 웹훅 인프라 불필요, 공개 리포면 무료 무제한.
   즉시 발행이 필요하면 `workflow_dispatch` 수동 버튼.
3. **웹훅 글루(선택 확장)**: Notion 웹훅은 GitHub API를 직접 못 부르므로 Vercel route handler
   하나가 수신해 `repository_dispatch`를 호출한다. 글 저장 후 수 분 내 자동 반영.

주의(원본에서 실패했던 지점, A안을 재검토할 경우 대비 기록): 웹훅 수신은 **Route Handler**여야
한다. Server Action은 Next가 발급한 암호화 action id로만 호출되는 내부 RPC라 외부 서비스가
POST할 수 없다. revalidate는 재배포가 아니다 — 빌드가 다시 돌 필요가 없고, `output: "export"`나
`dynamicParams = false`가 설정돼 있으면 동작하지 않는다.

## Scope 경계

- 이 문서는 파이프라인 구조와 결정만 다룬다. 창 UI에서 본문을 어떻게 여는지는
  [[../layout/window.md]], 목록/아이콘 표현은 [[../layout/desktop.md]]의 소관이다.
- `packages/ui`는 `components/notion/` 영역(블록 트리 렌더 컴포넌트 + 본문 스타일)까지만
  소유한다. fetch·변환·이미지 자산화·Notion 타입 → ui 블록 타입 매핑은 앱/동기화 레이어
  소관이다. notion 영역은 다른 영역(window 등)을 import하지 않으며, 창 안에 본문을 넣는
  조립은 앱이 한다.

## Implementation Direction

1. 블록 타입 인벤토리 — **완료** (`scripts/notion-inventory.mjs` → [[inventory.md]]).
   18페이지·2,205블록 전수 조사 결과 **v1 미지원 블록 0건** — union 13종이 실사용을 전부
   커버한다. 주요 수치: 코드 100개(javascript 97 — 하이라이트 우선순위), 최대 중첩 3단,
   이미지 26개 전부 external(기존 GitHub 수동 업로드분 — 만료형 file 이미지는 아직 0건,
   자산화는 앞으로 붙여넣을 이미지 대비), 텍스트 색 사용 없음·배경색 2건.
2. `packages/ui/components/notion/` 영역 구현 — **완료 (v1)**. `types.ts`(블록 union 계약),
   영역 루트 `notionContent`(재귀/들여쓰기 소유), `notionRichText`(annotation·팔레트),
   kind 폴더 `block/`(callout·codeBlock·toggle·table·image·columns — 자식 블록은 ReactNode
   slot으로 받아 순환 참조 없음). fixture 스토리로 시각 검증.
   v1 블록 13종: paragraph, heading(1–3), bulletedList, numberedList, quote, callout,
   toggle, code(복사 버튼, 하이라이트는 sync 정적 처리 후속), image, table, columnList,
   equation(코드 스타일 fallback — KaTeX 후속), divider. 인벤토리(1번) 결과에 따라 증감한다.
3. sync 스크립트 — **완료** (`scripts/notion-sync.mts`, `pnpm sync`).
   수집(페이지네이션+재귀, <3rps) → 변경 감지(manifest `last_edited_time` — 재실행 시
   변경 없으면 API 3콜로 종료) → 매퍼(`Record<공식 블록 타입, 핸들러>` 전수 매핑 —
   SDK v5.22의 신규 타입 heading_4/tab 등을 컴파일 에러로 잡아낸 것으로 보증 검증됨)
   → 리스트 그룹핑(항목 762개 → 리스트 318개) → 이미지 자산화(만료형 file만 다운로드,
   external 통과) → `apps/web/content/notion/{manifest.json, {category}/{slug}.json}`.
   slug는 Notion `Slug` 속성 우선, 없으면 원본 generateSlug fallback(기존 URL 유지).
   타입 검증: `pnpm typecheck:scripts`.
4. 앱 통합 — **상세 페이지 완료** (`apps/web`). `src/lib/notionContent.ts`(fs 로더 —
   Notion API 무호출), `[category]/[slug]/page.tsx`(manifest 기반 `generateStaticParams`,
   metadata/OG, 18페이지 전부 SSG), `notionBody.tsx`(NotionContentUI의 클라이언트 경계 —
   코드 복사 버튼 인터랙션). 미지 slug는 404.
   주의: sync 산출물 JSON은 Tailwind v4 클래스 스캔에서 제외해야 한다
   (`globals.css`의 `@source not "../../content"`) — 본문 코드 예제의
   `bg-[url("...")]` 같은 문자열이 클래스로 오인돼 빌드가 깨진다.
   **데스크톱 셸 조립도 완료** (`apps/web/src/components/shell/`): 홈(`/`)이
   DesktopShell(원본 DesktopUI 대응)로, manifest 데이터 기반 바탕화면 아이콘·
   폴더 창(글 목록/커버/태그 필터/정렬)·파일 창(창 안 본문 — `/api/content`
   정적 JSON 엔드포인트를 fetch해 NotionContentUI 렌더)·taskbar(시작/검색/앱 목록/시계)를
   조립한다. 창 세션·z-order는 셸이 useState로 소유(규모 커지면 jotai 승격 검토),
   고정 상태는 localStorage 영속화. SSR은 배경만 그리고 셸은 mount 후 렌더
   (원본 hydration 가드) — SEO 본문은 상세 정적 페이지가 담당. 빌드 산출:
   정적 39페이지(상세 18 + 본문 JSON 18 + 홈/404), 요청 시 Notion 무의존.
   셸 개선 완료: **URL↔창 동기화** — 최상단 파일 창을 `history.replaceState`로 URL에
   반영(새로고침/공유 = 정적 글 페이지), 셸 재진입은 `/?open={category}[/{slug}]` 딥링크
   (상세 페이지의 "바탕화면에서 열기" 링크). 원본의 숨은 SSR article 오버레이(중복 HTML)는
   재도입하지 않는다. **hover preview 실화면** — ScaledPreviewUI + WindowFrameUI(overrideFullscreen)
   으로 폴더는 파일 카드 그리드, 파일은 FileWindow 캐시 본문을 축소 렌더(미리보기 위한
   fetch는 하지 않음). **모바일 클릭 열기** — matchMedia(≤768px) 기반 useIsMobile로
   아이콘/파일 카드가 클릭 열기로 전환.
5. 트리거 확장: 수동 → GitHub Actions cron → (선택) 웹훅 글루.
   **cron 단계 완료** (`.github/workflows/notion-sync.yml`): 주 1회 cron(월 09:17 KST) +
   `workflow_dispatch`(즉시 발행) + `repository_dispatch: notion-sync`(3단계 웹훅 글루 대비).
   sync 후 `content/notion`·`public/notion`에 diff 있을 때만 bot 커밋/푸시 → Vercel 배포.
   변경 없으면 커밋도 배포도 없음(sync 자체가 API 3콜로 종료). 주기는 발행 빈도에 맞춰
   주 1회로 — 글 발행 직후에는 `workflow_dispatch` 수동 실행이 기본 경로다.
   필요 repo secrets: `NOTION_API_KEY`, `NOTION_{BLOG,PROJECT,ABOUT}_DATABASE_ID`.
