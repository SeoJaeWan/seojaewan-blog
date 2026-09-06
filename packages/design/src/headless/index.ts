/**
 * @file framework에 의존하지 않는 design domain의 public surface를 조합한다.
 *
 * Resource와 Workspace feature의 구현 책임은 각각의 feature에 남겨 둔다.
 */
export * from "./resources/index.js";
export * from "./workspace/index.js";
