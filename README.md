# 心事書櫃｜日式深夜解憂書房

Buildless responsive interactive site. Serve `docs/` as the static root (GitHub Pages: branch main, folder /docs).

## Implemented

- Full-viewport first-person rainy street prologue with nine independently rendered 1672 × 941 shots, image decoding before each transition, and opt-in synthesized audio with 阿墨, a skippable route into the bookroom, and a farewell.
- Five washi flower cards, original SVG botanical motifs and generated midnight bookshop background.
- Question entry, 18 supported contexts, contextual keyword scoring, and one Chinese book per result from 14 verified bibliographic records.
- In-browser clarification when two distinct topics have close scores.
- Six-beat aurora selection using WebP storyboard frames, motion overlays, and skip and reduced-motion controls.
- Positive original maxims, original parables clearly labeled as fiction, optional concrete small actions.
- Recent-work deduplication, explicit replacement, no-match and depleted-catalog handling.
- Device-local bookmarks, text export, copying, feedback, deletion controls.
- Verified library entry links, available direct catalog/ebook links, title/ISBN copying. No live shelf-state claims.

## Data boundaries

No remote AI call, catalog crawler or backend database is implemented. Content is curated in `dist/data.js`; matching is in `dist/app.js`. The live UI discloses this under About. No submitted question leaves the browser or is persisted. Bibliographic facts include traceable source links; summaries, parables and reading prompts are original. Decorative covers are not publisher covers. Library sources do not constitute blanket licenses to copy their descriptions or content.

Formal AI expansion needs licensed content ingestion, a server-side secret and request limits. Restrict book selection to known records and validate returned IDs. Public library borrowing and ebook access depend on the individual library; users go to official systems for actual availability and reservation.

## Verify

`node --check docs/app.js`
`node --check docs/data.js`
`node tests/recommendation-check.cjs`

The test checks concrete query behavior, card versus content precedence, unknown questions, deduplication, candidate coverage and ISBN checksums. Browser QA covers the main ritual, bookmarks and library dialog. Static assets require no package installation.
