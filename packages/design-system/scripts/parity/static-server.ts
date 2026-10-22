import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';

export type StaticServer = {
  /** `http://127.0.0.1:<port>` */
  url: string;
  close: () => Promise<void>;
};

const contentTypes = new Map<string, string>([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.ico', 'image/x-icon'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.map', 'application/json; charset=utf-8'],
]);

/**
 * 정적 빌드한 Storybook을 로컬에서 띄운다. 개발 서버 대신 빌드 결과를 써야 매번 같은 결과가 나온다.
 * @param root storybook-static 폴더
 * @param listenPort 들을 포트(0이면 빈 포트)
 * @returns 주소와 종료 함수
 */
export async function startStaticServer(root: string, listenPort = 0): Promise<StaticServer> {
  const server = createServer(
    /**
     * 요청 경로의 파일을 돌려준다. storybook-static 밖의 경로는 404다.
     * @param request HTTP 요청
     * @param response HTTP 응답
     */
    (request, response) => {
      const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
      const requested = path.join(
        root,
        pathname.endsWith('/') ? `${pathname}index.html` : pathname,
      );
      const relative = path.relative(root, requested);
      if (relative.startsWith('..') || path.isAbsolute(relative) || !existsSync(requested)) {
        response.writeHead(404).end();
        return;
      }
      if (!statSync(requested).isFile()) {
        response.writeHead(404).end();
        return;
      }
      response.writeHead(200, {
        'content-type': contentTypes.get(path.extname(requested)) ?? 'application/octet-stream',
      });
      createReadStream(requested).pipe(response);
    },
  );

  await new Promise<void>((resolve) => {
    server.listen(listenPort, '127.0.0.1', resolve);
  });
  const { port } = toAddressInfo(server.address());
  return {
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close(
          /**
           * 서버가 닫히면 Promise를 끝낸다.
           * @param error 닫기 실패 이유
           */
          (error) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          },
        );
      }),
  };
}

/**
 * 서버 주소가 TCP 주소인지 확인한다.
 * @param address server.address()의 결과
 * @returns 포트가 있는 주소
 */
function toAddressInfo(address: string | AddressInfo | null): AddressInfo {
  if (address === null || typeof address === 'string') {
    throw new Error('정적 서버 주소를 알 수 없다.');
  }
  return address;
}
