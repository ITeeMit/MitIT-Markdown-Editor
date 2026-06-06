# Spec: Option C — Project Organization (Hybrid Sidebar)

> Role: PM | Version: 1.0 | Date: 2026-06-06 | Status: Approved for implementation

## Goal

จัดเก็บเอกสารเป็น **Project** พร้อม **Starred** และ **Recent** ใน sidebar เพื่อค้นหาและกลับมาทำงานต่อได้ง่าย ไม่ปนกัน

## User Stories

| ID | As a user | I want to | So that |
|----|-----------|-----------|---------|
| US-01 | ผู้ใช้ | สร้าง project และตั้งชื่อ/สี | แยกงานตาม client หรือโปรเจกต์ |
| US-02 | ผู้ใช้ | เห็นเอกสารจัดกลุ่มใต้ project | หา doc ที่เกี่ยวข้องได้เร็ว |
| US-03 | ผู้ใช้ | เห็น Recent 5 รายการล่าสุด | กลับมาทำต่อทันที |
| US-04 | ผู้ใช้ | star เอกสารสำคัญ | เข้าถึง spec/diagram หลักได้เร็ว |
| US-05 | ผู้ใช้ | ค้นหาข้าม project | ไม่ต้องเปิด project ทีละอัน |
| US-06 | ผู้ใช้ | ย้าย doc ไป project อื่น | จัดระเบียบย้อนหลังได้ |

## Scope

### In Scope (Phase 1+2)

- ตาราง/ storage `Project` ใน localStorage
- ใช้ `folderId` บน document เป็น project reference
- Sidebar: Starred → Recent → Projects (tree) → Uncategorized
- CRUD project, collapse/expand project
- Star/unstar document, move document to project
- สร้าง doc ใหม่ใน project ที่เลือก
- Search ทั้ง title/content/tags (global)

### Out of Scope (Phase 3)

- Drag-and-drop ย้าย doc
- Export ทั้ง project
- Sync ข้าม device

## Data Model

```typescript
interface Project {
  id: string;
  name: string;
  color: string;      // hex, e.g. #3B82F6
  createdAt: Date;
  updatedAt: Date;
}

// MarkdownDocument.folderId → Project.id
// MarkdownDocument.isStarred → boolean
```

**Storage keys:**
- `markdown-documents` (existing)
- `markdown-projects` (new)
- `project-sidebar-state` (UI: expanded project IDs)

## Acceptance Criteria

- [ ] AC-01: สร้าง project ใหม่ได้ แสดงใน sidebar พร้อมสี
- [ ] AC-02: สร้าง doc ใน project แล้ว doc อยู่ใต้ project นั้น
- [ ] AC-03: Star doc แล้วแสดงใน Starred section
- [ ] AC-04: Recent แสดง 5 doc ล่าสุด (ไม่รวม duplicate จาก Starred tree)
- [ ] AC-05: Search กรอง doc ทุก project
- [ ] AC-06: Doc ที่ไม่มี folderId อยู่ใน Uncategorized
- [ ] AC-07: ลบ project แล้ว doc ย้ายไป Uncategorized
- [ ] AC-08: ข้อมูลเดิม (doc เก่า) ยังเปิดได้ ไม่หาย

## UI Structure (Designer)

```
┌─ Actions: Imp.CSV | Upload | New ─────────┐
├─ 🔍 Search ────────────────────────────────┤
├─ ⭐ Starred (n)          [collapse]        │
│    └ doc items (compact)                   │
├─ 🕐 Recent               [collapse]        │
│    └ 5 latest docs                         │
├─ PROJECTS                    [+ New]       │
│  ▼ ● AdaPos → D365 (3)                     │
│      📄 01 Architecture                    │
│      📄 04 Sequence                        │
│  ▶ ● MitIT Internal (1)                    │
├─ 📂 Uncategorized (n)                      │
└─ footer: N docs · M projects ──────────────┘
```

**Interaction:**
- คลิก project header → expand/collapse
- คลิก doc → เปิดใน editor
- ⋮ menu: Rename, Star, Move to..., Delete
- New doc → สร้างใน project ที่ expand ล่าสุด หรือ Uncategorized

## Files to Change

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `Project` interface |
| `src/database/index.ts` | Project CRUD + storage |
| `src/stores/projectStore.ts` | New — project state |
| `src/stores/editorStore.ts` | Load projects on init |
| `src/components/OFileManager.tsx` | Option C sidebar UI |
