// @codocs [[저장소 구성:앱 폴더 구조]]
// Storybook(Vite)에서 `server-only`를 대신하는 빈 모듈이다. `server-only`는 브라우저 번들에 들어가면 오류를 던져
// 서버 코드가 클라이언트로 새지 않게 막는데, 스토리는 서버 함수(`renderEquationHtml`)로 스토리 데이터를 만들므로 빈 모듈로 바꾼다.
export {};
