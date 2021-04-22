const fs = require('fs');
const fsPromise = fs.promises;
const ssync = require('child_process').spawnSync;
const dateFormat = require('dateformat');

class MTWrapper {

  mongodump(options) {
   const mt = this;
   return new Promise(async function(resolve, reject) {
     if (!('db' in options) && !('uri' in options)) {
       return reject({ error: 'INVALID_OPTIONS', message: 'db: database name for dump is required.' });
     }
     var dumpCmd = ('dumpCmd' in options) ? options.dumpCmd : 'mongodump';
     // Improvement: verify dumpCmd exists

     const path = options.getPath();
     // create path if not exist
     if (!fs.existsSync(path)) {
       await fsPromise.mkdir(path, { recursive: true })
         .catch((err) => {
           return reject({ error: 'INVALID_OPTIONS', message: 'path: cannot create ' + path + ' :' + err });
         });
     }

     var database = 'backup';
     var command = dumpCmd;
     var uri  = ('uri' in options) ? options.uri : null;

     if (uri != null) {
       if (!uri.includes('/')) {
         return reject({ error: 'INVALID_OPTIONS', message: 'uri: database name for dump is required.' });
       }
       database = uri.includes('?') ? uri.substring(uri.lastIndexOf('/') + 1, uri.indexOf('?')) :
                                      uri.substring(uri.lastIndexOf('/') + 1, uri.length);
       command += ' --uri ' + uri
     } else {
       command += ' --host ' + (('host' in options) ? options.host : '127.0.0.1') +
                  ' --port ' + (('port' in options) ? options.port : 27017);
       if ('username' in options && 'password' in options) {
         command += ' --username ' + options.username +
                    ' --password ' + options.password;
         if ('authDb' in options && options.authDb !== null) {
           command += ' --authenticationDatabase ' + options.authDb;
         }
       }
       if ('db' in options && options.db != '*') {
         command += ' --db ' + options.db;
         database = options.db;
       }
     }
     if ('ssl' in options && options.ssl) {
        command += ' --ssl';
     }
     if (database === null || database === undefined || database === '') {
       return reject({ error: 'INVALID_OPTIONS', message: 'database name for dump is required.' });
     }
     const dateTimeSuffix = mt.getNowFormatted();
     const simplifiedName = database.replace(/[^a-zA-Z0-9\\-]/g,'_');
     const fileName = ('fileName' in options) ? options.fileName : `${simplifiedName}__${dateTimeSuffix}.gz`;
     var fullFileName = `${path}/${fileName}`;

     try {// launch mongodump
       command += ` --archive=${fullFileName} --gzip`;
       if ('showCommand' in options && options.showCommand === true) {
         console.log(command);
       }
       var dump = ssync(dumpCmd, command.split(' ').slice(1));
       if (dump.status === 0) {
         resolve({message: `db:${database} - dump created: ${fullFileName}`,
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
    return new Promise((resolve, reject) => {
      var dumpFile = toRestore == null ? options.dumpFile : toRestore;
      if (dumpFile === null || dumpFile === undefined) {
        return reject({ error: 'INVALID_OPTIONS', message: 'dumpFile: mongo dump file is required.' });
      }

      var restoreCmd = ('restoreCmd' in options) ? options.restoreCmd : 'mongorestore';
      // Improvement: verify restoreCmd exists

      var uri  = ('uri' in options) ? options.uri : null;
      if (uri != null) {
        command += ' --uri ' + uri
      } else {
        var command = restoreCmd + ' --host ' + (('host' in options) ? options.host : '127.0.0.1') +
                                   ' --port ' + (('port' in options) ? options.port : 27017);
        if ('username' in options && 'password' in options) {
          command += ' --username ' + options.username +
                     ' --password ' + options.password;
          if ('authDb' in options && options.authDb !== null) {
            command += ' --authenticationDatabase ' + options.authDb;
          }
        }
      }
      if ('ssl' in options && options.ssl) {
         command += ' --ssl';
      }
      if ('dropBeforeRestore' in options && options.dropBeforeRestore == true) {
        command += ' --drop';
      }
      command += ' --archive=' + dumpFile + ' --gzip';

      if ('showCommand' in options && options.showCommand === true) {
        console.log(command);
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

  //~ private
  getNowFormatted() {
    return dateFormat(new Date(), "yyyy-mm-dd_HHMMss");
  }
}

module.exports = MTWrapper;