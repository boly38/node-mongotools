import {MongoTools, MTCommand, MTOptions, type MongoToolsRotationResult} from "node-mongotools";

const options = new MTOptions({
    db: "typescript-consumer",
    path: "backup",
    collection: "widgets"
});
const tools = new MongoTools();
const command = new MTCommand();
const explicitTlsDisable = new MTOptions({
    ssl: "0",
    sslFIPSMode: "0",
    tlsInsecure: "0"
});

function verifyPublicSignatures(mt: MongoTools, mtOptions: MTOptions, mtCommand: MTCommand): void {
    mtOptions.numParallelCollections = 2;
    mtOptions.viewsAsCollections = "1";

    const listResult: Promise<{path: string; filesystem: string[]; dropbox?: string[]}> = mt.list(mtOptions);
    const dumpResult: Promise<{
        message: string;
        status: number;
        fileName: string;
        fullFileName: string;
        stdout: string | null;
        stderr: string | null;
    }> = mt.mongodump(mtOptions);
    const restoreResult: Promise<{
        message: string;
        dumpFile: string;
        status: number;
        stdout: string;
        stderr: string;
    }> = mt.mongorestore(new MTOptions({dumpFile: "backup.gz"}));
    const rotationResult: Promise<MongoToolsRotationResult> = mt.rotation(mtOptions);
    const doAction: (action?: string) => void = mtCommand.doAction.bind(mtCommand);
    void [listResult, dumpResult, restoreResult, rotationResult, doAction];

    // @ts-expect-error raw wrapper options are discarded when a plain object becomes MTOptions
    mt.mongodump({db: "typescript-consumer", numParallelCollections: 2});

    void mt.list(mtOptions).then(result => {
        // @ts-expect-error filesystem results are paths, not numbers
        const numericPaths: number[] = result.filesystem;
        void numericPaths;
    });
}

if (!(options instanceof MTOptions) || !(tools instanceof MongoTools) || !(command instanceof MTCommand)) {
    throw new Error("Expected the package's public constructors to be available at runtime");
}
if (options.getPath() !== "backup") {
    throw new Error("Expected MTOptions to preserve the configured backup path");
}
if (new MTOptions().excludeCollections !== "typescript-consumer") {
    throw new Error("Expected MTOptions to preserve an environment-provided exclusion string");
}

// @ts-expect-error unknown options must not be accepted by the public constructor
new MTOptions({db: "typescript-consumer", notAnOption: true});

// @ts-expect-error wrapper-only options are not stored by MTOptions
new MTOptions({db: "typescript-consumer", numParallelCollections: 2});

// @ts-expect-error a supplied string port is not converted to a number
const numericPort: number = new MTOptions({port: "27017"}).port;

// @ts-expect-error the environment can leave exclusions as a string
const listOnlyExclusions: string[] | null = new MTOptions().excludeCollections;

function verifyDropboxRotationCount(result: MongoToolsRotationResult): void {
    if (result.dropbox) {
        // @ts-expect-error Dropbox rotation currently leaves this count undefined
        const definiteCount: number = result.dropbox.initialBackupsCount;
        void definiteCount;
    }
}

function verifyFilesystemRotationCount(result: MongoToolsRotationResult): void {
    const definiteCount: number = result.filesystem.initialBackupsCount;
    void definiteCount;
}

function verifyUnsupportedViewFlag(mtOptions: MTOptions): void {
    // @ts-expect-error the runtime wrapper enables this option with the string "1"
    mtOptions.viewsAsCollections = true;
}

void [
    verifyPublicSignatures,
    numericPort,
    listOnlyExclusions,
    verifyDropboxRotationCount,
    verifyFilesystemRotationCount,
    verifyUnsupportedViewFlag,
    explicitTlsDisable
];
