export default {
  rules: {
    "custom-property-pattern": [
      "^wd-[a-z0-9]+(?:-[a-z0-9]+)*$",
      {
        message: "토큰 CSS 변수는 --wd- namespace와 소문자 kebab-case를 사용해야 합니다.",
      },
    ],
  },
};
