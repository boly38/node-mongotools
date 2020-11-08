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

## install as library related examples

You have to import as dependency
```
npm install node-mongotools
```

### mongodump example
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
### mongorestore example
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

## User documentation
### common options
- `host`: mongo database hostname (default: `127.0.0.1`)
- `port`: mongo database port (default: `27017`)
- `userName`: mongo database username (default: none)
- `password`: mongo database password (default: none)
- `authenticationDatabase`: mongo auth database (default: none)

### mongodump options
- `dumpCmd`: mongodump binary (default: mongodump)
- `dumpPath`: dump target directory, created if it doesn't exist (default: library path !)
- `fileName`: dump target filename (default: generated `<dbName_date_time.gz>`)
- `db`: mongo database name, set it to '*' for all databases (default: none, required)

### mongorestore options
- `restoreCmd`: mongorestore binary (default: mongorestore)
- `dumpPath`: dump file to restore (default: none, required)
- `dropBeforeRestore`: set it to `true` to append `--drop` option (default: disabled)
- `deleteDumpAfterRestore`: set it to `true` to remove restored backup file (default: disabled)