// @codocs [[테스트 작성 규칙:스토리 테스트]]
// 수식 조각(`PostBlocks`가 지연해 불러오는 `katex-html`)을 첫 스토리가 받느라 15초 제한을 넘기지 않게 미리 불러온다.
await import('./src/features/chrome/components/post-blocks/katex-html');
