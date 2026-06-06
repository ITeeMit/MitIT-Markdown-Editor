import zipfile
import re
from pathlib import Path

p = Path(r"C:\example\IDE\09.Tools\01.Mark Down to PDF\public\adasoft-template.docx")
with zipfile.ZipFile(p) as z:
    styles = z.read("word/styles.xml").decode("utf-8")
    for i in range(1, 7):
        m = re.search(
            rf'<w:style w:type="paragraph"[^>]*>[\s\S]*?<w:name w:val="heading {i}"[\s\S]*?</w:style>',
            styles,
        )
        if m:
            block = m.group(0)
            sz = re.findall(r'<w:sz w:val="(\d+)"', block)
            print(f"heading {i} sz (half-pt):", sz)
    hdr = z.read("word/header1.xml").decode("utf-8", errors="ignore")
    for m in re.finditer(r'cx="(\d+)" cy="(\d+)"', hdr):
        print("extent cx/cy:", int(m.group(1)) / 914400, "in x", int(m.group(2)) / 914400, "in")
    for m in re.finditer(r'width:(\d+\.?\d*)pt;height:(\d+\.?\d*)pt', hdr):
        print("vml pt:", m.group(1), m.group(2))
