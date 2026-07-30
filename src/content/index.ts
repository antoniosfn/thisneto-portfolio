import { en } from "./en";
import { pt } from "./pt";
import type { Language, SiteContent } from "./types";

export const content: Record<Language, SiteContent> = { pt, en };

export type { Language, SiteContent };
export * from "./types";
export { LINKS } from "./links";

// A interface SiteContent garante que nenhuma chave falte, mas não que os arrays
// tenham o mesmo tamanho nos dois idiomas. Esta checagem cobre essa lacuna em dev.
if (import.meta.env.DEV) {
  const counts: Array<[string, number, number]> = [
    ["nav.items", pt.nav.items.length, en.nav.items.length],
    ["intro.languages", pt.intro.languages.length, en.intro.languages.length],
    ["intro.softSkills", pt.intro.softSkills.length, en.intro.softSkills.length],
    ["experience.items", pt.experience.items.length, en.experience.items.length],
    [
      "education.inProgress",
      pt.education.items.inProgress.length,
      en.education.items.inProgress.length,
    ],
    ["education.completed", pt.education.items.completed.length, en.education.items.completed.length],
    ["tech.items", pt.tech.items.length, en.tech.items.length],
    ["projects.featured", pt.projects.featured.length, en.projects.featured.length],
    ["projects.academic", pt.projects.academic.length, en.projects.academic.length],
  ];

  for (const [path, ptCount, enCount] of counts) {
    if (ptCount !== enCount) {
      throw new Error(
        `[content] Divergência entre idiomas em "${path}": pt tem ${ptCount} item(ns), en tem ${enCount}.`,
      );
    }
  }
}
