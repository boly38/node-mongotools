# node-mongotools
[![NPM](https://nodei.co/npm/node-mongotools.png?compact=true)](https://npmjs.org/package/node-mongotools)

This project provide 2 wrappers :
- **mongodump**,
- **mongorestore**.

This project also include **dropbox** integration feature to 
- dump and upload onto dropbox,
- restore from a dropbox hosted mongo backup.

There is an autonomous feature called **rotation** that provide a backup file rotation mechanism
- remove N oldest deprecated backups.

This readme contains some samples. Other samples are under [examples/](./examples). 

## Command line usage

### Initial setup - first time only
```
# get source code
git clone https://github.com/boly38/node-mongotools.git
# install dependencies
npm install

#~ setup environment variables
cp env/initEnv.template.sh env/initEnv.dontpush.sh
# you must update env/initEnv.dontpush.sh
```

### Set your preferences
```
# source your options
. ./env/initEnv.dontpush.sh
```

### Basic feature
```
# create a mongo dump
node mt dump

# create a encrypted mongo dump
node mt dumpz

# list backups
node mt list

# restore a mongo local dump
# please note that mt restore use following options : dropBeforeRestore: true, deleteDumpAfterRestore: true
node mt restore backup/myDatabase__2020-11-08_150102.gz

# rotate backup files
node mt rotation
```

### Dropbox feature

You have a dropbox access token in your preferences, (cf. "Mongo tools options")

```
# create a mongo dump is the same command
node mt dump
# restore a mongo dropbox dump 
node mt restore /backup/myDatabase__2020-11-08_150102.gz

# git bash for windows users having absolute path issue could use the following command
unalias node
MSYS_NO_PATHCONV=1 node mt restore /backup/myDatabase__2020-11-08_150102.gz

# rotate local and dropbox backup files
node mt rotation
```

## Library use

### Install dependency

You have to import as dependency
```
npm install node-mongotools
```

### Define the requirements, example:
``` 
const { MongoTools, MTOptions } = require("node-mongotools")
var mongoTools = new MongoTools();
const mtOptions = {
        db: 'myDb',
        port: 17017,
        path: '/opt/myapp/backups',
        dropboxToken: process.env.MYAPP_DROPBOX_SECRET_TOKEN
      };
```

### List dumps
```
var promiseResult = mongoTools.list(mtOptions);
```

### Dump
```
var promiseResult = mongoTools.mongodump(mtOptions);
```

### Restore
```
var promiseResult = mongoTools.mongorestore(mtOptions);
```

### Rotation
```
var promiseResult = mongoTools.rotation(mtOptions);
```

## Mongo tools options

Each mongotools feature rely on Mongo tools options (aka. [MTOption](./lib/MTOptions.js)).

Options precedence is the following:
- take `options` attribute if set,
- else take related environment variable if any,
- else take default value if any,
- else if it's a mandatory option, throw an error.

TIP: you could also show current options by doing:
```
console.log(new MTOptions());
```

### shared options
These options are used by dump and restore.

Either `uri` or `host`/`port`/`db`:

| option   |  env         | required | default value | description                                        |
|----------|--------------|----------|---------------|----------------------------------------------------|
| `uri`    | MT_MONGO_URI | **true** | (none)        | mongodump uri, example `mongodb+srv://granted-user:MySecretHere@cluster0.xzryx.mongodb.net/tMyDatababse`   |

or

| option    |  env          |  required | default value | description                                        |
|-----------|---------------|----------|---------------|----------------------------------------------------|
| `db`      | MT_MONGO_DB   | **true** | (none)        | mongo database name. For dump only, you could set it to '*' to dump all  |
| `host`    | MT_MONGO_HOST | false    | `127.0.0.1`   | mongo database hostname                            |
| `port`    | MT_MONGO_PORT | false    | `27017`       | mongo database port                                |
| `username`| MT_MONGO_USER | false    | (none)        | mongo database username                            |
| `password`| MT_MONGO_PWD  | false    | (none)        | mongo database password                            |
| `authDb`  | MT_MONGO_AUTH_DB | false | `admin`       | mongo auth database                                |

### mongodump options

| option     |  env          | required | default value | description                                        |
|------------|---------------|----------|---------------|----------------------------------------------------|
| `path`     | MT_PATH       | false    | `backup`      | dump target directory, created if it doesn't exist |
| `dumpCmd ` |               | false    | `mongodump`   | mongodump binary                                   |
| `fileName` |               | false    | `<dbName_date_time.gz>`  | dump target filename                    |
| `ssl`      |               | false    | false         | add `--ssl` option                                 |
| `encrypt`  |               | false    | false         | encrypt the dump using secret                      |
| `secret`   | MT_SECRET     | false    | null          | secret to use if encrypt is enabled                |
| `encryptSuffix`   |        | false    | `.enc`        | encrypt file suffix                                |
| `includeCollections`   |        | false    | (none)        | Collections to include, if not specified all collections are included |
| `excludeCollections`   |        | false    | (none)        | Collections to exclude, if not specified all collections are included |

Simple example:
```
const { MongoTools, MTOptions } = require("node-mongotools")
var mongoTools = new MongoTools();

mongoTools.mongodump({ 
   db:'myDatabase',
   path:'backup',
   username:'root', password:'mypass', authDb:'admin'
})
.then((success) => console.info("success", success) )
.catch((err) => console.error("error", err) );
```

### mongorestore options

| option       |  env          |  required | default value   | description                                        |
|--------------|---------------|-----------|-----------------|----------------------------------------------------|
| `dumpFile`   | MT_DUMP_FILE  | true      | (none)          | dump file to restore                               |
| `restoreCmd` |               | false     | `mongorestore`  | mongorestore binary                                |
| `ssl`        |               | false     | false           | add `--ssl` option                                 |
| `dropBeforeRestore` |        | false     | false           | set it to `true` to append `--drop` option         |
| `deleteDumpAfterRestore` |   | false     | false           |  set it to `true` to remove restored backup file   |
| `decrypt`    |               | false     | false           | decrypt the dump using secret. Activated if suffix is detected |
| `secret`     | MT_SECRET     | false     | null            | secret to use if decrypt is enabled                |

Simple example:
```
const { MongoTools, MTOptions } = require("node-mongotools")
var mongoTools = new MongoTools();

mongoTools.mongorestore({ 
   dumpFile:'backup/myDatabase__2020-11-8_160011.gz',
   username:'root', password:'mypass', authDb:'admin'
})
.then((success) => {
  console.info("success", success.message);
  if (success.stderr) {
    console.info("stderr:\n", success.stderr);// mongorestore binary write details on stderr
  }
})
.catch((err) => console.error("error", err) );
```

### Dropbox options
You could create a dropbox app to get a token : cf. https://www.dropbox.com/developers/apps/  "Generated access token"

| option             |  env                  |  required | default value   | description                                       |
|--------------------|-----------------------|-----------|-----------------|---------------------------------------------------|
| `dropboxToken`     | MT_DROPBOX_TOKEN      | false     | (none)          | activate dropbox feature if present               |
| `dropboxLocalPath` | MT_DROPBOX_LOCAL_PATH | false     | "dropbox"       | local directory to receive dropbox dump           |

When a token is set, 
- the `list` feature will list the `/` + `path` dropbox directory
- the `mongodump` feature will upload the dump onto `/` + `path` dropbox directory (in addition to spawn it locally),
- the `mongorestore` feature will use `dumpFile` as dropbox dump location 
  and retrieve it into `dropboxLocalPath` before doing the mongorestore action.


### Rotation options
A safe time windows is defined by :
 * `now - rotationWindowsDays day(s)` ===> `now`  
where backups can't be removed.

Backup out of safe time windows are called `deprecated backup`.

- `rotationMinCount`: minimum deprecated backups to keep,
- `rotationCleanCount`: number of (oldest) deprecated backups to delete.

| option               |  env                     |  required | default value   | description                                       |
|----------------------|--------------------------|-----------|-----------------|---------------------------------------------------|
| `rotationDryMode`    | MT_ROTATION_DRY_MODE     | false     | false           | dont do delete actions, just print it             |
| `rotationWindowsDays`| MT_ROTATION_WINDOWS_DAYS | true      | 15              | safe time windows in days since now               |
| `rotationMinCount`   | MT_ROTATION_MIN_COUNT    | true      | 2               | minimum deprecated backups to keep.               |
| `rotationCleanCount` | MT_ROTATION_CLEAN_COUNT  | true      | 10              | number of (oldest first) deprecated backups to delete. |

Simple example:
```
MT_ROTATION_CLEAN_COUNT=2 \
MT_ROTATION_DRY_MODE=true \
MT_ROTATION_WINDOWS_DAYS=3 \ node mt rotation
```
Example details: if there is a backup that is more than 3 days old, keep 2 newer ones and delete the 10 oldest.

Dropbox limits:
- rotation feature will not apply if dropbox backup target directory content contains more than 2000 files.

## How to contribute
You're not a dev ? just submit an issue (bug, improvements, questions). Or else:
* Clone
* Install deps
* Then mocha tests
```
git clone https://github.com/boly38/node-mongotools.git
npm install
npm run test
```
* you could also fork, feature branch, then submit a pull request.

### Services or activated bots

| badge  | name   | description  |
|--------|-------|:--------|
| ![CI/CD](https://github.com/boly38/node-mongotools/workflows/mongotools-ci/badge.svg) |Github actions|Continuous tests.
| [![Audit](https://github.com/boly38/node-mongotools/actions/workflows/audit.yml/badge.svg)](https://github.com/boly38/node-mongotools/actions/workflows/audit.yml) |Github actions|Continuous vulnerability audit.
| [![Reviewed by Hound](https://img.shields.io/badge/Reviewed_by-Hound-8E64B0.svg)](https://houndci.com)|[Houndci](https://houndci.com/)|JavaScript  automated review (configured by `.hound.yml`)|
