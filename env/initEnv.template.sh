#!/bin/bash
export MT_MONGO_DB=myDatabase
export MT_MONGO_PORT=37017
export MT_MONGO_USER=root
export MT_MONGO_PWD=mypass
export MT_MONGO_AUTH_DB=admin

# optional dropbox feature
# https://www.dropbox.com/developers/apps/
export MT_DROPBOX_TOKEN=

export MT_PATH=backup
# MT_SECRET: used to encrypt backup - size 32 - change it
# export MT_SECRET=12345678901234567890123456789012