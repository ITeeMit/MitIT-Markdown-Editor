const fs = require('fs');
const styles = fs.readFileSync('test-styles.xml', 'utf8');

const regex = /<w:style[^>]*w:styleId="([^"]+)"[\s\S]*?<\/w:style>/g;
let match;
while ((match = regex.exec(styles)) !== null) {
    const id = match[1];
    if (['1', '2', '3', '4', '5'].includes(id)) {
        console.log(`Style ID: ${id}`);
        const nameMatch = match[0].match(/<w:name w:val="([^"]+)"/);
        if (nameMatch) console.log(`  Name: ${nameMatch[1]}`);
        
        const colorMatch = match[0].match(/<w:color w:val="([^"]+)"/);
        if (colorMatch) console.log(`  Color: ${colorMatch[1]}`);
        
        const borderMatch = match[0].match(/<w:pBdr>[\s\S]*?<\/w:pBdr>/);
        if (borderMatch) console.log(`  Border: yes`);
    }
}
