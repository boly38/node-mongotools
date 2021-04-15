const exec = require('child_process').exec;
const fs = require('fs');
const mkdirp = require('mkdirp');
const ssync = require('child_process').spawnSync;
const dropboxV2Api = require('dropbox-v2-api');
const dateFormat = require('dateformat');
const path = require("path");

class MongoTools {
  getDropbox(options) {
    return options.dropboxEnabled ? dropboxV2Api.authenticate({
        token: options.dropboxToken
    }) : null;
  }

  list(options) {
    return (options.dropboxEnabled) ?
      this.listFromDropbox(this.getDropbox(options), this.getDropboxPathFromOptions(options)) :
      this.listFromFilesystem(this.getPathFromOptions(options));
  }

  listFromFilesystem(path) {
    return new Promise(async function(resolve, reject) {
      if (!fs.existsSync(path)) {
        return reject(`no dump path ${path}`)
      }
      fs.readdir(path, (err, files) => {
        if (err) {
          return reject(err);
        }
        return resolve(files.map(f => path+'/'+f));
      });
    });
  }

  // https://www.dropbox.com/developers/documentation/http/documentation#files-list_folder
  listFromDropbox(dbx, path) {
    return new Promise(async function(resolve, reject) {
      console.log(`Dropbox filesListFolder ${path}:`);
      dbx({
          resource: 'files/list_folder',
          parameters: {path, "recursive":false}
      }, (err, result, response) => {
          if (err) { return reject(err); }
          // DEBUG // console.log(result); console.log(response.headers);
          const fileNames = result.entries
                                  .filter(e => e[".tag"] === "file")
                                  .map(e=>e.name);
          // DEBUG // console.log('response', fileNames)
          resolve(fileNames);
      });
    });
  }

  mongodump(options) {
    const mt = this;
    return new Promise(async function(resolve, reject) {
      mt.mongodumpOnFilesystem(options)
      .then(async function(dumpResult) {
        // DEBUG // console.log(options.dropboxEnabled , JSON.stringify(dumpResult));
        if (options.dropboxEnabled && dumpResult.fileName && dumpResult.fullFileName) {
           mt.mongoDumpUploadOnDropbox(options, dumpResult)
            .then(resolve)
            .catch(reject);
        } else {
          resolve(dumpResult);
        }
      })
      .catch(reject);
    });
  }

  // https://www.npmjs.com/package/dropbox-v2-api
  // https://www.dropbox.com/developers/documentation/http/documentation#files-upload
  mongoDumpUploadOnDropbox(options, dumpResult) {
    const mt = this;
    return new Promise(async function(resolve, reject) {
      const dbx = mt.getDropbox(options);
      const path = mt.getDropboxPathFromOptions(options);
      const filename = dumpResult.fileName ? dumpResult.fileName : "mongodump.gz";
      const dbxFilename = path + "/" + filename;
      dbx({
          resource: 'files/upload',
          parameters: {
              path: dbxFilename
          },
          readStream: fs.createReadStream(dumpResult.fullFileName)
      }, (err, result, response) => {
        // DEBUG // console.log("files/upload", JSON.stringify(err), JSON.stringify(result), JSON.stringify(response));
        if (err) { return reject(err); }
        dumpResult.dropboxFile = result.path_display;
        dumpResult.dropboxFileSize = result.size;
        dumpResult.message = dumpResult.message + ` - uploaded on dropbox as ${dumpResult.dropboxFile}`;
        resolve(dumpResult);
      });
    });
  }

  mongodumpOnFilesystem(options) {
   const mt = this;
   return new Promise(async function(resolve, reject) {
     if (!('db' in options) && !('uri' in options)) {
       return reject({ error: 'INVALID_OPTIONS', message: 'db: database name for dump is required.' });
     }
     var dumpCmd = ('dumpCmd' in options) ? options.dumpCmd : 'mongodump';
     // Improvement: verify dumpCmd exists

     const path = mt.getPathFromOptions(options);
     // create path if not exist
     if (!fs.existsSync(path)) {
       await fs.promises.mkdir(path, { recursive: true })
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
       database = uri.substring(uri.lastIndexOf('/') + 1, uri.length)
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
                  stdout: dump.stdout.toString(),
                  stderr: dump.stderr.toString()
         });
       } else {
         reject({ error: 'COMMAND_ERROR', message: dump.error , status: dump.status, stdout: dump.stdout.toString(),
           stderr: dump.stderr.toString()});
       }
     } catch (exception) {
       reject({ error: 'COMMAND_EXCEPTION', message: exception});
     }
    });
  }

  mongorestore(options) {
    const mt = this;
    return new Promise(async function(resolve, reject) {
      var toRestore = options.dumpFile;
      if (options.dropboxEnabled) {
        const downloadResult = await mt.mongorestoreDownloadFromDropbox(options)
          .catch(reject);
        console.log(downloadResult.message);
        toRestore = downloadResult.fullFileName;
      }
      return mt.mongorestoreFromFilesystem(options, toRestore)
        .then(resolve)
        .catch(reject);
    });
  }

  // https://www.npmjs.com/package/dropbox-v2-api
  // https://www.dropbox.com/developers/documentation/http/documentation#files-download
  mongorestoreDownloadFromDropbox(options) {// TODO BRICE
    const mt = this;
    return new Promise(async function(resolve, reject) {
      const dbx = mt.getDropbox(options);
      const dbxFullFilename = options.dumpFile;
      const localPath = mt.getDropboxLocalPathFromOptions(options);
      const fileName = mt.extractFilename(dbxFullFilename);
      const fullFileName = localPath + '/' + fileName;
     // create path if not exist
     if (!fs.existsSync(localPath)) {
       await fs.promises.mkdir(localPath, { recursive: true })
         .catch((err) => {
           return reject({ error: 'INVALID_OPTIONS', message: 'path: cannot create ' + localPath + ' :' + err });
         });
     }
      // DEBUG // console.log("files/download", dbxFilename);
      dbx({
          resource: 'files/download',
          parameters: {
              path: dbxFullFilename
          }
      }, (err, result, response) => {
          // console.log("files/download", JSON.stringify(err), JSON.stringify(result), JSON.stringify(response));
          if (err) { return reject(err); }
          resolve({message: `dump downloaded into ${fullFileName}`,
                   fileName,
                   fullFileName});
      })
      .pipe(fs.createWriteStream(fullFileName));
    });
  }

  mongorestoreFromFilesystem(options, toRestore = null) {
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
        } else {
          reject({ error: 'COMMAND_ERROR', message: restore.error , status: restore.status, stdout: restore.stdout.toString(), stderr: restore.stderr.toString()});
        }
      } catch (exception) {
        reject({ error: 'COMMAND_EXCEPTION', message: exception});
      }
    });
  }

  extractFilename(fullFileName) {
    return path.basename(fullFileName);
  }

  getPathFromOptions(options) {
    return ('path' in options) ? options.path : 'backup';
  }

  getDropboxPathFromOptions(options) {
    return '/' + this.getPathFromOptions(options);
  }

  getDropboxLocalPathFromOptions(options) {
    return ('dropboxLocalPath' in options) ? options.dropboxLocalPath : 'dropbox';
  }

  getNowFormatted() {
    return dateFormat(new Date(), "yyyy-mm-dd_HHMMss");
  }
}

module.exports = MongoTools;