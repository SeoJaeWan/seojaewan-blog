/**
 * 토큰 CSS 변수의 px 값을 읽는다. 문서가 없으면(서버) 0이다.
 * @param name 읽을 CSS 변수 이름(`--spacing-md`)
 * @returns px 값
 */
function readTokenPx(name: string): number {
  if (typeof document === 'undefined') {
    return 0;
  }
  const value = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(name),
  );
  return Number.isNaN(value) ? 0 : value;
}

/**
 * 작업 표시줄 앱 버튼 위에 여는 팝업(우클릭 메뉴, 창 미리보기)과 버튼 위 끝 사이 간격(px)을 토큰 값으로 계산한다.
 * 팝업은 작업 표시줄 위 끝에서 `spacing/md` 띄우고, 버튼은 작업 표시줄 세로 가운데에 놓이므로
 * 버튼 위 끝에서는 (작업 표시줄 높이 - 버튼 높이) / 2만큼 더 띄운다.
 * @codocs [[작업 표시줄:우클릭 메뉴]]
 * @codocs [[작업 표시줄:창 미리보기]]
 * @param from 간격을 재는 기준. `button`이면 버튼 위 끝, `taskbar`면 작업 표시줄 위 끝이다
 * @returns 기준과 팝업 아래 끝 사이 간격(px)
 */
export function getTaskbarPopupOffset(from: 'button' | 'taskbar'): number {
  const gap = readTokenPx('--spacing-md');
  if (from === 'taskbar') {
    return gap;
  }
  const buttonInset =
    (readTokenPx('--size-taskbar-height') - readTokenPx('--size-taskbar-item')) / 2;
  return buttonInset + gap;
}

/**
 * 창 미리보기 목록 아래에 더할 바깥 여백(px)이다. `Popover`가 트리거와 팝업 사이에 이미 `spacing/xs`를 두므로
 * 목록이 작업 표시줄 위 끝에서 `spacing/md` 떨어지도록 그 나머지만 더한다.
 * @codocs [[작업 표시줄:창 미리보기]]
 * @param from 목록 자리의 기준. `button`이면 버튼에, `taskbar`면 작업 표시줄에 붙인 목록이다(모바일 가운데 목록)
 * @returns 목록 아래 바깥 여백(px)
 */
export function getTaskbarPreviewMargin(from: 'button' | 'taskbar'): number {
  return getTaskbarPopupOffset(from) - readTokenPx('--spacing-xs');
}
