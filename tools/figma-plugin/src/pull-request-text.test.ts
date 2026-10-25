import { describe, expect, it } from 'vitest';

import { checkMotionSample } from './core/check-motion';
import { motionVariables, windowOpenSample } from './core/motion-data.fixture';
import {
  componentBranchName,
  componentCommitSubject,
  componentPullRequestBody,
  motionBranchName,
  motionCommitSubject,
  motionPullRequestBody,
  patternBranchName,
  patternPullRequestBody,
  patternsCommitSubject,
  type TargetChanges,
  targetCommitBody,
  TOKENS_BRANCH,
  tokensCommitBody,
  tokensCommitSubject,
  tokensPullRequestBody,
  variantTable,
} from './pull-request-text';

const button: TargetChanges = {
  name: 'Button',
  folder: 'packages/design-system/figma/components/button',
  captureFolder: 'button',
  changedVariants: ['style=accent,state=rest', 'style=accent,state=hover'],
  removedVariants: [],
  capturedVariants: new Set(['style=accent,state=rest']),
};

// @codocs [[Git 작업 규칙:커밋]]
describe('커밋 제목은 영어 Conventional Commits, 본문은 한국어다', () => {
  it('컴포넌트 PR과 토큰 PR의 제목은 브랜치 종류와 같은 feat다', () => {
    expect(componentCommitSubject('search-box')).toBe('feat(figma): export search-box component');
    expect(tokensCommitSubject()).toBe('feat(figma): export tokens');
    expect(patternsCommitSubject('menu')).toBe('feat(figma): export menu patterns');
  });

  it('커밋 본문에 이번 커밋의 변경 수를 적고, 자산은 바뀐 경우에만 적는다', () => {
    const summary = { changedCount: 2, deletedCount: 1, assetCount: 0 };
    expect(targetCommitBody(['Button'], summary)).toContain('- 파일 2개 갱신, 1개 삭제');
    expect(targetCommitBody(['Button'], summary)).not.toContain('자산 파일');
    expect(targetCommitBody(['Button'], { ...summary, assetCount: 3 })).toContain(
      '- 그중 자산 파일 3개',
    );
  });

  it('토큰 커밋 본문에 바뀐 토큰과 그 토큰을 쓰는 컴포넌트를 적는다', () => {
    const body = tokensCommitBody({
      addedPaths: [],
      modifiedPaths: ['color/blue/dark-1'],
      removedPaths: [],
      usingComponents: ['Button'],
      refreshedComponents: ['Button'],
      imageUploadCount: 0,
    });
    expect(body).toContain('- 값이 바뀐 토큰 1개\n  - `color/blue/dark-1`');
    expect(body).toContain('  - Button (변형 이미지 다시 내보냄)');
  });
});

// @codocs [[피그마 연동:피그마 플러그인]]
describe('피그마 플러그인 브랜치는 대상마다 이름이 고정이다', () => {
  it('컴포넌트는 feat/figma-<컴포넌트 폴더>, 토큰은 feat/figma-tokens다', () => {
    expect(componentBranchName('search-box')).toBe('feat/figma-search-box');
    expect(TOKENS_BRANCH).toBe('feat/figma-tokens');
  });

  it('조립은 영역마다 feat/figma-patterns-<영역>이다', () => {
    expect(patternBranchName('menu')).toBe('feat/figma-patterns-menu');
  });

  it('애니메이션은 견본마다 feat/figma-motion-<견본 이름>이다', () => {
    expect(motionBranchName('motion-progress-ring')).toBe('feat/figma-motion-motion-progress-ring');
  });

  it('토큰·조립·애니메이션 브랜치와 겹치는 컴포넌트 이름은 막는다', () => {
    expect(() => componentBranchName('tokens')).toThrow('토큰 PR 브랜치와 겹친다');
    expect(() => componentBranchName('patterns-menu')).toThrow('조립 PR 브랜치와 겹친다');
    expect(() => componentBranchName('motion-ring')).toThrow('애니메이션 PR 브랜치와 겹친다');
  });

  it('애니메이션 PR 본문은 피그마 견본 링크, 키프레임 표, 토큰 짝 표를 담는다', () => {
    const result = checkMotionSample(windowOpenSample(), motionVariables, 'KEY');
    if (!result.ok) {
      throw new Error('견본이 검사를 통과해야 한다');
    }
    const body = motionPullRequestBody(result.motion);
    expect(motionCommitSubject('motion-window-open')).toBe(
      'feat(figma): export motion-window-open motion',
    );
    expect(body).toContain(
      '- 견본: [motion-window-open](https://www.figma.com/design/KEY?node-id=12-34)',
    );
    expect(body).toContain('| 노드 | 항목 | 시간 | 값 | 이징 | 값 토큰 |');
    expect(body).toContain(
      '| Window | `SCALE_XY` | 0ms | x 0.96, y 0.96 | - | `motion/scale/window-enter` |',
    );
    expect(body).toContain('| Window `OPACITY` 트랙 길이 | 250ms | `motion/duration/normal` |');
    expect(body).toContain('| Window `OPACITY` 이징 | 곡선 | `motion/easing/fade` |');
  });
});

// @codocs [[피그마 연동:캡처 표]]
describe('PR 본문의 피그마 | 현재 구현 표', () => {
  it('바뀐 변형마다 PR 브랜치의 피그마 이미지와 parity-captures의 캡처를 놓는다', () => {
    expect(variantTable('feat/figma-button', [button])).toEqual([
      '| 변형 | 피그마 | 현재 구현 |',
      '|---|---|---|',
      '| `style=accent,state=rest` | ![style=accent,state=rest](https://github.com/SeoJaeWan/seojaewan-blog/blob/feat/figma-button/packages/design-system/figma/components/button/style=accent,state=rest.png?raw=true) | ![style=accent,state=rest](https://github.com/SeoJaeWan/seojaewan-blog/blob/parity-captures/button/style=accent,state=rest.png?raw=true) |',
      '| `style=accent,state=hover` | ![style=accent,state=hover](https://github.com/SeoJaeWan/seojaewan-blog/blob/feat/figma-button/packages/design-system/figma/components/button/style=accent,state=hover.png?raw=true) |  |',
    ]);
  });

  it('바뀐 변형이 없으면 표 대신 그렇다고 적는다', () => {
    expect(variantTable('feat/figma-button', [{ ...button, changedVariants: [] }])).toEqual([
      '바뀐 변형이 없다.',
    ]);
  });

  it('컴포넌트 PR 본문은 바뀐 변형 목록과 표를 담는다', () => {
    const body = componentPullRequestBody(
      'feat/figma-button',
      { ...button, removedVariants: ['style=old'] },
      ['packages/design-system/figma/components/old-button'],
    );
    expect(body).toContain('- 컴포넌트: Button');
    expect(body).toContain(
      '- 새로 생기거나 PNG가 바뀐 변형 2개\n  - `style=accent,state=rest`\n  - `style=accent,state=hover`',
    );
    expect(body).toContain('- 사라진 변형: `style=old`');
    expect(body).toContain('- 이름이 바뀌어 이전 폴더 삭제:');
    expect(body).toContain('| 변형 | 피그마 | 현재 구현 |');
  });

  it('토큰 PR 본문은 새로 생기거나 바뀌거나 사라진 토큰과 그 토큰을 쓰는 컴포넌트를 적는다', () => {
    const body = tokensPullRequestBody({
      addedPaths: ['spacing/16'],
      modifiedPaths: ['color/blue/dark-1'],
      removedPaths: ['spacing/12'],
      usingComponents: ['Button', 'Flyout'],
      refreshedComponents: ['Button'],
      imageUploadCount: 1,
    });
    expect(body).toContain('- 새 토큰 1개\n  - `spacing/16`');
    expect(body).toContain('- 값이 바뀐 토큰 1개\n  - `color/blue/dark-1`');
    expect(body).toContain('- 이름이 바뀌었거나 지워진 토큰 1개\n  - `spacing/12`');
    expect(body).toContain(
      '- 바뀐 토큰을 쓰는 컴포넌트 2개\n  - Button (변형 이미지 다시 내보냄)\n  - Flyout',
    );
    expect(body).toContain('- 이미지 자산 1개 갱신');
    expect(body).toContain('손으로 고치지 않는다');
  });

  it('바뀐 토큰을 쓰는 컴포넌트가 없으면 그렇다고 적는다', () => {
    const body = tokensPullRequestBody({
      addedPaths: ['spacing/16'],
      modifiedPaths: [],
      removedPaths: [],
      usingComponents: [],
      refreshedComponents: [],
      imageUploadCount: 0,
    });
    expect(body).toContain('- 바뀐 토큰을 쓰는 컴포넌트 없음');
    expect(body).not.toContain('이미지 자산');
  });

  it('조립 PR 본문은 조립마다 변경을 적고, 표의 변형 앞에 조립 이름을 붙인다', () => {
    /**
     * 조립 하나의 변경을 만든다.
     * @param name 조립 이름(영역 뒤)
     * @returns 변경
     */
    function folder(name: string): TargetChanges {
      return {
        name: `Menu/${name}`,
        folder: `apps/web/figma/patterns/menu/${name.toLowerCase()}`,
        captureFolder: `patterns/menu/${name.toLowerCase()}`,
        changedVariants: ['default'],
        removedVariants: [],
        capturedVariants: new Set(name === 'Folder' ? ['default'] : []),
      };
    }
    const body = patternPullRequestBody(
      'feat/figma-patterns-menu',
      'menu',
      [folder('Folder'), folder('Desktop')],
      [],
    );
    expect(body).toContain('- 영역: `menu`');
    expect(body).toContain('- 조립: Menu/Folder\n  - 새로 생기거나 PNG가 바뀐 변형 1개');
    expect(body).toContain(
      '| `Menu/Folder / default` | ![default](https://github.com/SeoJaeWan/seojaewan-blog/blob/feat/figma-patterns-menu/apps/web/figma/patterns/menu/folder/default.png?raw=true) | ![default](https://github.com/SeoJaeWan/seojaewan-blog/blob/parity-captures/patterns/menu/folder/default.png?raw=true) |',
    );
    expect(body).toContain('| `Menu/Desktop / default` |');
  });
});
