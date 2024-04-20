[ < Back](../README.md)

# HowTo Contribute

Please create an [issue](https://github.com/boly38/node-mongotools/issues) describing your goal / question / bug description...

If you're interested in an existing issue, please contribute by up-voting for it by adding a :+1:.

If you want to push some code :
- fork and prepare a feature-git-branch, then create a [pull request](https://github.com/boly38/node-mongotools/pulls) that link your issue.
- execute test and linter

You could also be critic with existing ticket/PR : all constructive feedbacks are welcome.

## test
* launch tests using `npm test`. 

Think about environment setup.

## linter
*  launch lint using `npm run lint`.

About linter :
 - locally ESLint 9.0 is used as dev dependencies and rely on `eslint.config.js` ([doc](https://eslint.org/docs/latest/use/configure/configuration-files))
 - on Github PR, [HoundCi service](https://houndci.com) is triggered and rely on [`.hound.yml`](../.hound.yml) file and derived file. HoundCi is yet not compatible with 9.0 config file ([src](http://help.houndci.com/en/articles/2461415-supported-linters) - [eslint 8.0 config file doc](https://eslint.org/docs/v8.x/use/configure/configuration-files).

# Maintainer HowTos
## HowTo create a fresh version
- use patch or minor or major workflow

this will make a new version and on version tag, the main ci workflow will push a new npmjs version too.

## HowTo release using Gren

```bash
# provide PAT with permissions to create release on current repository
export GREN_GITHUB_TOKEN=your_token_here
# one time setup
npm install github-release-notes -g

git fetch --all && git pull
# make a release vX with all history
gren release --data-source=prs -t v2.2.2 --milestone-match=v2.2.2
# overrides release vX with history from vX-1
gren release --data-source=prs -t "v2.2.2..v2.2.1" --milestone-match="v2.2.2" --override
```
