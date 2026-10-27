import { TokenFormatError } from '../../../packages/design-system/scripts/tokens/tokens-css';
import type { Violation } from './core/check-structure';
import { exportTargetCore, exportVariantImages, type TargetExport } from './core/export-component';
import { exportMotionCore, type MotionFileExport } from './core/export-motion';
import { exportTokensText, type TokensExport } from './core/export-tokens';
import { isMotionApiError, readMotionVariables } from './core/read-motion';
import {
  MANIFEST_FILE,
  manifestFiles,
  manifestText,
  pngFile,
  readManifestNodeId,
  renamedFolders,
  settingsText,
} from './export-manifest';
import { readCheckContext, readComponentTokenUsage } from './figma-reader';
import {
  commitUrl,
  createBlob,
  createBranch,
  createCommit,
  createPullRequest,
  createTree,
  findBranchCommit,
  findOpenPullRequest,
  getBranchHead,
  getFileText,
  listTreeFiles,
  resetBranch,
  type TreeEntry,
  updateBranch,
  updatePullRequestBody,
} from './github-client';
import type { ExportOutcome, PullRequestCommit } from './messages';
import { assetFilePath, componentSlug, patternFolder, patternPlace } from './naming';
import {
  ASSETS_DIR,
  BASE_BRANCH,
  COMPONENTS_DIR,
  FIGMA_DIR,
  FILE_KEY,
  MOTIONS_DIR,
  PATTERNS_DIR,
  SCALE,
  SETTINGS_PATH,
  TOKENS_CSS_PATH,
  TOKENS_PATH,
} from './plugin-config';
import {
  componentBranchName,
  componentCommitSubject,
  componentPullRequestBody,
  motionBranchName,
  motionCommitBody,
  motionCommitSubject,
  motionPullRequestBody,
  patternBranchName,
  patternPullRequestBody,
  patternsCommitSubject,
  type TargetChanges,
  targetCommitBody,
  TOKENS_BRANCH,
  tokensCommitBody,
  tokensCommitSubject,
  tokensPullRequestBody,
} from './pull-request-text';
import { utf8Encode } from './sha256';
import { componentsUsingTokens, tokenChanges } from './token-changes';
import { parentFolder, planTree } from './tree-changes';

export type ExportRequest = {
  token: string;
  /** 내보낼 컴포넌트. 조립·애니메이션과 함께 비어 있으면 토큰만 내보낸다 */
  componentIds: readonly string[];
  /** 내보낼 조립 */
  patternIds: readonly string[];
  /** 내보낼 애니메이션 견본 */
  motionIds: readonly string[];
  log: (text: string) => void;
  /** 막지 않는 알림(쓰는 곳이 없는 변수·스타일, 같은 값 변수가 여럿인 모션 짝, 건너뛴 애니메이션)을 UI에 보여 준다 */
  notify: (notices: string[]) => void;
};

/** 브랜치 끝 커밋과 트리 */
type Head = { commitSha: string; treeSha: string };

/** 브랜치 끝과 그때의 피그마 기준 자료 파일(경로 → blob SHA) */
type RepoState = { head: Head; files: Map<string, string> };

/** 저장소에서 읽는 파일 범위 */
const REPO_PREFIXES = [`${FIGMA_DIR}/`, TOKENS_CSS_PATH, `${PATTERNS_DIR}/`] as const;

/** 커밋할 PR 브랜치의 상태 */
type Target = {
  branch: string;
  /** 커밋을 얹을 상태. 열린 PR이 있으면 그 브랜치 끝, 없으면 main */
  state: RepoState;
  /** 열린 PR. 없으면 null */
  openPullRequest: { url: string; number: number } | null;
};

/** 내보낸 대상 하나와 저장소 위치 */
type PlacedTarget = {
  exported: TargetExport;
  /** 저장소의 대상 폴더 */
  folder: string;
};

/** 내보낸 조립 하나와 영역 */
type PlacedPattern = PlacedTarget & { area: string };

/**
 * 고른 컴포넌트·조립·애니메이션을 구조 검사한 뒤, 컴포넌트마다 고정 브랜치(`feat/figma-<컴포넌트>`)의 PR에,
 * 조립은 영역마다 고정 브랜치(`feat/figma-patterns-<영역>`)의 PR에, 애니메이션은 견본마다 고정 브랜치
 * (`feat/figma-motion-<견본 이름에서 motion-을 뺀 이름>`)의 PR에 커밋한다. 위반이 하나라도 있으면 아무것도 커밋하지 않는다.
 * 컴포넌트 PR은 그 컴포넌트 폴더와 쓰는 자산(과 figma.json)만, 조립 PR은 그 영역의 조립 폴더와 쓰는 자산만,
 * 애니메이션 PR은 `figma/motions/<이름>.json`만 바꾼다. 토큰만 고르면 토큰만 내보낸다.
 * 토큰은 늘 읽어 main의 tokens.json과 비교하고, 다르면 토큰 PR(`feat/figma-tokens`)을 따로 열거나 갱신한다.
 * @codocs [[피그마 연동:피그마 플러그인]]
 * @param request 토큰, 고른 컴포넌트와 조립, 진행 로그
 * @returns PR별 커밋 결과, 또는 위반 목록
 */
export async function runExport(request: ExportRequest): Promise<ExportOutcome> {
  const { token, log } = request;
  if (figma.fileKey !== undefined && figma.fileKey !== FILE_KEY) {
    throw new Error(`이 파일(${figma.fileKey})은 내보내기 대상(${FILE_KEY})이 아니다.`);
  }

  log('구조 검사 중');
  const context = await readCheckContext();
  const components: PlacedTarget[] = [];
  const violations: Violation[] = [];
  for (const id of request.componentIds) {
    const outcome = await exportTargetCore(id, SCALE, context);
    if (!outcome.ok) {
      log(`${outcome.name}: 위반 ${String(outcome.violations.length)}개`);
      violations.push(...outcome.violations);
      continue;
    }
    const slug = componentSlug(outcome.target.manifest.name);
    if (components.some((other) => other.folder === `${COMPONENTS_DIR}/${slug}`)) {
      throw new Error(`컴포넌트 폴더 이름 "${slug}"가 겹친다.`);
    }
    componentBranchName(slug);
    log(`${outcome.target.manifest.name}: 변형 ${String(outcome.target.pngs.size)}개 내보냄`);
    components.push({
      exported: outcome.target,
      folder: `${COMPONENTS_DIR}/${slug}`,
    });
  }
  const patterns: PlacedPattern[] = [];
  for (const id of request.patternIds) {
    const outcome = await exportTargetCore(id, SCALE, context);
    const name = outcome.ok ? outcome.target.manifest.name : outcome.name;
    const place = patternPlace(name);
    if (place === null) {
      violations.push({
        where: name,
        reason: '조립 이름이 `영역/이름` 꼴이 아니라 폴더를 정할 수 없다',
        fix: '조립 이름을 `영역/이름`(예: `Menu/Folder`)으로 바꾼다.',
      });
    }
    if (!outcome.ok) {
      log(`${name}: 위반 ${String(outcome.violations.length)}개`);
      violations.push(...outcome.violations);
      continue;
    }
    if (place === null) {
      continue;
    }
    const folder = patternFolder(place);
    if (patterns.some((other) => other.folder === folder)) {
      throw new Error(`조립 폴더 "${folder}"가 겹친다.`);
    }
    log(`${name}: 변형 ${String(outcome.target.pngs.size)}개 내보냄`);
    patterns.push({
      exported: outcome.target,
      folder,
      area: place.area,
    });
  }

  const motionNotices: string[] = [];
  const motions = await exportMotions(request.motionIds, violations, motionNotices, log);

  log('토큰 변환 중');
  const tokens = await readTokens(violations);
  if (tokens === null || violations.length > 0) {
    request.notify(motionNotices);
    return { kind: 'blocked', violations };
  }
  for (const name of tokens.skippedStyles) {
    log(`토큰이 아닌 칠 스타일이라 건너뜀: ${name}`);
  }
  request.notify([...motionNotices, ...tokens.notices]);

  log(`${BASE_BRANCH} 브랜치의 기준 자료를 읽는 중`);
  const main = await readRepoState(token, BASE_BRANCH);

  const commits: PullRequestCommit[] = [];
  const unchanged: string[] = [];
  for (const component of components) {
    const commit = await commitComponent(token, component, main, log);
    if (commit === null) {
      unchanged.push(component.exported.manifest.name);
    } else {
      commits.push(commit);
    }
  }
  for (const area of [...new Set(patterns.map((pattern) => pattern.area))]) {
    const group = patterns.filter((pattern) => pattern.area === area);
    const commit = await commitPatterns(token, area, group, main, log);
    if (commit === null) {
      unchanged.push(...group.map((pattern) => pattern.exported.manifest.name));
    } else {
      commits.push(commit);
    }
  }
  for (const motion of motions) {
    const commit = await commitMotion(token, motion, main, log);
    if (commit === null) {
      unchanged.push(motion.name);
    } else {
      commits.push(commit);
    }
  }
  const tokensCommit = await commitTokens(
    token,
    tokens,
    main,
    new Set(components.map((component) => component.exported.manifest.name)),
    log,
  );
  if (tokensCommit !== null) {
    commits.push(tokensCommit);
  }
  return { kind: 'done', commits, unchanged };
}

/**
 * 고른 애니메이션 견본을 모션 검사하고 json 내용을 만든다. 위반은 목록에 더한다.
 * 모션 API를 쓸 수 없는 계정이면 애니메이션만 건너뛰고 알림을 남긴다(다른 대상은 그대로 내보낸다).
 * @codocs [[피그마 연동:피그마 플러그인]]
 * @codocs [[피그마 연동:모션]]
 * @param ids 견본 프레임 ID
 * @param violations 위반을 더할 목록
 * @param notices 알림을 더할 목록
 * @param log 진행 로그
 * @returns 검사를 통과한 모션
 */
async function exportMotions(
  ids: readonly string[],
  violations: Violation[],
  notices: string[],
  log: (text: string) => void,
): Promise<MotionFileExport[]> {
  if (ids.length === 0) {
    return [];
  }
  log('모션 검사 중');
  const motions: MotionFileExport[] = [];
  try {
    const variables = await readMotionVariables();
    for (const id of ids) {
      const outcome = await exportMotionCore(id, variables, FILE_KEY);
      if (!outcome.ok) {
        log(`${outcome.name}: 위반 ${String(outcome.violations.length)}개`);
        violations.push(...outcome.violations);
        continue;
      }
      const { motion } = outcome;
      if (motions.some((other) => other.name === motion.name)) {
        throw new Error(`애니메이션 견본 이름 "${motion.name}"가 겹친다.`);
      }
      log(`${motion.name}: 트랙 ${String(motion.result.motion.tracks.length)}개 내보냄`);
      notices.push(...motion.result.notices);
      motions.push(motion);
    }
  } catch (error) {
    if (!isMotionApiError(error)) {
      throw error;
    }
    log('모션 API를 쓸 수 없어 애니메이션 내보내기를 건너뛴다.');
    notices.push('이 계정은 피그마 모션 API를 쓸 수 없어 애니메이션을 내보내지 않았다.');
    return [];
  }
  return motions;
}

/**
 * 애니메이션 견본 하나를 그 견본의 PR(`feat/figma-motion-<견본 이름에서 motion-을 뺀 이름>`)에 커밋한다. `figma/motions/<이름>.json`만 바꾼다.
 * 브랜치와 내용이 같으면 커밋하지 않는다.
 * @codocs [[피그마 연동:피그마 플러그인]]
 * @param token GitHub 토큰
 * @param motion 내보낸 모션
 * @param main main 상태
 * @param log 진행 로그
 * @returns 커밋 결과, 바뀐 것이 없으면 null
 */
async function commitMotion(
  token: string,
  motion: MotionFileExport,
  main: RepoState,
  log: (text: string) => void,
): Promise<PullRequestCommit | null> {
  const branch = motionBranchName(motion.name);
  const target = await readTarget(token, branch, main);
  log(
    `${motion.name}: ${target.openPullRequest === null ? BASE_BRANCH : branch} 기준으로 비교하는 중`,
  );
  const desired = new Map([
    [`${MOTIONS_DIR}/${motion.name}.json`, await textBlob(token, motion.text)],
  ]);
  const plan = planTree(desired, target.state.files, []);
  if (plan.entries.length === 0) {
    log(`${motion.name}: 바뀐 것이 없어 커밋하지 않는다.`);
    return null;
  }
  const subject = motionCommitSubject(motion.name);
  return commitToPullRequest(token, target, plan.entries, {
    target: motion.name,
    subject,
    message: `${subject}\n\n${motionCommitBody(motion.result.motion)}`,
    body: motionPullRequestBody(motion.result.motion),
    log,
  });
}

/**
 * tokens.json과 tokens.css를 만든다. 변환 규칙에 맞지 않는 토큰이 있으면 위반으로 더하고 null을 돌려준다.
 * @codocs [[피그마 연동:토큰 생성]]
 * @param violations 위반을 더할 목록
 * @returns 내보낸 토큰, 변환에 실패하면 null
 */
async function readTokens(violations: Violation[]): Promise<TokensExport | null> {
  try {
    return await exportTokensText();
  } catch (error) {
    if (!(error instanceof TokenFormatError)) {
      throw error;
    }
    violations.push({
      where: '토큰',
      reason: `tokens.css를 만들 수 없다: ${error.message}`,
      fix: '피그마에서 토큰 이름이나 값을 고친다. 규칙이 없는 변수 묶음·스타일 종류면 토큰 생성 규칙을 먼저 정한다.',
    });
    return null;
  }
}

/**
 * 브랜치 끝과 피그마 기준 자료 파일 목록을 읽는다.
 * @param token GitHub 토큰
 * @param branch 브랜치 이름
 * @returns 브랜치 상태
 */
async function readRepoState(token: string, branch: string): Promise<RepoState> {
  const head = await getBranchHead(token, branch);
  return { head, files: await listTreeFiles(token, head.treeSha, REPO_PREFIXES) };
}

/**
 * 고정 브랜치에 열린 PR이 있으면 그 브랜치 끝을, 없으면 main을 커밋 기준으로 고른다.
 * @param token GitHub 토큰
 * @param branch 브랜치 이름
 * @param main main 상태
 * @returns 커밋할 브랜치의 상태
 */
async function readTarget(token: string, branch: string, main: RepoState): Promise<Target> {
  const openPullRequest = await findOpenPullRequest(token, branch);
  const state = openPullRequest === null ? main : await readRepoState(token, branch);
  return { branch, state, openPullRequest };
}

/**
 * 컴포넌트 하나를 그 컴포넌트의 PR에 커밋한다. 컴포넌트 폴더의 export.json과 모든 변형 PNG를 새로 쓰고,
 * 사라진 변형의 파일과 이름이 바뀐 이전 폴더를 지우고, 쓰는 자산과 figma.json을 담는다.
 * 브랜치와 내용이 같은 파일은 바꾸지 않으므로, 바뀐 것이 없으면 커밋하지 않는다.
 * @codocs [[피그마 연동:피그마 플러그인]]
 * @param token GitHub 토큰
 * @param component 내보낸 컴포넌트
 * @param main main 상태
 * @param log 진행 로그
 * @returns 커밋 결과, 바뀐 것이 없으면 null
 */
async function commitComponent(
  token: string,
  component: PlacedTarget,
  main: RepoState,
  log: (text: string) => void,
): Promise<PullRequestCommit | null> {
  const { name } = component.exported.manifest;
  const branch = componentBranchName(componentSlug(name));
  const target = await readTarget(token, branch, main);
  log(`${name}: ${target.openPullRequest === null ? BASE_BRANCH : branch} 기준으로 비교하는 중`);

  const desired = await targetBlobs(token, [component], log);
  desired.set(
    SETTINGS_PATH,
    await textBlob(token, settingsText({ fileKey: FILE_KEY, scale: SCALE })),
  );
  const renamed = await renamedOldFolders(token, main, COMPONENTS_DIR, [component]);
  const owned = [component.folder, ...renamed];
  const plan = planTree(desired, target.state.files, owned);
  if (plan.entries.length === 0) {
    log(`${name}: 바뀐 것이 없어 커밋하지 않는다.`);
    return null;
  }

  const subject = componentCommitSubject(componentSlug(name));
  const message = `${subject}\n\n${targetCommitBody([name], {
    changedCount: plan.changed.length,
    deletedCount: plan.deleted.length,
    assetCount: plan.changed.filter((path) => path.startsWith(`${ASSETS_DIR}/`)).length,
  })}`;
  const changes = targetChanges(component, desired, main);
  return commitToPullRequest(token, target, plan.entries, {
    target: name,
    subject,
    message,
    body: componentPullRequestBody(branch, changes, renamed),
    log,
  });
}

/**
 * 한 영역의 조립을 그 영역의 조립 PR에 커밋한다. 조립 폴더마다 export.json과 모든 변형 PNG를 새로 쓰고,
 * 사라진 변형의 파일과 이름이 바뀐 이전 폴더를 지우고, 쓰는 자산을 담는다.
 * @codocs [[피그마 연동:피그마 플러그인]]
 * @param token GitHub 토큰
 * @param area 영역 폴더 이름
 * @param patterns 이번에 내보낸 그 영역의 조립
 * @param main main 상태
 * @param log 진행 로그
 * @returns 커밋 결과, 바뀐 것이 없으면 null
 */
async function commitPatterns(
  token: string,
  area: string,
  patterns: readonly PlacedPattern[],
  main: RepoState,
  log: (text: string) => void,
): Promise<PullRequestCommit | null> {
  const branch = patternBranchName(area);
  const target = await readTarget(token, branch, main);
  log(
    `${area} 조립: ${target.openPullRequest === null ? BASE_BRANCH : branch} 기준으로 비교하는 중`,
  );

  const desired = await targetBlobs(token, patterns, log);
  const renamed = await renamedOldFolders(token, main, `${PATTERNS_DIR}/${area}`, patterns);
  const owned = [...patterns.map((pattern) => pattern.folder), ...renamed];
  const plan = planTree(desired, target.state.files, owned);
  const names = patterns.map((pattern) => pattern.exported.manifest.name);
  if (plan.entries.length === 0) {
    log(`${area} 조립: 바뀐 것이 없어 커밋하지 않는다.`);
    return null;
  }

  const subject = patternsCommitSubject(area);
  const message = `${subject}\n\n${targetCommitBody(names, {
    changedCount: plan.changed.length,
    deletedCount: plan.deleted.length,
    assetCount: plan.changed.filter((path) => path.startsWith(`${ASSETS_DIR}/`)).length,
  })}`;
  const changes: TargetChanges[] = [];
  for (const pattern of patterns) {
    changes.push(targetChanges(pattern, desired, main));
  }
  return commitToPullRequest(token, target, plan.entries, {
    target: `${area} 조립`,
    subject,
    message,
    body: patternPullRequestBody(branch, area, changes, renamed),
    log,
  });
}

/**
 * 대상들의 export.json, 변형 PNG, 쓰는 자산을 blob으로 올리고 경로 → blob SHA를 만든다.
 * 같은 내용은 같은 SHA라, 브랜치의 SHA와 비교해 바뀐 파일만 고를 수 있다.
 * @param token GitHub 토큰
 * @param targets 내보낸 대상
 * @param log 진행 로그
 * @returns 저장소 경로 → blob SHA
 */
async function targetBlobs(
  token: string,
  targets: readonly PlacedTarget[],
  log: (text: string) => void,
): Promise<Map<string, string>> {
  const desired = new Map<string, string>();
  for (const { exported, folder } of targets) {
    desired.set(
      `${folder}/${MANIFEST_FILE}`,
      await textBlob(token, manifestText(exported.manifest)),
    );
    for (const [variant, png] of exported.pngs) {
      log(`이미지 올리는 중: ${folder}/${pngFile(variant)}`);
      desired.set(`${folder}/${pngFile(variant)}`, await bytesBlob(token, png));
    }
    for (const [file, bytes] of exported.assets) {
      const path = assetFilePath(file);
      if (!desired.has(path)) {
        desired.set(path, await bytesBlob(token, bytes));
      }
    }
  }
  return desired;
}

/**
 * main에서 이름이 바뀐 대상의 이전 폴더를 찾는다. 같은 nodeId의 export.json이 다른 폴더에 있으면 이전 폴더다.
 * @param token GitHub 토큰
 * @param main main 상태
 * @param root 대상 폴더들이 놓이는 폴더
 * @param targets 이번에 내보낸 대상
 * @returns 지울 이전 폴더
 */
async function renamedOldFolders(
  token: string,
  main: RepoState,
  root: string,
  targets: readonly PlacedTarget[],
): Promise<string[]> {
  const exported = targets.map((item) => ({
    folder: item.folder,
    nodeId: item.exported.manifest.nodeId,
  }));
  const others = new Map<string, string>();
  for (const path of main.files.keys()) {
    const folder = parentFolder(path);
    if (
      !path.startsWith(`${root}/`) ||
      !path.endsWith(`/${MANIFEST_FILE}`) ||
      exported.some((item) => item.folder === folder)
    ) {
      continue;
    }
    const text = await getFileText(token, path, main.head.commitSha);
    const nodeId = text === null ? null : readManifestNodeId(text);
    if (nodeId !== null) {
      others.set(folder, nodeId);
    }
  }
  return [...renamedFolders(exported, others).keys()];
}

/**
 * main과 비교한 대상의 변경과 현재 변형의 피그마 노드 ID를 구한다.
 * @param placed 대상
 * @param desired 이번에 쓸 파일 경로 → blob SHA
 * @param main main 상태
 * @returns PR 본문에 쓰는 대상 변경
 */
function targetChanges(
  placed: PlacedTarget,
  desired: ReadonlyMap<string, string>,
  main: RepoState,
): TargetChanges {
  const variants = Object.keys(placed.exported.manifest.variants);
  /**
   * 변형 PNG의 저장소 경로를 만든다.
   * @param variant 변형 이름
   * @returns 저장소 경로
   */
  function pngPath(variant: string): string {
    return `${placed.folder}/${pngFile(variant)}`;
  }
  const wanted = new Set(manifestFiles(placed.exported.manifest));
  const removed = [...main.files.keys()]
    .filter((path) => parentFolder(path) === placed.folder && path.endsWith('.png'))
    .map((path) => path.slice(placed.folder.length + 1))
    .filter((file) => !wanted.has(file))
    .map((file) => file.slice(0, -'.png'.length));
  return {
    name: placed.exported.manifest.name,
    folder: placed.folder,
    changedVariants: variants.filter(
      (variant) => main.files.get(pngPath(variant)) !== desired.get(pngPath(variant)),
    ),
    removedVariants: removed.sort(),
    variants: Object.entries(placed.exported.manifest.variants).map(([name, entry]) => ({
      name,
      nodeId: entry.nodeId,
    })),
  };
}

/**
 * 토큰이 main과 다르면 토큰 PR에 커밋한다. tokens.json과 같은 변환 함수로 만든 tokens.css, 토큰이 가리키는 이미지 자산,
 * 바뀐 토큰을 쓰는 컴포넌트의 변형 PNG를 담아 바로 병합할 수 있게 한다. 이번에 함께 내보낸 컴포넌트의 PNG는 그 컴포넌트 PR에만 넣으므로 여기서 뺀다.
 * @codocs [[피그마 연동:피그마 플러그인]]
 * @param token GitHub 토큰
 * @param tokens 내보낸 토큰
 * @param main main 상태
 * @param exportedNames 이번에 함께 내보낸 컴포넌트 이름
 * @param log 진행 로그
 * @returns 커밋 결과, 토큰이 main과 같거나 토큰 PR이 이미 같은 내용이면 null
 */
async function commitTokens(
  token: string,
  tokens: TokensExport,
  main: RepoState,
  exportedNames: ReadonlySet<string>,
  log: (text: string) => void,
): Promise<PullRequestCommit | null> {
  const desired = new Map<string, string>([
    [TOKENS_PATH, await textBlob(token, tokens.text)],
    [TOKENS_CSS_PATH, await textBlob(token, tokens.css)],
  ]);
  for (const [file, bytes] of tokens.images) {
    desired.set(assetFilePath(file), await bytesBlob(token, bytes));
  }
  if (planTree(desired, main.files, []).entries.length === 0) {
    log(`토큰이 ${BASE_BRANCH}와 같아 토큰 PR을 만들지 않는다.`);
    return null;
  }

  const mainTokens = await getFileText(token, TOKENS_PATH, main.head.commitSha);
  const changes = tokenChanges(mainTokens, tokens.text);
  log('바뀐 토큰을 쓰는 컴포넌트를 찾는 중');
  const usages = await readComponentTokenUsage();
  const affected = componentsUsingTokens(
    new Map(usages.map((usage) => [usage.name, usage.tokens])),
    changes.affectedNames,
  );
  const refreshed: string[] = [];
  for (const usage of usages) {
    if (!affected.includes(usage.name) || exportedNames.has(usage.name)) {
      continue;
    }
    const folder = `${COMPONENTS_DIR}/${componentSlug(usage.name)}`;
    const variants = new Set(
      [...main.files.keys()]
        .filter((path) => parentFolder(path) === folder && path.endsWith('.png'))
        .map((path) => path.slice(folder.length + 1, -'.png'.length)),
    );
    if (variants.size === 0) {
      continue;
    }
    const images = await exportVariantImages(usage.id, variants, SCALE);
    if (images === null) {
      log(`${usage.name}: 피그마에서 컴포넌트를 찾지 못해 변형 이미지를 다시 내보내지 않는다.`);
      continue;
    }
    if (!images.ok) {
      // 잘린 PNG는 틀린 그림이라 넣지 않고, main의 PNG를 그대로 둔다.
      for (const violation of images.violations) {
        log(`${violation.where}: ${violation.reason}. ${violation.fix}`);
      }
      log(`${usage.name}: 자르는 조상이 있어 변형 이미지를 다시 내보내지 않는다.`);
      continue;
    }
    const { pngs } = images;
    refreshed.push(usage.name);
    for (const [variant, png] of pngs) {
      log(`토큰 PR 이미지 올리는 중: ${folder}/${pngFile(variant)}`);
      desired.set(`${folder}/${pngFile(variant)}`, await bytesBlob(token, png));
    }
  }

  const target = await readTarget(token, TOKENS_BRANCH, main);
  const plan = planTree(desired, target.state.files, []);
  if (plan.entries.length === 0) {
    log(`토큰 PR(${TOKENS_BRANCH})이 이미 같은 토큰을 담고 있어 커밋하지 않는다.`);
    return null;
  }
  const summary = {
    addedPaths: changes.addedPaths,
    modifiedPaths: changes.modifiedPaths,
    removedPaths: changes.removedPaths,
    usingComponents: affected,
    refreshedComponents: refreshed,
    imageUploadCount: plan.changed.filter((path) => path.startsWith(`${ASSETS_DIR}/`)).length,
  };
  const subject = tokensCommitSubject();
  return commitToPullRequest(token, target, plan.entries, {
    target: '토큰',
    subject,
    message: `${subject}\n\n${tokensCommitBody(summary)}`,
    body: tokensPullRequestBody(summary),
    log,
  });
}

/**
 * 트리 항목으로 커밋하고, 열린 PR이 있으면 그 브랜치에 이어서, 없으면 main에서 브랜치를 만들어 PR을 연다.
 * 열린 PR이 없는데 브랜치가 남아 있으면(병합했거나 닫은 PR) main 기준 커밋으로 옮긴다. PR 본문은 늘 새로 쓴다.
 * @codocs [[피그마 연동:피그마 플러그인]]
 * @param token GitHub 토큰
 * @param target 커밋할 브랜치의 상태
 * @param entries 트리 항목
 * @param text 대상 이름, 커밋 제목·메시지, PR 본문, 진행 로그
 * @param text.target 대상 이름(컴포넌트 이름이나 `토큰`)
 * @param text.subject 커밋 제목(PR 제목)
 * @param text.message 커밋 메시지
 * @param text.body PR 본문
 * @param text.log 진행 로그
 * @returns 커밋 결과
 */
async function commitToPullRequest(
  token: string,
  target: Target,
  entries: readonly TreeEntry[],
  text: {
    target: string;
    subject: string;
    message: string;
    body: string;
    log: (text: string) => void;
  },
): Promise<PullRequestCommit> {
  const { head } = target.state;
  const tree = await createTree(token, head.treeSha, entries);
  const commit = await createCommit(token, text.message, tree, head.commitSha);
  if (target.openPullRequest !== null) {
    text.log(`${target.branch} 브랜치에 이어서 커밋하는 중`);
    await updateBranch(token, target.branch, commit);
    await updatePullRequestBody(token, target.openPullRequest.number, text.body);
    return {
      target: text.target,
      branch: target.branch,
      commitUrl: commitUrl(commit),
      pullRequestUrl: target.openPullRequest.url,
      isNewPullRequest: false,
    };
  }
  text.log(`${target.branch} 브랜치에 커밋하고 PR을 여는 중`);
  if ((await findBranchCommit(token, target.branch)) === null) {
    await createBranch(token, target.branch, commit);
  } else {
    await resetBranch(token, target.branch, commit);
  }
  return {
    target: text.target,
    branch: target.branch,
    commitUrl: commitUrl(commit),
    pullRequestUrl: await createPullRequest(token, {
      title: text.subject,
      body: text.body,
      head: target.branch,
      base: BASE_BRANCH,
    }),
    isNewPullRequest: true,
  };
}

/**
 * 글자 파일을 blob으로 올린다.
 * @param token GitHub 토큰
 * @param text 파일 내용
 * @returns blob SHA
 */
async function textBlob(token: string, text: string): Promise<string> {
  return createBlob(token, figma.base64Encode(utf8Encode(text)));
}

/**
 * 바이너리 파일을 blob으로 올린다.
 * @param token GitHub 토큰
 * @param bytes 파일 내용
 * @returns blob SHA
 */
async function bytesBlob(token: string, bytes: Uint8Array): Promise<string> {
  return createBlob(token, figma.base64Encode(bytes));
}
