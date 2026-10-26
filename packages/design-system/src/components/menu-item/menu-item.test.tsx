import { Menu } from '@base-ui/react/menu';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { MenuItem } from './menu-item';

/**
 * 열린 메뉴 안에 항목을 그린다.
 * @param children 메뉴 항목
 */
function renderInMenu(children: ReactNode): void {
  render(
    <Menu.Root open modal={false}>
      <Menu.Portal>
        <Menu.Positioner>
          <Menu.Popup>{children}</Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>,
  );
}

// @codocs [[컴포넌트 목록:기본 컨트롤]]
describe('MenuItem', () => {
  it('기본 항목은 이름을 접근성 이름으로 갖는 menuitem이고, 고르면 onClick을 부른다', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    renderInMenu(<MenuItem label="열기" shortcut="Ctrl+O" onClick={handleClick} />);

    await user.click(screen.getByRole('menuitem', { name: /열기/u }));

    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Ctrl+O')).toBeInTheDocument();
  });

  it('확인 항목은 menuitemcheckbox이고 고르면 켜짐 여부가 바뀐다', async () => {
    const user = userEvent.setup();
    const handleCheckedChange = vi.fn();
    renderInMenu(
      <MenuItem
        kind="checkbox"
        label="숨김 항목"
        defaultChecked
        onCheckedChange={handleCheckedChange}
      />,
    );

    const item = screen.getByRole('menuitemcheckbox', { name: '숨김 항목' });
    expect(item).toHaveAttribute('aria-checked', 'true');
    await user.click(item);
    expect(handleCheckedChange).toHaveBeenCalledWith(false, expect.anything());
  });

  it('라디오 항목은 묶음의 값과 같으면 골라진 menuitemradio다', () => {
    renderInMenu(
      <Menu.RadioGroup defaultValue="name">
        <MenuItem kind="radio" label="이름" value="name" />
        <MenuItem kind="radio" label="날짜" value="date" />
      </Menu.RadioGroup>,
    );

    expect(screen.getByRole('menuitemradio', { name: '이름' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('menuitemradio', { name: '날짜' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('하위 메뉴 항목은 하위 메뉴를 가진 menuitem이다', () => {
    renderInMenu(
      <Menu.SubmenuRoot>
        <MenuItem kind="submenu" label="새로 만들기" />
      </Menu.SubmenuRoot>,
    );

    expect(screen.getByRole('menuitem', { name: '새로 만들기' })).toHaveAttribute(
      'aria-haspopup',
      'menu',
    );
  });

  it('disabled면 골라도 onClick을 부르지 않는다', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    renderInMenu(<MenuItem label="열기" disabled onClick={handleClick} />);

    const item = screen.getByRole('menuitem', { name: '열기' });
    await user.click(item);

    expect(item).toHaveAttribute('aria-disabled', 'true');
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('래스터 자산 아이콘은 이미지로, SVG 아이콘은 svg로 그린다', () => {
    renderInMenu(
      <>
        <MenuItem label="파일 탐색기" icon="images/app-file-explorer" />
        <MenuItem label="열기" icon="icons/ic_fluent_open_20_regular.svg" />
      </>,
    );

    const appItem = screen.getByRole('menuitem', { name: '파일 탐색기' });
    const openItem = screen.getByRole('menuitem', { name: '열기' });
    expect(appItem.querySelector('img')).not.toBeNull();
    expect(openItem.querySelector('svg')).not.toBeNull();
  });

  it('standalone 항목은 메뉴 없이 버튼으로 그리고, 누르면 onClick을 부른다', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(
      <MenuItem
        standalone
        label="열기"
        icon="icons/ic_fluent_open_20_regular.svg"
        onClick={handleClick}
      />,
    );

    await user.click(screen.getByRole('button', { name: '열기' }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
