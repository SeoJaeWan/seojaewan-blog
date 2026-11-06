import { createAlertSender } from './alert-sender/alert-sender.ts';
import { loadEnv } from './env.ts';
import { createImageDownload } from './image-download/image-download.ts';
import { createImageServer } from './image-server/image-server.ts';
import { createImageService } from './image-service/image-service.ts';
import { createImageStore } from './image-store/image-store.ts';
import { createNotionImageSource } from './notion-image-source/notion-image-source.ts';

// 이미지 서버의 시작점. 환경 변수를 읽어 부품을 잇고 듣는다. `node src/main.ts`로 바로 돈다.
const env = loadEnv();

const server = createImageServer(
  createImageService({
    store: createImageStore(env.IMAGE_STORE_DIR),
    notion: createNotionImageSource({ token: env.NOTION_TOKEN }),
    download: createImageDownload(),
    alert: createAlertSender({ url: env.ALERT_URL, secret: env.ALERT_SECRET }),
  }),
);

server.listen(env.PORT, env.HOST, logListening);

// 컨테이너를 멈출 때(SIGTERM) 받은 요청을 마치고 끝낸다.
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

/**
 * 듣기 시작한 것을 로그로 남긴다.
 */
function logListening(): void {
  console.log(
    `[images] http://${env.HOST}:${String(env.PORT)} 에서 듣는다 (저장 폴더 ${env.IMAGE_STORE_DIR})`,
  );
  if (env.ALERT_URL === undefined) {
    console.warn('[images] ALERT_URL이 없어 알림을 로그로만 남긴다');
  }
}

/**
 * 새 요청을 받지 않고, 받은 요청을 마친 뒤 끝낸다.
 */
function shutdown(): void {
  server.close(() => {
    process.exit(0);
  });
}
