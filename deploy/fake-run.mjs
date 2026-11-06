/**
 * 시험용 명령 실행. 명령 줄(`명령 인자...`)이 규칙의 앞부분과 맞으면 그 결과를 돌려주고, 부른 명령을 모두 남긴다.
 * 맞는 규칙이 없으면 성공(빈 출력)으로 본다. 결과가 실패이고 `allowFailure`가 아니면 진짜 실행처럼 던진다.
 * @param {[string, { status?: number, stdout?: string } | ((line: string) => { status?: number, stdout?: string })][]} rules 명령 줄 앞부분과 결과
 * @returns {{ run: (command: string, args: string[], options?: { allowFailure?: boolean }) => { status: number, stdout: string }, calls: string[] }} 실행 함수와 부른 명령
 */
export function fakeRun(rules) {
  const calls = [];
  /**
   * 명령 하나를 흉내 낸다.
   * @param {string} command 명령
   * @param {string[]} args 인자
   * @param {{ allowFailure?: boolean }} [options] 실패 허용
   * @returns {{ status: number, stdout: string }} 결과
   */
  function run(command, args, options = {}) {
    const line = [command, ...args].join(' ');
    calls.push(line);
    const rule = rules.find(([prefix]) => line.startsWith(prefix));
    const found = rule === undefined ? {} : rule[1];
    const result = typeof found === 'function' ? found(line) : found;
    const status = result.status ?? 0;
    if (status !== 0 && options.allowFailure !== true) {
      throw new Error(`${line} 실패`);
    }
    return { status, stdout: result.stdout ?? '' };
  }
  return { run, calls };
}
