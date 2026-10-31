"use client";

import { useState, type FormEvent } from "react";

type Status = "idle" | "sending" | "sent" | "error";

/** Posts to the Pages Function at /api/contato, which forwards via Resend. */
export default function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus("sending");
    setError("");
    try {
      const response = await fetch("/api/contato", {
        method: "POST",
        body: new FormData(form),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Não consegui enviar agora.");
      form.reset();
      setStatus("sent");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Não consegui enviar agora.");
      setStatus("error");
    }
  }

  if (status === "sent")
    return (
      <p className="contact-sent" role="status">
        Recebido. Respondo em até dois dias úteis.
      </p>
    );

  return (
    <form className="contact-form" onSubmit={handleSubmit} noValidate={false}>
      <label>
        <span>Nome</span>
        <input name="name" required maxLength={120} autoComplete="name" />
      </label>
      <label>
        <span>E-mail</span>
        <input name="email" type="email" required maxLength={200} autoComplete="email" />
      </label>
      <label className="contact-wide">
        <span>Empresa (opcional)</span>
        <input name="company" maxLength={120} autoComplete="organization" />
      </label>
      <label className="contact-wide">
        <span>Qual é o desafio?</span>
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={4000}
          rows={5}
          placeholder="O que toma tempo da sua equipe hoje?"
        />
      </label>
      {/* Honeypot, hidden from people and assistive tech. */}
      <input className="contact-trap" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <div className="contact-submit contact-wide">
        <button className="button button-primary" type="submit" disabled={status === "sending"}>
          {status === "sending" ? "Enviando…" : "Enviar desafio"} <span aria-hidden="true">↗</span>
        </button>
        <p role="alert" className="contact-error">
          {error}
        </p>
      </div>
    </form>
  );
}
