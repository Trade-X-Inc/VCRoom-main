// Maps a /docs/* slug to its page module. Content commits register sections here.
import type { DocPage } from "./primitives";

const SECTIONS: Record<string, DocPage>[] = [
  // Populated by content modules — one import per docs section.
];

export const DOCS_PAGES: Record<string, DocPage> = Object.assign({}, ...SECTIONS);

export function getDocPage(slug: string): DocPage | undefined {
  return DOCS_PAGES[slug];
}
