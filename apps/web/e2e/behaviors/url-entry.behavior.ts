import { expect } from '@playwright/test';

import { openFirstHtml, waitForEntryWindowHandOver } from './app-steps.ts';
import { defineBehavior } from './define-behavior.ts';

// 들어오는 글과 그 창 이름, 본문 첫 문단의 글자다(fixture blog 글).
const POST_PATH = '/posts/react-19-hooks';
const POST_WINDOW = 'React 19 훅 정리 - Chrome';
const POST_TEXT = 'React 19에는 폼과 비동기 상태를 다루는 새 훅이 여럿 들어왔다.';

export const behavior = defineBehavior({
  name: '주소로 들어온다',
  area: 'Chrome',
  summary: '첫 HTML에 글·수화 뒤 창 자리 그대로·없는 주소는 404·모바일 전체 너비',
  conditions: {
    address: {
      label: '주소',
      values: ['글 주소', '없는 글 주소', '/'],
      base: '글 주소',
    },
    screen: {
      label: '화면 크기',
      values: ['PC', '노트북', '모바일'],
      base: 'PC',
    },
  },
  cases: [
    {
      id: 'post-address',
      result: '첫 HTML부터 글이 열린 Chrome 창 하나',
      scenario: '주소창에 /posts/react-19-hooks를 입력해 처음 들어온다',
      expected: [
        '첫 HTML(스크립트 없이 그린 화면)에 Chrome 창과 글 제목·본문 글자가 있다',
        'React 19 훅 정리 글이 Chrome 창에 열린다',
        'Chrome 창이 하나만 열려 있다',
        '수화한 뒤에도 창 자리가 첫 HTML과 같다',
        '주소가 들어온 글 주소 그대로다',
      ],
      docs: [
        '[[SEO와 공유 미리보기:첫 HTML]]',
        '[[창 동작:새로고침과 첫 진입]]',
        '[[Chrome:글 화면]]',
      ],
      async run({ page, check }) {
        await page.goto(POST_PATH);
        const firstHtml = await openFirstHtml(page);
        const firstWindow = firstHtml.getByRole('region', { name: POST_WINDOW });
        await check(
          '첫 HTML(스크립트 없이 그린 화면)에 Chrome 창과 글 제목·본문 글자가 있다',
          async () => {
            await expect(firstWindow).toBeVisible();
            await expect(
              firstWindow.getByRole('heading', { level: 1, name: 'React 19 훅 정리' }),
            ).toBeVisible();
            await expect(
              firstWindow.getByRole('heading', { name: 'useActionState' }),
            ).toBeVisible();
            await expect(firstWindow.getByText(POST_TEXT)).toBeVisible();
          },
        );
        const post = page.getByRole('region', { name: POST_WINDOW });
        await check('React 19 훅 정리 글이 Chrome 창에 열린다', async () => {
          await expect(post).toBeVisible();
          await expect(
            post.getByRole('heading', { level: 1, name: 'React 19 훅 정리' }),
          ).toBeVisible();
          await expect(post.getByRole('heading', { name: 'useActionState' })).toBeVisible();
        });
        await check('Chrome 창이 하나만 열려 있다', async () => {
          await expect(page.getByRole('region', { name: /- Chrome$/ })).toHaveCount(1);
        });
        await check('수화한 뒤에도 창 자리가 첫 HTML과 같다', async () => {
          await waitForEntryWindowHandOver(page);
          expect(await post.boundingBox()).toEqual(await firstWindow.boundingBox());
        });
        await firstHtml.context().close();
        await check('주소가 들어온 글 주소 그대로다', async () => {
          await expect(page).toHaveURL(/\/posts\/react-19-hooks$/);
        });
      },
    },
    {
      id: 'missing-post',
      result: '404와 찾을 수 없음 창',
      change: { address: '없는 글 주소' },
      scenario: '주소창에 없는 글 주소 /posts/none을 입력해 처음 들어온다',
      expected: [
        '404로 응답한다',
        '페이지를 찾을 수 없음 Chrome 창이 열리고 안내 문구가 보인다',
        '주소가 들어온 경로 그대로다',
      ],
      docs: ['[[창 동작:새로고침과 첫 진입]]', '[[창 동작:브라우저 주소]]'],
      async run({ page, check }) {
        const response = await page.goto('/posts/none');
        await check('404로 응답한다', async () => {
          await expect.poll(() => response?.status()).toBe(404);
        });
        await check('페이지를 찾을 수 없음 Chrome 창이 열리고 안내 문구가 보인다', async () => {
          await expect(
            page.getByRole('region', { name: '페이지를 찾을 수 없음 - Chrome' }),
          ).toBeVisible();
          await expect(
            page.getByText(
              '다음 웹 주소에 대한 웹페이지를 찾을 수 없습니다: seojaewan.com/posts/none',
            ),
          ).toBeVisible();
        });
        await check('주소가 들어온 경로 그대로다', async () => {
          await expect(page).toHaveURL(/\/posts\/none$/);
        });
      },
    },
    {
      id: 'laptop',
      result: '첫 HTML부터 노트북 기본 크기로 가운데',
      change: { screen: '노트북' },
      scenario: '노트북 크기 화면(1500×850)에서 /posts/react-19-hooks로 처음 들어온다',
      expected: [
        '첫 HTML의 Chrome 창이 노트북 기본 크기(1120×640)로 작업 영역 가운데에 있다',
        '수화한 뒤에도 창 자리가 첫 HTML과 같다',
      ],
      docs: ['[[SEO와 공유 미리보기:첫 HTML]]', '[[창 동작:창 조작]]'],
      async run({ page, check }) {
        await page.setViewportSize({ width: 1500, height: 850 });
        await page.goto(POST_PATH);
        const firstHtml = await openFirstHtml(page);
        const firstWindow = firstHtml.getByRole('region', { name: POST_WINDOW });
        await check(
          '첫 HTML의 Chrome 창이 노트북 기본 크기(1120×640)로 작업 영역 가운데에 있다',
          async () => {
            // 작업 영역은 화면에서 작업 표시줄(48)을 뺀 1500×802다.
            expect(await firstWindow.boundingBox()).toEqual({
              x: 190,
              y: 81,
              width: 1120,
              height: 640,
            });
          },
        );
        await check('수화한 뒤에도 창 자리가 첫 HTML과 같다', async () => {
          await waitForEntryWindowHandOver(page);
          expect(await page.getByRole('region', { name: POST_WINDOW }).boundingBox()).toEqual(
            await firstWindow.boundingBox(),
          );
        });
        await firstHtml.context().close();
      },
    },
    {
      id: 'mobile',
      result: '탭 표시줄 없이 전체 너비',
      change: { screen: '모바일' },
      device: 'Pixel 7',
      scenario: '모바일에서 공유 링크 /posts/react-19-hooks로 처음 들어온다',
      expected: [
        '글이 열린 Chrome 창 하나만 뜬다',
        '창이 화면 전체 너비(412)를 채운다',
        '첫 HTML의 창도 수화한 뒤와 같은 전체화면 자리다',
        '탭 표시줄이 없다',
        '주소가 들어온 글 주소 그대로다',
      ],
      docs: [
        '[[창 동작:모바일]]',
        '[[창 동작:새로고침과 첫 진입]]',
        '[[SEO와 공유 미리보기:첫 HTML]]',
      ],
      async run({ page, check }) {
        await page.goto(POST_PATH);
        const chrome = page.getByRole('region', { name: POST_WINDOW });
        await check('글이 열린 Chrome 창 하나만 뜬다', async () => {
          await expect(chrome).toBeVisible();
          await expect(page.getByRole('region', { name: /- Chrome$/ })).toHaveCount(1);
        });
        await check('창이 화면 전체 너비(412)를 채운다', async () => {
          await expect.poll(async () => (await chrome.boundingBox())?.width).toBe(412);
        });
        await check('첫 HTML의 창도 수화한 뒤와 같은 전체화면 자리다', async () => {
          await waitForEntryWindowHandOver(page);
          const firstHtml = await openFirstHtml(page, 'Pixel 7');
          expect(await firstHtml.getByRole('region', { name: POST_WINDOW }).boundingBox()).toEqual(
            await chrome.boundingBox(),
          );
          await firstHtml.context().close();
        });
        await check('탭 표시줄이 없다', async () => {
          await expect(chrome.getByRole('tab')).toHaveCount(0);
        });
        await check('주소가 들어온 글 주소 그대로다', async () => {
          await expect(page).toHaveURL(/\/posts\/react-19-hooks$/);
        });
      },
    },
  ],
});
