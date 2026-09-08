/**
 * @file headless runtime을 React controller에 전달하는 Context 경계를 제공한다.
 *
 * authoritative Store snapshot은 Context에 복제하지 않으며 DOM이나 JSX를 만들지 않는다.
 */
import { createContext, createElement, type ReactNode, useContext } from "react";

import type { HeadlessRuntime } from "../headlessRuntime/index.js";

const HeadlessRuntimeContext = createContext<HeadlessRuntime | null>(null);

/** HeadlessRuntimeProvider가 기존에 생성된 runtime과 자식 tree를 받는 입력이다. */
export type HeadlessRuntimeProviderProps = Readonly<{
  /** Application이 Store 초기화 뒤 render 바깥에서 한 번 만든 안정적인 runtime이다. */
  runtime: HeadlessRuntime;
  /** runtime을 소비할 제품 root와 그 하위 React node다. */
  children?: ReactNode;
}>;

/**
 * 기존 headless runtime을 controller hook에 전달한다.
 *
 * Provider는 Store를 초기화·재생성하거나 snapshot을 Context state로 복제하지 않는다.
 */
export const HeadlessRuntimeProvider = ({
  runtime,
  children,
}: HeadlessRuntimeProviderProps): ReactNode =>
  createElement(HeadlessRuntimeContext.Provider, { value: runtime }, children);

/**
 * 가장 가까운 Provider의 안정적인 headless runtime을 반환한다.
 *
 * Provider 바깥에서 호출하면 lifecycle 구성을 바로 고칠 수 있도록 한글 오류를 던진다.
 */
export const useHeadlessRuntime = (): HeadlessRuntime => {
  const runtime = useContext(HeadlessRuntimeContext);
  if (runtime === null) {
    throw new Error("headless controller를 사용하려면 HeadlessRuntimeProvider가 필요합니다");
  }
  return runtime;
};
