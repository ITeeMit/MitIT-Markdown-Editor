# Test Report — PDF Export Typography & Template
Date: 2026-06-06   Version: 1.0.2  
Status: ✅ PASS

## Executive Summary
ทดสอบ MitIT Markdown Editor ผ่าน UI จริง (Playwright) ครอบคลุม preview typography, Mermaid diagram, PDF export preview พร้อม Adasoft header และ export toolbar — ผ่าน 5/5 test cases หลักฐาน screenshot อยู่ใน `docs/test/screenshots/250606-pdf-export-typography/`

## Test Evidence — Screenshots (Program UI)

### ✅ Passed Tests
| TC | Description | Screenshot |
|---|---|---|
| TC-01 | Preview heading typography (H1–H6) | ![TC-01](screenshots/250606-pdf-export-typography/TC-01-pass-heading-preview.png) |
| TC-02 | Main program screen | ![TC-02](screenshots/250606-pdf-export-typography/TC-02-pass-app-main-screen.png) |
| TC-03 | PDF export preview + Adasoft header | ![TC-03](screenshots/250606-pdf-export-typography/TC-03-pass-pdf-export-header.png) |
| TC-04 | Mermaid diagram (Mermaid mode) | ![TC-04](screenshots/250606-pdf-export-typography/TC-04-pass-mermaid-diagram.png) |
| TC-05 | Export toolbar (PDF / DOCX) | ![TC-05](screenshots/250606-pdf-export-typography/TC-05-pass-export-toolbar.png) |

> 📁 All screenshots: `docs/test/screenshots/250606-pdf-export-typography/`  
> 🔁 Regenerate: `npm run dev` then `node scripts/capture-ui-screenshots.mjs`

## Header Fix v2 (2026-06-06)
| ก่อน | หลัง |
|------|------|
| VML textbox absolute 493pt | Table 9638 twips (= printable width) |
| ที่อยู่ยาว 1 บรรทัด | แยก 4 บรรทัด + ชิดขวา |
| Patch CSS/VML ไม่พอ | Rebuild XML ใน `buildCleanHeader1Xml()` |

## Heading Scale (H3 = 12pt baseline)
| Level | Size |
|-------|------|
| H1 | 13pt |
| H2 | 12.5pt |
| H3 | 12pt |
| H4 | 10.5pt |
| H5/H6 | 9pt |

## Test Results Summary
| TC | Description | Result |
|----|-------------|--------|
| TC-01 | Preview heading typography | ✅ PASS |
| TC-02 | Main app screen | ✅ PASS |
| TC-03 | PDF export + header | ✅ PASS |
| TC-04 | Mermaid diagram preview | ✅ PASS |
| TC-05 | Export toolbar | ✅ PASS |

## Sign-off
| Role | Status |
|------|--------|
| Tester | ✅ PASS — 2026-06-06 (UI screenshots) |
| SA | ✅ Reviewed |
| PM | ✅ Ready |
