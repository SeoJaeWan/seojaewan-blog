import ts from 'typescript';

// 피그마 플러그인 타입 정의(plugin-api.d.ts)에서 화면 노드가 가진 속성과 그 타입을 읽는다.
// 분류표(figma-properties.json)가 타입 정의의 모든 속성을 빠짐없이 분류했는지 테스트가 이 결과와 대조한다.
// 노드 환경(테스트)에서만 쓴다. 플러그인 번들에는 들어가지 않는다.

/** 타입 정의에서 읽은 속성 목록 */
export type TypingsInventory = {
  /** 속성 이름 → 타입 문자열. 노드마다 타입이 다르면 서로 다른 타입을 ` ¦ `로 잇는다 */
  properties: Record<string, string>;
  /** 분류에 쓰는 속성 타입이 가리키는 타입 별칭·인터페이스의 모양(이름 → 정의 문자열) */
  shapes: Record<string, string>;
};

// 화면 노드 종류를 모은 타입 별칭이다.
const SCENE_NODE_ALIAS = 'SceneNode';
// 모양을 따라가지 않는 이름이다. 노드 인터페이스는 속성 목록에서 이미 대조한다.
const SKIPPED_SHAPE_PATTERN = /(Node|Mixin)$/u;
// 따라가지 않는 TypeScript 기본 타입이다.
const builtInTypes = new Set([
  'Array',
  'ReadonlyArray',
  'Promise',
  'Record',
  'Partial',
  'Readonly',
  'Uint8Array',
  'Omit',
  'Pick',
  'Exclude',
  // PluginAPI['mixed']처럼 섞인 값 표시로만 쓰인다. 따라가면 플러그인 API 전체가 딸려 온다.
  'PluginAPI',
]);

type InterfaceInfo = { extends: string[]; members: { name: string; type: string }[] };

/**
 * 타입 정의 파일 내용에서 화면 노드의 속성과, 고른 속성의 타입이 가리키는 모양을 읽는다.
 * @codocs [[피그마 일치 검사:피그마 플러그인]]
 * @param source plugin-api.d.ts 내용
 * @param shapeRoots 모양을 따라갈 속성 이름(분류표에서 시각 속성으로 분류한 것)
 * @returns 속성 → 타입, 모양 이름 → 정의
 */
export function readTypingsInventory(
  source: string,
  shapeRoots: readonly string[],
): TypingsInventory {
  const file = ts.createSourceFile('plugin-api.d.ts', source, ts.ScriptTarget.Latest, true);
  const interfaces = new Map<string, InterfaceInfo>();
  const aliases = new Map<string, ts.TypeNode>();
  for (const node of file.statements) {
    if (ts.isInterfaceDeclaration(node)) {
      const info = interfaces.get(node.name.text) ?? { extends: [], members: [] };
      for (const clause of node.heritageClauses ?? []) {
        info.extends.push(...clause.types.map((type) => type.expression.getText(file)));
      }
      for (const member of node.members) {
        if (ts.isPropertySignature(member) && member.type !== undefined) {
          info.members.push({ name: member.name.getText(file), type: text(member.type, file) });
        }
      }
      interfaces.set(node.name.text, info);
    } else if (ts.isTypeAliasDeclaration(node)) {
      aliases.set(node.name.text, node.type);
    }
  }

  const sceneAlias = aliases.get(SCENE_NODE_ALIAS);
  if (sceneAlias === undefined) {
    throw new Error(`타입 정의에 ${SCENE_NODE_ALIAS}가 없다.`);
  }
  const typesByProperty = new Map<string, Set<string>>();
  for (const nodeInterface of referencedNames(sceneAlias, file)) {
    for (const name of interfaceClosure(nodeInterface, interfaces)) {
      for (const member of interfaces.get(name)?.members ?? []) {
        const types = typesByProperty.get(member.name) ?? new Set<string>();
        types.add(member.type);
        typesByProperty.set(member.name, types);
      }
    }
  }
  const properties: Record<string, string> = {};
  for (const [name, types] of [...typesByProperty].sort(([a], [b]) => a.localeCompare(b))) {
    properties[name] = [...types].sort().join(' ¦ ');
  }

  const shapes: Record<string, string> = {};
  const queue: string[] = [];
  for (const root of shapeRoots) {
    for (const type of typesByProperty.get(root) ?? []) {
      queue.push(...namesInText(type));
    }
  }
  for (let name = queue.shift(); name !== undefined; name = queue.shift()) {
    if (name in shapes || SKIPPED_SHAPE_PATTERN.test(name) || builtInTypes.has(name)) {
      continue;
    }
    const alias = aliases.get(name);
    const info = interfaces.get(name);
    if (alias !== undefined) {
      shapes[name] = text(alias, file);
      queue.push(...referencedNames(alias, file));
    } else if (info !== undefined) {
      shapes[name] = [
        ...info.extends.map((parent) => `extends ${parent}`),
        ...info.members.map((member) => `${member.name}: ${member.type}`),
      ].join('; ');
      queue.push(...info.extends, ...info.members.flatMap((member) => namesInText(member.type)));
    }
  }
  return { properties, shapes: Object.fromEntries(Object.entries(shapes).sort()) };
}

/**
 * 인터페이스와 그 인터페이스가 이어받는 인터페이스 이름을 모두 모은다.
 * @param name 인터페이스 이름
 * @param interfaces 인터페이스 정보
 * @returns 이름 집합
 */
function interfaceClosure(name: string, interfaces: ReadonlyMap<string, InterfaceInfo>): string[] {
  const seen = new Set<string>();
  const queue = [name];
  for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
    if (seen.has(next) || !interfaces.has(next)) {
      continue;
    }
    seen.add(next);
    queue.push(...(interfaces.get(next)?.extends ?? []));
  }
  return [...seen];
}

/**
 * 타입 노드가 가리키는 이름(타입 참조)을 모은다.
 * @param node 타입 노드
 * @param file 소스 파일
 * @returns 이름 목록
 */
function referencedNames(node: ts.Node, file: ts.SourceFile): string[] {
  const names: string[] = [];
  /**
   * 노드를 내려가며 타입 참조 이름을 모은다.
   * @param child 노드
   */
  function visit(child: ts.Node): void {
    if (ts.isTypeReferenceNode(child)) {
      names.push(child.typeName.getText(file));
    }
    child.forEachChild(visit);
  }
  visit(node);
  return names;
}

/**
 * 타입 문자열에서 대문자로 시작하는 이름을 모은다(타입 참조 후보).
 * @param type 타입 문자열
 * @returns 이름 목록
 */
function namesInText(type: string): string[] {
  return [...type.matchAll(/\b[A-Z][A-Za-z0-9]*\b/gu)].map((match) => match[0]);
}

/**
 * 노드 문자열을 공백 하나로 정리한다.
 * @param node 노드
 * @param file 소스 파일
 * @returns 정리한 문자열
 */
function text(node: ts.Node, file: ts.SourceFile): string {
  return node.getText(file).replace(/\s+/gu, ' ');
}
