/**
 * 다시 시작 단계.
 * - `idle`: 다시 시작하지 않는 중이다.
 * - `covering`: 재부팅 화면이 페이드 인하며 화면을 덮는 중이다.
 * - `showing`: 화면을 다 덮었고, 상태를 지운 뒤 재부팅 화면을 정해진 시간 동안 보여 주는 중이다.
 * - `revealing`: 재부팅 화면이 페이드 아웃하며 처음 상태의 바탕화면을 드러내는 중이다.
 */
export type RestartPhase = 'idle' | 'covering' | 'showing' | 'revealing';

/** 다시 시작의 진행. 단계와 데스크톱 하위 트리의 세대 번호다 */
export type RestartState = {
  /** 다시 시작 단계 */
  phase: RestartPhase;
  /** 데스크톱 하위 트리의 `key`. 다시 시작할 때마다 올라가 하위 트리를 다시 마운트한다 */
  generation: number;
};

/** 처음 상태. 다시 시작하지 않는 중이고 세대는 0이다 */
export const initialRestartState: RestartState = { phase: 'idle', generation: 0 };

/**
 * 전원 메뉴의 `다시 시작`을 눌렀을 때의 상태. 재부팅 화면이 덮기 시작한다. 다시 시작하는 중이면 그대로다.
 * @codocs [[작업 공간:다시 시작]]
 * @param state 지금 상태
 * @returns 바뀐 상태
 */
export function startRestart(state: RestartState): RestartState {
  return state.phase === 'idle' ? { ...state, phase: 'covering' } : state;
}

/**
 * 재부팅 화면이 화면을 다 덮었을 때의 상태. 세대를 올려 데스크톱 하위 트리를 다시 마운트하고 재부팅 화면을 보여 준다.
 * 덮는 중이 아니면 그대로다. 저장소를 지우는 일은 이 상태로 넘어갈 때 저장소가 한다.
 * @codocs [[작업 공간:다시 시작]]
 * @param state 지금 상태
 * @returns 바뀐 상태
 */
export function finishRestartCovering(state: RestartState): RestartState {
  return state.phase === 'covering'
    ? { phase: 'showing', generation: state.generation + 1 }
    : state;
}

/**
 * 재부팅 화면을 보여 주는 시간이 지났을 때의 상태. 재부팅 화면이 사라지기 시작한다. 보여 주는 중이 아니면 그대로다.
 * @codocs [[작업 공간:다시 시작]]
 * @param state 지금 상태
 * @returns 바뀐 상태
 */
export function finishRestartShowing(state: RestartState): RestartState {
  return state.phase === 'showing' ? { ...state, phase: 'revealing' } : state;
}

/**
 * 재부팅 화면이 사라졌을 때의 상태. 다시 시작이 끝난다. 사라지는 중이 아니면 그대로다.
 * @codocs [[작업 공간:다시 시작]]
 * @param state 지금 상태
 * @returns 바뀐 상태
 */
export function finishRestartRevealing(state: RestartState): RestartState {
  return state.phase === 'revealing' ? { ...state, phase: 'idle' } : state;
}
