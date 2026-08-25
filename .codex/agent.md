# agent notes

## Project Goal

Windows 11 데스크톱 UI를 테마로 한 개인 기술 블로그를 현재 워크스페이스에서 새로 구현하기 위한 프로젝트다.

기존 구현의 상태 꼬임과 코드 관리 문제를 반복하지 않기 위해, 기능을 그대로 이어 붙이는 방식이 아니라 모노레포, 디자인 시스템, 앱 셸, 품질 도구를 다시 구성하는 것을 목표로 한다.

## Source Project

- 원본 참고 프로젝트 경로: `C:\Users\sjw73\Desktop\dev\blog`
- 원본 배포 사이트: `https://seojaewan.com/`
- 원본 package 이름: `neu-blog`
- 원본 프로젝트 성격: Windows 11 데스크톱 UI를 테마로 한 Notion CMS 기반 개인 기술 블로그
- 원본 주요 UX: 파일 탐색기 메타포로 `blog`, `project`, `about`, `coding` 콘텐츠를 탐색하는 블로그
- 원본 주요 런타임: Next.js App Router, React, Tailwind CSS, Jotai, Notion API

원본 프로젝트는 제품 방향과 UX 기준을 확인하기 위한 참고 자료다. 새 구현에서는 원본 코드를 그대로 복사하기보다, 현재 프로젝트의 구조와 dev-wiki에 기록된 개발 컨벤션을 우선한다.

## Knowledge Location

기술 스택, 폴더 구조, lint/test 규칙, 디자인 시스템 경계, 로컬 개발 명령과 같은 지속 가능한
프로젝트 지식의 canonical source는 Workbench Local Work Memory다. 현재 작업 상태와 후속 TODO는
Gateway Work Item catalog에서 관리한다.

저장소의 source와 실행 가능한 config는 실제 checkout 상태의 근거다. `.codex`의 나머지 문서는
참고 근거, migration snapshot 또는 작업 이력이며 현재 계약의 source of truth가 아니다. 로컬 문서와
Local Work Memory가 충돌하면 Memory를 우선하고, source/config와 Memory가 다르면 문서 drift로 보고
함께 정리한다. 자세한 분류는 [`.codex/README.md`](./README.md)를 따른다.
