import { pathToFileURL } from 'node:url';

// @codocs [[배포 환경:CI]]
// self-hosted runner 여러 개가 한 머신에서 job을 동시에 돌린다. 서버를 띄우는 job은 runner 이름 끝 번호
// (`minipc-<n>`)로 포트를 나눠, 동시에 도는 job끼리 포트가 겹치지 않게 한다. 한 runner는 job을 하나씩만 돌린다.
// 3000번은 블로그 컨테이너 자리라 쓰지 않는다.
const RUNNER_NUMBER_PATTERN = /-(\d+)$/u;
const RESERVED_PORT = 3000;

/**
 * runner 이름에 맞는 포트를 정한다.
 * @param {string} runnerName runner 이름(`RUNNER_NAME`, 예: `minipc-2`)
 * @param {number} base 기준 포트. runner 번호를 더한다
 * @returns {number} 포트
 */
export function runnerPort(runnerName, base) {
  const match = RUNNER_NUMBER_PATTERN.exec(runnerName);
  if (match === null) {
    throw new Error(`runner 이름 "${runnerName}" 끝에 번호(-<n>)가 없어 포트를 정하지 못한다.`);
  }
  const port = base + Number(match[1]);
  if (port === RESERVED_PORT || port < 1024 || port > 65_535) {
    throw new Error(`포트 ${String(port)}은(는) 쓸 수 없다.`);
  }
  return port;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const base = Number(process.argv[2]);
  if (!Number.isInteger(base)) {
    console.error('사용법: RUNNER_NAME=<runner 이름> node scripts/runner-port.mjs <기준 포트>');
    process.exitCode = 2;
  } else {
    console.log(runnerPort(process.env.RUNNER_NAME ?? '', base));
  }
}
