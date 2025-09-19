# node-mongotools tests

# TL;DR

```bash
git clone https://github.com/boly38/node-mongotools.git
# setup env
pnpm install
pnpm test
```

## Requirements
- a `localhost` mongodb instance running
- `mongodump` and `mongorestore` binaries
- setup done

## Setup (first time)

Add dependencies
```bash
pnpm install
```

Copy and source env/initEnv

```bash
cp ./env initEnv.template.sh initEnv.dontpush.sh 
. ./env/initEnv.dontpush.sh
```

Update MT_MONGO_PORT, and if required MT_MONGO_USER, MT_MONGO_PWD

In order to run unit tests:
```bash
. ./env/initEnv.test.sh
```

## Setup (first time)

If you would like to play dropbox test, then you must set MT_DROPBOX_TOKEN too.

## Run tests

````bash
pnpm test
````