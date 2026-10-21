import type { Violation } from './core/check-structure';
import { exportComponentCore, readCheckContext } from './core/export-component';
import { manifestText, pngFile, settingsText } from './export-manifest';
import { listComponents, loadComponentsPage } from './figma-reader';
import { assetFilePath, componentFilePath } from './naming';
import { FILE_KEY, SCALE, SETTINGS_PATH } from './plugin-config';
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
  /** 내보낼 컴포넌트(세트) 이름. 비우면 파일 쓰기 없이 컴포넌트 목록만 돌려준다 */
  components: string[];
  /** true면 검사만 하고 파일 내용은 돌려주지 않는다 */
  checkOnly?: boolean;
};

export type McpExportResult = {
  fileKey: string | undefined;
  violations: Violation[];
  /** 내보낸 컴포넌트 폴더 이름 */
  componentFolders: string[];
  files: McpFile[];
};

/**
 * 고른 컴포넌트를 플러그인과 같은 규칙으로 검사하고 내보낼 파일을 만든다.
 * 위반이 하나라도 있으면 파일을 돌려주지 않는다.
 * @codocs [[피그마 일치 검사:피그마 플러그인]]
 * @param options 내보낼 컴포넌트
 * @returns 위반 목록과 파일
 */
export async function runMcpExport(options: McpExportOptions): Promise<McpExportResult> {
  await loadComponentsPage();
  const all = await listComponents();
  const result: McpExportResult = {
    fileKey: figma.fileKey,
    violations: [],
    componentFolders: [],
    files: [],
  };
  const context = await readCheckContext();
  const files: McpFile[] = [];
  for (const name of options.components) {
    const summary = all.find((component) => component.name === name);
    if (summary === undefined) {
      throw new Error(`컴포넌트 ${name}를 찾을 수 없다.`);
    }
    const outcome = await exportComponentCore(summary.id, context, SCALE);
    if (!outcome.ok) {
      result.violations.push(...outcome.violations);
      continue;
    }
    const { component } = outcome;
    result.componentFolders.push(component.slug);
    files.push(
      textFile(componentFilePath(component.slug, 'export.json'), manifestText(component.manifest)),
    );
    for (const [variant, png] of component.pngs) {
      files.push(binaryFile(componentFilePath(component.slug, pngFile(variant)), png));
    }
    for (const [file, bytes] of component.assets) {
      if (!files.some((item) => item.path === assetFilePath(file))) {
        files.push(binaryFile(assetFilePath(file), bytes));
      }
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
