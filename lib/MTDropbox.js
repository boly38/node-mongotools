import fs from 'fs';
import path from "path";
import {Dropbox} from 'dropbox';
import {isSet} from "./util.js";
import {isAccessTokenValid, refreshAccessToken} from "dropbox-refresh-token"; // https://www.npmjs.com/package/dropbox-refresh-token

const MUST_LOG_DEBUG = process.env.MT_DROPBOX_DEBUG === "true" || false;
export default class MTDropbox {
    // https://github.com/dropbox/dropbox-sdk-js/blob/main/examples/javascript/node/basic.js
    listFromDropbox(options) {
        return new Promise((resolve, reject) => {
            getDropbox(options)
                .then(dbx => {
                    const path = options.getDropboxPath();
                    MUST_LOG_DEBUG && console.log(`Dropbox filesListFolder ${path}:`);
                    dbx.filesListFolder({path})
                        .then(response => {
                            const fileNames = response.result.entries
                                .filter(e => e[".tag"] === "file")
                                .map(e => e.path_lower);
                            resolve(fileNames);
                        })
                        .catch(filesListError => {
                            MUST_LOG_DEBUG && console.log('filesListError', filesListError)
                            if (isPathNotFoundError(filesListError)) {
                                resolve([]);
                                return;
                            }
                            reject(new Error(
                                `Dropbox list ${path}: ${dropboxErrorResponseToSummary(filesListError)}`
                            ));
                        });
                })
                .catch(err => reject(err));
        });
    }

    // https://github.com/dropbox/dropbox-sdk-js/blob/main/examples/javascript/node/upload.js
    mongoDumpUploadOnDropbox(options, dumpResult) {
        return new Promise((resolve, reject) => {
            const path = options.getDropboxPath();
            const filename = dumpResult.fileName ? dumpResult.fileName : "mongodump.gz";
            const dbxFilename = path + "/" + filename;
            getDropbox(options)
                .then(dbx => {
                    fs.readFile(dumpResult.fullFileName, (readFileError, contents) => {
                        if (readFileError) {
                            return reject(readFileError);
                        }
                        MUST_LOG_DEBUG && console.log(`Dropbox upload ${dbxFilename}:`);
                        dbx.filesUpload({path: dbxFilename, contents})
                            .then(response => {
                                // DEBUG // console.log(response.result);
                                const {path_display, size} = response.result;
                                dumpResult.dropboxFile = path_display;
                                dumpResult.dropboxFileSize = size;
                                dumpResult.message = dumpResult.message + ` - uploaded on dropbox as ${dumpResult.dropboxFile} (${size} o)`;
                                resolve(dumpResult);
                            })
                            .catch(uploadErr => {
                                MUST_LOG_DEBUG && console.log('uploadErr', uploadErr)
                                reject(new Error(
                                    `Dropbox upload ${dbxFilename}: ${dropboxErrorResponseToSummary(uploadErr)}`
                                ));
                            });
                    });
                })
                .catch(err => reject(err));
        })
    }

    // https://github.com/dropbox/dropbox-sdk-js/blob/main/examples/javascript/node/download.js
    mongorestoreDownloadFromDropbox(options) {
        return new Promise((resolve, reject) => {
            const dbxFullFilename = options.dumpFile;
            const localPath = options.getDropboxLocalPath();
            const fileName = extractFilename(dbxFullFilename);
            const fullFileName = localPath + '/' + fileName;
            if (!dbxFullFilename.startsWith('/')) {
                return reject(new Error(`Dropbox dumpFile ${dbxFullFilename} must start with '/'. Note for Windows users: unalias node and set MSYS_NO_PATHCONV=1 may help.`))
            }
            // create path if not exist
            if (!fs.existsSync(localPath)) {
                fs.mkdirSync(localPath, {recursive: true});
            }
            getDropbox(options)
                .then(dbx => {
                    MUST_LOG_DEBUG && console.log(`Dropbox download ${dbxFullFilename}:`);
                    dbx.filesDownload({"path": dbxFullFilename})
                        .then(response => {
                            // DEBUG // console.log(response.result);
                            fs.writeFileSync(fullFileName, response.result.fileBinary);
                            resolve({
                                message: `dump downloaded into ${fullFileName}`,
                                fileName,
                                fullFileName
                            });
                        })
                        .catch(downloadErr => {
                            MUST_LOG_DEBUG && console.log('downloadErr', downloadErr)
                            reject(new Error(
                                `Dropbox download ${dbxFullFilename}: ${dropboxErrorResponseToSummary(downloadErr)}`
                            ));
                        });
                })
                .catch(err => reject(err));
        });
    }

    rotation(options, dryMode, ctimeMsMax, cleanCount, minCount) {
        const mt = this;
        return new Promise((resolve, reject) => {
            getDropbox(options)
                .then(dbx => {
                    const path = options.getDropboxPath();
                    MUST_LOG_DEBUG && console.log(`Dropbox list ${path}`);
                    dbx.filesListFolder({path})
                        .then(async response => {
                            const result = response.result;
                            // DEBUG // console.log(result);
                            if (result.has_more === true) {
                                return reject(new Error(`dropbox backup directory ${path} has more than 2000 files. Rotation has been skipped`));
                            }
                            const initialBackupsCount = result.length;
                            const deprecatedBackups = result.entries
                                .filter(e => e[".tag"] === "file")
                                .filter(e => new Date(e.client_modified) < new Date(ctimeMsMax))
                                .map(e => {
                                    const {name, path_lower, client_modified} = e;
                                    return {name, path_lower, client_modified};
                                });
                            const deprecatedBackupsCount = deprecatedBackups.length;
                            const deletedBackups = await mt.backupsToClean(dbx, dryMode, deprecatedBackups, cleanCount, minCount);
                            const cleanedCount = deletedBackups.length;
                            const cleanedFiles = deletedBackups.map(db => db.path_lower);
                            // DEBUG //  console.log('fileNames', fileNames)
                            return resolve({initialBackupsCount, deprecatedBackupsCount, cleanedCount, cleanedFiles});
                        })
                        .catch(filesListError => {
                            MUST_LOG_DEBUG && console.log('filesListError', filesListError)
                            reject(new Error(
                                `Dropbox list ${path}: ${dropboxErrorResponseToSummary(filesListError)}`
                            ));
                        });
                })
                .catch(err => reject(err));
        });
    }

    async backupsToClean(dbx, dryMode, deprecatedBackups, cleanCount, minCount) {
        if (deprecatedBackups === null || deprecatedBackups === undefined || deprecatedBackups.length <= minCount) {
            return [];
        }
        // sort by client_modified asc
        deprecatedBackups = deprecatedBackups.sort((a, b) => {
            return (a.client_modified > b.client_modified) - (a.client_modified < b.client_modified);// client_modified asc
        });
        MUST_LOG_DEBUG && console.log("dbx backupsToClean", {deprecatedBackups, cleanCount, minCount});
        // keep nb to clean
        const toDelete = deprecatedBackups.length > minCount ?
            deprecatedBackups.slice(minCount, Math.min(minCount + cleanCount, deprecatedBackups.length))
            : [];
        MUST_LOG_DEBUG && console.log("dbx toDelete", {toDelete});

        for (const toDeleteEntry of toDelete) {
            if (!dryMode) {
                await this.backupDelete(dbx, toDeleteEntry.path_lower)
                    .catch(error => {
                        return Promise.reject(error);
                    });
            } else {
                console.log("*dry mode* DELETE", toDeleteEntry.path_lower)
            }
        }
        return Promise.resolve(toDelete);
    }

    backupDelete(dbx, backupPath) {
        return new Promise((resolve, reject) => {
            dbx.filesDeleteV2({"path": backupPath})
                .then(() => resolve(backupPath))
                .catch(reject);
        });
    }
}

//~ private

function extractFilename(fullFileName) {
    return path.basename(fullFileName);
}

function getDropbox(options) {
    if (!options.isDropboxEnabled) {
        return Promise.reject(new Error("Dropbox is not enabled. Please update your environment."));
    }
    return new Promise((resolve, reject) => {
        const {
            dropboxToken,// keep legacy token
            dropboxRefreshToken, dropboxAppKey, dropboxAppSecret, // current way to proceed
            freshAccessToken // accessToken: set when already retrieved from current session
        } = options;
        if (MUST_LOG_DEBUG && isSet(freshAccessToken)) {
            console.log("we will reuse access-token")
        }
        const currentAccessToken = isSet(freshAccessToken) ? freshAccessToken : dropboxToken;
        isAccessTokenValid(currentAccessToken).then(result => {
            const {isValid, info} = result;
            if (isValid) {
                if (MUST_LOG_DEBUG) {
                    console.log(`use valid access-token from ${info?.email}`)
                }
                resolve(new Dropbox({"accessToken": currentAccessToken}));
            }
        }).catch(rejectResult => {
            const {isValid, error} = rejectResult;
            MUST_LOG_DEBUG && console.log(`isValid:${isValid} error:${error} - so dropboxRefreshAccessToken`);
            if (!isSet(dropboxRefreshToken) || !isSet(dropboxAppKey) || !isSet(dropboxAppSecret)) {
                reject(new Error("to refresh a dropbox access token, following options are required: dropboxRefreshToken, dropboxAppKey, dropboxAppSecret"));
                return;
            }
            refreshAccessToken(dropboxRefreshToken, dropboxAppKey, dropboxAppSecret)
                .then(freshAccessToken => {
                    options.freshAccessToken = freshAccessToken;
                    resolve(new Dropbox({"accessToken": freshAccessToken}))
                })
                .catch(err => reject(err))
        });
    })
}

function isPathNotFoundError(filesListError) {
    const {status, error} = filesListError;
    return (status === 409 && error?.error_summary?.includes("not_found"));
}

function dropboxErrorResponseToSummary(dropboxResponseError) {
    const {status, error} = dropboxResponseError
    const error_summary = error?.error_summary || error;
    return `[status:${status}] ${error_summary}`;
}