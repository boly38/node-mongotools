#!/bin/bash
export MT_MONGO_DB=myDatabase
export MT_MONGO_PORT=37017
export MT_MONGO_USER=root
export MT_MONGO_PWD=mypass
export MT_MONGO_AUTH_DB=admin

export MT_PATH=backup
# MT_SECRET: used to encrypt backup - size 32 - change it
# export MT_SECRET=12345678901234567890123456789012

# TIP: get key,secret from dropbox developers app dev portal : https://www.dropbox.com/developers/apps/
export MT_DROPBOX_APP_KEY=
export MT_DROPBOX_APP_SECRET=
# TIP: long-lived offline refresh-token. cf. https://github.com/boly38/dropbox-refresh-token
export MT_DROPBOX_REFRESH_TOKEN=

## DEPRECATED SECTION
# MT_DROPBOX_TOKEN - old-long-lived access-token - no more available from dropbox developers portal
# export MT_DROPBOX_TOKEN=
## DEPRECATED SECTION end
