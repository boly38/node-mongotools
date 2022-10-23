import MongoTools from "../lib/MongoTools.js";
import MTOptions from "../lib/MTOptions.js";
import fs from 'fs';

import chai from 'chai';
import chaiString from 'chai-string';
const should = chai.should;
const expect = chai.expect;
import { strict as assert } from 'assert';
chai.should();
chai.use(chaiString);

const testDbUsername = process.env.MT_MONGO_USER || null;
const testDbPassword = process.env.MT_MONGO_PWD || null;
const testDbAuth = testDbUsername !== null && testDbPassword != null ? `${testDbUsername}:${testDbPassword}@` : '';
const testDbAuthSuffix = testDbUsername !== null && testDbPassword != null ? '?authSource=admin' : '';
const testPort = process.env.MT_MONGO_PORT || 27017;
const testDbToken = process.env.MT_DROPBOX_TOKEN || null;

const testBackupDirectory = 'tests/backup';
const testDbName = 'myDbForTest';
const testDbUri = `mongodb://${testDbAuth}127.0.0.1:${testPort}/${testDbName}${testDbAuthSuffix}`;

var mt = null;
var mtOptions = null;
var lastDumpFile = null;
var nbBackupExpected = 0;

function logOutput(result) {
  if (result.stdout) { console.info('stdout:', result.stdout); }
  if (result.stderr) { console.error('stderr:', result.stderr); }
}
function logSuccess(success) {
  logOutput(success);
  if (success.message) {
    console.info(`OK ${success.message}`);
    return;
  }
  console.info(`OK ${JSON.stringify(success, null, 4)}`);
}

describe("Mongo Tools", function() {

    before(async function () {
      console.info("Mongo Tools :: before");
      fs.rmSync(testBackupDirectory, { recursive: true, force: true });
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

      console.log("MTOptions", mtOptions);
    });

    it("should dump database locally", async function() {
      const dumpResult = await mt.mongodump(mtOptions).catch(_expectNoError);
      logSuccess(dumpResult);
      dumpResult.fileName.should.not.be.eql(null);
      dumpResult.fullFileName.should.not.be.eql(null);
      lastDumpFile = dumpResult.fullFileName;
      nbBackupExpected++;
    });

    if (testDbToken !== null) {
        it("should dump database on dropbox", async function() {
          const dumpResult = await mt.mongodump(new MTOptions({
                                                        db: testDbName,
                                                        port: testPort,
                                                        path: testBackupDirectory,
                                                        fileName: 'should_dump_db_dropbox.gz',
                                                        showCommand: true
                                                      })).catch(_expectNoError);
          logSuccess(dumpResult);
          dumpResult.fileName.should.not.be.eql(null);
          dumpResult.fullFileName.should.not.be.eql(null);
          lastDumpFile = dumpResult.fullFileName;
          nbBackupExpected++;
        });
    }

    it("should dump database from uri", async function() {
      const dumpResult = await mt.mongodump(new MTOptions({
                                                    uri: testDbUri,
                                                    path: testBackupDirectory,
                                                    dropboxToken: null,
                                                    showCommand: true
                                                  })).catch(_expectNoError);
      logSuccess(dumpResult);
      dumpResult.fileName.should.not.be.eql(null);
      dumpResult.fullFileName.should.not.be.eql(null);
      dumpResult.fullFileName.should.startWith('tests/backup/myDbForTest__2');
      lastDumpFile = dumpResult.fullFileName;
      nbBackupExpected++;
    });

    it("should restore database", async function() {
      mtOptions.dumpFile = lastDumpFile;
      const restoreResult = await mt.mongorestore(mtOptions).catch(_expectNoError);
      logSuccess(restoreResult);
      restoreResult.dumpFile.should.be.eql(lastDumpFile);
      restoreResult.status.should.be.eql(0);
    });

    it("should list backup", async function() {
      const listResult = await mt.list(mtOptions).catch(_expectNoError);
      logSuccess(listResult);
      expect(listResult.filesystem).to.have.lengthOf(nbBackupExpected);
      expect(listResult.filesystem).to.include(lastDumpFile)
      listResult.path.should.be.eql(testBackupDirectory);
    });

    it("should dry rotate backups", async function() {
      const rotateResult = await mt.rotation({
        path: testBackupDirectory,
        dropboxToken: null,
        rotationWindowsDays: 0,
        rotationMinCount:0,
        rotationDryMode: true
      }).catch(_expectNoError);
      logSuccess(rotateResult);
      rotateResult.filesystem.initialBackupsCount.should.be.eql(nbBackupExpected);
      rotateResult.filesystem.deprecatedBackupsCount.should.be.eql(nbBackupExpected);
      rotateResult.filesystem.cleanedCount.should.be.eql(nbBackupExpected);
    });

    it("should rotate backups", async function() {
      const rotateResult = await mt.rotation({
        path: testBackupDirectory,
        dropboxToken: null,
        rotationWindowsDays: 0,
        rotationMinCount:0
      }).catch(_expectNoError);
      logSuccess(rotateResult);
      rotateResult.filesystem.initialBackupsCount.should.be.eql(nbBackupExpected);
      rotateResult.filesystem.deprecatedBackupsCount.should.be.eql(nbBackupExpected);
      rotateResult.filesystem.cleanedCount.should.be.eql(nbBackupExpected);
    });

    it("should rotate no backups", async function() {
      const rotateResult = await mt.rotation({
        path: testBackupDirectory,
        dropboxToken: null,
        rotationWindowsDays: 0,
        rotationMinCount:0,
        rotationDryMode: true
      }).catch(_expectNoError);
      logSuccess(rotateResult);
      rotateResult.filesystem.initialBackupsCount.should.be.eql(0);
      rotateResult.filesystem.deprecatedBackupsCount.should.be.eql(0);
      rotateResult.filesystem.cleanedCount.should.be.eql(0);
    });
});


function _expectNoError(err) {
  console.trace(err)
  expect.fail(err);
}
