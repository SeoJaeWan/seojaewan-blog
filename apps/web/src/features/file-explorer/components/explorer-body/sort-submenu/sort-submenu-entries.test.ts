import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_EXPLORER_VIEW } from '@/shared/utils/workspace-rules/workspace-rules';

import { getSortMenuEntries } from './sort-submenu-entries';

const viewOptions = {
  view: DEFAULT_EXPLORER_VIEW,
  isMobile: false,
  onViewChange: vi.fn(),
  onSortByChange: vi.fn(),
  onSortDirectionChange: vi.fn(),
};

// @codocs [[파일 탐색기:보기와 정렬]]
describe('파일 탐색기:보기와 정렬', () => {
  it('정렬 메뉴에서 내림차순을 고르면 방향을 desc로 바꾼다', () => {
    const handleDirection = vi.fn();
    const [, , direction] = getSortMenuEntries({
      ...viewOptions,
      onSortDirectionChange: handleDirection,
    });
    if (direction?.kind === 'radio-group') {
      direction.onValueChange?.('descending');
    }
    expect(handleDirection).toHaveBeenCalledWith('desc');
  });
});
