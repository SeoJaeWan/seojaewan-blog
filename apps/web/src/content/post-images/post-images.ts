import 'server-only';

import type { ImageSize } from '@/content/notion-export/notion-export';
import type { PostBlock, PostBody, PostImage } from '@/shared/utils/post-body/post-body';

/** 이미지 서버 주소 하나를 그릴 이미지로 바꾼 결과. 크기를 알지 못하면 이유를 담는다 */
export type ResolvedImage = {
  image: PostImage;
  failure: string | null;
};

/** 이미지 서버 주소를 그릴 이미지(주소와 크기)로 바꾸는 함수 */
export type ImageResolver = (address: string) => Promise<ResolvedImage>;

/**
 * 내보낸 글 JSON의 이미지 크기로 그리는 이미지 바꾸기. 주소는 이미지 서버 주소 그대로다.
 * 크기는 내보낼 때 이미지 서버에 물어 저장해 두었다(빌드는 이미지 서버를 부르지 않는다). 그때 받지 못한 크기(null)는 크기 없이 그린다.
 * 받지 못했다는 경고는 내보내기가 이미 남겼으므로 다시 남기지 않는다. 내보낸 JSON에 없는 주소만 경고한다.
 * @codocs [[Notion 이미지 제공:크기]]
 * @param imageSizes 이미지 서버 주소마다의 크기. 받지 못했으면 null
 * @returns 이미지 바꾸기
 */
export function createExportedImageResolver(
  imageSizes: Readonly<Record<string, ImageSize | null>>,
): ImageResolver {
  return (address) => {
    const size = imageSizes[address];
    if (size === undefined) {
      return Promise.resolve({
        image: { url: address, width: null, height: null },
        failure: '내보낸 글 JSON에 크기가 없다',
      });
    }
    return Promise.resolve({
      image: { url: address, width: size?.width ?? null, height: size?.height ?? null },
      failure: null,
    });
  };
}

/**
 * 글 본문의 이미지(하위 블록 안의 이미지 포함)와 커버를 그릴 이미지로 바꾼다. 이미지마다 크기를 받아 폭·높이를 채운다.
 * 크기를 알지 못하는 이미지는 크기 없이 두고 경고 로그를 남긴다. 페이지 만들기는 실패하지 않는다.
 * @codocs [[Notion 이미지 제공:크기]]
 * @param input 본문 블록과 커버
 * @param input.blocks 본문 블록. 이미지 블록의 주소는 이미지 서버 주소다
 * @param input.cover 커버의 이미지 서버 주소. 없으면 null
 * @param resolveImage 주소를 그릴 이미지로 바꾸는 함수
 * @returns 크기를 채운 본문
 */
export async function resolvePostImages(
  { blocks, cover }: { blocks: readonly PostBlock[]; cover: string | null },
  resolveImage: ImageResolver,
): Promise<PostBody> {
  /**
   * 주소 하나를 바꾸고, 크기를 알지 못하면 경고를 남긴다.
   * @param address 이미지 서버 주소
   * @returns 그릴 이미지
   */
  async function resolve(address: string): Promise<PostImage> {
    const { image, failure } = await resolveImage(address);
    if (failure !== null) {
      console.warn(
        `[post-images] 이미지 크기를 알지 못해 크기 없이 그린다: ${address} (${failure})`,
      );
    }
    return image;
  }

  /**
   * 블록들의 이미지를 바꾼다. 하위 블록도 같이 바꾼다.
   * @param targets 블록들
   * @returns 바꾼 블록들
   */
  function resolveBlocks(targets: readonly PostBlock[]): Promise<PostBlock[]> {
    return Promise.all(
      targets.map(
        /**
         * 이미지 블록이면 주소와 크기를 채우고, 하위 블록이 있으면 하위 블록을 바꾼다.
         * @param block 블록
         * @returns 바꾼 블록
         */
        async (block): Promise<PostBlock> => {
          if (block.type === 'image') {
            return { ...block, ...(await resolve(block.url)) };
          }
          if ('children' in block && block.children !== undefined) {
            return { ...block, children: await resolveBlocks(block.children) };
          }
          return block;
        },
      ),
    );
  }

  const [resolvedBlocks, resolvedCover] = await Promise.all([
    resolveBlocks(blocks),
    cover === null ? null : resolve(cover),
  ]);
  return { blocks: resolvedBlocks, cover: resolvedCover };
}
