// @codocs [[배포 환경:배포(CD)]]
// 컨테이너 health check와 local-server 감시가 부르는 주소다. 빌드할 때 만들어 두는 정적 응답이라, 서버가 떠서 정적 파일을 내주면 200이다.
export const dynamic = 'force-static';

/**
 * 블로그가 응답하는지 알린다.
 * @codocs [[배포 환경:배포(CD)]]
 * @returns `{ status: 'ok' }`
 */
export function GET(): Response {
  return Response.json({ status: 'ok' });
}
