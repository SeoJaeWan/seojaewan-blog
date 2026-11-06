import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

import type { ImageKey, ImageWidth } from '../image-address/image-address.ts';
import type { ConvertedImage } from '../image-convert/image-convert.ts';

/** 저장한 파일 하나의 정보 */
export type StoredFile = {
  path: string;
  contentType: string;
  width: number;
  height: number;
};

/** 저장한 이미지. 폭(720·1440)마다 줄 파일이다 */
export type StoredImage = Record<ImageWidth, StoredFile>;

/** 이미지 저장소. 폴더 하나에 이미지·버전마다 폴더를 둔다 */
export type ImageStore = {
  read: (key: ImageKey) => Promise<StoredImage | null>;
  write: (key: ImageKey, image: ConvertedImage) => Promise<StoredImage>;
};

/** 이미지 폴더의 목록 파일 이름. 이 파일이 있으면 폴더가 다 만들어진 것이다 */
const MANIFEST_FILE = 'manifest.json';

/** 다 만들기 전의 폴더를 두는 곳. 저장 폴더와 같은 파일 시스템이어야 옮기기(`rename`)가 원자적이다 */
const TEMP_DIR = '.tmp';

const fileEntrySchema = z.object({
  file: z.string().regex(/^[\w.-]+$/u),
  contentType: z.string(),
  width: z.number(),
  height: z.number(),
});

const manifestSchema = z.object({ 720: fileEntrySchema, 1440: fileEntrySchema });

/**
 * 저장 폴더에 이미지를 두는 저장소를 만든다.
 * 이미지·버전마다 `notion/<블록 ID>/<버전>/`(커버는 `notion/cover/<페이지 ID>/<버전>/`) 폴더에 WebP 사본과 목록 파일을 둔다.
 * 쓰기는 임시 폴더에 모두 쓴 뒤 폴더째 옮겨 원자적으로 한다. 반쯤 쓴 이미지를 읽는 일이 없다. 저장한 이미지는 지우지 않는다.
 * @codocs [[Notion 이미지 제공:결정]]
 * @param rootDir 저장 폴더
 * @returns 이미지 저장소
 */
export function createImageStore(rootDir: string): ImageStore {
  /**
   * 이미지의 폴더를 정한다.
   * @param key 이미지
   * @param key.kind 본문 이미지(`block`)인지 커버(`cover`)인지
   * @param key.id 블록 ID나 페이지 ID
   * @param key.version 버전
   * @returns 폴더 경로
   */
  function imageDir({ kind, id, version }: ImageKey): string {
    return kind === 'cover'
      ? path.join(rootDir, 'notion', 'cover', id, version)
      : path.join(rootDir, 'notion', id, version);
  }

  /**
   * 목록 파일을 저장한 파일 정보로 바꾼다.
   * @param dir 이미지 폴더
   * @param manifest 목록 파일 내용
   * @returns 저장한 이미지
   */
  function toStoredImage(dir: string, manifest: z.infer<typeof manifestSchema>): StoredImage {
    return {
      720: { ...manifest[720], path: path.join(dir, manifest[720].file) },
      1440: { ...manifest[1440], path: path.join(dir, manifest[1440].file) },
    };
  }

  /**
   * 저장한 이미지를 읽는다.
   * @param key 이미지
   * @returns 저장한 이미지. 없으면 null
   */
  async function read(key: ImageKey): Promise<StoredImage | null> {
    const dir = imageDir(key);
    let text: string;
    try {
      text = await readFile(path.join(dir, MANIFEST_FILE), 'utf8');
    } catch (error) {
      if (isNotFound(error)) {
        return null;
      }
      throw error;
    }
    return toStoredImage(dir, manifestSchema.parse(JSON.parse(text)));
  }

  /**
   * 변환한 이미지를 저장한다.
   * @param key 이미지
   * @param image 변환한 이미지
   * @returns 저장한 이미지
   */
  async function write(key: ImageKey, image: ConvertedImage): Promise<StoredImage> {
    const dir = imageDir(key);
    const tempDir = path.join(rootDir, TEMP_DIR, randomUUID());
    await mkdir(tempDir, { recursive: true });
    try {
      for (const file of image.files) {
        await writeFile(path.join(tempDir, file.name), file.data);
      }
      const manifest = { 720: toEntry(image, 720), 1440: toEntry(image, 1440) };
      await writeFile(path.join(tempDir, MANIFEST_FILE), JSON.stringify(manifest));
      await mkdir(path.dirname(dir), { recursive: true });
      try {
        await rename(tempDir, dir);
      } catch (error) {
        // 다른 프로세스가 먼저 같은 이미지를 저장했다. 먼저 저장한 것을 쓴다.
        const stored = isAlreadyExists(error) ? await read(key) : null;
        if (stored === null) {
          throw error;
        }
        return stored;
      }
      return toStoredImage(dir, manifest);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }

  return { read, write };
}

/**
 * 폭에 줄 파일의 목록 항목을 만든다.
 * @param image 변환한 이미지
 * @param width 폭
 * @returns 목록 항목
 */
function toEntry(image: ConvertedImage, width: ImageWidth): z.infer<typeof fileEntrySchema> {
  const name = image.widths[width];
  const file = image.files.find((candidate) => candidate.name === name);
  if (file === undefined) {
    throw new Error(`폭 ${String(width)}에 줄 파일이 없다: ${name}`);
  }
  return { file: name, contentType: file.contentType, width: file.width, height: file.height };
}

/**
 * 파일이 없다는 오류인지 본다.
 * @param error 오류
 * @returns 파일이 없다는 오류면 true
 */
function isNotFound(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

/**
 * 옮길 자리에 이미 폴더가 있다는 오류인지 본다.
 * @param error 오류
 * @returns 이미 있다는 오류면 true
 */
function isAlreadyExists(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error.code === 'ENOTEMPTY' || error.code === 'EEXIST')
  );
}
