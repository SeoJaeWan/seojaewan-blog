import type { ComponentSchema } from '../../src/figma-export/component-schema.ts';
import {
  type BehaviorSource,
  ComponentGenerationError,
  type ComponentModel,
  type GenerationContext,
  readComponent,
} from './component-model.ts';
import { componentFileName } from './component-naming.ts';
import { type CodePaths, combinedCode, skinCode } from './skin-code.ts';
import { skinCss, type TokenCatalog } from './skin-style.ts';
import { layersCode, storyCode } from './story-code.ts';

// 스키마 전체에서 컴포넌트마다의 생성 파일을 만든다. 파일을 읽고 쓰지 않는 순수한 부분이다.

/**
 * 생성 파일 하나.
 * - folder: 컴포넌트 폴더 이름(`button`)
 * - name: 파일 이름(`button.skin.gen.tsx`)
 * - text: 내용
 */
export type GeneratedFile = { folder: string; name: string; text: string };

/**
 * 생성에 쓰는 것.
 * - behaviors: 동작 등록부
 * - tokens: 토큰 정보
 * - paths: 컴포넌트 폴더에서 다른 파일까지의 경로
 */
export type GenerationOptions = {
  behaviors: BehaviorSource;
  tokens: TokenCatalog;
  paths: CodePaths;
};

/**
 * 스키마마다 스킨, 합친 컴포넌트, 스킨 CSS, 스토리, 짝 표를 만든다.
 * @codocs [[디자인 시스템:세 겹]]
 * @codocs [[디자인 시스템:스키마]]
 * @param schemas 모든 컴포넌트 스키마. 품은 컴포넌트를 찾는 데도 쓴다
 * @param options 생성에 쓰는 것
 * @returns 생성 파일
 */
export function componentFiles(
  schemas: readonly ComponentSchema[],
  options: GenerationOptions,
): GeneratedFile[] {
  const byName = new Map(schemas.map((schema) => [schema.name, schema]));
  const models = new Map<string, ComponentModel>();
  const context: GenerationContext = {
    behaviors: options.behaviors,
    modelOf: (name) => {
      const cached = models.get(name);
      if (cached !== undefined) {
        return cached;
      }
      const schema = byName.get(name);
      if (schema === undefined) {
        throw new ComponentGenerationError(
          name,
          '품은 컴포넌트의 스키마가 없다. 안쪽 컴포넌트를 먼저 내보낸다.',
        );
      }
      const model = readComponent(schema, context);
      models.set(name, model);
      return model;
    },
  };
  return schemas.flatMap(
    /**
     * 스키마 하나의 생성 파일을 만든다.
     * @param schema 스키마
     */
    (schema) => {
      const model = context.modelOf(schema.name);
      const folder = componentFileName(schema.name);
      const tokensPath = `${options.paths.source}/tokens.css`;
      return [
        {
          folder,
          name: `${folder}.gen.css`,
          text: skinCss(model, context, options.tokens, tokensPath),
        },
        { folder, name: `${folder}.skin.gen.tsx`, text: skinCode(model, context, options.paths) },
        { folder, name: `${folder}.gen.tsx`, text: combinedCode(model, context) },
        { folder, name: `${folder}.gen.stories.tsx`, text: storyCode(model, context) },
        {
          folder,
          name: `${folder}.layers.gen.ts`,
          text: layersCode(model, context, options.paths),
        },
      ];
    },
  );
}

/**
 * tokens.css 글에서 효과 스타일이 어느 클래스로 옮겨지는지 읽는다. `surface-*` 유틸리티가 있으면 그림자와
 * 배경 흐림을 함께 거는 재질 표면이고, 값이 길이 하나면 배경 흐림, 아니면 그림자다.
 * @codocs [[디자인 시스템:토큰 생성]]
 * @param tokensCss tokens.css 글
 * @returns 토큰 정보
 */
export function tokenCatalog(tokensCss: string): TokenCatalog {
  const utilities = new Set(
    [...tokensCss.matchAll(/^@utility ([a-z0-9-]+) \{/gmu)].map((match) => match[1]),
  );
  const values = new Map(
    [...tokensCss.matchAll(/^\s+--([a-z0-9-]+):\s*([^;]+);/gmu)].map((match) => [
      match[1],
      match[2],
    ]),
  );
  return {
    effectKind: (token) => {
      if (utilities.has(token) && token.startsWith('surface-')) {
        return 'surface';
      }
      const value = values.get(token)?.trim() ?? '';
      return /^[0-9.]+px$/u.test(value) ? 'backdrop-blur' : 'shadow';
    },
  };
}
