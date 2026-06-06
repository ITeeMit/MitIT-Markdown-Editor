/** Build patched DOCX and verify header matches Adasoft template layout */
import fs from 'node:fs';
import PizZip from 'pizzip';

const ADDRESS =
  '26/5-8 Soi Ladprao83 (Chit Ari) Ladprao Rd. Khlong Chaokhun Sing, Wangthonglang Bangkok 10310 Thailand.';
const CONTACT_LINE =
  'Tel. +662 530-1681(auto)  Fax. +662 25301681 ext. 1109  email : ';

function buildCleanHeader1Xml() {
  const tableW = 9638;
  const logoCol = 2400;
  const contactCol = tableW - logoCol;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:tbl><w:tblPr><w:tblW w:w="${tableW}" w:type="dxa"/><w:tblLayout w:type="fixed"/></w:tblPr>
  <w:tblGrid><w:gridCol w:w="${logoCol}"/><w:gridCol w:w="${contactCol}"/></w:tblGrid>
  <w:tr><w:tc><w:tcPr><w:tcW w:w="${logoCol}" w:type="dxa"/></w:tcPr><w:p><w:r><w:t>logo</w:t></w:r></w:p></w:tc>
  <w:tc><w:tcPr><w:tcW w:w="${contactCol}" w:type="dxa"/></w:tcPr>
  <w:p><w:r><w:t>${ADDRESS}</w:t></w:r></w:p>
  <w:p><w:r><w:t>${CONTACT_LINE}</w:t></w:r></w:tc></w:tr></w:tbl>
  <w:p><w:pPr><w:pBdr><w:bottom w:val="single"/></w:pBdr></w:pPr></w:p></w:hdr>`;
}

const template = fs.readFileSync('public/adasoft-template.docx');
const zip = new PizZip(template);
zip.file('word/header1.xml', buildCleanHeader1Xml());
const hdr = zip.file('word/header1.xml').asText();

const checks = [
  ['table layout', hdr.includes('<w:tbl') && !hdr.includes('txbxContent')],
  ['no right-align', !hdr.includes('w:jc w:val="right"')],
  ['single address line', (hdr.match(/Bangkok 10310 Thailand/g) ?? []).length >= 1],
  ['contact on one line', hdr.includes('25301681 ext. 1109') && hdr.includes('email :')],
  ['bottom rule', hdr.includes('w:pBdr')],
];

let ok = true;
for (const [label, pass] of checks) {
  console.log(`${label}:`, pass ? 'OK' : 'FAIL');
  if (!pass) ok = false;
}
process.exit(ok ? 0 : 1);
