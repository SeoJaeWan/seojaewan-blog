"use client";

import { useRef, useState } from "react";

import { ChevronLeft12Regular, Document20Regular } from "@fluentui/react-icons";
import { clsx } from "clsx";

import { ButtonUI } from "../../primitives";
import type { WindowsPanelAllViewUIProps } from "./taskbarUI.types";

import "./taskbarUI.css";

/** Start panel의 All list와 family-local category jump overlay를 생산한다. */
export const WindowsPanelAllViewUI = ({
  active = true,
  categoryOverlayOpen,
  className,
  defaultCategoryOverlayOpen = false,
  onCategoryOverlayOpenChange,
  onItemSelect,
  onShowPinned,
  sections = [],
  ...props
}: WindowsPanelAllViewUIProps) => {
  const [uncontrolledOverlayOpen, setUncontrolledOverlayOpen] = useState(
    defaultCategoryOverlayOpen,
  );
  const listRef = useRef<HTMLDivElement>(null);
  const controlled = categoryOverlayOpen !== undefined;
  const overlayOpen = controlled ? categoryOverlayOpen : uncontrolledOverlayOpen;

  const setOverlayOpen = (open: boolean) => {
    if (!controlled) setUncontrolledOverlayOpen(open);
    onCategoryOverlayOpenChange?.(open);
  };

  const selectCategory = (category: string) => {
    setOverlayOpen(false);
    requestAnimationFrame(() => {
      const categoryTarget = [
        ...(listRef.current?.querySelectorAll<HTMLElement>("[data-taskbar-category]") ?? []),
      ].find((element) => element.dataset.taskbarCategory === category);
      categoryTarget?.scrollIntoView({ block: "start" });
    });
  };

  return (
    <section
      {...props}
      aria-hidden={!active || undefined}
      className={clsx("wd-windows-panel-view-ui", "wd-windows-panel-all-view-ui", className)}
      inert={!active}
    >
      <header className="wd-windows-panel-view-ui__header">
        <h2>모두</h2>
        <ButtonUI className="wd-windows-panel-view-ui__toggle" onClick={onShowPinned}>
          뒤로 <ChevronLeft12Regular aria-hidden="true" />
        </ButtonUI>
      </header>
      <div className="wd-windows-panel-all-view-ui__body">
        <div
          aria-label="카테고리 이동"
          className="wd-windows-panel-all-view-ui__category-overlay"
          data-open={overlayOpen || undefined}
          inert={!overlayOpen}
          role="group"
        >
          <div className="wd-windows-panel-all-view-ui__category-grid">
            {sections.map((section) => (
              <ButtonUI key={section.category} onClick={() => selectCategory(section.category)}>
                {section.category}
              </ButtonUI>
            ))}
          </div>
        </div>
        <div
          ref={listRef}
          aria-label="모든 항목"
          className="wd-windows-panel-all-view-ui__list"
          inert={overlayOpen}
          role="group"
        >
          {sections.map((section) => (
            <section key={section.category}>
              <ButtonUI
                className="wd-windows-panel-all-view-ui__category"
                data-taskbar-category={section.category}
                onClick={() => setOverlayOpen(true)}
              >
                {section.category}
              </ButtonUI>
              {section.entries.map((item) => (
                <ButtonUI
                  key={item.value}
                  className="wd-windows-panel-all-view-ui__item"
                  disabled={item.disabled}
                  onClick={() => onItemSelect?.(item.value)}
                >
                  <span aria-hidden="true" className="wd-windows-panel-all-view-ui__item-icon">
                    {item.icon ?? <Document20Regular />}
                  </span>
                  {item.label}
                </ButtonUI>
              ))}
            </section>
          ))}
        </div>
      </div>
    </section>
  );
};
