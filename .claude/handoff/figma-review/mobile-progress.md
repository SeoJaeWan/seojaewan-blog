# 모바일 작업 진행 기록 (이어서 할 때 먼저 읽기)

## 방법(정해 쓴 것)

- 축: 세트의 기존 변형 이름 끝에 `, Device=Desktop`을 붙이고(변형 id·연결·인스턴스 그대로인지 전후 비교), 모바일 변형은 `…, Device=Mobile`. 모바일 변형은 모두 화면 전체 390×844(clipsContent, layoutMode NONE).
- 스크립트: `draw-flow-arrows.js`가 두 열을 그림(UNIV). 설정에 mstart(Device 뺀 이름)·mlabels·morder·mparentFirst·mextraAsNote. 실행 코드는 `./_mk.sh <조립>` → `_run.js`(줄인 것)를 Read해 use_figma code에 붙임. 설명 줄 머리말 `모바일 흐름:`·`모바일 키보드 흐름:`(키보드 흐름 묶음 뒤, 다음 머리말 앞).
- 설명을 다시 쓸 때는 반드시 엔티티를 푼 글(&#39;→' &quot;→" &amp;→&)을 써야 함(그대로 쓰면 겹쳐 바뀜).
- 모바일 연결(프로토타입)은 걸지 않고 설명 줄로만 그림(보고에 적을 것).
- 화면 엮기(use_figma 안 도우미): Scene Mobile `567:4737` 인스턴스 → 옛 견본(@Patterns 517:16130)만 위에서 아래로 detach(dd), layoutMode NONE, 작업 표시줄 y=796. icons에 PC 변형의 `icon/접근성 모드` 복제를 둘째로, Taskbar(detach) Center에 PC `접근성 모드` 버튼 복제를 다섯째로, left space를 FIXED 60(시계와 겹치지 않게). 글꼴은 Pretendard·Inter 전부 먼저 로드. 연결 지우기는 id가 'I'로 시작하지 않는 노드만.
- PC 재료 위치: Search PC `View=Opened` 6234:20024(접근성 꺼짐), `View=Accessibility on` 6234:20465(켜짐) 안의 `icon/접근성 모드`, Taskbar>Center>`접근성 모드`.
- 검색 패널: M-3 `592:8883`(입력 전), M-4 `558:15076`(결과)을 clone → dd, y=156. Chrome 창: `564:7105` 인스턴스 → dd, (0,0). 탐색기 창: `564:6952`.
- 접근성 패널 부품: 세트 `6253:92276`(Shell 페이지). `Device=Desktop, Picking=Off` 6148:515, `Device=Mobile, Picking=Off` 6253:92247(390×42), `Device=Mobile, Picking=On` 6253:92248(390×66, 메뉴 단추 Pressed + 안내 글 한 줄). 아래 자리 y = 796 − 높이, 위 자리 y=0. 단추 이름 `button 메뉴|빈 곳 메뉴|자리|닫기`(State=Disabled로 흐리게). 속성 id가 #6253:0/#6253:1로 바뀜(값은 그대로, 인스턴스 38개 확인).
- 눈으로 보기: 임시 판 `tmp board`(페이지 -4000,-4000, 4열, 칸 430×904, 이름표 글자)를 만들어 get_screenshot → `./_mb.sh <이름> <url>` → new/mobile/<이름>-r<n>.png. 다음 호출에서 판을 지움. 흐름도: 틀(table/…)을 maxDimension 8192로 찍어 `./_mflow.sh <이름> <url> <세트 폭> <모바일 열 왼쪽> <모바일 키보드 윗변>`.

## 끝난 것

- AccessibilityPanel 부품 변형 둘 추가(위). 캡처 new/mobile/part-accessibility-panel.png
- Search: 축 추가(9개 이름 변경, 연결 63·인스턴스 13 그대로), 모바일 변형 8(입력 전 6254:1731, 처음 방문 6254:2031, 결과 6254:2675, 결과 없음 6254:3150, 항목을 엶 6254:3539, 접근성 모드 켜짐 6254:3707, 접근성 패널이 보임 6254:4206, 다른 항목을 고름 6254:8079). 스크립트: PC 9변형 5·8(그대로), 모바일 화살표 6·7, bad 0. 세트 16920×14174, 모바일 열 x 11075~. 캡처 search-1-r1/r2, search-2-r1, flow-search-*.png. 임시 판 6255:4062는 아직 안 지움.

## 남은 차례

Desktop → Taskbar → Start → Article → Chrome → Explorer → Windows

## (덧붙임) Desktop 끝남

- Desktop: 축 추가(64개 이름 변경, PC 연결 363 그대로), 모바일 변형 38(Rest 6259:5878, Opened folder 6259:6366, Menu 6259:7294, Menu view 6259:7546, Accessibility on 6259:10792, Panel picking 6259:10980, Panel item menu 6259:11214, Panel place menu 6259:11430, Panel moved 6259:12027, Icon menu folder keyboard 6259:12534, Menu view keyboard 6259:12783 등). 스크립트: PC 64변형 59·55(그대로), 모바일 33·26, bad 0. 세트 46118×96372, 모바일 열 x 32241~, 키보드 윗변 24004. 캡처 desktop-1-r1~r10, flow-desktop-touch*.png, flow-desktop-key*.png. 임시 조각(tmp slice touch 6262:11982, key 6262:11983)이 틀 6016:8861 안에 남아 있음(지울 것).
- 만드는 법(Desktop에서 쓴 것): PC 변형의 Icons 자식을 복제해 모바일 icons에 같은 x,y로. 메뉴는 PC 변형의 Menu/Submenu 인스턴스 복제(빼는 항목은 MenuItem의 Label로 찾아 remove, 손가락으로 연 메뉴는 Has shortcut=false, 키보드로 연 것은 그대로). 빈 곳 메뉴 (12,330), 하위 메뉴 x=128(겹쳐 놓음). 알림 상자는 PC의 MessageBox 틀 복제 → 안 인스턴스 resize(358) → 가운데. 복제 뒤 연결은 모두 지움(PC 연결 수 전후 비교, 그대로였음).
- 실행: `./_mk.sh <조립>` → `_cfg.js`(설정) + `_body.min.js`(몸통, md5 de82a76f)를 이어 붙임. 설명 쓰기는 따로 한 호출(글꼴 로드 먼저, 엔티티 풀고 씀), 스크립트는 그다음 호출. 흐름도 보기는 틀 안에 slice를 만들어 get_screenshot → `./_mcol.sh <이름> <url> [조각 수]`.
- 남은 차례: Taskbar → Start → Article → Chrome → Explorer → Windows

## Taskbar 끝남

- 축 추가(36개, PC 연결 1078 그대로), 모바일 변형 25(ids 6265:11116…6265:20105: 기본, Start 열림, 검색 열림, 검색 결과가 열림, 맨 앞 창을 최소화함, 미리보기 열림(탐색기), 창이 맨 앞으로, 앱 메뉴(탐색기), 순서 바뀜, 앱 메뉴(Chrome), 창을 닫음, 앱을 새 창으로 엶, 접근성 모드 켜짐, 앱 메뉴(접근성 모드), 앱 메뉴(접근성, 켜져 있음), 패널 자리 메뉴, 패널을 위로 옮김, 메뉴 단추를 누름, 패널로 연 앱 메뉴, 시작/검색/앱 버튼 포커스, 미리보기 키보드 첫 줄/다음 줄/닫기 포커스). 스크립트: PC 29·26(그대로), 모바일 18·17, bad 0. 세트 32888×33492, 모바일 열 x 21025~, 키보드 윗변 14172. 캡처 taskbar-1-r1~r7, flow-taskbar-touch*.png, flow-taskbar-key*.png. 임시 조각 6273:18242, 6273:18243(틀 안, 지울 것).
- 재료: Start 패널은 M-2 화면의 `Start/Menu` 558:14818(y=156) 복제 → dd. 미리보기 목록 `3505:9143`(2줄, 366×98, x=12, y=796−12−높이). 새 탭 Chrome: 564:7105 인스턴스에서 Chrome/Page를 89:2551로 swap, title '새 탭', address bar Filled=False. 버튼 포커스는 TaskbarButton State=Focused, 줄 포커스는 WindowPreview(Variant=Title) State=Focused, 닫기는 close 인스턴스 State=Focused.
- 스크립트 호출 꼴: 몸통을 `const __out = await (async () => { …몸통… })();`로 싸고 뒤에 모바일 열 slice 만드는 코드를 붙여 한 호출로 함.
- 남은 차례: Start → Article → Chrome → Explorer → Windows

## Start 끝남

- 축 추가(43개, PC 연결 827 그대로), 모바일 변형 25(6275:10034 기본 … 6275:24895 줄에 포커스; '범주 카드에 포커스'는 부품(모바일 StartCategoryCard)에 Focused 변형이 없어 지우고 글줄로). 패널 변형 넷은 '빈 곳 메뉴' 단추 Disabled. 스크립트: PC 30·39(그대로), 모바일 19·19, bad 0. 세트 43475×59694, 모바일 열 x 25135~, 키보드 윗변 14224. 캡처 start-1-r1~r7, flow-start-touch*.png, flow-start-key*.png. 임시 조각 6277:18932, 6277:18933(지울 것).
- 본 흠: 포커스 테두리(타일·보기 버튼·줄)가 스크롤 영역에 조금 잘림. 접근성 패널이 아래일 때 사용자 띠·전원 버튼을 덮음(정한 대로).
- 재료: Start 패널 558:14818 clone → Start/Body를 Category 554:13489 / Grid 554:13384 / Results 554:13566 / JumpList 755:5561로 swap → dd. 범주 폴더 3350:8024. 재부팅 화면 BootScreen Mobile 3995:479.
- 남은 차례: Article → Chrome → Explorer → Windows

## Chrome · Article 끝남

- Chrome: 축 추가(35개, PC 연결 590 그대로), 모바일 변형 13(Rest 6280:8801, More menu 6280:9393, Find open 6280:9888, Find typed 6280:10373, Zoomed 6280:10920, Suggesting 6280:11404, Search results 6280:11808, Not found 6280:12187, Trashed post alert 6280:12646, Window closed 6280:12778, Panel shown 6280:13322, More focused 6280:13771, More menu keyboard 6280:14318). PC 27·35(그대로), 모바일 10·10, bad 0. 세트 23780×46444, 모바일 열 x 17103~, 키보드 윗변 10788.
- Article: 축 추가(10개, PC 연결 45 그대로), 모바일 변형 6(Rest 6280:14763, Toc open 6280:15258, Reading moved 6280:15703, Image viewer 6280:16158, Image focused 6280:16608, Panel shown 6280:17082). PC 6·9(그대로), 모바일 4·5, bad 0. 세트 15715×25658, 모바일 열 x 7735~, 키보드 윗변 4560.
- 임시 조각: Chrome 6282:15996·6282:15997, Article 6282:15998·6282:15999(지울 것). 캡처 chrome-1-r1~r5, flow-chrome-_.png, flow-article-_.png.
- **창 만드는 법이 바뀜(중요)**: 옛 견본 창(564:7105, 564:6952) 인스턴스를 detach한 뒤, 안의 `window`(WindowFrame 인스턴스)는 slot 자식이 'I…' id라 dd로 떼어지지 않는다 → `unwrap`: window.detachInstance() → dd → 새 WindowFrame 인스턴스(main.createInstance())의 Content slot에 자식을 appendChild, 제목·앱 아이콘·버튼 숨김을 옮기고 옛 것은 지움(B 방식, 됨). **앞에서 만든 Search·Desktop·Taskbar·Start의 모바일 변형 속 창은 옛 방식이라 옛 견본 인스턴스(Chrome/Page, Chrome/Toolbar, Explorer/Content 등)가 남아 있음 → 고쳐야 함**(변형마다 `win/*` 틀 안 window에 unwrap 적용, 끝에 isOld 인스턴스 수 0 확인).
- 못 그린 것: Chrome 찾는 중의 본문 강조, 확대한 본문(110%), 찾을 수 없음 본문의 주소 글자(옛 견본 글자 그대로), Article 접힌 목차의 포커스 모습(Toc에 포커스 변형 없음).
- 남은 차례: (창 고치기) → Explorer → Windows → decisions.md·figma-state.json 기록 → 보고
- 창 고치기 끝남: Search·Desktop·Taskbar·Start 모바일 변형의 창 28개를 unwrap(B)으로 바꿈. 여섯 세트의 모바일 변형에 옛 견본 인스턴스 0개(센 값), PC 연결 수 그대로. 임시 조각 모두 지움. 캡처 fixwin-desktop-opened.png, fixwin-taskbar-newtab.png.

## Explorer 진행 중

- 부품: FileRow 세트 514:15135(Controls 페이지)에 `View=Mobile, State=Rest` 6285:700(366×48, 두 줄: line 1 = icon + name, line 2 = meta). 속성 Name#514:0(이름), Meta#6285:2(둘째 줄), 아이콘은 안의 icon 인스턴스를 swap(속성 Icon#514:5에는 묶이지 않음). 캡처 part-filerow-mobile.png.
- PC 재료: 본문 항목은 PC 변형의 `ExplorerContent` 틀 자식(아이콘 보기는 ExplorerFileItem, 자세히는 `details` 틀 > FileRow). 메뉴 노드: Menu folder 6187:10934, Menu post 6187:11304, Menu empty 6187:11758, Sort menu 6187:6958, View menu 6187:7574, Recycle item menu 6188:13558, Recycle empty menu 6188:13648, 알림 Path not found 6236:27495, Empty recycle 6236:30279, Trashed path 6236:28392, Balloon 6187:6162. PC 변형 id: Rest 6186:608, Folder opened 6186:3905, Search results 6186:5911, New folder 6187:4222, New folder named 6187:4512, Cut 6187:4774, Paste ready 6187:5030, Pasted 6187:5323, Renaming 6187:5592, Renamed 6187:5850, Deleted 6187:6372, Sorted desc 6187:7014, Large icons 6187:7606, Details 6187:7892, Recycle bin 6188:12387, Recycle restored 6188:13001, Content focused 6188:15277.
- 옛 모바일 재료: 창 564:6952(안 Explorer/Content 인스턴스 → Editing은 3350:8678로 swap, 주소 줄 검색 열림 1379:7327, 휴지통 명령 모음 574:7612), 본문 `items` 틀(AL 줄바꿈), 명령 모음 버튼 이름 new folder·cut·paste·rename·delete·sort·view.
- 아직: Explorer 세트 축 추가도 모바일 변형도 안 만듦.
- Explorer: 축 추가 함(86개, PC 연결 2311 그대로), 모바일 변형 37 만듦(Rest 6287:30941, Folder opened 6287:31520, Address editing 6287:32213, Path not found alert 6287:32876, Search open 6287:33452, Search results 6287:34028, Menu folder 6287:34682, Menu post 6287:35319, Menu empty 6287:35939, Opened post 6287:36493, Renaming 6287:37078, Renamed 6287:37661, Deleted 6287:38240, Cut 6287:38823, Paste ready 6287:39394, Pasted 6287:39969, New folder 6287:40558, New folder named 6287:41145, Sorted desc 6287:41728, Large icons 6287:42311, Details 6287:42909, Recycle restored 6287:43491, Sort menu 6287:44130, View menu 6287:44745, Recycle bin 6287:45326, Recycle item menu 6287:45918, Recycle empty menu 6287:46532, Empty recycle alert 6287:47122, Panel shown 6287:47797, Panel picking 6287:48420, Panel item menu 6287:49097, Panel place menu 6287:49740, Panel moved 6287:50346, Content focused 6287:50929(포커스 안 그려짐: ExplorerFileItem에 Focused 없음), Command focused 6287:51539, Menu folder keyboard 6287:52193, View menu keyboard 6287:52808). 옛 견본 인스턴스 0. 임시 판 6287:52809(지울 것). 캡처 explorer-1-r1~r10. **아직: 눈으로 확인, 설명 줄, 설정(mstart 'State=Rest'), 스크립트 실행.**
- Explorer 고침: 이름 바꾸기 입력칸 글자, 둘째 줄 빈 칸 3곳, 없는 경로 알림 주소(Reakt), 상태 표시줄에 보기 버튼 둘(36개 변형). 임시 판 6288:39524(지울 것). 캡처 explorer-2-r1~r5.
- Explorer: 설명 줄 씀, 설정 파일 반영. 본문에 포커스는 State=Current로 그림. **남음: 스크립트 실행(./\_mk.sh explorer → \_cfg.js + \_body.min.js)과 흐름도 확인.**
- Explorer 끝남: 스크립트 PC 86변형 74·69(그대로), 모바일 32·21, bad 0. 세트 27676×105760, 모바일 열 x 19137~, 키보드 윗변 24264. 임시 조각 6290:50445·6290:50446(지울 것; 흐름도 캡처는 get_screenshot 오류로 아직 못 받음 → 다시 시도).
- Windows: 축 추가(26개, PC 연결 1698 그대로), 모바일 변형 9(Rest 6291:12406, Back to front 6291:13130, Preview list 6291:13639, Front closed 6291:14202, All closed 6291:14334, Window focused 6291:14784(뒤로 버튼에 포커스로 그림: 창 버튼에 Focused 변형 없음), Taskbar focused 6291:15234, App button focused 6291:15683, Desktop focused 6291:15861), 설명 줄 씀(설명 맨 뒤에 붙음), 설정 파일 반영. 임시 판 6291:15862(지울 것). **남음: 판 눈으로 보기, 스크립트 실행(windows), Explorer·Windows 흐름도 캡처, decisions.md·figma-state.json 기록, 보고.**
- Windows 끝남: 스크립트 PC 26변형 17·12(그대로), 모바일 4·7, bad 0. 세트 27890×21396, 모바일 열 x 19401~, 키보드 윗변 4736. 임시 조각 6292:14833(지울 것). 캡처 windows-1-r1~r3, flow-windows-mobile*.png.
- Explorer 흐름도 캡처는 get_screenshot이 계속 오류(조각 6290:50445·6290:50446) → 조각을 작게 나눠 다시 시도하거나 못 본 것으로 보고.
- 남음: 임시 조각 지우기(Explorer 2, Windows 1), decisions.md·figma-state.json 기록, 최종 보고.
- Explorer 흐름도 캡처: flow-explorer-t1·t2·t3(모바일 흐름 세 토막), k1(모바일 키보드 흐름 위쪽 절반). k2(아래 절반, 조각 6294:36546)는 get_screenshot 오류로 못 받음. 임시 조각 6294:36542~36546(지울 것).

## 모바일 검수 고침(진행 중, 2026-11-27)

- 고침 끝: Explorer 1(삭제됨 6287:38240), 2(글을 엶 6287:36493 → 2026 상반기 회고), 3(주소 입력 중), 4(6287:49740 이름을 `State=Panel empty menu`로), 5(휴지통 경로 아이콘), 6(키보드 줄 12개 추가). Chrome 7(알림 주소, 새 변형 Trashed post restored 6298:28325·cancelled 6298:28471), 8, 9(확대: article 폭 325 → rescale 1.1), 10(강조 사각형 셋), 11(Went back 6298:28518, Back focused 6298:28655, Address focused 6298:28803, 설명 줄 고침). Search 12(아이콘 틀 높이·잘라내기가 원인: 390×796, 잘라내기 끔). 13(잘라내는 조상 끔). 14는 원인만 봄(팝업 바탕 흰색 70% + 흰 문서 아이콘 = 부품).
- **남음**: 설정 파일에 mlabels 추가(chrome: Trashed post restored/cancelled, Went back, Back focused, Address focused / explorer: Panel empty menu) → 스크립트 chrome·explorer 실행 → 판 6299:10625(Chrome 페이지, 지울 것) 눈으로 확인(fix-1-r1~r5) → 보고.
- 검수 고침: 스크립트 다시 돌림. Chrome PC 27·35 그대로, 모바일 18변형 13·15, bad 0(세트 27178×46444). Explorer PC 74·69 그대로(연결 2311), 모바일 37변형 32·30, bad 0(세트 27922×105760). Explorer 설명의 PC 키보드 줄에 잘못 끼어든 모바일 줄은 모바일 키보드 묶음 끝으로 옮겨 되돌림. 임시 조각: Chrome 6300:34251·34252·34253, Explorer 6302:39967~39969(지울 것). 캡처 fix-1-r1~r5.png, fix-flow-chrome-key1·2.png, fix-flow-explorer-key1~3.png. 14(범주 폴더)는 부품 바탕(흰색 70%, PC와 같은 스타일)과 흰 문서 아이콘 때문이라 손대지 않음. 15는 PC 줄·문서와 같아 그대로. **남음: 흐름도 캡처 보기, 조각 지우기, 보고.**
