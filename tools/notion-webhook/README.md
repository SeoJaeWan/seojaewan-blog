# notion-webhook

Notion 웹훅을 받아 GitHub `repository_dispatch`로 글 동기화(`.github/workflows/content-sync.yml`)를 시작시키는 Cloudflare Worker다.
결정과 이유는 `.codocs`의 [콘텐츠 원천:갱신 방식]을 따른다. 이 문서는 사람이 하는 배포와 등록 절차만 적는다.

Notion 웹훅은 GitHub API가 요구하는 인증 헤더와 본문(`event_type`)을 만들 수 없어 중계가 필요하다.
Worker는 Cloudflare에서 돌므로 미니 PC로 들어오는 길이 생기지 않는다.

## 하는 일

1. `POST`만 받는다. 본문을 받은 그대로 읽는다.
2. 본문에 `verification_token`이 있으면 구독을 만들 때 Notion이 보내는 확인 요청이다. 토큰을 Worker 로그에 남기고 200으로 답한다. 아무것도 시작하지 않는다.
3. 그 밖의 요청은 `X-Notion-Signature`(`sha256=` + 본문을 `verification_token`으로 HMAC-SHA256 한 16진수)를 상수 시간으로 확인한다. 틀리면 401이다.
4. 페이지 이벤트(`page.created`, `page.content_updated`, `page.properties_updated`, `page.deleted`, `page.undeleted`, `page.moved`)면 `repository_dispatch`를 한 번 부르고 200으로 답한다. 댓글 같은 다른 이벤트는 200으로 받고 아무것도 하지 않는다.
5. 비밀 값이 없거나 GitHub 호출이 실패하면 5xx로 답한다. Notion이 최대 8번(약 24시간 동안) 다시 보낸다.

어느 데이터베이스의 페이지인지는 가리지 않는다. 글이 아닌 페이지로 시작해도 동기화는 내보내기 결과가 같으면 "바뀐 것 없음"으로 끝난다.

## 설정 값

| 이름                        | 종류                  | 값                                                                             |
| --------------------------- | --------------------- | ------------------------------------------------------------------------------ |
| `GITHUB_REPO`               | 변수(`wrangler.toml`) | `SeoJaeWan/seojaewan-blog`                                                     |
| `DISPATCH_EVENT_TYPE`       | 변수(`wrangler.toml`) | `notion-content-changed`. 워크플로의 `repository_dispatch.types`와 같아야 한다 |
| `GITHUB_DISPATCH_TOKEN`     | 비밀 값               | `repository_dispatch` 권한이 있는 GitHub Fine-grained PAT                      |
| `NOTION_VERIFICATION_TOKEN` | 비밀 값               | Notion 웹훅 구독의 `verification_token`                                        |

비밀 값은 코드와 `wrangler.toml`에 적지 않는다.

## 배포와 등록 순서

wrangler는 이 저장소의 의존성이 아니다. `pnpm dlx`로 부른다. 아래 명령은 이 폴더(`tools/notion-webhook`)에서 한다.

1. GitHub Fine-grained PAT를 만든다. Repository access는 `seojaewan-blog` 하나만, Repository permissions는 **Contents: Read and write**만 준다
   (`POST /repos/{owner}/{repo}/dispatches`에 필요한 Fine-grained 권한이다). 만료일은 정해 두고 다시 만든다.
2. Cloudflare에 로그인한다: `pnpm dlx wrangler login`.
3. Worker를 올린다: `pnpm dlx wrangler deploy`. 끝나면 `https://seojaewan-notion-webhook.<계정>.workers.dev` 주소가 나온다.
4. GitHub 토큰을 비밀 값으로 넣는다: `pnpm dlx wrangler secret put GITHUB_DISPATCH_TOKEN`(프롬프트에 붙여 넣는다).
5. 로그를 본다: `pnpm dlx wrangler tail`. 켜 둔 채로 다음 단계를 한다.
6. Notion에서 구독을 만든다. `https://app.notion.com/developers/connections`에서 연동 `seojaewan-blog`를 열고 Webhooks 탭의 **Create a subscription**을 누른다.
   Webhook URL에 3번의 주소를 넣고, 이벤트는 페이지 이벤트(Page created, Page content updated, Page properties updated, Page deleted, Page undeleted, Page moved)를 고른다.
   (웹훅 주소는 SSL이고 인터넷에서 닿아야 한다. 확인 전에만 바꿀 수 있고 이벤트 종류는 언제든 바꿀 수 있다.)
7. 구독을 만들면 Notion이 확인 요청을 한 번 보낸다. `wrangler tail`에 `Notion verification_token: ...`이 찍힌다. 토큰이 오지 않으면 확인 창의 **Resend token**을 누른다.
8. 그 토큰을 Worker 비밀 값으로 넣는다: `pnpm dlx wrangler secret put NOTION_VERIFICATION_TOKEN`.
9. Notion의 확인 창(Webhooks 탭의 **Verify**)에 같은 토큰을 붙여 넣고 제출한다. 구독이 활성화된다.
10. 시험한다. Notion에서 글을 하나 고치고, 몇 분 안에 `wrangler tail`에 요청이 보이고 GitHub Actions에 `Content sync`가 `repository_dispatch`로 시작되는지 본다.
    토큰을 로그에 남기는 것은 구독을 만들 때뿐이므로, 끝나면 `wrangler tail`을 끄고 필요하면 로그 기록에서 토큰이 남았는지 확인한다.

토큰을 바꿔야 하면(Resend token으로 새 토큰을 받았을 때 등) 8번을 다시 한다.

## 로컬 시험

```sh
pnpm --filter @seojaewan/notion-webhook test
pnpm --filter @seojaewan/notion-webhook typecheck
```

단위 시험은 서명 확인(`signature.ts`), 어떤 이벤트에 시작할지와 GitHub 요청 만들기(`dispatch.ts`), 요청 처리 흐름(`worker.ts`)을 흉내 낸 값으로 본다. 실제 Notion과 GitHub는 부르지 않는다.
로컬에서 Worker를 띄우려면 이 폴더에 `.dev.vars`(Git에서 제외)를 만들어 두 비밀 값을 적고 `pnpm dlx wrangler dev`를 쓴다.

## Cloudflare Workers 무료 요금제 한도

Cloudflare 문서 기준이다(https://developers.cloudflare.com/workers/platform/limits/). 하루 요청 100,000건(UTC 자정에 초기화), 요청당 CPU 시간 10ms(`fetch()` 같은 네트워크 대기는 세지 않는다), 호출당 하위 요청 50개다.
이 Worker는 요청마다 GitHub를 한 번 부르므로 한도 안이다.

## 근거 문서

- Notion 웹훅: https://developers.notion.com/reference/webhooks , https://developers.notion.com/reference/webhooks-events-delivery
- GitHub repository_dispatch: https://docs.github.com/en/rest/repos/repos#create-a-repository-dispatch-event
- Fine-grained PAT 권한: https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens
- Cloudflare 비밀 값: https://developers.cloudflare.com/workers/configuration/secrets/
