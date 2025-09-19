import MongoTools from "../lib/MongoTools.js";
import MTOptions from "../lib/MTOptions.js";
import {before, describe, it, expect} from './testLib.js';
import fs from 'fs';
import {countDocumentsInCollection, createDatabaseWithNDocs, dropDatabase} from "./tests-utils.js";

/**
 * TEST Requirements - Environment
 * cp env/initEnv.template.sh env/initEnv.dontpush.sh
 * edit env/initEnv.dontpush.sh
 * source env/initEnv.dontpush.sh
 * Note that testDbName is enforced to 'node-mongotools-test' to avoid conflict or remove of legacy data
 * testDbName MUST be used by ALL tests that need db name.
 * so don't mix your legacy data with testBackupDirectory and testDropboxBackupDirectory
 */
const testDbName = 'node-mongotools-test';// WARNING - don't change this to avoid incident.
const testBackupDirectory = 'tests/backup';
const testBackupSubDirectory = 'tests/backup/subdirectory';
const testDropboxBackupDirectory = 'tests/dropbox';

const testDbUsername = process.env.MT_MONGO_USER || null;
const testDbPassword = process.env.MT_MONGO_PWD || null;
const testDbAuth = testDbUsername !== null && testDbPassword != null ? `${testDbUsername}:${testDbPassword}@` : '';
const testDbAuthSuffix = testDbUsername !== null && testDbPassword != null ? '?authSource=admin' : '';
const testPort = process.env.MT_MONGO_PORT || 27017;
const testDbToken = process.env.MT_DROPBOX_TOKEN || null;
const testDbAppKey = process.env.MT_DROPBOX_APP_KEY || null;
const testDbUri = `mongodb://${testDbAuth}127.0.0.1:${testPort}/${testDbName}${testDbAuthSuffix}`;

let mt = null;
let mtOptions = null;
let lastDumpFile = null;
let nbBackupExpected = 0;

const LOCAL_NB_DOC = 5;
const DBX_NB_DOC = 3;

function logOutput(result) {
    if (result.stdout) {
        console.info('stdout:', result.stdout);
    }
    if (result.stderr) {
        console.error('stderr:', result.stderr);
    }
}

function logSuccess(success) {
    logOutput(success);
    if (success.message) {
        console.info(`OK ${success.message}`);
        return;
    }
    console.info(`OK ${JSON.stringify(success, null, 4)}`);
}

describe("🧪🧩 Mongo Tools", function () {

    before(async () => {
        console.info("Mongo Tools :: before");
        await dropDatabase(testDbUri, `local:${testPort} db:${testDbName}`);
        await createDatabaseWithNDocs(testDbUri, `local:${testPort} db:${testDbName}`, LOCAL_NB_DOC);

        fs.rmSync(testBackupDirectory, {recursive: true, force: true});
        fs.mkdirSync(testBackupDirectory, {recursive: true})
        nbBackupExpected = 0;
        mt = new MongoTools();
        mtOptions = new MTOptions({
            db: testDbName,
            port: testPort,
            path: testBackupDirectory,
            fileName: 'should_dump_db_locally.gz',
            dropboxToken: null,
            dropboxAppKey: null,
            showCommand: true
        });
        // DEBUG // console.log("MTOptions", mtOptions);
    });

    it("🧪 should list backups for an unknown directory return []", done => {
        mt.list(new MTOptions({
            uri: testDbUri,
            path: testBackupSubDirectory,
            dropboxToken: null,
            showCommand: true
        }))
            .then(listResult => {
                logSuccess(listResult);
                expect(listResult.filesystem).to.be.empty;
                expect(listResult.path).to.be.eql(testBackupSubDirectory);
                done();
            })
            .catch(_expectNoError);
    });

    it("🧪 should not dump with invalid parameter", done => {
        mtOptions.numParallelCollections = "Error because I'm not an integer ^^";
        mt.mongodump(mtOptions)
            .then(result => expect.fail("expect error but got", result))
            .catch(err => {
                expect(err.message).to.be.eql('"numParallelCollections" option must be an integer.');
                mtOptions.numParallelCollections = undefined;
                done();
            });

    });

    it("🧪 should dump database locally", done => {
        mt.mongodump(mtOptions)
            .then(dumpResult => {
                logSuccess(dumpResult);
                dumpResult.fileName.should.not.be.eql(null);
                dumpResult.fullFileName.should.not.be.eql(null);
                lastDumpFile = dumpResult.fullFileName;
                nbBackupExpected++;
                done();
            })
            .catch(_expectNoError);
    });

    it("🧪 should dump database from uri", done => {
        mt.mongodump(new MTOptions({
            uri: testDbUri,
            path: testBackupDirectory,
            dropboxToken: null,
            showCommand: true
        }))
            .then(dumpResult => {
                logSuccess(dumpResult);
                dumpResult.fileName.should.not.be.eql(null);
                dumpResult.fullFileName.should.not.be.eql(null);
                dumpResult.fullFileName.should.startsWith('tests/backup/node-mongotools-test__2');
                lastDumpFile = dumpResult.fullFileName;
                nbBackupExpected++;
                done();
            })
            .catch(_expectNoError);
    });

    it("🧪 should restore database", done => {
        dropDatabase(testDbUri, `local:${testPort} db:${testDbName}`)
            .then(() => {
                mtOptions.dumpFile = lastDumpFile;
                mt.mongorestore(mtOptions)
                    .then(restoreResult => {
                        logSuccess(restoreResult);
                        restoreResult.dumpFile.should.be.eql(lastDumpFile);
                        restoreResult.status.should.be.eql(0);
                        countDocumentsInCollection(testDbUri)
                            .then(docCount => {
                                expect(docCount).to.be.eql(LOCAL_NB_DOC);
                                done();
                            })
                            .catch(_expectNoError)
                    })
                    .catch(_expectNoError);
            })
            .catch(_expectNoError);
    });

    it("🧪 should list backups", done => {
        mt.list(mtOptions)
            .then(listResult => {
                logSuccess(listResult);
                expect(listResult.filesystem).to.have.lengthOf(nbBackupExpected + 1);
                expect(listResult.filesystem).to.include(lastDumpFile)
                expect(listResult.filesystem).to.include(testBackupSubDirectory)
                listResult.path.should.be.eql(testBackupDirectory);
                done();
            })
            .catch(_expectNoError);
    });

    it("🧪 should list backups from unexisting dir", done => {
        // given removed target subDirectory
        if (fs.existsSync(testBackupSubDirectory)) {
            fs.rmdirSync(testBackupSubDirectory, {recursive: true});
        }

        mt = new MongoTools();
        mtOptions = new MTOptions({
            db: testDbName,
            port: testPort,
            path: testBackupSubDirectory,// given path doesn't exist
            fileName: 'should_dump_db_locally.gz',
            dropboxToken: null,
            dropboxAppKey: null,
            showCommand: true
        });

        mt.list(mtOptions)
            .then(listResult => {
                logSuccess(listResult);
                expect(listResult.filesystem).to.be.empty;
                expect(listResult.path).to.be.eql(testBackupSubDirectory);
                done();
            })
            .catch(_expectNoError);

        fs.rmdirSync(testBackupSubDirectory, {recursive: true});
    });

    it("🧪 should dry rotate backups", done => {
        mt.rotation({
            path: testBackupDirectory,
            dropboxToken: null,
            rotationWindowsDays: 0,
            rotationMinCount: 0,
            rotationDryMode: true
        })
            .then(rotateResult => {
                logSuccess(rotateResult);
                rotateResult.filesystem.initialBackupsCount.should.be.eql(nbBackupExpected);
                rotateResult.filesystem.deprecatedBackupsCount.should.be.eql(nbBackupExpected);
                rotateResult.filesystem.cleanedCount.should.be.eql(nbBackupExpected);
                done();
            })
            .catch(_expectNoError);
    });

    it("🧪 should rotate backups", done => {
        mt.rotation({
            path: testBackupDirectory,
            dropboxToken: null,
            rotationWindowsDays: 0,
            rotationMinCount: 0
        })
            .then(rotateResult => {
                logSuccess(rotateResult);
                rotateResult.filesystem.initialBackupsCount.should.be.eql(nbBackupExpected);
                rotateResult.filesystem.deprecatedBackupsCount.should.be.eql(nbBackupExpected);
                rotateResult.filesystem.cleanedCount.should.be.eql(nbBackupExpected);
                nbBackupExpected = 0;
                done();
            })
            .catch(_expectNoError);

    });

    it("🧪 should rotate no backups", done => {
        mt.rotation({
            path: testBackupDirectory,
            dropboxToken: null,
            rotationWindowsDays: 0,
            rotationMinCount: 0,
            rotationDryMode: true
        })
            .then(rotateResult => {
                logSuccess(rotateResult);
                rotateResult.filesystem.initialBackupsCount.should.be.eql(0);
                rotateResult.filesystem.deprecatedBackupsCount.should.be.eql(0);
                rotateResult.filesystem.cleanedCount.should.be.eql(0);
                done();
            })
            .catch(_expectNoError);
    });

});

if (testDbToken !== null || testDbAppKey != null) {
    let nbDropBoxBackup = 0;
    let withDropboxMtTestOptions = null;
    describe("🧪🧩 Mongo Tools with Dropbox", function () {

        before(async () => {
            console.info("Mongo Tools  with Dropbox :: before");
            await dropDatabase(testDbUri, `local:${testPort} db:${testDbName}`);
            await createDatabaseWithNDocs(testDbUri, `local:${testPort} db:${testDbName}`, DBX_NB_DOC);
            withDropboxMtTestOptions = new MTOptions({
                db: testDbName,
                port: testPort,
                path: testBackupDirectory,
                dropboxLocalPath: testDropboxBackupDirectory,
                fileName: 'should_dump_db_dropbox.gz',
                showCommand: true
            });
        })

        // ℹ️ for now there is no remote cleanup so no way to test list of unexisting remote backup dir

        it("🧪 should dump database on dropbox", done => {
            mt.mongodump(withDropboxMtTestOptions)
                .then(dumpResult => {
                    logSuccess(dumpResult);
                    dumpResult.fileName.should.not.be.eql(null);
                    dumpResult.fullFileName.should.not.be.eql(null);
                    lastDumpFile = dumpResult.fullFileName;
                    nbDropBoxBackup++;
                    done();
                })
                .catch(_expectNoError);
        });

        it("🧪 should list include dropbox backups", done => {
            mt.list(withDropboxMtTestOptions)
                .then(listResult => {
                    logSuccess(listResult);
                    expect(listResult.filesystem).to.have.lengthOf(nbBackupExpected + nbDropBoxBackup);
                    expect(listResult.dropbox).to.have.lengthOf(nbDropBoxBackup);
                    expect(listResult.dropbox).to.include("/" + lastDumpFile);
                    expect(listResult.filesystem).to.include(lastDumpFile);
                    listResult.path.should.be.eql(testBackupDirectory);
                    done();
                })
                .catch(_expectNoError);
        });

        it("🧪 should restore database from dropbox", done => {
            dropDatabase(testDbUri, `local:${testPort} db:${testDbName}`)
                .then(() => {
                    withDropboxMtTestOptions.dumpFile = "/" + lastDumpFile;
                    mt.mongorestore(withDropboxMtTestOptions)
                        .then(restoreResult => {
                            logSuccess(restoreResult);
                            restoreResult.dumpFile.should.be.eql(withDropboxMtTestOptions.dropboxLocalPath + '/' + withDropboxMtTestOptions.fileName);
                            restoreResult.status.should.be.eql(0);
                            countDocumentsInCollection(testDbUri)
                                .then(docCount => {
                                    expect(docCount).to.be.eql(DBX_NB_DOC);
                                    done();
                                })
                                .catch(_expectNoError)
                        })
                        .catch(_expectNoError);
                })
                .catch(_expectNoError);
        });

        it("🧪 should rotation remove dropbox backup too", done => {
            mt.rotation({
                path: testBackupDirectory,
                rotationWindowsDays: 0,
                rotationMinCount: 0,
            })
                .then(rotateResult => {
                    logSuccess(rotateResult);

                    rotateResult.filesystem.initialBackupsCount.should.be.eql(nbBackupExpected + nbDropBoxBackup);
                    rotateResult.filesystem.deprecatedBackupsCount.should.be.eql(nbBackupExpected + nbDropBoxBackup);
                    rotateResult.filesystem.cleanedCount.should.be.eql(nbBackupExpected + nbDropBoxBackup);

                    rotateResult.dropbox.deprecatedBackupsCount.should.be.eql(nbDropBoxBackup);
                    rotateResult.dropbox.cleanedCount.should.be.eql(nbDropBoxBackup);
                    expect(rotateResult.dropbox.cleanedFiles).to.include("/" + lastDumpFile);

                    nbDropBoxBackup = 0;
                    nbBackupExpected = 0;
                    done();
                })
                .catch(_expectNoError);

        });
    });
}

function _expectNoError(err) {
    console.trace(err)
    expect.fail(err);
}
