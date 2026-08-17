/**
 * ada-sdlc Phase 5 — UI screenshots for Project grouping feature.
 * Requires: dev server on BASE_URL (default http://localhost:5173)
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';
const TOPIC = '250606-project-grouping';
const OUT_DIR = path.resolve(`docs/test/screenshots/${TOPIC}`);
const PROJECT_NAME = 'AdaPos D365';
const DOC_IN_PROJECT = 'Integration Spec';

async function waitForApp(page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('textarea', { timeout: 60000 });
  await page
    .waitForFunction(() => !document.body.textContent?.includes('Loading'), {
      timeout: 30000,
    })
    .catch(() => {});
  await page.waitForTimeout(800);
}

async function shotSidebar(page, filename, fullApp = false) {
  const out = path.join(OUT_DIR, filename);
  if (fullApp) {
    await page.screenshot({ path: out, fullPage: false });
    return;
  }
  await page.screenshot({
    path: out,
    clip: { x: 0, y: 0, width: 400, height: 900 },
  });
}

async function ensureSeedDocument(page) {
  const newBtn = page.getByRole('button', { name: /^New$/ });
  if (await page.getByText('No documents yet').isVisible().catch(() => false)) {
    await page.getByText('Create your first document').click();
  } else if (await newBtn.isVisible()) {
    await newBtn.click();
  }
  const titleInput = page.locator('input[placeholder="Document title..."]');
  if (await titleInput.isVisible().catch(() => false)) {
    await titleInput.fill('Seed Document');
    await page
      .locator('div', { has: page.locator('input[placeholder="Document title..."]') })
      .getByRole('button', { name: 'Create', exact: true })
      .click();
    await page.waitForTimeout(600);
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    await waitForApp(page);
    await ensureSeedDocument(page);

    // TC-01 — Projects section (empty state hint)
    await page.getByText('Projects').first().scrollIntoViewIfNeeded();
    await shotSidebar(page, 'TC-01-pass-projects-section-empty.png');
    console.log('TC-01: projects section');

    // TC-02 — open New Project form
    await page.locator('button[title="New project"]').first().click();
    await page.waitForSelector('text=New Project');
    await shotSidebar(page, 'TC-02-pass-new-project-form.png');
    console.log('TC-02: new project form');

    // TC-03 — fill project name + pick color
    await page.locator('input[placeholder="Project name..."]').fill(PROJECT_NAME);
    const projectForm = page.locator('div', {
      has: page.locator('input[placeholder="Project name..."]'),
    });
    const colorButtons = projectForm.locator('button[type="button"][title^="#"]');
    if ((await colorButtons.count()) > 2) {
      await colorButtons.nth(2).click();
    }
    await shotSidebar(page, 'TC-03-pass-new-project-filled.png');
    console.log('TC-03: project form filled');

    // TC-04 — create project
    await projectForm.locator('button', { hasText: 'Add' }).click();
    await page.waitForSelector(`text=${PROJECT_NAME}`);
    await shotSidebar(page, 'TC-04-pass-project-created.png');
    console.log('TC-04: project created');

    // TC-05 — new document in project form
    const projectRow = page.locator('div').filter({ hasText: PROJECT_NAME }).first();
    await projectRow.hover();
    await page.locator('button[title="New document in project"]').first().click();
    await page.waitForSelector(`text=New Document`);
    await page.waitForSelector(`text=in ${PROJECT_NAME}`);
    await shotSidebar(page, 'TC-05-pass-new-doc-in-project-form.png');
    console.log('TC-05: new doc in project form');

    // TC-06 — document under project
    await page.locator('input[placeholder="Document title..."]').fill(DOC_IN_PROJECT);
    await page
      .locator('div', { has: page.locator('input[placeholder="Document title..."]') })
      .getByRole('button', { name: 'Create', exact: true })
      .click();
    await page.waitForSelector(`text=${DOC_IN_PROJECT}`);
    await shotSidebar(page, 'TC-06-pass-doc-grouped-in-project.png');
    console.log('TC-06: doc grouped in project');

    // TC-07 — project color picker
    await projectRow.hover();
    await page.locator('button[title="Change color"]').first().click();
    await page.waitForSelector('text=Project color');
    await shotSidebar(page, 'TC-07-pass-project-color-picker.png');
    console.log('TC-07: color picker');

    // TC-08 — full app with project sidebar visible
    await page.locator('button[title="Change color"]').first().click().catch(() => {});
    await shotSidebar(page, 'TC-08-pass-app-with-project-sidebar.png', true);
    console.log('TC-08: full app with project sidebar');

    console.log('All project UI screenshots saved to', OUT_DIR);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
