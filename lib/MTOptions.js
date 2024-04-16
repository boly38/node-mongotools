export default class MTOptions {
    constructor(options) {
        const LO = '127.0.0.1';
        const opt = options ? options : {};
        //~ database connect options
        this.uri = "uri" in opt ? opt.uri : (process.env.MT_MONGO_URI || null);    // database uri
        this.db = "db" in opt ? opt.db : (process.env.MT_MONGO_DB || null);    // database name
        this.dbFrom = "dbFrom" in opt ? opt.dbFrom : (process.env.MT_MONGO_DB_FROM || null);    // source database name for mongorestore
        this.dbTo = "dbTo" in opt ? opt.dbTo : (process.env.MT_MONGO_DB_TO || null);    // target database name for mongorestore
        this.host = "host" in opt ? opt.host : (process.env.MT_MONGO_HOST || LO);      // database hostname
        this.port = "port" in opt ? opt.port : (process.env.MT_MONGO_PORT || 27017);   // database port
        this.username = "username" in opt ? opt.username : (process.env.MT_MONGO_USER || null);    // database username
        this.password = "password" in opt ? opt.password : (process.env.MT_MONGO_PWD || null);    // database password
        this.authDb = "authDb" in opt ? opt.authDb : (process.env.MT_MONGO_AUTH_DB || 'admin'); // authenticate database
        //~ ssl options
        this.ssl = "ssl" in opt ? opt.ssl : (process.env.MT_MONGO_SSL || null);    // if "1" then ssl is enabled
        this.sslCAFile = "sslCAFile" in opt ? opt.sslCAFile : (process.env.MT_MONGO_SSL_CA_FILE || null);    // .pem file containing the root certificate chain
        this.sslPEMKeyFile = "sslPEMKeyFile" in opt ? opt.sslPEMKeyFile : (process.env.MT_MONGO_SSL_PEM_KEY_FILE || null); // .pem file containing the certificate and key
        this.sslPEMKeyPassword = "sslPEMKeyPassword" in opt ? opt.sslPEMKeyPassword : (process.env.MT_MONGO_SSL_PEM_KEY_PASSWORD || null);    // password to decrypt the sslPEMKeyFile, if necessary
        this.sslCRLFile = "sslCRLFile" in opt ? opt.sslCRLFile : (process.env.MT_MONGO_SSL_CRL_FILE || null);    // .pem file containing the certificate revocation list
        this.sslFIPSMode = "sslFIPSMode" in opt ? opt.sslFIPSMode : (process.env.MT_MONGO_SSL_FIPS || null);    // if "1" then use FIPS mode of the installed openssl library
        this.tlsInsecure = "tlsInsecure" in opt ? opt.tlsInsecure : (process.env.MT_MONGO_TLS_INSECURE || null);    // if "1" then  bypass the validation for server's certificate chain and host name

        this.assumeValidPort();

        this.showCommand = "showCommand" in opt ? opt.showCommand : (process.env.MT_SHOW_COMMAND === 'true'); // show wrapped commands

        //~ dump
        this.dumpCmd = "dumpCmd" in opt ? opt.dumpCmd : (process.env.MT_MONGODUMP || 'mongodump');   // mongodump binary
        this.path = "path" in opt ? opt.path : (process.env.MT_PATH || 'backup');     // target dump location
        this.fileName = "fileName" in opt ? opt.fileName : (process.env.MT_FILENAME || null);         // target dump filename
        this.encrypt = "encrypt" in opt ? opt.encrypt : false;
        this.secret = "secret" in opt ? opt.secret : (process.env.MT_SECRET || null);         // secret to encrypt dump

        this.includeCollections = "includeCollections" in opt ? opt.includeCollections : null;// #deprecated
        this.collection = "collection" in opt ? opt.collection : (process.env.MT_COLLECTION || null)
        this.excludeCollections = "excludeCollections" in opt ? opt.excludeCollections : (process.env.MT_EXCLUDE_COLLECTIONS || null)

        this.defaultEncryptSuffix = '.enc';
        this.encryptSuffix = "encryptSuffix" in opt ? opt.encryptSuffix : this.defaultEncryptSuffix;

        //~ restore
        this.restoreCmd = "restoreCmd" in opt ? opt.restoreCmd : (process.env.MT_MONGORESTORE || 'mongorestore'); // mongorestore binary
        this.dumpFile = "dumpFile" in opt ? opt.dumpFile : (process.env.MT_DUMP_FILE || null);     // dump file location
        this.decrypt = "decrypt" in opt ? opt.decrypt : this.dumpFile && this.dumpFile.endsWith(this.defaultEncryptSuffix) || false;  // decrypt dump before restore
        this.dropBeforeRestore = "dropBeforeRestore" in opt ? opt.dropBeforeRestore : false;                // drop db before restore
        this.deleteDumpAfterRestore = "deleteDumpAfterRestore" in opt ? opt.deleteDumpAfterRestore : false; // delete dump after restore

        //~ dropbox
        this.dropboxLocalPath = "dropboxLocalPath" in opt ? opt.dropboxLocalPath : (process.env.MT_DROPBOX_LOCAL_PATH || "dropbox");

        // DEPRECATED - MT_DROPBOX_TOKEN - old-long-lived access-token - no more available from dropbox developers portal
        this.dropboxToken        = "dropboxToken"        in opt ? opt.dropboxToken        : (process.env.MT_DROPBOX_TOKEN || null);

        // TIP: get key,secret from dropbox developers app dev portal : https://www.dropbox.com/developers/apps/
        this.dropboxAppKey       = "dropboxAppKey"       in opt ? opt.dropboxAppKey       : (process.env.MT_DROPBOX_APP_KEY || null);
        this.dropboxAppSecret    = "dropboxAppSecret"    in opt ? opt.dropboxAppSecret    : (process.env.MT_DROPBOX_APP_SECRET || null);
        // TIP: long-lived offline refresh-token. cf. https://github.com/boly38/dropbox-refresh-token
        this.dropboxRefreshToken = "dropboxRefreshToken" in opt ? opt.dropboxRefreshToken : (process.env.MT_DROPBOX_REFRESH_TOKEN || null);

        this.isDeprecatedDropboxTokenAvailable = isNotEmptyString(this.dropboxToken);
        this.isDropboxRefreshTokenAvailable    = areNotEmptyStrings([this.dropboxAppKey, this.dropboxAppSecret, this.dropboxRefreshToken]);
        this.isDropboxEnabled = this.isDeprecatedDropboxTokenAvailable || this.isDropboxRefreshTokenAvailable;

        //~ rotation
        // rotationDryMode       : dont do delete actions, just print it
        this.rotationDryMode = "rotationDryMode" in opt ? opt.rotationDryMode : (process.env.MT_ROTATION_DRY_MODE === 'true');
        // rotationWindowsDays   : safe time windows defined by [ now-rotationWindowsDays day(s) =until=> now ] where backups can't be removed.
        this.rotationWindowsDays = "rotationWindowsDays" in opt ? opt.rotationWindowsDays : (process.env.MT_ROTATION_WINDOWS_DAYS || 15);
        // backup out of safe time windows are called "deprecated backup"
        // rotationMinCount      : minimum deprecated backups to keep.
        this.rotationMinCount = "rotationMinCount" in opt ? opt.rotationMinCount : (process.env.MT_ROTATION_MIN_COUNT || 2);
        // rotationCleanCount    : number of (oldest first) deprecated backups to delete
        this.rotationCleanCount = "rotationCleanCount" in opt ? opt.rotationCleanCount : (process.env.MT_ROTATION_CLEAN_COUNT || 10);

    }

    assumeValidPort() {
        if (isNaN(this.port)) {
            this.port = parseInt(this.port, 10);
        }
        if (isNaN(this.port)) {
            throw new Error(`invalid port ${this.port}`);
        }
    }

    getPath() {
        return ('path' in this) ? this.path : 'backup';
    }

    getDropboxPath() {
        return '/' + this.getPath();
    }

    getDropboxLocalPath() {
        return ('dropboxLocalPath' in this) ? this.dropboxLocalPath : 'dropbox';
    }
}

const isNotEmptyString = value => value !== undefined && typeof value === 'string' && value.length > 0
const areNotEmptyStrings = arr => Array.isArray(arr) && arr.length > 0 && arr.reduce((rez, curValue) => rez && isNotEmptyString(curValue), true);