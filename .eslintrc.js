module.exports = {
  root: true,
  extends: 'airbnb-base',
  env: {
    browser: true,
  },
  parser: '@babel/eslint-parser',
  parserOptions: {
    allowImportExportEverywhere: true,
    sourceType: 'module',
    requireConfigFile: false,
  },
  rules: {
    'import/extensions': ['error', { js: 'always' }], // require js file extensions in imports
    'linebreak-style': ['error', 'unix'], // enforce unix linebreaks
    'no-param-reassign': [2, { props: false }], // allow modifying properties of param
    'no-use-before-define': ['error', { // allow use of traditional functions before their definition as they are completely hoisted
      functions: false,
      classes: true,
      variables: true,
      allowNamedExports: false,
    }],
  },
  globals: {
    dayjs: 'readonly',
    datepicker: 'readonly',
    videojs: 'readonly',
  },
};
