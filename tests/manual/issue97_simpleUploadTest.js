import MongoTools from "../../lib/MongoTools.js";
import MTOptions from "../../lib/MTOptions.js";

const options = new MTOptions()
const mt = new MongoTools();

const list = () => {
    mt.dbx.listFromDropbox(options)
        .then(console.log)
        .catch(console.error)
}

const upload = () => {
    // generate  10MB file (linux) : dd if=/dev/zero of=/WORK/node-mongotools/output.dat  bs=1024  count=10240
    // generate 148MB file (linux) : dd if=/dev/zero of=/WORK/node-mongotools/output.dat  bs=1024  count=151240
    // generate 156MB file (linux) : dd if=/dev/zero of=/WORK/node-mongotools/output.dat  bs=1024  count=159240
    mt.dbx.mongoDumpUploadOnDropbox(options, {"fullFileName":"./output.dat"})
}

const firstArg = process.argv[2];
if (firstArg === "list")
    list();
else if (firstArg === "options")
    console.log(options);
else if (firstArg === "upload")
    upload();
else
    console.log("??")