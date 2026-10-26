import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { readCommentArgs, upsertComments } from './github-comments.ts';
import { MOTION_COMMENT_MARKER, type MotionResult, renderMotionComments } from './motion-report.ts';
import { motionResultsDir } from './paths.ts';

// CI에서 실행한다:
//   node src/motion-post-comment.ts --repository <owner/repo> --server <https://github.com> --run-id <id> --pr <번호>
// 모션 검사 결과(parity-results/motion/<이름>.json)로 견본마다 `키프레임 | 속성 | 피그마 | 코드 | 결과` 표를 PR 댓글로 남긴다.
// 댓글은 숨은 표시(`<!-- motion-check -->`)로 찾아 고친다. 이미지는 없다.

main();

/**
 * 모션 검사 결과로 PR 댓글을 만들거나 고친다.
 * @codocs [[피그마 연동:CI]]
 */
function main(): void {
  const args = readCommentArgs(process.argv.slice(2));
  const results = readResults();
  const bodies = renderMotionComments(
    results,
    `${args.server}/${args.repository}/actions/runs/${args.runId}`,
  );
  upsertComments(args, bodies, MOTION_COMMENT_MARKER);
  console.log(
    `[motion-check] PR 댓글 ${String(bodies.length)}개를 남겼다(견본 ${String(results.length)}개).`,
  );
}

/**
 * 견본마다 남긴 결과를 이름 순으로 읽는다.
 * @returns 견본 결과
 */
function readResults(): MotionResult[] {
  if (!existsSync(motionResultsDir)) {
    return [];
  }
  return readdirSync(motionResultsDir)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map(
      (file) => JSON.parse(readFileSync(path.join(motionResultsDir, file), 'utf8')) as MotionResult,
    );
}
