import type { ExternalLinkConfig } from '@/shared/utils/workspace-rules/workspace-rules';

/**
 * 외부 링크 설정 파일. 이름, 주소, 아이콘, 초기 위치(상위 폴더 id, 바탕화면은 null), 처음부터 Start에 고정할지를 정한다.
 * 항목 id는 `link:<id>`이므로 이미 쓰는 링크의 id는 바꾸지 않는다(방문자가 옮긴 자리가 그 id로 저장된다).
 * 주소를 비운 링크(이력서)는 주소를 받을 때까지 어디에도 보이지 않는다.
 * 링크를 지우면 방문자 상태에서도 지워진다([[작업 공간:Notion과 맞추기]]).
 * @codocs [[항목 모델:외부 링크]]
 * @codocs [[작업 공간:초기 구조]]
 * @codocs [[Start 메뉴:고정됨]]
 */
export const externalLinks = [
  {
    id: 'github',
    name: 'GitHub',
    url: 'https://github.com/SeoJaeWan',
    icon: 'illustrations/file-link.svg',
    initialParentId: null,
    pinnedToStart: true,
  },
  {
    id: 'resume',
    name: '이력서',
    url: '',
    icon: 'illustrations/file-link.svg',
    initialParentId: null,
    pinnedToStart: true,
  },
] as const satisfies readonly ExternalLinkConfig[];
