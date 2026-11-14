# @seojaewan/design-system

## 0.3.1

### Patch Changes

- 7c0cd69: 지운 검수 문서를 가리키던 코드 주석 링크를 기능 문서의 규칙 섹션으로 옮겼다.
- cc9cba6: 지운 피그마 캡처 도구와 캡처 표 섹션을 가리키던 스토리·모션 코드 주석을 사실에 맞게 고쳤다.

## 0.3.0

### Minor Changes

- f0abdb8: AddressBar: 빈 주소창(안내 문구 `placeholder`와 Material 돋보기)을 더하고, Suggesting을 바탕·그림자 없는 투명한 입력 줄로 바꿨다.
- 98328f2: AddressBar: Suggesting에서 입력 줄과 추천 자리(`suggestions`)를 함께 감싸는 카드를 스스로 그린다. 카드는 절대 위치라 주소창 높이는 그대로다.
- fda6e14: 경로 마디 사이 꺾쇠 버튼 BreadcrumbChevron을 더한다(Rest·Hover·Open, 메뉴 트리거로 쓸 수 있다).
- c16c125: Breadcrumb의 맨 앞 꺾쇠를 BreadcrumbChevron 버튼으로 바꾸고(separatorLabel, isSeparatorOpen, renderSeparator), 편집 중에는 위치 아이콘을 숨기고 입력이 있을 때만 지우기 버튼(onClear)을 보이며 입력칸 글자를 type-body로 키운다.
- 2ea7a6a: BreadcrumbItem의 위치 이름을 type-body로 키우고, 구분자를 BreadcrumbChevron 버튼으로 바꾼다(separatorLabel, isSeparatorOpen, renderSeparator).
- 60a1509: BrowserTabStrip 맨 왼쪽에 탭 검색(⌄) 버튼을 더하고, 새 탭(+) 아이콘을 Material 아이콘으로 바꾼다. 앱이 탭 목록 메뉴를 붙일 수 있게 `renderTabSearchButton`을 연다.
- 99e1d42: DropDownButton에 글자 앞 아이콘(hasIcon, icon)을 더한다.
- 86915d9: ExplorerAddressRow 아래에 1px 구분선을 그리고, 안쪽 Breadcrumb의 맨 앞 꺾쇠(breadcrumbSeparatorLabel, isBreadcrumbSeparatorOpen, renderBreadcrumbSeparator)와 지우기 동작(onBreadcrumbClear)을 넘긴다.
- c967538: ExplorerStatusBar가 지금 보기(view)를 받아 해당 보기 버튼을 켜짐으로 그리고, 보기 아이콘을 가로줄·노트북으로 바꾼다.
- ce60626: FileItem에 탐색기 현재 항목 선(`isCurrent`), 목록 포커스에 따른 회색 선택과 목록 밖 파란 선택(`isListFocused`)을 더하고, 바탕화면에서 이름을 바꾸는 동안 선택 바탕을 그리지 않는다. RenameField에 줄을 바꾸며 아래로 길어지는 여러 줄 방식(`isMultiline`)을 더하고 FileItem이 쓴다. 앱의 이름 바꾸기 훅 타입을 textarea도 받게 맞춘다.
- 0df2133: 점프 목록 고정 폴더의 항목 메뉴를 다른 우클릭 메뉴와 같은 공용 영역으로 열어, 모바일 길게 누르기로 열고 터치로 고정 해제해도 점프 목록이 열려 있게 한다. `MenuItem`이 `render`를 받는다.
- 7347752: 메뉴 위·아래에 놓는 단추 줄 MenuCommandBar 컴포넌트를 추가한다.
- d16dcbe: 메뉴 위·아래 단추 줄에 놓는 MenuCommandButton 컴포넌트를 추가한다.
- 6b35412: TaskbarPreviewList: `device="mobile"`을 더했다. 미리보기(WindowPreview 제목 줄)를 세로로 쌓고 줄이 판 너비를 채운다.
- 89daf85: WindowPreview: 누르는 영역과 닫기 버튼을 형제로 두고 `onSelect`로 누르는 영역만 버튼이 되게 해, 작업 표시줄 미리보기·Snap Assist에서 버튼 안 버튼이 생기지 않게 했다.
- 4d5ab1b: WindowPreview의 호버를 흰색 70% 덧칠로, 닫기 버튼을 `IconButton variant="close"`로 바꾸고, 축소 화면 칸의 바탕·선·둥글기를 빼고, 창 비율(`aspectRatio`)로 카드 너비를 정할 수 있게 한다(최대 208).
- 148e363: WindowPreview: 축소 화면 없이 앱 아이콘·제목·닫기 버튼만 그리는 제목 줄 `variant="title"`을 더했다. 너비는 쓰는 곳이 정하고 닫기 버튼은 늘 보인다.

### Patch Changes

- 75329e6: Windows 로고 자산을 여백 없는 40 프레임으로 다시 내보내고, 재부팅 화면 로고 크기 그림을 맞췄다.
- 3bd0eed: BrowserTab 활성 탭 아래 양옆에 오목한 모서리를 그리고, 닫기 아이콘 기본값을 Material 닫기 아이콘으로 바꾼다.
- 671b848: BrowserToolbar: 뒤로·앞으로·새로고침·⋮ 아이콘을 Material Symbols로 바꾸고, 아래에 1px 안쪽 선(`color/black/22`)을 더했다.
- 99e3dfc: Chrome 주소창 추천 목록을 팝업이 아니라 주소창이 펼쳐진 모습(AddressBar Suggesting 카드 한 장)으로 바꾸고, 탭 검색(⌄) 버튼에 열린 탭 목록 메뉴를 붙인다. 탭 파비콘과 추천 줄 아이콘을 Material 아이콘으로 바꾸고, 맨 끝 활성 탭의 모서리 조각이 잘리지 않게 한다. 디자인 시스템은 내보낸 경고 아이콘 자산을 다시 생성했다.
- c36be91: ColumnHeader의 정렬 화살표를 칸 위쪽 가운데에 겹쳐 그려 글자 자리가 줄지 않게 한다.
- e6038cc: 선택된 ExplorerTab의 바탕을 불투명(gray/4)으로 바꾼다.
- c9a839d: AddressBar: Suggesting 카드에 `data-slot="suggestions-card"` 이름표를 달고, `Figma` 스토리가 이 카드를 캡처 기준으로 지정한다. 모양과 동작은 같다.
- 6e95f3b: FileRow 행 높이를 28px로, 너비를 열 너비의 합으로 바꾸고, 현재 항목 선(`isCurrent`)과 목록 포커스에 따른 회색 선택을 더한다.
- cb8b507: IconButton에 close 변형과 켜짐(isChecked) 모양을 더하고, chrome 변형의 반지름을 radius/circular로 바꾼다.
- 20c60fc: 재질 값(플라이아웃·셸 아크릴·미카)을 실제 화면 측정에 맞추고, 창 열기·스냅 모션 클래스가 끝난 뒤 남아 창 안 흐림을 막던 문제를 고친다.
- dd2ecf9: MenuItem의 확인·라디오 항목이 선택 표시 다음에 아이콘과 이름 뒤에 단축키를 그리고, 앱 메뉴 타입이 두 속성을 받는다
- 48d4305: NavigationItem에 포커스 없는 선택(회색)·현재 칸 선(isCurrent)·즐겨찾기 압정(hasPin)을 더하고 브라우저 기본 외곽선을 지운다.
- 5577726: 바탕화면·탐색기·작업 표시줄·Chrome 메뉴 조립 그림과 새 아이콘 자산을 피그마에서 다시 내보냈다.
- 933f3fa: Chrome·탐색기 창 조립 그림과 그 그림이 쓰는 새 자산을 피그마에서 다시 내보냈다.
- 5ca06f0: SearchBox 작업 표시줄 변형의 돋보기를 채운 아이콘·거의 검정으로 바꾸고 왼쪽 여백을 12px로 줄였다.
- 8c729a0: Taskbar 피그마 내보내기를 시작 로고 여백 없는 자산과 채운 검색 돋보기 기준으로 갱신했다.
- 553ab1d: 작업 표시줄 앱 메뉴를 294 너비로 넓히고 Chrome 점프 목록(자주 방문 최신 글, 새 창)을 더했으며, 창 미리보기 카드 폭이 창 비율을 따르게 했다.

## 0.2.0

### Minor Changes

- 935168e: 드롭다운·우클릭 메뉴가 열리는 쪽으로 미끄러져 나오는 움직임(motion-menu-enter)을 더하고, 동작 줄이기에서 hover·pressed 색 전환도 바로 바뀌게 함
- af2783a: Start 고정됨 이동에서 나머지 칸이 미끄러지지 않고 교차 페이드하는 움직임(motion-start-pinned-move-swap)을 더하고, 세 단계를 메뉴가 사라진 순간 함께 시작함
- 22c3166: StartCategoryFolder를 피그마 갱신에 맞춤(Device 변형별 고정 크기·여백, 가운데 정렬한 Subtitle 제목, 팝업이 정하는 항목 칸 너비, Has pages 쪽 표시 점)

### Patch Changes

- 3019daf: 피그마 AddressBar 내보내기를 갱신함(description의 @ 줄 정리, sampleSize 추가, 모양 변화 없음)
- f725431: 피그마 Bookmark 내보내기를 갱신함(@ 줄 정리, 모양 변화 없음)
- 5a85de8: 피그마 BootScreen 그림을 다시 내보냄(모양 변화 없음)
- da4e9c1: 피그마 BreadcrumbItem 내보내기를 갱신함(말줄임을 @ 줄 대신 글자 말줄임 설정으로 표시, 모양 변화 없음)
- aaad1f7: 피그마 Breadcrumb 내보내기를 갱신함(@ 줄 정리와 경로 칸 말줄임 표시, 모양 변화 없음)
- ebeac9e: 피그마 BrowserToolbar 내보내기를 갱신함(@ 줄 정리, 모양 변화 없음)
- 602c4b9: 피그마 Callout 내보내기를 갱신함(@ 줄 정리, 모양 변화 없음)
- f48f800: 피그마 CodeBlock 내보내기를 갱신함(@ 줄을 Development 주석으로 옮김, 모양 변화 없음)
- 9a9ff62: 피그마 ColumnHeader 내보내기를 갱신함(description 정리, sampleSize 추가, 모양 변화 없음)
- e81038e: 피그마 EmptyState 내보내기를 갱신함(@ 줄 정리, 모양 변화 없음)
- ab5035a: 피그마 Equation 내보내기를 갱신함(@ 줄 정리, 모양 변화 없음)
- f104052: 피그마 ExplorerAddressRow 내보내기를 갱신함(@ 줄 정리와 경로 칸 말줄임 표시, 모양 변화 없음)
- 10a8a60: 피그마 ExplorerCommandBar 내보내기를 갱신함(@ 줄 정리, 모양 변화 없음)
- 56c2eec: 피그마 ExplorerStatusBar 내보내기를 갱신함(@ 줄 정리, 모양 변화 없음)
- 2df73d6: 피그마 Figure 내보내기를 갱신함(@ 줄 정리와 모션 이름 주석, 모양 변화 없음)
- 29c7783: 피그마 FileItem 내보내기를 갱신함(데스크톱 medium PNG 다시 내보냄, 모양 변화 없음)
- 921d4f7: 피그마 FileRow 내보내기를 갱신함(description 정리, sampleSize 추가, 모양 변화 없음)
- 468b65a: 피그마 Flyout 내보내기를 갱신함(MenuSeparator를 자동 배치 프레임으로 바꿈, 모양 변화 없음)
- 66b8752: 피그마 ListBlock 내보내기를 갱신함(@ 줄 정리, 모양 변화 없음)
- aa8332e: 피그마 ListItem 내보내기를 갱신함(description 정리, sampleSize 추가, 모양 변화 없음)
- 15a82d3: 피그마 Menu 내보내기를 갱신함(구분선 레이어를 자동 배치 프레임 안의 Separator로 바꿈, 모양 변화 없음)
- 260e6b5: MenuItem 확인 항목의 체크 표시를 12px 연한 회색(`black-45`, 비활성 `black-36`) 글리프로 바꿈(피그마 MenuItem 내보내기 반영)
- 46b110a: 피그마 motion-boot-screen-enter 내보내기를 갱신함(source flow, 주석 정리, 움직임 변화 없음)
- 58ad18e: 피그마 motion-boot-screen-exit 내보내기를 갱신함(source flow, 주석 정리, 움직임 변화 없음)
- 70e9c6f: 피그마 motion-flyout-enter 내보내기를 갱신함(directives 정리, notes·source 추가, 모양 변화 없음)
- a302345: 이미지 나타남 움직임(motion-image-enter)을 조립 흐름에서 다시 내보냄
- bb420f8: 이미지 스켈레톤 반짝임 움직임(motion-image-skeleton)을 Figure 원본에서 다시 내보냄
- 99ab840: Start·검색 패널 열기 움직임(motion-panel-enter)을 실제 Windows 측정대로 fast(167ms)로 줄임
- 5657d31: Start·검색 패널 닫기 움직임(motion-panel-exit)을 조립 흐름에서 다시 내보냄
- a24db97: 피그마에서 다시 내보낸 motion-progress-ring 자료를 반영함
- acdfee0: 순서 바꾸기 끌기 놓기 모션(`motion-reorder-drop`)을 피그마 조립 흐름 값(끄는 배율에서 시작, 가장 빠른 시간, 배율·이동 이징 분리)으로 바꾼다.
- fe9014e: 순서 바꾸기 끌기 시작 모션(`motion-reorder-lift`)을 피그마 조립 흐름 값(눌린 배율 → 끄는 배율, 느린 시간, 직접 진입 이징)으로 바꾼다.
- e3f81e2: 순서 바꾸기 누름 모션(`motion-reorder-press`) 클래스와 모션 스토리를 더한다. 눌린 배율(`motion-scale-reorder-press`)로 작아진다.
- 552e409: 순서 바꾸기에서 밀려나는 항목의 미끄러짐(motion-reorder-slide)을 실제 Windows 측정대로 slow(333ms)로 늘림
- aa49086: 피그마에서 다시 내보낸 motion-search-box-focus 자료를 반영함
- 1d0f0d2: Start 범주 팝업 닫기 모션 클래스(motion-start-category-folder-close)와 모션 스토리를 추가함
- 0576085: Start 범주 팝업 열기 모션 클래스(motion-start-category-folder-open)와 모션 스토리를 추가함
- e65ad3f: Start 범주 팝업 쪽 넘김 모션 클래스(motion-start-category-folder-page)와 모션 스토리를 추가함
- 007bbae: Start 글자 목록 열기 움직임(motion-start-jump-list-enter)의 격자 시작 배율을 실제 Windows 측정대로 1.5로 바꿈
- d3929d2: Start 글자 목록 닫기 움직임(motion-start-jump-list-exit)을 실제 Windows 측정대로 1.5배·normal(250ms)로 바꿈
- 4fe2e15: Start 고정됨 이동의 나타남 움직임(motion-start-pinned-move-enter)을 실제 Windows 측정대로 0.96배·slow·시작 지연으로 바꿈
- 67d6205: Start 고정됨 이동의 사라짐 움직임(motion-start-pinned-move-exit)을 실제 Windows 측정대로 0.91배·faster·시작 지연으로 바꿈
- f1004b4: 창 닫기 움직임(motion-window-close)을 조립 흐름에서 다시 내보냄
- 5d0e4c8: 창 최소화 움직임(motion-window-minimize)을 조립 흐름에서 다시 내보냄
- f84174d: 작업 표시줄에서 복원 움직임(motion-window-restore)을 조립 흐름에서 다시 내보냄
- 9dc8a66: 창 최대화·복원·스냅 움직임(motion-window-snap)을 조립 흐름에서 다시 내보냄
- 72538b9: 피그마 NavigationItem 내보내기를 갱신함(description 정리, sampleSize 추가, 모양 변화 없음)
- e17fec4: 피그마 PostCover 내보내기를 갱신함(@ 줄 정리, 모양 변화 없음)
- d1f18c7: 피그마 PostNavCard 내보내기를 갱신함(@ 줄 정리, 모양 변화 없음)
- 9a3fba7: 피그마 ProgressRing 내보내기를 갱신함(PNG 갱신, 모양 변화 없음)
- 300a643: 피그마 Quote 내보내기를 갱신함(@ 줄 정리, 모양 변화 없음)
- 2511479: 피그마 SearchResults 내보내기를 갱신함(ListGroup을 자동 배치 프레임으로 바꾼 구조 정리, 모양 변화 없음)
- f966fdf: 피그마 SectionHeader 내보내기를 갱신함(@ 줄 정리, 모양 변화 없음)
- f3fa8e2: 피그마 SectionTitle 내보내기를 갱신함(description 정리, sampleSize 추가, 모양 변화 없음)
- 70859b0: 피그마 SelectionMarquee 내보내기를 갱신함(description 정리, sampleSize 추가, 모양 변화 없음)
- 338bf1b: 피그마 Separator 내보내기를 갱신함(description 정리, sampleSize 추가, 모양 변화 없음)
- 0fa8ad2: 피그마 ShellSurface 내보내기를 갱신함(데스크톱 크기 832×862, 코드는 이미 셸 크기 토큰을 씀)
- d0aaf69: 피그마에서 다시 내보낸 start-category-folder 자료를 반영함
- b6bd04b: 피그마 TableCell 내보내기를 갱신함(@ 줄 정리, 모양 변화 없음)
- d8ab11e: 피그마 Table 내보내기를 갱신함(@ 줄 정리, 모양 변화 없음)
- 71cdf0e: 피그마 Taskbar 내보내기를 갱신함(@ 줄 정리, 모양 변화 없음)
- 990528c: 목차 항목(TocItem)의 세로 막대를 없애고 단계는 왼쪽 여백으로만 들여 쓰며, 긴 제목 말줄임과 Hover 바탕을 더함
- 15cd1b5: 목차(Toc) 항목 영역을 디자인 시스템 ScrollArea로 감싸고, 지금 읽는 위치로 목차를 부드럽게 스크롤함
- c172b40: 피그마 Toggle 내보내기를 갱신함(@ 줄 정리, 모양 변화 없음)
- 29c9d36: 피그마 재질 값, 색·모션·크기 토큰을 갱신함
- dd720be: 피그마 Tooltip 내보내기를 갱신함(모양 변화 없음)
- 03562de: 피그마 UnsupportedBlock 내보내기를 갱신함(@ 줄 정리, 모양 변화 없음)
- b9affbd: 메뉴·작업 표시줄 메뉴·미리보기 열기의 자르는 틀이 움직이는 동안만 자르게 하고, 틀의 크기와 자리는 바꾸지 않는다.
- 2a56829: 작업 표시줄 앱 메뉴 열기 모션(motion-taskbar-menu-enter)과 모션 스토리를 추가함
- 10a18bc: 작업 표시줄 창 미리보기 목록 열기 모션(motion-taskbar-preview-enter)과 모션 스토리를 추가함
- e75312f: 동작 줄이기에서 검색 돋보기 강조를 움직임 없이 끝 모습으로 바로 바꾼다.
- 0d29ba3: ScrollArea 스크롤바가 영역이 아니라 스크롤바 칸에 마우스를 올렸을 때만 펼치고, 막대를 끄는 동안은 칸 밖이어도 펼친 채로 두며 끈 만큼 스크롤함(피그마 Scrollbar 내보내기 description 정리 포함)
- cb48b17: SearchBox Pill 변형을 높이 30 알약 모양으로 맞춤
- 3649870: 피그마 SnapPreview 내보내기를 갱신함(description의 @ 줄 정리, sampleSize 추가, 모양 변화 없음)
- a3633d3: 피그마 StartCategoryCard 내보내기를 갱신함(description의 @ 줄 정리, sampleSize 추가, 기본 상태 바탕을 white/30으로 바꿈)
- ca1da95: StartCategoryFolder가 넘친 항목을 스크롤하지 않고 격자 영역에서 자르며, 쓰는 곳이 쪽 넘김을 하도록 격자 요소 속성(`gridProps`)을 받음
- 953776d: 피그마 StartMenuFooter 내보내기를 갱신하고 바탕 색을 뺌(피그마에서 바탕 채움이 없어짐)
- a0b35ca: 작업 표시줄 메뉴·미리보기 열기의 시작 이동을 실행 중 값 변수로 받고, 기본값은 요소 높이 기준으로 바꾼다.
- a3675f6: WindowFrame 마이카 창의 내용 자리에 불투명한 층(`color/gray/2`)을 깔아 제목 표시줄에만 재질이 비치게 함
- c6e5fb4: 피그마 WindowTitle 내보내기를 갱신함(description 정리, sampleSize 추가, 모양 변화 없음)

## 0.1.0

### Minor Changes

- f6292b9: 경로 줄(Breadcrumb)에 편집 상태(`isEditing`, `editFieldProps`)를 더한다. 편집 중에는 경로 칸 대신 경로 글자 입력칸을 그리고 경로 전체를 선택한다.
- 3dea38e: 창 버튼 묶음(CaptionButtonGroup)에 피그마 `Title bar` 변형(`titleBar`)을 더했다. 묶음 안 CaptionButton은 따로 주지 않으면 묶음의 값을 따라, `maximizeSlot`에 넣은 버튼도 같은 높이가 된다.
- 1ec88c9: 창 버튼(CaptionButton)에 피그마 `Title bar` 변형(`titleBar`)을 더해, 탭이 있는 높은 제목 표시줄(`custom`)에서는 높이 40으로 위아래를 꽉 채운다. 닫기 아이콘 자산도 피그마에서 다시 내보낸 대로 바꿨다.
- fef5f6a: 열 나누기 블록의 열 하나(Column) 컴포넌트를 더한다.
- 22a860e: Notion 열 나누기 블록(Columns) 컴포넌트를 더한다. 넓은 창은 열을 나란히, 좁은 창은 차례로 쌓는다(`layout`).
- ea5e7ff: 글 이미지(Figure)에 받는 중·실패 상태(`state`)를 더한다. 받는 중에는 회색 칸과 반짝임 칠, 실패에는 회색 칸만 그린다.
- d5fc16c: 다 받은 이미지가 서서히 나타나는 모션 클래스 `motion-image-enter`와 모션 스토리를 더했다.
- 11d76c9: 이미지를 받는 동안 Figure 스켈레톤의 반짝임이 지나가는 모션 클래스 `motion-image-skeleton`을 더해 Figure `state='loading'`의 반짝임 레이어에 붙이고 모션 스토리를 더했다. 동작 줄이기에서는 반짝이지 않는다.
- e5e318d: 순서 바꾸기 끌기에서 놓은 항목이 새 자리로 미끄러져 들어가며 원래 크기로 돌아오는 모션 클래스 `motion-reorder-drop`과 모션 스토리를 더했다.
- 7cb9867: 순서 바꾸기 끌기를 시작할 때 끄는 항목이 1.1배로 커지는 모션 클래스 `motion-reorder-lift`와 모션 스토리를 더했다.
- db8283f: 순서가 바뀌어 밀려나는 항목이 새 자리로 미끄러지는 모션 클래스 `motion-reorder-slide`와 모션 스토리를 더했다.
- e458028: Start 고정됨 칸을 메뉴로 옮길 때 옮기는 칸이 도착할 자리에서 커지며 나타나는 모션 클래스 `motion-start-pinned-move-enter`와 모션 스토리를 더했다.
- 193b11f: Start 고정됨 칸을 메뉴로 옮길 때 옮기는 칸이 제자리에서 작아지며 사라지는 모션 클래스 `motion-start-pinned-move-exit`과 모션 스토리를 더했다.
- 4021f3b: 탐색기 주소 줄(ExplorerAddressRow)이 안쪽 경로 줄의 편집 상태(`isBreadcrumbEditing`, `breadcrumbEditFieldProps`)를 받아 넘기고, 탐색기 본문 조립(Explorer/Content)에 주소 편집 모습(Address=Editing)을 더했다.
- 831d187: Start 모두 범주 보기의 범주 카드(StartCategoryCard) 컴포넌트를 더한다.
- 8832ccc: Start 범주 카드의 펼침 팝업(StartCategoryFolder) 컴포넌트를 더한다.
- 34b673f: 목차 항목(TocItem)에 제목 단계별 들여 쓰기(`level` 1·2·3)를 더한다.
- 09b1611: 목차(Toc)의 항목 자리가 최대 높이(`size/toc/items-max-height`)를 넘으면 목차 안에서 세로로 스크롤한다.

### Patch Changes

- f226ca1: 검색 결과 카드(BestMatchCard)의 긴 제목과 부가 정보를 한 줄로 두고 끝을 말줄임한다.
- 3c676c2: 탐색기 주소 줄(ExplorerAddressRow)의 피그마 견본을 경로 줄(Breadcrumb)의 새 `State` 속성에 맞춰 갱신한다.
- dfc7075: 피그마 토큰을 동기화했다. 토큰 `motion/scale/search-icon`이 `motion/scale/lift`로 이름이 바뀌어 모션 클래스가 새 변수를 쓰고, 파란색 불투명 변형과 목차 최대 높이, 스켈레톤 그라데이션 토큰이 더해졌다.
- f516948: 모바일에서 부팅 화면과 바탕화면이 화면을 가득 채우게 고쳤다. 부팅 화면(`BootScreen` `device="auto"`)과 앱 루트의 높이를 동적 뷰포트(`dvh`)로 두고, 작업 영역 높이는 `visualViewport`와 그 `resize`로 읽고, `html`·`body`에 바탕색을 두었다. 글 화면 맨 아래에 피그마 `Chrome/Page`의 아래 여백을 더했다.
- 8ed7483: 글 이미지가 받는 동안 Notion 크기의 비율로 자리를 잡는다(크기를 모르면 16:9). Figure는 이미지 크기(`imageSize`)를 받거나 쓰는 곳이 정한 높이를 채운다.
- bd6006d: 목록 묶음(ListGroup)의 피그마 견본을 머리글이 줄 전체 너비를 채우는 모양으로 갱신한다.
- 1e03cd3: 검색 돋보기 강조 견본(motion-search-box-focus)을 바뀐 배율 토큰 이름(`motion/scale/lift`)으로 다시 내보냈다. 모션 클래스는 이미 `--motion-scale-lift`를 써서 그대로다.
- 352cc75: Chrome 창 안의 글 페이지에서 누를 수 있는 요소(목차, 이전·다음 카드, 검색 결과 줄, 새 탭 바로가기, 코드 복사 버튼, 본문 링크)가 손가락 커서를 보이게 했다. Windows 화면은 화살표 그대로다.
- 6da18f2: Chrome 조립(Chrome/Page·PostBlocks)의 피그마 그림을 그림 상태, 목차 단계, 목록 표시가 반영된 모양으로 다시 내보내고, 바뀐 체크 표시·경고 아이콘 자산을 다시 만들었다.
- 8e57295: Start 고정 항목 메뉴(Menu/StartTile)가 칸 위치에 따라 이동 메뉴(앞으로·왼쪽으로·오른쪽으로 이동)를 고를 수 있는 것만 보이게 하고, 맨 앞으로 이동을 앞으로 이동으로 바꿨다.
- 3ae581f: Start 모두의 범주 보기를 범주마다 카드(큰 아이콘 3개와 나머지 묶음)를 4열로 놓는 모양으로 바꾸고, 범주 펼침 팝업 조립(Start/CategoryFolder)을 더했다. 전원 아이콘 자산을 다시 만들었다.
- 7a5b7fa: Start 메뉴의 프로필 버튼(ProfileButton)에 피그마 `State=Hover` 호버 배경과 둥근 모서리를 더해, 누를 수 있다는 것을 호버 배경으로 알린다.
- c2927cc: 검색 결과(SearchResults)의 피그마 견본을 줄 전체 너비 머리글과 한 줄 말줄임 카드 글자로 갱신한다.
- 4b6ed55: 목록 묶음 머리글(SectionHeader)이 줄 전체 너비를 채우고, 누를 수 있는 머리글은 목록 항목과 같은 호버 배경과 모션을 쓴다.
- 91da3a4: 선택 사각형(SelectionMarquee)을 피그마대로 반투명 파란 바탕과 파란 테두리로 바꿔 뒤의 아이콘이 비쳐 보이게 했다.
- 94612f7: 창 미리보기 판(TaskbarPreviewList)의 안쪽 여백과 카드 사이 간격을 없애고 판 모서리를 카드와 같은 둥글기로 바꿨다. 호버한 카드 영역 전체가 칠해진다. 모바일 미리보기 목록의 카드 너비 계산도 여기에 맞췄다.
- d6ee061: 탭이 있는 높은 제목 표시줄의 창(WindowFrame `custom`, 탐색기·Chrome)에서 창 버튼이 제목 표시줄 높이 40에 맞춰 위아래를 꽉 채운다. 스냅 레이아웃 최대화 버튼도 같은 높이다.
