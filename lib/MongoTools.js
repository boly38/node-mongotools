const MTWrapper = require("./MTWrapper");
const MTFilesystem = require("./MTFilesystem");
const MTDropbox = require("./MTDropbox");
const MTOptions = require("./MTOptions");
const MTEncrypt = require("./MTEncrypt");

class MongoTools {
  constructor() {
    this.wrapper = new MTWrapper();
    this.dbx = new MTDropbox();
    this.fs = new MTFilesystem();
    this.enc = new MTEncrypt();
  }

  list(opt) {
    const options = assumeOptions(opt);
    const path = options.getPath();
    const mt = this;
    return new Promise(async function(resolve, reject) {
        const filesystem = await mt.fs.listFromFilesystem(path).catch(reject);
        if (filesystem === undefined) {
          return;
        }
        if (!options.dropboxEnabled) {
          return resolve({path, filesystem});
        }
        const dropbox = await mt.dbx.listFromDropbox(options).catch(reject);
        if (dropbox === undefined) {
          return;
        }
        return resolve({path, filesystem, dropbox});
    });
  }

  mongodump(opt) {
    const options = assumeOptions(opt);
    const mt = this;
    return new Promise(async function(resolve, reject) {
      mt.wrapper.mongodump(options)
      .then(async function(dumpResult) {

        if (options.encrypt === true) {
          dumpResult = await mt.encryptDump(options, dumpResult).catch(reject);
          if (dumpResult === undefined) {
            return;
          }
        }

        // DEBUG // console.log(options.dropboxEnabled , JSON.stringify(dumpResult));
        if (options.dropboxEnabled && dumpResult.fileName && dumpResult.fullFileName) {
           mt.dbx.mongoDumpUploadOnDropbox(options, dumpResult)
            .then(resolve)
            .catch(reject);
        } else {
          resolve(dumpResult);
        }
      })
      .catch(reject);
    });
  }

  encryptDump(opt, dumpResult) {
    const mt = this;
    return new Promise(async function(resolve, reject) {
      const secret = opt.secret;
      if (secret === null) {
        return reject(`secret is required to encrypt dump. ${dumpResult.fullFileName} is not encrypted.`);
      }
      const originalFile = ""+dumpResult.fullFileName;
      dumpResult.fileName += opt.encryptSuffix;
      dumpResult.fullFileName += opt.encryptSuffix;
      await mt.enc.encrypt(originalFile, dumpResult.fullFileName, secret);
      resolve(dumpResult);
    });
  }

  mongorestore(opt) {
    const options = assumeOptions(opt);
    const path = options.getPath();
    const mt = this;
    return new Promise(async function(resolve, reject) {
      var toRestore = options.dumpFile;
      if (!toRestore) {
        return reject("dumpFile is required");
      }
      if (!toRestore.startsWith(path) && options.dropboxEnabled === true) {
        const downloadResult = await mt.dbx.mongorestoreDownloadFromDropbox(options)
          .catch(reject);
        if (downloadResult === undefined) {
          return;
        }
        console.log(downloadResult.message);
        toRestore = downloadResult.fullFileName;
      }
      if (options.decrypt === true) {
        toRestore = await mt.decryptDump(options, toRestore).catch(reject);
        if (toRestore === undefined) {
          return;
        }
      }

      return mt.wrapper.mongorestore(options, toRestore)
        .then(resolve)
        .catch(reject);
    });
  }

  decryptDump(opt, dumpFilename) {
    const mt = this;
    return new Promise(async function(resolve, reject) {
      const secret = opt.secret;
      if (secret === null) {
        return reject(`secret is required to decrypt dump. ${dumpFilename} is not decrypted.`);
      }
      const suffix = opt.encryptSuffix;
      const originalFile = ""+dumpFilename;
      const decryptedFile = originalFile.endsWith(suffix) ? ""+originalFile.slice(0, -suffix.length) : decryptedFile;
      await mt.enc.decrypt(originalFile, decryptedFile, secret);
      resolve(decryptedFile);
    });
  }

  rotation(opt) {
    const options = assumeOptions(opt);
    const rotationDryMode = 'rotationDryMode'     in options ? options.rotationDryMode : false;
    const windowsDays     = 'rotationWindowsDays' in options ? options.rotationWindowsDays : 15;
    const minCount        = 'rotationMinCount'    in options ? options.rotationMinCount : 2;
    const cleanCount      = 'rotationCleanCount'  in options ? options.rotationCleanCount : 10;
    try {
      assumeInt(windowsDays, 0, null, "rotationWindowsDays: must be an integer greater than or equal to 0");
      assumeInt(minCount,    0, null, "minCount: must be an integer greater than or equal to 0");
      assumeInt(cleanCount,  0, null, "cleanCount: must be an integer greater than or equal to 0");
    } catch (validationError) {
      return Promise.reject({ error: 'INVALID_OPTIONS', message: validationError });
    }
    const path = options.getPath();
    var ctimeMsMax = new Date();
    ctimeMsMax.setDate(ctimeMsMax.getDate()-windowsDays);
    const ctimeMsMaxMs = ctimeMsMax.getTime();
    // DEBUG // console.log("ctimeMsMax", ctimeMsMaxMs, "==>", ctimeMsMax)
    const mt = this;
    return new Promise(async function(resolve, reject) {
      const filesystemRotationResult = await mt.fs.fileSystemRotation(rotationDryMode, path, ctimeMsMaxMs, cleanCount, minCount)
                                              .catch(reject);
      if (filesystemRotationResult == undefined) {
        return;
      }
      if (options.dropboxEnabled) {
        const dropboxRotationResult = await mt.dbx.rotation(options, rotationDryMode, ctimeMsMax, cleanCount, minCount)
                                                  .catch(reject);
        if (dropboxRotationResult == undefined) {
          return;
        }
        resolve({ filesystem: filesystemRotationResult,
                  dropbox: dropboxRotationResult });
      }
      resolve({ filesystem: filesystemRotationResult });
    });
  }

}

//~ private world

function assumeInt(value, intMin, intMax, errorMsg) {
  if (isNaN(value)
  || (intMin !== null && value < intMin)
  || (intMax !== null && value > intMax)
     ) {
    throw errorMsg;
  }
}

function assumeOptions(options) {
  if (options === null || options === undefined || !(options instanceof MTOptions)) {
    return new MTOptions(options);
  }
  return options;
}


module.exports = MongoTools;