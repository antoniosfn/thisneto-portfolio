import { createHash } from "node:crypto";
import {
  cpSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, relative } from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const bundle = join(root, "deploy-bundle");
const sha =
  process.env.SOURCE_SHA ||
  execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const head = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
if (sha !== head) {
  console.error(`SOURCE_SHA ${sha} does not match HEAD ${head}`);
  process.exit(1);
}

mkdirSync(bundle, { recursive: true });
cpSync(join(root, "out"), join(bundle, "out"), { recursive: true });
cpSync(join(root, "functions"), join(bundle, "functions"), { recursive: true });

function filesOf(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) out.push(...filesOf(path));
    else out.push(path);
  }
  return out.sort();
}

const files = {};
for (const path of [
  ...filesOf(join(bundle, "out")),
  ...filesOf(join(bundle, "functions")),
]) {
  const body = readFileSync(path);
  files[relative(bundle, path)] = {
    sha256: createHash("sha256").update(body).digest("hex"),
    bytes: body.length,
  };
}

const manifest = {
  gitSha: sha,
  runId: process.env.GITHUB_RUN_ID || null,
  runAttempt: process.env.GITHUB_RUN_ATTEMPT || null,
  project: "thisneto",
  accountId: "320fd8cf3b869be36418db3d19f069e3",
  wrangler: "4.158.0",
  output: "out",
  functions: "functions",
  files,
};
writeFileSync(
  join(bundle, "provenance.json"),
  JSON.stringify(manifest, null, 2),
);
console.log(`provenance ${sha} files=${Object.keys(files).length}`);
