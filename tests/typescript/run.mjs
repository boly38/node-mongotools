import {createRequire} from "node:module";
import {cp, mkdtemp, readdir, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {dirname, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {execFileSync} from "node:child_process";
import process from "node:process";

const require = createRequire(import.meta.url);
const testDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(testDirectory, "../..");
const temporaryDirectory = await mkdtemp(join(tmpdir(), "node-mongotools-typescript-"));

try {
    execFileSync("npm", ["pack", "--pack-destination", temporaryDirectory], {
        cwd: projectDirectory,
        stdio: "inherit"
    });

    const packedFile = (await readdir(temporaryDirectory)).find(file => file.endsWith(".tgz"));
    if (!packedFile) {
        throw new Error("npm pack did not produce a package tarball");
    }

    const consumerDirectory = join(temporaryDirectory, "consumer");
    await cp(testDirectory, consumerDirectory, {recursive: true});
    await writeFile(join(consumerDirectory, "package.json"), JSON.stringify({
        name: "node-mongotools-typescript-consumer",
        private: true,
        type: "module"
    }, null, 2));

    execFileSync("pnpm", ["add", "--save-exact", join(temporaryDirectory, packedFile)], {
        cwd: consumerDirectory,
        stdio: "inherit"
    });

    const typeScriptCompiler = require.resolve("typescript/bin/tsc");
    execFileSync(process.execPath, [typeScriptCompiler, "--project", join(consumerDirectory, "tsconfig.json")], {
        cwd: consumerDirectory,
        stdio: "inherit"
    });
    execFileSync(process.execPath, [join(consumerDirectory, "dist/consumer.js")], {
        cwd: consumerDirectory,
        env: {...process.env, MT_EXCLUDE_COLLECTIONS: "typescript-consumer"},
        stdio: "inherit"
    });
} finally {
    await rm(temporaryDirectory, {recursive: true, force: true});
}
