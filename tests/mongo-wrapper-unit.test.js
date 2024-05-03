import MTOptions from "../lib/MTOptions.js";
import MTWrapper from "../lib/MTWrapper.js";

import {describe, it} from "node:test";

const testDbUsername = process.env.MT_MONGO_USER || null;
const testDbPassword = process.env.MT_MONGO_PWD || null;
const testDbAuth = testDbUsername !== null && testDbPassword != null ? `${testDbUsername}:${testDbPassword}@` : '';
const testDbAuthSuffix = testDbUsername !== null && testDbPassword != null ? '?authSource=admin' : '';
const testFixedPort = 17017;

const testBackupDirectory = 'tests/backup';
const testDbName = 'myDbForTest';
const testSourceDbName = 'mySourceDbForTest';
const testTargetDbName = 'myTargetDbForTest';
const testDbUri = `mongodb://${testDbAuth}127.0.0.1:${testFixedPort}/${testDbName}${testDbAuthSuffix}`;

const wrapper = new MTWrapper();

describe("MTWrapper unit tests", function () {

    it("should wrap dump commandConnectFromOptions db user basic", async function () {
        const mtOptions = new MTOptions({
            db: testDbName,
            port: testFixedPort,
            path: testBackupDirectory,
            username:"myUser",
            password:"myPass"
        });

        const command = wrapper.commandConnectFromOptions(mtOptions, '--beginning');

        command.should.be.eql("--beginning --host 127.0.0.1 --port 17017 --username myUser --password myPass --authenticationDatabase admin --db myDbForTest");
    });

    it("should wrap dump commandConnectFromOptions uri ssl", async function () {
        const mtOptions = new MTOptions({
            uri: testDbUri,
            username:"myUser",
            password:"myPass",
            ssl: "1",
            sslCAFile: "/tmp/myCAfile",
            sslPEMKeyFile: "/tmp/pem/sslPEMKeyFile",
            sslCRLFile: "/tmp/pem/sslCRLFile",
            sslPEMKeyPassword: "strongPassHere",
            sslFIPSMode: "1",
            tlsInsecure: "1"
        });

        const command = wrapper.commandConnectFromOptions(mtOptions, '--beginning');

        command.should.be.eql(`--beginning --uri ${testDbUri} `
            + "--ssl --sslCAFile /tmp/myCAfile --sslPEMKeyFile /tmp/pem/sslPEMKeyFile --sslPEMKeyPassword strongPassHere "
            + "--sslCRLFile /tmp/pem/sslCRLFile --sslFIPSMode --tlsInsecure");
    });

    it("should wrap restore commandConnectFromOptions db user basic", async function () {
        const mtOptions = new MTOptions({
            db: testDbName,
            port: testFixedPort,
            path: testBackupDirectory,
            username:"myUser",
            password:"myPass",
        });

        const command = wrapper.commandConnectFromOptions(mtOptions, '--beginning', true);

        command.should.be.eql("--beginning --host 127.0.0.1 --port 17017 --username myUser --password myPass --authenticationDatabase admin --nsInclude myDbForTest.*");
    });

    it("should wrap restore commandConnectFromOptions db user basic source and target dbs", async function () {
        const mtOptions = new MTOptions({
            db: null,
            dbFrom: testSourceDbName,
            dbTo: testTargetDbName,
            port: testFixedPort,
            path: testBackupDirectory,
            username:"myUser",
            password:"myPass",
        });

        const command = wrapper.commandConnectFromOptions(mtOptions, '--beginning', true);

        command.should.be.eql("--beginning --host 127.0.0.1 --port 17017 --username myUser --password myPass --authenticationDatabase admin --nsFrom mySourceDbForTest.* --nsTo myTargetDbForTest.*");
    });

    it("should wrap restore commandConnectFromOptions uri ssl", async function () {
        const mtOptions = new MTOptions({
            uri: testDbUri,
            ssl: "1",
            sslCAFile: "/tmp/myCAFile",
            sslPEMKeyFile: "/tmp/pem/sslPEMKeyFile",
            sslCRLFile: "/tmp/pem/sslCRLFile",
            sslPEMKeyPassword: "strongPassHere",
            sslFIPSMode: "1",
            tlsInsecure: "1"
        });

        const command = wrapper.commandConnectFromOptions(mtOptions, '--beginning', true);

        command.should.be.eql(
            `--beginning --uri ${testDbUri} `
            + "--ssl --sslCAFile /tmp/myCAFile --sslPEMKeyFile /tmp/pem/sslPEMKeyFile --sslPEMKeyPassword strongPassHere "
            + "--sslCRLFile /tmp/pem/sslCRLFile --sslFIPSMode --tlsInsecure");
    });

});
