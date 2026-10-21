/**
 * 피그마 일치 검사의 결정 사항(D1~D9)을 한곳에 모은다. 플러그인의 구조 검사와 비교 도구가 함께 읽는다.
 * 결정이 바뀌면 이 파일만 고친다. 각 값의 근거는 [[피그마 일치 검사:결정 사항]]에 있다.
 * 다른 모듈을 import하지 않는다(플러그인 번들과 Node 스크립트 양쪽에서 읽기 때문이다).
 */

/** 결정 사항 설정의 모양. 값을 바꿔도 코드가 그대로 동작하도록 리터럴이 아닌 타입으로 둔다. */
export type ParityDecisions = {
  d1: { allowAbsoluteInAutoLayout: boolean; insetTokenPattern: string; allowManualLayout: boolean };
  d2: {
    compareStyleNames: boolean;
    comparePlatformFonts: boolean;
    styleVariableFields: readonly string[];
  };
  d3: { compareCharacters: boolean };
  d4: {
    exportHidden: boolean;
    exportBooleanCases: boolean;
    blockAlwaysHiddenWithoutProperty: boolean;
    blockShownByInstanceOverride: boolean;
    failWhenHiddenLayerVisible: boolean;
  };
  d5: { allowShadowBehindNode: boolean };
  d6: {
    allowFullEllipse: boolean;
    assetGroupPrefix: string;
    assetGroups: Readonly<Record<string, 'mono' | 'color' | 'raster'>>;
  };
  d7: { allowGrid: boolean };
  d8: { requireBoundFixedSize: boolean; requireBoundRootSize: boolean };
  d9: { allowedRotations: Readonly<Record<string, string>> };
  paintStyleLayers: { rawBlendLayerColor: 'block' | 'notice' };
};

// @codocs [[피그마 일치 검사:결정 사항]]
export const parityDecisions: ParityDecisions = {
  /**
   * D1 절대 위치. 자동 배치 안의 ABSOLUTE만 허용하고, 제약(MIN/MAX/STRETCH/CENTER)을 위치 클래스로 대응한다.
   * 거리 값은 숫자 이름 간격 토큰(`spacing/<숫자>`)에서만 값으로 이름을 찾는다. 음수는 같은 토큰의 음수 클래스다.
   * 단계에 없는 값, 제약 SCALE, 수동 배치(자동 배치가 아닌 프레임의 자식)는 막는다.
   * 포커스 테두리·밑줄 같은 장식은 겹쳐 놓지 않고 효과 스타일로 그린다.
   */
  d1: {
    allowAbsoluteInAutoLayout: true,
    insetTokenPattern: '^spacing/(\\d+)$',
    allowManualLayout: false,
  },
  /**
   * D2 글자 스타일. 스타일 이름(Hangul/* 등)은 대응시키지 않는다.
   * 서체는 글자마다 실제로 그린 서체 이름을 비교하고(공백 문자 제외),
   * 크기·줄 높이·굵기·자간은 구간 글자 스타일에 연결된 변수가 코드 type-* 유틸리티가 쓰는 변수와 같은지 비교한다.
   */
  d2: {
    compareStyleNames: false,
    comparePlatformFonts: true,
    styleVariableFields: ['fontSize', 'lineHeight', 'fontWeight', 'letterSpacing'],
  },
  /** D3 글자 내용. 정확히 비교한다(스토리는 피그마 예시 글자를 그대로 쓴다). */
  d3: { compareCharacters: true },
  /**
   * D4 숨김 노드. 숨김 노드는 내보내지 않고, 그 변형에서 숨김인 레이어의 요소가 화면에 보이면 실패한다.
   * (a) BOOLEAN 컴포넌트 속성으로 켜는 레이어는 변형마다 속성을 하나씩 바꾼 경우를 함께 내보내 비교한다.
   *     속성 이름은 키의 #id를 떼고 camelCase로 바꾼 React prop 이름이 된다(Show icon → showIcon).
   * (b) 변형마다 보이고 안 보이는 레이어는 변형 그대로 비교한다.
   * (c) 모든 변형에서 숨김이고 속성도 없는 레이어는 막는다.
   * (d) 속성 없이 숨겼는데 파일의 인스턴스에서 켜서 쓰는 레이어는 막는다.
   */
  d4: {
    exportHidden: false,
    exportBooleanCases: true,
    blockAlwaysHiddenWithoutProperty: true,
    blockShownByInstanceOverride: true,
    failWhenHiddenLayerVisible: true,
  },
  /**
   * D5 그림자 showShadowBehindNode. CSS box-shadow는 요소 안쪽에 그리지 않으므로 true인 그림자는 막는다.
   * 비교는 효과 스타일 이름과 box-shadow 계산값이다.
   */
  d5: { allowShadowBehindNode: false },
  /**
   * D6 CSS로 그릴 수 없는 모양과 이미지는 모두 Foundations 자산 컴포넌트로 만들어 인스턴스로 쓴다.
   * 원본 컴포넌트를 담은 묶음 프레임(`group/<묶음>`, Foundations / Assets 안) 이름이 처리 방식을 정한다. 컴포넌트 안에 직접 그린
   * 호·별·다각형·선·불리언·벡터는 막고, 완전한 원과 사각형만 허용한다.
   * mono: 한 가지 색 SVG(색은 currentColor, 색 변수 이름을 기록), color: 여러 색 SVG, raster: 래스터 이미지
   */
  d6: {
    allowFullEllipse: true,
    assetGroupPrefix: 'group/',
    assetGroups: { Icons: 'mono', Shapes: 'mono', Illustrations: 'color', Images: 'raster' },
  },
  /** D7 GRID 자동 배치. 막는다. */
  d7: { allowGrid: false },
  /** D8 고정 크기. 루트와 내부 모두 크기 변수 연결을 강제한다(인스턴스 크기 덮어쓰기 포함). */
  d8: { requireBoundFixedSize: true, requireBoundRootSize: true },
  /** D9 회전. 90° 배수만 허용한다. 각도(피그마, 반시계 양수) → 클래스다. */
  d9: {
    allowedRotations: {
      '0': '',
      '90': '-rotate-90',
      '-90': 'rotate-90',
      '180': 'rotate-180',
      '-180': 'rotate-180',
    },
  },
  /**
   * 칠 스타일 안의 층 색은 색 변수에 연결해야 하고 날값이면 막는다. 다만 블렌드 모드가 NORMAL이 아닌 단색 층은
   * 피그마 API에서 변수에 연결하면 블렌드가 NORMAL로 고정되어 연결할 수 없다(2026-10 확인).
   * 이런 층의 날값을 막을지('block') 알림만 할지('notice')는 사용자 결정 대기다. 결정 전까지 알림만 한다.
   */
  paintStyleLayers: { rawBlendLayerColor: 'notice' },
};
