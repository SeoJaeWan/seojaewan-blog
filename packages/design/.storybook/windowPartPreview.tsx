import type { ReactNode } from "react";

import type { Decorator, StoryContext } from "@storybook/react-vite";

/** Common Window part를 실제 titlebar 높이와 제품 배경에서 보여 주는 Story 체험 영역이다. */
export const WindowPartPreview = ({
  children,
  narrow = false,
  results,
  variant = "chrome",
}: {
  children: ReactNode;
  narrow?: boolean;
  results?: ReactNode;
  variant?: "chrome" | "file-explorer";
}) => (
  <>
    <div className="window-part-story-surface">
      <div
        className="window-frame window-part-story-frame"
        data-narrow={narrow ? "true" : "false"}
        data-variant={variant}
      >
        {children}
      </div>
    </div>
    {results ? <div className="window-part-story-results">{results}</div> : null}
  </>
);

/** Common Window part 설명을 Canvas와 Docs의 체험 영역 아래에 표시한다. */
export const withWindowPartDescription: Decorator = (Story, context: StoryContext) => (
  <div className="window-part-story">
    <Story />
    {context.parameters.windowPartDescription ? (
      <p className="window-part-story-description">{context.parameters.windowPartDescription}</p>
    ) : null}
  </div>
);
