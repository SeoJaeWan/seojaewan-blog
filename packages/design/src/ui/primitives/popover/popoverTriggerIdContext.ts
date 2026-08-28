import { createContext } from "react";

/**
 * PopoverRootUI가 생성한 trigger id를 PopoverTriggerUI에 전달하는 내부 context다.
 *
 * 이 context는 family public API나 애플리케이션 상태를 구성하지 않는다.
 */
export const PopoverTriggerIdContext = createContext<string | undefined>(undefined);
