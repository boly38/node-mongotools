#!/usr/bin/env node

import {MTCommand} from '../lib/mt.js'; // as library client you may use : import { MongoTools, MTOptions, MTCommand } from "node-mongotools";
import process from "node:process";

// take first command line argument
const action = process.argv.slice(2)[0];

(new MTCommand()).doAction(action);






