import type { AlertSender } from '../alert-sender/alert-sender.ts';
import type { ImageKey } from '../image-address/image-address.ts';
import { convertImage } from '../image-convert/image-convert.ts';
import type { ImageDownload } from '../image-download/image-download.ts';
import { ImageNotFoundError } from '../image-errors/image-errors.ts';
import type { ImageStore, StoredImage } from '../image-store/image-store.ts';
import type { NotionImageSource } from '../notion-image-source/notion-image-source.ts';

/** 저장한 이미지를 찾고, 없으면 Notion에서 가져와 저장한다 */
export type ImageService = {
  getImage: (key: ImageKey) => Promise<StoredImage>;
};

/**
 * 이미지 서비스를 만든다.
 * 저장본이 있으면 그대로 준다. 없으면 Notion API로 지금의 이미지 주소를 받아 내려받고, 변환해 저장한 뒤 준다.
 * 같은 이미지·버전을 동시에 요청하면 한 번만 가져오고 모두 그 결과를 받는다.
 * 요청한 버전이 지금 Notion의 버전과 다르면 없는 이미지로 본다. 같은 주소의 그림은 바뀌지 않아야 하기 때문이다(`immutable`).
 * 가져오기가 실패하면 notify로 알리고, 알림을 기다리지 않는다.
 * @codocs [[Notion 이미지 제공:가져오는 시점]]
 * @codocs [[Notion 이미지 제공:주소]]
 * @param dependencies 쓰는 것
 * @param dependencies.store 이미지 저장소
 * @param dependencies.notion Notion 이미지 원천
 * @param dependencies.download 이미지를 내려받는 함수
 * @param dependencies.alert 알림을 보내는 함수
 * @returns 이미지 서비스
 */
export function createImageService({
  store,
  notion,
  download,
  alert,
}: {
  store: ImageStore;
  notion: NotionImageSource;
  download: ImageDownload;
  alert: AlertSender;
}): ImageService {
  const pending = new Map<string, Promise<StoredImage>>();

  /**
   * Notion에서 이미지를 가져와 저장한다.
   * @param key 이미지
   * @returns 저장한 이미지
   */
  async function fetchAndStore(key: ImageKey): Promise<StoredImage> {
    const image = await notion.getImage(key);
    if (image.version !== key.version) {
      throw new ImageNotFoundError(
        `요청한 버전(${key.version})이 지금 Notion의 버전(${image.version})과 다르다`,
      );
    }
    const converted = await convertImage(await download(image.url));
    return store.write(key, converted);
  }

  /**
   * 가져오기 실패를 알린다. 없는 이미지는 알리지 않는다. 알림을 기다리지 않는다.
   * @codocs [[알림 프로세스:결정]]
   * @param id 이미지 이름
   * @param error 실패 이유
   */
  function alertFailure(id: string, error: unknown): void {
    if (error instanceof ImageNotFoundError) {
      return;
    }
    const message = `${id}: ${error instanceof Error ? error.message : String(error)}`;
    alert
      .send({ title: 'Notion 이미지를 가져오지 못했다', message, level: 'error' })
      .catch(() => undefined);
  }

  return {
    async getImage(key) {
      const stored = await store.read(key);
      if (stored !== null) {
        return stored;
      }
      const id = `${key.kind}/${key.id}/${key.version}`;
      let task = pending.get(id);
      if (task === undefined) {
        task = fetchAndStore(key).finally(() => pending.delete(id));
        pending.set(id, task);
        task.catch((error: unknown) => {
          alertFailure(id, error);
        });
      }
      return task;
    },
  };
}
