/**
 * @file 앱별 tab이 공통으로 사용하는 직렬화 가능한 navigation entry 형태를 정의한다.
 *
 * location 비교와 history 변경 규칙은 각 제품 명령이 소유한다.
 */

/**
 * 한 location과 해당 위치에서 복원할 세로 scroll 값을 함께 보존한다.
 *
 * `scrollTop`은 유한한 0 이상 값이어야 하며 DOM viewport 참조는 포함하지 않는다.
 */
export type NavigationEntry<Location> = Readonly<{
  location: Location;
  scrollTop: number;
}>;

/**
 * 한 tab의 현재 위치와 뒤로·앞으로 이동할 entry를 보존한다.
 *
 * stack 변경과 location별 동등성 판정은 이 type이 수행하지 않는다.
 */
export type NavigationState<Location> = Readonly<{
  current: NavigationEntry<Location>;
  backStack: readonly NavigationEntry<Location>[];
  forwardStack: readonly NavigationEntry<Location>[];
}>;
