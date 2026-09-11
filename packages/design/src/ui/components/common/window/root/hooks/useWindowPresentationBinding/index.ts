import { useEffect, useState } from "react";

import type {
  WindowPresentationRequest,
  WindowSessionId,
} from "../../../../../../../headless/windows/index.js";
import type {
  WindowPresentationBinding,
  WindowPresentationConsumer,
} from "../../../utils/presentationBinding/index.js";

/**
 * Presentation binding의 mount와 Session별 요청 구독 생명주기를 소유한다.
 */
export const useWindowPresentationBinding = (
  binding: WindowPresentationBinding | undefined,
  sessionId: WindowSessionId,
): WindowPresentationRequest | null => {
  const [presentation, setPresentation] = useState<WindowPresentationRequest | null>(null);

  useEffect(() => {
    if (binding === undefined) {
      setPresentation(null);
      return undefined;
    }
    const consume: WindowPresentationConsumer = (request) => setPresentation(request);
    return binding.mount(sessionId, consume);
  }, [binding, sessionId]);

  return presentation;
};
