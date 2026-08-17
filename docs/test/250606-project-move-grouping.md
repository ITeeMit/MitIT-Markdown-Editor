# Test Report — Project Move & Grouping
Date: 2026-06-06   Version: 1.0.0  
Status: ✅ PASS

## Executive Summary
ทดสอบการ **ย้ายเอกสารระหว่าง project** และ **grouping ด้วย project** ใน MitIT Markdown Editor ครอบคลุมทั้งเมนู Move to... และ drag-and-drop ผ่าน 10/10 test cases พร้อม screenshot หน้าจอโปรแกรมจริง

## Test Evidence — Screenshots (Program UI)

### Move via Menu (T-12, T-13)
| TC | Description | Screenshot |
|---|---|---|
| TC-02 | Move to... menu — เลือก project | ![TC-02](screenshots/250606-project-move-grouping/TC-02-pass-move-to-menu.png) |
| TC-03 | ย้าย Sales Report → AdaPos D365 | ![TC-03](screenshots/250606-project-move-grouping/TC-03-pass-doc-moved-to-project-a.png) |
| TC-04 | ย้าย → MitIT Docs | ![TC-04](screenshots/250606-project-move-grouping/TC-04-pass-doc-moved-to-project-b.png) |
| TC-05 | ย้ายกลับ Uncategorized | ![TC-05](screenshots/250606-project-move-grouping/TC-05-pass-doc-moved-uncategorized.png) |

### Drag & Drop Grouping (T-19, T-20)
| TC | Description | Screenshot |
|---|---|---|
| TC-06 | ลาก API Spec เข้า AdaPos D365 | ![TC-06](screenshots/250606-project-move-grouping/TC-06-pass-drag-drop-to-project.png) |
| TC-07 | สถานะขณะลาก | ![TC-07](screenshots/250606-project-move-grouping/TC-07-pass-drag-in-progress.png) |
| TC-08 | ลากกลับ Uncategorized | ![TC-08](screenshots/250606-project-move-grouping/TC-08-pass-drag-to-uncategorized.png) |

### Grouping Overview & Search
| TC | Description | Screenshot |
|---|---|---|
| TC-01 | Tree overview (2 projects) | ![TC-01](screenshots/250606-project-move-grouping/TC-01-pass-grouping-tree-overview.png) |
| TC-09 | Search แสดง project label | ![TC-09](screenshots/250606-project-move-grouping/TC-09-pass-search-with-project-label.png) |
| TC-10 | สถานะ grouping สุดท้าย | ![TC-10](screenshots/250606-project-move-grouping/TC-10-pass-final-grouping-state.png) |

> 📁 All screenshots: `docs/test/screenshots/250606-project-move-grouping/`  
> 🔁 Regenerate: `node scripts/capture-project-move-ui-screenshots.mjs`

## Acceptance Criteria
| AC | Criterion | Result |
|---|---|---|
| AC-05 | Search แสดงชื่อ project | ✅ TC-09 |
| AC-06 | ย้าย doc ระหว่าง project / Uncategorized | ✅ TC-03–TC-08 |

## Sign-off
| Role | Status |
|------|--------|
| Tester | ✅ PASS — 2026-06-06 |
| BA | ✅ Move + grouping journey verified |
| PM | ✅ Ready (UI scope) |
