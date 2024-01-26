import eslintJsPlugin from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettierPlugin from "eslint-plugin-prettier";
import fs from "fs";
import prettier from "prettier";

const extraRules = {
  // Warn against template literal placeholder syntax in regular strings
  "no-template-curly-in-string": "warn",

  // Warn if return statements do not either always or never specify values
  "consistent-return": "warn",

  // Warn if no return statements in callbacks of array methods
  "array-callback-return": "warn",

  // Requre the use of === and !==
  eqeqeq: "error",

  // Disallow the use of alert, confirm, and prompt
  "no-alert": "error",

  // Disallow the use of arguments.caller or arguments.callee
  "no-caller": "error",

  // Disallow null comparisons without type-checking operators
  "no-eq-null": "error",

  // Disallow the use of eval()
  "no-eval": "error",

  // Warn against extending native types
  "no-extend-native": "warn",

  // Warn against unnecessary calls to .bind()
  "no-extra-bind": "warn",

  // Warn against unnecessary labels
  "no-extra-label": "warn",

  "no-fallthrough": "warn",
  // Disallow leading or trailing decimal points in numeric literals
  "no-floating-decimal": "error",

  // Warn against shorthand type conversions
  "no-implicit-coercion": "warn",

  // Warn against function declarations and expressions inside loop statements
  "no-loop-func": "warn",

  // Disallow new operators with the Function object
  "no-new-func": "error",

  // Warn against new operators with the String, Number, and Boolean objects
  "no-new-wrappers": "warn",

  // Disallow throwing literals as exceptions
  "no-throw-literal": "error",

  // Require using Error objects as Promise rejection reasons
  "prefer-promise-reject-errors": "error",

  // Enforce “for” loop update clause moving the counter in the right direction
  "for-direction": "error",

  // Enforce return statements in getters
  "getter-return": "error",

  // Disallow await inside of loops
  "no-await-in-loop": "error",

  // Disallow comparing against -0
  "no-compare-neg-zero": "error",

  // Warn against catch clause parameters from shadowing variables in the outer scope
  "no-catch-shadow": "warn",

  // Disallow identifiers from shadowing restricted names
  "no-shadow-restricted-names": "error",

  // Enforce return statements in callbacks of array methods
  "callback-return": "error",

  // Require error handling in callbacks
  "handle-callback-err": "error",

  // Warn against string concatenation with __dirname and __filename
  "no-path-concat": "warn",

  // Prefer using arrow functions for callbacks
  "prefer-arrow-callback": "warn",

  // Return inside each then() to create readable and reusable Promise chains.
  // "promise/always-return": "error",

  //Enforces the use of catch() on un-returned promises
  // "promise/catch-or-return": "error",

  // Warn against nested then() or catch() statements
  // "promise/no-nesting": "warn",
};

const unUsedVarsIgnore = {
  "@typescript-eslint/no-unused-vars": [
    "warn",
    {
      argsIgnorePattern: "^_",
      varsIgnorePattern: "^_",
      caughtErrorsIgnorePattern: "^_",
    },
  ],
};

export default [
  {
    ignores: [".*", "node_modules/", "dist/"],
  },
  {
    files: [
      "index.{ts,cts,mts}",
      "src/**/*.{ts,cts,mts}",
      "utils/**/*.{ts,cts,mts}",
    ],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...eslintJsPlugin.configs.recommended.rules,

      ...tsPlugin.configs.strict.rules,
      ...tsPlugin.configs["eslint-recommended"].rules,
      ...tsPlugin.configs["recommended-requiring-type-checking"].rules,
      ...unUsedVarsIgnore,

      ...extraRules,
      "no-undef": "off", // ignore in ts files tsc will highlight
    },
    linterOptions: {
      // report when eslint-disable-next-line is unnecessary
      reportUnusedDisableDirectives: true,
    },
  },
  {
    files: ["test/**/*.{js,ts}"],
    languageOptions: {
      parser: tsParser,
    },
  },
  {
    // basic eslint for anything .js
    files: ["**/*.{js}"],
    languageOptions: {
      parser: tsParser,
    },
    rules: eslintJsPlugin.configs.recommended.rules,
  },
  {
    // everything gets prettier
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      ...prettierPlugin.configs.recommended.rules,
      "prettier/prettier": ["warn", { trailingComma: "es5" }],
    },
  },
  {
    // json gets prettier
    files: ["**/*.{json,css}"],

    languageOptions: {
      parser: {
        parse: (/** @type string */ text, /** @type any */ info) => {
          // When file is Json send it to prettier for formatting

          // console.log(JSON.stringify(info))

          prettier
            .format(text, { filepath: info.filePath })
            .then((pretty) => fs.createWriteStream(info.filePath).end(pretty));

          // const [_filePath, fileExt] = info.filePath.split(".");

          console.log("prettier < " + info.filePath);
          // throw new Error("Sent to Prettier -> *." + fileExt);
          // node_modules/eslint/lib/source-code/source-code.jsL326
          return {
            type: "Program",
            body: [],
            tokens: [],
            comments: [],
            loc: [],
            range: {},
            scopes: [],
          };
        },
      },
    },
  },
];
