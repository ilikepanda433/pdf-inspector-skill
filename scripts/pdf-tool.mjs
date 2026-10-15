#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { processPdf, classifyPdf } from '@firecrawl/pdf-inspector';

function help() {
  console.log(`pdf-inspector skill wrapper

Usage:
  node scripts/pdf-tool.mjs <file.pdf> [options]

Core options:
  --mode auto|extract|classify   Default: auto
  --json                         Emit structured JSON
  --markdown                     Emit Markdown only when available
  --meta                         Emit classification/metadata summary
  --ocr-plan                     Emit pages that should be routed to OCR
  --pages 1,3,5-10               Prefer exact page selection via native CLI if available
  --page-markers                 Prefer native page break markers via CLI if available
  --compact                      Prefer token-efficient native CLI output if available
  --items-json                   Prefer positioned TextItem JSON via native CLI if available
  --analyze                      Prefer layout analysis (tables/columns) via detect-pdf CLI
  --raw                          Prefer raw markdown via native CLI if available
  --native-cli                   Force native pdf2md/detect-pdf CLI path
  --help                         Show this help

Notes:
  - The Node binding always supports processPdf()/classifyPdf().
  - CLI-only features are used when pdf2md/detect-pdf are installed and available on PATH.
  - This wrapper never pretends to OCR. It reports OCR-needed pages so an agent can route them to an OCR-capable tool.
`);
}

function parseArgs(argv) {
  const out = { mode: 'auto' };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { positional.push(a); continue; }
    if (a === '--help') out.help = true;
    else if (a === '--json') out.json = true;
    else if (a === '--markdown') out.markdown = true;
    else if (a === '--meta') out.meta = true;
    else if (a === '--ocr-plan') out.ocrPlan = true;
    else if (a === '--page-markers') out.pageMarkers = true;
    else if (a === '--compact') out.compact = true;
    else if (a === '--items-json') out.itemsJson = true;
    else if (a === '--analyze') out.analyze = true;
    else if (a === '--raw') out.raw = true;
    else if (a === '--native-cli') out.nativeCli = true;
    else if (a === '--mode') out.mode = argv[++i];
    else if (a === '--pages') out.pages = argv[++i];
    else throw new Error(`Unknown option: ${a}`);
  }
  out.file = positional[0];
  return out;
}

function commandExists(cmd) {
  const probe = process.platform === 'win32' ? 'where' : 'which';
  return spawnSync(probe, [cmd], { stdio: 'ignore' }).status === 0;
}

function runNative(file, args) {
  const detection = args.mode === 'classify' || args.analyze;
  const cmd = detection ? 'detect-pdf' : 'pdf2md';
  if (!commandExists(cmd)) return null;
  const cli = [file];
  if (detection) {
    if (args.json || args.analyze) cli.push('--json');
    if (args.analyze) cli.push('--analyze');
  } else {
    if (args.json) cli.push('--json');
    if (args.itemsJson) cli.push('--items-json');
    if (args.raw) cli.push('--raw');
    if (args.compact) cli.push('--compact');
    if (args.pageMarkers) cli.push('--pages');
    if (args.pages) cli.push('--select-pages', args.pages);
  }
  const p = spawnSync(cmd, cli, { encoding: 'utf8' });
  if (p.error) throw p.error;
  if (p.status !== 0) throw new Error(p.stderr || `${cmd} exited with ${p.status}`);
  process.stdout.write(p.stdout);
  return true;
}

function normalizeResult(result) {
  if (!result || typeof result !== 'object') return result;
  const ocrPages = result.pagesNeedingOcr ?? result.pages_needing_ocr ?? result.pagesNeedingOCR ?? [];
  return {
    pdfType: result.pdfType ?? result.pdf_type ?? null,
    confidence: result.confidence ?? null,
    pagesNeedingOcr: ocrPages,
    markdown: result.markdown ?? null,
    ...result
  };
}

function printOcrPlan(r) {
  const pages = r?.pagesNeedingOcr ?? [];
  const type = r?.pdfType ?? 'Unknown';
  console.log(JSON.stringify({
    pdfType: type,
    pagesNeedingOcr: pages,
    needsOcr: pages.length > 0 || ['Scanned', 'ImageBased', 'Mixed', 'scanned', 'image_based', 'mixed'].includes(type),
    policy: pages.length > 0
      ? 'Send only listed pages to an OCR-capable tool, then merge with native-text extraction in page order.'
      : 'No OCR pages were reported by the binding. For image-only/scanned classifications, route the document to OCR.'
  }, null, 2));
}

try {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.file) { help(); process.exit(args.help ? 0 : 2); }
  const file = resolve(args.file);
  if (!existsSync(file)) throw new Error(`File not found: ${file}`);

  const wantsCliFeature = args.nativeCli || args.pages || args.pageMarkers || args.compact || args.itemsJson || args.analyze || args.raw;
  if (wantsCliFeature) {
    const ok = runNative(file, args);
    if (ok) process.exit(0);
    if (args.nativeCli) throw new Error('Native pdf2md/detect-pdf CLI not found on PATH. Install the Rust CLI with: cargo install pdf-inspector');
    console.error('[pdf-skill] Native CLI not found; falling back to Node binding. CLI-only flags cannot be applied exactly.');
  }

  const bytes = readFileSync(file);
  let result;
  if (args.mode === 'classify') result = classifyPdf(bytes);
  else result = processPdf(bytes);
  const r = normalizeResult(result);

  if (args.ocrPlan) printOcrPlan(r);
  else if (args.markdown) process.stdout.write(r?.markdown ?? '');
  else if (args.meta) {
    const { markdown, ...meta } = r ?? {};
    console.log(JSON.stringify(meta, null, 2));
  } else if (args.json) console.log(JSON.stringify(r, null, 2));
  else if (r?.markdown) process.stdout.write(r.markdown);
  else console.log(JSON.stringify(r, null, 2));
} catch (err) {
  console.error(`[pdf-skill] ${err?.message ?? String(err)}`);
  process.exit(1);
}
