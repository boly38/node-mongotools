class MTOptions {
  constructor(options) {
    const opt = options ? options : {};
    //~ database
    this.uri      = "uri"      in opt ? opt.uri      : (process.env.MT_MONGO_URI      || null);         // database uri
    this.db       = "db"       in opt ? opt.db       : (process.env.MT_MONGO_DB       || null);         // database name
    this.host     = "host"     in opt ? opt.host     : (process.env.MT_MONGO_HOST     || '127.0.0.1');  // database hostname
    this.port     = "port"     in opt ? opt.port     : (process.env.MT_MONGO_PORT     || 27017);        // database port
    this.username = "username" in opt ? opt.username : (process.env.MT_MONGO_USER     || null);         // database username
    this.password = "password" in opt ? opt.password : (process.env.MT_MONGO_PWD      || null);         // database password
    this.authDb   = "authDb"   in opt ? opt.authDb   : (process.env.MT_MONGO_AUTH_DB  || 'admin');      // authenticate database
    this.assumeValidPort();

    this.showCommand = "showCommand" in opt ? opt.showCommand : (process.env.MT_SHOW_COMMAND === 'true'); // show wrapped commands

    //~ dump
    this.dumpCmd  = "dumpCmd"  in opt ? opt.dumpCmd  : 'mongodump';                                     // mongodump binary
    this.path     = "path"     in opt ? opt.path     : (process.env.MT_PATH           || 'backup');     // target dump location
    this.fileName = "fileName" in opt ? opt.fileName : null;                                            // target dump filename
    this.encrypt  = "encrypt"  in opt ? opt.encrypt  : false;
    this.secret   = "secret"   in opt ? opt.secret   : (process.env.MT_SECRET         || null);         // secret to encrypt dump

    this.includeCollections = "includeCollections" in opt ? opt.includeCollections:null;
    this.excludeCollections = "excludeCollections" in opt ? opt.excludeCollections:null;

    this.defaultEncryptSuffix = '.enc';
    this.encryptSuffix = "encryptSuffix" in opt ? opt.encryptSuffix : this.defaultEncryptSuffix;

    //~ restore
    this.restoreCmd  = "restoreCmd"  in opt ? opt.restoreCmd  : 'mongorestore';                         // mongorestore binary
    this.dumpFile    = "dumpFile"    in opt ? opt.dumpFile    : (process.env.MT_DUMP_FILE || null);     // dump file location
    this.decrypt     = "decrypt"     in opt ? opt.decrypt     : this.dumpFile && this.dumpFile.endsWith(this.defaultEncryptSuffix) || false;  // decrypt dump before restore
    this.dropBeforeRestore = "dropBeforeRestore" in opt ? opt.dropBeforeRestore : false;                // drop db before restore
    this.deleteDumpAfterRestore = "deleteDumpAfterRestore" in opt ? opt.deleteDumpAfterRestore : false; // delete dump after restore

    //~ dropbox
    // create a dropbox app to get a token : https://www.dropbox.com/developers/apps/  "Generated access token"
    this.dropboxToken = "dropboxToken" in opt ? opt.dropboxToken : (process.env.MT_DROPBOX_TOKEN  || null);
    this.dropboxLocalPath = "dropboxLocalPath" in opt ? opt.dropboxLocalPath : (process.env.MT_DROPBOX_LOCAL_PATH  || "dropbox");
    this.dropboxEnabled = this.dropboxToken && this.dropboxToken.length > 0;


    //~ rotation
    // rotationDryMode       : dont do delete actions, just print it
    this.rotationDryMode     = "rotationDryMode"     in opt ? opt.rotationDryMode     : (process.env.MT_ROTATION_DRY_MODE === 'true');
    // rotationWindowsDays   : safe time windows defined by [ now-rotationWindowsDays day(s) =until=> now ] where backups can't be removed.
    this.rotationWindowsDays = "rotationWindowsDays" in opt ? opt.rotationWindowsDays : (process.env.MT_ROTATION_WINDOWS_DAYS  || 15);
    // backup out of safe time windows are called "deprecated backup"
    // rotationMinCount      : minimum deprecated backups to keep.
    this.rotationMinCount    = "rotationMinCount"    in opt ? opt.rotationMinCount    : (process.env.MT_ROTATION_MIN_COUNT  || 2);
    // rotationCleanCount    : number of (oldest first) deprecated backups to delete
    this.rotationCleanCount  = "rotationCleanCount"  in opt ? opt.rotationCleanCount  : (process.env.MT_ROTATION_CLEAN_COUNT  || 10);

  }

  assumeValidPort() {
    if (isNaN(this.port)) {
      this.port   = parseInt(this.port, 10);
    }
    if (isNaN(this.port)) {
      throw `invalid port ${this.port}`;
    }
  }

  getPath() {
    return ('path' in this) ? this.path : 'backup';
  }
  getDropboxPath() {
    return '/' + this.getPath();
  }
  getDropboxLocalPath(options) {
    return ('dropboxLocalPath' in this) ? this.dropboxLocalPath : 'dropbox';
  }
}

module.exports = MTOptions;