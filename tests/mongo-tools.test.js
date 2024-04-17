import MongoTools from "../lib/MongoTools.js";
import MTOptions from "../lib/MTOptions.js";
import {before, describe, it, expect} from './testLib.js';
import fs from 'fs';

const testDbUsername = process.env.MT_MONGO_USER || null;
const testDbPassword = process.env.MT_MONGO_PWD || null;
const testDbAuth = testDbUsername !== null && testDbPassword != null ? `${testDbUsername}:${testDbPassword}@` : '';
const testDbAuthSuffix = testDbUsername !== null && testDbPassword != null ? '?authSource=admin' : '';
const testPort = process.env.MT_MONGO_PORT || 27017;
const testDbToken = process.env.MT_DROPBOX_TOKEN || null;

const testBackupDirectory = 'tests/backup';
const testDropboxBackupDirectory = 'tests/dropbox';
const testDbName = 'myDbForTest';
const testDbUri = `mongodb://${testDbAuth}127.0.0.1:${testPort}/${testDbName}${testDbAuthSuffix}`;

let mt = null;
let mtOptions = null;
let lastDumpFile = null;
let nbBackupExpected = 0;

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

describe("Mongo Tools", function () {

    before(() => {
        console.info("Mongo Tools :: before");
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
            showCommand: true
        });
        // DEBUG // console.log("MTOptions", mtOptions);
    });

    it("should not dump with invalid parameter", done => {
        mtOptions.numParallelCollections = "Error because I'm not an integer ^^";
        mt.mongodump(mtOptions)
            .then(result => expect.fail("expect error but got", result))
            .catch(err => {
                expect(err.message).to.be.eql('"numParallelCollections" option must be an integer.');
                mtOptions.numParallelCollections = undefined;
                done();
            });

    });

    it("should dump database locally", done => {
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

    it("should dump database from uri", done => {
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
                dumpResult.fullFileName.should.startsWith('tests/backup/myDbForTest__2');
                lastDumpFile = dumpResult.fullFileName;
                nbBackupExpected++;
                done();
            })
            .catch(_expectNoError);
    });

    it("should restore database", done => {
        mtOptions.dumpFile = lastDumpFile;
        mt.mongorestore(mtOptions)
            .then(restoreResult => {
                logSuccess(restoreResult);
                restoreResult.dumpFile.should.be.eql(lastDumpFile);
                restoreResult.status.should.be.eql(0);
                done();
            })
            .catch(_expectNoError);
    });

    it("should list backup", done => {
        mt.list(mtOptions)
            .then(listResult => {
                logSuccess(listResult);
                expect(listResult.filesystem).to.have.lengthOf(nbBackupExpected);
                expect(listResult.filesystem).to.include(lastDumpFile)
                listResult.path.should.be.eql(testBackupDirectory);
                done();
            })
            .catch(_expectNoError);
    });

    it("should dry rotate backups", done => {
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

    it("should rotate backups", done => {
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

    it("should rotate no backups", done => {
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

if (testDbToken !== null) {
    let nbDropBoxBackup = 0;
    let withDropboxMtTestOptions = null;
    describe("Mongo Tools with Dropbox", function () {

        before(() => {
            console.info("Mongo Tools  with Dropbox :: before");
            withDropboxMtTestOptions = new MTOptions({
                db: testDbName,
                port: testPort,
                path: testBackupDirectory,
                dropboxLocalPath: testDropboxBackupDirectory,
                fileName: 'should_dump_db_dropbox.gz',
                showCommand: true
            });
        })

        it("should dump database on dropbox", done => {
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

        it("should list include dropbox backup", done => {
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

        it("should restore database from dropbox", done => {
            withDropboxMtTestOptions.dumpFile = "/" + lastDumpFile;
            mt.mongorestore(withDropboxMtTestOptions)
                .then(restoreResult => {
                    logSuccess(restoreResult);
                    restoreResult.dumpFile.should.be.eql(withDropboxMtTestOptions.dropboxLocalPath + '/' + withDropboxMtTestOptions.fileName);
                    restoreResult.status.should.be.eql(0);
                    done();
                })
                .catch(_expectNoError);
        });

        it("should rotation remove dropbox backup too", done => {
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
