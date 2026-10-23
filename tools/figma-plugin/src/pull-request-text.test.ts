import { describe, expect, it } from 'vitest';

import {
  componentBranchName,
  componentCommitBody,
  componentCommitSubject,
  componentPullRequestBody,
  type ComponentPullRequestSummary,
  TOKENS_BRANCH,
  tokensCommitBody,
  tokensCommitSubject,
  tokensPullRequestBody,
  variantTable,
} from './pull-request-text';

const pullRequest: ComponentPullRequestSummary = {
  name: 'Button',
  slug: 'button',
  branch: 'feat/figma-button',
  changedVariants: ['style=accent,state=rest', 'style=accent,state=hover'],
  removedVariants: [],
  renamedFolders: [],
  capturedVariants: new Set(['style=accent,state=rest']),
};

// @codocs [[Git 작업 규칙:커밋]]
describe('커밋 제목은 영어 Conventional Commits, 본문은 한국어다', () => {
  it('컴포넌트 PR과 토큰 PR의 제목은 브랜치 종류와 같은 feat다', () => {
    expect(componentCommitSubject('search-box')).toBe('feat(figma): export search-box component');
    expect(tokensCommitSubject()).toBe('feat(figma): export tokens');
  });

  it('컴포넌트 커밋 본문에 이번 커밋의 변경 수를 적고, 자산은 바뀐 경우에만 적는다', () => {
    const summary = {
      name: 'Button',
      slug: 'button',
      uploadCount: 2,
      deletionCount: 1,
      assetUploadCount: 0,
    };
    expect(componentCommitBody(summary)).toContain('- 변형 이미지 2개 갱신, 파일 1개 삭제');
    expect(componentCommitBody(summary)).not.toContain('자산 파일');
    expect(componentCommitBody({ ...summary, assetUploadCount: 3 })).toContain(
      '- 자산 파일 3개 갱신',
    );
  });

  it('토큰 커밋 본문에 바뀐 토큰과 이미지를 다시 내보낸 컴포넌트를 적는다', () => {
    const body = tokensCommitBody({
      changedPaths: ['color/blue/dark-1'],
      refreshedComponents: ['Button'],
      imageUploadCount: 0,
    });
    expect(body).toContain('- 바뀐 토큰 1개\n  - `color/blue/dark-1`');
    expect(body).toContain('  - Button');
  });
});

// @codocs [[Git 작업 규칙:브랜치]]
describe('피그마 플러그인 브랜치는 대상마다 이름이 고정이다', () => {
  it('컴포넌트는 feat/figma-<컴포넌트 폴더>, 토큰은 feat/figma-tokens다', () => {
    expect(componentBranchName('search-box')).toBe('feat/figma-search-box');
    expect(TOKENS_BRANCH).toBe('feat/figma-tokens');
  });

  it('토큰 브랜치와 겹치는 컴포넌트 이름은 막는다', () => {
    expect(() => componentBranchName('tokens')).toThrow('토큰 PR 브랜치와 겹친다');
  });
});

// @codocs [[피그마 일치 검사:캡처 표]]
describe('PR 본문의 피그마 | 현재 구현 표', () => {
  it('바뀐 변형마다 PR 브랜치의 피그마 이미지와 parity-captures의 캡처를 놓는다', () => {
    expect(variantTable(pullRequest)).toEqual([
      '| 변형 | 피그마 | 현재 구현 |',
      '|---|---|---|',
      '| `style=accent,state=rest` | ![style=accent,state=rest](https://github.com/SeoJaeWan/seojaewan-blog/blob/feat/figma-button/packages/design-system/figma/components/button/style=accent,state=rest.png?raw=true) | ![style=accent,state=rest](https://github.com/SeoJaeWan/seojaewan-blog/blob/parity-captures/button/style=accent,state=rest.png?raw=true) |',
      '| `style=accent,state=hover` | ![style=accent,state=hover](https://github.com/SeoJaeWan/seojaewan-blog/blob/feat/figma-button/packages/design-system/figma/components/button/style=accent,state=hover.png?raw=true) |  |',
    ]);
  });

  it('바뀐 변형이 없으면 표 대신 그렇다고 적는다', () => {
    expect(variantTable({ ...pullRequest, changedVariants: [] })).toEqual(['바뀐 변형이 없다.']);
  });

  it('컴포넌트 PR 본문은 바뀐 변형 목록과 표를 담는다', () => {
    const body = componentPullRequestBody({ ...pullRequest, removedVariants: ['style=old'] });
    expect(body).toContain('- 컴포넌트: Button (`button`)');
    expect(body).toContain(
      '- 바뀐 변형 2개\n  - `style=accent,state=rest`\n  - `style=accent,state=hover`',
    );
    expect(body).toContain('- 사라진 변형: `style=old`');
    expect(body).toContain('| 변형 | 피그마 | 현재 구현 |');
  });

  it('토큰 PR 본문은 바뀐 토큰과 이미지를 다시 내보낸 컴포넌트를 적는다', () => {
    const body = tokensPullRequestBody({
      changedPaths: ['color/blue/dark-1', 'spacing/12'],
      refreshedComponents: [],
      imageUploadCount: 1,
    });
    expect(body).toContain('- 바뀐 토큰 2개\n  - `color/blue/dark-1`\n  - `spacing/12`');
    expect(body).toContain('- 변형 이미지를 다시 내보낸 컴포넌트 없음');
    expect(body).toContain('- 이미지 자산 1개 갱신');
  });
});
