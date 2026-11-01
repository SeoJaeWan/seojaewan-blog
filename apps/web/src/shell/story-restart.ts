import { userEvent, within } from 'storybook/test';

/**
 * 스토리 `play`에서 Start 메뉴를 열고 전원 메뉴의 `다시 시작`을 고른다.
 * @param body 스토리가 그려진 문서의 body(메뉴는 body에 그려진다)
 * @codocs [[테스트 작성 규칙:스토리 테스트]]
 */
export async function chooseRestartInStory(body: HTMLElement): Promise<void> {
  const queries = within(body);
  await userEvent.click(queries.getByRole('button', { name: '시작' }));
  const startPanel = await queries.findByRole('dialog', { name: '시작' });
  await userEvent.click(within(startPanel).getByRole('button', { name: '전원' }));
  await userEvent.click(await queries.findByRole('menuitem', { name: '다시 시작' }));
}
