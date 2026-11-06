# @codocs [[배포 환경:배포(CD)]]
# 이미지 서버 이미지. 빌드 문맥은 저장소 루트다(`docker compose build images`).
# 빌드 단계 없이 Node 24가 src/main.ts를 바로 실행한다. sharp는 이 플랫폼(linux x64, glibc)용 바이너리를 lockfile에서 받는다.
FROM node:24.22.2-bookworm-slim@sha256:01d566e8d94d8c619591d78652babfccd3c6992a3dffa9ed5ab39e11cf6c70e9 AS build
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
# pnpm 버전은 루트 package.json의 packageManager를 따른다
RUN corepack enable
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/images/package.json ./apps/images/
# 이미지 서버의 실행 의존성만 설치한다. 저장소의 다른 앱·패키지는 담지 않는다(`pnpm fetch`는 모든 앱의 의존성을 담아 쓰지 않는다).
RUN --mount=type=cache,id=seojaewan-blog-pnpm-store,target=/pnpm-store \
    pnpm install --frozen-lockfile --prod --ignore-scripts --filter @seojaewan/images --store-dir /pnpm-store
COPY apps/images ./apps/images
# 체크아웃의 파일 권한(umask)과 관계없이 실행 계정이 읽을 수 있게 한다
RUN chmod -R a+rX apps/images

FROM node:24.22.2-bookworm-slim@sha256:01d566e8d94d8c619591d78652babfccd3c6992a3dffa9ed5ab39e11cf6c70e9
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3100 \
    IMAGE_STORE_DIR=/srv/seojaewan-blog/images
# 실행 계정은 root가 아닌 고정 uid다. 저장 폴더(볼륨)를 이 uid가 쓸 수 있어야 하므로, 배포 스크립트가 올리기 전에 폴더 주인을 맞춘다.
RUN groupadd --system --gid 10001 images \
 && useradd --system --uid 10001 --gid images --no-create-home --shell /usr/sbin/nologin images \
 && mkdir -p "${IMAGE_STORE_DIR}" \
 && chown images:images "${IMAGE_STORE_DIR}"
WORKDIR /app
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/images ./apps/images
WORKDIR /app/apps/images
USER images
EXPOSE 3100
VOLUME ["/srv/seojaewan-blog/images"]
# 배포한 버전 기록. 배포 스크립트가 실행 중인 컨테이너의 이 라벨로 이미 배포한 버전을 안다(deploy/deploy-changed.mjs)
ARG APP_VERSION=unknown
ARG REVISION=unknown
LABEL org.opencontainers.image.title="seojaewan-blog-images" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${REVISION}"
CMD ["node", "src/main.ts"]
