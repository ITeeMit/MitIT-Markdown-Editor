import zipfile
import re
from pathlib import Path

p = Path(r"C:\example\IDE\09.Tools\01.Mark Down to PDF\public\adasoft-template.docx")
with zipfile.ZipFile(p) as z:
    styles = z.read("word/styles.xml").decode("utf-8")
    ids = re.findall(r'w:styleId="([^"]+)"[\s\S]{0,120}?w:val="heading (\d)"', styles)
    print("styleIds:", ids)
    for level in range(1, 7):
        m = re.search(
            rf'<w:style w:type="paragraph" w:styleId="Heading{level}"[^>]*>[\s\S]*?</w:style>',
            styles,
        )
        if not m:
            m = re.search(
                rf'<w:style w:type="paragraph" w:styleId="[^"]*"[^>]*>[\s\S]*?<w:name w:val="heading {level}"[\\s\\S]*?</w:style>',
                styles,
            )
        if m:
            sz = re.findall(r'<w:sz w:val="(\d+)"', m.group(0))
            print(f"heading {level} sz={sz}")
