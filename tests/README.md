# node-mongotools tests

## Requirements
- a `localhost` mongodb instance running
- `mongodump` and `mongorestore` binaries
- setup done

## Setup (first time)
Copy and source env/initEnv

    cp ./env initEnv.template.sh initEnv.dontpush.sh 
    . ./env/initEnv.dontpush.sh

Update MT_MONGO_PORT, and if required MT_MONGO_USER, MT_MONGO_PWD

If you would like to play dropbox test, you may setup MT_DROPBOX_TOKEN too.

## Run tests

    npm run test