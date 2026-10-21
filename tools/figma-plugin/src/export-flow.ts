import type { Violation } from './core/check-structure';
import {
  type ComponentExport,
  exportComponentCore,
  readCheckContext,
} from './core/export-component';
import { exportTokensText } from './core/export-tokens';
import {
  COMPONENT_MANIFEST_FILE,
  type ComponentChanges,
  hasComponentChange,
  planComponentChanges,
  pngFile,
  readManifestHashes,
  renamedFolders,
  settingsText,
} from './export-manifest';
import {
  commitUrl,
  createBlob,
  createBranch,
  createCommit,
  createPullRequest,
  createTree,
  findOpenPullRequest,
  getBranchHead,
  getFileBytes,
  getFileText,
  listTreeFiles,
  type TreeEntry,
  updateBranch,
} from './github-client';
import { assetFilePath, componentFilePath } from './naming';
import {
  BASE_BRANCH,
  COMPONENTS_DIR,
  FILE_KEY,
  SCALE,
  SETTINGS_PATH,
  TOKENS_PATH,
} from './plugin-config';
import {
  commitBody,
  commitSubject,
  exportBranchName,
  type ExportSummary,
  pullRequestBody,
} from './pull-request-text';

export type ExportRequest = {
  token: string;
  componentIds: readonly string[];
  shouldExportTokens: boolean;
  /** 커밋할 기존 브랜치. 비어 있으면 새 브랜치를 만들고 PR을 연다 */
  branch: string;
  log: (text: string) => void;
};

/** 커밋 결과 */
export type ExportCommit = {
  /** 커밋한 브랜치 */
  branch: string;
  /** 만든 커밋 주소 */
  commitUrl: string;
  /** 연 PR이나 그 브랜치에 열려 있는 PR 주소. 없으면 null */
  pullRequestUrl: string | null;
  /** 이번에 새로 연 PR이면 true */
  isNewPullRequest: boolean;
};

/** 내보내기 결과. 구조 검사 위반이 있으면 커밋하지 않고 위반 목록을 돌려준다 */
export type ExportResult =
  | { kind: 'committed'; commit: ExportCommit }
  | { kind: 'unchanged' }
  | { kind: 'blocked'; violations: Violation[] };

/**
 * 고른 컴포넌트를 구조 검사한 뒤 내보내 바뀐 것만 커밋한다. 위반이 하나라도 있으면 아무것도 커밋하지 않는다.
 * 내보낸 컴포넌트의 폴더(figma/components/<컴포넌트>/)와 그 컴포넌트가 쓰는 아이콘(figma/icons/)만 바꾸고,
 * 토큰은 고른 경우에만, figma.json은 파일 키나 배율이 바뀐 경우에만 쓴다.
 * 기존 브랜치를 주면 그 브랜치 끝에서 빨리 감기로 커밋하고 PR을 새로 열지 않는다.
 * @codocs [[피그마 일치 검사:피그마 플러그인]]
 * @param request 토큰, 고른 컴포넌트, 토큰 내보내기 여부, 기존 브랜치, 진행 로그
 * @returns 커밋 결과, 바뀐 것 없음, 또는 위반 목록
 */
export async function runExport(request: ExportRequest): Promise<ExportResult> {
  const { token, log } = request;
  if (figma.fileKey !== undefined && figma.fileKey !== FILE_KEY) {
    throw new Error(`이 파일(${figma.fileKey})은 내보내기 대상(${FILE_KEY})이 아니다.`);
  }
  const existingBranch = request.branch.trim();

  log('구조 검사 중');
  const context = await readCheckContext();
  const exported: ComponentExport[] = [];
  const violations: Violation[] = [];
  for (const id of request.componentIds) {
    const outcome = await exportComponentCore(id, context, SCALE);
    if (!outcome.ok) {
      log(`${outcome.name}: 위반 ${String(outcome.violations.length)}개`);
      violations.push(...outcome.violations);
      continue;
    }
    if (exported.some((other) => other.slug === outcome.component.slug)) {
      throw new Error(`컴포넌트 폴더 이름 "${outcome.component.slug}"가 겹친다.`);
    }
    log(`${outcome.component.manifest.name}: 변형 ${String(outcome.component.pngs.size)}개 내보냄`);
    exported.push(outcome.component);
  }
  if (violations.length > 0) {
    return { kind: 'blocked', violations };
  }

  const targetBranch = existingBranch === '' ? BASE_BRANCH : existingBranch;
  log(`${targetBranch} 브랜치의 기준 자료를 읽는 중`);
  const head = await getBranchHead(token, targetBranch);
  const folderFiles = groupByComponent(
    await listTreeFiles(token, head.treeSha, `${COMPONENTS_DIR}/`),
  );

  const changes: ComponentChanges[] = [];
  for (const component of exported) {
    const base = await getFileText(
      token,
      componentFilePath(component.slug, COMPONENT_MANIFEST_FILE),
      head.commitSha,
    );
    const hashes =
      base === null
        ? new Map<string, string>()
        : (readManifestHashes(base)?.hashes ?? new Map<string, string>());
    changes.push(
      planComponentChanges(component, base, hashes, folderFiles.get(component.slug) ?? []),
    );
  }
  const otherNodeIds = new Map<string, string>();
  for (const slug of folderFiles.keys()) {
    if (!exported.some((component) => component.slug === slug)) {
      const text = await getFileText(
        token,
        componentFilePath(slug, COMPONENT_MANIFEST_FILE),
        head.commitSha,
      );
      const other = text === null ? null : readManifestHashes(text);
      if (other !== null) {
        otherNodeIds.set(slug, other.nodeId);
      }
    }
  }
  const renamed = renamedFolders(exported, otherNodeIds);

  const assetUploads = new Map<string, Uint8Array>();
  for (const component of exported) {
    for (const [file, svg] of component.assets) {
      if (
        !assetUploads.has(file) &&
        !(await isSameFile(token, assetFilePath(file), head.commitSha, svg))
      ) {
        assetUploads.set(file, svg);
      }
    }
  }

  const settings = settingsText({ fileKey: FILE_KEY, scale: SCALE });
  const isSettingsChanged =
    exported.length > 0 && (await getFileText(token, SETTINGS_PATH, head.commitSha)) !== settings;

  let tokensText: string | null = null;
  if (request.shouldExportTokens) {
    log('토큰 변환 중');
    const tokens = await exportTokensText();
    for (const name of tokens.skippedStyles) {
      log(`토큰이 아닌 칠 스타일이라 건너뜀: ${name}`);
    }
    tokensText =
      tokens.text === (await getFileText(token, TOKENS_PATH, head.commitSha)) ? null : tokens.text;
  }

  const changed = changes.filter(hasComponentChange);
  const summary: ExportSummary = {
    changedComponents: [
      ...changed.map(
        (change) =>
          exported.find((component) => component.slug === change.slug)?.manifest.name ??
          change.slug,
      ),
      ...renamed.map((slug) => `${slug}(이름 바뀜, 이전 폴더 삭제)`),
    ],
    uploadCount: changed.reduce((sum, change) => sum + change.pngUploads.length, 0),
    deletionCount:
      changed.reduce((sum, change) => sum + change.deletions.length, 0) +
      renamed.reduce((sum, slug) => sum + (folderFiles.get(slug)?.length ?? 0), 0),
    assetUploadCount: assetUploads.size,
    hasTokenChange: tokensText !== null,
  };
  if (
    summary.changedComponents.length === 0 &&
    !summary.hasTokenChange &&
    !isSettingsChanged &&
    assetUploads.size === 0
  ) {
    log('바뀐 컴포넌트와 토큰이 없어 커밋하지 않는다.');
    return { kind: 'unchanged' };
  }

  const entries = await treeEntries(token, exported, changed, log);
  for (const [file, svg] of assetUploads) {
    log(`자산 올리는 중: ${file}`);
    entries.push({
      path: assetFilePath(file),
      sha: await createBlob(token, figma.base64Encode(svg)),
    });
  }
  for (const slug of renamed) {
    for (const path of folderFiles.get(slug) ?? []) {
      entries.push({ path: componentFilePath(slug, path), sha: null });
    }
  }
  if (isSettingsChanged) {
    entries.push({ path: SETTINGS_PATH, content: settings });
  }
  if (tokensText !== null) {
    entries.push({ path: TOKENS_PATH, content: tokensText });
  }

  const subject = commitSubject(summary);
  const tree = await createTree(token, head.treeSha, entries);
  const commit = await createCommit(
    token,
    `${subject}\n\n${commitBody(summary)}`,
    tree,
    head.commitSha,
  );

  if (existingBranch !== '') {
    log(`${existingBranch} 브랜치에 커밋하는 중`);
    await updateBranch(token, existingBranch, commit);
    return {
      kind: 'committed',
      commit: {
        branch: existingBranch,
        commitUrl: commitUrl(commit),
        pullRequestUrl: await findOpenPullRequest(token, existingBranch),
        isNewPullRequest: false,
      },
    };
  }

  log('커밋하고 PR을 여는 중');
  const branch = exportBranchName(new Date());
  await createBranch(token, branch, commit);
  return {
    kind: 'committed',
    commit: {
      branch,
      commitUrl: commitUrl(commit),
      pullRequestUrl: await createPullRequest(token, {
        title: subject,
        body: pullRequestBody(summary),
        head: branch,
        base: BASE_BRANCH,
      }),
      isNewPullRequest: true,
    },
  };
}

/**
 * 바뀐 컴포넌트 폴더의 파일 변경을 트리 항목으로 만든다. PNG는 blob으로 먼저 올린다.
 * @param token GitHub 토큰
 * @param exported 내보낸 컴포넌트
 * @param changed 바뀐 폴더
 * @param log 진행 로그
 * @returns 트리 항목
 */
async function treeEntries(
  token: string,
  exported: readonly ComponentExport[],
  changed: readonly ComponentChanges[],
  log: (text: string) => void,
): Promise<TreeEntry[]> {
  const entries: TreeEntry[] = [];
  for (const change of changed) {
    const component = exported.find((item) => item.slug === change.slug);
    if (component === undefined) {
      continue;
    }
    for (const variant of change.pngUploads) {
      const png = component.pngs.get(variant);
      if (png === undefined) {
        throw new Error(`${change.slug}/${variant}의 이미지가 없다.`);
      }
      log(`이미지 올리는 중: ${change.slug}/${pngFile(variant)}`);
      entries.push({
        path: componentFilePath(change.slug, pngFile(variant)),
        sha: await createBlob(token, figma.base64Encode(png)),
      });
    }
    for (const file of change.deletions) {
      entries.push({ path: componentFilePath(change.slug, file), sha: null });
    }
    if (change.manifestText !== null) {
      entries.push({
        path: componentFilePath(change.slug, COMPONENT_MANIFEST_FILE),
        content: change.manifestText,
      });
    }
  }
  return entries;
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
