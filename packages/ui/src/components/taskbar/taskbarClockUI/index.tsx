import type { ComponentPropsWithoutRef } from "react";

import { clsx } from "clsx";

export interface TaskbarClockUIProps extends ComponentPropsWithoutRef<"div"> {
  /** 원본 Asia/Seoul — Intl timeZone 값 */
  timeZone?: string;
  /** 현재 시각 — null/undefined면 hydration 전 skeleton을 보여준다 (tick은 앱 책임) */
  value?: Date | null;
}

// 원본 dayjs 'A h:mm' (ko) 대응 — "오후 3:24"
const formatTime = (value: Date, timeZone?: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    hour: "numeric",
    hour12: true,
    minute: "2-digit",
    timeZone,
  }).format(value);

// 원본 dayjs 'YYYY-MM-DD' 대응 — en-CA가 YYYY-MM-DD 형식을 낸다
const formatDate = (value: Date, timeZone?: string) =>
  new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).format(value);

/**
 * taskbar 오른쪽 시간/날짜 표시 (원본 Timestamp).
 * 10초 간격 갱신은 앱이 value 주입으로 담당하고,
 * 이 컴포넌트는 형식과 skeleton 표시만 책임진다.
 *
 * @param props.value 표시할 현재 시각. null이면 hydration 전 skeleton을 보여준다
 * @param props.timeZone Intl formatter에 넘길 timeZone. 기본값은 "Asia/Seoul"
 * @param props.className clock root에 추가할 className
 */
export const TaskbarClockUI = ({
  className,
  timeZone = "Asia/Seoul",
  value = null,
  ...props
}: TaskbarClockUIProps) => (
  <div className={clsx("wb-taskbar-clock", className)} {...props}>
    {value ? (
      <>
        <p className="wb-taskbar-clock__time">{formatTime(value, timeZone)}</p>
        <p className="wb-taskbar-clock__date">{formatDate(value, timeZone)}</p>
      </>
    ) : (
      <div aria-hidden="true" className="wb-taskbar-clock__skeleton">
        <div className="wb-taskbar-clock__skeleton-line" />
        <div className="wb-taskbar-clock__skeleton-line" />
      </div>
    )}
  </div>
);
