# node-mongotools node wrapper
This project provide 2 wrappers :
- mongodump
- mongorestore

## clone and command line example
```
git clone https://github.com/boly38/node-mongotools.git
npm install
node index dump
node index restore backup/myDatabase__2020-11-8_150102.gz
```

## use as library

### install dependency

You have to import as dependency
```
npm install node-mongotools
```

### mongodump

**mongodump related options**

| option     | required | default value | description                                        |
|------------|----------|---------------|----------------------------------------------------|
| `dumpPath` | false    | `backup`      | dump target directory, created if it doesn't exist |
| `dumpCmd ` | false    | `mongodump`   | mongodump binary                                   |
| `fileName` | false    | `<dbName_date_time.gz>`  | dump target filename                    |
| `ssl`     | false    | false         | add `--ssl` option                                 |

Then either `uri` or `host`/`port`/`db`:

| option   | required | default value | description                                        |
|----------|----------|---------------|----------------------------------------------------|
| `uri`    | true     | (none)        | mongodump uri, example `mongodb+srv://granted-user:MySecretHere@cluster0.xzryx.mongodb.net/tMyDatababse`   |

or

| option    | required | default value | description                                        |
|-----------|----------|---------------|----------------------------------------------------|
| `db`      | true     | (none)        | mongo database name, set it to '*' to dump all     |
| `host`    | false    | `127.0.0.1`   | mongo database hostname                            |
| `port`    | false    | `27017`       | mongo database port                                |
| `userName`| false    | (none)        | mongo database username                            |
| `password`| false    | (none)        | mongo database password                            |
| `authenticationDatabase`| false      | (none)  | mongo auth database                      |

Example:
```
var mongoTools = require("node-mongotools");

mongoTools.mongodump({ 
   db:'myDatabase',
   path:'backup',
   userName:'root', password:'mypass', authenticationDatabase:'admin'
})
.then((success) => console.info("success", success) )
.catch((err) => console.error("error", err) );
```


### mongorestore

**mongorestore related options**

| option     | required | default value | description                                        |
|------------|----------|---------------|----------------------------------------------------|
| `dumpPath` | true     | (none)        | dump file to restore                               |
| `restoreCmd` | false     | `mongorestore`        | mongorestore binary                 |
| `ssl`     | false    | false         | add `--ssl` option                                 |
| `dropBeforeRestore` | false    | false | set it to `true` to append `--drop` option                     |
| `deleteDumpAfterRestore` | false    | false   |  set it to `true` to remove restored backup file    |

Then either `uri` or `host`/`port`/`db`:

| option   | required | default value | description                                        |
|----------|----------|---------------|----------------------------------------------------|
| `uri`    | true     | (none)        | mongodump uri, example `mongodb+srv://granted-user:MySecretHere@cluster0.xzryx.mongodb.net`   |

or

| option    | required | default value | description                                        |
|-----------|----------|---------------|----------------------------------------------------|
| `host`    | true     | `127.0.0.1`   | mongo database hostname                            |
| `port`    | true     | `27017`       | mongo database port                                |
| `userName`| false    | (none)        | mongo database username                            |
| `password`| false    | (none)        | mongo database password                            |
| `authenticationDatabase`| false      | (none)  | mongo auth database                      |


Example:
```
var mongoTools = require("node-mongotools");

mongoTools.mongorestore({ 
   dumpPath:'backup/myDatabase__2020-11-8_160011.gz',
   userName:'root', password:'mypass', authenticationDatabase:'admin'
})
.then((success) => {
  console.info("success", success.message);
  if (success.stderr) {
    console.info("stderr:\n", success.stderr);// mongorestore binary write details on stderr
  }
})
.catch((err) => console.error("error", err) );
```
