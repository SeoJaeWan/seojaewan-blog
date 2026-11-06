import 'server-only';

import { z } from 'zod';

/** 글을 읽는 곳. 운영과 로컬 개발은 Notion, E2E·CI·Storybook은 fixture다 */
export const CONTENT_SOURCES = ['notion', 'fixture'] as const;

/** 글을 읽는 곳 */
export type ContentSource = (typeof CONTENT_SOURCES)[number];

// 빈 값(`NAME=`)은 적지 않은 것으로 본다. 값이 빈 `.env.example`을 그대로 옮겨도 기본값을 쓰게 하기 위해서다.
const optionalValue = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().optional(),
);

/**
 * 블로그가 읽는 환경 변수의 스키마. `CONTENT_SOURCE`가 `notion`(기본)이면 `NOTION_TOKEN`이 있어야 한다.
 * Notion이 안 될 때 fixture로 조용히 바꾸지 않는다.
 * `NOTION_WEBHOOK_SECRET`이 없으면 웹훅 라우트가 모든 갱신 요청을 거절하고, `ALERT_URL`·`ALERT_SECRET`이 없으면 알림을 보내지 않는다.
 * 셋 다 없어도 빌드와 페이지는 돈다(로컬 개발, E2E, CI).
 * @codocs [[배포 환경:환경 변수]]
 * @codocs [[콘텐츠 원천:읽는 곳]]
 * @codocs [[콘텐츠 원천:갱신 방식]]
 * @codocs [[알림 프로세스:환경 변수]]
 */
const envSchema = z
  .object({
    CONTENT_SOURCE: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.enum(CONTENT_SOURCES).default('notion'),
    ),
    NOTION_TOKEN: optionalValue,
    NOTION_WEBHOOK_SECRET: optionalValue,
    ALERT_URL: z.preprocess((value) => (value === '' ? undefined : value), z.url().optional()),
    ALERT_SECRET: optionalValue,
  })
  .refine((value) => value.CONTENT_SOURCE !== 'notion' || value.NOTION_TOKEN !== undefined, {
    message: 'CONTENT_SOURCE가 notion이면 NOTION_TOKEN이 있어야 한다',
    path: ['NOTION_TOKEN'],
  });

/** 검증한 환경 변수 */
export type Env = z.infer<typeof envSchema>;

/**
 * 환경 변수를 검증한다. 맞지 않으면 어느 변수가 왜 틀렸는지 알리는 오류를 던진다(값은 알리지 않는다).
 * @codocs [[코드 작성 규칙:React와 Next.js]]
 * @codocs [[배포 환경:환경 변수]]
 * @param source 환경 변수(`process.env`)
 * @returns 검증한 환경 변수
 */
export function parseEnv(source: Readonly<Record<string, string | undefined>>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    throw new Error(`[env] 환경 변수가 맞지 않다. ${issues}`);
  }
  return result.data;
}

// @codocs [[코드 작성 규칙:React와 Next.js]]
// 환경 변수는 이 모듈에서만 읽고 Zod로 검증한다. 변수가 생기면 스키마에 추가한다.
export const env = parseEnv(process.env);
