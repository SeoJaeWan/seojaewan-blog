import { describe, expect, it, vi } from 'vitest';

import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';

import { getPowerMenuEntries } from './power-menu-entries';

/**
 * 메뉴 항목의 이름들(구분선은 `-`).
 * @param entries 메뉴 항목
 * @returns 이름
 */
function labels(entries: readonly MenuPopupEntry[]): string[] {
  return entries.map((entry) => ('label' in entry ? entry.label : '-'));
}

// @codocs [[다시 시작:개요]]
describe('다시 시작:개요', () => {
  it('전원 메뉴는 다시 시작 하나다', () => {
    expect(labels(getPowerMenuEntries(vi.fn()))).toEqual(['다시 시작']);
  });
});
