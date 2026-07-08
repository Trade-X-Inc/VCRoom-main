// Maps a /docs/* slug to its page module. Content commits register sections here.
import type { DocPage } from "./primitives";
import { SECURITY_PAGES } from "./content/security";

const SECTIONS: Record<string, DocPage>[] = [
  SECURITY_PAGES,
];

export const DOCS_PAGES: Record<string, DocPage> = Object.assign({}, ...SECTIONS);

export function getDocPage(slug: string): DocPage | undefined {
  return DOCS_PAGES[slug];
}
