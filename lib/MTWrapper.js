const fs = require('fs');
const fsPromise = fs.promises;
const ssync = require('child_process').spawnSync;
const dateFormat = require('dateformat');

class MTWrapper {

  databaseFromOptions(options, defaultDatabase = 'backup') {
    var database = defaultDatabase;
    const uri = getOptionOrDefault(options, 'uri', null);
    if (uri != null) {
       if (!uri.includes('/')) {
         return reject({ error: 'INVALID_OPTIONS', message: 'uri: database name for dump is required.' });
       }
       database = uri.includes('?') ? uri.substring(uri.lastIndexOf('/') + 1, uri.indexOf('?')) :
                                      uri.substring(uri.lastIndexOf('/') + 1, uri.length);
    } else if ('db' in options && options.db != '*') {
       database = options.db;
    }
    if (uri === null && (database === null || database === undefined || database === '')) {
       return reject({ error: 'INVALID_OPTIONS', message: 'database name for dump is required.' });
    }
    if (database === null || database === undefined || database === '' || database === '*') {
      return "all";
    }
    return database;
  }

  commandConnectFromOptions(options, command = '', isRestore = false) {
     const uri = getOptionOrDefault(options, 'uri', null);
     if (uri != null) {
       command += ' --uri ' + uri
     } else {
       command += ' --host ' + getOptionOrDefault(options, 'host', '127.0.0.1') +
                  ' --port ' + getOptionOrDefault(options, 'port', 27017);
       if (isOptionSet(options, 'username') && isOptionSet(options, 'password')) {
         command += ' --username ' + options.username +
                    ' --password ' + options.password;
         if ('authDb' in options && options.authDb !== null) {
           command += ' --authenticationDatabase ' + options.authDb;
         }
       }
       if ('db' in options && options.db != '*' && (!isRestore || isLegacyRestoreDb())) {// keep legacy capability
         command += ' --db ' + options.db;// deprecated for mongorestore: will produce additional deprecated stderr
       } else if (isRestore && !isLegacyRestoreDb() && 'db' in options && options.db != '*') {
         command += ' --nsInclude ' + options.db;
       }
     }
     if (isBooleanOptionSet(options, 'ssl')) {
        command += ' --ssl';
     }
     if (isOptionSet(options, 'sslCAFile')) {
        command += ' --sslCAFile ' + options.sslCAFile;
     }
     if (isOptionSet(options, 'sslPEMKeyFile')) {
        command += ' --sslPEMKeyFile ' + options.sslPEMKeyFile;
     }
     if (isOptionSet(options, 'sslPEMKeyPassword')) {
        command += ' --sslPEMKeyPassword ' + options.sslPEMKeyPassword;
     }
     if (isOptionSet(options, 'sslCRLFile')) {
        command += ' --sslCRLFile ' + options.sslCRLFile;
     }
     if (isBooleanOptionSet(options, 'sslFIPSMode')) {
        command += ' --sslFIPSMode';
     }
     if (isBooleanOptionSet(options, 'tlsInsecure')) {
        command += ' --tlsInsecure';
     }
     return command;
  }

  commandCollectionsFromOptions(options, command) {
     // deprecated includeCollections
     if (isOptionSet(options, 'collection') && isOptionSet(options, 'includeCollections')) {
       return reject({ error: 'INVALID_OPTIONS', message: 'please remove deprecated "includeCollections" option and use "collection" only.'});
     }
     if (isOptionSet(options, 'collection') && !isSingleValue(options.collection)) {
       return reject({ error: 'INVALID_OPTIONS', message: '"collection" option must be a single value.'});
     }
     // deprecated includeCollections
     if (isOptionSet(options, 'includeCollections') && isOptionSet(options, 'excludeCollections')) {
       return reject({ error: 'INVALID_OPTIONS', message: '"excludeCollections" option is not allowed when "includeCollections" is specified.'});
     }
     if (isOptionSet(options, 'collection') && isOptionSet(options, 'excludeCollections')) {
       return reject({ error: 'INVALID_OPTIONS', message: '"excludeCollections" option is not allowed when "collection" is specified.'});
     }

     // deprecated includeCollections
     if (isOptionSet(options, 'includeCollections') && Array.isArray(options.includeCollections) && options.includeCollections.length > 0){
       command += ' --collection ' + options.includeCollections[options.includeCollections.length -1];// take only last value
       console.warn('includeCollections : this option is deprecated, please use "collection" instead');
     }

     if (isOptionSet(options, 'collection') && isSingleValue(options.collection)) {
       command += ' --collection ' + getSingleValue(options.collection);
     }

     if (isOptionSet(options, 'excludeCollections') && Array.isArray(options.excludeCollections)) {
        for(const collection of options.excludeCollections){
          command += ' --excludeCollection ' + collection;
        }
     }
     return command;
  }

  mongodump(options) {
   const mt = this;
   return new Promise(async function(resolve, reject) {
     if (!('db' in options) && !('uri' in options)) {
       return reject({ error: 'INVALID_OPTIONS', message: 'db: database name for dump is required.' });
     }
     const dumpCmd = getOptionOrDefault(options, 'dumpCmd', 'mongodump');
     const path = getOptionOrDefault(options, 'path', 'backup');
     // create path if not exist
     if (!fs.existsSync(path)) {
       await fsPromise.mkdir(path, { recursive: true })
         .catch((err) => {
           return reject({ error: 'INVALID_OPTIONS', message: 'path: cannot create ' + path + ' :' + err });
         });
     }

     const database = mt.databaseFromOptions(options);
     var command = mt.commandConnectFromOptions(options);
     command = mt.commandCollectionsFromOptions(options, command);

     const dateTimeSuffix = getNowFormatted();
     const simplifiedName = database.replace(/[^a-zA-Z0-9\\-]/g,'_');
     const fileName = getOptionOrDefault(options, 'fileName', `${simplifiedName}__${dateTimeSuffix}.gz`);
     var fullFileName = `${path}/${fileName}`;

     try {// launch mongodump
       command += ` --archive=${fullFileName} --gzip`;
       if ('showCommand' in options && options.showCommand === true) {
         console.log(dumpCmd, command);
       }
       var dump = ssync(dumpCmd, command.split(' ').slice(1));
       if (dump.status === 0) {
         resolve({message: `db:${database} - dump created`,
                  status: dump.status,
                  fileName,// re-used by dropbox
                  fullFileName,
                  stdout: dump.stdout ? dump.stdout.toString() : null,
                  stderr: dump.stderr ? dump.stderr.toString() : null
         });
       } else if (dump.error && dump.error.code === "ENOENT") {
         reject({ error: 'COMMAND_NOT_FOUND', message: `Binary ${dumpCmd} not found`});
       } else {
         reject({ error: 'COMMAND_ERROR', message: dump.error ,
           status: dump.status,
           stdout: dump.stdout ? dump.stdout.toString() : null,
           stderr: dump.stderr ? dump.stderr.toString() : null});
       }
     } catch (exception) {
       reject({ error: 'COMMAND_EXCEPTION', message: exception});
     }
    });
  }

  mongorestore(options, toRestore = null) {
    const mt = this;
    return new Promise((resolve, reject) => {
      var dumpFile = toRestore == null ? options.dumpFile : toRestore;
      if (dumpFile === null || dumpFile === undefined) {
        return reject({ error: 'INVALID_OPTIONS', message: 'dumpFile: mongo dump file is required.' });
      }

      var restoreCmd = getOptionOrDefault(options, 'restoreCmd', 'mongorestore');
      var command = mt.commandConnectFromOptions(options, "", true);

      if ('dropBeforeRestore' in options && options.dropBeforeRestore == true) {
        command += ' --drop';
      }
      command += ' --archive=' + dumpFile + ' --gzip';

      if ('showCommand' in options && options.showCommand === true) {
        console.log(restoreCmd, command);
      }
      // launch mongorestore
      try {
        var restore = ssync(restoreCmd, command.split(' ').slice(1));
        if (restore.status === 0) {
          if ('deleteDumpAfterRestore' in options && options.deleteDumpAfterRestore == true) {
              fs.unlinkSync(dumpFile);
          }
          resolve({message: `file: ${dumpFile} restored`,
                   dumpFile,
                   status: restore.status,
                   stdout: restore.stdout.toString(),
                   stderr: restore.stderr.toString()});
        } else if (restore.error && restore.error.code === "ENOENT") {
          reject({ error: 'COMMAND_NOT_FOUND', message: `Binary ${restoreCmd} not found`});
        } else {
          reject({ error: 'COMMAND_ERROR', message: restore.error , status: restore.status, stdout: restore.stdout.toString(), stderr: restore.stderr.toString()});
        }
      } catch (exception) {
        reject({ error: 'COMMAND_EXCEPTION', message: exception});
      }
    });
  }
}

//~ private
function getNowFormatted() {
  return dateFormat(new Date(), "yyyy-mm-dd_HHMMss");
}

function getOptionOrDefault(options, name, defaultValue) {
  return (name in options && isSet(options[name])) ? options[name] : defaultValue;
}

function isSet(value) {
  return value !== undefined && value !== null;
}

function isOptionSet(options, optionName) {
  return optionName in options && isSet(options[optionName]);
}

function isBooleanOptionSet(options, optionName) {
  return optionName in options && "1" === options[optionName];
}

function isSingleValue(value) {
  return (Array.isArray(value) && value.length === 1) || (typeof value === 'string' || value instanceof String);
}

function getSingleValue(value) {
  return (Array.isArray(value) && value.length === 1) ? value[0] : value;
}

function isLegacyRestoreDb() {
  return "1" === process.env.MT_MONGO_LEGACY_RESTORE_DB;
}

module.exports = MTWrapper;