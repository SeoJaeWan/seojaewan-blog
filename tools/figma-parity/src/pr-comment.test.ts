import { describe, expect, it } from 'vitest';

import {
  CAPTURE_ROWS_PER_TABLE,
  COMMENT_LIMIT,
  markerIndex,
  NO_PREVIOUS,
  renderComments,
  reportImageUrl,
} from './pr-comment.ts';
import type { CaptureRow } from './results.ts';

const commentOptions = {
  runUrl: 'https://github.com/o/r/actions/runs/1',
  imageUrl: (file: string): string => `https://img/${file}`,
};

/**
 * 테스트용 캡처 표 줄을 만든다.
 * @param target 대상
 * @param variant 변형
 * @param change 바꿀 필드
 * @returns 캡처 표 줄
 */
function row(target: string, variant: string, change: Partial<CaptureRow> = {}): CaptureRow {
  const dir = `${target}/${variant}`;
  const isPattern = target.startsWith('patterns/');
  return {
    target,
    kind: isPattern ? 'pattern' : 'component',
    name: target,
    variant,
    figma: isPattern ? null : `${dir}/figma.png`,
    previous: isPattern ? `${dir}/previous.png` : null,
    code: `${dir}/code.png`,
    diff: `${dir}/diff.png`,
    error: null,
    ...change,
  };
}

// @codocs [[피그마 연동:캡처 표]]
describe('PR 댓글 캡처 표', () => {
  it('대상마다 변형 줄에 피그마 | 코드 | 차이 그림을 놓는다', () => {
    const { bodies, images } = renderComments(
      { rows: [row('button', 'state=rest', { name: 'Button' })], fileErrors: [] },
      commentOptions,
    );
    const body = bodies[0] ?? '';
    expect(body).toContain('피그마 캡처 표: 대상 1개, 변형 1개');
    expect(body).toContain('<details open><summary>Button (1개)</summary>');
    expect(body).toContain('| 변형 | 피그마 | 코드 | 차이 |');
    expect(body).toContain(
      '| `state=rest` | <img src="https://img/button/state=rest/figma.png" alt="피그마"> | <img src="https://img/button/state=rest/code.png" alt="코드"> | <img src="https://img/button/state=rest/diff.png" alt="차이"> |',
    );
    expect(images).toEqual([
      'button/state=rest/figma.png',
      'button/state=rest/code.png',
      'button/state=rest/diff.png',
    ]);
  });

  it('캡처하지 못한 줄은 이유를 쓰고 실패 개수를 머리에 쓴다', () => {
    const { bodies } = renderComments(
      {
        rows: [
          row('button', 'state=rest', {
            figma: null,
            code: null,
            diff: null,
            error: '스토리가 없다',
          }),
        ],
        fileErrors: [],
      },
      commentOptions,
    );
    expect(bodies[0]).toContain('캡처 실패 1개');
    expect(bodies[0]).toContain('캡처 실패: 스토리가 없다');
  });

  it('대상 폴더 오류를 쓴다', () => {
    const { bodies } = renderComments(
      { rows: [], fileErrors: ['packages/design-system/figma/components/button/x.png이 없다'] },
      commentOptions,
    );
    expect(bodies[0]).toContain('- packages/design-system/figma/components/button/x.png이 없다');
  });

  it('줄이 많으면 표를 나누고 나뉜 표마다 머리를 다시 쓴다', () => {
    const rows = Array.from({ length: CAPTURE_ROWS_PER_TABLE + 1 }, (_, index) =>
      row('search-box', `state=s${String(index)}`),
    );
    const all = renderComments({ rows, fileErrors: [] }, commentOptions).bodies.join('\n');
    expect(all.split('| 변형 | 피그마 | 코드 | 차이 |')).toHaveLength(3);
    expect(all).toContain(`<details open><summary>search-box (계속) (${String(rows.length)}개)`);
  });
});

// @codocs [[피그마 연동:캡처 표]]
describe('PR 댓글 조립 캡처 표', () => {
  it('조립은 피그마가 아니라 이전 코드 | 지금 코드 | 차이로 놓고, 읽은 parity-captures 커밋을 머리에 쓴다', () => {
    const { bodies, images } = renderComments(
      {
        rows: [row('patterns/menu/folder', 'default', { name: 'Menu/Folder' })],
        fileErrors: [],
        previousCommit: 'f4437a64b515335b061d5cf898d4e6e0504f1844',
      },
      commentOptions,
    );
    const body = bodies[0] ?? '';
    expect(body).toContain('`parity-captures`에 저장된 이전 코드 그림과 비교한다');
    expect(body).toContain('이전 코드 그림: `parity-captures` f4437a6.');
    expect(body).toContain('<details open><summary>Menu/Folder (1개)</summary>');
    expect(body).toContain('| 변형 | 이전 코드 | 지금 코드 | 차이 |');
    expect(body).not.toContain('| 변형 | 피그마 | 코드 | 차이 |');
    expect(body).toContain(
      '| `default` | <img src="https://img/patterns/menu/folder/default/previous.png" alt="이전 코드"> | <img src="https://img/patterns/menu/folder/default/code.png" alt="지금 코드"> | <img src="https://img/patterns/menu/folder/default/diff.png" alt="차이"> |',
    );
    expect(images).toEqual([
      'patterns/menu/folder/default/previous.png',
      'patterns/menu/folder/default/code.png',
      'patterns/menu/folder/default/diff.png',
    ]);
  });

  it('이전 그림이 하나도 없는 조립(새 조립)은 지금 코드만 보이고 제목에 그렇다고 쓴다', () => {
    const { bodies, images } = renderComments(
      {
        rows: [
          row('patterns/menu/new', 'default', { name: 'Menu/New', previous: null, diff: null }),
        ],
        fileErrors: [],
        previousCommit: 'a'.repeat(40),
      },
      commentOptions,
    );
    const body = bodies[0] ?? '';
    expect(body).toContain(
      '<details open><summary>Menu/New (1개, 새 조립: 이전 코드 그림이 없어 지금 그림만 보인다)</summary>',
    );
    expect(body).toContain('| 변형 | 지금 코드 |');
    expect(body).toContain(
      '| `default` | <img src="https://img/patterns/menu/new/default/code.png" alt="지금 코드"> |',
    );
    expect(images).toEqual(['patterns/menu/new/default/code.png']);
  });

  it('이전 그림이 있는 조립에 새로 생긴 변형은 이전 코드 칸에 그렇다고 쓰고 차이 칸을 비운다', () => {
    const { bodies } = renderComments(
      {
        rows: [
          row('patterns/menu/folder', 'default'),
          row('patterns/menu/folder', 'state=hover', { previous: null, diff: null }),
        ],
        fileErrors: [],
        previousCommit: 'a'.repeat(40),
      },
      commentOptions,
    );
    expect(bodies[0]).toContain(
      `| \`state=hover\` | ${NO_PREVIOUS} | <img src="https://img/patterns/menu/folder/state=hover/code.png" alt="지금 코드"> |  |`,
    );
  });

  it('parity-captures를 읽지 못한 실행은 머리에 지금 그림만 있다고 쓴다', () => {
    const { bodies } = renderComments(
      {
        rows: [row('patterns/menu/folder', 'default', { previous: null, diff: null })],
        fileErrors: [],
        previousCommit: null,
      },
      commentOptions,
    );
    expect(bodies[0]).toContain('이번 실행은 `parity-captures`를 읽지 못해 지금 그림만 있다.');
  });

  it('컴포넌트와 조립이 섞이면 대상마다 자기 표 머리를 쓴다', () => {
    const { bodies } = renderComments(
      {
        rows: [row('button', 'state=rest'), row('patterns/menu/folder', 'default')],
        fileErrors: [],
        previousCommit: 'a'.repeat(40),
      },
      commentOptions,
    );
    const body = bodies[0] ?? '';
    expect(body.indexOf('| 변형 | 피그마 | 코드 | 차이 |')).toBeLessThan(
      body.indexOf('| 변형 | 이전 코드 | 지금 코드 | 차이 |'),
    );
  });

  it('조립 표가 댓글 하나보다 길어 나뉘면 나뉜 조각에도 조립 표 머리를 다시 쓴다', () => {
    const rows = Array.from({ length: 600 }, (_, index) =>
      row(
        'patterns/menu/folder',
        `state=s${String(index)},show-icon=true,long-name=${'x'.repeat(20)}`,
      ),
    );
    const all = renderComments({ rows, fileErrors: [] }, commentOptions).bodies.join('\n');
    expect(all).not.toContain('| 변형 | 피그마 | 코드 | 차이 |');
    expect(all.split('| 변형 | 이전 코드 | 지금 코드 | 차이 |').length).toBeGreaterThan(2);
  });
});

// @codocs [[피그마 연동:CI]]
describe('PR 댓글 그림 주소', () => {
  const base = { server: 'https://github.com', repository: 'o/r', sha: 'a'.repeat(40) };

  it('브랜치 이름이 아니라 보고 커밋 SHA로 주소를 만든다', () => {
    expect(reportImageUrl(base, 'button/state=rest/code.png')).toBe(
      `https://github.com/o/r/blob/${'a'.repeat(40)}/button/state%3Drest/code.png?raw=true`,
    );
  });

  it('SHA가 다르면 같은 파일이어도 주소가 다르다', () => {
    expect(reportImageUrl(base, 'a.png')).not.toBe(
      reportImageUrl({ ...base, sha: 'b'.repeat(40) }, 'a.png'),
    );
  });
});

// @codocs [[피그마 연동:CI]]
describe('PR 댓글 길이', () => {
  it('길이 제한을 넘으면 번호를 붙인 댓글로 이어 쓴다', () => {
    const rows = Array.from({ length: 600 }, (_, index) =>
      row('button', `style=accent,state=s${String(index)},show-icon=true`),
    );
    const { bodies, images } = renderComments({ rows, fileErrors: [] }, commentOptions);
    expect(bodies.length).toBeGreaterThan(1);
    expect(bodies.every((body) => body.length <= COMMENT_LIMIT)).toBe(true);
    expect(bodies.map((body) => markerIndex(body))).toEqual(bodies.map((_, index) => index + 1));
    expect(images).toHaveLength(1800);
  });
});
