# Third-Party Notices

이 사이트와 저장소는 아래의 제3자 소프트웨어·서체·이미지를 포함한다. 각 항목의 저작권 표기와 라이선스 전문을 그대로 싣는다.
사이트에서는 `/licenses`에서 같은 내용을 볼 수 있다.

## 서체 (SIL Open Font License 1.1)

웹 폰트 파일(woff2)로 배포한다. 라이선스 전문은 이 절 끝에 한 번 싣는다.

| 서체          | 저작권                                                                     | 출처                                                                         |
| ------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Open Sans     | Copyright 2020 The Open Sans Project Authors                               | https://github.com/googlefonts/opensans (npm `@fontsource/open-sans`)        |
| Pretendard    | Copyright (c) 2021, Kil Hyung-jin, with Reserved Font Name Pretendard      | https://github.com/orioncactus/pretendard (npm `pretendard`)                 |
| Cascadia Mono | Copyright (c) Microsoft Corporation, with Reserved Font Name Cascadia Code | https://github.com/microsoft/cascadia-code (npm `@fontsource/cascadia-mono`) |

```text
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
-----------------------------------------------------------

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership
with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded,
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply
to any document created using the fonts or their derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright
Holder(s) under this license and clearly marked as such. This may
include source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the
copyright statement(s).

"Original Version" refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting,
or substituting -- in part or in whole -- any of the components of the
Original Version, by changing formats or by porting the Font Software to a
new environment.

"Author" refers to any designer, engineer, programmer, technical
writer or other person who contributed to the Font Software.

PERMISSION & CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining
a copy of the Font Software, to use, study, copy, merge, embed, modify,
redistribute, and sell modified and unmodified copies of the Font
Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components,
in Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled,
redistributed and/or sold with any software, provided that each copy
contains the above copyright notice and this license. These can be
included either as stand-alone text files, human-readable headers or
in the appropriate machine-readable metadata fields within text or
binary files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font
Name(s) unless explicit written permission is granted by the corresponding
Copyright Holder. This restriction only applies to the primary font name as
presented to the users.

4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
Software shall not be used to promote, endorse or advertise any
Modified Version, except to acknowledge the contribution(s) of the
Copyright Holder(s) and the Author(s) or with their explicit written
permission.

5) The Font Software, modified or unmodified, in part or in whole,
must be distributed entirely under this license, and must not be
distributed under any other license. The requirement for fonts to
remain under this license does not apply to any document created
using the Font Software.

TERMINATION
This license becomes null and void if any of the above conditions are
not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
OTHER DEALINGS IN THE FONT SOFTWARE.
```

## 아이콘 (MIT License)

UI 아이콘은 Fluent UI System Icons의 SVG 경로를 사용한다(`packages/design-system/figma/assets/icons`, `illustrations/icon-color-search.svg`).
출처: https://github.com/microsoft/fluentui-system-icons

```text
MIT License

Copyright (c) 2020 Microsoft Corporation

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Microsoft·Google의 화면 자산

Windows 11 화면을 재현하려고 Windows 11 PC에 들어 있는 원본에서 추출한 이미지를 사용한다. 이 자산들은 위와 같은 오픈 라이선스가 아니며, 각 권리는 해당 회사에 있다.
Microsoft·Windows·Google·Chrome은 각 회사의 상표다. 이 사이트는 두 회사와 제휴하거나 보증받지 않았고, 개인 포트폴리오에서 화면을 재현하는 용도로만 쓴다.

| 자산                                     | 출처                                                              |
| ---------------------------------------- | ----------------------------------------------------------------- |
| 폴더, 문서, 휴지통, File Explorer 아이콘 | Windows 11 (Windows 셸, `imageres.dll`, `explorer.exe`)           |
| Windows 로고                             | Windows 11 시스템 앱의 `WindowsLogo.svg`                          |
| Bloom 배경                               | Windows 11 기본 배경(`C:\Windows\Web\Wallpaper\Windows\img0.jpg`) |
| 아크릴 노이즈                            | Windows UI kit                                                    |
| Chrome 아이콘                            | 설치된 Google Chrome (`chrome.exe`)                               |

## 실행에 포함되는 오픈소스 패키지

Next.js, React, React DOM, Base UI, Zod, tailwind-merge 등 npm 패키지를 쓴다. 정확한 버전과 라이선스는 `pnpm-lock.yaml`과 각 패키지의 `LICENSE`를 따른다.
