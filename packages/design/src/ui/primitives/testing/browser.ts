export const nextBrowserFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });

export const getActiveHTMLElement = () =>
  document.activeElement instanceof HTMLElement ? document.activeElement : null;
