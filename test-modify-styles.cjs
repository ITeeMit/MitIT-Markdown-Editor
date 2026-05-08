const fs = require('fs');
let styles = fs.readFileSync('test-styles.xml', 'utf8');

// Replace color for any heading
styles = styles.replace(/(<w:style[^>]*w:type="paragraph"[^>]*>[\s\S]*?<w:name w:val="heading [1-6]"[\s\S]*?)<w:color w:val="[^"]+"\/>/g, '$1<w:color w:val="000000"/>');

// Remove pBdr for any heading
styles = styles.replace(/(<w:style[^>]*w:type="paragraph"[^>]*>[\s\S]*?<w:name w:val="heading [1-6]"[\s\S]*?)<w:pBdr>[\s\S]*?<\/w:pBdr>/g, '$1');

fs.writeFileSync('test-styles-modified.xml', styles);
