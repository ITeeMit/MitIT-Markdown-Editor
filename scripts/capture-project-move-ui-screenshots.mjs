/**
 * ada-sdlc Phase 5 — UI screenshots: move doc between projects + grouping.
 * Requires: dev server on BASE_URL
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';
const TOPIC = '250606-project-move-grouping';
const OUT_DIR = path.resolve(`docs/test/screenshots/${TOPIC}`);
const PROJECT_A = 'AdaPos D365';
const PROJECT_B = 'MitIT Docs';
const DOC_UNCAT = 'Sales Report';
const DOC_MOVE = 'API Spec';

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

/** Desktop file manager root (single instance at lg viewport) */
function sidebar(page) {
  return page
    .locator('input[placeholder="Search documents..."]:visible')
    .first()
    .locator('xpath=ancestor::div[contains(@class,"flex-col") and contains(@class,"h-full")][1]');
}

async function shotSidebar(page, filename, clipWidth = 400) {
  await page.screenshot({
    path: path.join(OUT_DIR, filename),
    clip: { x: 0, y: 0, width: clipWidth, height: 900 },
  });
}

async function createDocument(page, title, projectName) {
  const sb = sidebar(page);
  if (!projectName && (await sb.getByText('No documents yet').isVisible().catch(() => false))) {
    await sb.getByText('Create your first document').click();
  } else if (projectName) {
    const row = sb.locator('div').filter({ hasText: projectName }).first();
    await row.hover();
    await sb.locator('button[title="New document in project"]').click();
  } else {
    await sb.getByRole('button', { name: /^New$/ }).click();
  }
  const titleInput = sb.locator('input[placeholder="Document title..."]');
  await titleInput.waitFor({ state: 'visible', timeout: 10000 });
  await titleInput.fill(title);
  await titleInput.press('Enter');
  await page.waitForTimeout(600);
}

async function createProject(page, name) {
  const sb = sidebar(page);
  await sb.locator('button[title="New project"]').click();
  const nameInput = sb.locator('input[placeholder="Project name..."]');
  await nameInput.waitFor({ state: 'visible' });
  await nameInput.fill(name);
  await nameInput.press('Enter');
  await page.waitForTimeout(600);
}

function docRow(page, title, context) {
  const sb = sidebar(page);
  if (context === 'Uncategorized') {
    return sb.locator('[draggable="true"]').filter({ hasText: title }).last();
  }
  return sb
    .locator('div.mb-1')
    .filter({ hasText: context })
    .locator('[draggable="true"]')
    .filter({ hasText: title })
    .first();
}

function docRowAny(page, title) {
  return sidebar(page).locator('[draggable="true"]').filter({ hasText: title }).first();
}

async function openDocMenu(page, title, section = 'Uncategorized') {
  const row = section ? docRow(page, title, section) : docRowAny(page, title);
  await row.hover();
  await row.locator('button').last().click();
  await page.waitForTimeout(200);
  return row;
}

async function clickMoveToProject(page, title, projectName, section = 'Uncategorized') {
  const row = await openDocMenu(page, title, section);
  await row.getByRole('button', { name: 'Move to...' }).click();
  await page.waitForTimeout(200);
  if (projectName === 'Uncategorized') {
    await row.getByRole('button', { name: 'Uncategorized', exact: true }).click();
  } else {
    await row.getByRole('button', { name: projectName, exact: true }).click();
  }
  await page.waitForTimeout(500);
}

async function expandProject(page, projectName) {
  const sb = sidebar(page);
  const node = sb.locator('div.mb-1').filter({ hasText: projectName }).first();
  await node.hover();
  // click project row to expand if child docs not visible
  const child = node.locator('[draggable="true"]').first();
  if (!(await child.isVisible().catch(() => false))) {
    await node.locator('button').first().click();
    await page.waitForTimeout(300);
  }
}

async function seedData(page) {
  await createDocument(page, DOC_UNCAT);
  await createProject(page, PROJECT_A);
  await createProject(page, PROJECT_B);
  await createDocument(page, DOC_MOVE);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    await waitForApp(page);
    await seedData(page);

    const sb = sidebar(page);

    // TC-01 — grouping overview: 2 projects + uncategorized docs
    await sb.getByText('Projects').first().scrollIntoViewIfNeeded();
    await shotSidebar(page, 'TC-01-pass-grouping-tree-overview.png');
    console.log('TC-01: grouping overview');

    // TC-02 — Move to... menu with project list (T-12)
    const salesRow = await openDocMenu(page, DOC_UNCAT, 'Uncategorized');
    await salesRow.getByRole('button', { name: 'Move to...' }).click();
    await page.waitForTimeout(300);
    await shotSidebar(page, 'TC-02-pass-move-to-menu.png');
    console.log('TC-02: move to menu');

    // TC-03 — move doc to project A via menu
    await salesRow.getByRole('button', { name: PROJECT_A, exact: true }).click();
    await page.waitForTimeout(500);
    await shotSidebar(page, 'TC-03-pass-doc-moved-to-project-a.png');
    console.log('TC-03: moved to project A');

    // TC-04 — move doc to project B via menu (now under project A)
    await clickMoveToProject(page, DOC_UNCAT, PROJECT_B, PROJECT_A);
    await shotSidebar(page, 'TC-04-pass-doc-moved-to-project-b.png');
    console.log('TC-04: moved to project B');

    // TC-05 — move back to Uncategorized (T-13)
    await clickMoveToProject(page, DOC_UNCAT, 'Uncategorized', PROJECT_B);
    await shotSidebar(page, 'TC-05-pass-doc-moved-uncategorized.png');
    console.log('TC-05: moved to uncategorized');

    // TC-06 — drag doc onto project A (T-19)
    await expandProject(page, PROJECT_A);
    const source = docRow(page, DOC_MOVE, 'Uncategorized');
    const projectDrop = sb.locator('div.mb-1').filter({ hasText: PROJECT_A }).first();
    await source.dragTo(projectDrop);
    await page.waitForTimeout(800);
    await expandProject(page, PROJECT_A);
    await shotSidebar(page, 'TC-06-pass-drag-drop-to-project.png');
    console.log('TC-06: drag drop to project');

    // TC-07 — drag in progress visual
    const uncatDoc = docRow(page, DOC_UNCAT, 'Uncategorized');
    await uncatDoc.hover();
    const box = await uncatDoc.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 4, box.y + box.height / 2 + 12);
      await page.waitForTimeout(250);
      await shotSidebar(page, 'TC-07-pass-drag-in-progress.png');
      await page.mouse.up();
    }
    console.log('TC-07: drag in progress');

    // TC-08 — drag doc from project to Uncategorized (T-20)
    await expandProject(page, PROJECT_A);
    let docInProject = docRow(page, DOC_MOVE, PROJECT_A);
    if (!(await docInProject.isVisible().catch(() => false))) {
      docInProject = docRowAny(page, DOC_MOVE);
    }
    const uncatSection = sb
      .locator('section')
      .filter({ hasText: 'Uncategorized' })
      .first();
    await docInProject.dragTo(uncatSection);
    await page.waitForTimeout(800);
    await shotSidebar(page, 'TC-08-pass-drag-to-uncategorized.png');
    console.log('TC-08: drag to uncategorized');

    // TC-09 — search flat list with project label (T-09 / AC-05)
    await sb.locator('input[placeholder="Search documents..."]').fill('Spec');
    await page.waitForTimeout(400);
    await shotSidebar(page, 'TC-09-pass-search-with-project-label.png', 420);
    console.log('TC-09: search with project');

    // TC-10 — final grouping state
    await sb.locator('input[placeholder="Search documents..."]').fill('');
    await page.waitForTimeout(400);
    await shotSidebar(page, 'TC-10-pass-final-grouping-state.png');
    console.log('TC-10: final grouping');

    console.log('All move/grouping screenshots saved to', OUT_DIR);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
