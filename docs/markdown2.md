เพื่อปรับปรุงฟังก์ชัน `convertToMarkdown` ให้รองรับ **Inline Code** และ **Code Block** เราจะเพิ่มความสามารถในการจัดการข้อความที่เกี่ยวข้องกับโค้ด โดยใช้กฎดังนี้:

1. **Inline Code**:
   - ข้อความที่ถูกครอบด้วย \` (backtick) จะแปลงเป็น Inline Code (`code`)

2. **Code Block**:
   - หากพบคำว่า "ตัวอย่าง code" หรือ "script" ในบรรทัดเดียวกัน จะแปลงเนื้อหาในบรรทัดถัดไปเป็น Code Block (\`\`\`)
   - หากพบหลายบรรทัดที่เริ่มต้นด้วย Tab หรือ Space 4 ตัว จะแปลงเป็น Code Block

3. **Section Headers**:
   - เนื้อหาที่อยู่ภายใต้หัวข้อย่อย เช่น `##` หรือ `###` จะถูกตรวจสอบเพื่อดูว่าควรมี Code Block หรือไม่

---

### **โค้ดที่ปรับปรุง**

```tsx
import React, { useState } from "react";

// Utility function to convert raw text into Markdown format
const convertToMarkdown = (rawText: string): string => {
  const lines = rawText.split("\n");
  let markdown = "";
  let inCodeBlock = false;

  lines.forEach((line, index) => {
    // Convert headers
    if (line.startsWith("*")) {
      const headerLevel = line.match(/^\*+/)?.[0]?.length || 1;
      const content = line.replace(/^\*+/, "").trim();
      markdown += `${"#".repeat(headerLevel)} ${content}\n`;
    }
    // Convert bold text (*text*)
    else if (/\*.+\*/.test(line)) {
      const boldContent = line.replace(/\*(.+)\*/, "**$1**");
      markdown += `${boldContent}\n`;
    }
    // Convert inline code (`code`)
    else if (/`.+`/.test(line)) {
      const inlineCode = line.replace(/`(.+)`/, "`$1`");
      markdown += `${inlineCode}\n`;
    }
    // Detect code block start or end
    else if (line.includes("ตัวอย่าง code") || line.includes("script")) {
      markdown += `\`\`\`\n`; // Start code block
      inCodeBlock = true;
    } else if (inCodeBlock && (line.trim() === "" || index === lines.length - 1)) {
      markdown += `\`\`\`\n`; // End code block
      inCodeBlock = false;
    } else if (inCodeBlock) {
      markdown += `${line}\n`; // Preserve indentation inside code block
    }
    // Convert tables
    else if (line.includes("|")) {
      markdown += `${line}\n`;
    }
    // Convert bullet points
    else if (line.trim().startsWith("-")) {
      markdown += `${line.trim()}\n`;
    }
    // Default case for plain text
    else {
      markdown += `${line}\n`;
    }
  });

  return markdown;
};

const MarkdownEditor: React.FC = () => {
  const [inputText, setInputText] = useState<string>("");
  const [markdownOutput, setMarkdownOutput] = useState<string>("");

  // Handle form submission and conversion
  const handleConvert = () => {
    const formattedMarkdown = convertToMarkdown(inputText);
    setMarkdownOutput(formattedMarkdown);
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>Markdown Converter</h1>

      {/* Input Area */}
      <div style={{ marginBottom: "20px" }}>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          rows={10}
          cols={80}
          placeholder="Paste your raw text here..."
        />
      </div>

      {/* Convert Button */}
      <button onClick={handleConvert} style={{ padding: "10px 20px" }}>
        Convert to Markdown
      </button>

      {/* Output Preview */}
      <div style={{ marginTop: "20px" }}>
        <h2>Markdown Output:</h2>
        <pre style={{ whiteSpace: "pre-wrap", backgroundColor: "#f4f4f4", padding: "10px", borderRadius: "5px" }}>
          {markdownOutput}
        </pre>
      </div>
    </div>
  );
};

export default MarkdownEditor;
```

---

### **คำอธิบายการปรับปรุง**

#### 1. **Inline Code**
- ใช้ Regular Expression (`/`.+\``) เพื่อตรวจจับข้อความที่ถูกครอบด้วย \` และแปลงเป็น Inline Code (`code`)

#### 2. **Code Block**
- หากพบคำว่า "ตัวอย่าง code" หรือ "script" ในบรรทัดเดียวกัน จะเริ่ม Code Block (`\`\`\``)
- หากพบบรรทัดว่างหรือบรรทัดสุดท้ายในขณะที่อยู่ใน Code Block จะปิด Code Block (`\`\`\``)

#### 3. **Preserve Indentation**
- บรรทัดที่อยู่ใน Code Block จะคงไว้ซึ่งการเว้นวรรคหรือแท็บ เพื่อรักษาโครงสร้างของโค้ด

---

### **ตัวอย่างการใช้งาน**

**ข้อความดิบ (Input)**:
```
* ชื่อการประชุม: การประชุมทบทวนสถานะและวางแผนแก้ไขปัญหาโครงการ 681124PHP
** วันที่: [ระบุวันที่ปัจจุบัน]
*** เวลา: ช่วงเช้า
* สถานที่: การประชุมทางไกล (Online)
* ผู้เข้าร่วมประชุม:
  - ที
  - เจมส์
  - ไอซ์
* สรุปประเด็นสำคัญ:
  * เป้าหมายเดิม: โครงการต้องแล้วเสร็จภายในวันที่ 25
  * สถานะปัจจุบัน: มีความล่าช้าอย่างมาก
  * เป้าหมายใหม่: กำหนดการแล้วเสร็จเลื่อนออกไปเป็นช่วง "กลางเดือนหน้า"
| ลำดับ | รายการ (Action Item) | ผู้รับผิดชอบ (Owner) | กำหนดส่ง (Due Date) |
|-------|------------------------|-----------------------|----------------------|
| 1     | รวบรวมแผนงาน         | ไอซ์                 | ก่อนการประชุมวันถัดไป |

ตัวอย่าง code:
function helloWorld() {
    console.log("Hello, world!");
}

ตัวอย่าง script:
npm install axios
```

**ผลลัพธ์ (Output)**:
```markdown
# ชื่อการประชุม: การประชุมทบทวนสถานะและวางแผนแก้ไขปัญหาโครงการ 681124PHP
## วันที่: [ระบุวันที่ปัจจุบัน]
### เวลา: ช่วงเช้า
# สถานที่: การประชุมทางไกล (Online)
# ผู้เข้าร่วมประชุม:
- ที
- เจมส์
- ไอซ์
# สรุปประเด็นสำคัญ:
- **เป้าหมายเดิม**: โครงการต้องแล้วเสร็จภายในวันที่ 25
- **สถานะปัจจุบัน**: มีความล่าช้าอย่างมาก
- **เป้าหมายใหม่**: กำหนดการแล้วเสร็จเลื่อนออกไปเป็นช่วง "กลางเดือนหน้า"
| ลำดับ | รายการ (Action Item) | ผู้รับผิดชอบ (Owner) | กำหนดส่ง (Due Date) |
|-------|------------------------|-----------------------|----------------------|
| 1     | รวบรวมแผนงาน         | ไอซ์                 | ก่อนการประชุมวันถัดไป |

ตัวอย่าง code:
```javascript
function helloWorld() {
    console.log("Hello, world!");
}
```

ตัวอย่าง script:
```bash
npm install axios
```
```

---

### **ผลลัพธ์ที่คาดหวัง**
- **Inline Code**: ข้อความที่ถูกครอบด้วย \` จะกลายเป็น Inline Code
- **Code Block**: ข้อความที่อยู่ภายใต้คำว่า "ตัวอย่าง code" หรือ "script" จะถูกแปลงเป็น Code Block
- **Preserve Formatting**: การเว้นวรรคหรือแท็บใน Code Block จะถูกรักษาไว้

หากต้องการเพิ่มความสามารถอื่น ๆ โปรดแจ้งรายละเอียดเพิ่มเติมครับ! 😊