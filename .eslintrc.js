module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "prettier",
  ],
  overrides: [],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    tsconfigRootDir: __dirname,
  },
  rules: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    "no-unused-vars": "off",
    // eslint-disable-next-line @typescript-eslint/naming-convention
    "@typescript-eslint/no-unused-vars": ["error"],
    // eslint-disable-next-line @typescript-eslint/naming-convention
    "@typescript-eslint/naming-convention": [
      "warn",
      {
        selector: "typeLike",
        format: ["PascalCase"],
      },
    ],
  },
};
