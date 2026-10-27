// Chrome 기능의 공개 진입점이다.
export type { ChromeAddressSuggestion } from './components/chrome-address-suggestions/chrome-address-suggestions';
export { ChromeAddressSuggestions } from './components/chrome-address-suggestions/chrome-address-suggestions';
export type {
  ChromePageLatestPost,
  ChromePageLayout,
  ChromePageSearchResult,
  ChromePageTocItem,
} from './components/chrome-page/chrome-page';
export { ChromePage } from './components/chrome-page/chrome-page';
export type { ChromeWindowDevice, ChromeWindowTab } from './components/chrome-window/chrome-window';
export { ChromeWindow } from './components/chrome-window/chrome-window';
export { ChromeWindowLayer } from './components/chrome-window-layer/chrome-window-layer';
export { useBrowserAddressSync } from './hooks/use-browser-address-sync/use-browser-address-sync';
export { useChromeWindowTitle } from './hooks/use-chrome-window-title/use-chrome-window-title';
