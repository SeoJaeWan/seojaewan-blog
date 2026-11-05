import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * codocs 문서 하나에서 읽은 것.
 * - path: 저장소 기준 경로
 * - sections: 섹션 이름 → 본문
 */
export type CodocsDoc = {
  name: string;
  path: string;
  sections: Map<string, string>;
};

const TOP_LEVEL_KEY =
  /^(?:"((?:[^"\\]|\\.)*)"|'([^']*)'|([^\s"'#][^:]*?)):(?:\s*([|>][-+]?))?\s*$/u;
const META_NAME = /^\s+name:\s*(.+?)\s*$/u;

/**
 * codocs 문서(YAML)의 최상위 섹션을 읽는다. codocs 문서는 `_codocs` 메타데이터와
 * `섹션 이름: |` 꼴의 블록 문자열로만 이루어져 있어, 그 꼴만 읽는다.
 * @param text 문서 내용
 * @param file 저장소 기준 경로
 * @returns 문서 이름과 섹션. `_codocs.name`이 없으면 null
 */
export function parseCodocsDoc(text: string, file: string): CodocsDoc | null {
  const lines = text.split(/\r?\n/u);
  const sections = new Map<string, string>();
  let name: string | null = null;
  let current: { key: string; body: string[] } | null = null;
  let isInMeta = false;

  /** 읽던 섹션을 끝낸다. */
  function flush(): void {
    if (current !== null) {
      sections.set(current.key, current.body.join('\n').trim());
    }
    current = null;
  }

  for (const line of lines) {
    const top = line.startsWith(' ') || line === '' ? null : TOP_LEVEL_KEY.exec(line);
    if (top !== null) {
      flush();
      const key = (top[1]?.replace(/\\(.)/gu, '$1') ?? top[2] ?? top[3] ?? '').trim();
      isInMeta = key === '_codocs';
      if (!isInMeta) {
        current = { key, body: [] };
      }
      continue;
    }
    if (isInMeta) {
      const meta = META_NAME.exec(line);
      if (meta?.[1] !== undefined && /^ {2}\S/u.test(line)) {
        name = meta[1].replace(/^["']|["']$/gu, '');
      }
      continue;
    }
    current?.body.push(line.replace(/^ {2}/u, ''));
  }
  flush();
  return name === null ? null : { name, path: file, sections };
}

/**
 * `.codocs` 폴더의 문서를 모두 읽는다.
 * @param repoRoot 저장소 루트
 * @param dir 저장소 기준 문서 폴더
 * @returns 문서 이름 → 문서
 */
export function readCodocsDocs(repoRoot: string, dir = '.codocs'): Map<string, CodocsDoc> {
  const docs = new Map<string, CodocsDoc>();
  /**
   * 폴더를 따라 내려가며 YAML 문서를 읽는다.
   * @param folder 절대 경로
   */
  function walk(folder: string): void {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const full = path.join(folder, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.yaml')) {
        const file = path.relative(repoRoot, full).split(path.sep).join('/');
        const doc = parseCodocsDoc(readFileSync(full, 'utf8'), file);
        if (doc !== null) {
          docs.set(doc.name, doc);
        }
      }
    }
  }
  walk(path.join(repoRoot, dir));
  return docs;
}

/**
 * `[[문서:섹션]]` 링크를 문서 이름과 섹션으로 나눈다. 이름 안의 콜론은 `\:`로 적는다.
 * @param link 링크
 * @returns 문서 이름과 섹션(없으면 빈 문자열)
 */
export function splitDocLink(link: string): { doc: string; section: string } {
  const inner = link.replace(/^\[\[|\]\]$/gu, '');
  const parts = inner.split(/(?<!\\):/u).map((part) => part.replace(/\\:/gu, ':').trim());
  return { doc: parts[0] ?? '', section: parts.slice(1).join(':') };
}

/**
 * 섹션 본문의 첫 문장 줄을 보기 좋게 꺼낸다. 표 줄과 코드 울타리는 건너뛰고, 링크 표시의 `\[[`는 `[[`로 돌린다.
 * @param body 섹션 본문
 * @returns 첫 줄(빈 줄·표·코드 울타리 제외). 그런 줄이 없으면 빈 문자열
 */
export function firstLineOf(body: string): string {
  const line =
    body
      .split('\n')
      .find(
        (text) =>
          text.trim() !== '' && !text.trim().startsWith('|') && !text.trim().startsWith('```'),
      ) ?? '';
  return line
    .replace(/\\\[\[/gu, '[[')
    .replace(/^\s*(?:[-*]|\d+\.)\s+/u, '')
    .trim();
}
