import type { MotionValue } from './core/motion-data';
import { pngFile } from './export-manifest';
import { type MotionExport, type MotionTime, roundMs, roundValue } from './motion-file';
import { CAPTURES_BRANCH, REPO_NAME, REPO_OWNER } from './plugin-config';

// 플러그인이 여는 브랜치 이름과 커밋·PR 글을 만든다. 컴포넌트 하나마다 PR 하나, 조립은 영역마다 PR 하나,
// 토큰은 따로 PR 하나다.

/** 토큰 PR 브랜치. 이름이 고정이라 다시 내보내면 열린 PR을 이어 쓴다 */
export const TOKENS_BRANCH = 'feat/figma-tokens';

/** 조립 PR 브랜치 앞부분. 뒤에 영역 폴더 이름이 붙는다 */
const PATTERNS_BRANCH_PREFIX = 'feat/figma-patterns-';

/** 애니메이션 PR 브랜치 앞부분. 뒤에 견본 이름이 붙는다 */
const MOTION_BRANCH_PREFIX = 'feat/figma-motion-';

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
  /** main에 없던 토큰 경로 */
  addedPaths: readonly string[];
  /** 값이나 종류가 바뀐 토큰 경로 */
  modifiedPaths: readonly string[];
  /** 이름이 바뀌었거나 지워진 토큰 경로 */
  removedPaths: readonly string[];
  /** 바뀐 토큰을 쓰는 컴포넌트 이름(피그마 기준) */
  usingComponents: readonly string[];
  /** 그중 저장소에 있어 변형 이미지를 다시 내보낸 컴포넌트 이름 */
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
  if (branch.startsWith(PATTERNS_BRANCH_PREFIX)) {
    throw new Error(
      `컴포넌트 폴더 이름 "${slug}"는 조립 PR 브랜치와 겹친다. 컴포넌트 이름을 바꾼다.`,
    );
  }
  if (branch.startsWith(MOTION_BRANCH_PREFIX)) {
    throw new Error(
      `컴포넌트 폴더 이름 "${slug}"는 애니메이션 PR 브랜치와 겹친다. 컴포넌트 이름을 바꾼다.`,
    );
  }
  return branch;
}

/**
 * 조립 PR 브랜치 이름을 만든다. 영역마다 고정이다. 예: `feat/figma-patterns-menu`
 * @codocs [[피그마 연동:피그마 플러그인]]
 * @param area 영역 폴더 이름
 * @returns 브랜치 이름
 */
export function patternBranchName(area: string): string {
  return `${PATTERNS_BRANCH_PREFIX}${area}`;
}

/**
 * 조립 PR의 영어 커밋 제목을 만든다. PR 제목도 같다.
 * @codocs [[Git 작업 규칙:커밋]]
 * @param area 영역 폴더 이름
 * @returns 커밋 제목
 */
export function patternsCommitSubject(area: string): string {
  return `feat(figma): export ${area} patterns`;
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
 * 조립 PR의 한국어 본문을 만든다. 조립마다 바뀐 변형 목록과, 영역 전체의 `피그마 | 현재 구현` 표를 담는다.
 * @codocs [[피그마 연동:피그마 플러그인]]
 * @param branch PR 브랜치
 * @param area 영역 폴더 이름
 * @param targets 이번에 내보낸 조립과 main 기준 변경
 * @param renamedFolders 이름이 바뀌어 지운 이전 폴더
 * @returns PR 본문(Markdown)
 */
export function patternPullRequestBody(
  branch: string,
  area: string,
  targets: readonly TargetChanges[],
  renamedFolders: readonly string[],
): string {
  return [
    '## 변경',
    '',
    `- 영역: \`${area}\``,
    ...targets.flatMap((target) => [
      `- 조립: ${target.name}`,
      ...changeLines(target).map((line) => `  ${line}`),
    ]),
    ...renamedFolders.map((folder) => `- 이름이 바뀌어 이전 폴더 삭제: \`${folder}\``),
    '',
    '## 피그마와 현재 구현',
    '',
    ...variantTable(branch, targets),
    '',
    '## 확인',
    '',
    '- `피그마` 열이 구현할 모습이다. 앱(`apps/web` `features/`)의 조립 컴포넌트와 `Patterns/<조립 이름>` 스토리를 만들고, CI 캡처 표를 보고 병합한다.',
    '- 쓰는 토큰·컴포넌트 PR이 열려 있으면 그것을 먼저 병합하고 이 PR에 `main`을 받아 온다.',
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
    '피그마에서 내보낸 tokens.json과 그것으로 만든 tokens.css, 바뀐 토큰을 쓰는 컴포넌트의 변형 이미지를 갱신한다.',
    '',
    ...tokenLines(summary),
  ].join('\n');
}

/**
 * 토큰 PR의 한국어 본문을 만든다. 새로 생기거나 바뀌거나 사라진 토큰과, 그 토큰을 쓰는 컴포넌트를 적는다.
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
    '- `src/tokens.css`는 `figma/tokens.json`에서 변환 스크립트와 같은 함수로 만들었다. 손으로 고치지 않는다.',
    '- 토큰 이름이 바뀌거나 지워져 lint가 모르는 클래스로 실패하면, 같은 PR에서 옛 클래스를 쓰는 코드를 고친다.',
    '- 새 토큰을 쓰는 컴포넌트 PR보다 먼저 병합한다.',
  ].join('\n');
}

/**
 * 토큰 커밋 본문과 PR 본문에 함께 쓰는 변경 목록을 만든다.
 * @param summary 토큰 변경
 * @returns 변경 목록 줄
 */
function tokenLines(summary: TokensSummary): string[] {
  const tokens = [
    ...pathList('새 토큰', summary.addedPaths),
    ...pathList('값이 바뀐 토큰', summary.modifiedPaths),
    ...pathList('이름이 바뀌었거나 지워진 토큰', summary.removedPaths),
  ];
  const refreshed = new Set(summary.refreshedComponents);
  const components =
    summary.usingComponents.length === 0
      ? ['- 바뀐 토큰을 쓰는 컴포넌트 없음']
      : [
          `- 바뀐 토큰을 쓰는 컴포넌트 ${summary.usingComponents.length}개`,
          ...summary.usingComponents.map(
            (name) => `  - ${name}${refreshed.has(name) ? ' (변형 이미지 다시 내보냄)' : ''}`,
          ),
        ];
  const images =
    summary.imageUploadCount > 0 ? [`- 이미지 자산 ${summary.imageUploadCount}개 갱신`] : [];
  return [...(tokens.length === 0 ? ['- 바뀐 토큰 없음'] : tokens), ...components, ...images];
}

/**
 * 토큰 경로 목록 줄을 만든다. 비어 있으면 줄을 만들지 않는다.
 * @param label 목록 이름
 * @param paths 토큰 경로
 * @returns 목록 줄
 */
function pathList(label: string, paths: readonly string[]): string[] {
  if (paths.length === 0) {
    return [];
  }
  return [`- ${label} ${paths.length}개`, ...paths.map((path) => `  - \`${path}\``)];
}

/**
 * 브랜치의 파일 웹 주소 앞부분을 만든다.
 * @param branch 브랜치
 * @returns `https://github.com/<owner>/<repo>/blob/<branch>`
 */
function blobRoot(branch: string): string {
  return `https://github.com/${REPO_OWNER}/${REPO_NAME}/blob/${branch}`;
}

/**
 * 애니메이션 PR 브랜치 이름을 만든다. 견본마다 고정이다. `<이름>`은 견본 이름(`figma/motions/<이름>.json`의 이름) 그대로다.
 * 예: `motion-progress-ring` → `feat/figma-motion-motion-progress-ring`
 * @codocs [[Git 작업 규칙:브랜치]]
 * @codocs [[피그마 연동:피그마 플러그인]]
 * @param name 견본 이름
 * @returns 브랜치 이름
 */
export function motionBranchName(name: string): string {
  return `${MOTION_BRANCH_PREFIX}${name}`;
}

/**
 * 애니메이션 PR의 영어 커밋 제목을 만든다. PR 제목도 같다.
 * @codocs [[Git 작업 규칙:커밋]]
 * @param name 견본 이름
 * @returns 커밋 제목
 */
export function motionCommitSubject(name: string): string {
  return `feat(figma): export ${name} motion`;
}

/**
 * 애니메이션 PR 커밋의 한국어 본문을 만든다.
 * @codocs [[Git 작업 규칙:커밋]]
 * @param motion 내보낸 모션
 * @returns 커밋 본문
 */
export function motionCommitBody(motion: MotionExport): string {
  return [
    `피그마 Motion 섹션의 견본 ${motion.name}에서 키프레임과 토큰 짝을 내보낸다.`,
    '',
    `- 트랙 ${String(motion.tracks.length)}개, 전체 길이 ${timeText(motion.duration)}`,
  ].join('\n');
}

/**
 * 애니메이션 PR의 한국어 본문을 만든다. 피그마 견본 링크, 키프레임 표, 토큰 짝 표를 담는다.
 * @codocs [[피그마 연동:피그마 플러그인]]
 * @codocs [[피그마 연동:모션]]
 * @param motion 내보낸 모션
 * @returns PR 본문(Markdown)
 */
export function motionPullRequestBody(motion: MotionExport): string {
  return [
    '## 변경',
    '',
    `- 견본: [${motion.name}](${motion.url})`,
    `- 자료: \`packages/design-system/figma/motions/${motion.name}.json\``,
    `- 전체 길이 ${timeText(motion.duration)}, 시작 지연 ${timeText(motion.delay)}`,
    '- 반복: 피그마에서 읽을 수 없어 자료에 담지 않았다. 디자인 기반 문서의 모션 표를 본다.',
    '',
    '## 키프레임',
    '',
    '| 노드 | 항목 | 시간 | 값 | 이징 | 값 토큰 |',
    '|---|---|---|---|---|---|',
    ...motion.tracks.flatMap(keyframeRows),
    '',
    '## 토큰 짝',
    '',
    '구현할 때 짝은 `var()`로 쓰고, 짝이 없는 값은 그대로 옮긴다.',
    '',
    '| 쓰는 곳 | 값 | 토큰 |',
    '|---|---|---|',
    ...tokenPairRows(motion),
    '',
    '## 확인',
    '',
    `- 피그마 견본과 \`Motion/${motion.name}\` 모션 스토리를 나란히 보고 키프레임 모양을 확인한다.`,
    '- 시간·이징·지연·반복 횟수는 모션 검사(`motion-check.yml`)가 모션 스토리에서 읽어 이 자료와 비교한다.',
    `- 새 모션 토큰이 필요하면 토큰 PR(\`${TOKENS_BRANCH}\`), 키프레임이 걸린 자산이 컴포넌트 PR로 들어오면 그 PR을 먼저 병합한다.`,
  ].join('\n');
}

/**
 * 트랙 하나의 키프레임 표 줄을 만든다.
 * @param track 트랙
 * @returns 표 줄
 */
function keyframeRows(track: MotionExport['tracks'][number]): string[] {
  return track.keyframes.map(
    (keyframe) =>
      `| ${track.node} | \`${track.property}\` | ${msText(keyframe.time)} | ${valueText(keyframe.value)} | ${codeOrDash(keyframe.easing)} | ${codeOrDash(keyframe.valueToken)} |`,
  );
}

/**
 * 토큰 짝 표의 줄을 만든다. 같은 줄은 한 번만 쓴다.
 * @param motion 내보낸 모션
 * @returns 표 줄
 */
function tokenPairRows(motion: MotionExport): string[] {
  const rows: string[] = [];
  /**
   * 줄을 더한다. 이미 있으면 더하지 않는다.
   * @param where 쓰는 곳
   * @param value 값
   * @param token 토큰
   */
  function add(where: string, value: string, token: string): void {
    const row = `| ${where} | ${value} | \`${token}\` |`;
    if (!rows.includes(row)) {
      rows.push(row);
    }
  }
  for (const track of motion.tracks) {
    const where = `${track.node} \`${track.property}\``;
    if (track.duration.token !== null) {
      add(`${where} 트랙 길이`, msText(track.duration.ms), track.duration.token);
    }
    if (track.delay.token !== null) {
      add(`${where} 시작 지연`, msText(track.delay.ms), track.delay.token);
    }
    for (const keyframe of track.keyframes) {
      if (keyframe.easing !== null) {
        add(`${where} 이징`, '곡선', keyframe.easing);
      }
      if (keyframe.valueToken !== null) {
        add(`${where} 값`, valueText(keyframe.value), keyframe.valueToken);
      }
    }
  }
  return rows.length === 0 ? ['| 없음 | | |'] : rows;
}

/**
 * 시간 값과 토큰을 글로 만든다.
 * @param time 시간 값
 * @returns `250ms(motion/duration/normal)` 꼴
 */
function timeText(time: MotionTime): string {
  return time.token === null ? msText(time.ms) : `${msText(time.ms)}(\`${time.token}\`)`;
}

/**
 * ms 값을 글로 만든다.
 * @param ms 시간
 * @returns `250ms`
 */
function msText(ms: number): string {
  return `${String(roundMs(ms))}ms`;
}

/**
 * 키프레임 값을 표에 쓸 글로 만든다.
 * @param value 키프레임 값
 * @returns `0.96`, `x 0.96, y 0.96` 꼴
 */
function valueText(value: MotionValue): string {
  if (typeof value === 'number') {
    return String(roundValue(value));
  }
  if (typeof value !== 'object') {
    return String(value);
  }
  return Object.entries(value)
    .map(([key, item]) => `${key} ${String(roundValue(item))}`)
    .join(', ');
}

/**
 * 값이 있으면 코드 글꼴로, 없으면 `-`로 쓴다.
 * @param value 값
 * @returns 표 칸
 */
function codeOrDash(value: string | null): string {
  return value === null ? '-' : `\`${value}\``;
}
