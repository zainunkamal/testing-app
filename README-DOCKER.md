# 🐳 Panduan Lengkap Docker & Docker Compose: DataBridge Lab
> **Tugas / Praktikum Docker:** Implementasi Multi-Container Application Menggunakan Next.js, PostgreSQL, dan Redis.

---

## 📋 Daftar Isi
1. [Arsitektur Multi-Container](#1-arsitektur-multi-container)
2. [Bedah Dockerfile (Multi-Stage Build)](#2-bedah-dockerfile-multi-stage-build)
3. [Bedah Docker Compose (Orkestrasi Service)](#3-bedah-docker-compose-orkestrasi-service)
4. [Konsep Docker Volume (Persistensi Data)](#4-konsep-docker-volume-persistensi-data)
5. [Konsep Docker Network (Komunikasi Antar Container)](#5-konsep-docker-network-komunikasi-antar-container)
6. [Menjalankan Manual Menggunakan `docker run` (CLI Murni)](#6-menjalankan-manual-menggunakan-docker-run-cli-murni)
7. [Inspeksi & Debugging Container (`docker exec`)](#7-inspeksi--debugging-container-docker-exec)
8. [Monitoring Sumber Daya (`docker stats` & `logs`)](#8-monitoring-sumber-daya-docker-stats--logs)
9. [Cheatsheet Perintah Docker](#9-cheatsheet-perintah-docker)

---

## 1. Arsitektur Multi-Container

Aplikasi ini menggunakan topologi **3 Container** terisolasi yang saling terhubung dalam satu virtual network Docker (`databridge-network`):

```text
+-----------------------------------------------------------------------------------+
| Host Machine                                                                      |
|                                                                                   |
|  Browser / Client                                                                 |
|         │                                                                         |
|         ▼ (Port 3001:3000)                                                        |
|  +─────────────────────────────────────────────────────────────────────────────+  |
|  | [Container 1: databridge-app]                                              |  |
|  | - Next.js 16 Standalone (Node.js 20 Alpine)                                 |  |
|  | - Prisma Client & ioredis Driver                                            |  |
|  +──────────────────────────────────────┬──────────────────────────────────────+  |
|                                         │                                         |
|                 ┌───────────────────────┴───────────────────────┐                 |
|                 │ Virtual Network (databridge-network)          │                 |
|                 ▼ (postgres:5432)                               ▼ (redis:6379)    |
|  +───────────────────────────────+            +────────────────────────────────+  |
|  | [Container 2: postgres]       |            | [Container 3: redis]           |  |
|  | - PostgreSQL 16 Alpine        |            | - Redis 7 Alpine               |  |
|  | - Volume: postgres_data       |            | - Volume: redis_data           |  |
|  | - Bind Mount: ./database/init |            | - Append-only file persistence |  |
|  +───────────────────────────────+            +────────────────────────────────+  |
|                 │                                              │                  |
|                 ▼ (Port 5432:5432)                             ▼ (Port 6379:6379) |
|         External Tool (DBeaver)                        Redis Insight / GUI        |
+-----------------------------------------------------------------------------------+
```

---

## 2. Bedah Dockerfile (Multi-Stage Build)

File [`Dockerfile`](./Dockerfile) didesain menggunakan teknik **Multi-Stage Build**. Tujuannya adalah memisahkan proses instalasi dependency dan kompilasi dari image akhir produksi, sehingga ukuran image menjadi sangat kecil (~150MB dibandingkan image standar ~1.2GB) dan lebih aman.

### Tahapan dalam Dockerfile:

1. **Stage 1: `deps` (Dependency Installation)**
   ```dockerfile
   FROM node:20-alpine AS deps
   RUN apk add --no-cache libc6-compat
   WORKDIR /app
   COPY package.json package-lock.json* ./
   COPY prisma ./prisma/
   RUN npm ci
   ```
   *Fungsi:* Menginstal seluruh pustaka node dan men-generate engine biner Prisma Client. Memanfaatkan caching layer Docker agar `npm ci` tidak dijalankan ulang jika `package.json` tidak berubah.

2. **Stage 2: `builder` (Application Compilation)**
   ```dockerfile
   FROM node:20-alpine AS builder
   WORKDIR /app
   COPY --from=deps /app/node_modules ./node_modules
   COPY . .
   ENV NEXT_TELEMETRY_DISABLED=1
   ENV NODE_ENV=production
   RUN npm run build
   ```
   *Fungsi:* Melakukan build Next.js dengan mode `output: "standalone"`. Hasilnya adalah bundle minimalis berisi server mandiri beserta modul-modul yang hanya dipakai saat runtime di `.next/standalone`.

3. **Stage 3: `runner` (Production Image)**
   ```dockerfile
   FROM node:20-alpine AS runner
   WORKDIR /app
   ENV NODE_ENV=production
   RUN addgroup --system --gid 1001 nodejs && \
       adduser --system --uid 1001 nextjs
   COPY --from=builder /app/public ./public
   COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
   COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
   USER nextjs
   EXPOSE 3000
   CMD ["node", "server.js"]
   ```
   *Keamanan & Best Practice:*
   - Menjalankan container dengan akun non-root (`nextjs`, UID 1001) untuk mencegah *privilege escalation*.
   - Hanya menyalin file yang esensial untuk eksekusi, membuang source TypeScript mentah dan devDependencies.

### Perintah Build Manual Menggunakan Docker CLI:
```bash
docker build -t databridge-app:latest .
```

---

## 3. Bedah Docker Compose (Orkestrasi Service)

File [`docker-compose.yml`](./docker-compose.yml) mengatur konfigurasi ketiga service secara deklaratif.

### Parameter Penting:
- **`ports`**: Memetakan port Host ke Container.
  - `"3001:3000"`: Mengakses aplikasi dari browser host di port `3001`, diteruskan ke port `3000` di dalam container.
  - `"5432:5432"`: Port PostgreSQL untuk koneksi database client (misal DBeaver/DataGrip).
  - `"6379:6379"`: Port Redis untuk koneksi eksternal.
- **`healthcheck`**:
  - PostgreSQL menggunakan `pg_isready -U postgres -d postgres_lab` setiap 5 detik.
  - Redis menggunakan `redis-cli ping` setiap 5 detik.
- **`depends_on` dengan `condition: service_healthy`**:
  - Container `app` hanya akan dinyalakan **setelah** PostgreSQL dan Redis benar-benar siap menerima koneksi (mencegah error *connection refused* saat boot).

### Perintah Utama Docker Compose:

1. **Menjalankan Seluruh Service di Latar Belakang (Detached Mode):**
   ```bash
   docker compose up -d
   ```
   ![Bukti Eksekusi: docker compose up -d](./images/3.1.png)

2. **Membangun Ulang Image dan Menjalankannya:**
   ```bash
   docker compose up -d --build
   ```
   ![Bukti Eksekusi: docker compose up -d --build](./images/3.2.png)

3. **Melihat Status Container yang Sedang Berjalan:**
   ```bash
   docker compose ps
   ```
   ![Bukti Eksekusi: docker compose ps](./images/3.3.png)

4. **Melihat Log Seluruh Container Secara Real-Time:**
   ```bash
   docker compose logs -f
   ```
   ![Bukti Eksekusi: docker compose logs -f](./images/3.4.png)

5. **Melihat Log Service Tertentu (Misal App):**
   ```bash
   docker compose logs -f app
   ```
   ![Bukti Eksekusi: docker compose logs -f app](./images/3.5.png)

6. **Menghentikan Seluruh Service:**
   ```bash
   docker compose stop
   ```
   ![Bukti Eksekusi: docker compose stop](./images/3.6.png)

7. **Menghentikan dan Menghapus Seluruh Container & Network:**
   ```bash
   docker compose down
   ```
   ![Bukti Eksekusi: docker compose down](./images/3.7.png)

8. **Menghapus Total Termasuk Volume Database (Reset Ulang):**
   ```bash
   docker compose down -v
   ```
   ![Bukti Eksekusi: docker compose down -v](./images/3.8.png)

---

## 4. Konsep Docker Volume (Persistensi Data)

Secara default, filesystem di dalam container bersifat *ephemeral* (data akan hilang saat container dihapus). Untuk menjaga agar data tidak hilang, digunakan **Docker Volume**.

Pada project ini, terdapat dua jenis volume yang diterapkan:

### A. Named Volume (Persistensi Data Database & Cache)
Dideklarasikan di bagian bawah `docker-compose.yml`:
```yaml
volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
```
- `postgres_data`: Menyimpan seluruh file database PostgreSQL di `/var/lib/postgresql/data`. Data tabel `users`, `products`, dsb. tetap aman meskipun container dimatikan atau di-recreate.
- `redis_data`: Menyimpan file append-only data Redis di `/data`.

### B. Bind Mount (Sinkronisasi File Host ke Container)
Pada service PostgreSQL:
```yaml
volumes:
  - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
```
- File [`database/init.sql`](./database/init.sql) di komputer host di-mount secara langsung (read-only) ke dalam folder inisialisasi resmi PostgreSQL.
- Saat container pertama kali dibuat, skrip ini otomatis dijalankan untuk membuat skema tabel dan mengisi data awal.

### Perintah CLI untuk Manajemen Docker Volume:

1. **Melihat Daftar Volume yang Ada di Sistem:**
   ```bash
   docker volume ls
   ```
   ![Bukti Eksekusi: docker volume ls](./images/4.1.png)

2. **Memeriksa Lokasi Penyimpanan Volume di Host:**
   ```bash
   docker volume inspect new-app_postgres_data
   ```
   ![Bukti Eksekusi: docker volume inspect new-app_postgres_data](./images/4.2.png)

3. **Menghapus Volume Tertentu (Container harus dalam kondisi mati):**
   ```bash
   docker volume rm new-app_postgres_data
   ```
   ![Bukti Eksekusi: docker volume rm new-app_postgres_data](./images/4.3.png)

4. **Membersihkan Seluruh Volume yang Sudah Tidak Digunakan:**
   ```bash
   docker volume prune -f
   ```
   ![Bukti Eksekusi: docker volume prune -f](./images/4.4.png)

---

## 5. Konsep Docker Network (Komunikasi Antar Container)

Project ini mendefinisikan network bertipe *bridge* bernama `databridge-network`:
```yaml
networks:
  databridge-network:
    driver: bridge
```

### Keunggulan Service Discovery via DNS Docker:
Di dalam Docker Network, kita **tidak perlu** mencari IP container secara manual. Docker menyediakan server DNS internal:
- Container `app` dapat langsung menghubungi database PostgreSQL menggunakan hostname **`postgres`**:
  ```env
  DATABASE_URL=postgresql://postgres:postgrespassword@postgres:5432/postgres_lab
  ```
- Container `app` dapat langsung menghubungi Redis menggunakan hostname **`redis`**:
  ```env
  REDIS_URL=redis://redis:6379/0
  ```

### Perintah CLI untuk Manajemen Docker Network:

1. **Melihat Daftar Network:**
   ```bash
   docker network ls
   ```
   ![Bukti Eksekusi: docker network ls](./images/5.1.png)

2. **Melihat Container yang Terhubung dalam Network:**
   ```bash
   docker network inspect new-app_databridge-network
   ```
   ![Bukti Eksekusi: docker network inspect new-app_databridge-network](./images/5.2.png)

---

## 6. Menjalankan Manual Menggunakan `docker run` (CLI Murni)

Untuk keperluan tugas yang mewajibkan perintah dasar Docker tanpa bantuan Docker Compose, berikut langkah-langkah menjalankannya secara bertahap menggunakan CLI murni:

### Langkah 1: Buat Docker Network
```bash
docker network create databridge-net
```
![Bukti Eksekusi: docker network create databridge-net](./images/6.1.png)

### Langkah 2: Buat Named Volume
```bash
docker volume create pgdata
docker volume create redisdata
```
![Bukti Eksekusi: docker volume create pgdata & redisdata](./images/6.2.png)

### Langkah 3: Jalankan Container PostgreSQL
```bash
docker run -d \
  --name my-postgres \
  --network databridge-net \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgrespassword \
  -e POSTGRES_DB=postgres_lab \
  -p 5432:5432 \
  -v pgdata:/var/lib/postgresql/data \
  -v $(pwd)/database/init.sql:/docker-entrypoint-initdb.d/init.sql:ro \
  postgres:16-alpine
```
![Bukti Eksekusi: docker run postgres](./images/6.3.png)

### Langkah 4: Jalankan Container Redis
```bash
docker run -d \
  --name my-redis \
  --network databridge-net \
  -p 6379:6379 \
  -v redisdata:/data \
  redis:7-alpine redis-server --appendonly yes
```
![Bukti Eksekusi: docker run redis](./images/6.4.png)

### Langkah 5: Build Image Next.js App
```bash
docker build -t databridge-app:latest .
```
![Bukti Eksekusi: docker build databridge-app](./images/6.5.png)

### Langkah 6: Jalankan Container Next.js App
```bash
docker run -d \
  --name my-app \
  --network databridge-net \
  -p 3001:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL=postgresql://postgres:postgrespassword@my-postgres:5432/postgres_lab \
  -e REDIS_URL=redis://my-redis:6379/0 \
  databridge-app:latest
```
![Bukti Eksekusi: docker run my-app](./images/6.6.png)

---

## 7. Inspeksi & Debugging Container (`docker exec`)

Perintah `docker exec` digunakan untuk menjalankan perintah interaktif langsung di dalam container yang sedang menyala.

### 1. Masuk ke Terminal PostgreSQL (psql CLI)
Uji eksekusi query PostgreSQL langsung di dalam container:
```bash
docker exec -it databridge-postgres psql -U postgres -d postgres_lab
```
*Contoh query di dalam prompt `postgres_lab=#`:*
```sql
\dt                  -- Melihat daftar tabel
SELECT * FROM users; -- Menampilkan isi tabel users
\q                   -- Keluar
```
![Bukti Eksekusi: docker exec psql](./images/7.1.png)

### 2. Masuk ke Terminal Redis (redis-cli)
Uji manipulasi key-value langsung di dalam container:
```bash
docker exec -it databridge-redis redis-cli
```
*Contoh command di dalam prompt `127.0.0.1:6379>`:*
```bash
PING
SET test:halo "Halo Dunia"
GET test:halo
KEYS *
exit
```
![Bukti Eksekusi: docker exec redis-cli](./images/7.2.png)

### 3. Masuk ke Shell Container Aplikasi Next.js
Melihat filesystem dan struktur file aplikasi yang sudah di-bundle:
```bash
docker exec -it databridge-app sh
```
*Contoh perintah di dalam shell container:*
```bash
ls -lah
exit
```
![Bukti Eksekusi: docker exec sh](./images/7.3.png)

---

## 8. Monitoring Sumber Daya (`docker stats` & `logs`)

### 1. Monitoring Konsumsi RAM & CPU Real-time
Jalankan perintah ini untuk melihat penggunaan memori dan beban prosesor ketiga container:
```bash
docker stats
```
![Bukti Eksekusi: docker stats](./images/8.1.png)

### 2. Menginspeksi Log Tertentu
Melihat 50 baris log terakhir dari PostgreSQL:
```bash
docker logs --tail 50 databridge-postgres
```
![Bukti Eksekusi: docker logs](./images/8.2.png)

---

## 9. Cheatsheet Perintah Docker

| Kategori | Perintah | Penjelasan |
|---|---|---|
| **Compose** | `docker compose up -d` | Menjalankan seluruh stack aplikasi di latar belakang. |
| **Compose** | `docker compose up -d --build` | Membangun ulang image code terbaru lalu menjalankannya. |
| **Compose** | `docker compose down` | Mematikan dan membersihkan container & network. |
| **Compose** | `docker compose down -v` | Menghapus container, network, dan **volume database**. |
| **Container** | `docker ps` | Menampilkan container yang sedang aktif beserta port-nya. |
| **Container** | `docker stop <id/nama>` | Menghentikan container yang sedang berjalan. |
| **Container** | `docker restart <id/nama>` | Me-restart container tertentu. |
| **Image** | `docker images` | Melihat daftar image lokal di komputer. |
| **Image** | `docker rmi <image_id>` | Menghapus image dari komputer lokal. |
| **Exec** | `docker exec -it <nama> sh` | Masuk ke terminal shell di dalam container. |
| **Volume** | `docker volume ls` | Menampilkan seluruh volume persisten. |
| **Network** | `docker network ls` | Menampilkan virtual network yang aktif. |
| **Stats** | `docker stats` | Memantau penggunaan CPU & RAM container secara real-time. |
| **Clean** | `docker system prune -a` | Membersihkan cache container, image, dan network yang tidak terpakai. |

---

> Dokumen ini disusun untuk melengkapi tugas dan laporan praktikum implementasi containerization aplikasi modern menggunakan Docker & Docker Compose.
> 
> 🧪 **Untuk Laporan Pengujian Fungsionalitas Aplikasi:**  
> Silakan lihat dokumen **[`README-TESTING.md`](./README-TESTING.md)** yang memuat matriks pengujian (Test Matrix TC-01 s/d TC-12), pengujian latensi, PostgreSQL CRUD, dan Redis Caching.
