import { buildDesignTokens } from './design-tokens';
import {
  COMPONENT_MANIFEST_FILE,
  type ComponentChanges,
  componentHash,
  type ComponentManifest,
  type ExportedComponent,
  hasComponentChange,
  parseComponentManifest,
  planComponentChanges,
  pngFile,
  renamedFolders,
  settingsText,
  type VariantEntry,
} from './export-manifest';
import { exportComponent, readDesignTokensInput } from './figma-reader';
import {
  commitUrl,
  createBlob,
  createBranch,
  createCommit,
  createPullRequest,
  createTree,
  findOpenPullRequest,
  getBranchHead,
  getFileText,
  listTreeFiles,
  type TreeEntry,
  updateBranch,
} from './github-client';
import { componentFilePath, componentSlug, variantSlug } from './naming';
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
import { sha256Hex } from './sha256';
import { stableStringify } from './stable-json';

export type ExportRequest = {
  token: string;
  componentIds: readonly string[];
  shouldExportTokens: boolean;
  /** 커밋할 기존 브랜치. 비어 있으면 새 브랜치를 만들고 PR을 연다 */
  branch: string;
  log: (text: string) => void;
};

/** 내보내기 결과 */
export type ExportResult = {
  /** 커밋한 브랜치 */
  branch: string;
  /** 만든 커밋 주소 */
  commitUrl: string;
  /** 연 PR이나 그 브랜치에 열려 있는 PR 주소. 없으면 null */
  pullRequestUrl: string | null;
  /** 이번에 새로 연 PR이면 true */
  isNewPullRequest: boolean;
};

/** 컴포넌트 하나를 내보낸 결과(올릴 파일 내용 포함) */
type ExportedFiles = {
  component: ExportedComponent;
  pngs: Map<string, Uint8Array>;
  svgs: Map<string, Uint8Array>;
};

/**
 * 고른 컴포넌트와 토큰을 내보내 바뀐 것만 커밋한다. 내보낸 컴포넌트의 폴더(figma/components/<컴포넌트>/)만 바꾸고,
 * 토큰은 고른 경우에만, figma.json은 파일 키나 배율이 바뀐 경우에만 쓴다.
 * 기존 브랜치를 주면 그 브랜치 끝에서 빨리 감기로 커밋하고 PR을 새로 열지 않는다(열린 PR이 있으면 주소를 돌려준다).
 * 주지 않으면 main에서 새 브랜치를 만들어 PR을 연다. 바뀐 것은 커밋할 브랜치의 파일과 비교해 고른다.
 * @codocs [[피그마 일치 검사:피그마 플러그인]]
 * @param request 토큰, 고른 컴포넌트, 토큰 내보내기 여부, 기존 브랜치, 진행 로그
 * @returns 커밋과 PR 정보, 바뀐 것이 없으면 null
 */
export async function runExport(request: ExportRequest): Promise<ExportResult | null> {
  const { token, log } = request;
  if (figma.fileKey !== undefined && figma.fileKey !== FILE_KEY) {
    throw new Error(`이 파일(${figma.fileKey})은 내보내기 대상(${FILE_KEY})이 아니다.`);
  }
  const existingBranch = request.branch.trim();
  const exportedAt = new Date().toISOString();

  const exported: ExportedFiles[] = [];
  for (const id of request.componentIds) {
    const files = await exportOne(id, exportedAt, log);
    if (exported.some((other) => other.component.slug === files.component.slug)) {
      throw new Error(`컴포넌트 폴더 이름 "${files.component.slug}"가 겹친다.`);
    }
    exported.push(files);
  }

  const targetBranch = existingBranch === '' ? BASE_BRANCH : existingBranch;
  log(`${targetBranch} 브랜치의 기준 자료를 읽는 중`);
  const head = await getBranchHead(token, targetBranch);
  const folderFiles = groupByComponent(
    await listTreeFiles(token, head.treeSha, `${COMPONENTS_DIR}/`),
  );

  const changes: ComponentChanges[] = [];
  for (const { component } of exported) {
    const base = await readComponentManifest(token, component.slug, head.commitSha);
    changes.push(planComponentChanges(component, base, folderFiles.get(component.slug) ?? []));
  }
  const otherNodeIds = new Map<string, string>();
  for (const slug of folderFiles.keys()) {
    if (!exported.some(({ component }) => component.slug === slug)) {
      const other = await readComponentManifest(token, slug, head.commitSha);
      if (other !== null) {
        otherNodeIds.set(slug, other.nodeId);
      }
    }
  }
  const renamed = renamedFolders(
    exported.map(({ component }) => component),
    otherNodeIds,
  );

  const settings = settingsText({ fileKey: FILE_KEY, scale: SCALE });
  const isSettingsChanged =
    exported.length > 0 && (await getFileText(token, SETTINGS_PATH, head.commitSha)) !== settings;

  let tokensText: string | null = null;
  if (request.shouldExportTokens) {
    log('토큰 변환 중');
    const { tokens, skippedStyles } = buildDesignTokens(await readDesignTokensInput());
    for (const name of skippedStyles) {
      log(`토큰이 아닌 칠 스타일이라 건너뜀: ${name}`);
    }
    tokensText = stableStringify(tokens);
    if (tokensText === (await getFileText(token, TOKENS_PATH, head.commitSha))) {
      tokensText = null;
    }
  }

  const changed = changes.filter(hasComponentChange);
  const summary: ExportSummary = {
    changedComponents: [
      ...changed.map(
        (change) =>
          exported.find(({ component }) => component.slug === change.slug)?.component.manifest
            .name ?? change.slug,
      ),
      ...renamed.map((slug) => `${slug}(이름 바뀜, 이전 폴더 삭제)`),
    ],
    uploadCount: changed.reduce((sum, change) => sum + change.pngUploads.length, 0),
    deletionCount:
      changed.reduce((sum, change) => sum + change.deletions.length, 0) +
      renamed.reduce((sum, slug) => sum + (folderFiles.get(slug)?.length ?? 0), 0),
    vectorUploadCount: changed.reduce((sum, change) => sum + change.svgUploads.length, 0),
    hasTokenChange: tokensText !== null,
  };
  if (summary.changedComponents.length === 0 && !summary.hasTokenChange && !isSettingsChanged) {
    log('바뀐 컴포넌트와 토큰이 없어 커밋하지 않는다.');
    return null;
  }

  const entries = await treeEntries(token, exported, changed, log);
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
      branch: existingBranch,
      commitUrl: commitUrl(commit),
      pullRequestUrl: await findOpenPullRequest(token, existingBranch),
      isNewPullRequest: false,
    };
  }

  log('커밋하고 PR을 여는 중');
  const branch = exportBranchName(new Date());
  await createBranch(token, branch, commit);
  return {
    branch,
    commitUrl: commitUrl(commit),
    pullRequestUrl: await createPullRequest(token, {
      title: subject,
      body: pullRequestBody(summary),
      head: branch,
      base: BASE_BRANCH,
    }),
    isNewPullRequest: true,
  };
}

/**
 * 컴포넌트 하나를 내보내 export.json 내용과 올릴 파일을 만든다.
 * @param id 컴포넌트(세트) 노드 ID
 * @param exportedAt 내보낸 시각
 * @param log 진행 로그
 * @returns 내보낸 컴포넌트와 PNG·SVG 내용
 */
async function exportOne(
  id: string,
  exportedAt: string,
  log: (text: string) => void,
): Promise<ExportedFiles> {
  const component = await exportComponent(id);
  log(`${component.name}: 변형 ${component.variants.length}개 내보냄`);
  const pngs = new Map<string, Uint8Array>();
  const svgs = new Map<string, Uint8Array>();
  const variants: Record<string, VariantEntry> = {};
  for (const variant of component.variants) {
    const slug = variantSlug(variant.properties);
    if (slug in variants) {
      throw new Error(`${component.name}: 변형 파일 이름 "${slug}"가 겹친다.`);
    }
    const { png, svgs: variantSvgs, ...rest } = variant;
    variants[slug] = { ...rest, hash: sha256Hex(png) };
    pngs.set(slug, png);
    for (const [file, svg] of variantSvgs) {
      svgs.set(file, svg);
    }
  }
  const manifest: ComponentManifest = {
    name: component.name,
    nodeId: component.nodeId,
    hash: componentHash(Object.values(variants)),
    exportedAt,
    variants,
  };
  return {
    component: { slug: componentSlug(component.name), manifest, svgFiles: [...svgs.keys()] },
    pngs,
    svgs,
  };
}

/**
 * 바뀐 컴포넌트 폴더의 파일 변경을 트리 항목으로 만든다. PNG·SVG는 blob으로 먼저 올린다.
 * @param token GitHub 토큰
 * @param exported 내보낸 컴포넌트
 * @param changed 바뀐 폴더
 * @param log 진행 로그
 * @returns 트리 항목
 */
async function treeEntries(
  token: string,
  exported: readonly ExportedFiles[],
  changed: readonly ComponentChanges[],
  log: (text: string) => void,
): Promise<TreeEntry[]> {
  const entries: TreeEntry[] = [];
  for (const change of changed) {
    const files = exported.find(({ component }) => component.slug === change.slug);
    if (files === undefined) {
      continue;
    }
    for (const variant of change.pngUploads) {
      const png = files.pngs.get(variant);
      if (png === undefined) {
        throw new Error(`${change.slug}/${variant}의 이미지가 없다.`);
      }
      log(`이미지 올리는 중: ${change.slug}/${pngFile(variant)}`);
      entries.push({
        path: componentFilePath(change.slug, pngFile(variant)),
        sha: await createBlob(token, figma.base64Encode(png)),
      });
    }
    for (const file of change.svgUploads) {
      const svg = files.svgs.get(file);
      if (svg === undefined) {
        throw new Error(`${change.slug}/${file}의 내용이 없다.`);
      }
      log(`벡터 올리는 중: ${change.slug}/${file}`);
      entries.push({
        path: componentFilePath(change.slug, file),
        sha: await createBlob(token, figma.base64Encode(svg)),
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
 * 커밋 시점의 컴포넌트 export.json을 읽는다.
 * @param token GitHub 토큰
 * @param slug 컴포넌트 폴더 이름
 * @param ref 커밋 SHA
 * @returns 컴포넌트 export.json, 없거나 읽을 수 없으면 null
 */
async function readComponentManifest(
  token: string,
  slug: string,
  ref: string,
): Promise<ComponentManifest | null> {
  const text = await getFileText(token, componentFilePath(slug, COMPONENT_MANIFEST_FILE), ref);
  return text === null ? null : parseComponentManifest(text);
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
