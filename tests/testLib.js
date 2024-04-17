import {before, describe, it} from "mocha";
import chai, {should, expect} from 'chai';
import chaiString from "chai-string";

chai.should();
chai.use(chaiString);

export {before, describe, it, chai, should,expect};