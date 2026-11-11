# @seojaewan/web

## 0.3.0

### Minor Changes

- 99e3dfc: Chrome 주소창 추천 목록을 팝업이 아니라 주소창이 펼쳐진 모습(AddressBar Suggesting 카드 한 장)으로 바꾸고, 탭 검색(⌄) 버튼에 열린 탭 목록 메뉴를 붙인다. 탭 파비콘과 추천 줄 아이콘을 Material 아이콘으로 바꾸고, 맨 끝 활성 탭의 모서리 조각이 잘리지 않게 한다. 디자인 시스템은 내보낸 경고 아이콘 자산을 다시 생성했다.
- 6c0a749: 탐색기 경로의 꺾쇠를 누르면 하위 폴더(맨 앞은 바탕 화면·휴지통) 목록을 열어 고른 폴더로 가고, 주소창 편집의 지우기 버튼(×)이 입력을 비운다.
- 9afbe19: 탐색기 즐겨찾기 목록(처음 Project·Blog·About, 폴더만 고정, 휴지통의 폴더는 숨김)과 고정·해제·순서 바꾸기를 작업 공간 저장소에 더하고 방문자 브라우저에 저장한다.
- f37536a: 탐색기 탐색 창 맨 위에 즐겨찾기(압정, 구분선, 끌어 놓아 고정·순서 바꾸기)와 폴더 메뉴의 즐겨찾기에 고정·제거를 더하고, 위로·뒤로·앞으로 뒤에 선택을 되살리며, 명령 모음(정렬·보기 꺾쇠, 원 안 + 새로 만들기, 주소 줄 아래 구분선)·상태 표시줄(`N개 항목`, 지금 보기 켜짐)·위치 아이콘·탐색 창과 자세히 보기의 현재 칸 표시를 실제 Windows에 맞춘다.
- b8aa8d9: 작업 표시줄 탐색기 앱 메뉴 위에 즐겨찾기와 같은 "고정됨" 점프 목록(압정 해제 버튼, 항목 메뉴, 새 탐색기 창으로 열기)을 더했다.
- 553ab1d: 작업 표시줄 앱 메뉴를 294 너비로 넓히고 Chrome 점프 목록(자주 방문 최신 글, 새 창)을 더했으며, 창 미리보기 카드 폭이 창 비율을 따르게 했다.

### Patch Changes

- 75329e6: Windows 로고 자산을 여백 없는 40 프레임으로 다시 내보내고, 재부팅 화면 로고 크기 그림을 맞췄다.
- bc8d3ca: 바탕화면·탐색기 항목 메뉴의 잘라내기·이름 바꾸기·삭제를 단추 줄로 올리고(위로 열리면 맨 아래), 빈 곳 메뉴는 붙여넣을 것이 있을 때만 단추 줄에 붙여넣기를 보이게 했다. 끄는 복제본을 선택 상자째로 그리고, 탐색기 목록의 현재 항목에 1px 선을 그리며 자세히 보기 행이 목록 너비를 덮지 않게 했다.
- 07a7445: 보기 하위 메뉴에 아이콘과 보기 단축키(바탕화면 Ctrl+Shift+2·3·4, 탐색기 Ctrl+Shift+2·3·6)를 더하고 단축키가 실제로 동작하게 했다. 새로 만들기·폴더 메뉴 아이콘을 바꾸고, 하위 메뉴는 마우스가 400ms 머물러야 열리거나 바뀌게 했다.
- e68dba0: 경로 꺾쇠 목록 조립 그림을 위치 아이콘이 붙은 목록으로 다시 내보내고, 탐색기 창 조립 스토리를 피그마에 맞춰 즐겨찾기 칸, 경로 끝 꺾쇠, 탐색 창의 고른 칸, 상태 줄 보기를 그린다.
- e2f5b84: 탐색기 경로 꺾쇠 목록이 피그마 그림과 같은 자리에 열린다.
- ce60626: FileItem에 탐색기 현재 항목 선(`isCurrent`), 목록 포커스에 따른 회색 선택과 목록 밖 파란 선택(`isListFocused`)을 더하고, 바탕화면에서 이름을 바꾸는 동안 선택 바탕을 그리지 않는다. RenameField에 줄을 바꾸며 아래로 길어지는 여러 줄 방식(`isMultiline`)을 더하고 FileItem이 쓴다. 앱의 이름 바꾸기 훅 타입을 textarea도 받게 맞춘다.
- 0df2133: 점프 목록 고정 폴더의 항목 메뉴를 다른 우클릭 메뉴와 같은 공용 영역으로 열어, 모바일 길게 누르기로 열고 터치로 고정 해제해도 점프 목록이 열려 있게 한다. `MenuItem`이 `render`를 받는다.
- 20c60fc: 재질 값(플라이아웃·셸 아크릴·미카)을 실제 화면 측정에 맞추고, 창 열기·스냅 모션 클래스가 끝난 뒤 남아 창 안 흐림을 막던 문제를 고친다.
- dd2ecf9: MenuItem의 확인·라디오 항목이 선택 표시 다음에 아이콘과 이름 뒤에 단축키를 그리고, 앱 메뉴 타입이 두 속성을 받는다
- 5577726: 바탕화면·탐색기·작업 표시줄·Chrome 메뉴 조립 그림과 새 아이콘 자산을 피그마에서 다시 내보냈다.
- ab13170: 작업 표시줄 창 미리보기 조립 그림의 탐색기 축소 화면을 경로 끝 꺾쇠, 고른 칸, `N개 항목` 문구가 앱과 같은 모습으로 다시 내보냈다.
- 503881d: 탐색기 창 조립 그림을 보통 아이콘 보기에서 상태 줄 보기 버튼이 모두 꺼진 모습으로 다시 내보냈다.
- 933f3fa: Chrome·탐색기 창 조립 그림과 그 그림이 쓰는 새 자산을 피그마에서 다시 내보냈다.
- 813e375: 고정 메뉴 항목을 만드는 함수의 문서 연결을 고정 문서 섹션으로 맞춘다.
- 5ca06f0: SearchBox 작업 표시줄 변형의 돋보기를 채운 아이콘·거의 검정으로 바꾸고 왼쪽 여백을 12px로 줄였다.
- 8c729a0: Taskbar 피그마 내보내기를 시작 로고 여백 없는 자산과 채운 검색 돋보기 기준으로 갱신했다.
- b787591: 모바일 작업 표시줄 창 미리보기 목록을 축소 화면 없는 제목 줄로 세로로 쌓고, 목록 너비를 화면 폭에서 좌우 12px을 뺀 폭으로 맞춘다.
- 410c735: 작업 표시줄 앱 우클릭 메뉴의 구분선을 빼고 "작업 표시줄에서 제거"로 문구를 바꿨다. 앱 버튼을 끌어 순서를 바꾸는 동안 호버 바탕과 실행 표시를 끄고, Chrome 이름을 "Google Chrome"으로 바꿨다.
- 89daf85: WindowPreview: 누르는 영역과 닫기 버튼을 형제로 두고 `onSelect`로 누르는 영역만 버튼이 되게 해, 작업 표시줄 미리보기·Snap Assist에서 버튼 안 버튼이 생기지 않게 했다.
- Updated dependencies [f0abdb8]
- Updated dependencies [98328f2]
- Updated dependencies [75329e6]
- Updated dependencies [fda6e14]
- Updated dependencies [c16c125]
- Updated dependencies [2ea7a6a]
- Updated dependencies [3bd0eed]
- Updated dependencies [60a1509]
- Updated dependencies [671b848]
- Updated dependencies [99e3dfc]
- Updated dependencies [c36be91]
- Updated dependencies [99e1d42]
- Updated dependencies [86915d9]
- Updated dependencies [c967538]
- Updated dependencies [e6038cc]
- Updated dependencies [c9a839d]
- Updated dependencies [ce60626]
- Updated dependencies [6e95f3b]
- Updated dependencies [cb8b507]
- Updated dependencies [0df2133]
- Updated dependencies [20c60fc]
- Updated dependencies [7347752]
- Updated dependencies [d16dcbe]
- Updated dependencies [dd2ecf9]
- Updated dependencies [48d4305]
- Updated dependencies [5577726]
- Updated dependencies [933f3fa]
- Updated dependencies [5ca06f0]
- Updated dependencies [8c729a0]
- Updated dependencies [553ab1d]
- Updated dependencies [6b35412]
- Updated dependencies [89daf85]
- Updated dependencies [4d5ab1b]
- Updated dependencies [148e363]
  - @seojaewan/design-system@0.3.0

## 0.2.1

### Patch Changes

- b6cd351: Chrome 창 층 동작 스토리가 피그마 Window/Chrome 조립 크기로 창을 감싸도록 바꿈
- 3e5bb4d: Chrome 새 탭·검색 결과 페이지의 아래 여백과 찾을 수 없음 화면의 위아래 여백을 피그마 `Chrome/Page` 값에 맞춘다.
- 51e0a4b: 탐색기 주소창에 입력한 경로 끝이 글이나 외부 링크면 그 항목을 열고, 휴지통에 있는 항목(글·폴더·외부 링크)이면 복원할지 묻는 메시지 상자를 띄운 뒤 복원하고 연다
- 935168e: 드롭다운·우클릭 메뉴가 열리는 쪽으로 미끄러져 나오는 움직임(motion-menu-enter)을 더하고, 동작 줄이기에서 hover·pressed 색 전환도 바로 바뀌게 함
- af2783a: Start 고정됨 이동에서 나머지 칸이 미끄러지지 않고 교차 페이드하는 움직임(motion-start-pinned-move-swap)을 더하고, 세 단계를 메뉴가 사라진 순간 함께 시작함
- 4155724: 피그마 Desktop/Scene 조립 내보내기를 갱신함(레이어 트리 대신 조립 보고를 담고 작업 표시줄 아크릴 재질을 반영, 구성·배치 변화 없음)
- 9d75c80: 피그마 Menu 조립 내보내기를 갱신함(레이어 트리 대신 조립 보고를 담음, 항목·크기 변화 없음)
- 8facf35: 피그마 MessageBox 조립 내보내기를 갱신함(레이어 트리 대신 조립 보고를 담음, 글자·크기 변화 없음)
- d32994e: 데스크톱 검색 패널을 작업 표시줄 검색 상자 왼쪽 끝에 맞춰 열고(화면 밖이면 안쪽으로 밂), Start·검색 패널 너비를 좁은 화면에서 줄임
- e49e069: Start 본문 위 여백을 피그마 Start 조립에 맞추고, 본문 덧칠·검색 띠 구분선을 그리며, 범주 펼침 팝업을 Start 가운데 고정 크기로 열고 휠로 한 쪽씩 넘김
- 8c7b685: 피그마 Taskbar 조립 내보내기를 갱신함(레이어 트리 대신 조립 보고를 담음, 재질 토큰 변경으로 바탕 그림만 바뀜). 작업 표시줄 앱 버튼 우클릭 메뉴와 창 미리보기를 작업 표시줄 위 끝에서 12px(`spacing/md`) 띄워 엶
- 53c4be4: 피그마 Window 조립 내보내기를 갱신함(레이어 트리 대신 조립 보고를 담음, 그림은 컴포넌트 변화만 반영)
- 22c3166: StartCategoryFolder를 피그마 갱신에 맞춤(Device 변형별 고정 크기·여백, 가운데 정렬한 Subtitle 제목, 팝업이 정하는 항목 칸 너비, Has pages 쪽 표시 점)
- 15cd1b5: 목차(Toc) 항목 영역을 디자인 시스템 ScrollArea로 감싸고, 지금 읽는 위치로 목차를 부드럽게 스크롤함
- b9affbd: 메뉴·작업 표시줄 메뉴·미리보기 열기의 자르는 틀이 움직이는 동안만 자르게 하고, 틀의 크기와 자리는 바꾸지 않는다.
- e24b0a1: Start 범주 펼침 팝업이 마우스 휠과 클릭을 받도록 고침
- Updated dependencies [3019daf]
- Updated dependencies [f725431]
- Updated dependencies [5a85de8]
- Updated dependencies [da4e9c1]
- Updated dependencies [aaad1f7]
- Updated dependencies [ebeac9e]
- Updated dependencies [602c4b9]
- Updated dependencies [f48f800]
- Updated dependencies [9a9ff62]
- Updated dependencies [e81038e]
- Updated dependencies [ab5035a]
- Updated dependencies [f104052]
- Updated dependencies [10a8a60]
- Updated dependencies [56c2eec]
- Updated dependencies [2df73d6]
- Updated dependencies [29c7783]
- Updated dependencies [921d4f7]
- Updated dependencies [468b65a]
- Updated dependencies [66b8752]
- Updated dependencies [aa8332e]
- Updated dependencies [15a82d3]
- Updated dependencies [260e6b5]
- Updated dependencies [46b110a]
- Updated dependencies [58ad18e]
- Updated dependencies [70e9c6f]
- Updated dependencies [a302345]
- Updated dependencies [bb420f8]
- Updated dependencies [935168e]
- Updated dependencies [99ab840]
- Updated dependencies [5657d31]
- Updated dependencies [a24db97]
- Updated dependencies [acdfee0]
- Updated dependencies [fe9014e]
- Updated dependencies [e3f81e2]
- Updated dependencies [552e409]
- Updated dependencies [aa49086]
- Updated dependencies [1d0f0d2]
- Updated dependencies [0576085]
- Updated dependencies [e65ad3f]
- Updated dependencies [007bbae]
- Updated dependencies [d3929d2]
- Updated dependencies [4fe2e15]
- Updated dependencies [67d6205]
- Updated dependencies [af2783a]
- Updated dependencies [f1004b4]
- Updated dependencies [5d0e4c8]
- Updated dependencies [f84174d]
- Updated dependencies [9dc8a66]
- Updated dependencies [72538b9]
- Updated dependencies [e17fec4]
- Updated dependencies [d1f18c7]
- Updated dependencies [9a3fba7]
- Updated dependencies [300a643]
- Updated dependencies [2511479]
- Updated dependencies [f966fdf]
- Updated dependencies [f3fa8e2]
- Updated dependencies [70859b0]
- Updated dependencies [338bf1b]
- Updated dependencies [0fa8ad2]
- Updated dependencies [d0aaf69]
- Updated dependencies [22c3166]
- Updated dependencies [b6bd04b]
- Updated dependencies [d8ab11e]
- Updated dependencies [71cdf0e]
- Updated dependencies [990528c]
- Updated dependencies [15cd1b5]
- Updated dependencies [c172b40]
- Updated dependencies [29c9d36]
- Updated dependencies [dd720be]
- Updated dependencies [03562de]
- Updated dependencies [b9affbd]
- Updated dependencies [2a56829]
- Updated dependencies [10a18bc]
- Updated dependencies [e75312f]
- Updated dependencies [0d29ba3]
- Updated dependencies [cb48b17]
- Updated dependencies [3649870]
- Updated dependencies [a3633d3]
- Updated dependencies [ca1da95]
- Updated dependencies [953776d]
- Updated dependencies [a0b35ca]
- Updated dependencies [a3675f6]
- Updated dependencies [c6e5fb4]
  - @seojaewan/design-system@0.2.0

## 0.2.0

### Minor Changes

- f48d4bf: 작업 표시줄 고정 앱, 탐색기·Chrome 탭, Start 고정됨을 끌어 순서를 바꿀 때 끄는 항목이 커진 채 포인터를 따라오고, 밀려나는 항목은 새 자리로 미끄러지고, 놓으면 새 자리로 들어간다.
- 502e6b4: 탐색기 주소창의 빈 곳을 누르면 경로를 입력해 Enter로 그 폴더로 갈 수 있다. 찾지 못하면 메시지 상자를 띄우고, Esc나 포커스를 잃으면 입력을 버린다.
- 5a09709: 글 이미지(본문, 커버, 크게 보기)를 받는 동안 반짝이는 스켈레톤을 보이고, 다 받으면 서서히 나타나며, 받지 못하면 회색 칸으로 남긴다. 이미 받아진 이미지는 바로 보인다.
- 93e51cd: Notion 열 나누기(column_list·column)를 글 본문에 그린다. 넓은 창은 열을 width_ratio 비율로 나란히, 좁은 창은 차례로 쌓고, 열 안의 제목도 목차에 넣는다.
- 2b868c7: Start 모두의 범주 카드에서 묶음이나 빈 곳을 누르면 카드 자리 위에 범주의 모든 항목을 보이는 펼침 팝업을 연다. 바깥을 누르거나 Esc로 닫는다.
- cd8193f: Start 고정됨 칸의 우클릭 메뉴에 왼쪽으로 이동·오른쪽으로 이동을 연결하고, 메뉴로 옮길 때 칸이 사라진 뒤 나머지가 미끄러지고 새 자리에서 나타나게 했다.
- 06cd473: Chrome 글 화면 목차가 가장 높은 제목 단계를 1로 하는 상대 단계로 들여 쓰고, 목차가 넘치면 지금 읽는 위치 항목이 보이도록 목차 안에서만 스크롤한다.

### Patch Changes

- f226ca1: 검색 결과 카드(BestMatchCard)의 긴 제목과 부가 정보를 한 줄로 두고 끝을 말줄임한다.
- f6292b9: 경로 줄(Breadcrumb)에 편집 상태(`isEditing`, `editFieldProps`)를 더한다. 편집 중에는 경로 칸 대신 경로 글자 입력칸을 그리고 경로 전체를 선택한다.
- 3dea38e: 창 버튼 묶음(CaptionButtonGroup)에 피그마 `Title bar` 변형(`titleBar`)을 더했다. 묶음 안 CaptionButton은 따로 주지 않으면 묶음의 값을 따라, `maximizeSlot`에 넣은 버튼도 같은 높이가 된다.
- 1ec88c9: 창 버튼(CaptionButton)에 피그마 `Title bar` 변형(`titleBar`)을 더해, 탭이 있는 높은 제목 표시줄(`custom`)에서는 높이 40으로 위아래를 꽉 채운다. 닫기 아이콘 자산도 피그마에서 다시 내보낸 대로 바꿨다.
- e6d30a2: 넓은 화면 Chrome 글의 좌우 여백을 32px로 맞춘다
- fef5f6a: 열 나누기 블록의 열 하나(Column) 컴포넌트를 더한다.
- 22a860e: Notion 열 나누기 블록(Columns) 컴포넌트를 더한다. 넓은 창은 열을 나란히, 좁은 창은 차례로 쌓는다(`layout`).
- 3ace9c4: 공유 미리보기 설명을 Summary로만 정하고, Summary가 비어 있으면 본문 첫 문단 대신 사이트 소개를 쓴다.
- 3c676c2: 탐색기 주소 줄(ExplorerAddressRow)의 피그마 견본을 경로 줄(Breadcrumb)의 새 `State` 속성에 맞춰 갱신한다.
- dfc7075: 피그마 토큰을 동기화했다. 토큰 `motion/scale/search-icon`이 `motion/scale/lift`로 이름이 바뀌어 모션 클래스가 새 변수를 쓰고, 파란색 불투명 변형과 목차 최대 높이, 스켈레톤 그라데이션 토큰이 더해졌다.
- ea5e7ff: 글 이미지(Figure)에 받는 중·실패 상태(`state`)를 더한다. 받는 중에는 회색 칸과 반짝임 칠, 실패에는 회색 칸만 그린다.
- f516948: 모바일에서 부팅 화면과 바탕화면이 화면을 가득 채우게 고쳤다. 부팅 화면(`BootScreen` `device="auto"`)과 앱 루트의 높이를 동적 뷰포트(`dvh`)로 두고, 작업 영역 높이는 `visualViewport`와 그 `resize`로 읽고, `html`·`body`에 바탕색을 두었다. 글 화면 맨 아래에 피그마 `Chrome/Page`의 아래 여백을 더했다.
- fa334d8: 숨겨진 탭에서 글 주소로 처음 들어오면 Chrome 창이 0×0으로 남던 문제를 고쳤다. 화면 크기가 0이면 작업 영역을 모르는 것으로 보고 첫 창을 열지 않다가, 크기가 생기면 연다.
- 8ed7483: 글 이미지가 받는 동안 Notion 크기의 비율로 자리를 잡는다(크기를 모르면 16:9). Figure는 이미지 크기(`imageSize`)를 받거나 쓰는 곳이 정한 높이를 채운다.
- bd6006d: 목록 묶음(ListGroup)의 피그마 견본을 머리글이 줄 전체 너비를 채우는 모양으로 갱신한다.
- d5fc16c: 다 받은 이미지가 서서히 나타나는 모션 클래스 `motion-image-enter`와 모션 스토리를 더했다.
- 11d76c9: 이미지를 받는 동안 Figure 스켈레톤의 반짝임이 지나가는 모션 클래스 `motion-image-skeleton`을 더해 Figure `state='loading'`의 반짝임 레이어에 붙이고 모션 스토리를 더했다. 동작 줄이기에서는 반짝이지 않는다.
- e5e318d: 순서 바꾸기 끌기에서 놓은 항목이 새 자리로 미끄러져 들어가며 원래 크기로 돌아오는 모션 클래스 `motion-reorder-drop`과 모션 스토리를 더했다.
- 7cb9867: 순서 바꾸기 끌기를 시작할 때 끄는 항목이 1.1배로 커지는 모션 클래스 `motion-reorder-lift`와 모션 스토리를 더했다.
- db8283f: 순서가 바뀌어 밀려나는 항목이 새 자리로 미끄러지는 모션 클래스 `motion-reorder-slide`와 모션 스토리를 더했다.
- 1e03cd3: 검색 돋보기 강조 견본(motion-search-box-focus)을 바뀐 배율 토큰 이름(`motion/scale/lift`)으로 다시 내보냈다. 모션 클래스는 이미 `--motion-scale-lift`를 써서 그대로다.
- e458028: Start 고정됨 칸을 메뉴로 옮길 때 옮기는 칸이 도착할 자리에서 커지며 나타나는 모션 클래스 `motion-start-pinned-move-enter`와 모션 스토리를 더했다.
- 193b11f: Start 고정됨 칸을 메뉴로 옮길 때 옮기는 칸이 제자리에서 작아지며 사라지는 모션 클래스 `motion-start-pinned-move-exit`과 모션 스토리를 더했다.
- 352cc75: Chrome 창 안의 글 페이지에서 누를 수 있는 요소(목차, 이전·다음 카드, 검색 결과 줄, 새 탭 바로가기, 코드 복사 버튼, 본문 링크)가 손가락 커서를 보이게 했다. Windows 화면은 화살표 그대로다.
- 6da18f2: Chrome 조립(Chrome/Page·PostBlocks)의 피그마 그림을 그림 상태, 목차 단계, 목록 표시가 반영된 모양으로 다시 내보내고, 바뀐 체크 표시·경고 아이콘 자산을 다시 만들었다.
- 4021f3b: 탐색기 주소 줄(ExplorerAddressRow)이 안쪽 경로 줄의 편집 상태(`isBreadcrumbEditing`, `breadcrumbEditFieldProps`)를 받아 넘기고, 탐색기 본문 조립(Explorer/Content)에 주소 편집 모습(Address=Editing)을 더했다.
- 8e57295: Start 고정 항목 메뉴(Menu/StartTile)가 칸 위치에 따라 이동 메뉴(앞으로·왼쪽으로·오른쪽으로 이동)를 고를 수 있는 것만 보이게 하고, 맨 앞으로 이동을 앞으로 이동으로 바꿨다.
- 20fd23a: 주소창에 입력한 경로의 폴더를 찾지 못했을 때 알리는 메시지 상자 조립(MessageBox/PathNotFound)을 더했다.
- 97090ac: 검색 본문 조립(Search/Body)의 피그마 그림을 구역 머리글 호버 모양과 최고 일치 카드 말줄임이 반영된 모양으로 다시 내보냈다.
- 3ae581f: Start 모두의 범주 보기를 범주마다 카드(큰 아이콘 3개와 나머지 묶음)를 4열로 놓는 모양으로 바꾸고, 범주 펼침 팝업 조립(Start/CategoryFolder)을 더했다. 전원 아이콘 자산을 다시 만들었다.
- a312dcd: 작업 표시줄 창 미리보기 조립(Taskbar/PreviewList)의 피그마 그림을 판 여백 없는 모양과 사용자 지정 제목 표시줄 캡션 버튼으로 다시 내보냈다.
- ad2c849: 창 조립(Window/Chrome·Explorer·SnapAssist)의 피그마 그림을 사용자 지정 제목 표시줄 캡션 버튼, 목차 단계, 그림 상태가 반영된 모양으로 다시 내보냈다.
- 7a5b7fa: Start 메뉴의 프로필 버튼(ProfileButton)에 피그마 `State=Hover` 호버 배경과 둥근 모서리를 더해, 누를 수 있다는 것을 호버 배경으로 알린다.
- c2927cc: 검색 결과(SearchResults)의 피그마 견본을 줄 전체 너비 머리글과 한 줄 말줄임 카드 글자로 갱신한다.
- 4b6ed55: 목록 묶음 머리글(SectionHeader)이 줄 전체 너비를 채우고, 누를 수 있는 머리글은 목록 항목과 같은 호버 배경과 모션을 쓴다.
- 91da3a4: 선택 사각형(SelectionMarquee)을 피그마대로 반투명 파란 바탕과 파란 테두리로 바꿔 뒤의 아이콘이 비쳐 보이게 했다.
- 831d187: Start 모두 범주 보기의 범주 카드(StartCategoryCard) 컴포넌트를 더한다.
- 8832ccc: Start 범주 카드의 펼침 팝업(StartCategoryFolder) 컴포넌트를 더한다.
- 94612f7: 창 미리보기 판(TaskbarPreviewList)의 안쪽 여백과 카드 사이 간격을 없애고 판 모서리를 카드와 같은 둥글기로 바꿨다. 호버한 카드 영역 전체가 칠해진다. 모바일 미리보기 목록의 카드 너비 계산도 여기에 맞췄다.
- 34b673f: 목차 항목(TocItem)에 제목 단계별 들여 쓰기(`level` 1·2·3)를 더한다.
- 09b1611: 목차(Toc)의 항목 자리가 최대 높이(`size/toc/items-max-height`)를 넘으면 목차 안에서 세로로 스크롤한다.
- d6ee061: 탭이 있는 높은 제목 표시줄의 창(WindowFrame `custom`, 탐색기·Chrome)에서 창 버튼이 제목 표시줄 높이 40에 맞춰 위아래를 꽉 채운다. 스냅 레이아웃 최대화 버튼도 같은 높이다.
- 5262bb9: 작업 영역 높이를 visualViewport 대신 innerHeight 기준으로 되돌린다
- Updated dependencies [f226ca1]
- Updated dependencies [f6292b9]
- Updated dependencies [3dea38e]
- Updated dependencies [1ec88c9]
- Updated dependencies [fef5f6a]
- Updated dependencies [22a860e]
- Updated dependencies [3c676c2]
- Updated dependencies [dfc7075]
- Updated dependencies [ea5e7ff]
- Updated dependencies [f516948]
- Updated dependencies [8ed7483]
- Updated dependencies [bd6006d]
- Updated dependencies [d5fc16c]
- Updated dependencies [11d76c9]
- Updated dependencies [e5e318d]
- Updated dependencies [7cb9867]
- Updated dependencies [db8283f]
- Updated dependencies [1e03cd3]
- Updated dependencies [e458028]
- Updated dependencies [193b11f]
- Updated dependencies [352cc75]
- Updated dependencies [6da18f2]
- Updated dependencies [4021f3b]
- Updated dependencies [8e57295]
- Updated dependencies [3ae581f]
- Updated dependencies [7a5b7fa]
- Updated dependencies [c2927cc]
- Updated dependencies [4b6ed55]
- Updated dependencies [91da3a4]
- Updated dependencies [831d187]
- Updated dependencies [8832ccc]
- Updated dependencies [94612f7]
- Updated dependencies [34b673f]
- Updated dependencies [09b1611]
- Updated dependencies [d6ee061]
  - @seojaewan/design-system@0.1.0

## 0.1.1

### Patch Changes

- 15255e9: 의존성 갱신을 배포한다(Node 24.22.2 이미지, pnpm 12.18.0, vite, Storybook, Playwright, ESLint 플러그인).

## 0.1.0

### Minor Changes

- b63f2df: 공용 젠킨스로 배포할 Docker 이미지(Next.js standalone)와 상태 확인 주소 `/api/health`를 더했다. 첫 배포 버전으로 0.1.0을 연다.
