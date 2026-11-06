import 'server-only';

import type { ImageSizeReader } from '@/content/image-size/image-size';
import type { PostBlock, PostBody, PostImage } from '@/shared/utils/post-body/post-body';

/** 이미지 서버 주소 하나를 그릴 이미지로 바꾼 결과. 크기를 받지 못했으면 이유를 담는다 */
export type ResolvedImage = {
  image: PostImage;
  failure: string | null;
};

/** 이미지 서버 주소를 그릴 이미지(주소와 크기)로 바꾸는 함수 */
export type ImageResolver = (address: string) => Promise<ResolvedImage>;

/** 사람에게 보내는 알림 하나. 서비스 이름(`[blog]`)은 notify가 붙인다 */
export type ImageAlert = {
  title: string;
  message: string;
  level: 'warn';
};

/** 알림을 보내는 함수. 실패해도 페이지 만들기를 멈추지 않는다 */
export type ImageAlertSender = (alert: ImageAlert) => Promise<void>;

/** 크기를 받지 못했을 때 보내는 알림 제목 */
export const IMAGE_SIZE_ALERT_TITLE = '이미지 크기를 받지 못했다';

/**
 * 운영에서 쓰는 이미지 바꾸기. 주소는 이미지 서버 주소 그대로이고, 크기는 이미지 서버에 묻는다. 받지 못하면 크기는 null이다.
 * @codocs [[Notion 이미지 제공:크기]]
 * @param readSize 이미지 서버에 크기를 묻는 함수
 * @returns 이미지 바꾸기
 */
export function createServedImageResolver(readSize: ImageSizeReader): ImageResolver {
  return async (address) => {
    const size = await readSize(address);
    return size.kind === 'sized'
      ? { image: { url: address, width: size.width, height: size.height }, failure: null }
      : { image: { url: address, width: null, height: null }, failure: size.reason };
  };
}

/**
 * 글 본문의 이미지(하위 블록 안의 이미지 포함)와 커버를 그릴 이미지로 바꾼다. 이미지마다 크기를 받아 폭·높이를 채운다.
 * 크기를 받지 못한 이미지는 크기 없이 두고, 이미지마다 경고 로그를 남기고, 받지 못한 이미지를 모아 알림을 한 번 보낸다.
 * 알림이 실패해도 오류를 던지지 않는다. 이미지 서버가 꺼져 있어도 페이지 만들기는 실패하지 않아야 하기 때문이다.
 * @codocs [[Notion 이미지 제공:크기]]
 * @param input 본문 블록과 커버
 * @param input.blocks 본문 블록. 이미지 블록의 주소는 이미지 서버 주소다
 * @param input.cover 커버의 이미지 서버 주소. 없으면 null
 * @param options 바꾸는 방법
 * @param options.resolveImage 주소를 그릴 이미지로 바꾸는 함수
 * @param options.sendAlert 알림을 보내는 함수. 없으면 로그만 남긴다
 * @returns 크기를 채운 본문
 */
export async function resolvePostImages(
  { blocks, cover }: { blocks: readonly PostBlock[]; cover: string | null },
  {
    resolveImage,
    sendAlert,
  }: { resolveImage: ImageResolver; sendAlert?: ImageAlertSender | undefined },
): Promise<PostBody> {
  const failures: string[] = [];

  /**
   * 주소 하나를 바꾸고, 크기를 받지 못했으면 경고를 남긴다.
   * @param address 이미지 서버 주소
   * @returns 그릴 이미지
   */
  async function resolve(address: string): Promise<PostImage> {
    const { image, failure } = await resolveImage(address);
    if (failure !== null) {
      console.warn(
        `[post-images] 이미지 크기를 받지 못해 크기 없이 그린다: ${address} (${failure})`,
      );
      failures.push(`${address} (${failure})`);
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
  if (failures.length > 0 && sendAlert !== undefined) {
    try {
      await sendAlert({
        title: IMAGE_SIZE_ALERT_TITLE,
        message: failures.join('\n'),
        level: 'warn',
      });
    } catch (error) {
      console.warn(
        `[post-images] 알림을 보내지 못했다: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  return { blocks: resolvedBlocks, cover: resolvedCover };
}
