import { describe, expect, it } from 'vitest';

import { buttonSchema } from '../../../packages/design-system/src/figma-export/figma-export.fixture';
import {
  ASSETS_BRANCH,
  changesetPath,
  changesetText,
  componentBranchName,
  componentPullRequestBody,
  TOKENS_BRANCH,
  tokensPullRequestBody,
  variantChanges,
} from './pull-request-text';

// @codocs [[디자인 시스템:피그마 플러그인]]
describe('PR 브랜치', () => {
  it('브랜치는 토큰 feat/figma-tokens, 자산 feat/figma-assets, 컴포넌트 feat/figma-<컴포넌트>다', () => {
    expect(TOKENS_BRANCH).toBe('feat/figma-tokens');
    expect(ASSETS_BRANCH).toBe('feat/figma-assets');
    expect(componentBranchName('search-box')).toBe('feat/figma-search-box');
  });

  it('컴포넌트 브랜치가 토큰·자산 브랜치와 겹치면 멈춘다', () => {
    expect(() => componentBranchName('tokens')).toThrow('겹친다');
    expect(() => componentBranchName('assets')).toThrow('겹친다');
  });
});

// @codocs [[디자인 시스템:PR 흐름]]
describe('changeset', () => {
  it('대상은 @seojaewan/design-system, 종류는 patch, 설명은 다시 내보낸 것 한 줄이다', () => {
    expect(changesetPath('figma-button')).toBe('.changeset/figma-button.md');
    expect(changesetText('Button 컴포넌트')).toBe(
      "---\n'@seojaewan/design-system': patch\n---\n\n피그마에서 Button 컴포넌트를 다시 내보냈다.\n",
    );
    expect(changesetText('토큰')).toContain('피그마에서 토큰을 다시 내보냈다.');
  });
});

// @codocs [[디자인 시스템:피그마 플러그인]]
describe('컴포넌트 PR 본문', () => {
  const [rest, hover, ...others] = buttonSchema.variants;
  if (rest === undefined || hover === undefined) {
    throw new Error('fixture');
  }
  const main = { ...buttonSchema, variants: [rest, hover] };

  it('main의 스키마와 견줘 새로 생긴 변형, 바뀐 변형, 사라진 변형을 구한다', () => {
    const next = {
      ...buttonSchema,
      variants: [{ ...hover, values: { ...hover.values, Extra: 'x' } }, ...others],
    };
    const changes = variantChanges(main, next);
    expect(changes.added.map((variant) => variant.name)).toEqual(
      others.map((variant) => variant.name),
    );
    expect(changes.changed.map((variant) => variant.name)).toEqual([hover.name]);
    expect(changes.removed).toEqual([{ name: rest.name, nodeId: rest.nodeId }]);
  });

  it('main에 스키마가 없으면 모든 변형이 새로 생긴 변형이다', () => {
    expect(variantChanges(null, buttonSchema).added).toHaveLength(buttonSchema.variants.length);
  });

  it('변경을 표로 적고 변형 이름은 피그마의 그 변형으로 가는 링크다. 그림은 넣지 않는다', () => {
    const body = componentPullRequestBody(
      'Button',
      { added: [{ name: rest.name, nodeId: '13:10' }], changed: [], removed: [] },
      false,
    );
    expect(body).toContain('| 변경 | 변형 |');
    expect(body).toContain(
      '| 새로 생김 | [Variant=Standard, State=Rest](https://www.figma.com/design/XV9Y1UT5UH4tC5hSqLVipZ/?node-id=13-10) |',
    );
    expect(body).not.toContain('![');
  });
});

// @codocs [[디자인 시스템:피그마 플러그인]]
describe('토큰 PR 본문', () => {
  it('새로 생기거나 바뀌거나 사라진 토큰을 적는다', () => {
    const body = tokensPullRequestBody({
      addedPaths: ['spacing/xl'],
      modifiedPaths: [],
      removedPaths: ['Color/Black/6'],
    });
    expect(body).toContain('- 새 토큰 1개\n  - `spacing/xl`');
    expect(body).toContain('- 이름이 바뀌었거나 지워진 토큰 1개\n  - `Color/Black/6`');
  });
});
