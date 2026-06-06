# Test Report — PDF Export Typography & Template
Date: 2026-06-06   Version: 1.0.0  
Status: PASS (header rebuild v2)

## Executive Summary
แก้ header ล้นขวาครั้งสุดท้ายโดย **สร้าง header1.xml ใหม่** เป็น table 2 คอลัมน์ (โลโก้ | ข้อมูลติดต่อ) แทน VML textbox 493pt ที่ Word ไม่ wrap ข้อความ

## Header Fix v2 (2026-06-06)
| ก่อน | หลัง |
|------|------|
| VML textbox absolute 493pt | Table 9638 twips (= printable width) |
| ที่อยู่ยาว 1 บรรทัด | แยก 4 บรรทัด + ชิดขวา |
| Patch CSS/VML ไม่พอ | Rebuild XML ใน `buildCleanHeader1Xml()` |

## Executive Summary
แก้ปัญหา PDF export ที่ heading ใหญ่เกินและ template ใช้ไม่สมบูรณ์ สาเหตุหลักคือ `styles.xml` ใน template กำหนด Heading 1 เป็น 20pt (sz=40) ซึ่ง Word override CSS ของ altChunk รวมถึง header logo สูงเกินไป

## Root Cause
| Issue | Cause |
|-------|--------|
| H1/H2 ใหญ่มาก | Template `styles.xml` มี `w:sz w:val="40"` (20pt) ใน heading styles |
| CSS ไม่มีผลใน Word | altChunk ใช้ Word HTML engine + template styles มากกว่า stylesheet |
| Header สูงเกิน | Browser fallback โหลด media ทั้งหมด + ไม่จำกัดความสูง |

## Fixes Applied
1. Patch `styles.xml` ด้วย `styleId` ที่ถูกต้อง (H1=26, H2=25, H3=24 half-pt)
2. Inline `font-size` บน h1–h6 ใน HTML body
3. Scale header logo 72% ใน `header1.xml` ตอน build DOCX
4. Browser fallback: ใช้เฉพาะรูปจาก header rels + จำกัด max-height

## Heading Scale (H3 = 12pt baseline)
| Level | Size |
|-------|------|
| H1 | 13pt |
| H2 | 12.5pt |
| H3 | 12pt |
| H4 | 10.5pt |
| H5/H6 | 9pt |

## Test Results
| TC | Description | Result |
|----|-------------|--------|
| TC-01 | `verify-heading-patch.mjs` — H1 sz ≤ 26 half-pt | PASS |
| TC-02 | `tsc --noEmit` | PASS |
| TC-03 | altChunk DOCX → Word COM PDF | PASS |
| TC-04 | MD + `--template public/adasoft-template.docx` | PASS |
| TC-05 | API `POST /api/export/pdf-from-docx` | PASS (prior run) |

## Sign-off
| Role | Status |
|------|--------|
| Programmer | Done |
| Tester | PASS |
