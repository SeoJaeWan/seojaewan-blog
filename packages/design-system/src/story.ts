// @seojaewan/design-system/story: 스토리 전용 공개 진입점이다. 앱 코드는 쓰지 않고 스토리만 가져온다.
// 앱 단위 테스트는 스토리 데이터가 실제 결과와 같은지 확인하려고 가져올 수 있다(CodeBlock 강조 결과).
// @codocs [[테스트 작성 규칙:스토리 테스트]]
export { codeBlockStorySample } from './components/code-block/story-data';
export { FigmaFrame, figmaFrame } from './story/figma-frame';
export { StoryListbox } from './story/story-listbox';
export { StoryStage, type StoryStagePlacement } from './story/story-stage';
