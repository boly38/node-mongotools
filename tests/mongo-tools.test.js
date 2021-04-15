const MongoTools = require("../lib/MongoTools")
const MTOptions = require("../lib/MTOptions")
const fs = require('fs');

const chai = require('chai');
const assert = require('assert').strict;
const expect = chai.expect
chai.should();

const testBackupDirectory = 'tests/backup';
var mt = null;
var mtOptions = null;
var lastDumpFile = null;

function logOutput(result) {
  if (result.stdout) { console.info('stdout:', result.stdout); }
  if (result.stderr) { console.error('stderr:', result.stderr); }
}
function logSuccess(success) {
  logOutput(success);
  console.info(`OK ${success.message}`);
}

describe("Mongo Tools", function() {

    before(async function () {
      console.info("Mongo Tools :: before");
      fs.rmdirSync(testBackupDirectory, { recursive: true });
      mt = new MongoTools();
      mtOptions = new MTOptions({
        db: 'myDbForTest',
        port: process.env.MT_MONGO_PORT || 27017,
        path: testBackupDirectory,
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
    });

    it("should restore database", async function() {
      mtOptions.dumpFile = lastDumpFile;
      const restoreResult = await mt.mongorestore(mtOptions).catch(_expectNoError);
      logSuccess(restoreResult);
      restoreResult.dumpFile.should.be.eql(lastDumpFile);
      restoreResult.status.should.be.eql(0);
    });

});


function _expectNoError(err) {
  console.trace(err)
  expect.fail(err);
}
