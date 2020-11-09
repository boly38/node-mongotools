var exec = require('child_process').exec;
var fs = require('fs');
var mkdirp = require('mkdirp');
var ssync = require('child_process').spawnSync;

exports.mongodump = (options) => new Promise(async function(resolve, reject) {
    if (!('db' in options) && !('uri' in options)) {
      return reject({ error: 'INVALID_OPTIONS', message: 'db: database name for dump is required.' });
    }
    var dumpCmd = ('dumpCmd' in options) ? options.dumpCmd : 'mongodump';
    // Improvement: verify dumpCmd exists

    var dumpPath = ('path' in options) ? options.path : 'backup';
    // create dumpPath if not exist
    if (!fs.existsSync(dumpPath)) {
      await fs.promises.mkdir(dumpPath, { recursive: true })
        .catch((err) => {
          return reject({ error: 'INVALID_OPTIONS', message: 'path: cannot create ' + dumpPath + ' :' + err });
        });
    }

    var database = 'backup';
    var command = dumpCmd;
    var uri  = ('uri' in options) ? options.uri : null;

    if (uri != null) {
      if (!uri.includes('/')) {
        return reject({ error: 'INVALID_OPTIONS', message: 'uri: database name for dump is required.' });
      }
      database = uri.substring(uri.lastIndexOf('/') + 1, uri.length)
      command += ' --uri ' + uri
    } else {
      command += ' --host ' + (('host' in options) ? options.host : '127.0.0.1') +
                 ' --port ' + (('port' in options) ? options.port : 27017);
      if ('userName' in options && 'password' in options) {
        command += ' --username ' + options.userName +
                   ' --password ' + options.password;
        if ('authenticationDatabase' in options) {
          command += ' --authenticationDatabase ' + options.authenticationDatabase;
        }
      }
      if ('db' in options && options.db != '*') {
        command += ' --db ' + options.db;
        database = options.db;
      }
    }
    if ('ssl' in options && options.ssl) {
       command += ' --ssl';
    }
    var dateTimeSuffix = new Date().toLocaleString().replace(/ /g, '_').replace(/:/g, '');
    var simplifiedName = database.replace(/[^a-zA-Z0-9\\-]/g,'_');
    var fileName = ('fileName' in options) ? dumpPath + '/' + options.fileName
                                           : dumpPath + '/' + simplifiedName + '__' + dateTimeSuffix + '.gz';
    command += ' --archive=' + fileName + ' --gzip';

    // launch mongodump
    try {
      //
      console.log(command);
      var dump = ssync(dumpCmd, command.split(' ').slice(1));
      if (dump.status === 0) {
        resolve({message: 'db:' + database + ' - dump created:' + fileName, status: dump.status,
          stdout: dump.stdout.toString(), stderr: dump.stderr.toString()});
      } else {
        reject({ error: 'COMMAND_ERROR', message: dump.error , status: dump.status, stdout: dump.stdout.toString(),
          stderr: dump.stderr.toString()});
      }
    } catch (exception) {
      reject({ error: 'COMMAND_EXCEPTION', message: exception});
    }
});

exports.mongorestore = (options) => new Promise((resolve, reject) => {
    if (!('dumpPath' in options)) {
      return reject({ error: 'INVALID_OPTIONS', message: 'dumpPath: mongo dump full path is required.' });
    }
    var dumpPath = options.dumpPath;

    var restoreCmd = ('restoreCmd' in options) ? options.restoreCmd : 'mongorestore';
    // Improvement: verify restoreCmd exists

    var uri  = ('uri' in options) ? options.uri : null;
    if (uri != null) {
      command += ' --uri ' + uri
    } else {
      var command = restoreCmd + ' --host ' + (('host' in options) ? options.host : '127.0.0.1') +
                                 ' --port ' + (('port' in options) ? options.port : 27017);
      if ('userName' in options && 'password' in options) {
        command += ' --username ' + options.userName +
                   ' --password ' + options.password;
        if ('authenticationDatabase' in options) {
          command += ' --authenticationDatabase ' + options.authenticationDatabase;
        }
      }
    }
    if ('ssl' in options && options.ssl) {
       command += ' --ssl';
    }
    if ('dropBeforeRestore' in options && options.dropBeforeRestore == true) {
      command += ' --drop';
    }
    command += ' --archive=' + dumpPath + ' --gzip';

    // launch mongorestore
    try {
      var restore = ssync(restoreCmd, command.split(' ').slice(1));
      if (restore.status === 0) {
        if ('deleteDumpAfterRestore' in options && options.deleteDumpAfterRestore == true) {
            fs.unlinkSync(dumpPath);
        }
        resolve({message: 'file:' + dumpPath + ' restored', status: restore.status, stdout: restore.stdout.toString(), stderr: restore.stderr.toString()});
      } else {
        reject({ error: 'COMMAND_ERROR', message: restore.error , status: restore.status, stdout: restore.stdout.toString(), stderr: restore.stderr.toString()});
      }
    } catch (exception) {
      reject({ error: 'COMMAND_EXCEPTION', message: exception});
    }
});