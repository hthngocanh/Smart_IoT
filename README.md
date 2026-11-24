# HỆ THỐNG TƯỚI CÂY THÔNG MINH IOT (SMART PLANT IOT)

Dự án nghiên cứu & ứng dụng: **"Xây dựng hệ thống tưới cây thông minh ứng dụng IoT, giám sát độ ẩm đất và điều khiển tưới tự động từ xa"**.

---

## 1. Cấu Trúc Dự Án

```text
ltn/
├── Smart_IoT/               # Firmware Arduino chính thức cho ESP32 (Wi-Fi, cảm biến, an toàn bơm)
├── SMART_PLANT_FIRMWARE/    # Firmware bản cũ (giai đoạn 3)
├── test_analog/             # Sketch test đọc cảm biến ADC GPIO34
├── test_mosfet/             # Sketch test kích MOSFET HW-518 GPIO26
├── backend/                 # Backend NestJS + TypeORM + PostgreSQL
│   ├── src/
│   │   ├── config/          # Cấu hình TypeORM & Database
│   │   ├── modules/
│   │   │   └── health/      # Module kiểm tra tình trạng hệ thống
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── test/                # Unit & E2E tests
│   ├── .env.example
│   ├── .gitignore
│   └── package.json
├── docker-compose.yml       # Docker Compose cho PostgreSQL 16
├── .env.example             # Mẫu biến môi trường cho Docker
└── README.md                # Tài liệu hướng dẫn
```

---

## 2. Yêu Cầu Môi Trường

- **Node.js**: phiên bản `>= 20.x` (đang dùng `v24.13.1`).
- **npm**: phiên bản `>= 10.x` (đang dùng `11.8.0`).
- **Docker Desktop**: Docker Engine `>= 26.x` & Docker Compose `v2/v5`.

---

## 3. Hướng Dẫn Cài Đặt & Khởi Chạy

### Bước 1: Cài đặt Dependencies cho Backend

Di chuyển vào thư mục `backend` và chạy lệnh cài đặt:

```bash
cd backend
npm install
```

### Bước 2: Cấu hình Biến Môi Trường (.env)

Sao chép file `.env.example` thành `.env` tại cả thư mục gốc và thư mục `backend`:

```bash
# Tại thư mục gốc ltn/
cp .env.example .env

# Tại thư mục backend/
cd backend
cp .env.example .env
```

Các thông số cấu hình mặc định:
- `PORT=3000`
- `GLOBAL_PREFIX=api/v1`
- `DB_HOST=localhost`
- `DB_PORT=5432`
- `DB_USER=smartplant_user`
- `DB_PASSWORD=smartplant_secret_2026`
- `DB_NAME=smart_plant`
- `DB_SYNCHRONIZE=false`

*Lưu ý:* Nếu cổng `5432` trên máy của bạn đã bị chiếm dụng bởi PostgreSQL cài trực tiếp (Windows Service), bạn có thể đổi `DB_PORT=5434` trong cả 2 file `.env`.

### Bước 3: Khởi chạy PostgreSQL bằng Docker Compose

Từ thư mục gốc `ltn/`, mở terminal và chạy:

```bash
docker compose up -d
```

Kiểm tra trạng thái container và healthcheck:

```bash
docker compose ps
```

Container `smart-plant-postgres` sẽ báo trạng thái `Up (healthy)`.

### Bước 4: Khởi chạy Backend NestJS

Từ thư mục `backend/`, chạy lệnh:

```bash
# Chế độ phát triển (Hot reload)
npm run start:dev

# Hoặc chế độ thường
npm run start
```

Khi khởi chạy thành công, console sẽ hiển thị:
```text
[Bootstrap]   SMART PLANT IOT BACKEND IS RUNNING
[Bootstrap]   Environment : development
[Bootstrap]   Port        : 3000
[Bootstrap]   Health API  : http://localhost:3000/api/v1/health
```

---

## 4. Kiểm Tra API Hệ Thống

### Kiểm tra Health Check

Sử dụng trình duyệt hoặc cURL:

```bash
curl http://localhost:3000/api/v1/health
```

#### Kết quả khi Hệ thống & Database hoạt động bình thường (HTTP 200 OK):

```json
{
  "status": "healthy",
  "backend": {
    "status": "up",
    "uptime": 12.34,
    "timestamp": "2026-11-11T08:00:00.000Z"
  },
  "database": {
    "status": "connected",
    "latencyMs": 4
  }
}
```

#### Kết quả khi Database gặp sự cố hoặc chưa bật (HTTP 503 Service Unavailable):

```json
{
  "status": "unhealthy",
  "backend": {
    "status": "up",
    "uptime": 12.34,
    "timestamp": "2026-11-11T08:00:00.000Z"
  },
  "database": {
    "status": "disconnected",
    "error": "connect ECONNREFUSED 127.0.0.1:5432"
  }
}
```

---

## 5. Dừng Dịch Vụ

### Dừng Backend:
Nhấn tổ hợp phím `Ctrl + C` trong terminal đang chạy NestJS.

### Dừng PostgreSQL Container:
Tại thư mục gốc `ltn/`:

```bash
docker compose down
```

*(Lệnh này chỉ dừng và xóa container, dữ liệu database được bảo toàn an toàn trong Docker Volume `smart_plant_postgres_data`).*

