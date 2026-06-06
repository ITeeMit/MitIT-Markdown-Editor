# Test Cases: Option C — Project Organization

> Role: Tester | Version: 1.0 | Date: 2026-06-06

## Manual Test Checklist

### Project CRUD

| # | Steps | Expected | AC |
|---|-------|----------|-----|
| T-01 | คลิก + ที่ Projects → ใส่ชื่อ "AdaPos D365" → Add | Project ปรากฏใน sidebar พร้อมสี | AC-01 |
| T-02 | Hover project → คลิก + | เปิดฟอร์ม New Document in [project] | AC-02 |
| T-03 | สร้าง doc ใน project | Doc อยู่ใต้ project เมื่อ expand | AC-02 |
| T-04 | Hover project → คลิกถังขยะ → confirm | Project หาย, doc ไป Uncategorized | AC-07 |

### Starred & Recent

| # | Steps | Expected | AC |
|---|-------|----------|-----|
| T-05 | ⋮ doc → Star | Doc ปรากฏใน Starred section | AC-03 |
| T-06 | ⋮ starred doc → Unstar | Doc หายจาก Starred | AC-03 |
| T-07 | เปิด/แก้ doc หลายไฟล์ | Recent แสดง 5 รายการล่าสุด | AC-04 |
| T-08 | คลิก header Starred/Recent | Section collapse/expand | — |

### Search & Navigation

| # | Steps | Expected | AC |
|---|-------|----------|-----|
| T-09 | พิมพ์คำค้นใน search | แสดง flat list พร้อมชื่อ project | AC-05 |
| T-10 | ลบ search | กลับ tree view ปกติ | AC-05 |
| T-11 | คลิก doc ใน tree | เปิดใน editor ถูกต้อง | — |

### Move & Uncategorized

| # | Steps | Expected | AC |
|---|-------|----------|-----|
| T-12 | ⋮ → Move to... → เลือก project | Doc ย้ายไป project นั้น | AC-06 |
| T-13 | ⋮ → Move to... → Uncategorized | Doc อยู่ใน Uncategorized | AC-06 |
| T-14 | Upload .md ใหม่ | Doc อยู่ Uncategorized (default) | AC-06 |

### Regression

| # | Steps | Expected | AC |
|---|-------|----------|-----|
| T-15 | Refresh หน้า (F5) | Projects + docs ยังอยู่ | AC-08 |
| T-16 | Doc เก่า (ไม่มี folderId) | แสดงใน Uncategorized | AC-08 |
| T-17 | Rename, Delete doc | ทำงานเหมือนเดิม | AC-08 |
| T-18 | CSV import, dark mode | ไม่พัง | — |

## Build Verification

```bash
npm run check   # TypeScript — must pass
npm run build   # Production build — must pass
npm run dev     # Manual UI test at http://localhost:5173
```

## Result Log

| Run | Date | check | build | Manual | Notes |
|-----|------|-------|-------|--------|-------|
| 1 | 2026-06-06 | pass | pass | pending | Phase 1+2 implemented |
