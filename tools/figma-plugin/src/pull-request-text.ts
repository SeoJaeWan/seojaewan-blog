import { pngFile } from './export-manifest';
import { componentFilePath } from './naming';
import { CAPTURES_BRANCH, REPO_NAME, REPO_OWNER } from './plugin-config';

// 플러그인이 여는 브랜치 이름과 커밋·PR 글을 만든다. 컴포넌트 하나마다 PR 하나, 토큰은 따로 PR 하나다.

/** 토큰 PR 브랜치. 이름이 고정이라 다시 내보내면 열린 PR을 이어 쓴다 */
export const TOKENS_BRANCH = 'feat/figma-tokens';

/** 컴포넌트 PR 한 번의 커밋에 담은 변경 */
export type ComponentCommitSummary = {
  /** 피그마 컴포넌트 이름 */
  name: string;
  /** 컴포넌트 폴더 이름 */
  slug: string;
  /** 올린 변형 이미지 수 */
  uploadCount: number;
  /** 지운 파일 수(사라진 변형, 이름이 바뀐 컴포넌트의 이전 폴더) */
  deletionCount: number;
  /** 새로 올리거나 바꾼 자산 파일 수 */
  assetUploadCount: number;
};

/** 컴포넌트 PR 본문에 쓰는 내용 */
export type ComponentPullRequestSummary = {
  /** 피그마 컴포넌트 이름 */
  name: string;
  /** 컴포넌트 폴더 이름 */
  slug: string;
  /** PR 브랜치 */
  branch: string;
  /** main과 비교해 레이어 정보가 바뀌었거나 새로 생긴 변형 */
  changedVariants: readonly string[];
  /** main에서 사라진 변형 */
  removedVariants: readonly string[];
  /** 이름이 바뀌어 지운 이전 폴더 */
  renamedFolders: readonly string[];
  /** `parity-captures` 브랜치에 현재 구현 캡처가 있는 변형 */
  capturedVariants: ReadonlySet<string>;
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
 * @codocs [[Git 작업 규칙:브랜치]]
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
 * 컴포넌트 PR 커밋의 한국어 본문을 만든다.
 * @codocs [[Git 작업 규칙:커밋]]
 * @param summary 이번 커밋의 변경
 * @returns 커밋 본문
 */
export function componentCommitBody(summary: ComponentCommitSummary): string {
  const lines = [
    `피그마에서 내보낸 ${summary.name} 컴포넌트의 레이어 이름 정보, 변형 이미지, 자산을 갱신한다.`,
    '',
    `- 변형 이미지 ${summary.uploadCount}개 갱신, 파일 ${summary.deletionCount}개 삭제`,
  ];
  if (summary.assetUploadCount > 0) {
    lines.push(`- 자산 파일 ${summary.assetUploadCount}개 갱신`);
  }
  return lines.join('\n');
}

/**
 * 컴포넌트 PR의 한국어 본문을 만든다. 바뀐 변형 목록과 `피그마 | 현재 구현` 표를 담는다.
 * @codocs [[피그마 일치 검사:피그마 플러그인]]
 * @param summary 컴포넌트와 main 기준 변경
 * @returns PR 본문(Markdown)
 */
export function componentPullRequestBody(summary: ComponentPullRequestSummary): string {
  const changed =
    summary.changedVariants.length === 0
      ? ['- 레이어 정보가 바뀐 변형 없음(이미지·자산만 갱신)']
      : [
          `- 바뀐 변형 ${summary.changedVariants.length}개`,
          ...summary.changedVariants.map((variant) => `  - \`${variant}\``),
        ];
  const removed = summary.removedVariants.map((variant) => `- 사라진 변형: \`${variant}\``);
  const renamed = summary.renamedFolders.map(
    (folder) => `- 이름이 바뀌어 이전 폴더 삭제: \`${folder}\``,
  );
  return [
    '## 변경',
    '',
    `- 컴포넌트: ${summary.name} (\`${summary.slug}\`)`,
    ...changed,
    ...removed,
    ...renamed,
    '',
    '## 피그마와 현재 구현',
    '',
    ...variantTable(summary),
    '',
    '## 확인',
    '',
    '- 이 PR의 피그마 일치 검사에서 실패한 항목이 구현할 목록이다. 같은 PR에서 코드를 고쳐 통과시킨 뒤 병합한다.',
    `- 토큰 PR(\`${TOKENS_BRANCH}\`)이 열려 있으면 그것을 먼저 병합하고 이 PR에 \`main\`을 받아 온다.`,
  ].join('\n');
}

/**
 * 바뀐 변형마다 피그마 이미지(이 PR 브랜치)와 현재 구현 캡처(`parity-captures`)를 나란히 놓는 표를 만든다.
 * 현재 구현 캡처가 없으면(처음 구현하는 컴포넌트) 빈칸이다.
 * @codocs [[피그마 일치 검사:캡처 표]]
 * @param summary 컴포넌트와 main 기준 변경
 * @returns 표 줄
 */
export function variantTable(summary: ComponentPullRequestSummary): string[] {
  if (summary.changedVariants.length === 0) {
    return ['바뀐 변형이 없다.'];
  }
  return [
    '| 변형 | 피그마 | 현재 구현 |',
    '|---|---|---|',
    ...summary.changedVariants.map((variant) => variantRow(summary, variant)),
  ];
}

/**
 * 변형 하나의 표 줄을 만든다.
 * @param summary 컴포넌트와 main 기준 변경
 * @param variant 변형 이름
 * @returns 표 줄
 */
function variantRow(summary: ComponentPullRequestSummary, variant: string): string {
  const figmaImage = `![${variant}](${figmaImageUrl(summary.branch, summary.slug, variant)})`;
  const capture = summary.capturedVariants.has(variant)
    ? `![${variant}](${captureImageUrl(summary.slug, variant)})`
    : '';
  return `| \`${variant}\` | ${figmaImage} | ${capture} |`;
}

/**
 * PR 브랜치에 올린 피그마 변형 PNG의 웹 주소를 만든다.
 * @param branch 브랜치
 * @param slug 컴포넌트 폴더 이름
 * @param variant 변형 이름
 * @returns 이미지 주소
 */
export function figmaImageUrl(branch: string, slug: string, variant: string): string {
  return `${blobRoot(branch)}/${componentFilePath(slug, pngFile(variant))}?raw=true`;
}

/**
 * `parity-captures` 브랜치의 현재 구현 캡처 웹 주소를 만든다.
 * @param slug 컴포넌트 폴더 이름
 * @param variant 변형 이름
 * @returns 이미지 주소
 */
export function captureImageUrl(slug: string, variant: string): string {
  return `${blobRoot(CAPTURES_BRANCH)}/${slug}/${pngFile(variant)}?raw=true`;
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
 * @codocs [[피그마 일치 검사:피그마 플러그인]]
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
    '- 컴포넌트 PR보다 먼저 병합한다. 토큰 이름을 바꾸거나 지울 때는 추가 → 옮기기 → 지우기 순서로 나눈다.',
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
