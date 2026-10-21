import { buildDesignTokens } from './design-tokens';
import {
  type ComponentEntry,
  componentHash,
  type ExportedComponent,
  manifestToJson,
  mergeManifest,
  parseManifest,
  planImageChanges,
  type VariantEntry,
} from './export-manifest';
import { exportComponent, readDesignTokensInput } from './figma-reader';
import {
  createBlob,
  createBranch,
  createCommit,
  createPullRequest,
  createTree,
  getBranchHead,
  getFileText,
  type TreeEntry,
} from './github-client';
import { componentSlug, variantSlug } from './naming';
import { BASE_BRANCH, EXPORT_MANIFEST_PATH, FILE_KEY, SCALE, TOKENS_PATH } from './plugin-config';
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
  log: (text: string) => void;
};

/**
 * 고른 컴포넌트 이미지와 토큰을 내보내 바뀐 것만 커밋하고 PR을 연다.
 * @codocs [[피그마 일치 검사:피그마 플러그인]]
 * @param request 토큰, 고른 컴포넌트, 토큰 내보내기 여부, 진행 로그
 * @returns 연 PR 주소, 바뀐 것이 없으면 null
 */
export async function runExport(request: ExportRequest): Promise<string | null> {
  const { token, log } = request;
  if (figma.fileKey !== undefined && figma.fileKey !== FILE_KEY) {
    throw new Error(`이 파일(${figma.fileKey})은 내보내기 대상(${FILE_KEY})이 아니다.`);
  }

  const exported: ExportedComponent[] = [];
  const pngBySlug = new Map<string, Map<string, Uint8Array>>();
  for (const id of request.componentIds) {
    const component = await exportComponent(id);
    log(`${component.name}: 변형 ${component.variants.length}개 내보냄`);
    const pngs = new Map<string, Uint8Array>();
    const variants: Record<string, VariantEntry> = {};
    for (const variant of component.variants) {
      const slug = variantSlug(variant.properties);
      if (slug in variants) {
        throw new Error(`${component.name}: 변형 파일 이름 "${slug}"가 겹친다.`);
      }
      const { png, ...rest } = variant;
      variants[slug] = { ...rest, hash: sha256Hex(png) };
      pngs.set(slug, png);
    }
    const entry: ComponentEntry = {
      name: component.name,
      nodeId: component.nodeId,
      hash: componentHash(Object.values(variants).map((variant) => variant.hash)),
      variants,
    };
    const slug = componentSlug(component.name);
    if (pngBySlug.has(slug)) {
      throw new Error(`컴포넌트 폴더 이름 "${slug}"가 겹친다.`);
    }
    pngBySlug.set(slug, pngs);
    exported.push({ slug, entry });
  }

  log(`${BASE_BRANCH} 브랜치의 기준 자료를 읽는 중`);
  const head = await getBranchHead(token, BASE_BRANCH);
  const baseManifestText = await getFileText(token, EXPORT_MANIFEST_PATH, head.commitSha);
  const baseManifest = baseManifestText === null ? null : parseManifest(baseManifestText);

  let tokensText: string | null = null;
  if (request.shouldExportTokens) {
    log('토큰 변환 중');
    tokensText = stableStringify(buildDesignTokens(await readDesignTokensInput()));
    const baseTokensText = await getFileText(token, TOKENS_PATH, head.commitSha);
    if (tokensText === baseTokensText) {
      tokensText = null;
    }
  }

  const changes = planImageChanges(baseManifest, exported);
  const summary: ExportSummary = {
    changedComponents: changes.changedComponents.map(
      (slug) => exported.find((component) => component.slug === slug)?.entry.name ?? slug,
    ),
    uploadCount: changes.uploads.length,
    deletionCount: changes.deletions.length,
    hasTokenChange: tokensText !== null,
  };
  if (summary.uploadCount + summary.deletionCount === 0 && !summary.hasTokenChange) {
    log('바뀐 이미지와 토큰이 없어 PR을 열지 않는다.');
    return null;
  }

  const entries: TreeEntry[] = [];
  for (const [index, upload] of changes.uploads.entries()) {
    const png = pngBySlug.get(upload.component)?.get(upload.variant);
    if (png === undefined) {
      throw new Error(`${upload.path}의 이미지가 없다.`);
    }
    log(`이미지 올리는 중 ${index + 1}/${changes.uploads.length}: ${upload.path}`);
    entries.push({ path: upload.path, sha: await createBlob(token, figma.base64Encode(png)) });
  }
  for (const path of changes.deletions) {
    entries.push({ path, sha: null });
  }
  const manifest = mergeManifest(baseManifest, exported, {
    fileKey: FILE_KEY,
    exportedAt: new Date().toISOString(),
    scale: SCALE,
  });
  entries.push({ path: EXPORT_MANIFEST_PATH, content: stableStringify(manifestToJson(manifest)) });
  if (tokensText !== null) {
    entries.push({ path: TOKENS_PATH, content: tokensText });
  }

  log('커밋하고 PR을 여는 중');
  const subject = commitSubject(summary);
  const tree = await createTree(token, head.treeSha, entries);
  const commit = await createCommit(
    token,
    `${subject}\n\n${commitBody(summary)}`,
    tree,
    head.commitSha,
  );
  const branch = exportBranchName(new Date());
  await createBranch(token, branch, commit);
  return createPullRequest(token, {
    title: subject,
    body: pullRequestBody(summary),
    head: branch,
    base: BASE_BRANCH,
  });
}
