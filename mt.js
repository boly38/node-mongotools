const {MTCommand} = require('./lib/mt.js');
// take first command line argument
var action = process.argv.slice(2)[0];
(new MTCommand()).doAction(action);