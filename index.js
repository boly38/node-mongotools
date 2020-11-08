const path = require('path')
var mongoTools = require("./mongoTools");

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
  console.log('Usage:\t' + launchCmd + ' <dump|restore backup/myFile.gz>');
}

// take first command line argument
var action = process.argv.slice(2)[0];

if (action == 'dump') {
  mongoTools.mongodump({
        host: "localhost", port: 37017,
        userName:'root', password:'mypass', authenticationDatabase:'admin',
        db: "myDatabase"
  })
  .catch( (err) => {
    console.error(err.message);
  })
  .then( (success) => {
    console.info(success.message);
    if (success.stdout) { console.info('stdout:', success.stdout); }
    if (success.stderr) { console.error('stderr:', success.stderr); }
  });
}

// restore action do need an extra argument: the file to restore
else if ((action == 'restore') && (process.argv.slice(2).length > 1)) {
  var restoreFile = process.argv.slice(2)[1];
  mongoTools.mongorestore({
        host: "localhost", port: 37017,
        userName:'root', password:'mypass', authenticationDatabase:'admin',
        dumpPath: restoreFile,
        dropBeforeRestore: true,
        deleteDumpAfterRestore: true
  })
  .catch( (err) => {
    console.error(err.message);
  })
  .then( (success) => {
    if (success) {
      console.info(success.message);
      if (success.stdout) { console.info('stdout:', success.stdout); }
      if (success.stderr) { console.error('stderr:', success.stderr); }
    }
  });
} else {
  printUsage();
}