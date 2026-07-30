import { useContent } from "@/hooks/use-language";
import { useSectionReveal } from "@/hooks/use-section-reveal";

export const SiteFooter = () => {
  const ref = useSectionReveal<HTMLElement>();
  const { footer } = useContent();

  return (
    <footer ref={ref} className="mt-12 pt-8 border-t border-border text-center">
      <p className="text-[14px] text-muted-foreground">{footer.text}</p>
    </footer>
  );
};
