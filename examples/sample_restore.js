const { MongoTools, MTCommand } = require("node-mongotools")

async function restore(uri, dumpFile){
  var mt = new MongoTools();
  var mtc = new MTCommand();// to reuse log methods
  // mongorestore
  const restoreResult = await mt.mongorestore({
        uri,
        dumpFile,
        dropBeforeRestore: true,
        deleteDumpAfterRestore: true
    })
    .catch(mtc.logError.bind(mtc));
  if (restoreResult === undefined) {// error case
    process.exit(1);
  }
  mtc.logSuccess(restoreResult);
}

// take first command line argument
if (process.argv.slice(2).length !== 1) {
  console.log("please provide backup full filename as argument");
  process.exit(1);
}
var backupFilePath = process.argv.slice(2)[0];
const uri = process.env.MY_MONGO_URI

restore(uri, backupFilePath);