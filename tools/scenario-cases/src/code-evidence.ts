import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import type { CodeRef } from './table-types.ts';

/** 읽을 소스 파일 하나. */
export type SourceFile = { file: string; text: string };

const COMMENT_LINE = /^\s*(?:\/\*\*|\/\*|\*\/|\*|\/\/)/u;
const COMMENT_PREFIX = /^\s*(?:\/\*\*|\/\*|\*\/|\*|\/\/)\s?/u;
const CODOCS_LINKS = /\[\[[^\]]+\]\]/gu;
const DECLARATION = /(?:function\*?|const|let|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/u;
const MEMBER = /^\s*(?:async\s+)?([A-Za-z_$][\w$]*)\s*[(:=]/u;
const DESCRIPTION_LIMIT = 80;

/**
 * 주석 줄에서 주석 기호를 떼어 낸다.
 * @param line 주석 줄
 * @returns 글자만 남긴 줄
 */
function stripComment(line: string): string {
  return line
    .replace(COMMENT_PREFIX, '')
    .replace(/\*\/\s*$/u, '')
    .trim();
}

/**
 * 소스 파일들에서 `@codocs` 주석을 찾아 링크별 코드 근거로 모은다.
 * 근거는 주석 다음의 첫 선언(파일:줄, 이름)과 같은 주석 묶음의 설명 첫 줄이다.
 * @codocs [[테스트 작성 규칙:E2E]]
 * @param files 소스 파일(경로와 내용)
 * @returns `[[문서:섹션]]` → 코드 근거 목록
 */
export function extractCodocsRefs(files: readonly SourceFile[]): Map<string, CodeRef[]> {
  const refs = new Map<string, CodeRef[]>();
  for (const { file, text } of files) {
    const lines = text.split(/\r?\n/u);
    for (const [index, line] of lines.entries()) {
      const marker = line.indexOf('@codocs');
      if (marker === -1 || !COMMENT_LINE.test(line)) {
        continue;
      }
      const links = line.slice(marker).match(CODOCS_LINKS);
      if (links === null) {
        continue;
      }
      let start = index;
      while (start > 0 && COMMENT_LINE.test(lines[start - 1] ?? '')) {
        start -= 1;
      }
      let end = index + 1;
      while (end < lines.length && COMMENT_LINE.test(lines[end] ?? '')) {
        end += 1;
      }
      const description =
        lines
          .slice(start, end)
          .map(stripComment)
          .find((text) => text !== '' && !text.startsWith('@')) ?? '';
      const declaration = lines[end] ?? '';
      const name = DECLARATION.exec(declaration)?.[1] ?? MEMBER.exec(declaration)?.[1] ?? null;
      const ref: CodeRef = {
        file,
        line: end + 1,
        name,
        description: description.slice(0, DESCRIPTION_LIMIT),
      };
      for (const link of new Set(links)) {
        const list = refs.get(link) ?? [];
        if (!list.some((known) => known.file === ref.file && known.line === ref.line)) {
          list.push(ref);
        }
        refs.set(link, list);
      }
    }
  }
  return refs;
}

/**
 * 제품 코드 파일을 읽는다. 스토리(`*.stories.*`)와 테스트(`*.test.*`)는 근거가 아니라 뺀다.
 * @param repoRoot 저장소 루트
 * @param roots 저장소 기준 폴더들
 * @returns 저장소 기준 경로와 내용
 */
export function readProductSources(repoRoot: string, roots: readonly string[]): SourceFile[] {
  const files: SourceFile[] = [];
  /**
   * 폴더를 따라 내려가며 TS 파일을 모은다.
   * @param dir 절대 경로
   */
  function walk(dir: string): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules') {
          walk(full);
        }
      } else if (/\.tsx?$/u.test(entry.name) && !/\.(?:stories|test)\./u.test(entry.name)) {
        files.push({
          file: path.relative(repoRoot, full).split(path.sep).join('/'),
          text: readFileSync(full, 'utf8'),
        });
      }
    }
  }
  for (const root of roots) {
    walk(path.join(repoRoot, root));
  }
  return files.sort((a, b) => a.file.localeCompare(b.file));
}
