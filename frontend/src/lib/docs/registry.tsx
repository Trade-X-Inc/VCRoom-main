// Maps a /docs/* slug to its page module. Content commits register sections here.
import type { DocPage } from "./primitives";
import { SECURITY_PAGES } from "./content/security";
import { CHANGELOG_PAGES } from "./content/changelog";

const SECTIONS: Record<string, DocPage>[] = [
  SECURITY_PAGES,
  CHANGELOG_PAGES,
];

export const DOCS_PAGES: Record<string, DocPage> = Object.assign({}, ...SECTIONS);

export function getDocPage(slug: string): DocPage | undefined {
  return DOCS_PAGES[slug];
}
