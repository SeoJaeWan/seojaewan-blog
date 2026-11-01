import { readFileSync } from 'node:fs';
import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettierConfig from 'eslint-config-prettier/flat';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import betterTailwindcss from 'eslint-plugin-better-tailwindcss';
import boundaries from 'eslint-plugin-boundaries';
import checkFile from 'eslint-plugin-check-file';
import { importX } from 'eslint-plugin-import-x';
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
// 앱 `shared/`의 종류. 종류마다 boundaries 요소가 된다.
const sharedKinds = ['components', 'hooks', 'utils', 'stores'];
const sharedTypes = sharedKinds.map((kind) => `web-shared-${kind}`);
// 종류 폴더 밖에 둔 `shared/` 파일도 층 방향은 지키도록 `web-shared`로 묶는다.
const sharedLayerTypes = [...sharedTypes, 'web-shared'];

// @codocs [[저장소 구성:앱 폴더 구조]]
// 기능 폴더(`features/<기능>/`)와 `shell/`은 칸(unit)으로 나뉘고, 칸마다 안쪽 구조가 같다(자기 파일, `components/`, `hooks/`, `utils/`, `stores/`, `data/`).
// 칸은 세 가지다. 뿌리(`r`, 기능 폴더나 `shell/`), 컴포넌트 폴더(`c`, `<칸>/components/<이름>/`), 컴포넌트 없는 메뉴 폴더(`m`, `<칸>/<이름>/`).
// 칸 사슬은 `r`, `rc`, `rm`, `rcc`, `rcm`, ...으로 쓰고 boundaries 요소를 뿌리·사슬마다 하나씩 만든다(`web-feature-rc`, `web-shell-rc`).
// 파일은 가장 깊은 칸 하나에 속한다. 설정이 만드는 깊이를 넘는 폴더는 마지막 칸의 안쪽으로 본다.
const cellKinds = ['components', 'hooks', 'utils', 'stores', 'data'];
const cellFileKinds = cellKinds.filter((kind) => kind !== 'components');
const CELL_MAX_DEPTH = 5;
// 뿌리 패턴의 첫 캡처(`n1`)는 기능 이름이다. `shell`은 하나뿐이지만 사슬을 같은 모양으로 맞추려고 캡처로 둔다.
const cellScopes = [
  { type: 'web-feature', root: `${WEB_SRC}/features/*` },
  { type: 'web-shell', root: `${WEB_SRC}/@(shell)` },
];

/**
 * 깊이 `depth` 이하의 모든 칸 사슬(`r`, `rc`, `rm`, `rcc`, ...)을 만든다.
 * @param depth 최대 깊이(뿌리가 1)
 * @returns 칸 사슬 목록(짧은 것부터)
 */
function cellChains(depth) {
  let level = ['r'];
  const all = [...level];
  for (let step = 1; step < depth; step += 1) {
    level = level.flatMap((chain) => [`${chain}c`, `${chain}m`]);
    all.push(...level);
  }
  return all;
}
const allChains = cellChains(CELL_MAX_DEPTH);

/**
 * 칸 사슬의 boundaries 요소 이름을 만든다.
 * @param scope 뿌리 종류(`cellScopes`의 항목)
 * @param chain 칸 사슬
 * @returns 요소 type
 */
function chainType(scope, chain) {
  return `${scope.type}-${chain}`;
}
const [featureScope, shellScope] = cellScopes;
const featureTypes = allChains.map((chain) => chainType(featureScope, chain));
const shellTypes = allChains.map((chain) => chainType(shellScope, chain));

/**
 * 칸 사슬의 boundaries 요소를 만든다. 각 칸 폴더가 캡처 하나(`n1`이 뿌리, `n2`가 다음 칸의 이름, ...)다.
 * @param scope 뿌리 종류
 * @param chain 칸 사슬
 * @returns boundaries 요소 설명
 */
function cellElement(scope, chain) {
  const segments = [...chain]
    .slice(1)
    .map((kind) => (kind === 'c' ? '/components/*' : `/!(${cellKinds.join('|')})`));
  return {
    type: chainType(scope, chain),
    pattern: `${scope.root}${segments.join('')}`,
    capture: [...chain].map((_, index) => `n${index + 1}`),
    partialMatch: false,
    exclusive: true,
  };
}

/**
 * 도착 칸이 출발 칸의 앞 `depth`개 칸과 같다는 captured 조건을 만든다.
 * @param depth 앞에서부터 맞출 칸 개수
 * @returns boundaries captured 선택자
 */
function sameBranch(depth) {
  return Object.fromEntries(
    Array.from({ length: depth }, (_, index) => [
      `n${index + 1}`,
      `{{from.element.captured.n${index + 1}}}`,
    ]),
  );
}

/**
 * 칸이 바깥에 여는 파일 하나의 fileInternalPath 패턴을 만든다. 컴포넌트는 폴더 이름과 같은 파일, 메뉴는 `<폴더>-entries.ts`다.
 * @param depth 도착 칸 깊이
 * @param suffix 폴더 이름 뒤에 붙는 이름
 * @returns fileInternalPath 패턴
 */
function mainFileOf(depth, suffix) {
  return `{{to.element.captured.n${depth}}}${suffix}.@(ts|tsx)`;
}

/**
 * 칸 안에서 허용하는 import 정책을 만든다(변수 스코프처럼 안에서 바깥으로 보인다).
 * - 어떤 칸이든 자기 칸과 조상 칸 각각의 `components/` 바로 아래 컴포넌트의 주 파일과 메뉴 폴더의 `-entries` 파일을 import한다.
 * - 조상 칸 각각의 `hooks`·`utils`·`stores`·`data` 바로 아래 대상의 파일을 import한다. 대상 안에 중첩한 `utils/`는 그 대상의 것이라 보이지 않는다.
 * - 부모 컴포넌트·메뉴의 주 파일은 막는다(자식이 부모를 알지 않는다).
 * 같은 칸 안은 boundaries가 같은 요소 안의 import로 보아 검사하지 않는다.
 * 다른 컴포넌트·메뉴의 안쪽으로 들어가는 import는 어느 정책에도 걸리지 않아 막힌 채로 남는다.
 * @param scope 뿌리 종류
 * @returns boundaries 정책 목록
 */
function cellPolicies(scope) {
  const allowed = [];
  const parentBans = [];
  for (const prefix of allChains) {
    const depth = prefix.length;
    const insidePrefix = allChains.filter((chain) => chain.startsWith(prefix));
    const deeperThanPrefix = insidePrefix.filter((chain) => chain.length > depth);
    const fromPrefix = { element: { type: insidePrefix.map((chain) => chainType(scope, chain)) } };
    const fromDeeper = {
      element: { type: deeperThanPrefix.map((chain) => chainType(scope, chain)) },
    };
    if (depth < CELL_MAX_DEPTH) {
      for (const [kind, suffix] of [
        ['c', ''],
        ['m', '-entries'],
      ]) {
        allowed.push({
          from: fromPrefix,
          allow: {
            to: {
              element: {
                type: chainType(scope, `${prefix}${kind}`),
                captured: sameBranch(depth),
                fileInternalPath: mainFileOf(depth + 1, suffix),
              },
            },
          },
        });
      }
    }
    if (deeperThanPrefix.length > 0) {
      allowed.push({
        from: fromDeeper,
        allow: {
          to: {
            element: {
              type: chainType(scope, prefix),
              captured: sameBranch(depth),
              fileInternalPath: `@(${cellFileKinds.join('|')})/*/*`,
            },
          },
        },
      });
      if (depth > 1) {
        parentBans.push({
          from: fromDeeper,
          disallow: {
            to: {
              element: {
                type: chainType(scope, prefix),
                captured: sameBranch(depth),
                fileInternalPath: [mainFileOf(depth, ''), mainFileOf(depth, '-entries')],
              },
            },
          },
          message: '부모 컴포넌트·메뉴는 import하지 않는다. 필요한 값은 부모가 props로 넘긴다.',
        });
      }
    }
  }
  return [...allowed, ...parentBans];
}

// 스토리 파일·스토리 데이터·스토리 도우미(`story-*`). 기능 경계를 넘어 어디든 import할 수 있다.
const storyFilePatterns = [`${WEB_SRC}/**/*.stories.{ts,tsx}`, `${WEB_SRC}/**/story-*.{ts,tsx}`];
const testFilePatterns = [`${WEB_SRC}/**/*.test.{ts,tsx}`];

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

// @codocs [[피그마 연동:토큰 사용 강제]]
// 토큰 변수 이름은 피그마 경로 그대로라 Tailwind 기본 이름공간에 들어가는 것이 있다. 그러면 Tailwind 기본 유틸리티가
// 뜻하지 않은 클래스를 만들고(`--text-fill-primary` → 글자 크기 `text-fill-primary`, `--stroke-width-default` →
// 선 색 `stroke-width-default`) no-unknown-classes가 막지 못한다. tokens.css의 @theme 변수 중 이 이름공간의 것은
// 변수 이름 그대로인 클래스를 막는다. text-shadow 값 변수(`--shadow-text-*`)는 Tailwind `shadow-*`가 box-shadow로
// 읽는 이름이라 `shadow-text-*` 클래스를 함께 만든다(text-shadow는 `text-shadow-*`로 쓴다).
const misreadNamespaces = ['text', 'stroke-width', 'shadow-text'];
const themeVariableNames = [
  ...(
    readFileSync(`${rootDir}/packages/design-system/src/tokens.css`, 'utf8')
      .split('@theme static {')[1]
      ?.split('\n}')[0] ?? ''
  ).matchAll(/^\s+--([a-z0-9-]+):/gmu),
].map((match) => match[1]);
const misreadTokenClasses = themeVariableNames.filter((name) =>
  misreadNamespaces.some((namespace) => name.startsWith(`${namespace}-`)),
);

// 도구가 이름을 정하거나 process.env를 직접 읽어야 하는 파일.
const configFiles = [
  '**/*.config.{ts,mjs,js,cjs}',
  '**/.storybook/**',
  'scripts/**',
  'tools/figma-parity/src/**',
];

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

// @codocs [[코드 작성 규칙:식별자 이름]]
// @typescript-eslint/naming-convention 옵션이다.
const namingConventionOptions = [
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
];

// @codocs [[코드 작성 규칙:식별자 이름]]
// Storybook CSF는 export 이름이 스토리 이름이 되며 PascalCase(`export const Figma`)가 관례다.
// 스토리 파일에서 내보내는 모듈 최상위 const는 PascalCase도 쓸 수 있다(export default meta는 camelCase).
const storyNamingConventionOptions = [
  ...namingConventionOptions,
  {
    selector: 'variable',
    modifiers: ['const', 'global', 'exported'],
    format: ['PascalCase', 'camelCase'],
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

const webImportPatterns = [
  {
    regex: '^\\.\\./',
    message: '앱 안에서 상위 폴더는 `@/` 별칭으로 import한다.',
  },
  {
    group: ['@seojaewan/design-system/*', '!@seojaewan/design-system/theme.css'],
    message: '디자인 시스템은 공개 이름 `@seojaewan/design-system`으로만 import한다.',
  },
];
const storyImportPattern = {
  group: ['**/*.stories', '**/story-*'],
  message: '스토리 파일과 스토리 데이터·도우미는 스토리와 테스트에서만 import한다.',
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
    '.claude/**',
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
          'tools/*/src/**/': 'KEBAB_CASE',
        },
      ],
      'check-file/no-index': ['error', { ignoreMiddleExtensions: true }],
    },
  },
  {
    files: tsFiles,
    rules: {
      // @codocs [[코드 작성 규칙:식별자 이름]]
      '@typescript-eslint/naming-convention': ['error', ...namingConventionOptions],
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

  // @codocs [[피그마 연동:토큰 사용 강제]]
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
            // @codocs [[피그마 연동:토큰 사용 강제]]
            // 움직임은 motion.css의 motion-* 클래스로만 준다. Tailwind 기본 유틸리티는 토큰 없이도 움직임을 만든다
            // (`duration-150`은 숫자를 그대로 ms로 쓴다).
            {
              pattern: '(^|:)(transition(-[^:]*)?|(duration|ease|delay|animate)-[^:]*)$',
              message:
                '"$0"으로 움직임을 직접 주지 않는다. motion.css의 motion-* 클래스를 쓴다([[디자인 기반:모션]] 표).',
            },
            ...(misreadTokenClasses.length === 0
              ? []
              : [
                  {
                    pattern: `(^|:)(${misreadTokenClasses.join('|')})(\\/[^:]*)?$`,
                    message:
                      '"$0"은 Tailwind 기본 유틸리티가 토큰을 다른 속성으로 읽은 클래스다. 토큰 클래스(tokens.css 머리 주석의 표)를 쓴다.',
                  },
                ]),
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
      'no-restricted-imports': restrictedImports(webImportPatterns),
    },
  },
  // 스토리 파일·스토리 데이터는 스토리와 테스트에서만 import한다. boundaries는 같은 칸 안의 import를 검사하지 않아
  // (같은 칸의 앱 코드가 그 칸의 스토리 데이터를 import하는 경우) 여기서 막는다.
  // @codocs [[저장소 구성:의존 방향]]
  {
    files: [`${WEB_SRC}/**/*.{ts,tsx}`],
    ignores: [...storyFilePatterns, ...testFilePatterns],
    rules: {
      'no-restricted-imports': restrictedImports([...webImportPatterns, storyImportPattern]),
    },
  },

  // @codocs [[저장소 구성:의존 방향]]
  // 앱 층은 `app → shell → features → shared` 방향으로만 import한다. 기능끼리는 import하지 않는다.
  // `shared/` 안은 종류 사이에 방향 제한 없이 서로 import한다.
  // 뒤에 오는 정책이 앞의 정책보다 우선한다.
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
      // 요소와 별개로 파일을 분류한다.
      'boundaries/files': [
        { category: 'story', pattern: storyFilePatterns },
        { category: 'test', pattern: testFilePatterns },
      ],
      'boundaries/elements': [
        { type: 'design-system', pattern: DESIGN_SYSTEM, partialMatch: false },
        { type: 'web-app', pattern: `${WEB_SRC}/app`, partialMatch: false },
        // 가장 깊은 칸부터 놓는다. 먼저 맞은 요소가 `exclusive`로 나머지를 막아, 파일은 가장 깊은 칸 하나에 속한다.
        ...cellScopes.flatMap((scope) =>
          [...allChains]
            .sort((a, b) => b.length - a.length)
            .map((chain) => cellElement(scope, chain)),
        ),
        ...sharedKinds.map((kind) => ({
          type: `web-shared-${kind}`,
          pattern: `${WEB_SRC}/shared/${kind}`,
          partialMatch: false,
        })),
        { type: 'web-shared', pattern: `${WEB_SRC}/shared`, partialMatch: false },
        { type: 'web-content', pattern: `${WEB_SRC}/content`, partialMatch: false },
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
                    type: [
                      'web-app',
                      ...shellTypes,
                      ...featureTypes,
                      ...sharedLayerTypes,
                      'web-content',
                      'web-root',
                    ],
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

            // `app/`은 `shell/shell.tsx`만 import한다.
            {
              from: { element: { type: 'web-app' } },
              disallow: { to: { element: { type: shellTypes } } },
              message: '`shell/`은 `shell/shell.tsx`로만 import한다.',
            },
            {
              from: { element: { type: 'web-app' } },
              allow: { to: { element: { type: 'web-shell-r', fileInternalPath: 'shell.tsx' } } },
            },
            // 바깥(`app/`, `shell/`)은 기능 폴더 바로 아래 파일만 import한다. 컴포넌트·메뉴·종류 폴더는 가져오지 못한다.
            {
              from: { element: { type: ['web-app', ...shellTypes] } },
              disallow: { to: { element: { type: featureTypes } } },
              message:
                '기능은 기능 폴더 바로 아래 파일(`features/{{to.element.captured.n1}}/*.ts(x)`)만 import한다. 컴포넌트·메뉴·종류 폴더(`components`·`hooks`·`utils`·`stores`·`data`)는 가져오지 못한다.',
            },
            {
              from: { element: { type: ['web-app', ...shellTypes] } },
              allow: { to: { element: { type: 'web-feature-r', fileInternalPath: '*' } } },
            },
            // 칸 사이는 막는다. 다른 기능이나 다른 컴포넌트·메뉴의 안쪽은 못 쓴다.
            ...[featureTypes, shellTypes].map((types) => ({
              from: { element: { type: types } },
              disallow: { to: { element: { type: types } } },
              message:
                '`{{to.element.path}}`은(는) 여기서 쓸 수 없다. 칸(기능·컴포넌트·메뉴 폴더)은 자기·조상 칸의 `components/` 바로 아래 컴포넌트 주 파일, 메뉴 폴더의 `-entries` 파일, 조상 칸의 `hooks`·`utils`·`stores`·`data` 파일만 import한다. 다른 컴포넌트·메뉴의 안쪽과 부모, 다른 기능은 import하지 않는다. 함께 쓰는 화면·함수·상태는 `shared/`나 공통 조상 칸에 둔다.',
            })),
            // 칸 안: 변수 스코프처럼 자기·조상 칸의 부품만 보인다.
            ...cellScopes.flatMap(cellPolicies),

            // 아래 층은 위 층을 import하지 않는다.
            {
              from: { element: { type: [...shellTypes, ...featureTypes, ...sharedLayerTypes] } },
              disallow: { to: { element: { type: 'web-app' } } },
              message: '아래 층은 `app/`을 import하지 않는다(`app → shell → features → shared`).',
            },
            {
              from: { element: { type: [...featureTypes, ...sharedLayerTypes] } },
              disallow: { to: { element: { type: shellTypes } } },
              message: '아래 층은 `shell/`을 import하지 않는다(`app → shell → features → shared`).',
            },
            {
              from: { element: { type: sharedLayerTypes } },
              disallow: { to: { element: { type: featureTypes } } },
              message:
                '`shared/`는 `features/`를 import하지 않는다(`app → shell → features → shared`).',
            },

            // 스토리 파일은 어느 기능의 안쪽이든 import한다(위 정책보다 뒤라 우선한다).
            {
              from: { file: { categories: 'story' } },
              allow: { to: { element: { type: featureTypes } } },
            },
            {
              from: { element: { type: shellTypes }, file: { categories: 'story' } },
              allow: { to: { element: { type: shellTypes } } },
            },
            // 테스트는 같은 기능(또는 shell)의 칸 안쪽(모듈 캐시 비우기 등)과 부모를 import한다.
            ...[featureTypes, shellTypes].map((types) => ({
              from: { element: { type: types }, file: { categories: 'test' } },
              allow: { to: { element: { type: types, captured: sameBranch(1) } } },
            })),
          ],
        },
      ],
    },
  },

  // 순환 import를 막는다. 앱 전체(`shared/`·`features/`·`shell/`·`app/`)와 디자인 시스템 패키지에 적용한다.
  // `import type`만으로 생긴 순환은 `no-cycle`이 검사하지 않는다.
  // @codocs [[저장소 구성:의존 방향]]
  {
    files: [`${WEB_SRC}/**/*.{ts,tsx}`],
    plugins: { 'import-x': importX },
    settings: {
      'import-x/extensions': ['.ts', '.tsx'],
      'import-x/parsers': { '@typescript-eslint/parser': ['.ts', '.tsx'] },
      'import-x/resolver-next': [
        createTypeScriptImportResolver({
          alwaysTryTypes: true,
          noWarnOnMultipleProjects: true,
          project: ['apps/web/tsconfig.json'],
        }),
      ],
    },
    rules: {
      'import-x/no-cycle': 'error',
    },
  },
  {
    files: [`${DESIGN_SYSTEM}/src/**/*.{ts,tsx}`],
    plugins: { 'import-x': importX },
    settings: {
      'import-x/extensions': ['.ts', '.tsx'],
      'import-x/parsers': { '@typescript-eslint/parser': ['.ts', '.tsx'] },
      'import-x/resolver-next': [
        createTypeScriptImportResolver({
          alwaysTryTypes: true,
          noWarnOnMultipleProjects: true,
          project: ['packages/design-system/tsconfig.json'],
        }),
      ],
    },
    rules: {
      'import-x/no-cycle': 'error',
    },
  },

  // Storybook
  {
    files: ['**/*.stories.{ts,tsx}'],
    extends: [storybook.configs['flat/recommended']],
  },
  // 경로 단위 예외: 스토리 export 이름
  {
    files: ['**/*.stories.{ts,tsx}'],
    rules: {
      '@typescript-eslint/naming-convention': ['error', ...storyNamingConventionOptions],
    },
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

  // 경로 단위 예외: 피그마 타입이 `variantProperties`를 인스턴스 기준으로 deprecated 표시하지만,
  // 컴포넌트 세트의 변형에서는 이 속성이 변형 속성을 읽는 정식 방법이다.
  {
    files: [
      'tools/figma-plugin/src/figma-reader.ts',
      'tools/figma-plugin/src/core/export-component.ts',
    ],
    rules: {
      '@typescript-eslint/no-deprecated': 'off',
    },
  },

  // JavaScript 설정 파일은 타입 정보 없이 검사한다
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
  },

  prettierConfig,
);
