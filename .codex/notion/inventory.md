# Notion 블록 인벤토리

생성: 2026-07-05 · `scripts/notion-inventory.mjs` · API 호출 199회

ui 블록 union(v1)의 검증 근거. 재실행하면 갱신된다.

## 페이지 수

| DB | 페이지 |
| --- | --- |
| blog | 14 |
| project | 3 |
| about | 1 |

## 블록 타입 (v1 지원 여부)

| 타입 | 개수 | v1 |
| --- | --- | --- |
| `paragraph` | 882 | ✅ |
| `bulleted_list_item` | 762 | ✅ |
| `heading_3` | 116 | ✅ |
| `code` | 100 | ✅ |
| `numbered_list_item` | 89 | ✅ |
| `heading_2` | 85 | ✅ |
| `quote` | 49 | ✅ |
| `heading_1` | 35 | ✅ |
| `table_row` | 32 | ✅ |
| `image` | 26 | ✅ |
| `divider` | 12 | ✅ |
| `toggle` | 12 | ✅ |
| `table` | 4 | ✅ |
| `column` | 2 | ✅ |
| `column_list` | 1 | ✅ |

- 최대 중첩 깊이: 3
- 표: 4개 (최대 2열)

## v1 미지원 블록 발생 위치

없음 — v1 union이 실사용 블록을 전부 커버한다.

## 코드 언어

| 언어 | 개수 |
| --- | --- |
| `javascript` | 97 |
| `css` | 2 |
| `typescript` | 1 |

## rich text

| annotation | 개수 |
| --- | --- |
| `bold` | 972 |
| `code` | 629 |
| `italic` | 1 |

| 텍스트 색 | 개수 |
| --- | --- |
| (없음) | - |

| rich text 타입 | 개수 |
| --- | --- |
| `text` | 4545 |

- 링크: 20개

## 블록 색

| 블록:색 | 개수 |
| --- | --- |
| `heading_3:yellow_background` | 1 |
| `paragraph:yellow_background` | 1 |

## 이미지 (자산화 대상 규모)

| 타입 | 개수 |
| --- | --- |
| `external` | 26 |

- `file` = Notion 서명 URL(1시간 만료 — sync 자산화 대상), `external` = 외부 URL(기존 GitHub 수동 업로드분)
