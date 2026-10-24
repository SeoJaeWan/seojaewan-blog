// export.json과 Storybook index.json의 모양을 본뜬 테스트 데이터다.

export const manifestFixture = {
  name: 'Button',
  nodeId: '13:62',
  variants: {
    'style=accent,state=rest': {
      nodeId: '13:70',
      properties: { Style: 'Accent', State: 'Rest' },
      node: { x: 8, y: 4, width: 120, height: 32 },
    },
    'style=accent,state=hover': {
      nodeId: '13:71',
      properties: { Style: 'Accent', State: 'Hover' },
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
      importPath: './src/components/button/button.stories.tsx',
      type: 'story',
    },
    'components-button--docs': {
      id: 'components-button--docs',
      title: 'Components/Button',
      name: 'Docs',
      importPath: './src/components/button/button.stories.tsx',
      type: 'docs',
    },
    'components-menu-item--default': {
      id: 'components-menu-item--default',
      title: 'Components/MenuItem',
      name: 'Default',
      importPath: './src/components/menu-item/menu-item.stories.tsx',
      type: 'story',
    },
    'patterns-menu-folder--default': {
      id: 'patterns-menu-folder--default',
      title: 'Patterns/Menu/Folder',
      name: 'Default',
      importPath: './src/features/desktop/menu-folder.stories.tsx',
      type: 'story',
    },
    'patterns-start-power-button--parity': {
      id: 'patterns-start-power-button--parity',
      title: 'Patterns/Start/PowerButton',
      name: 'Parity',
      importPath: './src/features/start-menu/power-button.stories.tsx',
      type: 'story',
    },
    'patterns-start-power-button--interactive': {
      id: 'patterns-start-power-button--interactive',
      title: 'Patterns/Start/PowerButton',
      name: 'Interactive',
      importPath: './src/features/start-menu/power-button.stories.tsx',
      type: 'story',
    },
  },
};
