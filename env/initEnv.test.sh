#!/bin/bash
unset MT_MONGO_DB
unset MT_MONGO_PORT
unset MT_MONGO_USER
unset MT_MONGO_PWD
unset MT_MONGO_AUTH_DB
unset MT_MONGO_URI
unset MT_DROPBOX_TOKEN
unset MT_SECRET
unset MT_PATH
unset GREN_GITHUB_TOKEN

export MT_MONGO_PORT=17017
export MT_MONGO_USER=root
export MT_MONGO_PWD=mypass
export MT_MONGO_AUTH_DB=admin
# export MT_DROPBOX_TOKEN=createYourTokenIfYouWantToRunDropBoxTestsToo