# HDJG-22 raw style evidence

이 디렉터리는 `seojaewan/seojaewan-blog`의 HDJG-22를 위한 revision-pinned 원시 UI
증거를 보관한다. `style-inventory.json`은 현재 UI/Shell/source tree와 원본
reference repository에서 확인한 값, 상태, Story fixture, Shell 상수, 문서 비교값과
명시적 증거 공백을 기록한다. 제품 코드나 디자인 토큰의 source of truth가 아니다.

## Provenance

- Project/work item: `seojaewan/seojaewan-blog` / `HDJG-22`
- Current implementation: `github.com/seojaewan/seojaewan-blog` at
  `f810a22f600ea5b4e3237e5cae8cd8c78f16da92`
- Original reference: `github.com/seojaewan/blog` at
  `ef82382c01d16b08103d99ca231f67259e72f0ba`
- Current evidence comes from `packages/ui/src`, `packages/shell/src`, and scoped
  `.codex` layout/rule documents. Original evidence is read-only comparison material.
  Legacy values are evidence, not automatic copy targets.

Both repositories were checked clean at the revisions above before collection. Paths,
selectors/components, Story IDs, and revisions remain on every record so a value can be
traced without relying on this summary.

## Scope and counts

The JSON array contains 55 records across exactly five surfaces:

| Surface      | Records | Role in this inventory                                   |
| ------------ | ------: | -------------------------------------------------------- |
| Bottom Sheet |       1 | Explicit missing-implementation evidence only            |
| Context Menu |      10 | Root/submenu surface, rows, states, motion, positioning  |
| Folder       |      15 | Viewer, sidebar, grid/cards, category, loading/reference |
| Taskbar      |      13 | Root, buttons, panel lifecycle, disabled/reference       |
| Window       |      16 | Frame/chrome/input, motion, Story and reference evidence |

The same JSON yields 46 current-repository records and 9 original-reference records.
Evidence kinds are: 24 `source-literal`, 8 `variable-reference`, 1
`variable-declaration`, 6 `story-fixture`, 3 `shell-constant`, 2 `planned-doc`,
1 `computed-evidence`, 9 `legacy-source-literal`, and 1 `gap`. Cross-state counts
are 42 `stable`, 4 `stable-disabled`, 6 `entering`, 2 `exiting`, and 1
`loading`.

## Deterministic collection and normalization

Collection is a revision-pinned inspection, not a browser measurement or token extractor.
Records are sorted by surface, repository, path, selector/component, native state,
property, then raw value. Re-running against the same two revisions with the same rules
must preserve that order.

Normalization trims representational differences while retaining `raw_value`:

- durations expressed in seconds may be converted to milliseconds;
- Shell numeric DOM coordinates/timeouts receive their explicit `px` or `ms` unit;
- CSS variable references remain raw references while `normalized_value` may show the
  revision-local declaration they resolve to;
- grouped view modes or axis values keep their labels, so equal normalized values never
  merge distinct selectors, elements, native states, sources, or roles;
- Tailwind class evidence from the original repository remains a class literal rather
  than being treated as a current computed style;
- `computed-evidence` documents only a reproducible relationship between cited source
  literals. It is not a browser screenshot or a new source value.

Dynamic window bounds, runtime-measured menu coordinates, viewport-dependent computed
pixels, font rasterization, image contents, and unresolved custom properties are not
invented. Their formulas or unresolved references are retained and described in
`notes`.

## Record schema

Every record includes:

- provenance: `source_repository`, `source_revision`, `source_path`,
  `selector_or_component`;
- identity/state: `surface`, `element`, `native_state`, `cross_state`;
- value: `property`, `raw_value`, `normalized_value`;
- classification: `evidence_kind`, `candidate_layer`, `candidate_role`;
- reproduction/context: `story_id`, `viewport_or_container`;
- audit: `confidence`, `notes`, `evidence_status`.

`native_state` preserves component vocabulary such as hover, focus-visible, expanded,
editing, fullscreen, dragging, loading, disabled, and reduced-motion. `cross_state`
separately maps stable, stable-disabled, entering, exiting, and loading. This keeps Core
semantic state distinct from Shell-owned presentation lifecycle.

`candidate_layer` and `candidate_role` are provisional evidence labels only. They do
not create CSS custom properties, runtime exports, or approved Reference → Semantic →
Component token mappings. HDJG-23 owns review and promotion of any candidate. Raw
evidence in this directory remains separate from that future decision.

## Bottom Sheet gap and exclusions

There is exactly one Bottom Sheet record. It has
`evidence_status = "missing-implementation-evidence"`, null raw/normalized and candidate
fields, no Story or viewport value, and `future_owner = "HDJG-36"`. No taskbar panel,
legacy BottomBar, planned layout, or inferred mobile pattern is used as Bottom Sheet
implementation evidence.

Excluded from this packet: screenshots, a visual runner, generated token files, runtime
exports, dependency/config/CI changes, and all product-code changes. Later human-readable
inventory and visual-baseline documents are separate task outputs and must derive their
counts and claims from this JSON.
