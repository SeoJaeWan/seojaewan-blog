import type { Locator } from '@playwright/test';
import { describe, expect, it } from 'vitest';

import {
  PARITY_BOX_ATTRIBUTE,
  PARITY_HOVER_ATTRIBUTE,
  pointerTarget,
  resolveParityBox,
} from './story-page.ts';

type FakeLocator = Locator & { selector: string };

/**
 * 속성 하나와 안쪽 찾기만 흉내 내는 Locator를 만든다.
 * @param hover `data-parity-hover` 값. 없으면 null
 * @param selector 이 Locator가 가리키는 선택자(확인용)
 * @returns 가짜 Locator
 */
function fakeLocator(hover: string | null, selector = 'target'): FakeLocator {
  const locator = {
    selector,
    getAttribute: (name: string) => Promise.resolve(name === PARITY_HOVER_ATTRIBUTE ? hover : null),
    locator: (inner: string) => fakeLocator(null, `${selector} >> ${inner}`),
    first() {
      return this;
    },
  };
  return locator as unknown as FakeLocator;
}

// @codocs [[피그마 연동:스토리 규칙]]
describe('스토리 규칙: Hover를 재현할 요소', () => {
  it('대상에 data-parity-hover가 없으면 대상 가운데로 마우스를 옮긴다', async () => {
    const target = fakeLocator(null);
    await expect(pointerTarget(target)).resolves.toBe(target);
  });

  it('대상에 data-parity-hover가 있으면 그 선택자로 찾은 안쪽 요소로 옮긴다', async () => {
    const found = (await pointerTarget(fakeLocator('[data-state]'))) as FakeLocator;
    expect(found.selector).toBe('target >> [data-state]');
  });

  it('data-parity-hover가 비어 있으면 대상 자신으로 옮긴다', async () => {
    const target = fakeLocator(' ');
    await expect(pointerTarget(target)).resolves.toBe(target);
  });
});

/**
 * `data-parity-box` 값과 안쪽 요소 수를 흉내 내는 Locator를 만든다.
 * @param box `data-parity-box` 값. 없으면 null
 * @param count 선택자에 맞는 안쪽 요소 수
 * @returns 가짜 Locator
 */
function fakeBoxLocator(box: string | null, count: number): FakeLocator {
  const inner = { selector: 'inner', count: () => Promise.resolve(count) };
  const locator = {
    selector: 'target',
    getAttribute: (name: string) => Promise.resolve(name === PARITY_BOX_ATTRIBUTE ? box : null),
    locator: () => inner,
  };
  return locator as unknown as FakeLocator;
}

// @codocs [[피그마 연동:캡처 표]]
describe('캡처 표: 캡처 기준 요소', () => {
  it('data-parity-box가 없으면 대상 자신이다', async () => {
    const target = fakeBoxLocator(null, 0);
    await expect(resolveParityBox(target)).resolves.toEqual({ ok: true, target });
  });

  it('data-parity-box가 비어 있으면 대상 자신이다', async () => {
    const target = fakeBoxLocator(' ', 0);
    await expect(resolveParityBox(target)).resolves.toEqual({ ok: true, target });
  });

  it('선택자에 맞는 요소가 하나면 그 요소다', async () => {
    const result = await resolveParityBox(fakeBoxLocator('[data-slot="card"]', 1));
    expect(result.ok && (result.target as FakeLocator).selector).toBe('inner');
  });

  it('선택자에 맞는 요소가 없으면 실패한다', async () => {
    const result = await resolveParityBox(fakeBoxLocator('.none', 0));
    expect(result.ok).toBe(false);
    expect(!result.ok && result.message).toContain('0개');
  });

  it('선택자에 맞는 요소가 여럿이면 실패한다', async () => {
    const result = await resolveParityBox(fakeBoxLocator('.many', 2));
    expect(result.ok).toBe(false);
    expect(!result.ok && result.message).toContain('2개');
  });
});
