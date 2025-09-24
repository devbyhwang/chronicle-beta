// eslint.config.mjs
import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";

export default [
  // 공통 무시
  { ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts"] },

  // JS/JSX: Next 권장(Web Vitals)만 적용 — TS 규칙은 적용하지 않음
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: { ecmaVersion: "latest", sourceType: "module" },
    plugins: { "@next/next": nextPlugin },
    rules: { ...nextPlugin.configs["core-web-vitals"].rules },
  },

  // TS/TSX: 타입 정보가 필요한 규칙은 TS 파일에서만 적용 + project 설정
  // (tseslint 추천 설정들을 TS 파일로 한정해서 주입)
  ...tseslint.configs.recommendedTypeChecked.map((cfg) => ({
    ...cfg,
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ...(cfg.languageOptions ?? {}),
      parserOptions: {
        ...(cfg.languageOptions?.parserOptions ?? {}),
        project: ["./tsconfig.json"],
      },
    },
  })),

  // TS/TSX에도 Next 권장 규칙 적용 + 팀 커스텀
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "@next/next": nextPlugin },
    rules: {
      ...nextPlugin.configs["core-web-vitals"].rules,
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];