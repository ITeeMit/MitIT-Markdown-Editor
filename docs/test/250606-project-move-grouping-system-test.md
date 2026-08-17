# System Test Report — Project Move & Grouping
Date: 2026-06-06  
Tester: AdaSoft Tester Agent  
Reviewer: SA Agent  
Feature: Move document between projects + drag-drop grouping

## Test Cases
| TC | Description | Steps | Expected | Result | Screenshot |
|---|---|---|---|---|---|
| TC-01 | Grouping tree overview | 2 projects + 2 docs | Tree แสดง Projects + Uncategorized | ✅ PASS | ![TC-01](screenshots/250606-project-move-grouping/TC-01-pass-grouping-tree-overview.png) |
| TC-02 | Move to... menu | ⋮ → Move to... | แสดงรายการ project (T-12) | ✅ PASS | ![TC-02](screenshots/250606-project-move-grouping/TC-02-pass-move-to-menu.png) |
| TC-03 | ย้ายไป AdaPos D365 | เลือก project A | Doc อยู่ใต้ project A (AC-06) | ✅ PASS | ![TC-03](screenshots/250606-project-move-grouping/TC-03-pass-doc-moved-to-project-a.png) |
| TC-04 | ย้ายไป MitIT Docs | Move to... → project B | Doc ย้าย project (T-12) | ✅ PASS | ![TC-04](screenshots/250606-project-move-grouping/TC-04-pass-doc-moved-to-project-b.png) |
| TC-05 | ย้ายกลับ Uncategorized | Move to... → Uncategorized | Doc อยู่ Uncategorized (T-13) | ✅ PASS | ![TC-05](screenshots/250606-project-move-grouping/TC-05-pass-doc-moved-uncategorized.png) |
| TC-06 | Drag-drop เข้า project | ลาก API Spec → AdaPos D365 | Doc grouped ใต้ project (T-19) | ✅ PASS | ![TC-06](screenshots/250606-project-move-grouping/TC-06-pass-drag-drop-to-project.png) |
| TC-07 | Drag in progress | เริ่มลากเอกสาร | แสดงสถานะ dragging | ✅ PASS | ![TC-07](screenshots/250606-project-move-grouping/TC-07-pass-drag-in-progress.png) |
| TC-08 | Drag ไป Uncategorized | ลากจาก project → Uncategorized | Doc กลับ Uncategorized (T-20) | ✅ PASS | ![TC-08](screenshots/250606-project-move-grouping/TC-08-pass-drag-to-uncategorized.png) |
| TC-09 | Search + project label | ค้น "Spec" | Flat list แสดงชื่อ project (T-09) | ✅ PASS | ![TC-09](screenshots/250606-project-move-grouping/TC-09-pass-search-with-project-label.png) |
| TC-10 | Final grouping state | ล้าง search | Tree สรุป grouping สุดท้าย | ✅ PASS | ![TC-10](screenshots/250606-project-move-grouping/TC-10-pass-final-grouping-state.png) |

## Coverage Summary
- UI E2E (Playwright): 10 pass, 0 fail
- TypeScript check: ✅ PASS
- Manual pending: delete project (T-04), upload default uncategorized (T-14), F5 persist (T-15)

## Bugs Found
| BUG | Severity | Description | Status |
|---|---|---|---|
| — | — | No bugs found | — |

## Screenshots Index
> Path: `docs/test/screenshots/250606-project-move-grouping/`  
> Script: `scripts/capture-project-move-ui-screenshots.mjs`

| Manual TC | UI TC | Scenario |
|---|---|---|
| T-12 | TC-02, TC-03, TC-04 | Move via menu |
| T-13 | TC-05 | Move to Uncategorized |
| T-19 | TC-06, TC-07 | Drag to project |
| T-20 | TC-08 | Drag to Uncategorized |
| T-09 | TC-09 | Search with project label |
| AC-06 | TC-03–TC-08 | Document grouping |
