# System Test Report — Project Grouping (Add Project)
Date: 2026-06-06  
Tester: AdaSoft Tester Agent  
Reviewer: SA Agent  
Feature: Option C — Project Organization (Phase 3 sidebar)

## Test Cases
| TC | Description | Steps | Expected | Result | Screenshot |
|---|---|---|---|---|---|
| TC-01 | Projects section ใน sidebar | มี doc แล้ว scroll ไป Projects | แสดง Projects (0) + hint | ✅ PASS | ![TC-01](screenshots/250606-project-grouping/TC-01-pass-projects-section-empty.png) |
| TC-02 | เปิดฟอร์ม New Project | คลิก + ที่ Projects | ฟอร์ม New Project + color picker | ✅ PASS | ![TC-02](screenshots/250606-project-grouping/TC-02-pass-new-project-form.png) |
| TC-03 | กรอกชื่อ + เลือกสี | ใส่ "AdaPos D365" + เลือกสี | ชื่อและสีแสดงในฟอร์ม | ✅ PASS | ![TC-03](screenshots/250606-project-grouping/TC-03-pass-new-project-filled.png) |
| TC-04 | สร้าง project | คลิก Add | Project ปรากฏใน tree (T-01 / AC-01) | ✅ PASS | ![TC-04](screenshots/250606-project-grouping/TC-04-pass-project-created.png) |
| TC-05 | New doc in project | Hover project → + | ฟอร์ม "New Document in AdaPos D365" (T-02) | ✅ PASS | ![TC-05](screenshots/250606-project-grouping/TC-05-pass-new-doc-in-project-form.png) |
| TC-06 | Doc อยู่ใต้ project | สร้าง "Integration Spec" | Doc grouped ใต้ project (T-03 / AC-02) | ✅ PASS | ![TC-06](screenshots/250606-project-grouping/TC-06-pass-doc-grouped-in-project.png) |
| TC-07 | เปลี่ยนสี project | Hover → Palette | Color picker แสดง (T-22) | ✅ PASS | ![TC-07](screenshots/250606-project-grouping/TC-07-pass-project-color-picker.png) |
| TC-08 | หน้าจอโปรแกรมรวม | Full viewport | Sidebar + editor + preview | ✅ PASS | ![TC-08](screenshots/250606-project-grouping/TC-08-pass-app-with-project-sidebar.png) |

## Coverage Summary
- UI E2E (Playwright): 8 scenarios, 8 pass, 0 fail
- TypeScript `npm run check`: ✅ PASS
- Manual pending: drag-drop (T-19/20), delete project (T-04), export ZIP (T-24)

## Bugs Found
| BUG | Severity | Description | Screenshot | Status |
|---|---|---|---|---|
| — | — | No bugs found in this run | — | — |

## Screenshots Index
> Path: `docs/test/screenshots/250606-project-grouping/`  
> Regenerate: `npm run dev` → `node scripts/capture-project-ui-screenshots.mjs`

| File | Maps to Manual TC |
|---|---|
| TC-04-pass-project-created.png | T-01 |
| TC-05-pass-new-doc-in-project-form.png | T-02 |
| TC-06-pass-doc-grouped-in-project.png | T-03 |
| TC-03-pass-new-project-filled.png | T-21 |
| TC-07-pass-project-color-picker.png | T-22 |
