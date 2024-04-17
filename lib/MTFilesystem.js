import fs from 'fs';
import path from "path";

const fsPromise = fs.promises;

class MTFilesystem {

    listFromFilesystem(path) {
        return new Promise((resolve, reject) => {
            if (!fs.existsSync(path)) {
                return reject(new Error(`no dump path ${path}`));
            }
            fs.readdir(path, (err, files) => {
                if (err) {
                    return reject(err);
                }
                return resolve(files.map(f => path + '/' + f));
            });
        });
    }

    fileSystemRotation(dryMode, path, ctimeMsMax, cleanCount, minCount) {
        const mt = this;
        return new Promise((resolve, reject) => {
            if (!fs.existsSync(path)) {
                return reject(new Error(`no dump path ${path}`));
            }
            mt.walk(path)
                .then(existingBackupsWithStats => {
                    const initialBackupsCount = existingBackupsWithStats.length;
                    const deprecatedBackups = mt.filterByDate(existingBackupsWithStats, ctimeMsMax);
                    const deprecatedBackupsCount = deprecatedBackups.length;
                    mt.backupsToClean(dryMode, deprecatedBackups, cleanCount, minCount)
                        .then(deletedBackups => {
                            const cleanedCount = deletedBackups.length;
                            const cleanedFiles = deletedBackups.map(db => db.filePath);
                            // DEBUG // console.log(JSON.stringify({deletedBackups}))
                            resolve({initialBackupsCount, deprecatedBackupsCount, cleanedCount, cleanedFiles});
                        });
                })
                .catch(err => reject(err));

        });
    }

    async backupsToClean(dryMode, deprecatedBackups, cleanCount, minCount) {
        if (deprecatedBackups === null || deprecatedBackups === undefined || deprecatedBackups.length <= minCount) {
            return [];
        }
        // sort by creation date asc
        deprecatedBackups = deprecatedBackups.sort((a, b) => {
            return (a.stats.ctimeMs > b.stats.ctimeMs) - (a.stats.ctimeMs < b.stats.ctimeMs);// ctimeMs asc
        });
        // DEBUG // console.log("fs backupsToClean", {deprecatedBackups, cleanCount, minCount});
        // keep nb to clean
        var toDelete = deprecatedBackups.length > minCount ?
            deprecatedBackups.slice(minCount, Math.min(minCount + cleanCount, deprecatedBackups.length))
            : [];
        // DEBUG // console.log("toDelete", {toDelete});
        for (const toDeleteEntry of toDelete) {
            if (!dryMode) {
                await fsPromise.unlink(toDeleteEntry.filePath);
            } else {
                console.log("*dry mode* DELETE", toDeleteEntry.filePath);
            }
        }
        return toDelete;
    }

    filterByDate(filesWithStat, ctimeMsMax) {
        if (filesWithStat === null || filesWithStat === undefined || filesWithStat.length < 1) {
            return filesWithStat;
        }
        if (ctimeMsMax === null || ctimeMsMax === undefined) {
            return filesWithStat;
        }
        return filesWithStat.filter(fws => fws.stats.ctimeMs < ctimeMsMax);
    }

    // https://nodejs.org/api/fs.html#fs_dir_read_callback
    // https://stackoverflow.com/questions/2727167/how-do-you-get-a-list-of-the-names-of-all-files-present-in-a-directory-in-node-j
    walk(dir) {
        return new Promise((resolve, reject) => {
            fsPromise.readdir(dir).then(readFiles => {
                Promise.all(readFiles.map(async file => {
                    const filePath = path.join(dir, file);
                    const stats = await fsPromise.stat(filePath);
                    if (stats.isFile()) return {filePath, stats};
                    return null;
                })).then(files => {
                    const allEntries = files.reduce((all, folderContents) => all.concat(folderContents), [])
                    resolve(allEntries.filter(e => e !== null));
                }).catch(err => reject(err));
            }).catch(err => reject(err));
        });
    }

}

export default MTFilesystem;