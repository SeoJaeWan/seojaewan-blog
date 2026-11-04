import { bundledThemes } from 'shiki';
import { describe, expect, it, vi } from 'vitest';

import { codeBlockStorySample } from '@seojaewan/design-system/story';

import { postPageBlocks } from '@/features/chrome/components/chrome-page/story-data';
import { sampleBlocks } from '@/features/chrome/components/post-blocks/story-data';
import type { CodeToken, PostBlock } from '@/shared/utils/post-body/post-body';

import {
  CODE_HIGHLIGHT_COLOR_REPLACEMENTS,
  CODE_HIGHLIGHT_THEME,
  highlightCode,
} from './code-highlight';

vi.mock('server-only', () => ({}));

const source = [
  "import { use } from 'react';",
  '// 글을 읽는다',
  'export function readPost<T>(items: T[], count = 1): boolean {',
  '  if (items === null) return false;',
  '  const post = use(fetchPost(slug));',
  '  return <Article data={post} />;',
  '}',
].join('\n');

/**
 * 강조된 코드에서 글자 조각의 색을 찾는다. 줄 안에서 그 글자와 똑같은 첫 조각을 본다.
 * @param lines 강조된 코드
 * @param text 찾을 글자
 * @returns 색(hex). 기본 글자색이면 null
 */
function colorOf(lines: readonly (readonly CodeToken[])[], text: string): string | null {
  const token = lines.flat().find((candidate) => candidate.text.trim() === text);
  if (token === undefined) {
    throw new Error(`"${text}" 조각이 없다: ${JSON.stringify(lines)}`);
  }
  return token.color;
}

/**
 * 코드 블록 바탕(`#f9f9f9`) 위 글자색의 대비를 WCAG 식으로 잰다.
 * @param hex 글자색(hex)
 * @returns 대비
 */
function contrastOnCodeBackground(hex: string): number {
  /**
   * 상대 휘도를 구한다.
   * @param color hex 색
   * @returns 상대 휘도
   */
  function luminance(color: string): number {
    const [red = 0, green = 0, blue = 0] = [1, 3, 5].map((start) => {
      const channel = Number.parseInt(color.slice(start, start + 2), 16) / 255;
      return channel <= 0.039_28 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  }
  return (luminance('#f9f9f9') + 0.05) / (luminance(hex) + 0.05);
}

/**
 * 견본 코드를 tsx로 강조한다.
 * @returns 강조된 코드
 */
async function highlightSource(): Promise<CodeToken[][]> {
  const lines = await highlightCode(source, 'tsx');
  if (lines === undefined) {
    throw new Error('tsx를 강조하지 않았다');
  }
  return lines;
}

/**
 * 줄마다의 글자 조각을 코드 글자로 잇는다.
 * @param lines 줄마다의 글자 조각
 * @returns 코드
 */
function joinLines(lines: readonly (readonly { text: string }[])[]): string {
  return lines.map((line) => line.map((token) => token.text).join('')).join('\n');
}

// @codocs [[기술 스택:글 본문 처리]]
describe('기술 스택:글 본문 처리', () => {
  it('Shiki 내장 light-plus 테마를 그대로 쓴다', () => {
    expect(CODE_HIGHLIGHT_THEME).toBe('light-plus');
    expect(Object.keys(bundledThemes)).toContain(CODE_HIGHLIGHT_THEME);
  });

  it('조각의 색은 Light+가 준 색(hex)이다', async () => {
    const lines = await highlightSource();
    expect(colorOf(lines, 'false')).toBe('#0000ff');
    expect(colorOf(lines, 'import')).toBe('#af00db');
    expect(colorOf(lines, 'function')).toBe('#0000ff');
    expect(colorOf(lines, "'react'")).toBe('#a31515');
    expect(colorOf(lines, '// 글을 읽는다')).toBe('#008000');
    expect(colorOf(lines, '1')).toBe('#098658');
    expect(colorOf(lines, 'readPost')).toBe('#795e26');
    expect(colorOf(lines, 'boolean')).toBe('#257c96');
    expect(colorOf(lines, 'post')).toBe('#0070c1');
    expect(colorOf(lines, '/>')).toBe('#800000');
    for (const token of lines.flat()) {
      expect(token.color === null || /^#[0-9a-f]{6}$/u.test(token.color), token.text).toBe(true);
    }
  });

  it('Light+의 #267f99(대비 4.35:1)는 #257c96(4.53:1)으로 바꿔 쓴다', async () => {
    expect(CODE_HIGHLIGHT_COLOR_REPLACEMENTS).toEqual({ '#267f99': '#257c96' });
    expect(contrastOnCodeBackground('#267f99')).toBeLessThan(4.5);
    expect(contrastOnCodeBackground('#257c96')).toBeGreaterThanOrEqual(4.5);
    const colors = (await highlightSource()).flat().map((token) => token.color);
    expect(colors).toContain('#257c96');
    expect(colors).not.toContain('#267f99');
  });

  it('테마의 기본 글자색인 조각은 색이 없다(null)', async () => {
    const lines = await highlightSource();
    expect(colorOf(lines, '=')).toBeNull();
    expect(colorOf(lines, '{')).toBeNull();
  });

  it('줄마다 글자 조각으로 나누고, 조각을 이으면 원래 코드다', async () => {
    expect(joinLines(await highlightSource())).toBe(source);
  });

  it('이웃한 같은 색 조각은 하나로 합친다', async () => {
    const lines = await highlightSource();
    for (const line of lines) {
      line.slice(1).forEach((token, index) => {
        expect(token.color === line[index]?.color, token.text).toBe(false);
      });
    }
  });

  it('언어 이름은 대소문자를 가리지 않고 별칭도 받는다', async () => {
    expect(await highlightCode('const a = 1;', 'TypeScript')).toBeDefined();
    expect(await highlightCode('const a = 1;', 'ts')).toBeDefined();
  });

  it('Shiki가 모르는 언어(plain text 등)는 강조하지 않는다', async () => {
    expect(await highlightCode('그냥 글자', 'plain text')).toBeUndefined();
  });
});

/**
 * 견본 본문 블록에서 코드 블록을 꺼낸다.
 * @param blocks 본문 블록
 * @returns 코드 블록들
 */
function codeBlocks(
  blocks: readonly PostBlock[],
): { code: string; language: string; highlighted: CodeToken[][] | undefined }[] {
  return blocks.flatMap((block) =>
    block.type === 'code'
      ? [{ code: block.code, language: block.language, highlighted: block.highlighted }]
      : [],
  );
}

// 스토리는 강조기를 돌리지 못해(디자인 시스템은 강조기가 없고, 앱 강조기는 서버 전용이다) 강조 결과를 데이터로 둔다.
// 동작 스토리가 쓰는 색 있는 데이터가 손으로 칠한 것이 아니라 실제 강조 결과인지, 캡처용 `Figma` 스토리가 쓰는 색 없는 코드가
// 같은 코드인지 여기서 다시 강조해 확인한다. 색이 실제로 나오는지도 여기서 본다(캡처는 색 없는 코드로 그린다).
// @codocs [[기술 스택:글 본문 처리]]
// @codocs [[피그마 연동:스토리 규칙]]
describe('스토리의 강조된 코드는 실제 강조 결과다', () => {
  it('CodeBlock 스토리(피그마 슬롯 기본 내용)의 색 있는 줄', async () => {
    const { code, language, lines } = codeBlockStorySample;
    expect(await highlightCode(code, language)).toEqual(lines);
    expect(lines.flat().some((token) => token.color !== null)).toBe(true);
  });

  it('CodeBlock 스토리의 색 없는 줄은 같은 코드를 색 없이 둔 것이다(캡처용)', () => {
    const { code, plainLines } = codeBlockStorySample;
    expect(joinLines(plainLines)).toBe(code);
    expect(plainLines.flat().every((token) => token.color === null)).toBe(true);
  });

  it.each([
    ['Chrome/PostBlocks', sampleBlocks],
    ['Chrome/Page Page=Post', postPageBlocks.wide],
  ])(
    '%s 견본 본문의 코드는 색 없이 두고, 실제 강조하면 코드 그대로 색이 나온다',
    async (_name, blocks) => {
      const found = codeBlocks(blocks);
      expect(found).not.toHaveLength(0);
      for (const { code, language, highlighted } of found) {
        expect(highlighted).toBeUndefined();
        const lines = await highlightCode(code, language);
        expect(lines).toBeDefined();
        expect(joinLines(lines ?? [])).toBe(code);
        expect(lines?.flat().some((token) => token.color !== null)).toBe(true);
      }
    },
  );
});
