const MTWrapper = require("./MTWrapper");
const MTFilesystem = require("./MTFilesystem");
const MTDropbox = require("./MTDropbox");
const MTOptions = require("./MTOptions");

class MongoTools {
  constructor() {
    this.wrapper = new MTWrapper();
    this.dbx = new MTDropbox();
    this.fs = new MTFilesystem();
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

  mongorestore(opt) {
    const options = assumeOptions(opt);
    const path = options.getPath();
    const mt = this;
    return new Promise(async function(resolve, reject) {
      var toRestore = options.dumpFile;
      if (!toRestore) {
        return reject("dumpFile is required");
      }
      if (!toRestore.startsWith(path) && options.dropboxEnabled) {
        const downloadResult = await mt.dbx.mongorestoreDownloadFromDropbox(options)
          .catch(reject);
        if (downloadResult == undefined) {
          return;
        }
        console.log(downloadResult.message);
        toRestore = downloadResult.fullFileName;
      }
      return mt.wrapper.mongorestore(options, toRestore)
        .then(resolve)
        .catch(reject);
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