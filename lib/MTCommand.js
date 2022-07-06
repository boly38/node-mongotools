const MongoTools = require("./MongoTools")
const MTOptions = require("./MTOptions")
const path = require('path')

class MTCommand {
  constructor() {
    this.mt = new MongoTools();
    // DEBUG // console.log(new MTOptions());
  }

  /**
   * pick filename only from full file+path string
   */
  filenameOnly(fullName) {
      return fullName ? fullName.substring(fullName.lastIndexOf(path.sep) + 1, fullName.length) : '';
  }

  /**
   * help user on usage
   */
  printUsage() {
    var launchCmd = this.filenameOnly(process.argv[0]) + ' ' + this.filenameOnly(process.argv[1]);
    console.log('Usage:\t' + launchCmd + ' <options|list|dump|dumpz|restore backup/myFile.gz|rotation>');
  }

  logOutput(result) {
    if (result.stdout) { console.info('stdout:', result.stdout); }
    if (result.stderr) { console.error('stderr:', result.stderr); }
  }

  logSuccess(success) {
    this.logOutput(success);
    if (success.message && success.fullFileName) {
      console.info(`OK ${success.message} - local dump:${success.fullFileName}`);
    } else if (success.message) {
      console.info(`OK ${success.message}`);
    } else {
      console.info(`OK ${JSON.stringify(success, null, 4)}`);
    }
  }

  logError(err) {
    // DEBUG // console.error(JSON.stringify(err));
    if (err && err.status) {
        console.error(`Error ${err.status} ${JSON.stringify(err.error, null, 4)}`);
    } else if (err && err.message) {
      console.error(`Error ${err.message}`);
    } else if (err && err.text) {
      console.error(`Error ${err.text}`);
    } else {
      console.error(`Error ${JSON.stringify(err, null, 4)}`);
    }
    this.logOutput(err);
  }

  doAction(action = 'list') {
    const cmd = this;
    if (!['options','list','dump','dumpz','restore','rotation'].includes(action)) {
      this.printUsage();
      return;
    }
    if (action === 'options') {
      console.log(JSON.stringify(new MTOptions(), null, 2));
    }
    if (action === 'list') {
      this.mt.list(new MTOptions()).then((listResult) => {
        console.log(JSON.stringify(listResult, null, 4));
      }).catch(cmd.logError.bind(cmd));
      return;
    }
    if (action === 'dumpz') {
      this.mt.mongodump(new MTOptions({"encrypt":true})).then(cmd.logSuccess.bind(cmd)).catch(cmd.logError.bind(cmd));
      return;
    }
    if (action === 'dump') {
      this.mt.mongodump(new MTOptions()).then(cmd.logSuccess.bind(cmd)).catch(cmd.logError.bind(cmd));
      return;
    }
    // restore action do need an extra argument: the file to restore
    if (action === 'restore') {
      if (process.argv.slice(2).length !== 2) {
        this.printUsage();
        return;
      }
      var restoreFile = process.argv.slice(2)[1];
      this.mt.mongorestore(new MTOptions({
            dumpFile: restoreFile,
            dropBeforeRestore: true,
            deleteDumpAfterRestore: true
      }))
      .then(cmd.logSuccess.bind(cmd)).catch(cmd.logError.bind(cmd));
      return;
    }
    if (action === 'rotation') {
      this.mt.rotation(new MTOptions()).then(cmd.logSuccess.bind(cmd)).catch(cmd.logError.bind(cmd));
      return;
    }
  }

}

module.exports = MTCommand;