import { motionText } from '../motion-file';
import { checkMotionSample, type MotionCheckResult } from './check-motion';
import type { Violation } from './check-structure';
import type { MotionVariable } from './motion-data';
import { readMotionSample } from './read-motion';

// 모션 견본 하나를 검사하고 `figma/motions/<이름>.json` 내용을 만든다.
// 플러그인 UI와 피그마 MCP(use_figma)가 같은 함수를 쓴다. GitHub와 UI는 모르고, 파일을 바꾸지 않는다.

/** 내보낸 모션 */
export type MotionFileExport = {
  /** 견본 이름(파일 이름) */
  name: string;
  /** json 내용 */
  text: string;
  /** 검사·내보내기 결과 자료 */
  result: Extract<MotionCheckResult, { ok: true }>;
};

export type MotionOutcome =
  { ok: true; motion: MotionFileExport } | { ok: false; name: string; violations: Violation[] };

/**
 * 견본을 읽어 모션 검사를 하고, 통과하면 json 내용을 만든다. 위반이 있으면 파일을 만들지 않는다.
 * @codocs [[피그마 연동:피그마 플러그인]]
 * @codocs [[피그마 연동:모션]]
 * @param sampleId 견본 프레임 ID
 * @param variables `motion/*` 변수(readMotionVariables)
 * @param fileKey 피그마 파일 키(figma.json)
 * @returns 내보낸 모션, 또는 위반 목록
 */
export async function exportMotionCore(
  sampleId: string,
  variables: readonly MotionVariable[],
  fileKey: string,
): Promise<MotionOutcome> {
  const sample = await readMotionSample(sampleId);
  const result = checkMotionSample(sample, variables, fileKey);
  if (!result.ok) {
    return { ok: false, name: sample.name, violations: result.violations };
  }
  return {
    ok: true,
    motion: { name: result.motion.name, text: motionText(result.motion), result },
  };
}
