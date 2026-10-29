# node-mongotools

[![NPM](https://nodei.co/npm/node-mongotools.png?compact=true)](https://npmjs.org/package/node-mongotools)

An ES module wrapper for MongoDB `mongodump` and `mongorestore`, with optional Dropbox backup and backup rotation.

The MongoDB [Database Tools](https://www.mongodb.com/docs/database-tools/installation/installation/) binaries are
required to create and restore backups. See [examples/](./examples) for more samples.

## Quickstart

Install the package in an ES module project:

```bash
pnpm add node-mongotools
```

Create a dump with the library. This example uses the default local MongoDB host and port; configure the connection
with options or environment variables as needed.

```typescript
import {MongoTools} from "node-mongotools";

const mongoTools = new MongoTools();
const result = await mongoTools.mongodump({
    db: "myDatabase",
    path: "backup"
});

console.log(result.fullFileName);
```

Type declarations are included in the npm package. No separate `@types` package is required.
TypeScript support is currently in alpha; feedback from real-world use is welcome.

## Usage

### Command line

The global CLI installation is currently beta:

```bash
pnpm install -g node-mongotools@latest
node-mongotools options
node-mongotools dump
node-mongotools dumpz
node-mongotools list
node-mongotools restore backup/myDatabase__2020-11-08_150102.gz
node-mongotools rotation
```

Uninstall the global CLI with `pnpm uninstall -g node-mongotools`.

When using the source checkout, replace `node-mongotools` with `node mt`.

You can override environment defaults inline. For example, dump one collection to a named file:

```bash
MT_COLLECTION=shippingprices MT_FILENAME=2023_01_shippingPrices.gz \
  MT_SHOW_COMMAND=true node mt dump
```

For Git Bash on Windows, restoring from an absolute path may require `MSYS_NO_PATHCONV=1`; see the
[configuration guide](./docs/configuration.md#dropbox-options).

### Library API

The package exports `MongoTools`, `MTOptions`, and `MTCommand`. The API uses ES modules and is not currently
compatible with CommonJS `require`.

`MongoTools` provides `list`, `mongodump`, `mongorestore`, and `rotation`. Pass options directly or construct an
`MTOptions` instance. See the [advanced configuration guide](./docs/configuration.md) for all options, environment
variables, Dropbox setup, and rotation behavior.

The library is implemented in JavaScript and includes TypeScript declarations, so no separate `@types` package is
needed. TypeScript support is currently in alpha.

## Configuration (advanced)

Options passed to a method take precedence over environment variables, which take precedence over defaults.
The complete connection, TLS, dump, restore, Dropbox, and rotation reference is in
[docs/configuration.md](./docs/configuration.md).

## Development

```bash
git clone https://github.com/boly38/node-mongotools.git
cd node-mongotools
pnpm install
cp env/initEnv.template.sh env/initEnv.dontpush.sh
# Edit env/initEnv.dontpush.sh, then load it:
source env/initEnv.dontpush.sh
```

The JavaScript tests require a local MongoDB instance and the MongoDB Database Tools. See
[tests/README.md](./tests/README.md) for setup details.

```bash
pnpm test
pnpm test:typescript
pnpm lint
```

The TypeScript acceptance test packs the local npm package, installs it in a temporary consumer project, then
compiles and runs that consumer.

## Releases and contributions

Since `v2.2.9` and [issue #102](https://github.com/boly38/node-mongotools/issues/102), releases use
[GitHub immutable releases](https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/immutable-releases).

To contribute, open an issue or submit a feature branch and pull request. CI runs in
[GitHub Actions](./.github/workflows/main.yml); vulnerability auditing runs in
[the audit workflow](./.github/workflows/audit.yml).

[![CI/CD](https://github.com/boly38/node-mongotools/workflows/mongotools-ci/badge.svg)](https://github.com/boly38/node-mongotools/actions)
[![Audit](https://github.com/boly38/node-mongotools/actions/workflows/audit.yml/badge.svg)](https://github.com/boly38/node-mongotools/actions/workflows/audit.yml)
[![Reviewed by Hound](https://img.shields.io/badge/Reviewed_by-Hound-8E64B0.svg)](https://houndci.com)
