# Advanced configuration

[Back to the README](../README.md).

Each operation accepts an options object. See [`MTOptions`](../lib/MTOptions.js) for the implementation.
Values are resolved in this order:

1. The value passed in the options object.
2. The corresponding environment variable, if one exists.
3. The default value, if one exists.
4. An error for a missing required value.

For example, `console.log(new MTOptions())` displays the resolved options.

## MongoDB connection

For a dump, provide either a connection URI or a database name. For a restore, `dumpFile` is required, but
`uri` and `db` are optional when the dump already identifies the database.

- `uri` (`MT_MONGO_URI`): MongoDB URI. A URI without a database name dumps all databases.
- `db` (`MT_MONGO_DB`): database name. Required for a dump if `uri` is unset; use `*` to dump all databases.
- `host` (`MT_MONGO_HOST`, default `127.0.0.1`): MongoDB host.
- `port` (`MT_MONGO_PORT`, default `27017`): MongoDB port.
- `username` (`MT_MONGO_USER`) and `password` (`MT_MONGO_PWD`): authentication credentials.
- `authDb` (`MT_MONGO_AUTH_DB`, default `admin`): authentication database.
- `dbFrom` (`MT_MONGO_DB_FROM`) and `dbTo` (`MT_MONGO_DB_TO`): set both to rename a database during restore
  when `db` is unset.

Example URI: `mongodb+srv://<user>:<password>@cluster.example.net/<database>`.

### TLS options

- `ssl` (`MT_MONGO_SSL`): set to `1` to enable SSL or `0` to explicitly disable an environment setting.
- `sslCAFile` (`MT_MONGO_SSL_CA_FILE`): root certificate chain file.
- `sslPEMKeyFile` (`MT_MONGO_SSL_PEM_KEY_FILE`): certificate and key file.
- `sslPEMKeyPassword` (`MT_MONGO_SSL_PEM_KEY_PASSWORD`): key-file password, if required.
- `sslCRLFile` (`MT_MONGO_SSL_CRL_FILE`): certificate revocation list file.
- `sslFIPSMode` (`MT_MONGO_SSL_FIPS`): set to `1` to enable or `0` to disable FIPS mode.
- `tlsInsecure` (`MT_MONGO_TLS_INSECURE`): set to `1` to bypass or `0` to enforce certificate validation.

## Dump options

- `path` (`MT_PATH`, default `backup`): local target directory; created if it does not exist.
- `dumpCmd` (`MT_MONGODUMP`, default `mongodump`): executable to run.
- `fileName` (`MT_FILENAME`): target filename; defaults to a database-and-timestamp name.
- `encrypt` (default `false`): encrypt the dump. Requires `secret`.
- `secret` (`MT_SECRET`): encryption key; AES-256-CTR requires a 32-byte key.
- `encryptSuffix` (default `.enc`): encrypted file suffix.
- `collection` (`MT_COLLECTION`): one collection to include.
- `includeCollections` (deprecated): use `collection` instead.
- `excludeCollections`: pass an array of collection names to exclude.
- `numParallelCollections` (default `4`): collections to export in parallel.
- `viewsAsCollections` (default `false`): export read-only views as collections.

`MT_EXCLUDE_COLLECTIONS` is currently read as a string and is not converted to an array by `MTOptions`. Use the
`excludeCollections` options array instead:

```js
import {MongoTools, MTOptions} from "node-mongotools";

const mongoTools = new MongoTools();
const options = new MTOptions({db: "myDatabase", excludeCollections: ["audit"]});
await mongoTools.mongodump(options);
```

`MTOptions` does not copy `numParallelCollections` or `viewsAsCollections` from its constructor argument, and
plain objects passed to `MongoTools` are normalized through `MTOptions`. Set these properties on an instance before
calling `mongodump`; use the string `"1"` to enable `viewsAsCollections`:

```js
import {MongoTools, MTOptions} from "node-mongotools";

const mongoTools = new MongoTools();
const options = new MTOptions({db: "myDatabase"});
options.numParallelCollections = 4;
options.viewsAsCollections = "1";
await mongoTools.mongodump(options);
```

Example:

```js
import {MongoTools} from "node-mongotools";

const mongoTools = new MongoTools();
const result = await mongoTools.mongodump({
    db: "myDatabase",
    path: "backup"
});
console.info("success", result);
```

## Restore options

- `dumpFile` (`MT_DUMP_FILE`, required): local dump file or Dropbox path to restore.
- `restoreCmd` (`MT_MONGORESTORE`, default `mongorestore`): executable to run.
- `dropBeforeRestore` (default `false`): drop the target database before restoring.
- `deleteDumpAfterRestore` (default `false`): remove the dump file after restoring.
- `decrypt` (default `false`): decrypt the dump before restoring; encrypted suffixes are detected by default.
- `secret` (`MT_SECRET`): decryption key.
- `dbFrom` / `dbTo`: rename the source database during restore when `db` is unset.

Example:

```js
import {MongoTools} from "node-mongotools";

const mongoTools = new MongoTools();
const result = await mongoTools.mongorestore({
    dumpFile: "backup/myDatabase__2020-11-08_160011.gz"
});
console.info("success", result.message);
```

## Dropbox options

Create a Dropbox app in the [Dropbox developer portal](https://www.dropbox.com/developers/apps/).

- `dropboxLocalPath` (`MT_DROPBOX_LOCAL_PATH`, default `dropbox`): local download directory.
- `dropboxAppKey` (`MT_DROPBOX_APP_KEY`), `dropboxAppSecret` (`MT_DROPBOX_APP_SECRET`), and
  `dropboxRefreshToken` (`MT_DROPBOX_REFRESH_TOKEN`): credentials for the refresh-token flow.
- `dropboxToken` (`MT_DROPBOX_TOKEN`, deprecated): legacy long-lived access token.

Provide either the legacy `dropboxToken` or all three of `dropboxAppKey`, `dropboxAppSecret`, and
`dropboxRefreshToken`. The legacy access-token flow is deprecated; Dropbox no longer offers these tokens for new
applications. See the [dropbox-refresh-token helper](https://github.com/boly38/dropbox-refresh-token) for help
obtaining refresh tokens.

When Dropbox is enabled:

- `list` lists files in the Dropbox directory matching `path`.
- `mongodump` creates a local dump and uploads it to Dropbox.
- `mongorestore` treats a `dumpFile` string starting with the configured local `path` as local. Otherwise, when
  Dropbox is enabled, it downloads the value to `dropboxLocalPath`; remote paths must start with `/`.
- `rotation` applies rotation to local and Dropbox backups.

For Git Bash on Windows, an absolute restore path may require:

```bash
unalias node
MSYS_NO_PATHCONV=1 node mt restore /backup/myDatabase__2020-11-08_150102.gz
```

## Rotation options

Backups inside the safety window (`now - rotationWindowsDays` through `now`) are never removed. Older backups
are considered deprecated.

- `rotationDryMode` (`MT_ROTATION_DRY_MODE`, default `false`): print planned deletions without deleting files.
- `rotationWindowsDays` (`MT_ROTATION_WINDOWS_DAYS`, default `15`): safety window in days.
- `rotationMinCount` (`MT_ROTATION_MIN_COUNT`, default `2`): minimum deprecated backups to keep.
- `rotationCleanCount` (`MT_ROTATION_CLEAN_COUNT`, default `10`): maximum old backups to delete.

Example dry run with numeric options:

```js
import {MongoTools, MTOptions} from "node-mongotools";

const mongoTools = new MongoTools();
const options = new MTOptions({
    path: "backup",
    rotationWindowsDays: 3,
    rotationMinCount: 2,
    rotationCleanCount: 2,
    rotationDryMode: true
});

await mongoTools.rotation(options);
```

Dropbox rotation is skipped if its backup directory contains more than 2,000 files.

**Current implementation caveats:** rotation sorts deprecated backups oldest-first, then skips the first
`rotationMinCount` entries before deleting the next `rotationCleanCount`. This can retain the oldest backups and
delete newer ones. Also, numeric values read from environment variables remain strings; the JavaScript addition
used to calculate the deletion range can concatenate those strings. Review a dry run before enabling deletions,
and prefer numeric values passed through `MTOptions` as in the example above.
