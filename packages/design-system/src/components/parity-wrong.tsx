import type { JSX } from 'react';

// 임시: 피그마 일치 검사가 일부러 틀린 버전을 잡는지 확인한다. STORYBOOK_PARITY_WRONG로 고른다.
const WRONG_CSS = {
  button: {
    padding: '#storybook-root > button { padding-left: 13px !important; }',
    color: `#storybook-root > button { background-color: var(--wrong-bg) !important; }
      #storybook-root > button.bg-accent-fill-default { --wrong-bg: var(--color-accent-fill-secondary); }
      #storybook-root > button.bg-control-fill-default { --wrong-bg: var(--color-control-fill-secondary); }
      #storybook-root > button.bg-subtle-fill-transparent { --wrong-bg: var(--color-subtle-fill-secondary); }`,
    radius: '#storybook-root > button { border-radius: 5px !important; }',
  },
  'menu-item': {
    padding: '[data-parity-target] [role^="menuitem"] > span { padding-left: 13px !important; }',
    color:
      '[data-parity-target] [role^="menuitem"] .type-body { color: var(--color-text-fill-secondary) !important; }',
    radius: '[data-parity-target] [role^="menuitem"] > span { border-radius: 5px !important; }',
  },
  flyout: {
    padding: '#storybook-root > div:first-child { padding-left: 17px !important; }',
    color:
      '#storybook-root > div:first-child { background-color: var(--color-solid-background-fill-quinary) !important; }',
    radius: '#storybook-root > div:first-child { border-radius: 9px !important; }',
  },
  'search-box': {
    padding: `#storybook-root > div.rounded-control:first-child { padding-left: 13px !important; }
      #storybook-root > div.rounded-circular:first-child { padding-left: 17px !important; }`,
    color:
      '#storybook-root > div:first-child { background-color: var(--color-control-fill-secondary) !important; }',
    radius: '#storybook-root > div.rounded-control:first-child { border-radius: 5px !important; }',
  },
} as const;

/**
 * 임시: 고른 틀린 버전의 CSS를 넣는다.
 * @param props
 * @param props.component 컴포넌트 폴더 이름
 */
export function ParityWrong(props: { component: keyof typeof WRONG_CSS }): JSX.Element | null {
  const wrong: unknown = import.meta.env.STORYBOOK_PARITY_WRONG;
  if (wrong !== 'padding' && wrong !== 'color' && wrong !== 'radius') {
    return null;
  }
  return <style>{WRONG_CSS[props.component][wrong]}</style>;
}
