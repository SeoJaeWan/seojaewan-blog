# @seojaewan/web

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
