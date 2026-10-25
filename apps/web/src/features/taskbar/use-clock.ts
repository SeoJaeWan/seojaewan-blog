import { useSyncExternalStore } from 'react';

const MINUTE_MS = 60_000;

/** 작업 표시줄 시계에 보이는 두 줄 */
export type Clock = {
  /** 위 줄(시간). 예: `오후 3:24` */
  time: string;
  /** 아래 줄(날짜). 예: `2026-10-20` */
  date: string;
};

/**
 * 방문자 기기의 현재 시간과 날짜를 작업 표시줄 시계 글자로 돌려주고, 분이 바뀔 때마다 다시 그린다.
 * 서버와 수화(hydration) 첫 렌더에는 `null`을 돌려준다. 서버 시각과 방문자 시각이 달라 수화 불일치가 나지 않게,
 * 시계는 마운트한 뒤에 그린다(`useSyncExternalStore`의 서버 값).
 * @codocs [[작업 표시줄:시계]]
 * @returns 시계 글자. 마운트 전에는 `null`
 */
export function useClock(): Clock | null {
  const minute = useSyncExternalStore(subscribeMinute, getCurrentMinute, getServerMinute);
  return minute === null ? null : formatClock(new Date(minute * MINUTE_MS));
}

/**
 * 시각을 작업 표시줄 시계 글자로 바꾼다. 12시간제에 오전·오후를 앞에 두고, 날짜는 `연-월-일`이다(기기 시간대).
 * @codocs [[작업 표시줄:시계]]
 * @param now 바꿀 시각
 * @returns 시계 글자
 */
export function formatClock(now: Date): Clock {
  const hours = now.getHours();
  const period = hours < 12 ? '오전' : '오후';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return {
    time: `${period} ${String(hour12)}:${minutes}`,
    date: `${String(now.getFullYear())}-${month}-${day}`,
  };
}

/**
 * 다음 분이 시작될 때마다 알린다. 매 분 정각에 맞춰 타이머를 다시 건다.
 * @param onChange 분이 바뀌면 부를 함수
 * @returns 구독을 끊는 함수
 */
function subscribeMinute(onChange: () => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  /** 다음 분 정각까지 기다렸다가 알리고, 또 다음 분을 기다린다 */
  function schedule(): void {
    timer = setTimeout(
      () => {
        onChange();
        schedule();
      },
      MINUTE_MS - (Date.now() % MINUTE_MS),
    );
  }
  schedule();
  return () => {
    clearTimeout(timer);
  };
}

/**
 * 지금이 몇 번째 분인지(1970년부터 센 분)를 돌려준다. 같은 분 안에서는 같은 값이라 다시 그리지 않는다.
 * @returns 지금의 분 번호
 */
function getCurrentMinute(): number {
  return Math.floor(Date.now() / MINUTE_MS);
}

/**
 * 서버와 수화 첫 렌더의 값. 시각을 모르므로 비운다.
 * @returns null
 */
function getServerMinute(): null {
  return null;
}
