/**
 * @file DOM 없이 숫자 입력만으로 Window 배치와 표시 bounds를 계산한다.
 *
 * workArea 측정, pointer sampling과 제품별 크기 선택은 Application과 UI가 소유한다.
 */
import type {
  WindowBounds,
  WindowFrameState,
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
 * geometry 입력이 유한한 숫자와 허용된 크기 범위를 만족하지 않을 때 발생한다.
 *
 * 입력을 보정하거나 현재 WindowState를 변경하지 않는다.
 */
export class InvalidWindowGeometryError extends TypeError {
  /** 검증에 실패한 geometry 항목을 나타내는 오류를 만든다. */
  constructor(message: string) {
    super(`Window geometry가 유효하지 않습니다: ${message}`);
    this.name = "InvalidWindowGeometryError";
  }
}

const assertFiniteNumber = (value: number, name: string): void => {
  if (!Number.isFinite(value)) {
    throw new InvalidWindowGeometryError(`${name}은 유한한 숫자여야 합니다`);
  }
};

const assertNonNegativeSize = (size: WindowSize, name: string): void => {
  assertFiniteNumber(size.width, `${name}.width`);
  assertFiniteNumber(size.height, `${name}.height`);

  if (size.width < 0 || size.height < 0) {
    throw new InvalidWindowGeometryError(`${name} 크기는 음수일 수 없습니다`);
  }
};

const assertPositiveSize = (size: WindowSize, name: string): void => {
  assertNonNegativeSize(size, name);

  if (size.width === 0 || size.height === 0) {
    throw new InvalidWindowGeometryError(`${name} 크기는 0보다 커야 합니다`);
  }
};

const assertRect = (rect: WindowRect, name: string, positiveSize: boolean): void => {
  assertFiniteNumber(rect.x, `${name}.x`);
  assertFiniteNumber(rect.y, `${name}.y`);

  if (positiveSize) {
    assertPositiveSize(rect, name);
  } else {
    assertNonNegativeSize(rect, name);
  }
};

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

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(Math.max(value, minimum), maximum);

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

const fitPositiveDimension = (requested: number, available: number): number =>
  available > 0 ? Math.min(requested, available) : requested;

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

const validateCalculatedNormalBounds = (bounds: WindowBounds): WindowBounds => {
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
  previousBounds: WindowBounds | null,
  config: WindowPlacementConfig,
): WindowBounds => {
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
  bounds: WindowBounds,
  workArea: WindowRect,
  config: WindowPlacementConfig,
): WindowBounds => {
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
 * workArea 축소 뒤에도 titlebar의 설정된 영역을 다시 잡을 수 있도록 위치를 복구한다.
 *
 * 기존 normal size와 placement를 변경하지 않으며 workArea가 0이어도 유한한 원점을 반환한다.
 */
export const recoverWindowBounds = (
  bounds: WindowBounds,
  workArea: WindowRect,
  config: WindowPlacementConfig,
): WindowBounds => {
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
 * frame이 현재 화면에 표시할 bounds를 normal 상태 또는 workArea에서 파생한다.
 *
 * maximized 계산은 저장된 `normalBounds`를 덮어쓰지 않으며 입력 객체를 변경하지 않는다.
 */
export const getWindowBounds = (frame: WindowFrameState, workArea: WindowRect): WindowBounds => {
  assertRect(frame.normalBounds, "normalBounds", true);
  assertRect(workArea, "workArea", false);

  return frame.placement === "maximized" ? { ...workArea } : { ...frame.normalBounds };
};
