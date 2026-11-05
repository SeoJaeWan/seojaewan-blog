import type { JSX, ReactNode } from 'react';

// 스토리 무대의 배치 이름과 클래스다. 스토리는 클래스를 쓰지 않고 이름으로만 고른다.
const STAGE_CLASS_NAMES = {
  /** 화면 전체를 쓰는 층(창 층, 바탕화면 아이콘 층, Start 메뉴 층) */
  fill: 'fixed inset-spacing-none flex flex-col',
  /** 화면 아래에 가로로 붙인다(작업 표시줄) */
  bottom: 'fixed inset-x-spacing-none bottom-spacing-none flex justify-center',
  /** 화면 오른쪽 아래에 두고 위로 메뉴가 뜰 공간을 남긴다(전원 버튼) */
  'bottom-end': 'flex h-screen items-end justify-end p-spacing-lg',
  /** 화면 아래 가운데에 두고 위로 메뉴·미리보기가 뜰 공간을 남긴다(작업 표시줄 앱) */
  'bottom-center': 'flex h-screen items-end justify-center',
  /** 화면 위 가운데에 두고 아래로 펼칠 공간을 남긴다(스냅 레이아웃 메뉴) */
  'top-center': 'flex h-screen items-start justify-center',
  /** 둘레에 그림자가 나갈 여백을 둔다(메시지 상자) */
  padded: 'p-spacing-5xl',
} as const;

export type StoryStagePlacement = keyof typeof STAGE_CLASS_NAMES;

type StoryStageProps = {
  placement: StoryStagePlacement;
  isTarget?: boolean;
  children: ReactNode;
};

/**
 * 스토리의 무대. 팝업·메뉴가 뜰 공간, 화면 가장자리에 붙는 층처럼 컴포넌트 밖의 배치를 이름으로 고른다.
 * 크기는 주지 않는다(크기는 FigmaFrame이 피그마에서 읽는다).
 * @codocs [[테스트 작성 규칙:스토리 테스트]]
 * @param props 컴포넌트 속성
 * @param props.placement 배치 이름
 * @param props.isTarget 캡처 대상(피그마 변형 노드 자리)을 감싸 `data-parity-target`을 단다
 * @param props.children 무대에 놓을 내용
 */
export function StoryStage({
  placement,
  isTarget = false,
  children,
}: StoryStageProps): JSX.Element {
  return (
    <div data-story-stage={placement} className={STAGE_CLASS_NAMES[placement]}>
      {isTarget ? (
        <div data-parity-target className="inline-flex">
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
