import { useSyncExternalStore } from 'react';

/**
 * 브라우저 종류는 실행 중 바뀌지 않아 구독할 이벤트가 없다.
 * @returns 구독 해제 함수
 */
function subscribeBrowser(): () => void {
  return () => undefined;
}

/**
 * Safari와 iOS의 WebKit 브라우저는 검색 돋보기를 단색으로 그린다.
 * @codocs [[검색:입력칸]]
 * @returns 단색 대체 여부
 */
function usesSolidSearchIcon(): boolean {
  const userAgent = navigator.userAgent;
  return (
    /AppleWebKit/u.test(userAgent) &&
    /Safari/u.test(userAgent) &&
    !/Chrome\/|Chromium\/|Edg\/|OPR\//u.test(userAgent)
  );
}

/**
 * 서버와 첫 수화에서는 같은 SVG를 사용하고 브라우저 종류는 수화 뒤 확인한다.
 * @returns 서버의 단색 대체 여부
 */
function serverUsesSolidSearchIcon(): boolean {
  return false;
}

/**
 * 검색 돋보기를 그라데이션 대신 단색으로 그려야 하는 브라우저(Safari 계열 WebKit)인지 돌려준다.
 * 서버와 첫 수화에서는 항상 false라 서버 HTML과 어긋나지 않고, 수화 뒤 브라우저를 보고 바뀐다.
 * @codocs [[검색:입력칸]]
 * @returns 단색 돋보기를 써야 하면 true
 */
export function useSolidSearchIcon(): boolean {
  return useSyncExternalStore(subscribeBrowser, usesSolidSearchIcon, serverUsesSolidSearchIcon);
}
