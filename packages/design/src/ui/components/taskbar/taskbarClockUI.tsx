import { clsx } from "clsx";

import type { TaskbarClockUIProps } from "./taskbarUI.types";

import "./taskbarUI.css";

const formatTime = (value: Date, timeZone: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    hour: "numeric",
    hour12: true,
    minute: "2-digit",
    timeZone,
  }).format(value);

const formatDate = (value: Date, timeZone: string) =>
  new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).format(value);

/**
 * caller가 주입한 Date를 taskbar의 시간과 날짜 visual로 표현한다.
 *
 * 현재 시각의 생성과 tick 주기는 Application composition이 소유한다.
 */
export const TaskbarClockUI = ({
  "aria-label": ariaLabel = "날짜 및 시간",
  className,
  timeZone = "Asia/Seoul",
  value = null,
  ...props
}: TaskbarClockUIProps) => (
  <div
    {...props}
    aria-label={ariaLabel}
    className={clsx("wd-taskbar-clock-ui", className)}
    data-ready={value ? "true" : "false"}
  >
    {value ? (
      <time className="wd-taskbar-clock-ui__value" dateTime={value.toISOString()}>
        <span className="wd-taskbar-clock-ui__time">{formatTime(value, timeZone)}</span>
        <span className="wd-taskbar-clock-ui__date">{formatDate(value, timeZone)}</span>
      </time>
    ) : (
      <span aria-hidden="true" className="wd-taskbar-clock-ui__skeleton">
        <span />
        <span />
      </span>
    )}
  </div>
);
