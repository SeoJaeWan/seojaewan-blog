import type { Violation } from './core/check-structure';
import type { TargetExport } from './core/export-component';
import { exportTargetCore } from './core/export-component';
import { exportMotionCore } from './core/export-motion';
import { listMotionSamples, readMotionVariables } from './core/read-motion';
import { MANIFEST_FILE, manifestText, pngFile, settingsText } from './export-manifest';
import { listComponents, listPatterns, readCheckContext } from './figma-reader';
import type { ComponentSummary } from './messages';
import { assetFilePath, componentSlug, patternFolder, patternPlace } from './naming';
import { COMPONENTS_DIR, FILE_KEY, MOTIONS_DIR, SCALE, SETTINGS_PATH } from './plugin-config';
import { sha256Hex, utf8Encode } from './sha256';

// 피그마 MCP(use_figma)에서 실행하는 진입점. 플러그인과 같은 검사·내보내기 코드로 저장소에 쓸 파일을 만든다.
// build.mjs가 이 파일을 dist/use-figma-export.js(전역 SeojaewanFigmaExport) 하나로 묶는다.
// use_figma에는 그 파일 내용 뒤에 `return await SeojaewanFigmaExport.runMcpExport({...});`를 붙여 넘긴다.
// use_figma 코드 길이 제한(5만 자) 때문에 토큰은 mcp-tokens.ts(dist/use-figma-tokens.js)로 나눴다.
// GitHub에는 올리지 않는다. 받은 쪽이 파일을 쓰고, 피그마 안에서 계산한 SHA-256과 받은 내용의 해시를 대조한다.

/** 내보낸 파일 하나 */
export type McpFile = {
  /** 저장소 루트 기준 경로 */
  path: string;
  encoding: 'utf8' | 'base64';
  content: string;
  /** 피그마 안에서 계산한 내용(바이트)의 SHA-256 */
  sha256: string;
};

export type McpExportOptions = {
  /** 내보낼 컴포넌트(세트) 이름 */
  components: string[];
  /** 내보낼 조립 이름(`영역/이름`) */
  patterns?: string[];
  /** 내보낼 애니메이션 견본 이름(`motion-progress-ring`) */
  motions?: string[];
  /** true면 검사만 하고 파일 내용은 돌려주지 않는다 */
  checkOnly?: boolean;
};

export type McpExportResult = {
  fileKey: string | undefined;
  violations: Violation[];
  /** 막지 않는 알림(같은 값 변수가 여럿인 모션 짝 등) */
  notices: string[];
  /** 내보낸 대상 폴더(저장소 경로) */
  folders: string[];
  files: McpFile[];
};

/**
 * 고른 컴포넌트·조립·애니메이션을 플러그인과 같은 규칙으로 검사하고 내보낼 파일을 만든다.
 * 위반이 하나라도 있으면 파일을 돌려주지 않는다.
 * @codocs [[피그마 연동:피그마 플러그인]]
 * @param options 내보낼 컴포넌트·조립·애니메이션
 * @returns 위반 목록과 파일
 */
export async function runMcpExport(options: McpExportOptions): Promise<McpExportResult> {
  const result: McpExportResult = {
    fileKey: figma.fileKey,
    violations: [],
    notices: [],
    folders: [],
    files: [],
  };
  const files: McpFile[] = [];
  const context = await readCheckContext();
  const targets = [
    ...pick(await listComponents(), options.components).map((id) => ({ id, isPattern: false })),
    ...pick(await listPatterns(), options.patterns ?? []).map((id) => ({ id, isPattern: true })),
  ];
  for (const { id, isPattern } of targets) {
    const outcome = await exportTargetCore(id, SCALE, context);
    if (!outcome.ok) {
      result.violations.push(...outcome.violations);
      continue;
    }
    const folder = targetFolder(outcome.target, isPattern);
    if (folder === null) {
      result.violations.push({
        where: outcome.target.manifest.name,
        reason: '조립 이름이 `영역/이름` 꼴이 아니라 폴더를 정할 수 없다',
        fix: '조립 이름을 `영역/이름`(예: `Menu/Folder`)으로 바꾼다.',
      });
      continue;
    }
    result.folders.push(folder);
    files.push(textFile(`${folder}/${MANIFEST_FILE}`, manifestText(outcome.target.manifest)));
    for (const [variant, png] of outcome.target.pngs) {
      files.push(binaryFile(`${folder}/${pngFile(variant)}`, png));
    }
    for (const [file, bytes] of outcome.target.assets) {
      if (!files.some((item) => item.path === assetFilePath(file))) {
        files.push(binaryFile(assetFilePath(file), bytes));
      }
    }
  }
  const motionNames = options.motions ?? [];
  if (motionNames.length > 0) {
    const variables = await readMotionVariables();
    for (const id of pick(await listMotionSamples(), motionNames)) {
      const outcome = await exportMotionCore(id, variables, FILE_KEY);
      if (!outcome.ok) {
        result.violations.push(...outcome.violations);
        continue;
      }
      result.notices.push(...outcome.motion.result.notices);
      files.push(textFile(`${MOTIONS_DIR}/${outcome.motion.name}.json`, outcome.motion.text));
    }
  }
  if (options.components.length > 0) {
    files.push(textFile(SETTINGS_PATH, settingsText({ fileKey: FILE_KEY, scale: SCALE })));
  }
  if (result.violations.length === 0 && options.checkOnly !== true) {
    result.files = files;
  }
  return result;
}

/**
 * 이름으로 컴포넌트나 조립을 찾는다.
 * @param all 페이지의 컴포넌트나 조립
 * @param names 찾을 이름
 * @returns 노드 ID
 */
function pick(
  all: readonly Pick<ComponentSummary, 'id' | 'name'>[],
  names: readonly string[],
): string[] {
  const ids: string[] = [];
  for (const name of names) {
    const found = all.find((item) => item.name === name);
    if (found === undefined) {
      throw new Error(`${name}를 찾을 수 없다.`);
    }
    ids.push(found.id);
  }
  return ids;
}

/**
 * 내보낸 대상의 저장소 폴더를 정한다.
 * @param target 내보낸 대상
 * @param isPattern 조립이면 true
 * @returns 폴더, 조립 이름이 `영역/이름` 꼴이 아니면 null
 */
function targetFolder(target: TargetExport, isPattern: boolean): string | null {
  if (!isPattern) {
    return `${COMPONENTS_DIR}/${componentSlug(target.manifest.name)}`;
  }
  const place = patternPlace(target.manifest.name);
  return place === null ? null : patternFolder(place);
}

/**
 * 글자 파일을 만든다.
 * @param path 저장소 경로
 * @param text 내용
 * @returns 파일
 */
export function textFile(path: string, text: string): McpFile {
  return { path, encoding: 'utf8', content: text, sha256: sha256Hex(utf8Encode(text)) };
}

/**
 * 바이너리 파일을 만든다.
 * @param path 저장소 경로
 * @param bytes 내용
 * @returns 파일
 */
export function binaryFile(path: string, bytes: Uint8Array): McpFile {
  return { path, encoding: 'base64', content: figma.base64Encode(bytes), sha256: sha256Hex(bytes) };
}
