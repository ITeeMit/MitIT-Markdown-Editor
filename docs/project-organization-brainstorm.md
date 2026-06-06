# Brainstorm: จัดเก็บเอกสารเป็น Project

> วันที่: 2026-06-06  
> หัวข้อ: ปรับ sidebar ให้จัดเก็บประวัติเอกสารเป็น project เพื่อค้นหาและกลับมาดูได้ง่าย ไม่ปนกัน

---

## Context

### ปัญหาปัจจุบัน

- Sidebar แสดง **รายการเอกสารแบบ flat** เรียงตามวันที่แก้ไข
- เอกสารหลายชิ้นที่เกี่ยวกับงานเดียวกัน (เช่น AdaPos+ → D365 BC: Architecture, Sequence, API) ปนกันใน list เดียว
- ชื่อเอกสารสั้น ๆ (`wn`, `ปป`, `seq`) ทำให้หากลับมาดูยาก แม้ content จะบอก context ได้

### สถานะ codebase ปัจจุบัน

| ส่วน | รายละเอียด |
|------|------------|
| Storage | IndexedDB (Dexie) — ตาราง `tMDDocument` |
| UI | `OFileManager.tsx` — flat list + search |
| Type | `MarkdownDocument` มี `folderId?: string` แล้ว แต่ยังไม่ใช้ใน DB/UI |
| Features ที่มี | `tags[]`, `isStarred`, search by title/content/tags |

---

## Option A: Project Workspace (แบบ Notion / VS Code)

### แนวคิด

เพิ่มชั้น **Project** เป็น container หลัก — เลือก project ก่อน แล้วค่อยเห็นเอกสารใน project นั้น

```
┌─────────────────────┐
│ 🔍 Search           │
│ + New Project       │
├─────────────────────┤
│ 📁 AdaPos → D365 BC │ ← คลิกเลือก
│ 📁 MitIT Internal   │
│ 📁 Personal Notes   │
├─────────────────────┤
│ ⭐ Favorites        │
│ 🕐 Recent (5)       │
└─────────────────────┘
         ↓ เมื่อเลือก project
┌─────────────────────┐
│ ← AdaPos → D365 BC  │
│ + New Document      │
├─────────────────────┤
│ 📄 01 Architecture  │
│ 📄 04 Sequence      │
│ 📊 Mermaid Flow     │
└─────────────────────┘
```

### Pros

- แยกงานชัดเจน — ไม่ปนกันระหว่าง project
- ค้นหา scoped ได้ (ใน project นี้ / ทั้งหมด)
- ตั้งชื่อ project เป็นภาษาไทย/อังกฤษได้เต็ม ๆ แม้ชื่อ doc จะสั้น
- ใส่สี/ไอคอน project ได้ — ดูทันสมัย
- สอดคล้อง `folderId` ที่มีอยู่แล้วใน type

### Cons

- ต้อง migrate DB (เพิ่มตาราง `Project`) + ปรับ sidebar
- สร้าง doc ใหม่ต้องเลือก project ก่อน (หรือใช้ project ปัจจุบันเป็น default)

### Effort

**Medium**

---

## Option B: Smart Tags + Filter Chips (แบบ Linear / Gmail)

### แนวคิด

ไม่เพิ่ม entity ใหม่ — ใช้ **tags ที่มีอยู่** เป็น project label + filter bar ด้านบน

```
┌─────────────────────────────────┐
│ [All] [AdaPos-D365] [MitIT] [+] │ ← chip filter
├─────────────────────────────────┤
│ 🔍 Search documents...          │
├─────────────────────────────────┤
│ 📄 01 Architecture    🏷 AdaPos │
│ 📄 04 Sequence        🏷 AdaPos │
│ 📄 Meeting Notes      🏷 MitIT  │
└─────────────────────────────────┘
```

### Pros

- เปลี่ยน UI น้อยที่สุด — ใช้ `tags[]` ที่มีแล้ว
- doc อยู่ได้หลาย project (multi-tag)
- ค้นหา + filter รวมกันได้ทันที

### Cons

- ต้อง discipline ติด tag ทุกครั้ง — ไม่ติด = หายจาก project
- tag ปนกันได้ (`adapos`, `AdaPos`, `d365`) ถ้าไม่มี autocomplete
- ไม่มี "โฟลเดอร์" จริง — รู้สึกเป็น filter มากกว่า workspace

### Effort

**Low**

---

## Option C: Hybrid — Project + Recent/Favorites (แบบ Obsidian / Figma)

### แนวคิด

รวม Option A + ส่วนบนของ sidebar เป็น **quick access** ส่วนล่างเป็น **project tree**

```
┌─────────────────────┐
│ ⭐ Starred (2)      │
│ 🕐 Recent           │
│   └ 04 Sequence     │
│   └ 01 Architecture │
├─────────────────────┤
│ PROJECTS            │
│ ▼ AdaPos → D365 (3) │
│     01 Architecture │
│     04 Sequence     │
│     API Spec        │
│ ▶ MitIT Internal    │
│ ▶ Personal          │
│ + New Project       │
└─────────────────────┘
```

### Pros

- กลับมาทำต่อเร็ว (Recent) + จัดระยะยาว (Projects)
- Collapse/expand project — sidebar ไม่ยาวเกิน
- รองรับ `isStarred` ที่มีอยู่แล้ว
- UX คุ้นเคยจาก Obsidian, VS Code, Figma

### Cons

- UI ซับซ้อนกว่า A เล็กน้อย
- ต้องออกแบบ drag-and-drop ย้าย doc ข้าม project (optional แต่ user คาดหวัง)

### Effort

**Medium–High**

---

## เปรียบเทียบ

| เกณฑ์ | A: Workspace | B: Tags | C: Hybrid |
|--------|:------------:|:-------:|:---------:|
| แยกงานไม่ปน | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| ใช้งานง่าย | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| ทำเร็ว | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| ทันสมัย | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| กลับมาดูเร็ว | ⭐⭐ | ⭐⭐ | ⭐⭐⭐ |

---

## Recommendation

**Option C (Hybrid)** — ตรง use case มากที่สุด:

1. เอกสาร AdaPos/D365 หลายไฟล์ → เก็บใน project เดียว หาง่าย
2. **Recent** ช่วยกลับมาทำต่อทันที ไม่ต้องเปิด project ก่อน
3. **Starred** สำหรับ doc สำคัญ (spec, diagram หลัก)
4. มี `folderId` + `isStarred` + `tags` ใน codebase แล้ว — ขยายได้เป็นขั้น ๆ

### Phase แนะนำ (ถ้าจะ implement)

| Phase | ขอบเขต |
|-------|--------|
| **Phase 1** | Project list + assign doc → project (ใช้ `folderId`) |
| **Phase 2** | Recent + Starred sections ใน sidebar |
| **Phase 3** | Drag-drop, สี project, export ทั้ง project |

### ทางเลือกอื่น

- **Option A** — เรียบง่าย เน้น project อย่างเดียว
- **Option B** — ทำเร็ว ใช้ tag ก่อน แล้วค่อย upgrade
- **Mix B → C** — เริ่ม tag filter ก่อน validate UX แล้วค่อยเพิ่ม project entity

---

## ไฟล์ที่เกี่ยวข้อง (implementation reference)

| ไฟล์ | บทบาท |
|------|--------|
| `src/database/db.ts` | Dexie schema — ต้องเพิ่มตาราง Project |
| `src/types/index.ts` | `MarkdownDocument.folderId` พร้อมแล้ว |
| `src/components/OFileManager.tsx` | Sidebar UI หลัก |
| `src/stores/documentStore.ts` | State + search logic |
| `src/stores/editorStore.ts` | CRUD documents |

---

## Decision

> **ตัดสินใจแล้ว: Option C — Hybrid** (2026-06-06)

- [ ] Option A — Project Workspace
- [ ] Option B — Smart Tags
- [x] Option C — Hybrid (แนะนำ) — **Implemented Phase 1+2**
- [ ] อื่น ๆ: _______________

### Implementation Status

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1 | Done | Project CRUD, folderId, sidebar tree |
| Phase 2 | Done | Starred, Recent, Uncategorized |
| Phase 3 | Pending | Drag-drop, export project, colors picker |
