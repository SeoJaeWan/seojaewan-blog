"use client";

import { useContext } from "react";

import { WindowsPinsContext } from "../../providers/windowsPinsProvider/context";
import type { UseWindowsPins } from "../../providers/windowsPinsProvider/types";

export type { UseWindowsPins } from "../../providers/windowsPinsProvider/types";

/** Windows가 제공하는 시작 화면 pin state와 action을 반환한다. */
export const useWindowsPins = (): UseWindowsPins => {
  const context = useContext(WindowsPinsContext);

  if (context === null) {
    throw new Error("useWindowsPins는 Windows 안에서 사용해야 합니다.");
  }

  return context;
};
