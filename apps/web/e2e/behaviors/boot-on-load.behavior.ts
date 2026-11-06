import { expect } from '@playwright/test';

import { openFirstHtml, readBootRecord, watchBootScreen } from './app-steps.ts';
import { defineBehavior } from './define-behavior.ts';

// 들어오는 글과 그 창 이름, 본문 첫 문단의 글자다(fixture blog 글).
const POST_PATH = '/posts/react-19-hooks';
const POST_WINDOW = 'React 19 훅 정리 - Chrome';
const POST_TEXT = 'React 19에는 폼과 비동기 상태를 다루는 새 훅이 여럿 들어왔다.';
// 처음 불러올 때 덮는 재부팅 화면의 진행 링 이름이다. 다시 시작의 `다시 시작하는 중`과 구별한다.
const BOOT_SCREEN = { name: '시작하는 중', exact: true } as const;
// 스크립트 없이도 재부팅 화면이 스스로 걷히기까지 기다리는 상한(ms). 안전장치는 4초 뒤 걷히기 시작한다.
const FALLBACK_TIMEOUT = 10_000;

export const behavior = defineBehavior({
  name: '사이트를 처음 불러온다',
  area: '공통',
  summary:
    '재부팅 화면이 덮고 준비되면 걷힘·모바일은 걷힐 때 이미 모바일 모양·스크립트 없이도 걷힘',
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
    script: {
      label: '스크립트',
      values: ['켬', '끔'],
      base: '켬',
    },
    entry: {
      label: '들어오는 방법',
      values: ['주소로 처음 들어옴', '새로고침', '사이트 안에서 이동'],
      base: '주소로 처음 들어옴',
    },
  },
  noCase: {
    address: {
      '없는 글 주소': {
        reason:
          '없는 주소의 404 첫 HTML은 Next.js가 빈 본문으로 보내 재부팅 화면이 가릴 서버 화면이 없고, 화면 전체를 스크립트가 한 번에 그린다',
        docs: ['[[창 동작:새로고침과 첫 진입]]'],
      },
    },
    screen: {
      노트북: {
        reason:
          '노트북은 서버가 그리는 PC와 같은 데스크톱 모양이라 수화한 뒤 바뀌는 모양이 없다. 창 자리는 주소로 들어온다 행위가 본다',
        docs: ['[[반응형:기준]]', '[[창 동작:새로고침과 첫 진입]]'],
      },
    },
  },
  cases: [
    {
      id: 'post-address',
      result: '재부팅 화면이 덮었다가 바로 걷히고 글 창에 포커스',
      scenario: '주소창에 /posts/react-19-hooks를 입력해 처음 들어온다',
      expected: [
        '첫 HTML에 재부팅 화면과 글 제목·본문 글자가 모두 있다',
        '첫 HTML부터 재부팅 화면이 덮고 있다가, 수화한 뒤 걷힌다',
        '걷힐 때 글이 열린 Chrome 창 하나가 이미 떠 있다',
        '걷힌 뒤 포커스가 글 창 안에 있다',
      ],
      docs: [
        '[[창 동작:새로고침과 첫 진입]]',
        '[[SEO와 공유 미리보기:첫 HTML]]',
        '[[접근성:포커스]]',
      ],
      async run({ page, check }) {
        await watchBootScreen(page);
        await page.goto(POST_PATH);
        const firstHtml = await openFirstHtml(page);
        await check('첫 HTML에 재부팅 화면과 글 제목·본문 글자가 모두 있다', async () => {
          await expect(firstHtml.getByRole('progressbar', BOOT_SCREEN)).toBeAttached();
          const firstWindow = firstHtml.getByRole('region', { name: POST_WINDOW });
          await expect(
            firstWindow.getByRole('heading', { level: 1, name: 'React 19 훅 정리' }),
          ).toBeAttached();
          await expect(firstWindow.getByText(POST_TEXT)).toBeAttached();
        });
        await firstHtml.context().close();

        const record = await readBootRecord(page);
        await check('첫 HTML부터 재부팅 화면이 덮고 있다가, 수화한 뒤 걷힌다', () => {
          expect(record.isShownFromFirstHtml).toBe(true);
          expect(record.revealedScreen).not.toBeNull();
        });
        await check('걷힐 때 글이 열린 Chrome 창 하나가 이미 떠 있다', () => {
          expect(record.revealedScreen?.windows).toEqual([POST_WINDOW]);
          expect(record.revealedScreen?.entryWindowCount).toBe(0);
        });
        await check('걷힌 뒤 포커스가 글 창 안에 있다', async () => {
          await expect
            .poll(() =>
              page
                .getByRole('region', { name: POST_WINDOW })
                .evaluate((region) => region.contains(document.activeElement)),
            )
            .toBe(true);
        });
      },
    },
    {
      id: 'mobile',
      result: '걷힐 때 이미 탭 표시줄 없는 전체화면 창',
      change: { screen: '모바일' },
      device: 'Pixel 7',
      scenario: '모바일에서 공유 링크 /posts/react-19-hooks로 처음 들어온다',
      expected: [
        '첫 HTML부터 재부팅 화면이 덮고 있다가, 수화한 뒤 걷힌다',
        '걷힐 때 창이 이미 탭 표시줄 없이 화면 전체 너비(412)를 채운다',
        '걷힐 때 작업 표시줄의 Chrome이 이미 실행 중으로 보인다',
      ],
      docs: ['[[창 동작:새로고침과 첫 진입]]', '[[창 동작:모바일]]', '[[작업 표시줄:앱 버튼]]'],
      async run({ page, check }) {
        await watchBootScreen(page);
        await page.goto(POST_PATH);
        const record = await readBootRecord(page);
        await check('첫 HTML부터 재부팅 화면이 덮고 있다가, 수화한 뒤 걷힌다', () => {
          expect(record.isShownFromFirstHtml).toBe(true);
          expect(record.revealedScreen).not.toBeNull();
        });
        await check('걷힐 때 창이 이미 탭 표시줄 없이 화면 전체 너비(412)를 채운다', () => {
          expect(record.revealedScreen?.windows).toEqual([POST_WINDOW]);
          expect(record.revealedScreen?.windowWidths).toEqual([412]);
          expect(record.revealedScreen?.tabCount).toBe(0);
        });
        await check('걷힐 때 작업 표시줄의 Chrome이 이미 실행 중으로 보인다', () => {
          expect(record.revealedScreen?.chromeIndicator).not.toBe('none');
          expect(record.revealedScreen?.chromeIndicator).not.toBeNull();
        });
      },
    },
    {
      id: 'no-script',
      result: '몇 초 뒤 스스로 걷혀 글을 누를 수 있음',
      change: { script: '끔' },
      scenario: '스크립트를 끈 브라우저로 /posts/react-19-hooks에 들어와 기다린다',
      expected: ['몇 초 뒤 재부팅 화면이 걷힌다', '걷힌 뒤 글 제목을 가리는 것이 없다'],
      docs: ['[[창 동작:새로고침과 첫 진입]]', '[[SEO와 공유 미리보기:첫 HTML]]'],
      async run({ page, check }) {
        await page.goto(POST_PATH);
        const firstHtml = await openFirstHtml(page);
        await check('몇 초 뒤 재부팅 화면이 걷힌다', async () => {
          await expect(firstHtml.getByRole('progressbar', BOOT_SCREEN)).toBeAttached();
          await expect(firstHtml.getByRole('progressbar', BOOT_SCREEN)).toBeHidden({
            timeout: FALLBACK_TIMEOUT,
          });
        });
        await check('걷힌 뒤 글 제목을 가리는 것이 없다', async () => {
          // trial 클릭은 누르지 않고, 그 자리에서 맨 위에 있는 요소가 제목인지(가리는 것이 없는지)까지 확인한다.
          await firstHtml
            .getByRole('region', { name: POST_WINDOW })
            .getByRole('heading', { level: 1, name: 'React 19 훅 정리' })
            .click({ trial: true });
        });
        await firstHtml.context().close();
      },
    },
    {
      id: 'home',
      result: '걷힌 뒤 바탕화면에 포커스',
      change: { address: '/' },
      scenario: '주소 /로 처음 들어온다',
      expected: [
        '첫 HTML부터 재부팅 화면이 덮고 있다가, 수화한 뒤 걷힌다',
        '걷힐 때 열린 창이 없다',
        '걷힌 뒤 포커스가 바탕화면에 있다',
      ],
      docs: ['[[창 동작:새로고침과 첫 진입]]', '[[접근성:포커스]]'],
      async run({ page, check }) {
        await watchBootScreen(page);
        await page.goto('/');
        const record = await readBootRecord(page);
        await check('첫 HTML부터 재부팅 화면이 덮고 있다가, 수화한 뒤 걷힌다', () => {
          expect(record.isShownFromFirstHtml).toBe(true);
          expect(record.revealedScreen).not.toBeNull();
        });
        await check('걷힐 때 열린 창이 없다', () => {
          expect(record.revealedScreen?.windows).toEqual([]);
        });
        await check('걷힌 뒤 포커스가 바탕화면에 있다', async () => {
          await expect(page.getByRole('main', { name: '바탕화면' })).toBeFocused();
        });
      },
    },
    {
      id: 'reload',
      result: '새로고침해도 다시 덮었다가 걷힘',
      change: { entry: '새로고침' },
      scenario: '/posts/react-19-hooks로 들어온 뒤 페이지를 새로고침한다',
      expected: [
        '새로고침한 첫 HTML부터 재부팅 화면이 덮고 있다가, 수화한 뒤 걷힌다',
        '걷힐 때 글이 열린 Chrome 창 하나가 이미 떠 있다',
      ],
      docs: ['[[창 동작:새로고침과 첫 진입]]'],
      async run({ page, check }) {
        await watchBootScreen(page);
        await page.goto(POST_PATH);
        await readBootRecord(page);
        await page.reload();
        const record = await readBootRecord(page);
        await check('새로고침한 첫 HTML부터 재부팅 화면이 덮고 있다가, 수화한 뒤 걷힌다', () => {
          expect(record.isShownFromFirstHtml).toBe(true);
          expect(record.revealedScreen).not.toBeNull();
        });
        await check('걷힐 때 글이 열린 Chrome 창 하나가 이미 떠 있다', () => {
          expect(record.revealedScreen?.windows).toEqual([POST_WINDOW]);
        });
      },
    },
    {
      id: 'in-site-navigation',
      result: '다른 글을 열어도 재부팅 화면이 나오지 않음',
      change: { entry: '사이트 안에서 이동' },
      scenario:
        '주소 /로 들어와 재부팅 화면이 걷힌 뒤, 작업 표시줄 검색칸에 app router를 입력하고 Enter를 눌러 글을 연다',
      expected: ['글이 열리고 주소가 그 글 주소로 바뀐다', '재부팅 화면이 다시 나오지 않는다'],
      docs: ['[[창 동작:새로고침과 첫 진입]]', '[[창 동작:브라우저 주소]]'],
      async run({ page, check }) {
        await watchBootScreen(page);
        await page.goto('/');
        await readBootRecord(page);

        const searchBox = page.getByRole('searchbox', { name: '검색', exact: true });
        await searchBox.fill('app router');
        await expect(
          page.getByRole('dialog', { name: '검색' }).getByText('최고 일치'),
        ).toBeVisible();
        await searchBox.press('Enter');

        await check('글이 열리고 주소가 그 글 주소로 바뀐다', async () => {
          await expect(
            page.getByRole('region', { name: 'Next.js App Router 캐시 - Chrome' }),
          ).toBeVisible();
          await expect(page).toHaveURL(/\/posts\/nextjs-app-router-cache$/);
        });
        await check('재부팅 화면이 다시 나오지 않는다', async () => {
          const record = await readBootRecord(page);
          expect(record.laterShownCount).toBe(0);
        });
      },
    },
  ],
});
