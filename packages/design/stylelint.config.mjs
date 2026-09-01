export default {
  rules: {
    "custom-property-pattern": [
      "^wd-[a-z0-9]+(?:-[a-z0-9]+)*$",
      {
        message: "토큰 CSS 변수는 --wd- namespace와 소문자 kebab-case를 사용해야 합니다.",
      },
    ],
    "selector-class-pattern": [
      "^[a-z0-9]+(?:-[a-z0-9]+)*(?:__[a-z0-9]+(?:-[a-z0-9]+)*)?(?:--[a-z0-9]+(?:-[a-z0-9]+)*)?$",
      {
        message: "UI CSS class는 소문자 kebab-case BEM 이름을 사용해야 합니다.",
      },
    ],
  },
};
