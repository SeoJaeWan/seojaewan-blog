// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// 탐색 창 즐겨찾기로 끄는 모습(Explorer/FavoritesDrag) 스토리의 고정 데이터다. 피그마 조립과 같은 값을 둔다.

/** 피그마 Explorer/FavoritesDrag의 즐겨찾기 칸 이름(처음 즐겨찾기와 같다) */
export const FAVORITE_LABELS = ['Project', 'Blog', 'About'] as const;

/**
 * 피그마 Explorer/FavoritesDrag 변형마다 끄는 항목과 놓을 자리.
 * - name, kind: 끄는 복제본의 이름과 종류(폴더는 놓을 수 있고 글은 놓을 수 없다)
 * - dropSlot: 가로선을 그릴 놓을 자리. 놓을 수 없으면 null
 * - ghost, tooltip: 피그마 프레임 왼쪽 위 기준 복제본과 툴팁 자리(px)
 */
export const FAVORITES_DRAG = {
  allowed: {
    name: 'TypeScript',
    kind: 'folder',
    dropSlot: 2,
    ghost: { x: 60, y: 0 },
    tooltip: { x: 165, y: 132 },
  },
  'not-allowed': {
    name: 'Notion 블로그 이전기',
    kind: 'post',
    dropSlot: null,
    ghost: { x: 60, y: 0 },
    tooltip: { x: 165, y: 148 },
  },
} as const;
