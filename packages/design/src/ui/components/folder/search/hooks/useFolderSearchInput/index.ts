import { useEffect, useRef, useState } from "react";

import type { FileExplorerControllerActions } from "../../../../../../headless/folders/index.js";

type UseFolderSearchInputOptions = Readonly<{
  actions: FileExplorerControllerActions;
  query: string;
}>;

/**
 * 검색 입력의 조합 중 문자열을 보존하고 확정된 값만 controller에 전달한다.
 */
export const useFolderSearchInput = ({ actions, query }: UseFolderSearchInputOptions) => {
  const [rawValue, setRawValue] = useState(query);
  const composingRef = useRef(false);
  const lastCommittedRef = useRef(query);

  useEffect(() => {
    lastCommittedRef.current = query;
    if (!composingRef.current) setRawValue(query);
  }, [query]);

  /**
   * 직전에 확정한 값과 다른 검색어만 controller에 전달한다.
   */
  const commit = (value: string) => {
    if (lastCommittedRef.current === value) return;
    lastCommittedRef.current = value;
    void actions.execute({ type: "file-explorer.query.set", query: value });
  };

  /**
   * IME 조합을 시작해 중간 입력의 검색 실행을 막는다.
   */
  const startComposition = () => {
    composingRef.current = true;
  };

  /**
   * IME 조합 결과를 입력값과 controller query에 함께 반영한다.
   */
  const endComposition = (value: string) => {
    composingRef.current = false;
    setRawValue(value);
    commit(value);
  };

  /**
   * raw input을 갱신하고 조합 중이 아닐 때만 검색을 확정한다.
   */
  const changeValue = (value: string) => {
    setRawValue(value);
    if (!composingRef.current) commit(value);
  };

  return { changeValue, endComposition, rawValue, startComposition } as const;
};
