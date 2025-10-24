อัปเดต Web App Markdown Editor เดิม ให้รองรับ Multi-Mode Workspace โดยแยกแต่ละโหมดออกเป็นหลายหน้า (Multi-page) ด้วย React Router

### Tech Stack
- React + Vite + TypeScript
- TailwindCSS
- React Router (v6)
- Dexie.js (IndexedDB)
- Markdown renderer (remark/marked)
- Mermaid.js
- plantuml-encoder + PlantUML server
- jsPDF / pdf-lib สำหรับ export PDF
- SheetJS (xlsx) สำหรับ export Excel
- PWA (offline installable)

---

### Routing Structure
- `/` → Home / Mode Selector
- `/markdown` → Markdown Editor
- `/mermaid` → Mermaid Editor
- `/plantuml` → PlantUML Editor

---

### Pages

#### 1. Markdown Editor (`/markdown`)
- Editor + Live Preview
- Import/Export `.md`
- Export PDF / Excel
- Save/Load draft (IndexedDB → `markdown_files`)

#### 2. Mermaid Editor (`/mermaid`)
- Editor + Mermaid Diagram Preview
- Import/Export `.mmd`
- Export PNG / SVG / PDF
- Save/Load draft (IndexedDB → `mermaid_files`)

#### 3. PlantUML Editor (`/plantuml`)
- Editor + Diagram Preview (ผ่าน plantuml-encoder + PlantUML server)
- Import/Export `.puml`
- Export PNG / SVG / PDF
- Save/Load draft (IndexedDB → `plantuml_files`)
- ถ้า offline → แจ้งเตือนว่า render ไม่ได้

---

### UI/UX
- Navbar ด้านบน (หรือ Sidebar) มีเมนู:
  - Home | Markdown | Mermaid | PlantUML
- แต่ละหน้าใช้ Layout แบบ Split screen (Editor | Preview)
- Toolbar เฉพาะโหมด เช่น Import/Export/Save/Load
- Theme Toggle (Light/Dark)
- Responsive รองรับ Mobile

---

### Storage
- IndexedDB (Dexie.js) แยกเป็น 3 collections:
  - `markdown_files`
  - `mermaid_files`
  - `plantuml_files`

---

### PWA
- ติดตั้งใช้งานได้
- Offline รองรับทุกโหมด
  - Markdown + Mermaid ทำงานได้เต็ม
  - PlantUML ถ้า offline ให้แสดง warning

---

### Objective
- ลดความซับซ้อน โดยแยกแต่ละโหมดออกเป็นหน้าของตัวเอง
- ทำให้การ maintain code และเพิ่มฟีเจอร์ใหม่ง่ายขึ้น
- ใช้ Router ในการจัดการ navigation ระหว่างโหมด
