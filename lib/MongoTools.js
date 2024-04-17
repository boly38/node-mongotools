import MTWrapper from "./MTWrapper.js";
import MTFilesystem from "./MTFilesystem.js";
import MTDropbox from "./MTDropbox.js";
import MTOptions from "./MTOptions.js";
import MTEncrypt from "./MTEncrypt.js";

class MongoTools {
    constructor() {
        this.wrapper = new MTWrapper();
        this.dbx = new MTDropbox();
        this.fs = new MTFilesystem();
        this.enc = new MTEncrypt();
    }

    list(opt) {
        const mt = this;
        return new Promise((resolve, reject) => {
            const options = assumeOptions(opt);
            const path = options.getPath();
            mt.fs.listFromFilesystem(path)
                .then(filesystem => {
                    if (!options.dropboxEnabled) {
                        return resolve({path, filesystem});
                    }
                    mt.dbx.listFromDropbox(options)
                        .then(dropbox => {
                            resolve({path, filesystem, dropbox});
                        })
                        .catch(err => reject(err));
                })
                .catch(err => reject(err));
        });
    }

    mongodump(opt) {
        const mt = this;
        return new Promise((resolve, reject) => {
            const options = assumeOptions(opt);
            mt.wrapper.mongodump(options)
                .then(dumpResult => {
                    if (options.encrypt === true) {
                        mt.encryptDump(options, dumpResult)
                            .then(dumpResult => {
                                mt.uploadOnDropboxIfEnabled(options, dumpResult, resolve, reject);
                            })
                            .catch(err => reject(err));
                    } else {
                        mt.uploadOnDropboxIfEnabled(options, dumpResult, resolve, reject);
                    }

                })
                .catch(err => reject(err));
        });
    }

    uploadOnDropboxIfEnabled(options, dumpResult, resolve, reject) {
        // DEBUG // console.log(options.dropboxEnabled , JSON.stringify(dumpResult));
        if (options.dropboxEnabled && dumpResult.fileName && dumpResult.fullFileName) {
            this.dbx.mongoDumpUploadOnDropbox(options, dumpResult)
                .then(resolve)
                .catch(err => reject(err));
        } else {
            resolve(dumpResult);
        }
    }

    encryptDump(opt, dumpResult) {
        const mt = this;
        return new Promise((resolve, reject) => {
            const secret = opt.secret;
            if (secret === null) {
                return reject(new Error(`secret is required to encrypt dump. ${dumpResult.fullFileName} is not encrypted.`));
            }
            const originalFile = "" + dumpResult.fullFileName;
            dumpResult.fileName += opt.encryptSuffix;
            dumpResult.fullFileName += opt.encryptSuffix;
            mt.enc.encrypt(originalFile, dumpResult.fullFileName, secret)
                .then(() => {
                    resolve(dumpResult);
                })
                .catch(err => reject(err));
        });
    }

    mongorestore(opt) {
        const options = assumeOptions(opt);
        const path = options.getPath();
        const mt = this;
        return new Promise((resolve, reject) => {
            let toRestore = options.dumpFile;
            if (!toRestore) {
                return reject(new Error("dumpFile is required"));
            }
            if (!toRestore.startsWith(path) && options.dropboxEnabled === true) {
                mt.dbx.mongorestoreDownloadFromDropbox(options)
                    .then(downloadResult => {
                        if (downloadResult === undefined) {
                            return;
                        }
                        console.log(downloadResult.message);
                        toRestore = downloadResult.fullFileName;
                        mt.decryptAndRestore(options, toRestore, resolve, reject);
                    })
                    .catch(err => reject(err));
            } else {
                mt.decryptAndRestore(options, toRestore, resolve, reject);
            }
        });
    }

    function

    decryptAndRestore(options, toRestore, resolve, reject) {
        if (options.decrypt === true) {
            this.decryptDump(options, toRestore)
                .then(toRestore => {
                    this.wrapper.mongorestore(options, toRestore)
                        .then(resolve)
                        .catch(err => reject(err));
                })
                .catch(err => reject(err));
        } else {
            this.wrapper.mongorestore(options, toRestore)
                .then(resolve)
                .catch(err => reject(err));
        }
    }

    decryptDump(opt, dumpFilename) {
        const mt = this;
        return new Promise((resolve, reject) => {
            const secret = opt.secret;
            if (secret === null) {
                return reject(new Error(`secret is required to decrypt dump. ${dumpFilename} is not decrypted.`));
            }
            const suffix = opt.encryptSuffix;
            const originalFile = "" + dumpFilename;
            const decryptedFile = originalFile.endsWith(suffix) ? "" + originalFile.slice(0, -suffix.length) : originalFile;
            mt.enc.decrypt(originalFile, decryptedFile, secret)
                .then(() => {
                    resolve(decryptedFile);
                })
                .catch(err => reject(err));
        });
    }

    rotation(opt) {
        const options = assumeOptions(opt);
        const rotationDryMode = 'rotationDryMode' in options ? options.rotationDryMode : false;
        const windowsDays = 'rotationWindowsDays' in options ? options.rotationWindowsDays : 15;
        const minCount = 'rotationMinCount' in options ? options.rotationMinCount : 2;
        const cleanCount = 'rotationCleanCount' in options ? options.rotationCleanCount : 10;
        try {
            assumeInt(windowsDays, 0, null, "rotationWindowsDays: must be an integer greater than or equal to 0");
            assumeInt(minCount, 0, null, "minCount: must be an integer greater than or equal to 0");
            assumeInt(cleanCount, 0, null, "cleanCount: must be an integer greater than or equal to 0");
        } catch (validationError) {
            return Promise.reject({error: 'INVALID_OPTIONS', message: validationError});
        }
        const path = options.getPath();
        const ctimeMsMax = new Date();
        ctimeMsMax.setDate(ctimeMsMax.getDate() - windowsDays);
        const ctimeMsMaxMs = ctimeMsMax.getTime();
        // DEBUG // console.log("ctimeMsMax", ctimeMsMaxMs, "==>", ctimeMsMax)
        const mt = this;
        return new Promise((resolve, reject) => {
            mt.fs.fileSystemRotation(rotationDryMode, path, ctimeMsMaxMs, cleanCount, minCount)
                .then(filesystemRotationResult => {
                    if (options.dropboxEnabled) {
                        mt.dbx.rotation(options, rotationDryMode, ctimeMsMax, cleanCount, minCount)
                            .then(dropboxRotationResult => {
                                resolve({
                                    filesystem: filesystemRotationResult,
                                    dropbox: dropboxRotationResult
                                });
                            })
                            .catch(err => reject(err));
                    } else {
                        resolve({filesystem: filesystemRotationResult});
                    }
                })
                .catch(err => reject(err));

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


export default MongoTools;