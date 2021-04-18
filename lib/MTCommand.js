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
    console.log('Usage:\t' + launchCmd + ' <list|dump|restore backup/myFile.gz>');
  }

  logOutput(result) {
    if (result.stdout) { console.info('stdout:', result.stdout); }
    if (result.stderr) { console.error('stderr:', result.stderr); }
  }

  logSuccess(success) {
    this.logOutput(success);
    console.info(`OK ${success.message}`);
  }

  logError(err) {
    // DEBUG // console.error(JSON.stringify(err));
    if (err && err.status) {
        console.error(`Error ${err.status} ${JSON.stringify(err.error)}`);
    } else if (err && err.message) {
      console.error(`Error ${err.message}`);
    } else if (err && err.text) {
      console.error(`Error ${err.text}`);
    }
    this.logOutput(err);
  }

  doAction(action = 'list') {
    const cmd = this;
    if (!['list','dump','restore'].includes(action)) {
      this.printUsage();
      return;
    }
    if (action == 'list') {
      this.mt.list(new MTOptions()).then((names) => {
        if (!names || names.length ===0) {
          console.log("empty");
          return;
        }
        names.forEach(name => {
          console.log(name);
        });
      }).catch(cmd.logError.bind(cmd));
      return;
    }
    if (action == 'dump') {
      this.mt.mongodump(new MTOptions()).then(cmd.logSuccess.bind(cmd)).catch(cmd.logError.bind(cmd));
      return;
    }
    // restore action do need an extra argument: the file to restore
    if (action == 'restore') {
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
  }

}

module.exports = MTCommand;