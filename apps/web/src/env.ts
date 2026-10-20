import { z } from 'zod';

// @codocs [[코드 작성 규칙:React와 Next.js]]
// 환경 변수는 이 모듈에서만 읽고 Zod로 검증한다. 변수가 생기면 스키마에 추가한다.
const envSchema = z.object({});

export const env = envSchema.parse(process.env);
