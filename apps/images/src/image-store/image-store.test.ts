import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { ImageKey } from '../image-address/image-address.ts';
import type { ConvertedImage } from '../image-convert/image-convert.ts';
import { createImageStore } from './image-store.ts';

const block: ImageKey = {
  kind: 'block',
  id: '410c97ba-fd89-8100-0000-000000000001',
  version: '20261106T023300Z',
};
const cover: ImageKey = {
  kind: 'cover',
  id: '410c97ba-fd89-8100-0000-000000000002',
  version: '0123456789ab',
};

/**
 * 변환 결과를 흉내 낸다.
 * @param label 파일 내용에 넣을 글자
 * @returns 변환 결과
 */
function converted(label: string): ConvertedImage {
  return {
    files: [
      {
        name: 'w720.webp',
        data: Buffer.from(`${label}-720`),
        contentType: 'image/webp',
        width: 720,
        height: 360,
      },
      {
        name: 'w1440.webp',
        data: Buffer.from(`${label}-1440`),
        contentType: 'image/webp',
        width: 1440,
        height: 720,
      },
    ],
    widths: { 720: 'w720.webp', 1440: 'w1440.webp' },
  };
}

let rootDir: string;

beforeEach(async () => {
  rootDir = await mkdtemp(path.join(tmpdir(), 'images-store-'));
});

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true });
});

// @codocs [[Notion 이미지 제공:결정]]
describe('Notion 이미지 제공:결정', () => {
  it('본문 이미지는 블록 ID, 커버는 페이지 ID 아래 버전 폴더에 WebP 사본만 저장한다', async () => {
    const store = createImageStore(rootDir);
    await store.write(block, converted('block'));
    await store.write(cover, converted('cover'));
    expect((await readdir(path.join(rootDir, 'notion', block.id, block.version))).sort()).toEqual([
      'manifest.json',
      'w1440.webp',
      'w720.webp',
    ]);
    expect(
      await readFile(
        path.join(rootDir, 'notion', 'cover', cover.id, cover.version, 'w720.webp'),
        'utf8',
      ),
    ).toBe('cover-720');
  });

  it('저장한 이미지는 폭마다 파일과 크기를 다시 읽는다', async () => {
    const store = createImageStore(rootDir);
    await store.write(block, converted('block'));
    const stored = await createImageStore(rootDir).read(block);
    expect(stored?.[1440]).toMatchObject({ contentType: 'image/webp', width: 1440, height: 720 });
    expect(await readFile(stored?.[720].path ?? '', 'utf8')).toBe('block-720');
  });

  it('저장하지 않은 이미지·버전은 없다고 답한다', async () => {
    const store = createImageStore(rootDir);
    await store.write(block, converted('block'));
    expect(await store.read({ ...block, version: '20261106T023400Z' })).toBeNull();
  });

  it('쓰기를 마치면 임시 폴더를 남기지 않는다', async () => {
    await createImageStore(rootDir).write(block, converted('block'));
    expect(await readdir(path.join(rootDir, '.tmp'))).toEqual([]);
  });

  it('두 쓰기가 겹치면 먼저 옮긴 것을 쓰고 섞지 않는다', async () => {
    const [first, second] = await Promise.all([
      createImageStore(rootDir).write(block, converted('first')),
      createImageStore(rootDir).write(block, converted('second')),
    ]);
    const content = await readFile(first[720].path, 'utf8');
    expect(['first-720', 'second-720']).toContain(content);
    expect(await readFile(second[1440].path, 'utf8')).toBe(content.replace('720', '1440'));
  });
});
