# HDJG-22 human-readable style inventory

This document is a deterministic interpretation of the committed
[`style-inventory.json`](./style-inventory.json). The JSON at TASK-001 result commit
`964a49854351a628691e226a12b62a6c140912e8` (tree
`7ff0be6f6441a4e8765fcdd421cd50077783e9b3`) is the only quantitative source for
the counts and observations below. Raw evidence, normalized representations, and
candidate classifications remain separate; none of them is an approved design token.

## Provenance and traceability

| Evidence source                                                                                                                    | Pinned revision                            | Records | Role                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------: | ----------------------------------------------------------------------------------------- |
| [`github.com/seojaewan/seojaewan-blog`](https://github.com/seojaewan/seojaewan-blog/tree/f810a22f600ea5b4e3237e5cae8cd8c78f16da92) | `f810a22f600ea5b4e3237e5cae8cd8c78f16da92` |      46 | Current repository source, Story, Shell, planned-documentation, derived, and gap evidence |
| [`github.com/seojaewan/blog`](https://github.com/seojaewan/blog/tree/ef82382c01d16b08103d99ca231f67259e72f0ba)                     | `ef82382c01d16b08103d99ca231f67259e72f0ba` |       9 | Read-only legacy reference evidence                                                       |
| **Total**                                                                                                                          | Two pinned revisions                       |  **55** | Exactly the JSON array                                                                    |

Every record retains `source_repository`, `source_revision`, `source_path`, and
`selector_or_component`; Story-backed records also retain `story_id` and a viewport or
container description. Consequently, the JSON—not this summary—is the record-level
traceability index. For example, the current context-menu surface points to
`packages/ui/src/components/base/menu/contextMenuUI/contextMenuUI.css` and
`.wb-context-menu__surface`, while the legacy comparison points to
`src/components/atoms/leftClickPanel/index.tsx` and `LeftClickPanel<div>` at the original
revision.

The inventory contains six Story fixtures, all with non-null Story IDs. The only record
without a viewport/container value is the explicit Bottom Sheet gap. The two
medium-confidence records are planned-documentation comparisons; the other 53 records
are high confidence.

## Five-surface inventory

Candidate-layer columns report evidence classifications only (`C` = component, `S` =
semantic, `R` = reference, `—` = null).

| Surface      | Records | Current repo | Original repo | Evidence status                                                               | Candidate layers (C/S/R/—) |
| ------------ | ------: | -----------: | ------------: | ----------------------------------------------------------------------------- | -------------------------: |
| Bottom Sheet |       1 |            1 |             0 | 1 missing-implementation-evidence                                             |                    0/0/0/1 |
| Context Menu |      10 |            9 |             1 | 9 observed-current; 1 observed-reference                                      |                    5/3/1/1 |
| Folder       |      15 |           11 |             4 | 10 observed-current; 4 observed-reference; 1 planned-documentation            |                    7/2/4/2 |
| Taskbar      |      13 |           11 |             2 | 11 observed-current; 2 observed-reference                                     |                    7/1/2/3 |
| Window       |      16 |           14 |             2 | 12 observed-current; 2 observed-reference; 1 planned-documentation; 1 derived |                    8/2/2/4 |
| **Total**    |  **55** |       **46** |         **9** | See status totals below                                                       |              **27/8/9/11** |

Surface observations remain revision-bound:

- Context Menu covers the root and submenu surfaces, row disabled/hover/focus-visible
  states, an 8 px viewport-positioning constant, a 200 px root width, an immediate Story
  fixture, and entering motion.
- Folder covers legacy reference material, current viewer/sidebar/grid/card/category and
  editing evidence, a narrow-container Story, one planned width comparison, and one
  legacy loading record.
- Taskbar covers legacy reference material, root geometry/backdrop, buttons and disabled
  presentation, panel lifecycle/opening/closing evidence, two Stories, and the 1,000 ms
  transition watchdog (explicitly a safety timeout, not a visual duration).
- Window covers legacy reference material, frame/chrome/editing styles, opening/closing
  motion, dragging/fullscreen states, two Stories, one planned transition comparison,
  the shared radius declaration, and one derived mobile-height relationship.
- Bottom Sheet contributes only the explicit gap described below.

## Evidence, property, and confidence coverage

| Evidence kind           | Count | Interpretation                                              |
| ----------------------- | ----: | ----------------------------------------------------------- |
| `source-literal`        |    24 | Current product-source literal                              |
| `legacy-source-literal` |     9 | Original-repository reference literal                       |
| `variable-reference`    |     8 | Raw CSS reference kept beside its resolved normalization    |
| `story-fixture`         |     6 | Reproduction fixture, not a token candidate                 |
| `shell-constant`        |     3 | Shell positioning, timeout, or lifecycle evidence           |
| `planned-doc`           |     2 | Medium-confidence comparison, not observed current CSS      |
| `variable-declaration`  |     1 | Shared radius declaration retained separately from uses     |
| `computed-evidence`     |     1 | Reproducible source relationship, not a browser measurement |
| `gap`                   |     1 | Missing Bottom Sheet implementation evidence                |

Evidence-status totals are 42 `observed-current`, 9 `observed-reference`, 2
`planned-documentation`, 1 `derived`, and 1 `missing-implementation-evidence`.

The 55 property records break down as follows:

| Property        | Count | Property     | Count |
| --------------- | ----: | ------------ | ----: |
| `background`    |     7 | `className`  |     6 |
| `animation`     |     5 | `width`      |     4 |
| `border-radius` |     3 | `box-shadow` |     3 |
| `gap`           |     2 | `height`     |     2 |
| `opacity`       |     2 | `transition` |     2 |

Each of the following occurs once: `--wb-radius-md`, `args.animated`, `args.dragging`,
`args.fullscreen`, `backdrop-filter`, `color`, `container-width`, `disabled`, `display`,
`implementation-evidence`, `media-query`, `panelStates`, `planned-animation`,
`planned-widths`, `style.animationDelay`, `TaskbarSearchUI.open`, `timeout`,
`viewport-padding`, and `visibility`.

## Native-state and cross-state coverage

`native_state` preserves component vocabulary; `cross_state` independently classifies
presentation lifecycle. The axes are not interchangeable.

| Cross state       | Count | Surface distribution                                            |
| ----------------- | ----: | --------------------------------------------------------------- |
| `stable`          |    42 | Bottom Sheet 1; Context Menu 8; Folder 14; Taskbar 7; Window 12 |
| `entering`        |     6 | Context Menu 1; Taskbar 2; Window 3                             |
| `stable-disabled` |     4 | Context Menu 1; Taskbar 3                                       |
| `exiting`         |     2 | Taskbar 1; Window 1                                             |
| `loading`         |     1 | Folder 1                                                        |

Native-state totals are: `stable` 21, `open` 6, `hover` 5, `dragging` 3, `fullscreen`
3, `disabled` 2, `editing` 2, `expanded` 2, `focus-visible` 2, and one each for `active`,
`close`, `closing`, `loading`, `missing`, `opening`, `opening-or-closing`,
`reduced-motion`, and `restore`.

The state evidence makes several distinctions auditable:

- Context Menu has disabled, hover, focus-visible, expanded, open, and entering evidence.
- Folder has hover, expanded, editing, loading, and reduced-motion evidence; the
  reduced-motion record is legacy reference evidence, and its JSON note says no current
  folder binding was found.
- Taskbar keeps dragging/disabled presentation separate from the panel's opening,
  stable, closing, and unmount lifecycle.
- Window keeps dragging suppression, fullscreen geometry, editing, focus-visible,
  opening, closing, and restore comparison evidence separate. The open-animation Story
  freezes the 200 ms animation at its midpoint with `style.animationDelay = -100ms`.

## Raw values, normalization, and repetition

There are four exact non-null raw-value duplicate groups:

| Raw value          | Records | Why they remain distinct                                                                    |
| ------------------ | ------: | ------------------------------------------------------------------------------------------- |
| `true`             |       3 | Taskbar dragging, Taskbar search-open, and Window fullscreen Story properties               |
| `0.54`             |       2 | Context Menu and Taskbar disabled opacity; both classify as `interaction.disabled.opacity`  |
| `12px`             |       2 | Taskbar active-indicator width and root item gap have different properties and roles        |
| `rgb(255 255 255)` |       2 | Folder viewer surface and Window route-input editing surface have different component roles |

Normalization produces six non-null duplicate groups. Four are the raw duplicates above;
two additional groups reveal a reference/declaration or reference/literal relationship:

| Normalized value         | Records | Raw evidence and classification                                                                                  |
| ------------------------ | ------: | ---------------------------------------------------------------------------------------------------------------- |
| `6px`                    |       2 | Window frame `var(--wb-radius-md)` use (`window.frame.radius`) and the `6px` declaration (`shape.radius.medium`) |
| `rgb(190 219 255 / 0.3)` |       2 | Folder category variable reference and file-card literal; both classify as `folder.item.hover-surface`           |

Exact normalized repetition crosses surfaces in three groups:

- `0.54` appears on Context Menu and Taskbar with the same semantic candidate role.
- `rgb(255 255 255)` appears on Folder and Window with distinct component roles.
- `true` appears on Taskbar and Window only as three distinct Story-fixture properties
  with null candidate fields.

These repetitions are discovery evidence, not permission to merge semantics. Raw values
remain visible even when normalization resolves a variable or adds a deterministic unit:
for example, the Context Menu transition normalizes `0.16` seconds to `160ms`, the
viewport padding normalizes `8` to `8px`, and the Taskbar watchdog normalizes `1000` to
`1000ms`.

## Candidate classification, not token decisions

The candidate-layer counts are 27 `component`, 8 `semantic`, 9 `reference`, and 11 null.
All nine reference-layer records are legacy source literals. Component classifications
comprise 21 source literals, 4 variable references, and 2 Shell constants. Semantic
classifications comprise 3 source literals, 4 variable references, and 1 variable
declaration.

There are 44 records with candidate roles and 42 distinct role labels. Only
`folder.item.hover-surface` and `interaction.disabled.opacity` repeat, twice each. The 11
null-candidate records are exactly six Story fixtures, two planned-doc records, one Shell
lifecycle constant, one computed relationship, and the Bottom Sheet gap.

The fields describe possible Reference → Semantic → Component classification only. They
do not create CSS custom properties, runtime exports, or promotion decisions. A later
token review must evaluate role equivalence while preserving the raw values, normalized
values, selectors/components, states, evidence kinds, confidence, and revisions captured
here.

## Uncertainties and gaps

- The planned Folder widths and planned Window restore animation are the only
  medium-confidence records. Their `planned-documentation` status keeps them separate
  from observed current CSS.
- The legacy Folder loading record retains unresolved
  `var(--animate-skeleton-shimmer)` by design.
- The legacy Taskbar dragging-disabled record retains the dynamic
  `boolean(isDragging)` normalization rather than inventing a runtime value.
- The Window mobile usable height is one `derived` record: it relates
  `calc(100% - 50px)` to the cited 50 px Taskbar height without merging the Window and
  Taskbar semantics.
- The inventory has no browser-measurement or screenshot evidence kind. Story fixtures
  and source relationships are the available reproduction evidence.

### Bottom Sheet handoff

Bottom Sheet has exactly one record and zero token candidates. Its property is
`implementation-evidence`; `raw_value`, `normalized_value`, `candidate_layer`,
`candidate_role`, `story_id`, and `viewport_or_container` are all null. Its
`evidence_status` is exactly `missing-implementation-evidence`, confidence is `high`, and
`future_owner` is `HDJG-36`.

The record states that no Bottom Sheet implementation, style, Shell connector, or Story
exists at the pinned current revision. Taskbar panels and the legacy BottomBar must not be
used to infer Bottom Sheet values. HDJG-36 therefore owns future implementation evidence;
until that evidence exists, there is nothing in this inventory to promote for the Bottom
Sheet.
