const { MongoTools, MTOptions } = require("./lib/mt")
const path = require('path')
var mt = new MongoTools();

// DEBUG // console.log(new MTOptions());

/**
 * pick filename only from full file+path string
 */
function filenameOnly(fullName) {
    return fullName ? fullName.substring(fullName.lastIndexOf(path.sep) + 1, fullName.length) : '';
}
/**
 * help user on usage
 */
function printUsage() {
  var launchCmd = filenameOnly(process.argv[0]) + ' ' + filenameOnly(process.argv[1]);
  console.log('Usage:\t' + launchCmd + ' <list|dump|restore backup/myFile.gz>');
}

function logOutput(result) {
  if (result.stdout) { console.info('stdout:', result.stdout); }
  if (result.stderr) { console.error('stderr:', result.stderr); }
}
function logSuccess(success) {
  logOutput(success);
  console.info(`OK ${success.message}`);
}

function logError(err) {
  // DEBUG //
  console.error(JSON.stringify(err));
  if (err && err.status) {
      console.error(`Error ${err.status} ${JSON.stringify(err.error)}`);
  } else if (err && err.message) {
    console.error(`Error ${err.message}`);
  }
  logOutput(err);
}

function doAction(action = 'list') {
  if (!['list','dump','restore'].includes(action)) {
    printUsage();
    return;
  }
  if (action == 'list') {
    mt.list(new MTOptions()).then((names) => {
      if (!names || names.length ===0) {
        console.log("empty");
        return;
      }
      names.forEach(name => {
        console.log(name);
      });
    }).catch(logError);
    return;
  }
  if (action == 'dump') {
    mt.mongodump(new MTOptions()).then(logSuccess).catch(logError);
    return;
  }
  // restore action do need an extra argument: the file to restore
  if (action == 'restore') {
    if (process.argv.slice(2).length !== 2) {
      printUsage();
      return;
    }
    var restoreFile = process.argv.slice(2)[1];
    mt.mongorestore(new MTOptions({
          dumpFile: restoreFile,
          dropBeforeRestore: true,
          deleteDumpAfterRestore: true
    }))
    .then(logSuccess).catch(logError);
    return;
  }
}

// take first command line argument
var action = process.argv.slice(2)[0];
doAction(action);