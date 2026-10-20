import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettierConfig from 'eslint-config-prettier/flat';
import betterTailwindcss from 'eslint-plugin-better-tailwindcss';
import boundaries from 'eslint-plugin-boundaries';
import checkFile from 'eslint-plugin-check-file';
import jsdoc from 'eslint-plugin-jsdoc';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import storybook from 'eslint-plugin-storybook';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const rootDir = import.meta.dirname;

const tsFiles = ['**/*.{ts,tsx}'];
const WEB_SRC = 'apps/web/src';
const DESIGN_SYSTEM = 'packages/design-system';

// 테스트·fixture·스토리 파일. JSDoc 규칙에서 제외한다.
const testLikeFiles = [
  '**/*.test.{ts,tsx}',
  '**/*.fixture.{ts,tsx}',
  '**/*.stories.{ts,tsx}',
  'apps/web/e2e/**',
  '**/vitest.setup.ts',
];

// 도구가 default export를 요구하는 파일.
const defaultExportFiles = [
  // Next.js 예약 파일
  `${WEB_SRC}/app/**/{page,layout,template,default,loading,error,global-error,not-found,global-not-found,forbidden,unauthorized}.tsx`,
  `${WEB_SRC}/app/**/{opengraph-image,twitter-image,icon,apple-icon,sitemap,robots,manifest}.{ts,tsx}`,
  // 설정 파일
  '**/*.config.{ts,mjs,js,cjs}',
  '**/.storybook/{main,preview}.{ts,tsx}',
  // Storybook CSF는 meta를 default export로 요구한다
  '**/*.stories.{ts,tsx}',
];

// 도구가 이름을 정하거나 process.env를 직접 읽어야 하는 파일.
const configFiles = ['**/*.config.{ts,mjs,js,cjs}', '**/.storybook/**', 'scripts/**'];

// @codocs [[코드 작성 규칙:식별자 이름]]
// 상수는 모듈 최상위에서 리터럴이나 `as const`로 초기화한 const다. 그 밖의 값은 camelCase다.
const CONSTANT_INIT = 'init.type=/^(Literal|TemplateLiteral|UnaryExpression)$/';
const AS_CONST_INIT = 'init.type="TSAsExpression"][init.typeAnnotation.typeName.name="const"';
const UPPER_SNAKE = 'name=/^[A-Z][A-Z0-9_]*$/';
const CONSTANT_MESSAGE = '모듈 최상위의 고정 값 상수는 UPPER_SNAKE_CASE로 쓴다.';
const COMPUTED_MESSAGE =
  '계산 값(함수 호출 결과, 객체·배열 등)은 UPPER_SNAKE_CASE가 아니라 camelCase로 쓴다.';
const topLevelConst = [
  'Program > VariableDeclaration[kind="const"]',
  'Program > ExportNamedDeclaration > VariableDeclaration[kind="const"]',
];
const namingSyntaxRestrictions = [
  ...topLevelConst.flatMap((declaration) => [
    {
      selector: `${declaration} > VariableDeclarator[${CONSTANT_INIT}] > Identifier.id:not([${UPPER_SNAKE}])`,
      message: CONSTANT_MESSAGE,
    },
    {
      selector: `${declaration} > VariableDeclarator[${AS_CONST_INIT}] > Identifier.id:not([${UPPER_SNAKE}])`,
      message: CONSTANT_MESSAGE,
    },
    {
      selector: `${declaration} > VariableDeclarator:not([${CONSTANT_INIT}]):not([${AS_CONST_INIT}]) > Identifier.id[name=/^[A-Z][A-Z0-9_]+$/]`,
      message: COMPUTED_MESSAGE,
    },
  ]),
  {
    selector: ':function VariableDeclarator > Identifier.id[name=/^[A-Z][A-Z0-9_]+$/]',
    message: '함수 안의 값은 camelCase로 쓴다.',
  },
];

// @codocs [[코드 작성 규칙:export와 import]]
// named export만 쓴다. 예외는 defaultExportFiles에서 경로 단위로 둔다.
const defaultExportRestrictions = [
  {
    selector: 'ExportDefaultDeclaration',
    message: 'named export만 쓴다. default export는 Next.js 예약 파일과 설정 파일에서만 허용한다.',
  },
  {
    selector: 'ExportNamedDeclaration > ExportSpecifier[exported.name="default"]',
    message: 'named export만 쓴다. default export는 Next.js 예약 파일과 설정 파일에서만 허용한다.',
  },
];

// @codocs [[코드 작성 규칙:React와 Next.js]]
// React Compiler가 메모이제이션을 맡으므로 직접 쓰지 않는다. 측정된 예외는 경로 단위 override로 둔다.
const memoImportRestriction = {
  name: 'react',
  importNames: ['useMemo', 'useCallback', 'memo'],
  message: 'React Compiler가 메모이제이션을 맡는다. useMemo·useCallback·memo는 직접 쓰지 않는다.',
};
const memoPropertyRestrictions = ['useMemo', 'useCallback', 'memo'].map((property) => ({
  object: 'React',
  property,
  message: 'React Compiler가 메모이제이션을 맡는다. useMemo·useCallback·memo는 직접 쓰지 않는다.',
}));
const processEnvRestriction = {
  object: 'process',
  property: 'env',
  message: '환경 변수는 Zod로 검증하는 env 모듈(apps/web/src/env.ts)에서만 읽는다.',
};

/**
 * 공통 import 제한에 경로별 패턴을 더한 no-restricted-imports 옵션을 만든다.
 * @param patterns 추가로 막을 import 패턴
 * @returns no-restricted-imports 규칙 설정
 */
function restrictedImports(patterns) {
  return ['error', { paths: [memoImportRestriction], patterns }];
}

/**
 * 공통 문법 제한에 경로별 제한을 더한 no-restricted-syntax 옵션을 만든다.
 * @param restrictions 추가로 막을 문법 선택자 목록
 * @returns no-restricted-syntax 규칙 설정
 */
function restrictedSyntax(restrictions) {
  return ['error', ...namingSyntaxRestrictions, ...restrictions];
}

/**
 * 공통 속성 제한에 경로별 제한을 더한 no-restricted-properties 옵션을 만든다.
 * @param restrictions 추가로 막을 속성 목록
 * @returns no-restricted-properties 규칙 설정
 */
function restrictedProperties(restrictions) {
  return ['error', ...memoPropertyRestrictions, ...restrictions];
}

export default defineConfig(
  globalIgnores([
    '.codocs/**',
    '**/node_modules/**',
    '**/.next/**',
    '**/.turbo/**',
    '**/dist/**',
    '**/storybook-static/**',
    '**/playwright-report/**',
    '**/test-results/**',
    '**/coverage/**',
    '**/next-env.d.ts',
  ]),

  // @codocs [[개발 컨벤션:강제 방식]]
  // 규칙 예외는 인라인 주석이 아니라 이 설정 파일에서 경로 단위로 둔다.
  // 인라인 eslint 주석은 무시되고 경고가 나며, lint는 --max-warnings=0으로 실행한다.
  {
    linterOptions: {
      noInlineConfig: true,
      reportUnusedDisableDirectives: 'error',
    },
  },

  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.mjs', 'scripts/*.mjs', 'apps/web/*.mjs'],
        },
        tsconfigRootDir: rootDir,
      },
    },
  },

  // 공통 규칙: 이름, 함수, import·export, 타입
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
      'check-file': checkFile,
    },
    rules: {
      // @codocs [[코드 작성 규칙:함수]]
      'func-style': ['error', 'declaration'],
      'prefer-arrow-callback': 'error',

      // @codocs [[코드 작성 규칙:식별자 이름]]
      'no-restricted-syntax': restrictedSyntax(defaultExportRestrictions),

      // @codocs [[코드 작성 규칙:export와 import]]
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^\\u0000'],
            ['^node:', '^@?\\w'],
            ['^@seojaewan/design-system(/.*)?$'],
            ['^@/'],
            ['^\\.'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',
      'no-restricted-imports': restrictedImports([]),
      'no-restricted-properties': restrictedProperties([processEnvRestriction]),

      // @codocs [[코드 작성 규칙:파일과 폴더 이름]]
      'check-file/filename-naming-convention': [
        'error',
        { '**/*.{ts,tsx,js,mjs,cjs}': 'KEBAB_CASE' },
        { ignoreMiddleExtensions: true },
      ],
      'check-file/folder-naming-convention': [
        'error',
        {
          'apps/web/src/app/**/': 'NEXT_JS_APP_ROUTER_CASE',
          'apps/web/src/!(app)/**/': 'KEBAB_CASE',
          'apps/web/e2e/**/': 'KEBAB_CASE',
          'packages/*/src/**/': 'KEBAB_CASE',
          'scripts/**/': 'KEBAB_CASE',
        },
      ],
      'check-file/no-index': ['error', { ignoreMiddleExtensions: true }],
    },
  },
  {
    files: tsFiles,
    rules: {
      // @codocs [[코드 작성 규칙:식별자 이름]]
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'default', format: ['camelCase'], leadingUnderscore: 'allow' },
        { selector: 'import', format: ['camelCase', 'PascalCase'] },
        { selector: 'variable', format: ['camelCase'] },
        // 모듈 최상위 상수. 어떤 값이 상수인지는 no-restricted-syntax가 초기값으로 판단한다.
        {
          selector: 'variable',
          modifiers: ['const', 'global'],
          format: ['camelCase', 'UPPER_CASE'],
        },
        // 함수 선언. 컴포넌트는 PascalCase다.
        { selector: 'function', format: ['camelCase', 'PascalCase'] },
        // boolean은 is·has·can·should로 시작한다. 구조 분해한 props는 HTML 속성 이름(open, disabled)을 따를 수 있어 제외한다.
        {
          selector: ['variable', 'parameter'],
          types: ['boolean'],
          format: ['PascalCase', 'UPPER_CASE'],
          prefix: ['is', 'has', 'can', 'should', 'IS_', 'HAS_', 'CAN_', 'SHOULD_'],
        },
        {
          selector: ['variable', 'parameter'],
          modifiers: ['destructured'],
          format: null,
        },
        { selector: 'typeLike', format: ['PascalCase'] },
        {
          selector: ['interface', 'typeAlias'],
          format: ['PascalCase'],
          custom: { regex: '^I[A-Z]', match: false },
        },
        { selector: 'typeParameter', format: ['PascalCase'] },
        { selector: 'enumMember', format: ['PascalCase'] },
        // 객체 리터럴 키는 외부 API·HTTP 헤더 모양을 따르므로 검사하지 않는다.
        { selector: 'objectLiteralProperty', format: null },
        { selector: ['typeProperty', 'objectLiteralMethod'], format: ['camelCase'] },
        {
          selector: ['typeProperty', 'objectLiteralProperty'],
          modifiers: ['requiresQuotes'],
          format: null,
        },
      ],

      // @codocs [[코드 작성 규칙:타입]]
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: false }],
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'as', objectLiteralTypeAssertions: 'never' },
      ],

      // @codocs [[코드 작성 규칙:export와 import]]
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      '@typescript-eslint/no-import-type-side-effects': 'error',
    },
  },

  // @codocs [[코드 작성 규칙:JSDoc]]
  {
    files: tsFiles,
    ignores: testLikeFiles,
    extends: [jsdoc.configs['flat/recommended-typescript-error']],
    rules: {
      'jsdoc/require-jsdoc': [
        'error',
        {
          publicOnly: false,
          require: {
            FunctionDeclaration: true,
            MethodDefinition: true,
            ClassDeclaration: false,
            ArrowFunctionExpression: false,
            FunctionExpression: false,
          },
          contexts: [
            // 5줄 이상인 콜백
            { context: 'CallExpression > ArrowFunctionExpression', minLineCount: 5 },
            { context: 'CallExpression > FunctionExpression', minLineCount: 5 },
            { context: 'JSXExpressionContainer > ArrowFunctionExpression', minLineCount: 5 },
            // 컴포넌트 props 타입의 각 속성
            'TSTypeAliasDeclaration[id.name=/Props$/] TSPropertySignature',
          ],
        },
      ],
      'jsdoc/require-description': 'error',
      'jsdoc/require-param': ['error', { checkDestructured: false }],
      // 컴포넌트 함수는 `@param props` 한 줄만 둔다(설명은 Props 타입의 각 속성에 단다).
      'jsdoc/require-param-description': [
        'error',
        {
          contexts: [
            'FunctionDeclaration:not([params.0.name="props"])',
            'FunctionExpression',
            'ArrowFunctionExpression',
          ],
        },
      ],
      'jsdoc/require-returns': 'off',
      'jsdoc/require-returns-description': 'error',
      'jsdoc/no-types': 'error',
      'jsdoc/check-tag-names': ['error', { definedTags: ['codocs'] }],
    },
  },

  // React
  {
    files: ['**/*.tsx'],
    plugins: { react },
    extends: [reactHooks.configs.flat['recommended-latest']],
    settings: { react: { version: 'detect' } },
    rules: {
      // @codocs [[코드 작성 규칙:식별자 이름]]
      'react/jsx-pascal-case': 'error',
      'react/jsx-handler-names': [
        'error',
        {
          eventHandlerPrefix: 'handle',
          eventHandlerPropPrefix: 'on',
          checkLocalVariables: true,
          checkInlineFunction: false,
        },
      ],
    },
  },

  // @codocs [[기술 스택:스타일링]]
  // 임의 값(`bg-[#fff]`, `p-[13px]`, `bg-(--x)`)을 막고, 토큰에 없는 클래스(`bg-red-500`)를 막는다.
  {
    files: [`${WEB_SRC}/**/*.tsx`, `${DESIGN_SYSTEM}/src/**/*.tsx`],
    plugins: { 'better-tailwindcss': betterTailwindcss },
    rules: {
      ...betterTailwindcss.configs['correctness-error'].rules,
      'better-tailwindcss/no-restricted-classes': [
        'error',
        {
          restrict: [
            {
              pattern: '\\[[^\\]]*\\](\\/[^:]*)?$',
              message:
                'Tailwind 임의 값("$0")은 쓰지 않는다. 토큰에 없는 값이 필요하면 피그마부터 고친다.',
            },
            {
              pattern: '-\\([^)]*\\)(\\/[^:]*)?$',
              message:
                'Tailwind 임의 값("$0")은 쓰지 않는다. 토큰에 없는 값이 필요하면 피그마부터 고친다.',
            },
          ],
        },
      ],
    },
  },
  {
    files: [`${WEB_SRC}/**/*.tsx`],
    settings: { 'better-tailwindcss': { entryPoint: `${WEB_SRC}/app/globals.css` } },
  },
  {
    files: [`${DESIGN_SYSTEM}/src/**/*.tsx`],
    settings: { 'better-tailwindcss': { entryPoint: `${DESIGN_SYSTEM}/.storybook/preview.css` } },
  },

  // apps/web: Next.js 규칙과 `../` 금지
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: { '@next/next': nextPlugin },
    settings: { next: { rootDir: 'apps/web/' } },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      // @codocs [[코드 작성 규칙:export와 import]]
      'no-restricted-imports': restrictedImports([
        {
          regex: '^\\.\\./',
          message: '앱 안에서 상위 폴더는 `@/` 별칭으로 import한다.',
        },
        {
          group: ['@seojaewan/design-system/*', '!@seojaewan/design-system/theme.css'],
          message: '디자인 시스템은 공개 이름 `@seojaewan/design-system`으로만 import한다.',
        },
      ]),
    },
  },

  // @codocs [[저장소 구성:의존 방향]]
  {
    files: [`${WEB_SRC}/**/*.{ts,tsx}`, `${DESIGN_SYSTEM}/**/*.{ts,tsx}`],
    plugins: { boundaries },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          noWarnOnMultipleProjects: true,
          project: ['apps/web/tsconfig.json', 'packages/design-system/tsconfig.json'],
        },
      },
      'boundaries/root-path': rootDir,
      'boundaries/elements': [
        { type: 'design-system', pattern: DESIGN_SYSTEM, partialMatch: false },
        { type: 'web-app', pattern: `${WEB_SRC}/app`, partialMatch: false },
        {
          type: 'web-feature',
          pattern: `${WEB_SRC}/features/*`,
          capture: ['featureName'],
          partialMatch: false,
        },
        { type: 'web-content', pattern: `${WEB_SRC}/content`, partialMatch: false },
        { type: 'web-shared', pattern: `${WEB_SRC}/shared`, partialMatch: false },
        { type: 'web-root', pattern: WEB_SRC, partialMatch: false },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'allow',
          policies: [
            {
              from: { element: { type: 'design-system' } },
              disallow: {
                to: {
                  element: {
                    type: ['web-app', 'web-feature', 'web-content', 'web-shared', 'web-root'],
                  },
                },
              },
              message: '디자인 시스템은 앱을 import하지 않는다.',
            },
            {
              from: { element: { type: '!design-system' } },
              disallow: { to: { element: { type: 'design-system' } } },
              message:
                '앱은 디자인 시스템을 공개 이름 `@seojaewan/design-system`으로만 import한다.',
            },
            {
              from: { element: { type: '!design-system' } },
              allow: {
                to: { element: { type: 'design-system', fileInternalPath: 'src/index.ts' } },
              },
            },
            {
              from: { element: { type: 'web-feature' } },
              disallow: { to: { element: { type: 'web-app' } } },
              message: '`features/`는 `app/`을 import하지 않는다.',
            },
            {
              from: { element: { type: 'web-feature' } },
              disallow: { to: { element: { type: 'web-feature' } } },
              message:
                '다른 기능은 공개 진입점(`features/{{to.element.captured.featureName}}/{{to.element.captured.featureName}}.ts`)으로만 import한다.',
            },
            {
              from: { element: { type: 'web-feature' } },
              allow: {
                to: {
                  element: {
                    type: 'web-feature',
                    captured: { featureName: '{{from.element.captured.featureName}}' },
                  },
                },
              },
            },
            {
              from: { element: { type: 'web-feature' } },
              allow: {
                to: {
                  element: {
                    type: 'web-feature',
                    fileInternalPath: [
                      '{{to.element.captured.featureName}}.ts',
                      '{{to.element.captured.featureName}}.tsx',
                    ],
                  },
                },
              },
            },
          ],
        },
      ],
    },
  },

  // Storybook
  {
    files: ['**/*.stories.{ts,tsx}'],
    extends: [storybook.configs['flat/recommended']],
  },

  // 경로 단위 예외: default export
  {
    files: defaultExportFiles,
    rules: {
      'no-restricted-syntax': restrictedSyntax([]),
    },
  },

  // 경로 단위 예외: process.env를 읽는 곳
  {
    files: [`${WEB_SRC}/env.ts`, ...configFiles],
    rules: {
      'no-restricted-properties': restrictedProperties([]),
    },
  },

  // 경로 단위 예외: `index` 파일은 디자인 시스템 공개 진입점에만 둔다
  {
    files: [`${DESIGN_SYSTEM}/src/index.ts`],
    rules: {
      'check-file/no-index': 'off',
    },
  },

  // JavaScript 설정 파일은 타입 정보 없이 검사한다
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
  },

  prettierConfig,
);
