/**
 * Contact form → Resend → inbox. Cloudflare Pages Function (Workers Free:
 * 100k requests a day, fails instead of billing). Only /api/* invokes it
 * (public/_routes.json), so the static site stays free and unlimited.
 *
 * Secrets: RESEND_API_KEY (required). Optional CONTACT_TO, CONTACT_FROM.
 */
type Env = { RESEND_API_KEY?: string; CONTACT_TO?: string; CONTACT_FROM?: string };
type Context = { request: Request; env: Env };

const TO = "antoniozdm4@gmail.com";
// Works before a domain is verified in Resend, but only to the account's email.
const FROM = "Site tonin.tech <onboarding@resend.dev>";
const LIMITS = { name: 120, email: 200, company: 120, message: 4000 } as const;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const escape = (text: string) =>
  text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function read(form: FormData, key: keyof typeof LIMITS) {
  const value = String(form.get(key) ?? "").trim();
  return value.length > LIMITS[key] ? null : value;
}

export async function onRequestPost({ request, env }: Context) {
  if (!env.RESEND_API_KEY) return json(503, { error: "Envio indisponível no momento." });
  // Same-origin posts only.
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host)
    return json(403, { error: "Origem não permitida." });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json(400, { error: "Formulário inválido." });
  }
  // Honeypot: people never see this field, bots fill it. Pretend success.
  if (String(form.get("website") ?? "")) return json(200, { ok: true });

  const name = read(form, "name"),
    email = read(form, "email"),
    company = read(form, "company"),
    message = read(form, "message");
  if (!name || !email || message === null || company === null || message.length < 10)
    return json(422, { error: "Preencha nome, e-mail e uma mensagem com pelo menos 10 caracteres." });
  if (!EMAIL.test(email)) return json(422, { error: "Confira o e-mail informado." });

  const rows = [
    ["Nome", name],
    ["E-mail", email],
    ["Empresa", company || "—"],
  ];
  const html = `<h2>Novo desafio pelo site</h2>
<table>${rows.map(([k, v]) => `<tr><td><b>${k}</b></td><td>${escape(v)}</td></tr>`).join("")}</table>
<p style="white-space:pre-wrap">${escape(message)}</p>`;
  const text = `${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${message}`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: env.CONTACT_FROM || FROM,
      to: [env.CONTACT_TO || TO],
      reply_to: email,
      subject: `Desafio de ${name}${company ? ` (${company})` : ""}`,
      html,
      text,
    }),
  });
  if (!response.ok) {
    console.error("resend", response.status, await response.text());
    return json(502, { error: "Não consegui enviar agora. Tente de novo em instantes." });
  }
  return json(200, { ok: true });
}
