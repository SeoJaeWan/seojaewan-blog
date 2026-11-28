import type {
  ComponentLayout,
  ComponentSchema,
} from '../../../packages/design-system/src/figma-contract';
import { exportAssets } from './core/export-assets';
import { createExportContext, exportComponent } from './core/export-component';
import { exportTokensText, type TokensExport } from './core/export-tokens';
import { gitBlobSha } from './git-blob';
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
import type {
  ExportOutcome,
  ExportProgress,
  PullRequestCommit,
  TargetKind,
  ViolationGroup,
} from './messages';
import { assetFilePath, componentLayoutPath, componentSchemaPath, componentSlug } from './naming';
import { ASSETS_DIR, BASE_BRANCH, FILE_KEY, TOKENS_PATH } from './plugin-config';
import {
  ASSETS_BRANCH,
  assetsCommitSubject,
  assetsPullRequestBody,
  changesetPath,
  changesetText,
  componentBranchName,
  componentCommitSubject,
  componentPullRequestBody,
  TOKENS_BRANCH,
  tokensCommitBody,
  tokensCommitSubject,
  tokensPullRequestBody,
  variantChanges,
} from './pull-request-text';
import { tokenChanges } from './token-changes';
import { COMPARED_PREFIXES, isAssetSourcePath, planTree } from './tree-changes';
import { utf8Encode } from './utf8';

/**
 * 내보내기 요청.
 * - isTokensSelected: 토큰을 골랐는지. 고르지 않아도 토큰은 늘 읽어 main과 비교하고, 다르면 토큰 PR을 연다
 * - isAssetsSelected: 자산을 골랐는지
 * - componentIds: 내보낼 컴포넌트(세트이거나 변형이 없는 컴포넌트)
 * - notify: 막지 않는 알림(쓰는 곳이 없는 변수·스타일)을 UI에 보여 준다
 * - progress: 진행 막대와 지금 하는 일을 UI에 알린다
 */
export type ExportRequest = {
  token: string;
  isTokensSelected: boolean;
  isAssetsSelected: boolean;
  componentIds: readonly string[];
  log: (text: string) => void;
  notify: (notices: string[]) => void;
  progress: (update: ExportProgress) => void;
};

/** 브랜치 끝 커밋과 트리 */
type Head = { commitSha: string; treeSha: string };

/** 브랜치 끝과 그때의 비교 범위 파일(경로 → blob SHA) */
type RepoState = { head: Head; files: Map<string, string> };

/**
 * 커밋할 PR 브랜치의 상태.
 * - state: 커밋을 얹을 상태. 열린 PR이 있으면 그 브랜치 끝, 없으면 main
 * - openPullRequest: 열린 PR. 없으면 null
 */
type Target = {
  branch: string;
  state: RepoState;
  openPullRequest: { url: string; number: number } | null;
};

/** 쓸 파일 하나. sha는 플러그인에서 계산한 git blob SHA-1이다 */
type DesiredFile = { path: string; bytes: Uint8Array; sha: string };

/** 검사를 통과한 컴포넌트 */
type ExportedComponent = {
  name: string;
  slug: string;
  schema: ComponentSchema;
  layout: ComponentLayout;
};

/** 커밋 글. subject: 커밋 제목(PR 제목), message: 커밋 메시지, body: PR 본문, changeset: PR을 열 때 올리는 changeset */
type CommitText = {
  target: string;
  kind: TargetKind;
  subject: string;
  message: string;
  body: string;
  changeset: { name: string; target: string };
};

/**
 * 고른 대상을 구조 검사한 뒤 PR에 커밋한다. 컴포넌트는 하나마다 `feat/figma-<컴포넌트>`, 자산은 `feat/figma-assets`,
 * 토큰은 `feat/figma-tokens` PR이다. 위반이 하나라도 있으면 아무것도 커밋하지 않는다.
 * 컴포넌트 PR은 그 컴포넌트의 스키마와 검증 자료만, 자산 PR은 자산 원본만, 토큰 PR은 tokens.json만 바꾸고,
 * PR을 열 때 changeset을 함께 올린다. 바뀐 파일만 blob으로 올린다.
 * 토큰은 고르지 않아도 늘 읽어 main의 tokens.json과 비교하고, 다르면 토큰 PR을 열거나 갱신한다.
 * @codocs [[디자인 시스템:피그마 플러그인]]
 * @codocs [[디자인 시스템:PR 흐름]]
 * @param request 토큰, 고른 대상, 진행 로그
 * @returns PR별 커밋 결과, 또는 대상별 위반 목록
 */
export async function runExport(request: ExportRequest): Promise<ExportOutcome> {
  const { token, log } = request;
  if (figma.fileKey !== undefined && figma.fileKey !== FILE_KEY) {
    throw new Error(`이 파일(${figma.fileKey})은 내보내기 대상(${FILE_KEY})이 아니다.`);
  }
  const checkTotal = request.componentIds.length + (request.isAssetsSelected ? 1 : 0) + 1;
  let checked = 0;
  /**
   * 검사 단계에서 대상 하나를 시작했음을 알린다.
   * @param text 지금 하는 일
   */
  function checkStep(text: string): void {
    request.progress({ phase: 'check', done: checked, total: checkTotal, text });
    checked += 1;
  }

  log('구조 검사 중');
  const groups: ViolationGroup[] = [];
  const components: ExportedComponent[] = [];
  const context = request.componentIds.length === 0 ? null : await createExportContext();
  for (const id of request.componentIds) {
    const node = await figma.getNodeByIdAsync(id);
    if (node?.type !== 'COMPONENT_SET' && node?.type !== 'COMPONENT') {
      throw new Error(`컴포넌트 ${id}를 찾을 수 없다.`);
    }
    checkStep(`${node.name} 검사·내보내는 중`);
    const outcome = await exportComponent(node, context === null ? {} : { context });
    if (outcome.violations.length > 0 || outcome.schema === null || outcome.layout === null) {
      log(`${node.name}: 위반 ${String(outcome.violations.length)}개`);
      groups.push({ target: node.name, kind: 'component', violations: outcome.violations });
      continue;
    }
    const slug = componentSlug(node.name);
    if (components.some((other) => other.slug === slug)) {
      throw new Error(`컴포넌트 폴더 이름 "${slug}"가 겹친다.`);
    }
    componentBranchName(slug);
    log(`${node.name}: 변형 ${String(outcome.schema.variants.length)}개 읽음`);
    components.push({ name: node.name, slug, schema: outcome.schema, layout: outcome.layout });
  }

  let assets: Map<string, Uint8Array> | null = null;
  if (request.isAssetsSelected) {
    checkStep('자산 내보내는 중');
    log('자산 내보내는 중');
    const exported = await exportAssets();
    if (exported.violations.length > 0) {
      groups.push({ target: '자산', kind: 'assets', violations: exported.violations });
    } else {
      assets = exported.files;
      log(`자산 ${String(exported.files.size)}개 읽음`);
    }
  }

  checkStep('토큰 읽는 중');
  log('토큰 읽는 중');
  const tokens = await readTokens(groups);
  if (tokens === null || groups.length > 0) {
    return { kind: 'blocked', groups };
  }
  for (const name of tokens.skippedStyles) {
    log(`토큰이 아닌 칠 스타일이라 건너뜀: ${name}`);
  }
  request.notify(tokens.notices);

  log(`${BASE_BRANCH} 브랜치를 읽는 중`);
  const main = await readRepoState(token, BASE_BRANCH);
  const commitTotal = components.length + (assets === null ? 0 : 1) + 1;
  let committed = 0;
  /**
   * 커밋 단계에서 PR 하나를 시작했음을 알린다.
   * @param text 지금 하는 일
   */
  function commitStep(text: string): void {
    request.progress({ phase: 'commit', done: committed, total: commitTotal, text });
    committed += 1;
  }
  const commits: PullRequestCommit[] = [];
  const unchanged: string[] = [];
  /**
   * 커밋 결과를 모은다.
   * @param name 대상 이름
   * @param commit 커밋 결과, 바뀐 것이 없으면 null
   */
  function collect(name: string, commit: PullRequestCommit | null): void {
    if (commit === null) {
      unchanged.push(name);
    } else {
      commits.push(commit);
    }
  }
  for (const component of components) {
    commitStep(`${component.name} 커밋 중`);
    collect(component.name, await commitComponent(token, component, main, log));
  }
  if (assets !== null) {
    commitStep('자산 커밋 중');
    collect('자산', await commitAssets(token, assets, main, log));
  }
  commitStep('토큰 비교·커밋 중');
  const tokensCommit = await commitTokens(token, tokens, main, log);
  if (tokensCommit !== null) {
    commits.push(tokensCommit);
  } else if (request.isTokensSelected) {
    unchanged.push('토큰');
  }
  request.progress({ phase: 'commit', done: commitTotal, total: commitTotal, text: '끝' });
  return { kind: 'done', commits, unchanged };
}

/**
 * tokens.json을 만든다. 규칙에 맞지 않는 토큰이 있으면 위반으로 더하고 null을 돌려준다.
 * @codocs [[디자인 시스템:토큰 검사]]
 * @param groups 위반 묶음을 더할 목록
 * @returns 내보낸 토큰, 만들 수 없으면 null
 */
async function readTokens(groups: ViolationGroup[]): Promise<TokensExport | null> {
  try {
    return await exportTokensText();
  } catch (error) {
    groups.push({
      target: '토큰',
      kind: 'tokens',
      violations: [
        {
          where: '토큰',
          reason: error instanceof Error ? error.message : String(error),
          fix: '피그마에서 토큰 이름이나 값을 고친다. 규칙이 없는 변수 묶음·스타일 종류면 토큰 생성 규칙을 먼저 정한다.',
          nodeId: null,
        },
      ],
    });
    return null;
  }
}

/**
 * 컴포넌트 하나를 그 컴포넌트의 PR에 커밋한다. 스키마와 검증 자료만 바꾼다.
 * PR 본문은 main의 스키마와 견준 변형 변경 표다.
 * @codocs [[디자인 시스템:피그마 플러그인]]
 * @param token GitHub 토큰
 * @param component 검사를 통과한 컴포넌트
 * @param main main 상태
 * @param log 진행 로그
 * @returns 커밋 결과, 바뀐 것이 없으면 null
 */
async function commitComponent(
  token: string,
  component: ExportedComponent,
  main: RepoState,
  log: (text: string) => void,
): Promise<PullRequestCommit | null> {
  const schemaPath = componentSchemaPath(component.slug);
  const files = [
    textFile(schemaPath, jsonFileText(component.schema)),
    textFile(componentLayoutPath(component.slug), jsonFileText(component.layout)),
  ];
  const target = await readTarget(token, componentBranchName(component.slug), main);
  log(
    `${component.name}: ${target.openPullRequest === null ? BASE_BRANCH : target.branch} 기준으로 비교하는 중`,
  );
  if (planTree(shaMap(files), target.state.files).entries.length === 0) {
    log(`${component.name}: 바뀐 것이 없어 커밋하지 않는다.`);
    return null;
  }
  const mainText = main.files.has(schemaPath)
    ? await getFileText(token, schemaPath, main.head.commitSha)
    : null;
  const mainSchema = mainText === null ? null : parseSchema(mainText);
  const subject = componentCommitSubject(component.slug);
  return commitFiles(
    token,
    target,
    files,
    () => false,
    {
      target: component.name,
      kind: 'component',
      subject,
      message: `${subject}\n\n피그마에서 내보낸 ${component.name}의 스키마와 검증 자료를 갱신한다.`,
      body: componentPullRequestBody(
        component.name,
        variantChanges(mainSchema, component.schema),
        mainText === null,
      ),
      changeset: { name: `figma-${component.slug}`, target: `${component.name} 컴포넌트` },
    },
    log,
  );
}

/**
 * 자산 원본을 자산 PR에 커밋한다. 자산을 모두 내보냈으므로, 피그마에서 지웠거나 형식이 바뀐 예전 원본은 지운다.
 * @codocs [[디자인 시스템:피그마 플러그인]]
 * @codocs [[디자인 시스템:자산]]
 * @param token GitHub 토큰
 * @param assets 자산 폴더 기준 경로 → 내용
 * @param main main 상태
 * @param log 진행 로그
 * @returns 커밋 결과, 바뀐 것이 없으면 null
 */
async function commitAssets(
  token: string,
  assets: ReadonlyMap<string, Uint8Array>,
  main: RepoState,
  log: (text: string) => void,
): Promise<PullRequestCommit | null> {
  const files = [...assets].map(([file, bytes]) => desiredFile(assetFilePath(file), bytes));
  const target = await readTarget(token, ASSETS_BRANCH, main);
  if (planTree(shaMap(files), target.state.files, isAssetSourcePath).entries.length === 0) {
    log('자산: 바뀐 것이 없어 커밋하지 않는다.');
    return null;
  }
  const fromMain = planTree(shaMap(files), main.files, isAssetSourcePath);
  const prefixLength = ASSETS_DIR.length + 1;
  const body = assetsPullRequestBody({
    changedFiles: fromMain.changed.map((path) => path.slice(prefixLength)),
    deletedFiles: fromMain.deleted.map((path) => path.slice(prefixLength)),
  });
  const subject = assetsCommitSubject();
  return commitFiles(
    token,
    target,
    files,
    isAssetSourcePath,
    {
      target: '자산',
      kind: 'assets',
      subject,
      message: `${subject}\n\n${body}`,
      body,
      changeset: { name: 'figma-assets', target: '자산' },
    },
    log,
  );
}

/**
 * 토큰이 main과 다르면 토큰 PR에 커밋한다. tokens.json만 바꾼다. main과 같으면 PR을 열지 않는다.
 * @codocs [[디자인 시스템:피그마 플러그인]]
 * @param token GitHub 토큰
 * @param tokens 내보낸 토큰
 * @param main main 상태
 * @param log 진행 로그
 * @returns 커밋 결과, main과 같거나 토큰 PR이 이미 같은 내용이면 null
 */
async function commitTokens(
  token: string,
  tokens: TokensExport,
  main: RepoState,
  log: (text: string) => void,
): Promise<PullRequestCommit | null> {
  const files = [textFile(TOKENS_PATH, tokens.text)];
  if (planTree(shaMap(files), main.files).entries.length === 0) {
    log(`토큰이 ${BASE_BRANCH}와 같아 토큰 PR을 만들지 않는다.`);
    return null;
  }
  const target = await readTarget(token, TOKENS_BRANCH, main);
  if (planTree(shaMap(files), target.state.files).entries.length === 0) {
    log(`토큰 PR(${TOKENS_BRANCH})이 이미 같은 토큰을 담고 있어 커밋하지 않는다.`);
    return null;
  }
  const changes = tokenChanges(
    await getFileText(token, TOKENS_PATH, main.head.commitSha),
    tokens.text,
  );
  const summary = {
    addedPaths: changes.addedPaths,
    modifiedPaths: changes.modifiedPaths,
    removedPaths: changes.removedPaths,
  };
  const subject = tokensCommitSubject();
  return commitFiles(
    token,
    target,
    files,
    () => false,
    {
      target: '토큰',
      kind: 'tokens',
      subject,
      message: `${subject}\n\n${tokensCommitBody(summary)}`,
      body: tokensPullRequestBody(summary),
      changeset: { name: 'figma-tokens', target: '토큰' },
    },
    log,
  );
}

/**
 * 파일을 커밋하고, 열린 PR이 있으면 그 브랜치에 이어서, 없으면 main에서 브랜치를 만들어 PR을 연다.
 * PR을 새로 열 때는 changeset을 함께 올린다. 커밋할 브랜치와 SHA가 다른 파일만 blob으로 올린다.
 * 열린 PR이 없는데 브랜치가 남아 있으면(병합했거나 닫은 PR) main 기준 커밋으로 옮긴다. PR 본문은 늘 새로 쓴다.
 * @codocs [[디자인 시스템:피그마 플러그인]]
 * @codocs [[디자인 시스템:PR 흐름]]
 * @param token GitHub 토큰
 * @param target 커밋할 브랜치의 상태
 * @param files 쓸 파일
 * @param isOwned 이 커밋이 맡아 사라지면 지우는 파일인지
 * @param text 대상 이름, 커밋·PR 글, changeset
 * @param log 진행 로그
 * @returns 커밋 결과
 */
async function commitFiles(
  token: string,
  target: Target,
  files: readonly DesiredFile[],
  isOwned: (path: string) => boolean,
  text: CommitText,
  log: (text: string) => void,
): Promise<PullRequestCommit> {
  const isNew = target.openPullRequest === null;
  const all = isNew
    ? [...files, textFile(changesetPath(text.changeset.name), changesetText(text.changeset.target))]
    : files;
  const plan = planTree(shaMap(all), target.state.files, isOwned);
  const contents = new Map(all.map((file) => [file.path, file.bytes]));
  const entries: TreeEntry[] = [];
  for (const entry of plan.entries) {
    const bytes = entry.sha === null ? undefined : contents.get(entry.path);
    if (bytes === undefined) {
      entries.push(entry);
      continue;
    }
    log(`올리는 중: ${entry.path}`);
    entries.push({ path: entry.path, sha: await createBlob(token, figma.base64Encode(bytes)) });
  }
  const { head } = target.state;
  const tree = await createTree(token, head.treeSha, entries);
  const commit = await createCommit(token, text.message, tree, head.commitSha);
  const result = {
    target: text.target,
    kind: text.kind,
    branch: target.branch,
    commitUrl: commitUrl(commit),
  };
  if (target.openPullRequest !== null) {
    log(`${target.branch} 브랜치에 이어서 커밋하는 중`);
    await updateBranch(token, target.branch, commit);
    await updatePullRequestBody(token, target.openPullRequest.number, text.body);
    return { ...result, pullRequestUrl: target.openPullRequest.url, isNewPullRequest: false };
  }
  log(`${target.branch} 브랜치에 커밋하고 PR을 여는 중`);
  if ((await findBranchCommit(token, target.branch)) === null) {
    await createBranch(token, target.branch, commit);
  } else {
    await resetBranch(token, target.branch, commit);
  }
  return {
    ...result,
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
 * 브랜치 끝과 비교 범위의 파일 목록을 읽는다.
 * @param token GitHub 토큰
 * @param branch 브랜치 이름
 * @returns 브랜치 상태
 */
async function readRepoState(token: string, branch: string): Promise<RepoState> {
  const head = await getBranchHead(token, branch);
  return { head, files: await listTreeFiles(token, head.treeSha, COMPARED_PREFIXES) };
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
 * 스키마·검증 자료 파일 내용을 만든다. 2칸 들여쓴 JSON이고 끝에 줄바꿈을 붙인다.
 * @param value 스키마나 검증 자료
 * @returns 파일 내용
 */
function jsonFileText(value: ComponentSchema | ComponentLayout): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

/**
 * 저장소의 스키마 파일을 읽는다. 꼴이 맞지 않으면(옛 판 등) 없는 것으로 본다.
 * @param text 파일 내용
 * @returns 스키마, 읽을 수 없으면 null
 */
function parseSchema(text: string): ComponentSchema | null {
  try {
    const value: unknown = JSON.parse(text);
    return isSchema(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * 값이 변형 목록을 가진 스키마 꼴인지 본다. PR 본문의 변형 비교에 필요한 만큼만 본다.
 * @param value JSON 값
 * @returns 스키마 꼴이면 true
 */
function isSchema(value: unknown): value is ComponentSchema {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const variants: unknown = Reflect.get(value, 'variants');
  return (
    Array.isArray(variants) &&
    variants.every(
      /**
       * 변형 하나가 이름과 노드 ID를 가졌는지 본다.
       * @param variant 변형 값
       * @returns 가졌으면 true
       */
      (variant: unknown) =>
        typeof variant === 'object' &&
        variant !== null &&
        typeof Reflect.get(variant, 'name') === 'string' &&
        typeof Reflect.get(variant, 'nodeId') === 'string',
    )
  );
}

/**
 * 글자 파일을 만든다.
 * @param path 저장소 경로
 * @param text 내용
 * @returns 쓸 파일
 */
function textFile(path: string, text: string): DesiredFile {
  return desiredFile(path, utf8Encode(text));
}

/**
 * 쓸 파일을 만들고 git blob SHA-1을 계산한다.
 * @param path 저장소 경로
 * @param bytes 내용
 * @returns 쓸 파일
 */
function desiredFile(path: string, bytes: Uint8Array): DesiredFile {
  return { path, bytes, sha: gitBlobSha(bytes) };
}

/**
 * 쓸 파일을 경로 → SHA 표로 바꾼다.
 * @param files 쓸 파일
 * @returns 경로 → SHA
 */
function shaMap(files: readonly DesiredFile[]): Map<string, string> {
  return new Map(files.map((file) => [file.path, file.sha]));
}
