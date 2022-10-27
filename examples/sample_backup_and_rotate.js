import os from "os";

// node-mongotools users must use this line
// import { MongoTools, MTOptions, MTCommand } from "node-mongotools";

// import from inside project
import { MongoTools, MTOptions, MTCommand } from "../lib/mt.js";

async function dumpAndRotate(uri, path){
  var mt = new MongoTools();
  var mtc = new MTCommand();// to reuse log methods
  // mongodump
  const dumpResult = await mt.mongodump({ uri, path })
    .catch(mtc.logError.bind(mtc));
  if (dumpResult === undefined) {// error case
    process.exit(1);
  }
  mtc.logSuccess(dumpResult);

  // backups rotation
  const rotationResult = await mt.rotation({path, rotationWindowsDays: 5, rotationMinCount:1})
    .catch(mtc.logError.bind(mtc));
  if (rotationResult === undefined) {// error case
    process.exit(1);
  }
  mtc.logSuccess(rotationResult);
}

const uri = process.env.MY_MONGO_URI
const path = `backup/${os.hostname()}`;

dumpAndRotate(uri, path);