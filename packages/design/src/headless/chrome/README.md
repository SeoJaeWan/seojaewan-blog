# Chrome tab 사용 안내

이 디렉터리는 Chrome 앱의 tab과 새 탭·Content·404 위치 모델을 제공한다. 제품 계약의 정본은 Workbench Local Work Memory의 `seojaewan/seojaewan-blog` 프로젝트에 있는 `chrome-tab-navigation-history`, `chrome-404`, `application-resource-routing-404`다.

- [model/index.ts](./model/index.ts): `ChromeTab`, `ChromeLocation`과 Application이 검증한 `InternalAddress` 타입.
- [chromeTabId/index.ts](./chromeTabId/index.ts): Resource ID와 구분되는 runtime tab ID 검증.
- [index.ts](./index.ts): feature에서 사용할 계약을 조합한다.

앱에서는 package root의 타입과 `WindowStore`를 사용한다. Content 원본은 Catalog에 두며 tab은 ref를 저장한다.

```ts
await WindowStore.openContent(contentRef);
await WindowStore.navigateChrome(sessionId, tabId, { kind: "content", ref: contentRef });
await WindowStore.refreshChrome(sessionId, tabId);
```

위 예제의 ref는 현재 Content Catalog의 ref이고 ID는 Store snapshot에서 얻는다. raw URL을 단순 type assertion으로 `InternalAddress`로 바꾸지 않는다. 주소 검증·실제 router 호출은 Application의 책임이다. 초기화와 결과 처리는 [Window 사용 안내](../windows/README.md)를 따른다.

mobile에서는 Chrome Window와 tab이 각각 최대 하나다. `openContent`는 현재 tab의 history에서 navigate하고 `addChromeTab`과 `minimize`는 snapshot·알림·ID 발급이 없는 no-op이다. 고정 Taskbar 버튼은 `launchMobileApplication("chrome")`을 사용한다. Content를 명시적으로 닫으면 종료 시점 Workspace parent의 fresh Explorer를 열고, `new-tab`·404는 창 없는 Desktop으로 돌아간다.
