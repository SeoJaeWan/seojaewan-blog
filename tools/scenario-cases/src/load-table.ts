import { type BehaviorSource, buildTable, type TableInputs } from './build-table.ts';
import { extractCodocsRefs, readProductSources } from './code-evidence.ts';
import { readCodocsDocs } from './doc-sections.ts';
import { productSourceDirs, REPO_URL, repoRoot } from './paths.ts';
import { readBehaviors } from './read-behaviors.ts';
import type { TableData } from './table-types.ts';

/**
 * 저장소에서 행위 정의, codocs 문서, 제품 코드의 `@codocs` 주석을 읽어 화면 데이터를 만든다.
 * @param options 결과·실행 기록(보고서만), 바뀐 파일, 모드
 * @returns 화면 데이터와 읽은 행위 정의
 */
export async function loadTable(
  options: Pick<TableInputs, 'mode' | 'results' | 'run' | 'history' | 'changes'>,
): Promise<{ table: TableData; behaviors: BehaviorSource[] }> {
  const behaviors = await readBehaviors();
  const table = buildTable(behaviors, {
    ...options,
    docs: readCodocsDocs(repoRoot),
    code: extractCodocsRefs(readProductSources(repoRoot, productSourceDirs)),
    repoUrl: REPO_URL,
    generatedAt: new Date().toISOString(),
  });
  return { table, behaviors };
}
