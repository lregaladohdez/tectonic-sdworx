<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Visual style

The base style is the SD Worx palette with a Memphis Milano treatment (cream paper, ink outlines, hard offset shadows, patterns, tilted blocks). Read `docs/STYLE.md` before touching `globals.css`, the landing page or the Remotion compositions, and use the shapes in `src/components/MemphisShapes.tsx` instead of drawing new ones. Inside `src/remotion`, import shared code with relative paths: the Remotion bundler does not resolve the `@/` alias.
