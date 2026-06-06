/** Verify diagram PNG data URLs are embedded in word/media/ for altChunk DOCX */
import fs from 'node:fs';
import PizZip from 'pizzip';

const PNG_1X1 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function dataUrlToBytes(dataUrl) {
  const base64 = dataUrl.replace(/^data:image\/[\w+.-]+;base64,/, '');
  const binary = Buffer.from(base64, 'base64');
  return binary;
}

function embedDiagramImagesInDocx(zip, html) {
  const relationships = [];
  let index = 0;
  const embeddedHtml = html.replace(
    /src="(data:image\/(?:png|jpeg|jpg);base64,[^"]+)"/gi,
    (_match, dataUrl) => {
      const ext = /image\/jpe?g/i.test(dataUrl.split(',')[0] ?? '') ? 'jpeg' : 'png';
      const filename = `export-diagram-${index}.${ext}`;
      zip.file(`word/media/${filename}`, dataUrlToBytes(dataUrl));
      relationships.push(
        `<Relationship Id="diagRid${index}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${filename}"/>`
      );
      index += 1;
      return `src="media/${filename}"`;
    }
  );
  if (relationships.length > 0) {
    zip.file(
      'word/_rels/document.html.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${relationships.join('\n')}
</Relationships>`
    );
  }
  return embeddedHtml;
}

const sampleHtml = `<table class="diagram-table"><tr><td><img class="diagram-image" src="${PNG_1X1}" alt="mermaid diagram"/></td></tr></table>
<table class="code-block-table"><tr><td><pre><code>graph TD; A-->B</code></pre></td></tr></table>`;

const template = fs.readFileSync('public/adasoft-template.docx');
const zip = new PizZip(template);
const embedded = embedDiagramImagesInDocx(zip, sampleHtml);
zip.file('word/document.html', embedded);

const media = zip.file('word/media/export-diagram-0.png');
const rels = zip.file('word/_rels/document.html.rels');
const html = zip.file('word/document.html').asText();

const checks = [
  ['media file exists', Boolean(media)],
  ['media is PNG bytes', media && media.asBinary().startsWith('\x89PNG')],
  ['html uses media path', html.includes('src="media/export-diagram-0.png"')],
  ['no data URL left', !html.includes('data:image/')],
  ['document.html.rels', rels && rels.asText().includes('export-diagram-0.png')],
  ['code block after image', html.indexOf('code-block-table') > html.indexOf('diagram-table')],
];

let ok = true;
for (const [label, pass] of checks) {
  console.log(`${label}:`, pass ? 'OK' : 'FAIL');
  if (!pass) ok = false;
}
process.exit(ok ? 0 : 1);
