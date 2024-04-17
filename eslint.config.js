// https://eslint.org/docs/latest
import js from "@eslint/js";
import globals from "globals";
import mochaPlugin from 'eslint-plugin-mocha'; // https://www.npmjs.com/package/eslint-plugin-mocha
export default [
    js.configs.recommended, // Recommended config applied to all files
    mochaPlugin.configs.flat.recommended, // or `mochaPlugin.configs.flat.all` to enable all
    {
        "files": ["lib/**/*.js", "examples/**/*.js", "tests/**/*.js"],
        "languageOptions": {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                ...globals.node,
                "process": true
            },
            "parserOptions": {
                "sourceType": "module",
                "allowImportExportEverywhere": true
            },
        },
        "rules": {
            "mocha/no-mocha-arrows": "off"/* pff */
        }
    }
];