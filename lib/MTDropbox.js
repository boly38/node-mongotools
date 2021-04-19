const fs = require('fs');
const path = require("path");
const dropboxV2Api = require('dropbox-v2-api');

class MTDropbox {
  // https://www.dropbox.com/developers/documentation/http/documentation#files-list_folder
  listFromDropbox(options) {
    const dbx = getDropbox(options);
    const path = options.getDropboxPath();
    return new Promise(async function(resolve, reject) {
      // DEBUG // console.log(`Dropbox filesListFolder ${path}:`);
      dbx({
          resource: 'files/list_folder',
          parameters: getDbxListFileFromPathParam(path)
      }, (err, result, response) => {
          if (err) { return reject(err); }
          // DEBUG // console.log(result); console.log(response.headers);
          const fileNames = result.entries
                                  .filter(e => e[".tag"] === "file")
                                  .map(e=>e.path_lower);
          // DEBUG // console.log('response', fileNames)
          resolve(fileNames);
      });
    });
  }

  // https://www.npmjs.com/package/dropbox-v2-api
  // https://www.dropbox.com/developers/documentation/http/documentation#files-upload
  mongoDumpUploadOnDropbox(options, dumpResult) {
    const dbx = getDropbox(options);
    const path = options.getDropboxPath();
    const filename = dumpResult.fileName ? dumpResult.fileName : "mongodump.gz";
    const dbxFilename = path + "/" + filename;
    return new Promise(async function(resolve, reject) {
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

  // https://www.npmjs.com/package/dropbox-v2-api
  // https://www.dropbox.com/developers/documentation/http/documentation#files-download
  mongorestoreDownloadFromDropbox(options) {
    const dbx = getDropbox(options);
    const dbxFullFilename = options.dumpFile;
    const localPath = options.getDropboxLocalPath();
    const fileName = extractFilename(dbxFullFilename);
    const fullFileName = localPath + '/' + fileName;
    if (!dbxFullFilename.startsWith('/')) {
      return Promise.reject(`Dropbox dumpFile ${dbxFullFilename} must start with '/'. Note for Windows users: unalias node and set MSYS_NO_PATHCONV=1 may help.`)
    }
    return new Promise(async function(resolve, reject) {
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

  rotation(options, dryMode, ctimeMsMax, cleanCount, minCount) {
    const dbx = getDropbox(options);
    const path = options.getDropboxPath();
    const mt = this;
    return new Promise(async function(resolve, reject) {
      dbx({
          resource: 'files/list_folder',
          parameters: getDbxListFileFromPathParam(path)
      }, async function(err, result, response) {
          if (err) { return reject(err); }
          // DEBUG // console.log(result); console.log(response.headers);
          if (result.has_more === true) {
            return reject(`dropbox backup directory ${path} has more than 2000 files. Rotation has been skipped`);
          }
          const initialBackupsCount = result.length;
          const deprecatedBackups = result.entries
                                  .filter(e => e[".tag"] === "file")
                                  .filter(e => new Date(e.client_modified) < new Date(ctimeMsMax))
                                  .map(e=> { return {
                                      name: e.name,
                                      path_lower: e.path_lower,
                                      client_modified: e.client_modified
                                    };
                                  });
          const deprecatedBackupsCount = deprecatedBackups.length;
          const deletedBackups = await mt.backupsToClean(dbx, dryMode, deprecatedBackups, cleanCount, minCount);
          const cleanedCount = deletedBackups.length;
          const cleanedFiles = deletedBackups.map(db => db.path_lower);
          // DEBUG //  console.log('fileNames', fileNames)
          return resolve({initialBackupsCount, deprecatedBackupsCount, cleanedCount, cleanedFiles});
      });
    });
  }

  backupsToClean(dbx, dryMode, deprecatedBackups, cleanCount, minCount) {
    if (deprecatedBackups === null || deprecatedBackups === undefined || deprecatedBackups.length <= minCount) {
      return [];
    }
    // sort by client_modified asc
    deprecatedBackups = deprecatedBackups.sort((a, b)=>{
       return (a.client_modified > b.client_modified) - (a.client_modified < b.client_modified);// client_modified asc
    });
    // DEBUG // console.log("dbx backupsToClean", {deprecatedBackups, cleanCount, minCount});
    // keep nb to clean
    var toDelete = deprecatedBackups.length > minCount ?
        deprecatedBackups.slice(minCount, Math.min(minCount+cleanCount, deprecatedBackups.length))
        : [];
    // DEBUG // console.log("toDelete", {toDelete});

    for (const toDeleteEntry of toDelete) {
      if (!dryMode) {
        dbx({
            resource: 'files/delete',
            parameters: {path: toDeleteEntry.path_lower}
        }, async function(err, result, response) {
            if (err) { return Promise.reject(err); }
            // DEBUG // console.log(result); console.log(response.headers);
        });
      } else {
        console.log("*dry mode* DELETE", toDeleteEntry.path_lower )
      }
    }
    return Promise.resolve(toDelete);
  }
}

//~ private

//https://www.dropbox.com/developers/documentation/http/documentation#files-list_folder
function getDbxListFileFromPathParam(path) {
  return {path, "recursive":false, limit: 2000, include_non_downloadable_files: false};
}

function extractFilename(fullFileName) {
  return path.basename(fullFileName);
}

function getDropbox(options) {
  return options.dropboxEnabled ? dropboxV2Api.authenticate({
      token: options.dropboxToken
  }) : null;
}


module.exports = MTDropbox;