import path from 'node:path';

/** 파일을 읽어 내용을 돌려준다. 파일이 없으면 `undefined`다. */
export type SourceReader = (file: string) => string | undefined;

const COMPONENTS_REEXPORT_PATTERN =
  /export\s+(?:type\s+)?(?:\*(?:\s+as\s+([\w$]+))?|\{([^}]*)\})\s+from\s+['"]\.\/components\/([^/'"]+)\/([^'"]*)['"]/gu;
const DECLARATION_PATTERN =
  /^[ \t]*export\s+(?:declare\s+)?(?:abstract\s+)?(?:async\s+)?(?:function\s*\*?|const\s+enum|const|let|var|class|type|interface|enum|namespace)\s+([\w$]+)/gmu;
const NAMED_EXPORT_PATTERN = /export\s+(?:type\s+)?\{([^}]*)\}/gu;
const STAR_REEXPORT_PATTERN =
  /export\s+(?:type\s+)?\*(?:\s+as\s+([\w$]+))?\s+from\s+['"]([^'"]+)['"]/gu;
const sourceExtensions = ['.ts', '.tsx', '/index.ts', '/index.tsx'];

/**
 * 디자인 시스템 공개 진입점에서 공개 이름 → 컴포넌트 폴더 표를 만든다.
 * `export * from './components/<폴더>/<파일>'`은 그 파일이 내보낸 이름을 모으고(그 파일이 또 `export *`를 하면 따라간다),
 * `export { A, B } from './components/<폴더>/...'`는 중괄호 안 이름을 쓴다.
 * @codocs [[피그마 연동:캡처 범위]]
 * @param indexFile 공개 진입점 파일 경로
 * @param read 파일 읽기
 * @returns 공개 이름 → 컴포넌트 폴더 이름
 */
export function designSystemExports(indexFile: string, read: SourceReader): Map<string, string> {
  const names = new Map<string, string>();
  const source = read(indexFile);
  if (source === undefined) {
    return names;
  }
  const componentsDir = path.join(path.dirname(indexFile), 'components');
  for (const match of stripComments(source).matchAll(COMPONENTS_REEXPORT_PATTERN)) {
    const [, namespace, braces, folder = '', rest = ''] = match;
    const exported =
      braces !== undefined
        ? namesInBraces(braces)
        : namespace !== undefined
          ? [namespace]
          : exportedNames(path.join(componentsDir, folder, rest), read, new Set());
    for (const name of exported) {
      names.set(name, folder);
    }
  }
  return names;
}

/**
 * 앱 소스들이 `@seojaewan/design-system`에서 import하는 이름으로 쓰는 컴포넌트 폴더를 구한다.
 * @param sources 앱 소스 목록
 * @param exported 공개 이름 → 컴포넌트 폴더 이름
 * @returns 쓰는 컴포넌트 폴더 이름
 */
export function usedComponents(
  sources: readonly string[],
  exported: ReadonlyMap<string, string>,
): Set<string> {
  const components = new Set<string>();
  for (const source of sources) {
    for (const match of source.matchAll(
      /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+['"]@seojaewan\/design-system['"]/gu,
    )) {
      for (const name of (match[1] ?? '').split(',').map((part) => part.trim())) {
        const component = exported.get(name.replace(/^type\s+/u, '').split(/\s+as\s+/u)[0] ?? '');
        if (component !== undefined) {
          components.add(component);
        }
      }
    }
  }
  return components;
}

/**
 * 파일이 내보내는 이름을 모은다. `export * from` 상대 경로는 따라간다.
 * @param specifier 파일 경로(확장자 없이도 된다)
 * @param read 파일 읽기
 * @param visited 이미 읽은 파일(순환 방지)
 * @returns 내보낸 이름
 */
function exportedNames(specifier: string, read: SourceReader, visited: Set<string>): string[] {
  const resolved = resolveSource(specifier, read);
  if (resolved === undefined || visited.has(resolved.file)) {
    return [];
  }
  visited.add(resolved.file);
  const source = stripComments(resolved.source);
  const names: string[] = [];
  for (const match of source.matchAll(DECLARATION_PATTERN)) {
    names.push(match[1] ?? '');
  }
  for (const match of source.matchAll(NAMED_EXPORT_PATTERN)) {
    names.push(...namesInBraces(match[1] ?? ''));
  }
  for (const match of source.matchAll(STAR_REEXPORT_PATTERN)) {
    const [, namespace, target = ''] = match;
    if (namespace !== undefined) {
      names.push(namespace);
    } else if (target.startsWith('.')) {
      names.push(
        ...exportedNames(path.resolve(path.dirname(resolved.file), target), read, visited),
      );
    }
  }
  return names.filter((name) => name !== '');
}

/**
 * 확장자를 붙여 보며 실제 소스 파일을 찾는다.
 * @param specifier 파일 경로
 * @param read 파일 읽기
 * @returns 찾은 파일과 내용
 */
function resolveSource(
  specifier: string,
  read: SourceReader,
): { file: string; source: string } | undefined {
  for (const candidate of [specifier, ...sourceExtensions.map((ext) => `${specifier}${ext}`)]) {
    if (/\.tsx?$/u.test(candidate)) {
      const source = read(candidate);
      if (source !== undefined) {
        return { file: candidate, source };
      }
    }
  }
  return undefined;
}

/**
 * `{ a, b as c, type d }`의 바깥 이름을 구한다.
 * @param braces 중괄호 안 문자열
 * @returns 바깥 이름
 */
function namesInBraces(braces: string): string[] {
  const names: string[] = [];
  for (const part of braces.split(',')) {
    const name = part
      .trim()
      .replace(/^type\s+/u, '')
      .split(/\s+as\s+/u)
      .pop()
      ?.trim();
    if (name !== undefined && name !== '') {
      names.push(name);
    }
  }
  return names;
}

/**
 * 주석을 지운다.
 * @param source 소스
 * @returns 주석 없는 소스
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/^[ \t]*\/\/.*$/gmu, '');
}
