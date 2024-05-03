import mongoose from 'mongoose';

// set 3sec timeout to avoid waiting 30 seconds on misconfiguration:
// warn: this may produce flaky issues on some host with network latency
const serverSelectionTimeoutMS = 3000;// https://mongoosejs.com/docs/connections.html#serverselectiontimeoutms
const socketTimeoutMS = 3000;// https://mongoosejs.com/docs/api/mongoose.html#Mongoose.prototype.connect()
const MONGOOSE_CONNECT_OPTIONS = {serverSelectionTimeoutMS, socketTimeoutMS};

const mtMochaTests = mongoose.model('MT-mocha-tests', new mongoose.Schema({
    _id: String,
    string: String
}));

const givenDocumentData = (i) => {
    return {_id: `333221${i}`, string: `this is my data${i}`}
};

export const createDatabaseWithNDocs = async (uri, info = "", nbDocs = 2) => {
    console.log(`  ▶ create test database ${info} with ${nbDocs} documents`);
    try {
        await mongoose.connect(uri, MONGOOSE_CONNECT_OPTIONS);
        for (let i = 0; i < nbDocs; i++) {
            await mtMochaTests.create(givenDocumentData(i));
        }
    } finally {
        await mongoose.disconnect();
    }
}

export const countDocumentsInCollection = async uri => {
    try {
        await mongoose.connect(uri, MONGOOSE_CONNECT_OPTIONS);
        return await mtMochaTests.countDocuments();
    } finally {
        await mongoose.disconnect();
    }
}

export const dropDatabase = async (uri, info = "") => {
    console.log(`  ▶ drop test database ${info}`);
    try {
        try {
            await mongoose.connect(uri, MONGOOSE_CONNECT_OPTIONS);
        } catch (veryFirstConnectError) {
            console.warn("⚠️ integration test require ready-to-use mongo connection,\nℹ️ please review you test environment variables");
            console.error(`❌ Unable to connect to test database (${uri}) - error : ${veryFirstConnectError.message}`);
            process.exit(1)
        }
        await mongoose.connection.dropDatabase();
    } finally {
        await mongoose.disconnect();
    }
}
