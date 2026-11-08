---
'@seojaewan/web': patch
'@seojaewan/design-system': patch
---

모바일에서 부팅 화면과 바탕화면이 화면을 가득 채우게 고쳤다. 부팅 화면(`BootScreen` `device="auto"`)과 앱 루트의 높이를 동적 뷰포트(`dvh`)로 두고, 작업 영역 높이는 `visualViewport`와 그 `resize`로 읽고, `html`·`body`에 바탕색을 두었다. 글 화면 맨 아래에 피그마 `Chrome/Page`의 아래 여백을 더했다.
