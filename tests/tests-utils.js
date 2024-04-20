import mongoose from 'mongoose';

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
        await mongoose.connect(uri, {});
        for (let i = 0; i < nbDocs; i++) {
            await mtMochaTests.create(givenDocumentData(i));
        }
    } finally {
        await mongoose.disconnect();
    }
}

export const countDocumentsInCollection = async uri => {
    try {
        await mongoose.connect(uri, {});
        return await mtMochaTests.countDocuments();
    } finally {
        await mongoose.disconnect();
    }
}

export const dropDatabase = async (uri, info = "") => {
    console.log(`  ▶ drop test database ${info}`);
    try {
        await mongoose.connect(uri, {});
        await mongoose.connection.dropDatabase();
    } finally {
        await mongoose.disconnect();
    }
}
