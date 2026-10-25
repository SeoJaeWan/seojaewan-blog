import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { StartBody } from './start-body';
import { START_LETTER_GROUPS, START_PINNED } from './story-data';

// jsdom에는 scrollIntoView가 없어 가짜로 넣고, 어느 묶음으로 옮겼는지 본다.
const scrollIntoView = vi.fn<(this: Element, options?: ScrollIntoViewOptions) => void>();

/**
 * 열린 글자 격자를 찾는다.
 * @returns 글자 격자
 */
function getJumpList(): HTMLElement {
  return screen.getByRole('group', { name: '글자로 이동' });
}

/**
 * 간단히 보기의 Start 본문을 그린다.
 * @returns render 결과
 */
function renderListBody(): ReturnType<typeof render> {
  return render(
    <StartBody view="list" pinned={START_PINNED} groups={START_LETTER_GROUPS} className="h-569" />,
  );
}

// @codocs [[Start 메뉴:모두]]
describe('Start 메뉴:모두', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = scrollIntoView;
  });

  afterEach(() => {
    scrollIntoView.mockReset();
  });

  it('글자 머리글을 누르면 글자 격자가 열리고 "모두" 제목 줄에 "뒤로" 버튼이 나온다', async () => {
    renderListBody();
    expect(screen.queryByRole('button', { name: '뒤로' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'C' }));
    expect(screen.getByRole('button', { name: '뒤로' })).toBeInTheDocument();
    expect(within(getJumpList()).getByRole('button', { name: 'ㄱ' })).toBeInTheDocument();
  });

  it('항목이 없는 글자는 누를 수 없다', async () => {
    renderListBody();
    await userEvent.click(screen.getByRole('button', { name: 'C' }));
    expect(within(getJumpList()).getByRole('button', { name: 'A' })).toBeDisabled();
    expect(within(getJumpList()).getByRole('button', { name: 'R' })).toBeEnabled();
  });

  it('글자를 고르면 격자가 닫히고 목록이 그 글자 묶음으로 이동한다', async () => {
    renderListBody();
    await userEvent.click(screen.getByRole('button', { name: 'C' }));
    await userEvent.click(within(getJumpList()).getByRole('button', { name: 'ㄹ' }));
    expect(screen.queryByRole('group', { name: '글자로 이동' })).not.toBeInTheDocument();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toHaveAttribute('data-letter-group', 'ㄹ');
    expect(screen.getByRole('button', { name: 'ㄹ' })).toHaveFocus();
  });

  it('"뒤로"를 누르면 목록을 옮기지 않고 격자를 닫는다', async () => {
    renderListBody();
    await userEvent.click(screen.getByRole('button', { name: 'G' }));
    await userEvent.click(screen.getByRole('button', { name: '뒤로' }));
    expect(screen.queryByRole('group', { name: '글자로 이동' })).not.toBeInTheDocument();
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'G' })).toHaveFocus();
  });

  it('범주 보기의 머리글은 종류 이름이라 누를 수 없다', () => {
    render(
      <StartBody
        view="category"
        pinned={START_PINNED}
        groups={[{ label: '앱', items: [{ kind: 'app', app: 'chrome', title: 'Chrome' }] }]}
      />,
    );
    expect(screen.queryByRole('button', { name: '앱' })).not.toBeInTheDocument();
  });
});
