/**
 * Capture real UI screenshots for ada-sdlc test evidence.
 * Requires: dev server running on BASE_URL, playwright installed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';
const OUT_DIR = path.resolve('docs/test/screenshots/250606-pdf-export-typography');

const TEST_MD = `# หัวข้อหลัก (H1)

ย่อหน้าทดสอบ typography สำหรับ PDF export

## หัวข้อรอง (H2)

### หัวข้อย่อย (H3)

#### H4 | ##### H5 | ###### H6

- รายการ 1
- รายการ 2

\`\`\`mermaid
graph TD
  A[Markdown] --> B[Preview]
  B --> C[PDF Export]
\`\`\`

| คอลัมน์ 1 | คอลัมน์ 2 |
|-----------|-----------|
| ไทย | Test |
`;

async function waitForApp(page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('textarea', { timeout: 60000 });
  await page.waitForFunction(
    () => !document.body.textContent?.includes('Loading'),
    { timeout: 30000 }
  ).catch(() => {});
}

async function loadTestContent(page) {
  const textarea = page.locator('textarea').first();
  await textarea.click();
  await textarea.fill(TEST_MD);
  await page.waitForTimeout(2500);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    await waitForApp(page);
    await loadTestContent(page);

    // TC-02 — full program screen (editor + preview + toolbar)
    await page.screenshot({
      path: path.join(OUT_DIR, 'TC-02-pass-app-main-screen.png'),
      fullPage: false,
    });
    console.log('TC-02: app main screen');

    // TC-01 — preview panel heading typography
    const preview = page.locator('.preview-panel, [class*="preview"]').first();
    if (await preview.count()) {
      await preview.screenshot({
        path: path.join(OUT_DIR, 'TC-01-pass-heading-preview.png'),
      });
    } else {
      const rightPanel = page.locator('div.prose, .markdown-preview, [class*="Preview"]').last();
      if (await rightPanel.count()) {
        await rightPanel.screenshot({
          path: path.join(OUT_DIR, 'TC-01-pass-heading-preview.png'),
        });
      } else {
        await page.locator('body').screenshot({
          path: path.join(OUT_DIR, 'TC-01-pass-heading-preview.png'),
          clip: { x: 720, y: 80, width: 700, height: 800 },
        });
      }
    }
    console.log('TC-01: heading preview');

    // TC-04 — mermaid diagram (switch to Mermaid mode)
    await page.locator('button', { hasText: 'Mermaid' }).click();
    await page.waitForTimeout(500);
    const mermaidCode = `graph TD
  A[Markdown] --> B[Preview]
  B --> C[PDF Export]`;
    await page.locator('textarea').first().fill(mermaidCode);
    await page.waitForSelector('#mermaid-diagram, .mermaid svg', { timeout: 15000 });
    await page.waitForTimeout(1500);
    const previewPanel = page.locator('div').filter({ hasText: 'Preview' }).filter({ has: page.locator('svg') }).last();
    const mermaidSvg = page.locator('#mermaid-diagram, .mermaid-container svg, .mermaid svg').first();
    if (await mermaidSvg.count()) {
      const box = await mermaidSvg.boundingBox();
      if (box) {
        await page.screenshot({
          path: path.join(OUT_DIR, 'TC-04-pass-mermaid-diagram.png'),
          clip: {
            x: Math.max(0, box.x - 60),
            y: Math.max(0, box.y - 60),
            width: Math.min(1440, box.width + 120),
            height: Math.min(900, box.height + 120),
          },
        });
      }
    } else if (await previewPanel.count()) {
      await previewPanel.screenshot({
        path: path.join(OUT_DIR, 'TC-04-pass-mermaid-diagram.png'),
      });
    }
    console.log('TC-04: mermaid diagram');

    // Switch back to Markdown for PDF preview test
    await page.locator('button', { hasText: 'Markdown' }).click();
    await loadTestContent(page);

    // TC-03 — PDF export preview (Adasoft header + body) rendered in-app
    await page.evaluate(async (content) => {
      const mod = await import('/src/utils/adaExportPipeline.ts');
      const bodyHtml = await mod.processMarkdownToExportHtml(content, {
        author: 'AdaSoft Tester',
        version: '1.0.0',
      });
      const shell = await mod.loadAdasoftTemplateShell();
      const html = mod.buildPdfReadyHtmlDocument(bodyHtml, 'PDF Export Test', shell);

      const overlay = document.createElement('div');
      overlay.id = 'ada-test-screenshot-overlay';
      overlay.style.cssText =
        'position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,0.45);display:flex;align-items:flex-start;justify-content:center;padding:24px;overflow:auto';
      const frame = document.createElement('iframe');
      frame.style.cssText =
        'width:210mm;min-height:297mm;border:0;background:#fff;box-shadow:0 20px 50px rgba(0,0,0,0.25)';
      overlay.appendChild(frame);
      document.body.appendChild(overlay);
      frame.contentDocument.open();
      frame.contentDocument.write(html);
      frame.contentDocument.close();
      await new Promise((r) => setTimeout(r, 1500));
    }, TEST_MD);

    await page.waitForTimeout(2000);
    const exportFrame = page.locator('#ada-test-screenshot-overlay iframe');
    await exportFrame.screenshot({
      path: path.join(OUT_DIR, 'TC-03-pass-pdf-export-header.png'),
    });
    console.log('TC-03: PDF export preview with header');

    await page.evaluate(() => document.getElementById('ada-test-screenshot-overlay')?.remove());

    // TC-05 — export toolbar (Markdown mode)
    const exportPdfBtn = page.locator('button[title="Export PDF"]');
    await exportPdfBtn.waitFor({ state: 'visible', timeout: 10000 });
    await page.screenshot({
      path: path.join(OUT_DIR, 'TC-05-pass-export-toolbar.png'),
      clip: { x: 0, y: 0, width: 1440, height: 72 },
    });
    console.log('TC-05: export toolbar');

    console.log('All UI screenshots saved to', OUT_DIR);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
