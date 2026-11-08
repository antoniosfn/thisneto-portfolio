import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const PROJECT = "thisneto";
const DEPLOY_BRANCH = "main";
const HISTORICAL_PRODUCTION_BRANCH = "novodesign/ultraplan-v1";
const ACCOUNT =
  process.env.CLOUDFLARE_ACCOUNT_ID || "320fd8cf3b869be36418db3d19f069e3";

export function decideDeploy({ productionBranch, parityOk }) {
  if (productionBranch === HISTORICAL_PRODUCTION_BRANCH) {
    return {
      branch: DEPLOY_BRANCH,
      environment: "preview",
      replacesProduction: false,
      // A later PATCH of production_branch does not reclassify this upload.
      promotesExistingDeployment: false,
    };
  }
  if (productionBranch === DEPLOY_BRANCH) {
    if (!parityOk) {
      throw new Error(
        "parity gate failed; refusing to replace production while production_branch is main",
      );
    }
    return {
      branch: DEPLOY_BRANCH,
      environment: "production",
      replacesProduction: true,
      promotesExistingDeployment: false,
    };
  }
  throw new Error(`unexpected Pages production_branch: ${productionBranch}`);
}

export function assertTrustedRun(run, repository) {
  if (run.name !== "CI") throw new Error("refusing a run that is not CI");
  if (run.event !== "push")
    throw new Error("refusing a run that was not a push");
  if (run.head_branch !== "main")
    throw new Error("refusing a run that is not main");
  if (run.conclusion !== "success")
    throw new Error("refusing a run that did not succeed");
  if (run.head_repository?.full_name !== repository) {
    throw new Error("refusing a run from another repository");
  }
  if (!run.head_sha) throw new Error("refusing a run without a commit SHA");
  return run.head_sha;
}

export function assertFreshTip({ mode, artifactSha, mainSha }) {
  if (mode === "push" && artifactSha !== mainSha) {
    throw new Error(
      `stale deploy: artifact ${artifactSha} is not origin/main ${mainSha}`,
    );
  }
}

const isEntry =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

async function api(token, path, method = "GET") {
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method,
    headers: { authorization: `Bearer ${token}` },
  });
  const body = await response.json();
  if (!body.success) {
    const message = (body.errors || [])
      .map((error) => error.message)
      .join("; ");
    throw new Error(`${method} ${path} → ${response.status} ${message}`);
  }
  return body.result;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

async function smoke(url) {
  const page = await fetch(new URL("/", url), { redirect: "manual" });
  const html = await page.text();
  if (page.status !== 200 || !html.includes("Antonio Neto")) {
    throw new Error(`smoke GET / failed: ${page.status}`);
  }
  const robots = await fetch(new URL("/robots.txt", url));
  if (robots.status !== 200 || !(await robots.text()).includes("tonin.tech")) {
    throw new Error(`smoke robots failed: ${robots.status}`);
  }
  const contact = await fetch(new URL("/api/contato", url), {
    method: "POST",
    body: new FormData(),
  });
  const type = contact.headers.get("content-type") || "";
  // Empty form: 503 without a Pages key, 422 before Resend when the key exists.
  // 200 would mean a message was accepted. That must never happen here.
  if (contact.status === 200 || !type.includes("application/json")) {
    throw new Error(`smoke function failed: ${contact.status} ${type}`);
  }
  if (![422, 503].includes(contact.status)) {
    throw new Error(`smoke function failed: ${contact.status} ${type}`);
  }
}

function runWrangler(args, cwd, outputDir) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn("npx", ["wrangler", ...args], {
      cwd,
      env: {
        ...process.env,
        CI: "true",
        CLOUDFLARE_ACCOUNT_ID: ACCOUNT,
        WRANGLER_OUTPUT_FILE_DIRECTORY: outputDir,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    child.stdout.on("data", (chunk) => {
      process.stdout.write(chunk);
      out += chunk;
    });
    child.stderr.on("data", (chunk) => {
      process.stderr.write(chunk);
      out += chunk;
    });
    child.on("close", (code) => {
      if (code === 0) resolvePromise(out);
      else reject(new Error(`wrangler exited ${code}`));
    });
  });
}

function runtimeFacts(project) {
  const production = project.deployment_configs?.production ?? {};
  const preview = project.deployment_configs?.preview ?? {};
  return {
    compatibilityDate:
      production.compatibility_date || project.compatibility_date || null,
    productionSecretNames: Object.keys(production.env_vars || {}),
    previewSecretNames: Object.keys(preview.env_vars || {}),
  };
}

function assertRuntimeUnchanged(before, after) {
  if (
    before.compatibilityDate &&
    after.compatibilityDate &&
    before.compatibilityDate !== after.compatibilityDate
  ) {
    throw new Error(
      `compatibility_date changed from ${before.compatibilityDate} to ${after.compatibilityDate}`,
    );
  }
  if (
    before.productionSecretNames.includes("RESEND_API_KEY") &&
    !after.productionSecretNames.includes("RESEND_API_KEY")
  ) {
    throw new Error(
      "deploy removed RESEND_API_KEY from the production environment",
    );
  }
}

async function githubRun(id) {
  const token = process.env.GH_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  if (!token || !repository)
    throw new Error("missing GitHub token or repository");
  const response = await fetch(
    `https://api.github.com/repos/${repository}/actions/runs/${id}`,
    {
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/vnd.github+json",
      },
    },
  );
  if (!response.ok)
    throw new Error(`CI run ${id} is not readable: ${response.status}`);
  return response.json();
}

function mainTip() {
  execFileSync("git", ["fetch", "origin", "main"], { stdio: "inherit" });
  return execFileSync("git", ["rev-parse", "origin/main"], {
    encoding: "utf8",
  }).trim();
}

async function main() {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) {
    console.error(
      "CLOUDFLARE_API_TOKEN is missing. Refusing to deploy. Create an API token with Account → Cloudflare Pages → Edit, scoped to this account only, and store it as the Actions secret CLOUDFLARE_API_TOKEN. Do not copy RESEND_API_KEY.",
    );
    process.exit(1);
  }
  const mode = process.env.DEPLOY_MODE;
  if (mode !== "push" && mode !== "promote" && mode !== "rollback") {
    throw new Error(`refusing unknown DEPLOY_MODE ${mode || "(empty)"}`);
  }
  const rollback = process.env.ROLLBACK_ID;
  const promote = process.env.PROMOTE_RUN_ID;
  if (rollback && promote)
    throw new Error("rollback and promote are mutually exclusive");
  if (rollback) {
    if (!/^[0-9a-f-]{36}$/i.test(rollback)) {
      throw new Error("ROLLBACK_ID must be a Pages deployment UUID");
    }
    const result = await api(
      token,
      `/accounts/${ACCOUNT}/pages/projects/${PROJECT}/deployments/${rollback}/rollback`,
      "POST",
    );
    console.log(`rolled back to ${result.id || rollback}`);
    return;
  }

  let expected = process.env.EXPECTED_SHA;
  if (mode === "promote") {
    if (!promote) throw new Error("promote requires PROMOTE_RUN_ID");
    expected = assertTrustedRun(
      await githubRun(promote),
      process.env.GITHUB_REPOSITORY,
    );
  }
  const bundle = join(process.cwd(), "deploy-bundle");
  const provenance = readJson(join(bundle, "provenance.json"));
  if (!expected || provenance.gitSha !== expected) {
    throw new Error(
      `artifact sha ${provenance.gitSha} does not match the trusted run ${expected}`,
    );
  }
  if (mode === "push") {
    assertFreshTip({
      mode,
      artifactSha: provenance.gitSha,
      mainSha: mainTip(),
    });
  }
  if (!existsSync(join(bundle, "functions/api/contato.ts"))) {
    throw new Error("artifact is missing functions/api/contato.ts");
  }
  if (
    !existsSync(join(bundle, "out/_routes.json")) ||
    !existsSync(join(bundle, "out/index.html"))
  ) {
    throw new Error("artifact is missing the Next export");
  }

  const project = await api(
    token,
    `/accounts/${ACCOUNT}/pages/projects/${PROJECT}`,
  );
  if (project.id !== "0812d498-5597-46c9-a277-6535de98c283") {
    throw new Error(`refusing unexpected Pages project id ${project.id}`);
  }
  const before = runtimeFacts(project);
  console.log(
    `rollback target ${project.canonical_deployment?.id || "unknown"} compatibility=${before.compatibilityDate || "unknown"} production_secrets=${before.productionSecretNames.join(",") || "none"}`,
  );
  const parity = existsSync(join(bundle, "parity-report.json"))
    ? readJson(join(bundle, "parity-report.json"))
    : { ok: false };
  const plan = decideDeploy({
    productionBranch: project.production_branch,
    parityOk: parity.ok === true,
  });
  if (
    plan.branch !== DEPLOY_BRANCH ||
    plan.branch === HISTORICAL_PRODUCTION_BRANCH
  ) {
    throw new Error("refusing to deploy any branch other than main");
  }
  console.log(
    `deploy plan environment=${plan.environment} production_branch=${project.production_branch} sha=${provenance.gitSha}`,
  );
  if (!plan.replacesProduction) {
    console.log(
      "preview upload only; changing production_branch later does not promote this deployment",
    );
  }

  const outputDir = join(bundle, "wrangler-output");
  mkdirSync(outputDir, { recursive: true });
  const message = `ci ${provenance.gitSha}`;
  await runWrangler(
    [
      "pages",
      "deploy",
      "out",
      "--project-name",
      PROJECT,
      "--branch",
      plan.branch,
      "--commit-hash",
      provenance.gitSha,
      "--commit-dirty=false",
      "--commit-message",
      message,
    ],
    bundle,
    outputDir,
  );
  const lines = readdirSync(outputDir)
    .filter((name) => name.endsWith(".json"))
    .flatMap((name) =>
      readFileSync(join(outputDir, name), "utf8").trim().split("\n"),
    );
  const detailed = lines
    .map((line) => JSON.parse(line))
    .find((entry) => entry.type === "pages-deploy-detailed");
  if (!detailed)
    throw new Error("wrangler did not write a pages deployment record");
  if (
    detailed.deployment_trigger?.metadata?.commit_hash !== provenance.gitSha
  ) {
    throw new Error("deployed commit hash does not match the tested artifact");
  }
  if (detailed.environment !== plan.environment) {
    throw new Error(
      `expected ${plan.environment} deployment, got ${detailed.environment}`,
    );
  }
  const afterProject = await api(
    token,
    `/accounts/${ACCOUNT}/pages/projects/${PROJECT}`,
  );
  assertRuntimeUnchanged(before, runtimeFacts(afterProject));
  await smoke(detailed.url);
  console.log(
    `deployment ${detailed.deployment_id} ${detailed.environment} ${detailed.url}`,
  );
}

if (isEntry) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
