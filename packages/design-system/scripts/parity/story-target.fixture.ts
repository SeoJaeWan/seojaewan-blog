// figma.json, 컴포넌트 export.json, Storybook index.json의 모양을 본뜬 테스트 데이터다.

// 변형 루트만 있는 레이어 정보다.
const rootLayers = [
  { path: '', kind: 'frame', type: 'COMPONENT', x: 0, y: 0, width: 120, height: 32 },
];

export const settingsFixture = { fileKey: 'XV9Y1UT5UH4tC5hSqLVipZ', scale: 1 };

export const componentsFixture = {
  button: {
    name: 'Button',
    nodeId: '13:62',
    hash: 'a',
    exportedAt: '2026-10-21T00:00:00.000Z',
    variants: {
      'variant=accent,state=rest': {
        nodeId: '13:70',
        properties: { Variant: 'Accent', State: 'Rest' },
        width: 120,
        height: 32,
        renderBounds: { x: 0, y: 0, width: 120, height: 32 },
        hash: 'b',
        layers: rootLayers,
      },
      'variant=accent,state=hover': {
        nodeId: '13:71',
        properties: { Variant: 'Accent', State: 'Hover' },
        width: 120,
        height: 32,
        renderBounds: { x: -2, y: -2, width: 124, height: 36 },
        hash: 'c',
        layers: rootLayers,
      },
    },
  },
};

export const storybookIndexFixture = {
  v: 5,
  entries: {
    'components-button--parity': {
      id: 'components-button--parity',
      title: 'Components/Button',
      name: 'Parity',
      exportName: 'Parity',
      importPath: './src/components/button/button.stories.tsx',
      type: 'story',
    },
    'components-button--default': {
      id: 'components-button--default',
      title: 'Components/Button',
      name: 'Default',
      exportName: 'Default',
      importPath: './src/components/button/button.stories.tsx',
      type: 'story',
    },
    'components-menu-item--default': {
      id: 'components-menu-item--default',
      title: 'Components/MenuItem',
      name: 'Default',
      exportName: 'Default',
      importPath: './src/components/menu-item/menu-item.stories.tsx',
      type: 'story',
    },
  },
};
