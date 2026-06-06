import fs from 'node:fs';
import PizZip from 'pizzip';

const HEADING_HALF_PT = { h1: 26, h2: 25, h3: 24, h4: 21, h5: 18, h6: 18 };

function patchHeadingStyleBlock(block, halfPt) {
  return block
    .replace(/<w:sz w:val="[^"]+"\/>/g, `<w:sz w:val="${halfPt}"/>`)
    .replace(/<w:szCs w:val="[^"]+"\/>/g, `<w:szCs w:val="${halfPt}"/>`);
}

function patchTemplateStyles(stylesXml) {
  let xml = stylesXml;
  for (let level = 1; level <= 6; level += 1) {
    const halfPt = HEADING_HALF_PT[`h${level}`];
    const re = new RegExp(
      `<w:style w:type="paragraph" w:styleId="${level}"[^>]*>[\\s\\S]*?</w:style>`,
      'g'
    );
    xml = xml.replace(re, (block) => {
      if (!block.includes(`<w:name w:val="heading ${level}"/>`)) return block;
      return patchHeadingStyleBlock(block, halfPt);
    });
  }
  return xml;
}

const template = fs.readFileSync('public/adasoft-template.docx');
const zip = new PizZip(template);
const patched = patchTemplateStyles(zip.file('word/styles.xml').asText());
const h1 = patched.match(
  /<w:style w:type="paragraph" w:styleId="1"[^>]*>[\s\S]*?<\/w:style>/
);
const sizes = h1 ? [...h1[0].matchAll(/<w:sz w:val="(\d+)"/g)].map((m) => Number(m[1])) : [];
const ok = sizes.length > 0 && sizes.every((s) => s === 26);
console.log('heading 1 sizes after patch:', sizes, ok ? 'OK' : 'FAIL');
process.exit(ok ? 0 : 1);
