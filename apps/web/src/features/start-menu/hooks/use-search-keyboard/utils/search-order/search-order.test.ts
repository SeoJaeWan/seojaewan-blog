import { describe, expect, it } from 'vitest';

import { createInitialWorkspace } from '@/shared/utils/workspace-rules/workspace-rules';
import { testCatalog } from '@/shared/utils/workspace-rules/workspace-rules.fixture';

import { getSearchOrderIds } from './search-order';

const workspace = createInitialWorkspace(testCatalog);

// @codocs [[검색:결과 화면]]
describe('검색:결과 화면', () => {
  it('최고 일치를 맨 앞에 두고 나머지를 폴더, 글, 외부 링크 차례로 늘어놓는다', () => {
    expect(getSearchOrderIds(workspace, 'React')).toEqual(['folder:React', 'post:react-19-hooks']);
  });

  it('결과가 없으면 빈 목록이다', () => {
    expect(getSearchOrderIds(workspace, '없는 이름')).toEqual([]);
  });
});
