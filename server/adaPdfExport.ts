import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const AGENT_ROOT = path.resolve(PROJECT_ROOT, '../../.agent');
const MD_TO_PDF_SCRIPT = path.join(AGENT_ROOT, 'scripts', 'md_to_pdf.py');
const TEMPLATE_PATH = path.join(PROJECT_ROOT, 'public', 'adasoft-template.docx');

function runCommand(cmd: string, args: string[], cwd?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, shell: true, windowsHide: true });
    let stderr = '';
    child.stderr?.on('data', (d: Buffer) => {
      stderr += d.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `${cmd} exited with code ${code}`));
    });
  });
}

async function convertDocxToPdfLibreOffice(docxPath: string, outDir: string): Promise<string> {
  await runCommand('soffice', [
    '--headless',
    '--convert-to',
    'pdf',
    '--outdir',
    outDir,
    docxPath,
  ]);
  const pdfPath = path.join(outDir, `${path.basename(docxPath, '.docx')}.pdf`);
  if (!fs.existsSync(pdfPath)) {
    throw new Error('LibreOffice did not produce a PDF file');
  }
  return pdfPath;
}

async function convertDocxFileToPdfBuffer(docxPath: string, workDir: string): Promise<Buffer> {
  const baseName = path.basename(docxPath, '.docx');
  const pdfPath = path.join(workDir, `${baseName}.pdf`);

  if (fs.existsSync(MD_TO_PDF_SCRIPT)) {
    try {
      await runCommand(
        'python',
        [MD_TO_PDF_SCRIPT, '--docx-input', docxPath, '--output', workDir],
        PROJECT_ROOT
      );
      if (fs.existsSync(pdfPath)) {
        return fs.readFileSync(pdfPath);
      }
    } catch (error) {
      console.warn('[ada-pdf-export] Word COM failed, trying LibreOffice:', error);
    }
  }

  const loPdf = await convertDocxToPdfLibreOffice(docxPath, workDir);
  return fs.readFileSync(loPdf);
}

/**
 * altChunk DOCX from public/adasoft-template.docx → PDF via Word COM or LibreOffice
 */
export async function convertDocxBufferToPdfBuffer(
  docxBuffer: Buffer,
  title: string
): Promise<Buffer> {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ada-docx-pdf-'));
  const safeName = title.replace(/[<>:"/\\|?*]/g, '_').trim() || 'document';
  const docxPath = path.join(workDir, `${safeName}.docx`);
  fs.writeFileSync(docxPath, docxBuffer);

  try {
    return await convertDocxFileToPdfBuffer(docxPath, workDir);
  } finally {
    try {
      fs.rmSync(workDir, { recursive: true, force: true });
    } catch {
      /* ignore cleanup errors */
    }
  }
}

/**
 * adamd2pdf server path: MD → DOCX (template) → PDF via Word COM or LibreOffice
 */
export async function convertMarkdownToPdfBuffer(
  content: string,
  title: string
): Promise<Buffer> {
  if (!fs.existsSync(MD_TO_PDF_SCRIPT)) {
    throw new Error(`md_to_pdf.py not found at ${MD_TO_PDF_SCRIPT}`);
  }
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error(`Template not found at ${TEMPLATE_PATH}`);
  }

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ada-pdf-'));
  const safeName = title.replace(/[<>:"/\\|?*]/g, '_').trim() || 'document';
  const mdPath = path.join(workDir, `${safeName}.md`);
  const outDir = path.join(workDir, 'out');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(mdPath, content, 'utf8');

  try {
    await runCommand(
      'python',
      [
        MD_TO_PDF_SCRIPT,
        '--input',
        mdPath,
        '--output',
        outDir,
        '--export-docx',
        '--template',
        TEMPLATE_PATH,
      ],
      PROJECT_ROOT
    );

    const pdfPath = path.join(outDir, `${safeName}.pdf`);
    if (fs.existsSync(pdfPath)) {
      return fs.readFileSync(pdfPath);
    }

    const docxPath = path.join(outDir, `${safeName}.docx`);
    if (fs.existsSync(docxPath)) {
      const loPdf = await convertDocxToPdfLibreOffice(docxPath, outDir);
      return fs.readFileSync(loPdf);
    }

    throw new Error('PDF conversion produced no output file');
  } finally {
    try {
      fs.rmSync(workDir, { recursive: true, force: true });
    } catch {
      /* ignore cleanup errors */
    }
  }
}

function readRequestBody(req: import('node:http').IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export function createPdfExportMiddleware() {
  return async (
    req: import('node:http').IncomingMessage,
    res: import('node:http').ServerResponse,
    next: () => void
  ) => {
    if (req.method !== 'POST') {
      next();
      return;
    }

    try {
      const raw = await readRequestBody(req);
      const body = JSON.parse(raw.toString('utf8')) as {
        content?: string;
        title?: string;
      };

      if (!body.content?.trim()) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'No content to export' }));
        return;
      }

      const title = body.title?.trim() || 'document';
      const pdfBuffer = await convertMarkdownToPdfBuffer(body.content, title);
      const filename = `${title.replace(/[<>:"/\\|?*]/g, '_')}.pdf`;

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      res.end(pdfBuffer);
    } catch (error) {
      console.error('[ada-pdf-export]', error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: error instanceof Error ? error.message : 'PDF export failed',
        })
      );
    }
  };
}

export function createDocxPdfExportMiddleware() {
  return async (
    req: import('node:http').IncomingMessage,
    res: import('node:http').ServerResponse,
    next: () => void
  ) => {
    if (req.method !== 'POST') {
      next();
      return;
    }

    try {
      const docxBuffer = await readRequestBody(req);
      if (!docxBuffer.length) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Empty DOCX body' }));
        return;
      }

      const titleHeader = req.headers['x-export-title'];
      const title =
        typeof titleHeader === 'string'
          ? decodeURIComponent(titleHeader).trim() || 'document'
          : 'document';

      const pdfBuffer = await convertDocxBufferToPdfBuffer(docxBuffer, title);
      const filename = `${title.replace(/[<>:"/\\|?*]/g, '_')}.pdf`;

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      res.end(pdfBuffer);
    } catch (error) {
      console.error('[ada-pdf-export/docx]', error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: error instanceof Error ? error.message : 'DOCX to PDF export failed',
        })
      );
    }
  };
}
