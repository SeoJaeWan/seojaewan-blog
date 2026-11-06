import { spawnSync } from 'node:child_process';

/**
 * 명령을 실행한다. 출력은 돌려주고, 실패하면 명령 이름과 종료 코드만 담은 오류를 던진다.
 * 인자는 오류 메시지에 넣지 않는다(비밀값이 섞일 수 있다). 비밀값은 인자가 아니라 환경 변수로 넘긴다.
 * @param {string} command 명령
 * @param {string[]} args 인자
 * @param {{ cwd?: string, env?: Record<string, string>, allowFailure?: boolean, inherit?: boolean }} [options] 실행 위치, 더할 환경 변수, 실패를 허용할지, 출력을 그대로 보일지
 * @returns {{ status: number, stdout: string }} 종료 코드와 표준 출력(앞뒤 공백 제거)
 */
export function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    encoding: 'utf8',
    stdio: options.inherit === true ? 'inherit' : ['ignore', 'pipe', 'inherit'],
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error !== undefined) {
    throw new Error(`${command} 실행 실패: ${result.error.message}`);
  }
  const status = result.status ?? 1;
  if (status !== 0 && options.allowFailure !== true) {
    throw new Error(`${command} ${args[0] ?? ''} 실패 (종료 코드 ${String(status)})`);
  }
  return { status, stdout: (result.stdout ?? '').trim() };
}
