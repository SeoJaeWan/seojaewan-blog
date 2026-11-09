# @seojaewan/design-system

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
