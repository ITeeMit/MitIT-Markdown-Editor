import zipfile
import re
from pathlib import Path

p = Path(r"C:\example\IDE\09.Tools\01.Mark Down to PDF\public\adasoft-template.docx")
with zipfile.ZipFile(p) as z:
    hdr = z.read("word/header1.xml").decode("utf-8", errors="ignore")
    # VML shape style
    for m in re.finditer(r'<v:shape[^>]+style="([^"]+)"', hdr):
        print("shape style:", m.group(1)[:200])
    # drawing inline
    for m in re.finditer(r'<wp:anchor[^>]*>[\s\S]{0,500}', hdr):
        print("anchor snippet:", m.group(0)[:300])
        break
    print("---")
    print(hdr[0:2500])
