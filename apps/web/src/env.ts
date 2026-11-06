import 'server-only';

import { z } from 'zod';

/**
 * 글을 읽는 곳. 운영과 로컬 개발은 저장소에 커밋한 글 JSON(운영 Notion을 내보낸 것), E2E·CI·Storybook은 fixture(시험 응답)다
 */
export const CONTENT_SOURCES = ['notion', 'fixture'] as const;

/** 글을 읽는 곳 */
export type ContentSource = (typeof CONTENT_SOURCES)[number];

/**
 * 블로그가 읽는 환경 변수의 스키마. 빌드는 Notion을 부르지 않으므로 Notion 토큰은 받지 않는다(내보내기 스크립트만 쓴다).
 * 빈 값(`NAME=`)은 적지 않은 것으로 본다. 값이 빈 `.env.example`을 그대로 옮겨도 기본값을 쓰게 하기 위해서다.
 * @codocs [[배포 환경:환경 변수]]
 * @codocs [[콘텐츠 원천:읽는 곳]]
 */
const envSchema = z.object({
  CONTENT_SOURCE: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.enum(CONTENT_SOURCES).default('notion'),
  ),
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
