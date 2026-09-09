/**
 * @file DOM 없이 숫자 입력만으로 Window 배치와 표시 bounds를 계산한다.
 *
 * workArea 측정, pointer sampling과 제품별 크기 선택은 Application과 UI가 소유한다.
 */
import type {
  WindowFrameState,
  WindowMode,
  WindowPoint,
  WindowRect,
  WindowSize,
} from "../model/index.js";

/**
 * 모든 앱 Window가 함께 사용하는 배치와 복구 숫자 설정이다.
 *
 * 제품별 크기를 포함하지 않으며 실제 값은 Application composition이 제공한다.
 */
export type WindowPlacementConfig = Readonly<{
  defaultSize: WindowSize;
  minSize: WindowSize;
  edgeMargin: number;
  cascadeOffset: WindowPoint;
  titlebarRecoverySize: WindowSize;
}>;

/**
 * Window의 한 변 또는 모서리를 나타내는 eight-direction resize 식별자다.
 *
 * Product Component는 pointer delta만 전달하고 반대쪽 변 고정과 최소 크기 정책은 이 방향을 기준으로 계산한다.
 */
export type WindowResizeDirection = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

const windowResizeDirections: readonly string[] = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];

/**
 * geometry 입력이 유한한 숫자와 허용된 크기 범위를 만족하지 않을 때 발생한다.
 *
 * 입력을 보정하거나 현재 WindowState를 변경하지 않는다.
 */
export class InvalidWindowGeometryError extends TypeError {
  /**
   * 검증에 실패한 geometry 항목을 나타내는 오류를 만든다.
   */
  constructor(message: string) {
    super(`Window geometry가 유효하지 않습니다: ${message}`);
    this.name = "InvalidWindowGeometryError";
  }
}

/**
 * 숫자가 유한한지 검사하고 NaN·무한대이면 해당 필드의 geometry 오류를 던진다.
 */
const assertFiniteNumber = (value: number, name: string): void => {
  if (!Number.isFinite(value)) {
    throw new InvalidWindowGeometryError(`${name}은 유한한 숫자여야 합니다`);
  }
};

/**
 * 너비와 높이가 유한한 0 이상인지 검사한다. workArea의 0 크기는 허용한다.
 */
const assertNonNegativeSize = (size: WindowSize, name: string): void => {
  assertFiniteNumber(size.width, `${name}.width`);
  assertFiniteNumber(size.height, `${name}.height`);

  if (size.width < 0 || size.height < 0) {
    throw new InvalidWindowGeometryError(`${name} 크기는 음수일 수 없습니다`);
  }
};

/**
 * normal size와 배치 설정에 필요한 양수 크기를 검사하며 0·음수·비유한 값을 거부한다.
 */
const assertPositiveSize = (size: WindowSize, name: string): void => {
  assertNonNegativeSize(size, name);

  if (size.width === 0 || size.height === 0) {
    throw new InvalidWindowGeometryError(`${name} 크기는 0보다 커야 합니다`);
  }
};

/**
 * 사각형의 좌표와 크기를 검사한다. positiveSize에 따라 0 크기의 허용 여부를 구분한다.
 */
const assertRect = (rect: WindowRect, name: string, positiveSize: boolean): void => {
  assertFiniteNumber(rect.x, `${name}.x`);
  assertFiniteNumber(rect.y, `${name}.y`);

  if (positiveSize) {
    assertPositiveSize(rect, name);
  } else {
    assertNonNegativeSize(rect, name);
  }
};

/**
 * 배치와 titlebar 복구 설정을 검증하고 유효하지 않은 숫자를 geometry 오류로 거부한다.
 */
const assertConfig = (config: WindowPlacementConfig): void => {
  assertPositiveSize(config.defaultSize, "defaultSize");
  assertPositiveSize(config.minSize, "minSize");
  assertPositiveSize(config.titlebarRecoverySize, "titlebarRecoverySize");
  assertFiniteNumber(config.edgeMargin, "edgeMargin");
  assertFiniteNumber(config.cascadeOffset.x, "cascadeOffset.x");
  assertFiniteNumber(config.cascadeOffset.y, "cascadeOffset.y");

  if (config.edgeMargin < 0) {
    throw new InvalidWindowGeometryError("edgeMargin은 음수일 수 없습니다");
  }
};

/**
 * 숫자를 주어진 최소·최대 구간으로 제한해 반환하며 입력을 변경하지 않는다.
 */
const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(Math.max(value, minimum), maximum);

/**
 * 최소 크기가 확보되는 축에만 margin을 적용한 배치 영역을 반환한다. 작은 workArea는 가용 공간 전체를 사용한다.
 */
const getPlacementArea = (
  workArea: WindowRect,
  edgeMargin: number,
  minSize: WindowSize,
): WindowRect => {
  const horizontalMargin = workArea.width >= minSize.width + edgeMargin * 2 ? edgeMargin : 0;
  const verticalMargin = workArea.height >= minSize.height + edgeMargin * 2 ? edgeMargin : 0;

  return {
    x: workArea.x + horizontalMargin,
    y: workArea.y + verticalMargin,
    width: workArea.width - horizontalMargin * 2,
    height: workArea.height - verticalMargin * 2,
  };
};

/**
 * 가용 크기가 양수이면 요청 크기를 그 안으로 제한한다.
 *
 * 가용 크기가 0이면 양수 요청 크기를 유지해 normal size가 0이 되는 것을 막는다. 입력의 유한성·양수 검증은 호출자가 담당한다.
 */
const fitPositiveDimension = (requested: number, available: number): number =>
  available > 0 ? Math.min(requested, available) : requested;

/**
 * 창이 영역에 들어가도록 시작 좌표를 제한한다. 영역이 없거나 창보다 작으면 영역 원점을 반환한다.
 */
const clampOrigin = (
  origin: number,
  size: number,
  areaOrigin: number,
  areaSize: number,
): number => {
  if (areaSize <= 0 || size > areaSize) {
    return areaOrigin;
  }

  return clamp(origin, areaOrigin, areaOrigin + areaSize - size);
};

/**
 * 계산된 normal 사각형의 유한성과 양수 크기를 재검증해 반환한다. 산술 overflow 결과도 거부한다.
 */
const validateCalculatedNormalBounds = (bounds: WindowRect): WindowRect => {
  assertRect(bounds, "계산 결과", true);
  return bounds;
};

/**
 * 첫 Window를 중앙에 놓거나 이전 Window 기준으로 cascade한 새 normal bounds를 계산한다.
 *
 * 양수 workArea가 요청 크기보다 작으면 가능한 영역까지 줄인다. 크기가 0인 workArea에서는
 * 양수 normal size를 유지하고 원점에 두어 유한한 runtime 상태를 만든다.
 */
export const createWindowBounds = (
  workArea: WindowRect,
  previousBounds: WindowRect | null,
  config: WindowPlacementConfig,
): WindowRect => {
  assertRect(workArea, "workArea", false);
  assertConfig(config);

  if (previousBounds !== null) {
    assertRect(previousBounds, "previousBounds", true);
  }

  const area = getPlacementArea(workArea, config.edgeMargin, config.minSize);
  const requestedWidth = Math.max(config.defaultSize.width, config.minSize.width);
  const requestedHeight = Math.max(config.defaultSize.height, config.minSize.height);
  const width = fitPositiveDimension(requestedWidth, area.width);
  const height = fitPositiveDimension(requestedHeight, area.height);
  const desiredX =
    previousBounds === null
      ? area.x + (area.width - width) / 2
      : previousBounds.x + config.cascadeOffset.x;
  const desiredY =
    previousBounds === null
      ? area.y + (area.height - height) / 2
      : previousBounds.y + config.cascadeOffset.y;

  return validateCalculatedNormalBounds({
    x: clampOrigin(desiredX, width, area.x, area.width),
    y: clampOrigin(desiredY, height, area.y, area.height),
    width,
    height,
  });
};

/**
 * move·resize 후보를 최소 크기와 현재 workArea 안에 맞춘 normal bounds로 제한한다.
 *
 * 크기가 0인 workArea에서는 양수 normal size를 유지하며 입력 객체를 변경하지 않는다.
 */
export const constrainWindowBounds = (
  bounds: WindowRect,
  workArea: WindowRect,
  config: WindowPlacementConfig,
): WindowRect => {
  assertRect(bounds, "bounds", true);
  assertRect(workArea, "workArea", false);
  assertConfig(config);

  const area = getPlacementArea(workArea, config.edgeMargin, config.minSize);
  const width = fitPositiveDimension(Math.max(bounds.width, config.minSize.width), area.width);
  const height = fitPositiveDimension(Math.max(bounds.height, config.minSize.height), area.height);

  return validateCalculatedNormalBounds({
    x: clampOrigin(bounds.x, width, area.x, area.width),
    y: clampOrigin(bounds.y, height, area.y, area.height),
    width,
    height,
  });
};

/**
 * 한 축의 resize 후보를 만들며 움직이지 않는 반대쪽 변과 최소 크기를 보존한다.
 *
 * workArea가 최소 크기보다 작은 경우의 최종 가용 영역 우선 처리는 `constrainWindowBounds`에 맡긴다.
 */
const resizeAxis = (
  origin: number,
  size: number,
  delta: number,
  edge: "near" | "far" | null,
  minimumSize: number,
): Readonly<{ origin: number; size: number }> => {
  if (edge === null) return { origin, size };
  if (edge === "far") return { origin, size: Math.max(size + delta, minimumSize) };

  const oppositeEdge = origin + size;
  const resizedOrigin = Math.min(origin + delta, oppositeEdge - minimumSize);
  return { origin: resizedOrigin, size: oppositeEdge - resizedOrigin };
};

/**
 * 시작 bounds와 pointer delta에서 eight-direction resize 후보를 계산한다.
 *
 * 왼쪽·위쪽 변은 반대쪽 변을 고정하고, 모든 결과는 현재 workArea와 `minSize`에 맞춰 제한된다.
 * 0 크기 workArea에서는 기존 양수 normal size 정책을 유지하며 잘못된 입력은 geometry 오류로 거부한다.
 */
export const resizeWindowBounds = (
  startBounds: WindowRect,
  direction: WindowResizeDirection,
  delta: WindowPoint,
  workArea: WindowRect,
  config: WindowPlacementConfig,
): WindowRect => {
  assertRect(startBounds, "startBounds", true);
  if (!windowResizeDirections.includes(direction)) {
    throw new InvalidWindowGeometryError("resize direction이 유효하지 않습니다");
  }
  assertFiniteNumber(delta.x, "delta.x");
  assertFiniteNumber(delta.y, "delta.y");
  assertRect(workArea, "workArea", false);
  assertConfig(config);

  const horizontalEdge = direction.includes("w") ? "near" : direction.includes("e") ? "far" : null;
  const verticalEdge = direction.includes("n") ? "near" : direction.includes("s") ? "far" : null;
  const horizontal = resizeAxis(
    startBounds.x,
    startBounds.width,
    delta.x,
    horizontalEdge,
    config.minSize.width,
  );
  const vertical = resizeAxis(
    startBounds.y,
    startBounds.height,
    delta.y,
    verticalEdge,
    config.minSize.height,
  );

  return constrainWindowBounds(
    {
      x: horizontal.origin,
      y: vertical.origin,
      width: horizontal.size,
      height: vertical.size,
    },
    workArea,
    config,
  );
};

/**
 * workArea 축소 뒤에도 titlebar의 설정된 영역을 다시 잡을 수 있도록 위치를 복구한다.
 *
 * 기존 normal size와 placement를 변경하지 않으며 workArea가 0이어도 유한한 원점을 반환한다.
 */
export const recoverWindowBounds = (
  bounds: WindowRect,
  workArea: WindowRect,
  config: WindowPlacementConfig,
): WindowRect => {
  assertRect(bounds, "bounds", true);
  assertRect(workArea, "workArea", false);
  assertConfig(config);

  const visibleWidth = Math.min(config.titlebarRecoverySize.width, bounds.width, workArea.width);
  const visibleHeight = Math.min(
    config.titlebarRecoverySize.height,
    bounds.height,
    workArea.height,
  );
  const minimumX = workArea.x - bounds.width + visibleWidth;
  const maximumX = workArea.x + workArea.width - visibleWidth;
  const minimumY = workArea.y;
  const maximumY = workArea.y + workArea.height - visibleHeight;

  return validateCalculatedNormalBounds({
    ...bounds,
    x: workArea.width === 0 ? workArea.x : clamp(bounds.x, minimumX, maximumX),
    y: workArea.height === 0 ? workArea.y : clamp(bounds.y, minimumY, maximumY),
  });
};

/**
 * frame이 현재 화면에 표시할 bounds를 mode·placement와 workArea에서 파생한다.
 *
 * mobile은 placement와 무관하게 전체 workArea를 사용한다. 계산은 저장된 desktop
 * `normalBounds`를 덮어쓰지 않으며 입력 객체를 변경하지 않는다.
 */
export const getWindowBounds = (
  frame: WindowFrameState,
  workArea: WindowRect,
  mode: WindowMode = "desktop",
): WindowRect => {
  assertRect(frame.normalBounds, "normalBounds", true);
  assertRect(workArea, "workArea", false);

  return mode === "mobile" || frame.placement === "maximized"
    ? { ...workArea }
    : { ...frame.normalBounds };
};
