import { spawnSync } from "node:child_process";

const prettier = spawnSync(
  "npx",
  ["prettier", "--check", "scripts/**/*.mjs", "docs/ci-cd.md"],
  { stdio: "inherit" },
);
if (prettier.status !== 0) process.exit(prettier.status ?? 1);

const contract = spawnSync(
  "node",
  ["--test", "scripts/pages-contract.test.mjs"],
  {
    stdio: "inherit",
  },
);
process.exit(contract.status ?? 1);
