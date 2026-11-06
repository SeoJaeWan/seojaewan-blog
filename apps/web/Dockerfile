# @codocs [[배포 환경:배포(CD)]]
# 블로그(Next.js standalone) 이미지. 빌드 문맥은 저장소 루트다(`docker compose build web`).
# 완전 SSG라 글은 빌드할 때 저장소의 글 JSON(apps/web/content)에서 읽고, 실행 때는 만든 페이지만 내준다.
FROM node:24.18.1-bookworm-slim@sha256:235600a8101ab264e117b1768e925532262668dc9b581ef1dd7d96ced463b8e7 AS base
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    NEXT_TELEMETRY_DISABLED=1
# pnpm 버전은 루트 package.json의 packageManager를 따른다
RUN corepack enable

FROM base AS build
WORKDIR /repo
# 의존성은 lockfile만으로 받아 두어, 소스만 바뀐 빌드에서는 이 층을 다시 쓴다
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
RUN pnpm fetch
COPY . .
# 체크아웃의 파일 권한(umask)과 관계없이 실행 계정이 standalone 출력에 담긴 파일을 읽을 수 있게 한다
RUN chmod -R a+rX .
RUN pnpm install --offline --frozen-lockfile --filter "@seojaewan/web..."
# @codocs [[콘텐츠 원천:읽는 곳]]
# 운영 빌드는 저장소에 커밋한 글 JSON을 읽는다
ARG CONTENT_SOURCE=notion
RUN CONTENT_SOURCE="${CONTENT_SOURCE}" pnpm --filter @seojaewan/web build

FROM node:24.18.1-bookworm-slim@sha256:235600a8101ab264e117b1768e925532262668dc9b581ef1dd7d96ced463b8e7
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
# standalone 출력은 모노레포 구조(apps/web/server.js)를 그대로 담는다. 정적 파일과 public은 따로 옮긴다.
# 파일은 root 소유로 두어 실행 계정(node)이 고치지 못하게 한다.
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
# 배포한 버전 기록. 배포 스크립트가 실행 중인 컨테이너의 이 라벨로 이미 배포한 버전을 안다(deploy/deploy-changed.mjs)
ARG APP_VERSION=unknown
ARG REVISION=unknown
LABEL org.opencontainers.image.title="seojaewan-blog-web" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${REVISION}"
CMD ["node", "apps/web/server.js"]
