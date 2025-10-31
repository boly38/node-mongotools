[ < Back](../README.md)

# HowTo Contribute

Please create an [issue](https://github.com/boly38/node-mongotools/issues) describing your goal / question / bug description...

If you're interested in an existing issue, please contribute by up-voting for it by adding a :+1:.

If you want to push some code :
- fork and prepare a feature-git-branch, then create a [pull request](https://github.com/boly38/node-mongotools/pulls) that link your issue.
- execute test and linter

You could also be critic with existing ticket/PR : all constructive feedbacks are welcome.

## test
* launch tests using `pnpm test`. 

Think about environment setup.

## linter
*  launch lint using `pnpm run lint`.

About linter :
 - locally ESLint 9.0 is used as dev dependencies and rely on `eslint.config.js` ([doc](https://eslint.org/docs/latest/use/configure/configuration-files))
 - on GitHub PR, [HoundCi service](https://houndci.com) is triggered and rely on [`.hound.yml`](../.hound.yml) file and derived file. HoundCi is yet not compatible with 9.0 config file ([src](http://help.houndci.com/en/articles/2461415-supported-linters) - [eslint 8.0 config file doc](https://eslint.org/docs/v8.x/use/configure/configuration-files).

# Maintainer HowTos

## HowTo create a fresh version
- use patch or minor or major workflow

this will make a new version and on version tag, the main ci workflow will push a new npmjs version too.

## HowTo release using `gh`

Install and create automatically a draft release version using [gh client](https://cli.github.com/)
- the version tag must exist

Example to create v2.2.9
```bash
gh release create v2.2.9 --draft --generate-notes
```
this will make a new draft release. Verify it in [releases list](https://github.com/boly38/node-mongotools/releases)

- ⚠️ the repository apply immutable releases since #102, so you can't modify a release once published
- publish the release when ready
```
