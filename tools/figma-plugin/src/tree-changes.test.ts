import { describe, expect, it } from 'vitest';

import { assetFilePath, componentLayoutPath, componentSchemaPath } from './naming';
import { TOKENS_PATH } from './plugin-config';
import { changesetPath } from './pull-request-text';
import {
  isAssetSourcePath,
  isComparedPath,
  parentFolder,
  planTree,
  treeChunks,
} from './tree-changes';

const ICONS = 'packages/design-system/src/assets/icons';
const IMAGES = 'packages/design-system/src/assets/images';

// @codocs [[디자인 시스템:피그마 플러그인]]
describe('바뀐 파일만 올린다', () => {
  const current = new Map([
    ['a/a.json', 'sha-a'],
    ['a/a.layout.json', 'sha-b'],
    ['a/a.gen.tsx', 'sha-c'],
  ]);

  it('모두 같으면 바꿀 것이 없다', () => {
    const plan = planTree(
      new Map([
        ['a/a.json', 'sha-a'],
        ['a/a.layout.json', 'sha-b'],
      ]),
      current,
    );
    expect(plan.entries).toEqual([]);
  });

  it('SHA가 다르거나 새로 생긴 파일만 바꾸고, 맡지 않은 파일은 지우지 않는다', () => {
    const plan = planTree(
      new Map([
        ['a/a.json', 'sha-new'],
        ['b/b.json', 'sha-d'],
      ]),
      current,
    );
    expect(plan.changed).toEqual(['a/a.json', 'b/b.json']);
    expect(plan.deleted).toEqual([]);
  });

  it('맡은 파일 가운데 쓸 파일에 없는 것은 지운다', () => {
    const plan = planTree(new Map([['a/a.json', 'sha-a']]), current, (path) =>
      path.endsWith('.layout.json'),
    );
    expect(plan.deleted).toEqual(['a/a.layout.json']);
    expect(plan.entries).toEqual([{ path: 'a/a.layout.json', sha: null }]);
  });

  it('토큰·자산·컴포넌트·changeset 경로는 모두 저장소 비교 범위에 든다', () => {
    for (const path of [
      TOKENS_PATH,
      assetFilePath('icons/ic_fluent_add_20_regular.svg'),
      assetFilePath('images/avatar-profile.png'),
      componentSchemaPath('button'),
      componentLayoutPath('button'),
      changesetPath('figma-button'),
    ]) {
      expect(isComparedPath(path), path).toBe(true);
    }
    expect(isComparedPath('packages/design-system/src/tokens/tokens.css')).toBe(false);
  });
});

// @codocs [[디자인 시스템:자산]]
describe('자산 PR이 지우는 파일', () => {
  it('묶음 폴더 바로 아래의 SVG·래스터 원본만 맡는다', () => {
    expect(isAssetSourcePath(`${ICONS}/add.svg`)).toBe(true);
    expect(isAssetSourcePath(`${IMAGES}/avatar.png`)).toBe(true);
    expect(isAssetSourcePath(`${IMAGES}/photo.jpg`)).toBe(true);
  });

  it('생성 파일(WebP, 자산 데이터 모듈)과 다른 폴더는 맡지 않는다', () => {
    expect(isAssetSourcePath(`${IMAGES}/avatar.webp`)).toBe(false);
    expect(isAssetSourcePath('packages/design-system/src/assets/asset-data.ts')).toBe(false);
    expect(isAssetSourcePath('packages/design-system/src/assets/other/a.svg')).toBe(false);
    expect(isAssetSourcePath(`${ICONS}/nested/a.svg`)).toBe(false);
  });

  it('래스터 원본의 형식이 바뀌면 확장자만 다른 예전 원본을 지운다', () => {
    const plan = planTree(
      new Map([[`${IMAGES}/photo.jpg`, 'sha-jpg']]),
      new Map([
        [`${IMAGES}/photo.png`, 'sha-png'],
        [`${IMAGES}/photo.webp`, 'sha-webp'],
      ]),
      isAssetSourcePath,
    );
    expect(plan.changed).toEqual([`${IMAGES}/photo.jpg`]);
    expect(plan.deleted).toEqual([`${IMAGES}/photo.png`]);
  });
});

// @codocs [[디자인 시스템:피그마 플러그인]]
describe('큰 트리는 나눠 만든다', () => {
  it('항목을 정해진 수씩 순서대로 나눈다', () => {
    expect(treeChunks([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(treeChunks([], 2)).toEqual([]);
  });

  it('파일 경로의 폴더는 마지막 / 앞부분이다', () => {
    expect(parentFolder('a/b/c.json')).toBe('a/b');
    expect(parentFolder('c.json')).toBe('');
  });
});
