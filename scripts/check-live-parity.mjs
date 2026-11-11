import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const liveOrigin = process.env.PARITY_ORIGIN || "https://tonin.tech";
const bundle = join(root, "deploy-bundle");
mkdirSync(bundle, { recursive: true });

/** Drop the loading veil. Its copy is the change under test; production still
 * serves the old counter, and the rest of the page must still match. */
function stripLoader(html) {
  const start = html.search(/<div[^>]*class="site-loader"/);
  if (start < 0) return html;
  const tags = /<\/?div\b[^>]*>/gi;
  tags.lastIndex = start;
  let depth = 0;
  let match;
  while ((match = tags.exec(html))) {
    depth += match[0].startsWith("</") ? -1 : 1;
    if (depth === 0)
      return html.slice(0, start) + html.slice(match.index + match[0].length);
  }
  return html;
}

const visible = (html) =>
  stripLoader(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

async function fetchBytes(path) {
  const response = await fetch(new URL(path, liveOrigin), {
    headers: { "accept-encoding": "identity", "cache-control": "no-cache" },
    redirect: "follow",
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  return { status: response.status, bytes };
}

const builtHtml = readFileSync(join(root, "out/index.html"), "utf8");
const livePage = await fetchBytes("/");
const builtText = visible(builtHtml);
const liveText = visible(livePage.bytes.toString("utf8"));
const required = [
  "Antonio Neto | IA, automação e software",
  "Menos tarefas",
  "Falar do projeto",
  "Conte seu desafio",
];
const phrases = required.map((phrase) => ({
  phrase,
  built: builtText.includes(phrase),
  live: liveText.includes(phrase),
}));

const stable = [
  "fonts/inter.woff2",
  "fonts/league-spartan.woff2",
  "fonts/manrope.woff2",
  "fonts/MANROPE-OFL.txt",
  "images/antonio-neto.jpg",
  "particles/forms.bin",
  "particles/finale.bin",
  "favicon.svg",
  "cursor.svg",
];
const assets = [];
for (const path of stable) {
  const local = readFileSync(join(root, "out", path));
  const remote = await fetchBytes("/" + path);
  const normalize = path.endsWith(".svg")
    ? (buf) =>
        Buffer.from(
          buf.toString("utf8").replace(/\r\n/g, "\n").replace(/\r/g, ""),
        )
    : (buf) => buf;
  const localHash = createHash("sha256").update(normalize(local)).digest("hex");
  const remoteHash = createHash("sha256")
    .update(normalize(remote.bytes))
    .digest("hex");
  assets.push({
    path,
    status: remote.status,
    equal: remote.status === 200 && localHash === remoteHash,
    bytes: { built: local.length, live: remote.bytes.length },
  });
}

const textEqual = builtText === liveText;
const phrasesOk = phrases.every((item) => item.built && item.live);
const assetsOk = assets.every((item) => item.equal);
const ok = textEqual && phrasesOk && assetsOk;
const report = {
  ok,
  origin: liveOrigin,
  textEqual,
  phrases,
  assets,
  limits: [
    "Comparação do HTML visível e dos arquivos estáveis de public/. Não reconstrói o diff commit_dirty.",
    "O véu .site-loader fica de fora: o contador muda de propósito e a produção ainda serve o texto antigo.",
    "Os bundles /_next/static mudam de hash a cada build do Next e não entram nesta igualdade.",
  ],
};
writeFileSync(
  join(bundle, "parity-report.json"),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify({ ok, textEqual, phrasesOk, assetsOk }, null, 2));
if (!ok) process.exit(1);
