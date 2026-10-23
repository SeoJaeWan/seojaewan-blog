import { pngFile } from './export-manifest';
import { CAPTURES_BRANCH, REPO_NAME, REPO_OWNER } from './plugin-config';

// 플러그인이 여는 브랜치 이름과 커밋·PR 글을 만든다. 컴포넌트 하나마다 PR 하나, 토큰은 따로 PR 하나다.

/** 토큰 PR 브랜치. 이름이 고정이라 다시 내보내면 열린 PR을 이어 쓴다 */
export const TOKENS_BRANCH = 'feat/figma-tokens';

/** PR 하나에 담긴 대상 하나의 변경(main 기준) */
export type TargetChanges = {
  /** 피그마 컴포넌트 이름 */
  name: string;
  /** 저장소의 대상 폴더(PNG가 있는 곳) */
  folder: string;
  /** `parity-captures` 브랜치에서 이 대상의 캡처 폴더 */
  captureFolder: string;
  /** 새로 생기거나 PNG가 바뀐 변형 */
  changedVariants: readonly string[];
  /** 사라진 변형 */
  removedVariants: readonly string[];
  /** `parity-captures` 브랜치에 현재 구현 캡처가 있는 변형 */
  capturedVariants: ReadonlySet<string>;
};

/** 대상 PR 한 번의 커밋에 담은 변경 */
export type CommitSummary = {
  /** 새로 쓰거나 바뀐 파일 수 */
  changedCount: number;
  /** 지운 파일 수(사라진 변형, 이름이 바뀐 대상의 이전 폴더) */
  deletedCount: number;
  /** 새로 쓰거나 바뀐 자산 파일 수 */
  assetCount: number;
};

/** 토큰 PR에 쓰는 내용 */
export type TokensSummary = {
  /** 바뀐 토큰 경로 */
  changedPaths: readonly string[];
  /** 바뀐 토큰을 써서 변형 이미지를 다시 내보낸 컴포넌트 이름 */
  refreshedComponents: readonly string[];
  /** 새로 올리거나 바꾼 이미지 자산 수 */
  imageUploadCount: number;
};

/**
 * 컴포넌트 PR 브랜치 이름을 만든다. 컴포넌트마다 고정이다. 예: `feat/figma-search-box`
 * @codocs [[피그마 연동:피그마 플러그인]]
 * @param slug 컴포넌트 폴더 이름
 * @returns 브랜치 이름
 */
export function componentBranchName(slug: string): string {
  const branch = `feat/figma-${slug}`;
  if (branch === TOKENS_BRANCH) {
    throw new Error(
      `컴포넌트 폴더 이름 "${slug}"는 토큰 PR 브랜치와 겹친다. 컴포넌트 이름을 바꾼다.`,
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
 * 컴포넌트·조립 PR 커밋의 한국어 본문을 만든다.
 * @codocs [[Git 작업 규칙:커밋]]
 * @param names 이번 커밋에 담은 대상 이름
 * @param summary 이번 커밋의 변경
 * @returns 커밋 본문
 */
export function targetCommitBody(names: readonly string[], summary: CommitSummary): string {
  const lines = [
    `피그마에서 내보낸 ${names.join(', ')}의 변형 목록과 변형 이미지, 쓰는 자산을 갱신한다.`,
    '',
    `- 파일 ${summary.changedCount}개 갱신, ${summary.deletedCount}개 삭제`,
  ];
  if (summary.assetCount > 0) {
    lines.push(`- 그중 자산 파일 ${summary.assetCount}개`);
  }
  return lines.join('\n');
}

/**
 * 컴포넌트 PR의 한국어 본문을 만든다. 바뀐 변형 목록과 `피그마 | 현재 구현` 표를 담는다.
 * @codocs [[피그마 연동:피그마 플러그인]]
 * @param branch PR 브랜치
 * @param target 컴포넌트와 main 기준 변경
 * @param renamedFolders 이름이 바뀌어 지운 이전 폴더
 * @returns PR 본문(Markdown)
 */
export function componentPullRequestBody(
  branch: string,
  target: TargetChanges,
  renamedFolders: readonly string[],
): string {
  return [
    '## 변경',
    '',
    `- 컴포넌트: ${target.name}`,
    ...changeLines(target),
    ...renamedFolders.map((folder) => `- 이름이 바뀌어 이전 폴더 삭제: \`${folder}\``),
    '',
    '## 피그마와 현재 구현',
    '',
    ...variantTable(branch, [target]),
    '',
    '## 확인',
    '',
    '- `피그마` 열이 구현할 모습이다. 이 PR에서 코드와 `Parity` 스토리를 고치고, CI 캡처 표를 보고 병합한다.',
    `- 토큰 PR(\`${TOKENS_BRANCH}\`)이 열려 있으면 그것을 먼저 병합하고 이 PR에 \`main\`을 받아 온다.`,
  ].join('\n');
}

/**
 * 바뀐 변형 목록 줄을 만든다.
 * @param target 대상과 main 기준 변경
 * @returns 목록 줄
 */
function changeLines(target: TargetChanges): string[] {
  const changed =
    target.changedVariants.length === 0
      ? ['- PNG가 바뀐 변형 없음']
      : [
          `- 새로 생기거나 PNG가 바뀐 변형 ${target.changedVariants.length}개`,
          ...target.changedVariants.map((variant) => `  - \`${variant}\``),
        ];
  return [...changed, ...target.removedVariants.map((variant) => `- 사라진 변형: \`${variant}\``)];
}

/**
 * 바뀐 변형마다 피그마 이미지(이 PR 브랜치)와 현재 구현 캡처(`parity-captures`)를 나란히 놓는 표를 만든다.
 * 현재 구현 캡처가 없으면(처음 구현하는 대상) 빈칸이다.
 * @codocs [[피그마 연동:캡처 표]]
 * @param branch PR 브랜치
 * @param targets 대상과 main 기준 변경
 * @returns 표 줄
 */
export function variantTable(branch: string, targets: readonly TargetChanges[]): string[] {
  const rows = targets.flatMap((target) =>
    target.changedVariants.map((variant) =>
      variantRow(branch, targets.length > 1, target, variant),
    ),
  );
  if (rows.length === 0) {
    return ['바뀐 변형이 없다.'];
  }
  return ['| 변형 | 피그마 | 현재 구현 |', '|---|---|---|', ...rows];
}

/**
 * 변형 하나의 표 줄을 만든다.
 * @param branch PR 브랜치
 * @param shouldName 변형 앞에 대상 이름을 붙일지(대상이 여럿인 PR)
 * @param target 대상
 * @param variant 변형 이름
 * @returns 표 줄
 */
function variantRow(
  branch: string,
  shouldName: boolean,
  target: TargetChanges,
  variant: string,
): string {
  const label = shouldName ? `${target.name} / ${variant}` : variant;
  const figmaImage = `![${variant}](${blobRoot(branch)}/${target.folder}/${pngFile(variant)}?raw=true)`;
  const capture = target.capturedVariants.has(variant)
    ? `![${variant}](${blobRoot(CAPTURES_BRANCH)}/${target.captureFolder}/${pngFile(variant)}?raw=true)`
    : '';
  return `| \`${label}\` | ${figmaImage} | ${capture} |`;
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
 * 토큰 PR 커밋의 한국어 본문을 만든다.
 * @codocs [[Git 작업 규칙:커밋]]
 * @param summary 토큰 변경
 * @returns 커밋 본문
 */
export function tokensCommitBody(summary: TokensSummary): string {
  return [
    '피그마에서 내보낸 토큰과, 바뀐 토큰을 쓰는 컴포넌트의 변형 이미지를 갱신한다.',
    '',
    ...tokenLines(summary),
  ].join('\n');
}

/**
 * 토큰 PR의 한국어 본문을 만든다. 바뀐 토큰과 변형 이미지를 다시 내보낸 컴포넌트를 적는다.
 * @codocs [[피그마 연동:피그마 플러그인]]
 * @param summary 토큰 변경
 * @returns PR 본문(Markdown)
 */
export function tokensPullRequestBody(summary: TokensSummary): string {
  return [
    '## 변경',
    '',
    ...tokenLines(summary),
    '',
    '## 확인',
    '',
    '- 같은 PR에서 `src/tokens.css`를 `figma/tokens.json`에 맞게 고친다.',
    '- 컴포넌트 PR보다 먼저 병합한다.',
  ].join('\n');
}

/**
 * 토큰 커밋 본문과 PR 본문에 함께 쓰는 변경 목록을 만든다.
 * @param summary 토큰 변경
 * @returns 변경 목록 줄
 */
function tokenLines(summary: TokensSummary): string[] {
  const tokens = [
    `- 바뀐 토큰 ${summary.changedPaths.length}개`,
    ...summary.changedPaths.map((path) => `  - \`${path}\``),
  ];
  const components =
    summary.refreshedComponents.length === 0
      ? ['- 변형 이미지를 다시 내보낸 컴포넌트 없음']
      : [
          `- 바뀐 토큰을 써서 변형 이미지를 다시 내보낸 컴포넌트 ${summary.refreshedComponents.length}개`,
          ...summary.refreshedComponents.map((name) => `  - ${name}`),
        ];
  const images =
    summary.imageUploadCount > 0 ? [`- 이미지 자산 ${summary.imageUploadCount}개 갱신`] : [];
  return [...tokens, ...components, ...images];
}

/**
 * 브랜치의 파일 웹 주소 앞부분을 만든다.
 * @param branch 브랜치
 * @returns `https://github.com/<owner>/<repo>/blob/<branch>`
 */
function blobRoot(branch: string): string {
  return `https://github.com/${REPO_OWNER}/${REPO_NAME}/blob/${branch}`;
}
