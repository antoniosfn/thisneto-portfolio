import { useState } from "react";
import { Check, Copy, Mail } from "lucide-react";
import { toast } from "sonner";
import { Icons } from "@/components/ui/icons";
import { LINKS } from "@/content";
import { useContent, useLanguage } from "@/hooks/use-language";
import { copyText } from "@/lib/clipboard";
import { useSectionReveal } from "@/hooks/use-section-reveal";
import { useHeadingReveal } from "@/hooks/use-heading-reveal";

const COPIED_FEEDBACK_MS = 2000;

export const ContactSection = () => {
  const ref = useSectionReveal<HTMLElement>();
  const { language } = useLanguage();
  const { contact } = useContent();
  const [hasCopied, setHasCopied] = useState(false);

  useHeadingReveal(ref, "[data-contact='heading']", { deps: [language] });

  const handleCopy = async () => {
    const copied = await copyText(LINKS.email);
    if (!copied) {
      toast.error(contact.copyFailedToast);
      return;
    }
    setHasCopied(true);
    toast.success(contact.copyToast);
    setTimeout(() => setHasCopied(false), COPIED_FEEDBACK_MS);
  };

  const mailtoHref = `mailto:${LINKS.email}?subject=${encodeURIComponent(contact.mailtoSubject)}`;

  return (
    <section ref={ref} id="contato" className="mt-16 scroll-mt-8" aria-label={contact.ariaLabel}>
      <h2 className="text-[21px] font-medium mb-4 overflow-hidden">
        <span data-contact="heading" className="inline-block">
          {contact.heading}
        </span>
      </h2>

      <p className="text-[15px] leading-relaxed mb-6">{contact.lead}</p>

      <div className="flex flex-wrap items-center gap-3">
        <a
          href={mailtoHref}
          className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-3 font-medium text-accent-foreground transition-colors hover:bg-accent/90"
        >
          <Mail className="w-5 h-5" aria-hidden="true" />
          {contact.ctaLabel}
        </a>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-3 text-[15px] text-muted-foreground transition-colors hover:border-accent hover:text-accent"
        >
          {hasCopied ? (
            <Check className="w-5 h-5" aria-hidden="true" />
          ) : (
            <Copy className="w-5 h-5" aria-hidden="true" />
          )}
          {hasCopied ? contact.copiedLabel : contact.copyLabel}
        </button>
      </div>

      <p className="mt-4 font-mono text-[14px] text-muted-foreground">{LINKS.email}</p>

      <ul className="flex gap-4 mt-6 p-0">
        <li className="list-none">
          <a
            href={LINKS.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={contact.linkedinLabel}
            className="text-muted-foreground hover:text-accent transition-colors"
          >
            <Icons.linkedin className="w-6 h-6" />
          </a>
        </li>
        <li className="list-none">
          <a
            href={LINKS.github}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={contact.githubLabel}
            className="text-muted-foreground hover:text-accent transition-colors"
          >
            <Icons.github className="w-6 h-6" />
          </a>
        </li>
      </ul>
    </section>
  );
};
