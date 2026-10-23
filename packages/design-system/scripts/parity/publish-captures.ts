import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { parityResultsDir } from '../package-paths.ts';
import { capturePublishPlan, CAPTURES_BRANCH } from './parity-captures.ts';
import { CAPTURES_FILE, type CaptureSummary } from './parity-summary.ts';

// CI의 main push에서 실행한다:
//   node scripts/parity/publish-captures.ts --repository <owner/repo> --server <https://github.com> --sha <커밋>
// run-parity.ts --capture가 만든 코드 캡처를 parity-captures 브랜치에 덮어쓴다. 브랜치가 없으면 orphan으로 만든다.
// git push는 gh가 설정한 자격 증명(gh auth setup-git)을 쓴다. 다른 실행이 먼저 올렸으면 받아서 다시 올린다.
const PUSH_ATTEMPTS = 3;

const env = readArgs(process.argv.slice(2));
main();

/**
 * 코드 캡처를 parity-captures 브랜치에 올린다.
 * @codocs [[피그마 일치 검사:CI 비교]]
 */
function main(): void {
  const capturesPath = path.join(parityResultsDir, CAPTURES_FILE);
  if (!existsSync(capturesPath)) {
    console.log('[parity] captures.json이 없어 올리지 않는다.');
    return;
  }
  const captures = JSON.parse(readFileSync(capturesPath, 'utf8')) as CaptureSummary;
  const plan = capturePublishPlan(captures.rows);
  if (plan.files.size === 0) {
    console.log('[parity] 올릴 캡처가 없다.');
    return;
  }
  const remote = `${env.server}/${env.repository}.git`;
  for (let attempt = 1; attempt <= PUSH_ATTEMPTS; attempt += 1) {
    const dir = mkdtempSync(path.join(tmpdir(), 'parity-captures-'));
    try {
      /**
       * 캡처 폴더에서 git을 실행한다.
       * @param args git 인자
       * @returns 성공하면 true
       */
      function git(args: string[]): boolean {
        try {
          execFileSync('git', args, { cwd: dir, stdio: 'inherit' });
          return true;
        } catch {
          return false;
        }
      }
      git(['init', '--quiet', '--initial-branch', 'captures']);
      if (git(['fetch', '--quiet', '--depth', '1', remote, `refs/heads/${CAPTURES_BRANCH}`])) {
        git(['checkout', '--quiet', '-B', 'captures', 'FETCH_HEAD']);
      } else {
        console.log(`[parity] ${CAPTURES_BRANCH} 브랜치가 없어 새로 만든다.`);
      }
      for (const component of plan.replaced) {
        rmSync(path.join(dir, component), { recursive: true, force: true });
      }
      for (const [target, source] of plan.files) {
        mkdirSync(path.dirname(path.join(dir, target)), { recursive: true });
        cpSync(path.join(parityResultsDir, source), path.join(dir, target));
      }
      git(['add', '--all']);
      if (git(['diff', '--cached', '--quiet'])) {
        console.log('[parity] 캡처가 바뀌지 않았다.');
        return;
      }
      git([
        '-c',
        'user.name=github-actions[bot]',
        '-c',
        'user.email=41898282+github-actions[bot]@users.noreply.github.com',
        'commit',
        '--quiet',
        '-m',
        `chore: update parity captures for ${env.sha.slice(0, 7)}`,
      ]);
      if (git(['push', '--quiet', remote, `captures:refs/heads/${CAPTURES_BRANCH}`])) {
        console.log(`[parity] ${CAPTURES_BRANCH}에 캡처 ${String(plan.files.size)}개를 올렸다.`);
        return;
      }
      console.log(
        `[parity] 올리지 못해 다시 받아 올린다(${String(attempt)}/${String(PUSH_ATTEMPTS)}).`,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
  throw new Error(`${CAPTURES_BRANCH}에 캡처를 올리지 못했다.`);
}

/**
 * 명령줄 인자를 읽는다.
 * @param argv 명령줄 인자
 * @returns 저장소, GitHub 주소, 커밋
 */
function readArgs(argv: readonly string[]): { repository: string; server: string; sha: string } {
  /**
   * `--이름 값` 인자를 읽는다. 없으면 실패한다.
   * @param name 인자 이름
   * @returns 값
   */
  function read(name: string): string {
    const index = argv.indexOf(`--${name}`);
    const value = index >= 0 ? argv[index + 1] : undefined;
    if (value === undefined || value === '') {
      throw new Error(`--${name} 인자가 없다.`);
    }
    return value;
  }
  return { repository: read('repository'), server: read('server'), sha: read('sha') };
}
