import zipfile
import re
from pathlib import Path

p = Path(r"C:\example\IDE\09.Tools\01.Mark Down to PDF\public\adasoft-template.docx")
with zipfile.ZipFile(p) as z:
    hdr = z.read("word/header1.xml").decode("utf-8", errors="ignore")
    print("length", len(hdr))
    print("tabs:", re.findall(r'w:pos="(\d+)"', hdr))
    print("width pt:", re.findall(r'width:(\d+\.?\d*)pt', hdr))
    print("extent:", re.findall(r'cx="(\d+)" cy="(\d+)"', hdr))
    print("sz vals:", re.findall(r'w:sz w:val="(\d+)"', hdr)[:15])
    # contact text snippet
    for t in re.findall(r"<w:t[^>]*>([^<]{5,80})</w:t>", hdr):
        if "Ladprao" in t or "Tel" in t or "info@" in t:
            print("text:", t[:80])
