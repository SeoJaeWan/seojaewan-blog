// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// 바탕화면 조립 스토리가 함께 쓰는 고정 데이터다. 피그마 조립과 같은 값을 둔다.

/**
 * 피그마 Desktop/Scene icons 프레임의 아이콘(휴지통, Blog, GitHub, 이력서). 두 기기 변형이 같다.
 * 휴지통은 비어 있는 모양(file/Recycle Bin Empty)이다.
 */
export const SCENE_ICONS = [
  { id: 'recycle-bin', name: '휴지통', kind: 'recycle-bin' },
  { id: 'blog', name: 'Blog', kind: 'folder' },
  { id: 'github', name: 'GitHub', kind: 'link' },
  { id: 'resume', name: '이력서', kind: 'link' },
] as const;
