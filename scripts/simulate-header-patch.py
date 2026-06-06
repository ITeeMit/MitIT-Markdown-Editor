import zipfile
import re
from pathlib import Path

# Simulate patch like adaExportPipeline
def patch_header(hdr, logo_scale=0.72):
    xml = hdr
    xml = xml.replace('width:493.2pt;height:47.25pt', 'width:330pt;height:54pt')
    xml = xml.replace('margin-left:-12pt;margin-top:-.1pt', 'margin-left:150pt;margin-top:-0.1pt')
    xml = xml.replace('<w:tab w:val="right" w:pos="8505"/>', '<w:tab w:val="right" w:pos="7200"/>')
    return xml

p = Path(r"C:\example\IDE\09.Tools\01.Mark Down to PDF\public\adasoft-template.docx")
with zipfile.ZipFile(p) as z:
    raw = z.read("word/header1.xml").decode("utf-8")
    patched = patch_header(raw)
    m = re.search(r'style="([^"]+)"', patched)
    print("AFTER shape style:", m.group(1) if m else "none")
    # page math
    page_pt = 595.44  # A4
    right_margin_pt = 56.7
    left_margin_pt = 56.7
    content_pt = page_pt - left_margin_pt - right_margin_pt
    print(f"content width: {content_pt:.1f}pt")
    # current box: left 150 + width 330 = 480
    print(f"box end: {150+330}pt vs content {content_pt:.1f}pt")
