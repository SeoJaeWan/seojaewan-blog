import type { ComponentSchema } from '../../../packages/design-system/src/figma-contract';
import { figmaNodeUrl } from './naming';
import { CHANGESET_DIR, DESIGN_SYSTEM_PACKAGE } from './plugin-config';

// 플러그인이 여는 브랜치 이름과 커밋·PR 글, changeset을 만든다. 토큰·자산은 PR 하나씩, 컴포넌트는 하나마다 PR 하나다.

/** 토큰 PR 브랜치. 이름이 고정이라 다시 내보내면 열린 PR을 이어 쓴다 */
export const TOKENS_BRANCH = 'feat/figma-tokens';
/** 자산 PR 브랜치 */
export const ASSETS_BRANCH = 'feat/figma-assets';
/** 컴포넌트 PR 브랜치 앞부분. 뒤에 컴포넌트 폴더 이름이 붙는다 */
const COMPONENT_BRANCH_PREFIX = 'feat/figma-';

/**
 * 토큰 PR에 쓰는 내용.
 * - addedPaths: main에 없던 토큰 경로
 * - modifiedPaths: 값이나 종류가 바뀐 토큰 경로
 * - removedPaths: 이름이 바뀌었거나 지워진 토큰 경로
 */
export type TokensSummary = {
  addedPaths: readonly string[];
  modifiedPaths: readonly string[];
  removedPaths: readonly string[];
};

/**
 * 자산 PR에 쓰는 내용. 경로는 `src/assets/` 기준이다.
 * - changedFiles: 새로 생기거나 바뀐 자산 원본
 * - deletedFiles: 지운 자산 원본(피그마에서 지웠거나 원본 형식이 바뀐 것)
 */
export type AssetsSummary = {
  changedFiles: readonly string[];
  deletedFiles: readonly string[];
};

/** 변형 하나. nodeId: 피그마 링크에 쓰는 변형 노드 ID */
export type VariantRef = { name: string; nodeId: string };

/**
 * `main`의 스키마와 견준 변형 변경.
 * - added: 새로 생긴 변형
 * - changed: 같은 이름인데 스키마 내용이 바뀐 변형
 * - removed: 사라진 변형(노드 ID는 main 스키마의 것)
 */
export type VariantChanges = {
  added: VariantRef[];
  changed: VariantRef[];
  removed: VariantRef[];
};

/**
 * 컴포넌트 PR 브랜치 이름을 만든다. 컴포넌트마다 고정이다. 예: `feat/figma-search-box`
 * 토큰·자산 브랜치와 겹치는 이름이면 멈춘다(브랜치는 토큰, 자산, 컴포넌트 셋뿐이다).
 * @codocs [[디자인 시스템:피그마 플러그인]]
 * @param slug 컴포넌트 폴더 이름
 * @returns 브랜치 이름
 */
export function componentBranchName(slug: string): string {
  const branch = `${COMPONENT_BRANCH_PREFIX}${slug}`;
  if (branch === TOKENS_BRANCH || branch === ASSETS_BRANCH) {
    throw new Error(
      `컴포넌트 폴더 이름 "${slug}"는 토큰·자산 PR 브랜치와 겹친다. 컴포넌트 이름을 바꾼다.`,
    );
  }
  return branch;
}

/**
 * 컴포넌트 PR의 영어 커밋 제목을 만든다. PR 제목도 같다.
 * @codocs [[Git 작업 규칙:커밋]]
 * @param slug 컴포넌트 폴더 이름
 * @returns 커밋 제목
 */
export function componentCommitSubject(slug: string): string {
  return `feat(figma): export ${slug} component`;
}

/**
 * 토큰 PR의 영어 커밋 제목을 만든다. PR 제목도 같다.
 * @codocs [[Git 작업 규칙:커밋]]
 * @returns 커밋 제목
 */
export function tokensCommitSubject(): string {
  return 'feat(figma): export tokens';
}

/**
 * 자산 PR의 영어 커밋 제목을 만든다. PR 제목도 같다.
 * @codocs [[Git 작업 규칙:커밋]]
 * @returns 커밋 제목
 */
export function assetsCommitSubject(): string {
  return 'feat(figma): export assets';
}

/**
 * changeset 파일의 저장소 경로를 만든다.
 * @codocs [[디자인 시스템:PR 흐름]]
 * @param name 파일 이름(확장자 제외, `figma-button`)
 * @returns 저장소 경로
 */
export function changesetPath(name: string): string {
  return `${CHANGESET_DIR}/${name}.md`;
}

/**
 * PR을 열 때 함께 올리는 changeset 내용을 만든다. 대상은 디자인 시스템, 종류는 `patch`, 설명은 무엇을 다시 내보냈는지 한 줄이다.
 * @codocs [[디자인 시스템:PR 흐름]]
 * @codocs [[Git 작업 규칙:Changesets]]
 * @param target 다시 내보낸 것(`토큰`, `자산`, `Button 컴포넌트`)
 * @returns changeset 파일 내용
 */
export function changesetText(target: string): string {
  return `---\n'${DESIGN_SYSTEM_PACKAGE}': patch\n---\n\n피그마에서 ${target}${objectParticle(target)} 다시 내보냈다.\n`;
}

/**
 * `main`의 스키마와 견줘 새로 생긴 변형, 바뀐 변형, 사라진 변형을 구한다. 변형은 이름으로 짝짓고 스키마의 변형 내용 전체를 견준다.
 * @codocs [[디자인 시스템:피그마 플러그인]]
 * @param main main의 스키마. 없으면(새 컴포넌트) null
 * @param next 이번에 내보낸 스키마
 * @returns 변형 변경
 */
export function variantChanges(
  main: ComponentSchema | null,
  next: ComponentSchema,
): VariantChanges {
  const before = new Map((main?.variants ?? []).map((variant) => [variant.name, variant]));
  const after = new Set(next.variants.map((variant) => variant.name));
  const added: VariantRef[] = [];
  const changed: VariantRef[] = [];
  for (const variant of next.variants) {
    const old = before.get(variant.name);
    const ref = { name: variant.name, nodeId: variant.nodeId };
    if (old === undefined) {
      added.push(ref);
    } else if (JSON.stringify(old) !== JSON.stringify(variant)) {
      changed.push(ref);
    }
  }
  const removed = (main?.variants ?? [])
    .filter((variant) => !after.has(variant.name))
    .map((variant) => ({ name: variant.name, nodeId: variant.nodeId }));
  return { added, changed, removed };
}

/**
 * 컴포넌트 PR의 한국어 본문을 만든다. `main`의 스키마와 견준 변형 변경을 표로 적고, 변형 이름은 피그마의 그 변형으로 가는 링크다.
 * 그림은 넣지 않는다.
 * @codocs [[디자인 시스템:피그마 플러그인]]
 * @param name 컴포넌트 이름
 * @param changes 변형 변경
 * @param isNew main에 스키마가 없던 새 컴포넌트인지
 * @returns PR 본문(Markdown)
 */
export function componentPullRequestBody(
  name: string,
  changes: VariantChanges,
  isNew: boolean,
): string {
  const rows = [
    ...changes.added.map((variant) => ['새로 생김', variant] as const),
    ...changes.changed.map((variant) => ['바뀜', variant] as const),
    ...changes.removed.map((variant) => ['사라짐', variant] as const),
  ];
  return [
    '## 변경',
    '',
    isNew
      ? `피그마의 ${name} 컴포넌트를 처음 내보냈다.`
      : `피그마에서 다시 내보낸 ${name}의 스키마를 \`main\`과 견줬다.`,
    '',
    `새로 생긴 변형 ${String(changes.added.length)} · 바뀐 변형 ${String(changes.changed.length)} · 사라진 변형 ${String(changes.removed.length)}`,
    '',
    ...(rows.length === 0
      ? ['변형 스키마는 `main`과 같다(검증 자료만 바뀌었다).']
      : [
          '| 변경 | 변형 |',
          '|---|---|',
          ...rows.map(
            ([kind, variant]) =>
              `| ${kind} | [${tableCell(variant.name)}](${figmaNodeUrl(variant.nodeId)}) |`,
          ),
        ]),
  ].join('\n');
}

/**
 * 토큰 PR 커밋의 한국어 본문을 만든다.
 * @codocs [[Git 작업 규칙:커밋]]
 * @param summary 토큰 변경
 * @returns 커밋 본문
 */
export function tokensCommitBody(summary: TokensSummary): string {
  return ['피그마에서 내보낸 tokens.json을 갱신한다.', '', ...tokenLines(summary)].join('\n');
}

/**
 * 토큰 PR의 한국어 본문을 만든다. 새로 생기거나 바뀌거나 사라진 토큰을 적는다.
 * @codocs [[디자인 시스템:피그마 플러그인]]
 * @param summary 토큰 변경
 * @returns PR 본문(Markdown)
 */
export function tokensPullRequestBody(summary: TokensSummary): string {
  return ['## 변경', '', ...tokenLines(summary)].join('\n');
}

/**
 * 자산 PR 커밋과 PR의 한국어 본문을 만든다.
 * @codocs [[디자인 시스템:피그마 플러그인]]
 * @param summary 자산 변경
 * @returns 본문(Markdown)
 */
export function assetsPullRequestBody(summary: AssetsSummary): string {
  return [
    '## 변경',
    '',
    ...listLines('새로 생기거나 바뀐 자산 원본', summary.changedFiles),
    ...listLines('지운 자산 원본', summary.deletedFiles),
  ].join('\n');
}

/**
 * 토큰 커밋 본문과 PR 본문에 함께 쓰는 변경 목록을 만든다.
 * @param summary 토큰 변경
 * @returns 변경 목록 줄
 */
function tokenLines(summary: TokensSummary): string[] {
  const lines = [
    ...listLines('새 토큰', summary.addedPaths),
    ...listLines('값이 바뀐 토큰', summary.modifiedPaths),
    ...listLines('이름이 바뀌었거나 지워진 토큰', summary.removedPaths),
  ];
  return lines.length === 0 ? ['- 바뀐 토큰 없음(파일의 꼴만 바뀌었다)'] : lines;
}

/**
 * 목록 줄을 만든다. 비어 있으면 줄을 만들지 않는다.
 * @param label 목록 이름
 * @param items 항목
 * @returns 목록 줄
 */
function listLines(label: string, items: readonly string[]): string[] {
  if (items.length === 0) {
    return [];
  }
  return [`- ${label} ${String(items.length)}개`, ...items.map((item) => `  - \`${item}\``)];
}

/**
 * 표 칸 안의 `|`를 이스케이프한다.
 * @param text 칸 글
 * @returns 이스케이프한 글
 */
function tableCell(text: string): string {
  return text.replaceAll('|', '\\|').replaceAll(']', '\\]');
}

/**
 * 낱말 뒤에 붙는 목적격 조사(을/를)를 고른다. 한글이 아닌 끝 글자는 받침이 없는 것으로 본다.
 * @param word 낱말
 * @returns 받침이 있으면 '을', 없으면 '를'
 */
function objectParticle(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code < 11172 && code % 28 !== 0 ? '을' : '를';
}
