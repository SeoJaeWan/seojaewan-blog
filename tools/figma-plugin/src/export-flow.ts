import type { Violation } from './core/check-structure';
import {
  type ComponentExport,
  exportComponentCore,
  exportVariantImages,
} from './core/export-component';
import { exportTokensText, type TokensExport } from './core/export-tokens';
import {
  COMPONENT_MANIFEST_FILE,
  hasComponentChange,
  planComponentChanges,
  pngFile,
  readManifestHashes,
  renamedFolders,
  settingsText,
} from './export-manifest';
import { listComponents } from './figma-reader';
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
  getFileBytes,
  getFileText,
  listDirectory,
  listTreeFiles,
  resetBranch,
  type TreeEntry,
  updateBranch,
  updatePullRequestBody,
} from './github-client';
import type { ExportOutcome, PullRequestCommit } from './messages';
import { assetFilePath, componentFilePath } from './naming';
import {
  BASE_BRANCH,
  CAPTURES_BRANCH,
  COMPONENTS_DIR,
  FILE_KEY,
  SCALE,
  SETTINGS_PATH,
  TOKENS_PATH,
} from './plugin-config';
import {
  componentBranchName,
  componentCommitBody,
  componentCommitSubject,
  componentPullRequestBody,
  TOKENS_BRANCH,
  tokensCommitBody,
  tokensCommitSubject,
  tokensPullRequestBody,
} from './pull-request-text';
import { componentsUsingTokens, tokenChanges } from './token-changes';

export type ExportRequest = {
  token: string;
  /** 내보낼 컴포넌트. 비어 있으면 토큰만 확인한다 */
  componentIds: readonly string[];
  log: (text: string) => void;
  /** 쓰는 곳이 없는 변수·스타일 알림(G2, 막지 않음)을 UI에 보여 준다 */
  notify: (notices: string[]) => void;
};

/** 브랜치 끝 커밋과 트리 */
type Head = { commitSha: string; treeSha: string };

/** main에서 읽은 기준 자료 */
type MainState = {
  head: Head;
  /** 컴포넌트 폴더 이름 → 폴더 안 파일 이름 */
  folders: Map<string, string[]>;
  /** 컴포넌트 폴더 이름 → export.json 내용 */
  manifests: Map<string, string>;
};

/** 커밋할 PR 브랜치의 상태 */
type Target = {
  branch: string;
  /** 커밋을 얹을 커밋. 열린 PR이 있으면 그 브랜치 끝, 없으면 main */
  head: Head;
  /** 열린 PR. 없으면 null */
  openPullRequest: { url: string; number: number } | null;
};

/**
 * 고른 컴포넌트를 구조 검사한 뒤, 컴포넌트마다 고정 브랜치(`feat/figma-<컴포넌트>`)의 PR에 바뀐 것만 커밋한다.
 * 위반이 하나라도 있으면 아무것도 커밋하지 않는다.
 * 컴포넌트 PR은 그 컴포넌트 폴더와 쓰는 자산(과 figma.json)만 바꾼다. 토큰은 늘 읽어 main의 tokens.json과 비교하고,
 * 다르면 토큰 PR(`feat/figma-tokens`)을 따로 열거나 갱신한다.
 * @codocs [[피그마 일치 검사:피그마 플러그인]]
 * @param request 토큰, 고른 컴포넌트, 진행 로그
 * @returns PR별 커밋 결과, 또는 위반 목록
 */
export async function runExport(request: ExportRequest): Promise<ExportOutcome> {
  const { token, log } = request;
  if (figma.fileKey !== undefined && figma.fileKey !== FILE_KEY) {
    throw new Error(`이 파일(${figma.fileKey})은 내보내기 대상(${FILE_KEY})이 아니다.`);
  }

  log('구조 검사 중');
  const exported: ComponentExport[] = [];
  const violations: Violation[] = [];
  for (const id of request.componentIds) {
    const outcome = await exportComponentCore(id, SCALE);
    if (!outcome.ok) {
      log(`${outcome.name}: 위반 ${String(outcome.violations.length)}개`);
      violations.push(...outcome.violations);
      continue;
    }
    if (exported.some((other) => other.slug === outcome.component.slug)) {
      throw new Error(`컴포넌트 폴더 이름 "${outcome.component.slug}"가 겹친다.`);
    }
    componentBranchName(outcome.component.slug);
    log(`${outcome.component.manifest.name}: 변형 ${String(outcome.component.pngs.size)}개 내보냄`);
    exported.push(outcome.component);
  }
  if (violations.length > 0) {
    return { kind: 'blocked', violations };
  }

  log('토큰 변환 중');
  const tokens = await exportTokensText();
  for (const name of tokens.skippedStyles) {
    log(`토큰이 아닌 칠 스타일이라 건너뜀: ${name}`);
  }
  request.notify(tokens.notices);

  log(`${BASE_BRANCH} 브랜치의 기준 자료를 읽는 중`);
  const main = await readMainState(token);
  const renamed = renamedOwners(exported, main.manifests);

  const commits: PullRequestCommit[] = [];
  const unchanged: string[] = [];
  for (const component of exported) {
    const commit = await commitComponent(
      token,
      component,
      main,
      renamed.get(component.slug) ?? [],
      log,
    );
    if (commit === null) {
      unchanged.push(component.manifest.name);
    } else {
      commits.push(commit);
    }
  }
  const tokensCommit = await commitTokens(
    token,
    tokens,
    main,
    new Set(exported.map((component) => component.slug)),
    log,
  );
  if (tokensCommit !== null) {
    commits.push(tokensCommit);
  }
  return { kind: 'done', commits, unchanged };
}

/**
 * main의 컴포넌트 폴더 목록과 모든 export.json을 읽는다. 바뀐 토큰을 쓰는 컴포넌트와 이름이 바뀐 폴더를 찾는 데 쓴다.
 * @param token GitHub 토큰
 * @returns main 기준 자료
 */
async function readMainState(token: string): Promise<MainState> {
  const head = await getBranchHead(token, BASE_BRANCH);
  const folders = groupByComponent(await listTreeFiles(token, head.treeSha, `${COMPONENTS_DIR}/`));
  const manifests = new Map<string, string>();
  for (const [slug, files] of folders) {
    if (!files.includes(COMPONENT_MANIFEST_FILE)) {
      continue;
    }
    const text = await getFileText(
      token,
      componentFilePath(slug, COMPONENT_MANIFEST_FILE),
      head.commitSha,
    );
    if (text !== null) {
      manifests.set(slug, text);
    }
  }
  return { head, folders, manifests };
}

/**
 * 이름이 바뀐 컴포넌트의 이전 폴더를, 그 컴포넌트(새 폴더 이름)마다 모은다. 이전 폴더는 그 컴포넌트 PR에서 지운다.
 * @param exported 이번에 내보낸 컴포넌트
 * @param manifests main의 컴포넌트 폴더 이름 → export.json 내용
 * @returns 새 폴더 이름 → 지울 이전 폴더 이름
 */
function renamedOwners(
  exported: readonly ComponentExport[],
  manifests: ReadonlyMap<string, string>,
): Map<string, string[]> {
  const nodeIds = new Map<string, string>();
  for (const [slug, text] of manifests) {
    const read = readManifestHashes(text);
    if (read !== null) {
      nodeIds.set(slug, read.nodeId);
    }
  }
  const owners = new Map<string, string[]>();
  for (const folder of renamedFolders(exported, nodeIds)) {
    const owner = exported.find((component) => component.manifest.nodeId === nodeIds.get(folder));
    if (owner !== undefined) {
      owners.set(owner.slug, [...(owners.get(owner.slug) ?? []), folder]);
    }
  }
  return owners;
}

/**
 * 고정 브랜치에 열린 PR이 있으면 그 브랜치 끝을, 없으면 main을 커밋 기준으로 고른다.
 * @param token GitHub 토큰
 * @param branch 브랜치 이름
 * @param main main 기준 자료
 * @returns 커밋할 브랜치의 상태
 */
async function readTarget(token: string, branch: string, main: MainState): Promise<Target> {
  const openPullRequest = await findOpenPullRequest(token, branch);
  const head = openPullRequest === null ? main.head : await getBranchHead(token, branch);
  return { branch, head, openPullRequest };
}

/**
 * 컴포넌트 하나를 그 컴포넌트의 PR에 커밋한다. 바뀐 변형의 PNG와 export.json, 사라진 변형의 파일, 바뀐 자산,
 * 이름이 바뀐 이전 폴더 삭제, figma.json만 담는다.
 * @codocs [[피그마 일치 검사:피그마 플러그인]]
 * @param token GitHub 토큰
 * @param component 내보낸 컴포넌트
 * @param main main 기준 자료
 * @param renamed 이 컴포넌트의 이전 폴더 이름(이름이 바뀐 경우)
 * @param log 진행 로그
 * @returns 커밋 결과, 바뀐 것이 없으면 null
 */
async function commitComponent(
  token: string,
  component: ComponentExport,
  main: MainState,
  renamed: readonly string[],
  log: (text: string) => void,
): Promise<PullRequestCommit | null> {
  const { slug, manifest } = component;
  const target = await readTarget(token, componentBranchName(slug), main);
  const isOnMain = target.openPullRequest === null;
  log(`${manifest.name}: ${isOnMain ? BASE_BRANCH : target.branch} 기준으로 비교하는 중`);

  const folders = isOnMain
    ? main.folders
    : groupByComponent(await listTreeFiles(token, target.head.treeSha, `${COMPONENTS_DIR}/`));
  const base = isOnMain
    ? (main.manifests.get(slug) ?? null)
    : await getFileText(
        token,
        componentFilePath(slug, COMPONENT_MANIFEST_FILE),
        target.head.commitSha,
      );
  const hashes =
    base === null ? new Map<string, string>() : (readManifestHashes(base)?.hashes ?? new Map());
  const change = planComponentChanges(component, base, hashes, folders.get(slug) ?? []);
  const deletedFolders = renamed.filter((folder) => folders.has(folder));

  const assetUploads = new Map<string, Uint8Array>();
  for (const [file, bytes] of component.assets) {
    if (!(await isSameFile(token, assetFilePath(file), target.head.commitSha, bytes))) {
      assetUploads.set(file, bytes);
    }
  }
  const settings = settingsText({ fileKey: FILE_KEY, scale: SCALE });
  const isSettingsChanged =
    (await getFileText(token, SETTINGS_PATH, target.head.commitSha)) !== settings;

  if (
    !hasComponentChange(change) &&
    deletedFolders.length === 0 &&
    assetUploads.size === 0 &&
    !isSettingsChanged
  ) {
    log(`${manifest.name}: 바뀐 것이 없어 커밋하지 않는다.`);
    return null;
  }

  const entries: TreeEntry[] = [];
  for (const variant of change.pngUploads) {
    const png = component.pngs.get(variant);
    if (png === undefined) {
      throw new Error(`${slug}/${variant}의 이미지가 없다.`);
    }
    log(`이미지 올리는 중: ${slug}/${pngFile(variant)}`);
    entries.push({
      path: componentFilePath(slug, pngFile(variant)),
      sha: await createBlob(token, figma.base64Encode(png)),
    });
  }
  for (const file of change.deletions) {
    entries.push({ path: componentFilePath(slug, file), sha: null });
  }
  if (change.manifestText !== null) {
    entries.push({
      path: componentFilePath(slug, COMPONENT_MANIFEST_FILE),
      content: change.manifestText,
    });
  }
  entries.push(...(await assetEntries(token, assetUploads, log)));
  for (const folder of deletedFolders) {
    for (const file of folders.get(folder) ?? []) {
      entries.push({ path: componentFilePath(folder, file), sha: null });
    }
  }
  if (isSettingsChanged) {
    entries.push({ path: SETTINGS_PATH, content: settings });
  }

  const subject = componentCommitSubject(slug);
  const message = `${subject}\n\n${componentCommitBody({
    name: manifest.name,
    slug,
    uploadCount: change.pngUploads.length,
    deletionCount:
      change.deletions.length +
      deletedFolders.reduce((sum, folder) => sum + (folders.get(folder)?.length ?? 0), 0),
    assetUploadCount: assetUploads.size,
  })}`;

  const mainHashes = readManifestHashes(main.manifests.get(slug) ?? '')?.hashes ?? new Map();
  const variants = Object.entries(manifest.variants);
  const body = componentPullRequestBody({
    name: manifest.name,
    slug,
    branch: target.branch,
    changedVariants: variants
      .filter(([variant, entry]) => mainHashes.get(variant) !== entry.hash)
      .map(([variant]) => variant),
    removedVariants: [...mainHashes.keys()].filter((variant) => !(variant in manifest.variants)),
    renamedFolders: renamed,
    capturedVariants: await capturedVariants(token, slug),
  });
  return commitToPullRequest(token, target, entries, {
    target: manifest.name,
    subject,
    message,
    body,
    log,
  });
}

/**
 * 토큰이 main과 다르면 토큰 PR에 커밋한다. tokens.json, 토큰이 가리키는 이미지 자산, 바뀐 토큰을 쓰는 컴포넌트의
 * 변형 PNG를 담는다. 이번에 함께 내보낸 컴포넌트의 PNG는 그 컴포넌트 PR에만 넣으므로 여기서 뺀다.
 * @codocs [[피그마 일치 검사:피그마 플러그인]]
 * @param token GitHub 토큰
 * @param tokens 내보낸 토큰
 * @param main main 기준 자료
 * @param exportedSlugs 이번에 함께 내보낸 컴포넌트 폴더 이름
 * @param log 진행 로그
 * @returns 커밋 결과, 토큰이 main과 같거나 토큰 PR이 이미 같은 내용이면 null
 */
async function commitTokens(
  token: string,
  tokens: TokensExport,
  main: MainState,
  exportedSlugs: ReadonlySet<string>,
  log: (text: string) => void,
): Promise<PullRequestCommit | null> {
  const mainTokens = await getFileText(token, TOKENS_PATH, main.head.commitSha);
  const mainImages = await changedFiles(token, tokens.images, main.head.commitSha);
  if (mainTokens === tokens.text && mainImages.size === 0) {
    log(`토큰이 ${BASE_BRANCH}와 같아 토큰 PR을 만들지 않는다.`);
    return null;
  }
  const target = await readTarget(token, TOKENS_BRANCH, main);
  const isTokensChanged =
    (target.openPullRequest === null
      ? mainTokens
      : await getFileText(token, TOKENS_PATH, target.head.commitSha)) !== tokens.text;
  const imageUploads =
    target.openPullRequest === null
      ? mainImages
      : await changedFiles(token, tokens.images, target.head.commitSha);
  if (!isTokensChanged && imageUploads.size === 0) {
    log(`토큰 PR(${TOKENS_BRANCH})이 이미 같은 토큰을 담고 있어 커밋하지 않는다.`);
    return null;
  }

  const changes = tokenChanges(mainTokens, tokens.text);
  const affected = componentsUsingTokens(main.manifests, changes.affectedNames).filter(
    (slug) => !exportedSlugs.has(slug),
  );
  const entries: TreeEntry[] = [];
  if (isTokensChanged) {
    entries.push({ path: TOKENS_PATH, content: tokens.text });
  }
  entries.push(...(await assetEntries(token, imageUploads, log)));
  const refreshed: string[] = [];
  for (const slug of affected) {
    const images = await refreshedImages(slug, main.manifests.get(slug) ?? '', log);
    if (images === null) {
      continue;
    }
    refreshed.push(images.name);
    for (const [variant, png] of images.pngs) {
      log(`토큰 PR 이미지 올리는 중: ${slug}/${pngFile(variant)}`);
      entries.push({
        path: componentFilePath(slug, pngFile(variant)),
        sha: await createBlob(token, figma.base64Encode(png)),
      });
    }
  }

  const summary = {
    changedPaths: changes.changedPaths,
    refreshedComponents: refreshed,
    imageUploadCount: imageUploads.size,
  };
  const subject = tokensCommitSubject();
  return commitToPullRequest(token, target, entries, {
    target: '토큰',
    subject,
    message: `${subject}\n\n${tokensCommitBody(summary)}`,
    body: tokensPullRequestBody(summary),
    log,
  });
}

/**
 * main에 있는 컴포넌트의 변형 PNG를 피그마에서 다시 내보낸다. export.json의 nodeId로 찾고, 없으면 이름으로 찾는다.
 * @param slug 컴포넌트 폴더 이름
 * @param manifestText main의 export.json 내용
 * @param log 진행 로그
 * @returns 컴포넌트 이름과 변형 이름 → PNG, 피그마에서 찾지 못하면 null
 */
async function refreshedImages(
  slug: string,
  manifestText: string,
  log: (text: string) => void,
): Promise<{ name: string; pngs: Map<string, Uint8Array> } | null> {
  const parsed: unknown = JSON.parse(manifestText);
  const name = readField(parsed, 'name') ?? slug;
  const variants = new Set(readManifestHashes(manifestText)?.hashes.keys() ?? []);
  const nodeId = readField(parsed, 'nodeId');
  let pngs = nodeId === null ? null : await exportVariantImages(nodeId, variants, SCALE);
  if (pngs === null) {
    const found = (await listComponents()).find((component) => component.name === name);
    pngs = found === undefined ? null : await exportVariantImages(found.id, variants, SCALE);
  }
  if (pngs === null) {
    log(`${name}: 피그마에서 컴포넌트를 찾지 못해 변형 이미지를 다시 내보내지 않는다.`);
    return null;
  }
  return { name, pngs };
}

/**
 * 트리 항목으로 커밋하고, 열린 PR이 있으면 그 브랜치에 이어서, 없으면 main에서 브랜치를 만들어 PR을 연다.
 * 열린 PR이 없는데 브랜치가 남아 있으면(병합했거나 닫은 PR) main 기준 커밋으로 옮긴다. PR 본문은 늘 새로 쓴다.
 * @codocs [[피그마 일치 검사:피그마 플러그인]]
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
  const tree = await createTree(token, target.head.treeSha, entries);
  const commit = await createCommit(token, text.message, tree, target.head.commitSha);
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
 * 자산 파일을 blob으로 올리고 트리 항목으로 만든다.
 * @param token GitHub 토큰
 * @param uploads 자산 파일(`<묶음>/<자산>`) → 내용
 * @param log 진행 로그
 * @returns 트리 항목
 */
async function assetEntries(
  token: string,
  uploads: ReadonlyMap<string, Uint8Array>,
  log: (text: string) => void,
): Promise<TreeEntry[]> {
  const entries: TreeEntry[] = [];
  for (const [file, bytes] of uploads) {
    log(`자산 올리는 중: ${file}`);
    entries.push({
      path: assetFilePath(file),
      sha: await createBlob(token, figma.base64Encode(bytes)),
    });
  }
  return entries;
}

/**
 * 자산 파일 가운데 저장소와 내용이 다른 것만 고른다.
 * @param token GitHub 토큰
 * @param files 자산 파일(`<묶음>/<자산>`) → 내용
 * @param ref 커밋 SHA
 * @returns 다르거나 없는 자산 파일
 */
async function changedFiles(
  token: string,
  files: ReadonlyMap<string, Uint8Array>,
  ref: string,
): Promise<Map<string, Uint8Array>> {
  const changed = new Map<string, Uint8Array>();
  for (const [file, bytes] of files) {
    if (!(await isSameFile(token, assetFilePath(file), ref, bytes))) {
      changed.set(file, bytes);
    }
  }
  return changed;
}

/**
 * `parity-captures` 브랜치에 현재 구현 캡처가 있는 변형을 찾는다. 브랜치나 폴더가 없으면 비어 있다.
 * @codocs [[피그마 일치 검사:캡처 표]]
 * @param token GitHub 토큰
 * @param slug 컴포넌트 폴더 이름
 * @returns 캡처가 있는 변형 이름
 */
async function capturedVariants(token: string, slug: string): Promise<Set<string>> {
  const files = (await listDirectory(token, slug, CAPTURES_BRANCH)) ?? [];
  return new Set(
    files.filter((file) => file.endsWith('.png')).map((file) => file.slice(0, -'.png'.length)),
  );
}

/**
 * 컴포넌트 폴더 아래 파일 경로를 폴더마다 묶는다. 하위 폴더 안 파일은 무시한다.
 * @param paths 저장소 기준 경로(`.../figma/components/<컴포넌트>/<파일>`)
 * @returns 폴더 이름 → 그 폴더의 파일 이름
 */
function groupByComponent(paths: readonly string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const path of paths) {
    const [slug, file, ...rest] = path.slice(COMPONENTS_DIR.length + 1).split('/');
    if (slug === undefined || file === undefined || rest.length > 0) {
      continue;
    }
    groups.set(slug, [...(groups.get(slug) ?? []), file]);
  }
  return groups;
}

/**
 * 저장소 파일이 내용과 같은지 확인한다.
 * @param token GitHub 토큰
 * @param path 저장소 경로
 * @param ref 커밋 SHA
 * @param bytes 비교할 내용
 * @returns 같으면 true, 파일이 없거나 다르면 false
 */
async function isSameFile(
  token: string,
  path: string,
  ref: string,
  bytes: Uint8Array,
): Promise<boolean> {
  const current = await getFileBytes(token, path, ref);
  return (
    current !== null &&
    current.length === bytes.length &&
    current.every((byte, index) => byte === bytes[index])
  );
}

/**
 * JSON 객체의 문자열 필드를 읽는다.
 * @param value JSON 값
 * @param key 필드 이름
 * @returns 문자열 값, 없으면 null
 */
function readField(value: unknown, key: string): string | null {
  if (value === null || typeof value !== 'object') {
    return null;
  }
  const field: unknown = Reflect.get(value, key);
  return typeof field === 'string' ? field : null;
}
