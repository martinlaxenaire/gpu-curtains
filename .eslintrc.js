module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 11,
    sourceType: 'module',
  },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['prettier', 'plugin:@typescript-eslint/recommended'],
  // add your custom rules here
  rules: {},
}
