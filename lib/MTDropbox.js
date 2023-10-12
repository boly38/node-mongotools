import fs from 'fs';
import path from "path";
import {Dropbox} from 'dropbox'; // https://www.npmjs.com/package/dropbox

export default class MTDropbox {
    // https://github.com/dropbox/dropbox-sdk-js/blob/main/examples/javascript/node/basic.js
    listFromDropbox(options) {
        const dbx = getDropbox(options);
        const path = options.getDropboxPath();
        return new Promise((resolve, reject) => {
            // DEBUG // console.log(`Dropbox filesListFolder ${path}:`);
            dbx.filesListFolder({path})
                .then(response => {
                    const fileNames = response.result.entries
                        .filter(e => e[".tag"] === "file")
                        .map(e => e.path_lower);
                    resolve(fileNames);
                })
                .catch(filesListError => {
                    return reject(filesListError);
                });
        });
    }

    // https://github.com/dropbox/dropbox-sdk-js/blob/main/examples/javascript/node/upload.js
    mongoDumpUploadOnDropbox(options, dumpResult) {
        const dbx = getDropbox(options);
        const path = options.getDropboxPath();
        const filename = dumpResult.fileName ? dumpResult.fileName : "mongodump.gz";
        const dbxFilename = path + "/" + filename;
        return new Promise((resolve, reject) => {
            fs.readFile(dumpResult.fullFileName, (readFileError, contents) => {
                if (readFileError) {
                    return reject(readFileError);
                }
                dbx.filesUpload({path: dbxFilename, contents})
                    .then(response => {
                        const result = response.result;
                        // DEBUG // console.log(result);
                        dumpResult.dropboxFile = result.path_display;
                        dumpResult.dropboxFileSize = result.size;
                        dumpResult.message = dumpResult.message + ` - uploaded on dropbox as ${dumpResult.dropboxFile}`;
                        resolve(dumpResult);
                    })
                    .catch(uploadErr => {
                        return reject(uploadErr);
                    });
            });
        })
    }

    // https://github.com/dropbox/dropbox-sdk-js/blob/main/examples/javascript/node/download.js
    async mongorestoreDownloadFromDropbox(options) {
        const dbx = getDropbox(options);
        const dbxFullFilename = options.dumpFile;
        const localPath = options.getDropboxLocalPath();
        const fileName = extractFilename(dbxFullFilename);
        const fullFileName = localPath + '/' + fileName;
        if (!dbxFullFilename.startsWith('/')) {
            return Promise.reject(new Error(`Dropbox dumpFile ${dbxFullFilename} must start with '/'. Note for Windows users: unalias node and set MSYS_NO_PATHCONV=1 may help.`))
        }
        // create path if not exist
        if (!fs.existsSync(localPath)) {
            await fs.promises.mkdir(localPath, {recursive: true})
                .catch(err => {
                    return Promise.reject(new Error(`path: cannot create ${localPath} : ${err} `));
                });
        }
        return new Promise((resolve, reject) => {
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
                .catch(uploadErr => {
                    return reject(uploadErr);
                });
        });
    }

    rotation(options, dryMode, ctimeMsMax, cleanCount, minCount) {
        const dbx = getDropbox(options);
        const path = options.getDropboxPath();
        const mt = this;
        return new Promise((resolve, reject) => {
            dbx.filesListFolder({path})
                .then(async response => {
                    const result = response.result;
                    // DEBUG // console.log(result); console.log(response.headers);
                    if (result.has_more === true) {
                        return reject(new Error(`dropbox backup directory ${path} has more than 2000 files. Rotation has been skipped`));
                    }
                    const initialBackupsCount = result.length;
                    const deprecatedBackups = result.entries
                        .filter(e => e[".tag"] === "file")
                        .filter(e => new Date(e.client_modified) < new Date(ctimeMsMax))
                        .map(e => {
                            return {
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
                })
                .catch(filesListError => {
                    return reject(filesListError);
                });
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
        // DEBUG // console.log("dbx backupsToClean", {deprecatedBackups, cleanCount, minCount});
        // keep nb to clean
        const toDelete = deprecatedBackups.length > minCount ?
            deprecatedBackups.slice(minCount, Math.min(minCount + cleanCount, deprecatedBackups.length))
            : [];
        // DEBUG // console.log("toDelete", {toDelete});

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
    if (!options.dropboxEnabled) {
        return null;
    }
    return new Dropbox({accessToken: options.dropboxToken});
}
