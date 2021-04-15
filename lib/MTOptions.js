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

    this.showCommand = "showCommand" in opt ? opt.showCommand : false; // show wrapped commands


    //~ dump
    this.path     = "path"     in opt ? opt.path     : (process.env.MT_PATH           || 'backup');     // target dump location

    //~ restore
    this.dumpFile = "dumpFile" in opt ? opt.dumpFile : (process.env.MT_DUMP_FILE      || null);         // dump file location
    this.dropBeforeRestore = "dropBeforeRestore" in opt ? opt.dropBeforeRestore : false;                // drop db before restore
    this.deleteDumpAfterRestore = "deleteDumpAfterRestore" in opt ? opt.deleteDumpAfterRestore : false; // delete dump after restore

    //~ dropbox
    // create a dropbox app to get a token : https://www.dropbox.com/developers/apps/  "Generated access token"
    this.dropboxToken = "dropboxToken" in opt ? opt.dropboxToken : (process.env.MT_DROPBOX_TOKEN  || null);
    this.dropboxLocalPath = "dropboxLocalPath" in opt ? opt.dropboxLocalPath : (process.env.MT_DROPBOX_LOCAL_PATH  || "dropbox");
    this.dropboxEnabled = this.dropboxToken && this.dropboxToken.length > 0;

  }

  assumeValidPort() {
    if (isNaN(this.port)) {
      this.port   = parseInt(this.port, 10);
    }
    if (isNaN(this.port)) {
      throw `invalid port ${this.port}`;
    }
  }
}

module.exports = MTOptions;