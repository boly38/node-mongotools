import { MTCommand } from './lib/mt.js'; // as library client you may use : import { MongoTools, MTOptions, MTCommand } from "node-mongotools";

// take first command line argument
var action = process.argv.slice(2)[0];
(new MTCommand()).doAction(action);