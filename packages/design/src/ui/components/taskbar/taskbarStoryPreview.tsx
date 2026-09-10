import type { ReactNode } from "react";

import type { Decorator } from "@storybook/react-vite";

import "./taskbarStoryPreview.css";

/** 제품과 보조 결과를 분리하는 Taskbar Storybook 전용 체험 영역이다. */
export const TaskbarPreview = ({
  children,
  results,
  viewport = false,
}: {
  children: ReactNode;
  results?: ReactNode;
  viewport?: boolean;
}) => (
  <>
    <div className={viewport ? "taskbar-story-viewport" : "taskbar-story-surface"}>{children}</div>
    {results ? <div className="taskbar-story-results">{results}</div> : null}
  </>
);

/** 설명은 Canvas와 Docs 모두 체험 영역 아래에 한 번만 표시한다. */
export const withTaskbarDescription: Decorator = (Story, context) => (
  <div className="taskbar-story">
    <Story />
    {context.parameters.taskbarDescription ? (
      <p className="taskbar-story-description">{context.parameters.taskbarDescription}</p>
    ) : null}
  </div>
);
