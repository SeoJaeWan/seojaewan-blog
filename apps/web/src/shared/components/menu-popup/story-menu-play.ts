// @codocs [[디자인 시스템:조립]]
// @codocs [[피그마 연동:스토리 규칙]]
// 메뉴 조립(`Menu/*`) 스토리의 `play`가 하위 메뉴 열림을 확인하는 도우미다.
import type { userEvent } from 'storybook/test';
import { expect, screen, waitFor } from 'storybook/test';

/** 눌러 둔 수정 키가 다음 입력까지 이어지는 사용자 입력기 */
type StoryUser = ReturnType<typeof userEvent.setup>;

/**
 * 하위 메뉴 항목에 마우스를 올리면 하위 메뉴가 열리고, 그 항목이 조립 설명의 `@runtime` 줄과 같은지 확인한다.
 * @param user 사용자 입력기
 * @param trigger 하위 메뉴를 여는 항목 이름
 * @param expectedLabels 열린 하위 메뉴의 항목 이름(위에서부터)
 */
export async function expectSubmenuOnHover(
  user: StoryUser,
  trigger: string,
  expectedLabels: readonly string[],
): Promise<void> {
  await user.hover(await screen.findByRole('menuitem', { name: trigger }));
  await waitFor(
    /** 하위 메뉴가 열려 항목이 나타나기를 기다린다. */
    async () => {
      const menus = screen.getAllByRole('menu');
      await expect(menus).toHaveLength(2);
      const items = Array.from(menus[1]?.querySelectorAll('[role^="menuitem"]') ?? []);
      const labels = items.map(
        /**
         * 항목의 이름을 돌려준다.
         * @param item 메뉴 항목 요소
         * @returns 항목 이름
         */
        (item) => item.textContent.trim(),
      );
      await expect(labels).toEqual(expectedLabels);
    },
  );
}
