import type { ComponentPage } from '../../../packages/design-system/src/figma-contract';
import { COMPONENT_PAGES } from './plugin-config';

// 피그마 파일에서 컴포넌트를 내보내는 페이지를 고르는 순수 계산이다.

/**
 * 컴포넌트를 내보내는 페이지인지 이름으로 본다. Controls·Shell·Blog 세 페이지다.
 * @codocs [[디자인 시스템:내보낼 대상]]
 * @param name 페이지 이름
 * @returns 내보내는 페이지면 그 이름, 아니면 null
 */
export function componentPageOf(name: string): ComponentPage | null {
  return COMPONENT_PAGES.find((page) => page === name) ?? null;
}
