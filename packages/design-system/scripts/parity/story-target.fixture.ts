// export.json과 Storybook index.json의 모양을 본뜬 테스트 데이터다.

export const exportFixture = {
  fileKey: 'XV9Y1UT5UH4tC5hSqLVipZ',
  exportedAt: '2026-10-21T00:00:00.000Z',
  scale: 1,
  components: {
    button: {
      name: 'Button',
      nodeId: '13:62',
      hash: 'a',
      variants: {
        'variant=accent,state=rest': {
          nodeId: '13:70',
          properties: { Variant: 'Accent', State: 'Rest' },
          width: 120,
          height: 32,
          renderBounds: { x: 0, y: 0, width: 120, height: 32 },
          hash: 'b',
        },
        'variant=accent,state=hover': {
          nodeId: '13:71',
          properties: { Variant: 'Accent', State: 'Hover' },
          width: 120,
          height: 32,
          renderBounds: { x: -2, y: -2, width: 124, height: 36 },
          hash: 'c',
        },
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
