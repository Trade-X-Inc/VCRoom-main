// Maps a /docs/* slug to its page module. Content commits register sections here.
import type { DocPage } from "./primitives";
import { SECURITY_PAGES } from "./content/security";
import { CHANGELOG_PAGES } from "./content/changelog";
import { FOUNDER_PAGES } from "./content/founders";
import { INVESTOR_PAGES } from "./content/investors";
import { DEAL_ROOM_PAGES } from "./content/deal-rooms";
import { AI_PAGES } from "./content/ai";

const SECTIONS: Record<string, DocPage>[] = [
  FOUNDER_PAGES,
  INVESTOR_PAGES,
  DEAL_ROOM_PAGES,
  AI_PAGES,
  SECURITY_PAGES,
  CHANGELOG_PAGES,
];

export const DOCS_PAGES: Record<string, DocPage> = Object.assign({}, ...SECTIONS);

export function getDocPage(slug: string): DocPage | undefined {
  return DOCS_PAGES[slug];
}
