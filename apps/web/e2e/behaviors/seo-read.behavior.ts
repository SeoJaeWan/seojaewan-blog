import { expect, type Page } from '@playwright/test';

import { openFirstHtml } from './app-steps.ts';
import { type CaseContext, defineBehavior } from './define-behavior.ts';

// 사이트 주소와 기본 공유 그림의 전체 주소다.
const SITE = 'https://seojaewan.com';
const DEFAULT_IMAGE = `${SITE}/og-default.png`;
// 커버의 공유 그림은 이미지 서버 주소의 큰 폭이다. fixture 모드도 본문 커버(시험 PNG)와 달리 이미지 서버 주소를 그대로 쓴다.
const COVER_IMAGE =
  /^https:\/\/images\.seojaewan\.com\/notion\/cover\/[0-9a-f-]+\/[0-9a-f]{12}\?w=1440$/u;

export const behavior = defineBehavior({
  name: '검색 엔진과 공유 봇이 주소를 읽는다',
  area: '공통',
  summary: '첫 HTML의 제목·설명·canonical·공유 그림·sitemap·robots',
  conditions: {
    address: {
      label: '읽는 주소',
      values: [
        'Summary와 커버가 있는 글 주소',
        'Summary와 커버가 없는 글 주소',
        'Project 주소',
        'About 주소',
        '/',
        '/sitemap.xml',
        '/robots.txt',
      ],
      base: 'Summary와 커버가 있는 글 주소',
    },
  },
  cases: [
    {
      id: 'post-with-summary',
      result: 'Summary 설명과 커버 공유 그림',
      scenario: 'Summary와 커버가 있는 글 /posts/notion-blog-migration의 첫 HTML을 읽는다',
      expected: [
        '제목이 글 제목 | seojaewan이다',
        '설명이 Notion Summary다',
        'canonical이 글 주소다',
        '공유 그림이 커버의 ?w=1440 전체 주소다',
      ],
      docs: ['[[SEO와 공유 미리보기:메타 정보]]', '[[SEO와 공유 미리보기:공유 미리보기 이미지]]'],
      async run({ page, check }) {
        const head = await openHead(page, '/posts/notion-blog-migration');
        await check('제목이 글 제목 | seojaewan이다', async () => {
          await expect(head).toHaveTitle('Notion 블로그 이전기 | seojaewan');
          await expect(meta(head, 'property', 'og:title')).toHaveAttribute(
            'content',
            'Notion 블로그 이전기',
          );
        });
        await check('설명이 Notion Summary다', async () => {
          await expectDescription(head, 'Notion에서 쓰고 바뀐 글만 다시 만드는 블로그로 옮긴 기록');
        });
        await check('canonical이 글 주소다', async () => {
          await expectCanonical(head, `${SITE}/posts/notion-blog-migration`);
        });
        await check('공유 그림이 커버의 ?w=1440 전체 주소다', async () => {
          await expectShareImage(head, COVER_IMAGE);
        });
        await head.context().close();
      },
    },
    {
      id: 'post-without-summary',
      result: '사이트 소개 설명과 기본 공유 그림',
      change: { address: 'Summary와 커버가 없는 글 주소' },
      scenario: 'Summary와 커버가 없는 글 /posts/react-19-hooks의 첫 HTML을 읽는다',
      expected: [
        '제목이 글 제목 | seojaewan이다',
        '설명이 사이트 소개 한 줄이다',
        '공유 그림이 기본 그림이다',
      ],
      docs: ['[[SEO와 공유 미리보기:메타 정보]]', '[[SEO와 공유 미리보기:공유 미리보기 이미지]]'],
      async run({ page, check }) {
        const head = await openHead(page, '/posts/react-19-hooks');
        await check('제목이 글 제목 | seojaewan이다', async () => {
          await expect(head).toHaveTitle('React 19 훅 정리 | seojaewan');
        });
        await check('설명이 사이트 소개 한 줄이다', async () => {
          await expectDescription(head, '서재완의 기술 블로그입니다.');
        });
        await check('공유 그림이 기본 그림이다', async () => {
          await expectShareImage(head, DEFAULT_IMAGE);
        });
        await head.context().close();
      },
    },
    {
      id: 'project',
      result: 'Project 경로 canonical과 커버 공유 그림',
      change: { address: 'Project 주소' },
      scenario: 'Project 항목 /projects/fixture-project의 첫 HTML을 읽는다',
      expected: [
        '제목이 항목 제목 | seojaewan이다',
        'canonical이 /projects/<slug>다',
        '공유 그림이 커버의 ?w=1440 전체 주소다',
      ],
      docs: ['[[SEO와 공유 미리보기:메타 정보]]', '[[SEO와 공유 미리보기:공유 미리보기 이미지]]'],
      async run({ page, check }) {
        const head = await openHead(page, '/projects/fixture-project');
        await check('제목이 항목 제목 | seojaewan이다', async () => {
          await expect(head).toHaveTitle('시험 프로젝트 | seojaewan');
        });
        await check('canonical이 /projects/<slug>다', async () => {
          await expectCanonical(head, `${SITE}/projects/fixture-project`);
        });
        await check('공유 그림이 커버의 ?w=1440 전체 주소다', async () => {
          await expectShareImage(head, COVER_IMAGE);
        });
        await head.context().close();
      },
    },
    {
      id: 'about',
      result: 'About 경로 canonical과 기본 공유 그림',
      change: { address: 'About 주소' },
      scenario: 'About 항목 /about/fixture-about의 첫 HTML을 읽는다',
      expected: [
        '제목이 항목 제목 | seojaewan이다',
        'canonical이 /about/<slug>다',
        '설명이 사이트 소개 한 줄이다',
        '공유 그림이 기본 그림이다',
      ],
      docs: ['[[SEO와 공유 미리보기:메타 정보]]', '[[SEO와 공유 미리보기:공유 미리보기 이미지]]'],
      async run({ page, check }) {
        const head = await openHead(page, '/about/fixture-about');
        await check('제목이 항목 제목 | seojaewan이다', async () => {
          await expect(head).toHaveTitle('시험 소개 | seojaewan');
        });
        await check('canonical이 /about/<slug>다', async () => {
          await expectCanonical(head, `${SITE}/about/fixture-about`);
        });
        await check('설명이 사이트 소개 한 줄이다', async () => {
          await expectDescription(head, '서재완의 기술 블로그입니다.');
        });
        await check('공유 그림이 기본 그림이다', async () => {
          await expectShareImage(head, DEFAULT_IMAGE);
        });
        await head.context().close();
      },
    },
    {
      id: 'home',
      result: 'seojaewan 제목, 사이트 소개, 기본 공유 그림',
      change: { address: '/' },
      scenario: '첫 화면 /의 첫 HTML을 읽는다',
      expected: [
        '제목이 seojaewan이다',
        '설명이 사이트 소개 한 줄이다',
        'canonical이 사이트 주소다',
        '공유 그림이 기본 그림이고 PNG로 받아진다',
      ],
      docs: ['[[SEO와 공유 미리보기:메타 정보]]', '[[SEO와 공유 미리보기:공유 미리보기 이미지]]'],
      async run({ page, check }) {
        const head = await openHead(page, '/');
        await check('제목이 seojaewan이다', async () => {
          await expect(head).toHaveTitle('seojaewan');
        });
        await check('설명이 사이트 소개 한 줄이다', async () => {
          await expectDescription(head, '서재완의 기술 블로그입니다.');
        });
        await check('canonical이 사이트 주소다', async () => {
          await expectCanonical(head, SITE);
        });
        await check('공유 그림이 기본 그림이고 PNG로 받아진다', async () => {
          await expectShareImage(head, DEFAULT_IMAGE);
          const image = await page.request.get('/og-default.png');
          expect(image.status()).toBe(200);
          expect(image.headers()['content-type']).toBe('image/png');
        });
        await head.context().close();
      },
    },
    {
      id: 'sitemap',
      result: '첫 화면과 세 묶음의 공개 항목',
      change: { address: '/sitemap.xml' },
      scenario: '/sitemap.xml을 읽는다',
      expected: [
        '첫 화면과 세 묶음의 공개 항목 주소가 있다',
        '항목마다 Notion을 고친 시각이 lastmod로 있다',
        '공개하지 않은 항목은 없다',
      ],
      docs: ['[[SEO와 공유 미리보기:sitemap과 robots]]', '[[콘텐츠 원천:공개 여부]]'],
      async run({ page, check }) {
        const response = await page.request.get('/sitemap.xml');
        expect(response.status()).toBe(200);
        const sitemap = await response.text();
        await check('첫 화면과 세 묶음의 공개 항목 주소가 있다', () => {
          for (const path of [
            '/',
            '/posts/notion-blog-migration',
            '/posts/react-19-hooks',
            '/projects/fixture-project',
            '/about/fixture-about',
          ]) {
            expect(sitemap).toContain(`<loc>${SITE}${path}</loc>`);
          }
        });
        await check('항목마다 Notion을 고친 시각이 lastmod로 있다', () => {
          expect(sitemap).toContain(
            `<loc>${SITE}/posts/react-19-hooks</loc>\n<lastmod>2026-11-06T02:33:00.000Z</lastmod>`,
          );
          expect(sitemap.match(/<lastmod>/gu)?.length).toBe(sitemap.match(/<loc>/gu)?.length);
        });
        await check('공개하지 않은 항목은 없다', () => {
          expect(sitemap).not.toContain('hidden-project');
          expect(sitemap).not.toContain('hidden-about');
        });
      },
    },
    {
      id: 'robots',
      result: '모두 허용, /api/ 막음, sitemap 주소',
      change: { address: '/robots.txt' },
      scenario: '/robots.txt를 읽는다',
      expected: ['모두 허용하고 /api/만 막는다', 'sitemap 주소를 알린다'],
      docs: ['[[SEO와 공유 미리보기:sitemap과 robots]]'],
      async run({ page, check }) {
        const response = await page.request.get('/robots.txt');
        expect(response.status()).toBe(200);
        const robots = await response.text();
        await check('모두 허용하고 /api/만 막는다', () => {
          expect(robots).toContain('User-Agent: *\nAllow: /\nDisallow: /api/');
        });
        await check('sitemap 주소를 알린다', () => {
          expect(robots).toContain(`Sitemap: ${SITE}/sitemap.xml`);
        });
      },
    },
  ],
});

/**
 * 주소로 들어온 뒤 스크립트 없이 그 주소의 첫 HTML을 연다. 검색 엔진과 공유 봇이 읽는 것과 같다.
 * @param page 화면
 * @param path 읽을 주소
 * @returns 첫 HTML 화면. 다 보면 그 context를 닫는다
 */
async function openHead(page: CaseContext['page'], path: string): Promise<Page> {
  const response = await page.goto(path);
  expect(response?.status()).toBe(200);
  return openFirstHtml(page);
}

/**
 * `<head>`의 메타 태그 하나.
 * @param head 첫 HTML 화면
 * @param attribute 이름 속성(`name`이나 `property`)
 * @param value 이름
 * @returns 메타 태그
 */
function meta(
  head: Page,
  attribute: 'name' | 'property',
  value: string,
): ReturnType<Page['locator']> {
  return head.locator(`head > meta[${attribute}="${value}"]`);
}

/**
 * 설명(description, og:description)이 기대한 글자인지 본다.
 * @param head 첫 HTML 화면
 * @param description 기대한 설명
 */
async function expectDescription(head: Page, description: string): Promise<void> {
  await expect(meta(head, 'name', 'description')).toHaveAttribute('content', description);
  await expect(meta(head, 'property', 'og:description')).toHaveAttribute('content', description);
}

/**
 * canonical 주소를 본다.
 * @param head 첫 HTML 화면
 * @param url 기대한 주소
 */
async function expectCanonical(head: Page, url: string): Promise<void> {
  await expect(head.locator('head > link[rel="canonical"]')).toHaveAttribute('href', url);
  await expect(meta(head, 'property', 'og:url')).toHaveAttribute('content', url);
}

/**
 * 공유 그림(og:image, twitter:image)을 본다.
 * @param head 첫 HTML 화면
 * @param url 기대한 그림 주소
 */
async function expectShareImage(head: Page, url: string | RegExp): Promise<void> {
  await expect(meta(head, 'property', 'og:image')).toHaveAttribute('content', url);
  await expect(meta(head, 'name', 'twitter:image')).toHaveAttribute('content', url);
}
