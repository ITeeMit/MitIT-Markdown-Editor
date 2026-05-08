const fs = require('fs');
const styles = fs.readFileSync('test-styles-modified.xml', 'utf8');

const h1Match = styles.match(/<w:style[^>]*w:styleId="1"[\s\S]*?<w:color w:val="([^"]+)"/);
console.log('Heading 1 color:', h1Match ? h1Match[1] : 'not found');

const h2Match = styles.match(/<w:style[^>]*w:styleId="2"[\s\S]*?<\/w:style>/);
if (h2Match) {
    console.log('Heading 2 has border:', h2Match[0].includes('<w:pBdr>') ? 'yes' : 'no');
} else {
    console.log('Heading 2 not found');
}
