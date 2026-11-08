import { spawn } from "node:child_process";
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
    };
  }
  throw new Error(`unexpected Pages production_branch: ${productionBranch}`);
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
  if (
    !type.includes("application/json") ||
    ![400, 422, 503].includes(contact.status)
  ) {
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

async function main() {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) {
    console.error(
      "CLOUDFLARE_API_TOKEN is missing. Refusing to deploy. Create an API token with Account → Cloudflare Pages → Edit, scoped to this account only, and store it as the Actions secret CLOUDFLARE_API_TOKEN. Do not copy RESEND_API_KEY.",
    );
    process.exit(1);
  }
  const rollback = process.env.ROLLBACK_ID;
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

  const bundle = join(process.cwd(), "deploy-bundle");
  const provenance = readJson(join(bundle, "provenance.json"));
  const expected = process.env.EXPECTED_SHA;
  if (!expected || provenance.gitSha !== expected) {
    throw new Error(
      `artifact sha ${provenance.gitSha} does not match EXPECTED_SHA ${expected}`,
    );
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
  if (plan.replacesProduction) {
    console.log(
      `current canonical deployment ${project.canonical_deployment?.id || "unknown"} is the rollback target`,
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
