# pdf-inspector-skill

A practical agent/Claude skill wrapper around `@firecrawl/pdf-inspector`.

## Install

```powershell
cd path\to\pdf-inspector-skill
npm install
```

Optional, for the full CLI-only feature set documented by pdf-inspector:

```powershell
cargo install pdf-inspector
```

## Test

```powershell
npm run selftest
```

## Example

```powershell
node .\scripts\pdf-tool.mjs "C:\Users\you\Desktop\paper.pdf" --json
```

Markdown only:

```powershell
node .\scripts\pdf-tool.mjs "C:\Users\you\Desktop\paper.pdf" --markdown
```

OCR routing plan:

```powershell
node .\scripts\pdf-tool.mjs "C:\Users\you\Desktop\paper.pdf" --ocr-plan
```

Specific pages (requires native CLI for exact page-selection behavior):

```powershell
node .\scripts\pdf-tool.mjs "C:\Users\you\Desktop\paper.pdf" --pages 1,3,5-10
```

## Important

`pdf-inspector` does not itself perform OCR. This skill detects/routs OCR-needed pages so the agent can use a separate OCR/vision capability for those pages.
