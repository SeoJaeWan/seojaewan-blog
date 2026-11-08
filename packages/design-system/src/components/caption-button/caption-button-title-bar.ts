import { createContext } from 'react';

export type CaptionButtonTitleBar = 'default' | 'custom';

/**
 * CaptionButtonGroup이 자기 Title bar를 안쪽 CaptionButton에 알리는 값이다.
 * 쓰는 곳이 `maximizeSlot`으로 바꿔 끼운 버튼(스냅 레이아웃 조립 등)도 묶음과 같은 높이가 되게 한다.
 * 패키지 진입점으로 내보내지 않는다.
 * @codocs [[창 동작:창 조작]]
 */
export const captionButtonTitleBarContext = createContext<CaptionButtonTitleBar>('default');
