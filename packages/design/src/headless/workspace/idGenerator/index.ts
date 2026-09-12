/**
 * @file Workspace 생성과 복구가 함께 사용하는 내부 UUID 발급기를 정의한다.
 *
 * Application 주입 없이 runtime의 Web Crypto를 사용하며 import 시에는 ID를 발급하지 않는다.
 */
import { parseResourceId, type ResourceId } from "../../resources/index.js";

/**
 * 새 Resource에 사용할 UUID를 발급하는 내부 공통 구현이다.
 *
 * Resource의 등록과 중복 검사는 호출한 Workspace 명령 또는 복구 과정이 소유한다.
 */
export class IdGenerator {
  /**
   * 발급기 instance나 외부 설정 없이 내부 공통 정적 구현을 사용하게 한다.
   */
  private constructor() {}

  /**
   * runtime의 암호학적 난수로 UUID를 발급하고 ResourceId 형식을 검증한다.
   *
   * Web Crypto를 지원하는 실행 환경에서 호출하며 외부 generator 설정을 요구하지 않는다.
   */
  static generateId(): ResourceId {
    return parseResourceId(globalThis.crypto.randomUUID());
  }
}
