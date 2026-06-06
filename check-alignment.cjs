const fs = require('fs');
const styles = fs.readFileSync('test-styles.xml', 'utf8');

const regex = /<w:style[^>]*w:styleId="([^"]+)"[\s\S]*?<\/w:style>/g;
let match;
while ((match = regex.exec(styles)) !== null) {
    const id = match[1];
    if (['1', '2', '3', '4', '5'].includes(id)) {
        const jcMatch = match[0].match(/<w:jc w:val="([^"]+)"/);
        if (jcMatch) {
            console.log(`Style ID: ${id} has alignment: ${jcMatch[1]}`);
        }
    }
}
