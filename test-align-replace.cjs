const fs = require('fs');
let styles = fs.readFileSync('test-styles.xml', 'utf8');
const oldLen = styles.length;
styles = styles.replace(/(<w:style[^>]*w:type="paragraph"[^>]*>[\s\S]*?<w:name w:val="heading [1-6]"[\s\S]*?)<w:jc w:val="center"\/>/g, '$1<w:jc w:val="left"/>');
console.log('Replaced?', styles.length !== oldLen);
