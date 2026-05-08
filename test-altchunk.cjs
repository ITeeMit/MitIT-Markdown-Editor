const fs = require('fs');
const PizZip = require('pizzip');

const templateContent = fs.readFileSync('public/adasoft-template.docx');
const zip = new PizZip(templateContent);

// 1. Add the HTML file to the zip
const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><h1>Hello World</h1><p>This is a test</p></body></html>`;
zip.file('word/document.html', html);

// 2. Add relation to document.xml.rels
let relsXml = zip.file('word/_rels/document.xml.rels').asText();
if (!relsXml.includes('htmlChunk')) {
    relsXml = relsXml.replace('</Relationships>', '  <Relationship Id="htmlChunk" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/aFChunk" Target="document.html"/>\n</Relationships>');
    zip.file('word/_rels/document.xml.rels', relsXml);
}

// 3. Update document.xml to include altChunk
let docXml = zip.file('word/document.xml').asText();
// keep the sectPr
const sectPrMatch = docXml.match(/<w:sectPr[^>]*>.*?<\/w:sectPr>/);
const sectPr = sectPrMatch ? sectPrMatch[0] : '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr>';
docXml = docXml.replace(/<w:body>.*<\/w:body>/, `<w:body><w:altChunk r:id="htmlChunk"/>${sectPr}</w:body>`);
zip.file('word/document.xml', docXml);

// 4. Update [Content_Types].xml
let contentTypes = zip.file('[Content_Types].xml').asText();
if (!contentTypes.includes('text/html')) {
    contentTypes = contentTypes.replace('</Types>', '  <Default Extension="html" ContentType="text/html"/>\n</Types>');
    zip.file('[Content_Types].xml', contentTypes);
}

fs.writeFileSync('test-out.docx', zip.generate({type: 'nodebuffer'}));
console.log('done');
