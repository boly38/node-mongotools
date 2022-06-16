const MTWrapper = require("../lib/MTWrapper");
const MTOptions = require("../lib/MTOptions");

const chai = require('chai');
const assert = require('assert').strict;
const expect = chai.expect
chai.should();
chai.use(require('chai-string'));

const testDbUsername = process.env.MT_MONGO_USER || null;
const testDbPassword = process.env.MT_MONGO_PWD || null;
const testDbAuth = testDbUsername !== null && testDbPassword != null ? `${testDbUsername}:${testDbPassword}@` : '';
const testDbAuthSuffix = testDbUsername !== null && testDbPassword != null ? '?authSource=admin' : '';
const testFixedPort = 17017;
const testDbToken = process.env.MT_DROPBOX_TOKEN || null;

const testBackupDirectory = 'tests/backup';
const testDbName = 'myDbForTest';
const testDbUri = `mongodb://${testDbAuth}127.0.0.1:${testFixedPort}/${testDbName}${testDbAuthSuffix}`;

var wrapper = new MTWrapper();

describe("MTWrapper unit tests", function() {

    it("should wrap dump commandConnectFromOptions db user basic", async function() {
      const mtOptions = new MTOptions({
        db: testDbName,
        port: testFixedPort,
        path: testBackupDirectory
      });

      var command = wrapper.commandConnectFromOptions(mtOptions, '--beginning');

      command.should.be.eql("--beginning --host 127.0.0.1 --port 17017 --username root --password mypass --authenticationDatabase admin --db myDbForTest");
    });

    it("should wrap dump commandConnectFromOptions uri ssl", async function() {
      const mtOptions = new MTOptions({
        uri: testDbUri,
        ssl: "1",
        sslCAFile: "/tmp/myCAfile",
        sslPEMKeyFile: "/tmp/pem/sslPEMKeyFile",
        sslCRLFile: "/tmp/pem/sslCRLFile",
        sslPEMKeyPassword: "strongPassHere",
        sslFIPSMode: "1",
        tlsInsecure: "1"
      });

      var command = wrapper.commandConnectFromOptions(mtOptions, '--beginning');

      command.should.be.eql("--beginning --uri mongodb://root:mypass@127.0.0.1:17017/myDbForTest?authSource=admin "
      +"--ssl --sslCAFile /tmp/myCAfile --sslPEMKeyFile /tmp/pem/sslPEMKeyFile --sslPEMKeyPassword strongPassHere "
      +"--sslCRLFile /tmp/pem/sslCRLFile --sslFIPSMode --tlsInsecure");
    });

    it("should wrap restore commandConnectFromOptions db user basic", async function() {
      const mtOptions = new MTOptions({
        db: testDbName,
        port: testFixedPort,
        path: testBackupDirectory
      });

      var command = wrapper.commandConnectFromOptions(mtOptions, '--beginning', true);

      command.should.be.eql("--beginning --host 127.0.0.1 --port 17017 --username root --password mypass --authenticationDatabase admin --nsInclude myDbForTest");
    });

    it("should wrap restore commandConnectFromOptions uri ssl", async function() {
      const mtOptions = new MTOptions({
        uri: testDbUri,
        ssl: "1",
        sslCAFile: "/tmp/myCAfile",
        sslPEMKeyFile: "/tmp/pem/sslPEMKeyFile",
        sslCRLFile: "/tmp/pem/sslCRLFile",
        sslPEMKeyPassword: "strongPassHere",
        sslFIPSMode: "1",
        tlsInsecure: "1"
      });

      var command = wrapper.commandConnectFromOptions(mtOptions, '--beginning', true);

      command.should.be.eql("--beginning --uri mongodb://root:mypass@127.0.0.1:17017/myDbForTest?authSource=admin "
      +"--ssl --sslCAFile /tmp/myCAfile --sslPEMKeyFile /tmp/pem/sslPEMKeyFile --sslPEMKeyPassword strongPassHere "
      +"--sslCRLFile /tmp/pem/sslCRLFile --sslFIPSMode --tlsInsecure");
    });

});
