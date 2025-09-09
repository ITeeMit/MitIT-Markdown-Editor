# MitIT Markdown Editor - Docker Deployment Guide

## ไฟล์ที่จำเป็นสำหรับ Docker

โปรเจคนี้มีไฟล์ที่จำเป็นสำหรับการ deploy ด้วย Docker ดังนี้:

- `Dockerfile` - สำหรับ build Docker image
- `docker-compose.yml` - สำหรับจัดการ container
- `nginx.conf` - การกำหนดค่า nginx สำหรับ SPA
- `.dockerignore` - ไฟล์ที่ไม่ต้องรวมใน Docker image

## วิธีการใช้งาน

### 1. ใช้ Docker Compose (แนะนำ)

```bash
# Build และ run container
docker-compose up -d

# ดู logs
docker-compose logs -f

# หยุด container
docker-compose down

# Rebuild image
docker-compose up -d --build
```

### 2. ใช้ Docker Commands

```bash
# Build Docker image
docker build -t mitit-markdown-editor .

# Run container (คำสั่งที่แก้ไขแล้ว)
docker run -d --name mitit-markdown-editor -p 8037:80 mitit-markdown-editor

# ดู logs
docker logs mitit-markdown-editor

# หยุด container
docker stop mitit-markdown-editor

# ลบ container
docker rm mitit-markdown-editor
```

## การเข้าถึงแอปพลิเคชัน

หลังจาก run container แล้ว สามารถเข้าถึงแอปพลิเคชันได้ที่:

**URL:** http://localhost:8037

## คำสั่งที่แก้ไขแล้ว

**คำสั่งเดิม (ไม่ถูกต้อง):**
```bash
docker run -d --name MitIT Markdown Editor -p 8037:80 MitIT Markdown Editor
```

**คำสั่งที่แก้ไขแล้ว (ถูกต้อง):**
```bash
docker run -d --name mitit-markdown-editor -p 8037:80 mitit-markdown-editor
```

**เหตุผลที่แก้ไข:**
- ชื่อ container และ image ไม่สามารถมีช่องว่างได้
- ใช้ kebab-case แทน (mitit-markdown-editor)

## การตรวจสอบสถานะ

```bash
# ดู container ที่กำลังทำงาน
docker ps

# ดู container ทั้งหมด
docker ps -a

# ตรวจสอบ health check
docker inspect mitit-markdown-editor
```

## การ Debug

```bash
# เข้าไปใน container
docker exec -it mitit-markdown-editor sh

# ดู logs แบบ real-time
docker logs -f mitit-markdown-editor

# ตรวจสอบ nginx configuration
docker exec mitit-markdown-editor cat /etc/nginx/conf.d/default.conf
```

## ข้อมูลเพิ่มเติม

- **Port:** 8037 (external) → 80 (internal)
- **Base Image:** nginx:alpine
- **Build Strategy:** Multi-stage build
- **Health Check:** ตรวจสอบทุก 30 วินาที
- **Restart Policy:** unless-stopped

## การอัปเดตแอปพลิเคชัน

```bash
# หยุดและลบ container เดิม
docker-compose down

# Build image ใหม่
docker-compose up -d --build
```

หรือ

```bash
# หยุดและลบ container เดิม
docker stop mitit-markdown-editor
docker rm mitit-markdown-editor

# Build image ใหม่
docker build -t mitit-markdown-editor .

# Run container ใหม่
docker run -d --name mitit-markdown-editor -p 8037:80 mitit-markdown-editor
```