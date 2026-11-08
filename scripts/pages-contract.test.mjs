import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  assertFreshTip,
  assertTrustedRun,
  decideDeploy,
} from "./deploy-pages.mjs";

const read = (path) => readFileSync(path, "utf8");

test("Pages Function and route stay in the deploy contract", () => {
  const routes = JSON.parse(read("public/_routes.json"));
  assert.deepEqual(routes.include, ["/api/*"]);
  assert.match(
    read("functions/api/contato.ts"),
    /export async function onRequestPost/,
  );
  assert.match(read("next.config.ts"), /output:\s*"export"/);
  assert.match(read("public/_headers"), /Content-Security-Policy:/);
});

test("direct upload never targets the historical production branch name", () => {
  const preview = decideDeploy({
    productionBranch: "novodesign/ultraplan-v1",
    parityOk: false,
  });
  assert.equal(preview.branch, "main");
  assert.equal(preview.environment, "preview");
  assert.equal(preview.replacesProduction, false);

  assert.throws(
    () =>
      decideDeploy({
        productionBranch: "main",
        parityOk: false,
      }),
    /parity/,
  );

  const production = decideDeploy({
    productionBranch: "main",
    parityOk: true,
  });
  assert.equal(production.environment, "production");
  assert.equal(production.replacesProduction, true);
  assert.equal(production.branch, "main");
  assert.equal(preview.promotesExistingDeployment, false);
  assert.equal(production.promotesExistingDeployment, false);
});

test("only a successful CI push of this repo on main can be deployed", () => {
  const sha = assertTrustedRun(
    {
      name: "CI",
      event: "push",
      head_branch: "main",
      conclusion: "success",
      head_sha: "abc",
      head_repository: { full_name: "antoniosfn/thisneto-portfolio" },
    },
    "antoniosfn/thisneto-portfolio",
  );
  assert.equal(sha, "abc");
  assert.throws(
    () =>
      assertTrustedRun(
        {
          name: "CI",
          event: "pull_request",
          head_branch: "main",
          conclusion: "success",
          head_sha: "abc",
          head_repository: { full_name: "antoniosfn/thisneto-portfolio" },
        },
        "antoniosfn/thisneto-portfolio",
      ),
    /push/,
  );
  assertFreshTip({ mode: "push", artifactSha: "abc", mainSha: "abc" });
  assert.throws(
    () => assertFreshTip({ mode: "push", artifactSha: "old", mainSha: "new" }),
    /stale/,
  );
  assertFreshTip({ mode: "promote", artifactSha: "old", mainSha: "new" });
});

test("workflows do not check out pull_request_target", () => {
  for (const file of [
    ".github/workflows/ci.yml",
    ".github/workflows/deploy.yml",
  ]) {
    assert.doesNotMatch(read(file), /pull_request_target/);
  }
  assert.match(read(".github/workflows/deploy.yml"), /workflow_run/);
  assert.match(read(".github/workflows/deploy.yml"), /head_branch == 'main'/);
  assert.match(read(".github/workflows/deploy.yml"), /workflow_run.id/);
  assert.match(read(".github/workflows/deploy.yml"), /promote_run_id/);
  assert.match(read(".github/workflows/ci.yml"), /@visual/);
  assert.doesNotMatch(read(".github/workflows/ci.yml"), /loading book/);
  assert.match(read(".github/workflows/ci.yml"), /cancel-in-progress: true/);
  assert.match(
    read(".github/workflows/deploy.yml"),
    /cancel-in-progress: false/,
  );
});
