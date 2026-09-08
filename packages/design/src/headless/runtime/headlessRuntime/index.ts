/**
 * @file Store 구독과 Foundation Operation을 하나의 안정적인 headless runtime으로 조합한다.
 *
 * Store 초기화와 상태 계산은 기존 Store가 소유하며 이 파일은 React나 DOM을 사용하지 않는다.
 */
import type { StartSnapshot } from "../../start/model/index.js";
import {
  type StartAction,
  type StartOperationHandle,
  StartOperations,
  type StartOperationStore,
} from "../../start/operations/index.js";
import { StartStore } from "../../start/startStore/index.js";
import type { TaskbarRootAction, TaskbarRootActionGateway } from "../../taskbar/actions/index.js";
import type { TaskbarSnapshot } from "../../taskbar/model/index.js";
import {
  type TaskbarOperationHandle,
  TaskbarOperations,
  type TaskbarOperationStore,
  type TaskbarPinAction,
} from "../../taskbar/operations/index.js";
import { TaskbarStore } from "../../taskbar/taskbarStore/index.js";
import type { WindowState } from "../../windows/model/index.js";
import {
  type WindowAction,
  type WindowOperationHandle,
  WindowOperations,
  type WindowOperationStore,
} from "../../windows/operations/index.js";
import { WindowStore } from "../../windows/windowStore/index.js";
import type { WorkspaceState } from "../../workspace/model/index.js";
import {
  type WorkspaceAction,
  type WorkspaceOperationHandle,
  WorkspaceOperations,
  type WorkspaceOperationStore,
} from "../../workspace/operations/index.js";
import { WorkspaceStore } from "../../workspace/workspaceStore/index.js";
import { TransitionRegistry } from "../transitionRegistry/index.js";

/** Store의 현재 immutable snapshot을 React 독립적으로 읽고 구독하는 최소 port다. */
export type ExternalStoreReader<Snapshot> = Readonly<{
  /** 현재 commit된 snapshot을 반환하며 초기화 전에는 Store 고유 오류를 던질 수 있다. */
  getSnapshot(): Snapshot;
  /** commit 알림을 등록하고 정확한 구독 해제 함수를 반환한다. */
  subscribe(listener: () => void): () => void;
}>;

/** controller가 Store 준비 여부와 현재 snapshot을 구분해 제공하는 읽기 모델이다. */
export type ControllerViewModel<Snapshot> =
  /** SSR 또는 브라우저 Store 초기화 전이라 아직 사용자 snapshot을 읽지 않았다. */
  | Readonly<{ status: "not-ready"; snapshot: null }>
  /** 브라우저 Store가 초기화되어 현재 immutable snapshot을 읽을 수 있다. */
  | Readonly<{ status: "ready"; snapshot: Snapshot }>;

/** 한 feature의 읽기 모델 구독과 serializable Action 실행을 묶는 runtime channel이다. */
export type HeadlessFeatureRuntime<Snapshot, Action, Handle> = Readonly<{
  /** 같은 Store snapshot에는 같은 View Model 객체를 반환한다. */
  getSnapshot(): ControllerViewModel<Snapshot>;
  /** 서버 render와 hydration 첫 읽기에 함께 쓰는 안정적인 준비 전 View Model을 반환한다. */
  getServerSnapshot(): ControllerViewModel<Snapshot>;
  /** Store commit 알림을 구독하며 cleanup은 제품 Action을 취소하지 않는다. */
  subscribe(listener: () => void): () => void;
  /** serializable Action을 feature Operation으로 보내고 완료 단계별 Handle을 반환한다. */
  execute(action: Action): Handle;
}>;

/** 기본 runtime 대신 연결할 Store port 모음이다. */
export type HeadlessRuntimeAdapters = Readonly<{
  /** Window snapshot, 구독과 명령을 제공하는 adapter다. */
  windows?: ExternalStoreReader<WindowState> & WindowOperationStore;
  /** Workspace snapshot, 구독과 명령을 제공하는 adapter다. */
  workspace?: ExternalStoreReader<WorkspaceState> & WorkspaceOperationStore;
  /** Start snapshot, 구독과 Pin 명령을 제공하는 adapter다. */
  start?: ExternalStoreReader<StartSnapshot> & StartOperationStore;
  /** Taskbar snapshot, 구독과 Pin 명령을 제공하는 adapter다. */
  taskbar?: ExternalStoreReader<TaskbarSnapshot> & TaskbarOperationStore;
}>;

/** runtime 생성 시 Store adapter와 transition registry를 선택하는 입력이다. */
export type HeadlessRuntimeOptions = Readonly<{
  /** 생략한 feature에는 기존 정적 Store를 사용한다. */
  adapters?: HeadlessRuntimeAdapters;
  /** 여러 Foundation Operation과 UI 완료 신호가 공유할 registry다. */
  transitions?: TransitionRegistry;
  /** Taskbar Root의 Windows·Search 요청을 panel 소유자에게 전달하는 단일 gateway다. */
  taskbarRootActionGateway?: TaskbarRootActionGateway;
}>;

/** Provider와 controller가 공유하는 Store 구독, Action gateway와 transition 기반이다. */
export type HeadlessRuntime = Readonly<{
  /** Window snapshot과 WindowAction 실행 channel이다. */
  windows: HeadlessFeatureRuntime<WindowState, WindowAction, WindowOperationHandle>;
  /** Workspace snapshot과 WorkspaceAction 실행 channel이다. */
  workspace: HeadlessFeatureRuntime<WorkspaceState, WorkspaceAction, WorkspaceOperationHandle>;
  /** Start snapshot과 StartAction 실행 channel이다. */
  start: HeadlessFeatureRuntime<StartSnapshot, StartAction, StartOperationHandle>;
  /** Taskbar snapshot과 TaskbarPinAction 실행 channel이다. */
  taskbar: HeadlessFeatureRuntime<TaskbarSnapshot, TaskbarPinAction, TaskbarOperationHandle>;
  /** Taskbar Root 입력을 panel 상태 구현과 분리해 전달하는 Action channel이다. */
  taskbarRoot: TaskbarRootActionGateway;
  /** operation ID와 phase별 UI 완료·중단·실패 신호를 연결한다. */
  transitions: TransitionRegistry;
}>;

/** 연결되지 않은 Root Action이 조용한 no-op이 되지 않도록 명시적으로 거절한다. */
const executeMissingTaskbarRootAction = (_action: TaskbarRootAction): never => {
  throw new Error("Taskbar Root Action Gateway가 연결되지 않았습니다");
};

const missingTaskbarRootActionGateway: TaskbarRootActionGateway = Object.freeze({
  execute: executeMissingTaskbarRootAction,
});

/** 준비 전 controller가 서버와 브라우저 초기화 전까지 공유할 immutable 결과를 만든다. */
const createNotReadyViewModel = <Snapshot>(): ControllerViewModel<Snapshot> =>
  Object.freeze({ status: "not-ready", snapshot: null });

/** Store 고유 초기화 오류만 준비 전 상태로 해석하고 다른 오류는 숨기지 않는다. */
const isNotInitializedError = (error: unknown, expectedName: string): boolean =>
  error instanceof Error && error.name === expectedName;

/** Store snapshot identity를 보존하면서 Operation 실행 channel을 만든다. */
const createFeatureRuntime = <Snapshot, Action, Handle>(
  store: ExternalStoreReader<Snapshot>,
  execute: (action: Action) => Handle,
  notInitializedErrorName: string,
): HeadlessFeatureRuntime<Snapshot, Action, Handle> => {
  const notReady = createNotReadyViewModel<Snapshot>();
  let currentSnapshot: Snapshot | undefined;
  let currentViewModel: ControllerViewModel<Snapshot> = notReady;

  /** 현재 Store snapshot을 읽고 identity가 바뀔 때만 ready View Model을 교체한다. */
  const getSnapshot = (): ControllerViewModel<Snapshot> => {
    try {
      const snapshot = store.getSnapshot();
      if (snapshot !== currentSnapshot) {
        currentSnapshot = snapshot;
        currentViewModel = Object.freeze({ status: "ready", snapshot });
      }
      return currentViewModel;
    } catch (error) {
      if (isNotInitializedError(error, notInitializedErrorName)) return notReady;
      throw error;
    }
  };

  return Object.freeze({
    getSnapshot,
    /** 서버에서는 사용자 singleton을 읽거나 초기화하지 않고 준비 전 결과를 재사용한다. */
    getServerSnapshot: (): ControllerViewModel<Snapshot> => notReady,
    /** Store가 반환한 cleanup을 그대로 사용해 StrictMode 재구독을 누적하지 않는다. */
    subscribe: (listener: () => void): (() => void) => store.subscribe(listener),
    execute,
  });
};

/**
 * 기존 Store와 Foundation Operation을 한 번 조합해 Provider에 전달할 runtime을 만든다.
 *
 * Application은 브라우저 Store 초기화를 마친 뒤 이 함수를 render 바깥에서 한 번 호출한다.
 * 서버 render와 Provider 재마운트는 Store 초기화나 authoritative snapshot 교체를 실행하지 않는다.
 */
export const createHeadlessRuntime = (options: HeadlessRuntimeOptions = {}): HeadlessRuntime => {
  const transitions = options.transitions ?? new TransitionRegistry();
  const windowStore = options.adapters?.windows ?? WindowStore;
  const workspaceStore = options.adapters?.workspace ?? WorkspaceStore;
  const startStore = options.adapters?.start ?? StartStore;
  const taskbarStore = options.adapters?.taskbar ?? TaskbarStore;
  const windowOperations = new WindowOperations({ store: windowStore, transitions });
  const workspaceOperations = new WorkspaceOperations({ store: workspaceStore });
  const startOperations = new StartOperations({ store: startStore, transitions });
  const taskbarOperations = new TaskbarOperations({
    store: taskbarStore,
    windowReader: windowStore,
    transitions,
  });

  return Object.freeze({
    windows: createFeatureRuntime<WindowState, WindowAction, WindowOperationHandle>(
      windowStore,
      (action) => windowOperations.execute(action),
      "WindowStoreNotInitializedError",
    ),
    workspace: createFeatureRuntime<WorkspaceState, WorkspaceAction, WorkspaceOperationHandle>(
      workspaceStore,
      (action) => workspaceOperations.execute(action),
      "WorkspaceStoreNotInitializedError",
    ),
    start: createFeatureRuntime<StartSnapshot, StartAction, StartOperationHandle>(
      startStore,
      (action) => startOperations.execute(action),
      "StartStoreNotInitializedError",
    ),
    taskbar: createFeatureRuntime<TaskbarSnapshot, TaskbarPinAction, TaskbarOperationHandle>(
      taskbarStore,
      (action) => taskbarOperations.execute(action),
      "TaskbarStoreNotInitializedError",
    ),
    taskbarRoot: options.taskbarRootActionGateway ?? missingTaskbarRootActionGateway,
    transitions,
  });
};
