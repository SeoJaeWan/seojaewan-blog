import { z } from 'zod';

/**
 * 빈 값(`NAME=`)을 적지 않은 것(undefined)으로 바꾸는 스키마를 만든다.
 * @param schema 값의 스키마
 * @returns 빈 값을 거른 스키마
 */
function optional<T extends z.ZodType>(schema: T) {
  return z.preprocess((value) => (value === '' ? undefined : value), schema);
}

/**
 * 이미지 서버가 읽는 환경 변수의 스키마.
 * `NOTION_TOKEN`은 `seojaewan-images` 연동 토큰이고 반드시 있어야 한다.
 * `ALERT_URL`과 `ALERT_SECRET`은 함께 있거나 함께 없어야 한다. 없으면(로컬 개발) 알림을 로그로만 남긴다.
 * @codocs [[배포 환경:환경 변수]]
 * @codocs [[콘텐츠 원천:연동 토큰]]
 * @codocs [[알림 프로세스:환경 변수]]
 */
const envSchema = z
  .object({
    NOTION_TOKEN: z.string().min(1),
    IMAGE_STORE_DIR: optional(z.string().default('/srv/seojaewan-blog/images')),
    HOST: optional(z.string().default('127.0.0.1')),
    PORT: optional(z.coerce.number().int().min(1).max(65535).default(3100)),
    ALERT_URL: optional(z.url({ protocol: /^https?$/u }).optional()),
    ALERT_SECRET: optional(z.string().optional()),
  })
  .refine((value) => (value.ALERT_URL === undefined) === (value.ALERT_SECRET === undefined), {
    message: 'ALERT_URL과 ALERT_SECRET은 함께 있어야 한다',
    path: ['ALERT_SECRET'],
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

/**
 * 프로세스의 환경 변수를 읽어 검증한다. 환경 변수는 이 모듈에서만 읽는다.
 * 시험이 모듈을 불러오기만 해도 검증이 돌지 않게 함수로 둔다.
 * @codocs [[코드 작성 규칙:React와 Next.js]]
 * @returns 검증한 환경 변수
 */
export function loadEnv(): Env {
  return parseEnv(process.env);
}
