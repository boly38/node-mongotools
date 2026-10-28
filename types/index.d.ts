export interface MTOptionsInput {
    uri?: string | null;
    db?: string | null;
    dbFrom?: string | null;
    dbTo?: string | null;
    host?: string;
    port?: number | string;
    username?: string | null;
    password?: string | null;
    authDb?: string | null;

    ssl?: "0" | "1" | null;
    sslCAFile?: string | null;
    sslPEMKeyFile?: string | null;
    sslPEMKeyPassword?: string | null;
    sslCRLFile?: string | null;
    sslFIPSMode?: "0" | "1" | null;
    tlsInsecure?: "0" | "1" | null;
    showCommand?: boolean;

    dumpCmd?: string;
    path?: string;
    fileName?: string | null;
    encrypt?: boolean;
    secret?: string | null;
    includeCollections?: string[] | null;
    collection?: string | [string] | null;
    excludeCollections?: string[] | null;
    encryptSuffix?: string;

    restoreCmd?: string;
    dumpFile?: string | null;
    decrypt?: boolean;
    dropBeforeRestore?: boolean;
    deleteDumpAfterRestore?: boolean;

    dropboxLocalPath?: string;
    dropboxToken?: string | null;
    dropboxAppKey?: string | null;
    dropboxAppSecret?: string | null;
    dropboxRefreshToken?: string | null;

    rotationDryMode?: boolean;
    rotationWindowsDays?: number | string;
    rotationMinCount?: number | string;
    rotationCleanCount?: number | string;
}

export type MongoToolsOptions = MTOptions | (MTOptionsInput & {
    numParallelCollections?: never;
    viewsAsCollections?: never;
});

export interface MongoToolsListResult {
    path: string;
    filesystem: string[];
    dropbox?: string[];
}

export interface MongoDumpResult {
    message: string;
    status: number;
    fileName: string;
    fullFileName: string;
    stdout: string | null;
    stderr: string | null;
    dropboxFile?: string;
    dropboxFileSize?: number;
}

export interface MongoRestoreResult {
    message: string;
    dumpFile: string;
    status: number;
    stdout: string;
    stderr: string;
}

export interface RotationResult {
    initialBackupsCount: number;
    deprecatedBackupsCount: number;
    cleanedCount: number;
    cleanedFiles: string[];
}

export interface DropboxRotationResult extends Omit<RotationResult, "initialBackupsCount"> {
    initialBackupsCount: number | undefined;
}

export interface MongoToolsRotationResult {
    filesystem: RotationResult;
    dropbox?: DropboxRotationResult;
}

export class MTOptions {
    constructor(options?: MTOptionsInput | null);

    uri: string | null;
    db: string | null;
    dbFrom: string | null;
    dbTo: string | null;
    host: string;
    port: number | string;
    username: string | null;
    password: string | null;
    authDb: string | null;

    ssl: string | null;
    sslCAFile: string | null;
    sslPEMKeyFile: string | null;
    sslPEMKeyPassword: string | null;
    sslCRLFile: string | null;
    sslFIPSMode: string | null;
    tlsInsecure: string | null;
    showCommand: boolean;

    dumpCmd: string;
    path: string;
    fileName: string | null;
    encrypt: boolean;
    secret: string | null;
    includeCollections: string[] | null;
    collection: string | [string] | null;
    excludeCollections: string | string[] | null;
    numParallelCollections?: number;
    viewsAsCollections?: false | "1" | null;
    defaultEncryptSuffix: string;
    encryptSuffix: string;

    restoreCmd: string;
    dumpFile: string | null;
    decrypt: boolean;
    dropBeforeRestore: boolean;
    deleteDumpAfterRestore: boolean;

    dropboxLocalPath: string;
    dropboxToken: string | null;
    dropboxAppKey: string | null;
    dropboxAppSecret: string | null;
    dropboxRefreshToken: string | null;
    isDeprecatedDropboxTokenAvailable: boolean;
    isDropboxRefreshTokenAvailable: boolean;
    isDropboxEnabled: boolean;

    rotationDryMode: boolean;
    rotationWindowsDays: number | string;
    rotationMinCount: number | string;
    rotationCleanCount: number | string;

    assumeValidPort(): void;
    getPath(): string;
    getDropboxPath(): string;
    getDropboxLocalPath(): string;
}

export class MongoTools {
    constructor();

    list(options?: MongoToolsOptions): Promise<MongoToolsListResult>;
    mongodump(options?: MongoToolsOptions): Promise<MongoDumpResult>;
    mongorestore(options?: MongoToolsOptions): Promise<MongoRestoreResult>;
    rotation(options?: MongoToolsOptions): Promise<MongoToolsRotationResult>;
}

export class MTCommand {
    constructor();

    filenameOnly(fullName?: string): string;
    printUsage(): void;
    logOutput(result?: {stdout?: string | null; stderr?: string | null} | null): void;
    logSuccess(success: object): void;
    logError(error: unknown): void;
    doAction(action?: string): void;
}
