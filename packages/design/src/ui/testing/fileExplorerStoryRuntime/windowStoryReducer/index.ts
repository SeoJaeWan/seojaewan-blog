import {
  type FileExplorerNavigationValue,
  type FileExplorerTab,
  type FileExplorerTabId,
  parseFileExplorerTabId,
} from "../../../../headless/folders/index.js";
import type {
  FileExplorerWindowSession,
  WindowAction,
  WindowState,
} from "../../../../headless/windows/index.js";

/**
 * Story 안에서 제품 Window Action 결과를 화면 snapshot에 반영하는 전용 reducer를 만든다.
 */
export const createFileExplorerWindowStoryReducer = () => {
  let nextTabSequence = 100;

  /**
   * Exact File Explorer Session 하나에 immutable update를 적용한다.
   */
  const updateSession = (
    state: WindowState,
    sessionId: FileExplorerWindowSession["id"],
    update: (session: FileExplorerWindowSession) => FileExplorerWindowSession,
  ): WindowState => {
    let changed = false;
    const sessions = state.sessions.map((session) => {
      if (session.id !== sessionId || session.kind !== "file-explorer") return session;
      changed = true;
      return update(session);
    });
    return changed ? Object.freeze({ ...state, sessions: Object.freeze(sessions) }) : state;
  };

  /**
   * Exact tab 하나에 immutable update를 적용한다.
   */
  const updateTab = (
    session: FileExplorerWindowSession,
    tabId: FileExplorerTabId,
    update: (tab: FileExplorerTab) => FileExplorerTab,
  ): FileExplorerWindowSession =>
    Object.freeze({
      ...session,
      tabs: Object.freeze(session.tabs.map((tab) => (tab.id === tabId ? update(tab) : tab))),
    });

  return (state: WindowState, input: unknown): WindowState => {
    const action = input as WindowAction;
    switch (action.type) {
      case "add-file-explorer-tab":
        return updateSession(state, action.sessionId, (session) => {
          const id = parseFileExplorerTabId(
            `75000000-0000-4000-8000-${String(nextTabSequence++).padStart(12, "0")}`,
          );
          const tab: FileExplorerTab = Object.freeze({
            id,
            navigation: Object.freeze({
              current: Object.freeze({ location: null, scrollTop: 0 }),
              backStack: Object.freeze([]),
              forwardStack: Object.freeze([]),
            }),
            query: "",
            expandedFolderIds: Object.freeze([]),
            selection: Object.freeze([]),
          });
          return Object.freeze({
            ...session,
            tabs: Object.freeze([...session.tabs, tab]),
            activeTabId: id,
          });
        });
      case "activate-file-explorer-tab":
        return updateSession(state, action.sessionId, (session) =>
          session.tabs.some(({ id }) => id === action.tabId)
            ? Object.freeze({ ...session, activeTabId: action.tabId })
            : session,
        );
      case "close-file-explorer-tab":
        return updateSession(state, action.sessionId, (session) => {
          if (session.tabs.length <= 1) return session;
          const closingIndex = session.tabs.findIndex(({ id }) => id === action.tabId);
          if (closingIndex < 0) return session;
          const tabs = session.tabs.filter(({ id }) => id !== action.tabId);
          const activeTabId =
            session.activeTabId === action.tabId
              ? (tabs[Math.min(closingIndex, tabs.length - 1)]?.id ?? tabs[0].id)
              : session.activeTabId;
          return Object.freeze({ ...session, tabs: Object.freeze(tabs), activeTabId });
        });
      case "navigate-file-explorer":
        return updateSession(state, action.sessionId, (session) => {
          const location: FileExplorerNavigationValue =
            action.target.kind === "location"
              ? action.target.location
              : (action.target as FileExplorerNavigationValue);
          return updateTab(session, action.tabId, (tab) =>
            Object.freeze({
              ...tab,
              navigation: Object.freeze({
                current: Object.freeze({ location, scrollTop: 0 }),
                backStack: Object.freeze([...tab.navigation.backStack, tab.navigation.current]),
                forwardStack: Object.freeze([]),
              }),
              query: "",
              selection: Object.freeze([]),
            }),
          );
        });
      case "go-back-file-explorer":
        return updateSession(state, action.sessionId, (session) =>
          updateTab(session, action.tabId, (tab) => {
            const previous = tab.navigation.backStack.at(-1);
            if (previous === undefined) return tab;
            return Object.freeze({
              ...tab,
              navigation: Object.freeze({
                current: previous,
                backStack: Object.freeze(tab.navigation.backStack.slice(0, -1)),
                forwardStack: Object.freeze([
                  ...tab.navigation.forwardStack,
                  tab.navigation.current,
                ]),
              }),
            });
          }),
        );
      case "go-forward-file-explorer":
        return updateSession(state, action.sessionId, (session) =>
          updateTab(session, action.tabId, (tab) => {
            const next = tab.navigation.forwardStack.at(-1);
            if (next === undefined) return tab;
            return Object.freeze({
              ...tab,
              navigation: Object.freeze({
                current: next,
                backStack: Object.freeze([...tab.navigation.backStack, tab.navigation.current]),
                forwardStack: Object.freeze(tab.navigation.forwardStack.slice(0, -1)),
              }),
            });
          }),
        );
      case "set-file-explorer-query":
        return updateSession(state, action.sessionId, (session) =>
          updateTab(session, action.tabId, (tab) => Object.freeze({ ...tab, query: action.query })),
        );
      case "set-file-explorer-expanded-folder-ids":
        return updateSession(state, action.sessionId, (session) =>
          updateTab(session, action.tabId, (tab) =>
            Object.freeze({
              ...tab,
              expandedFolderIds: Object.freeze([...action.expandedFolderIds]),
            }),
          ),
        );
      case "set-file-explorer-selection":
        return updateSession(state, action.sessionId, (session) =>
          updateTab(session, action.tabId, (tab) =>
            Object.freeze({ ...tab, selection: Object.freeze([...action.selection]) }),
          ),
        );
      case "set-file-explorer-sidebar-width":
        return updateSession(state, action.sessionId, (session) =>
          Object.freeze({ ...session, sidebarWidth: action.sidebarWidth }),
        );
      case "refresh-file-explorer":
        return updateSession(state, action.sessionId, (session) =>
          updateTab(session, action.tabId, (tab) =>
            Object.freeze({
              ...tab,
              query: "",
              selection: Object.freeze([]),
              navigation: Object.freeze({
                ...tab.navigation,
                current: Object.freeze({ ...tab.navigation.current, scrollTop: 0 }),
              }),
            }),
          ),
        );
      default:
        return state;
    }
  };
};
