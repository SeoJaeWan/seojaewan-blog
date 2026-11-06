import 'server-only';

/** 이미지 하나의 크기를 기다리는 시간(밀리초). 저장본이 없으면 이미지 서버가 Notion에서 받아 변환한 뒤 답하므로 넉넉히 둔다 */
export const IMAGE_SIZE_TIMEOUT_MS = 10_000;

/** 이미지 서버에 동시에 보내는 크기 요청 수. 집 서버(Firebat)가 Notion 받기와 변환을 한꺼번에 떠안지 않게 한다 */
export const IMAGE_SIZE_CONCURRENCY = 4;

/** 이미지 서버가 크기를 알려주는 머리 */
const WIDTH_HEADER = 'X-Image-Width';
const HEIGHT_HEADER = 'X-Image-Height';

/** 크기 요청의 결과. 받지 못했으면 이유를 담는다 */
export type ImageSizeResult =
  { kind: 'sized'; width: number; height: number } | { kind: 'failed'; reason: string };

/** 이미지 주소 하나의 크기를 묻는 함수 */
export type ImageSizeReader = (url: string) => Promise<ImageSizeResult>;

/**
 * 이미지 서버에 `HEAD`를 보내 이미지 크기를 묻는 함수를 만든다. 이미지 서버는 저장할 때 읽어 둔 크기를
 * `X-Image-Width`·`X-Image-Height` 머리로 준다(저장본이 없으면 이때 가져와 저장한다).
 * - 동시에 보내는 요청은 `concurrency`개까지다. 넘치는 요청은 앞의 요청이 끝나기를 기다린다.
 * - 요청마다 `timeoutMs`가 지나면 끊는다.
 * - 응답이 없거나, 실패 상태이거나, 크기 머리가 없으면 오류를 던지지 않고 `failed`와 이유를 돌려준다. 페이지 만들기를 멈추지 않게 하기 위해서다.
 * @codocs [[Notion 이미지 제공:크기]]
 * @param options 만들기 설정
 * @param options.fetch HTTP 요청 함수. 시험에서 가짜 응답을 넣는다
 * @param options.timeoutMs 요청 하나를 기다리는 시간(밀리초)
 * @param options.concurrency 동시에 보내는 요청 수
 * @returns 크기를 묻는 함수
 */
export function createImageSizeReader({
  fetch = globalThis.fetch,
  timeoutMs = IMAGE_SIZE_TIMEOUT_MS,
  concurrency = IMAGE_SIZE_CONCURRENCY,
}: {
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
  concurrency?: number;
} = {}): ImageSizeReader {
  const limit = createLimit(concurrency);
  return (url) => limit(() => requestImageSize(fetch, url, timeoutMs));
}

/**
 * 이미지 서버에 `HEAD`를 보내 크기 머리를 읽는다.
 * @param fetch HTTP 요청 함수
 * @param url 이미지 주소
 * @param timeoutMs 기다리는 시간(밀리초)
 * @returns 크기, 또는 받지 못한 이유
 */
async function requestImageSize(
  fetch: typeof globalThis.fetch,
  url: string,
  timeoutMs: number,
): Promise<ImageSizeResult> {
  let response: Response;
  try {
    response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'TimeoutError';
    return {
      kind: 'failed',
      reason: isTimeout
        ? `${String(timeoutMs)}ms 안에 답하지 않았다`
        : `요청하지 못했다(${error instanceof Error ? error.message : String(error)})`,
    };
  }
  if (!response.ok) {
    return { kind: 'failed', reason: `상태 ${String(response.status)}` };
  }
  const width = readPixels(response.headers.get(WIDTH_HEADER));
  const height = readPixels(response.headers.get(HEIGHT_HEADER));
  if (width === null || height === null) {
    return { kind: 'failed', reason: '크기 머리가 없다' };
  }
  return { kind: 'sized', width, height };
}

/**
 * 크기 머리 값을 픽셀 수로 읽는다.
 * @param value 머리 값
 * @returns 1 이상의 정수. 없거나 숫자가 아니면 null
 */
function readPixels(value: string | null): number | null {
  if (value === null || !/^[1-9]\d*$/u.test(value.trim())) {
    return null;
  }
  return Number(value.trim());
}

/**
 * 동시에 도는 작업 수를 제한하는 함수를 만든다.
 * @param concurrency 동시에 도는 작업 수
 * @returns 작업을 받아 차례가 오면 돌리는 함수
 */
function createLimit(concurrency: number): <T>(task: () => Promise<T>) => Promise<T> {
  let running = 0;
  const waiting: (() => void)[] = [];

  /**
   * 자리가 날 때까지 기다린다.
   * @returns 자리를 얻으면 끝나는 Promise
   */
  function acquire(): Promise<void> {
    if (running < concurrency) {
      running += 1;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      waiting.push(resolve);
    });
  }

  /** 자리를 돌려주고, 기다리는 작업이 있으면 그 작업에 넘긴다. */
  function release(): void {
    const next = waiting.shift();
    if (next === undefined) {
      running -= 1;
    } else {
      next();
    }
  }

  return async (task) => {
    await acquire();
    try {
      return await task();
    } finally {
      release();
    }
  };
}
