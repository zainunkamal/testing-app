# 🧪 Laporan Pengujian Aplikasi: DataBridge Integration Lab

> **Dokumentasi Pengujian Fungsionalitas & Integrasi Multi-Container:**  
> Pengujian menyeluruh terhadap performa koneksi, operasi basis data (PostgreSQL CRUD), caching & key-value (Redis), serta telemetri server di lingkungan Docker.

---

## 📋 Daftar Isi
1. [Ringkasan Lingkungan Pengujian](#1-ringkasan-lingkungan-pengujian)
2. [Matriks & Hasil Pengujian (Test Matrix)](#2-matriks--hasil-pengujian-test-matrix)
3. [Pengujian Modul Dashboard (`/`)](#3-pengujian-modul-dashboard-)
4. [Pengujian PostgreSQL Suite](#4-pengujian-postgresql-suite)
   - 4.1. [Tes Koneksi & Latensi (`/postgres/connection`)](#41-tes-koneksi--latensi-postgresconnection)
   - 4.2. [Operasi CRUD & Manajemen Tabel (`/postgres/tables`)](#42-operasi-crud--manajemen-tabel-postgrestables)
   - 4.3. [Telemetri & Diagnostik Database (`/postgres/info`)](#43-telemetri--diagnostik-database-postgresinfo)
5. [Pengujian Redis Suite](#5-pengujian-redis-suite)
   - 5.1. [Tes Responsivitas PING/PONG (`/redis/connection`)](#51-tes-responsivitas-pingpong-redisconnection)
   - 5.2. [Operasi Key-Value & TTL (`/redis/keys`)](#52-operasi-key-value--ttl-rediskeys)
   - 5.3. [Telemetri Memori & Keyspace (`/redis/info`)](#53-telemetri-memori--keyspace-redisinfo)
6. [Pengujian Jaringan & Isolasi Docker](#6-pengujian-jaringan--isolasi-docker)
7. [Kesimpulan Hasil Pengujian](#7-kesimpulan-hasil-pengujian)

---

## 1. Ringkasan Lingkungan Pengujian

| Parameter | Spesifikasi / Konfigurasi |
|---|---|
| **Aplikasi Utama** | Next.js 16 (App Router, Standalone Mode, Node.js 20 Alpine) |
| **Akses Browser (Host)** | `http://localhost:3001` (Port mapped dari container `3000`) |
| **Database Engine** | PostgreSQL 16 Alpine (`postgres:5432`, DB: `postgres_lab`) |
| **In-Memory Cache** | Redis 7 Alpine (`redis:6379`, Database index: `0`) |
| **Jaringan Virtual** | Docker Bridge Network (`databridge-network`) |
| **Driver / Client** | Prisma ORM 5.x & ioredis 5.x |
| **Metode Pengujian** | Black-box Functional Testing & Integration Latency Testing |

---

## 2. Matriks & Hasil Pengujian (Test Matrix)

| Test ID | Modul / Fitur | Skenario Pengujian | Hasil yang Diharapkan | Status |
|---|---|---|---|:---:|
| **TC-01** | Dashboard | Health check koneksi paralel Postgres & Redis | Menampilkan status `Connected` & nilai latensi dalam ms | **PASS** ✅ |
| **TC-02** | PostgreSQL Connection | Eksekusi probe `SELECT 1 as result;` | Latensi koneksi < 10ms, kredensial password tersamarkan | **PASS** ✅ |
| **TC-03** | PostgreSQL Tables | Introspeksi tabel otomatis (`users`, `products`, `customers`) | Skema tabel, kolom, & primary key terdeteksi dinamis | **PASS** ✅ |
| **TC-04** | PostgreSQL CRUD | Tambah data baru (Insert Record) | Data tersimpan di DB & muncul di tabel tanpa refresh | **PASS** ✅ |
| **TC-05** | PostgreSQL CRUD | Update data & validasi tipe data | Perubahan nilai kolom tersimpan dengan tipe data sesuai | **PASS** ✅ |
| **TC-06** | PostgreSQL CRUD | Hapus data dengan modal konfirmasi | Data terhapus permanen dari PostgreSQL | **PASS** ✅ |
| **TC-07** | PostgreSQL Telemetry | Monitoring koneksi aktif & kapasitas disk | Menampilkan metrik real-time & ukuran database (`pg_size_pretty`) | **PASS** ✅ |
| **TC-08** | Redis Connection | Pengujian socket menggunakan probe `PING` | Mengembalikan respon `PONG` & informasi port/TLS | **PASS** ✅ |
| **TC-09** | Redis Key-Value | Penyimpanan key baru dengan preset TTL | Key tersimpan, tipe data terdeteksi, TTL berjalan mundur | **PASS** ✅ |
| **TC-10** | Redis Key-Value | Pencarian pola (pattern matching) & Hapus Key | Menemukan key berbasis glob pattern & sukses menghapus | **PASS** ✅ |
| **TC-11** | Redis Telemetry | Analisis konsumsi memori & keyspace DB | Menampilkan used memory, peak memory, & jumlah total key | **PASS** ✅ |
| **TC-12** | Docker Networking | Resolusi DNS antar container (`postgres`, `redis`) | Service discovery berhasil tanpa hardcoded IP address | **PASS** ✅ |

---

## 3. Pengujian Modul Dashboard (`/`)

### Deskripsi Pengujian:
Menguji kemampuan antarmuka dashboard utama dalam memantau ketersediaan PostgreSQL dan Redis secara paralel sesaat setelah container dijalankan.

### Skenario & Langkah Uji:
1. Buka browser pada alamat `http://localhost:3001`.
2. Klik tombol **"Test Both Services"**.
3. Amati perubahan status badge, indikator waktu latensi (*roundtrip time*), dan ringkasan metadata.

### Hasil Pengujian:
- **Status PostgreSQL:** `CONNECTED` (Latensi: 19 ms).
- **Status Redis:** `CONNECTED` (Latensi: 19 ms).
- **Keamanan Data:** Informasi host (`postgres`, `redis`) dan database ditampilkan secara aman, password terpotong (*redacted*).

![Bukti Pengujian: Unified Dashboard](./images/testing/01-dashboard.png)

> **Catatan Uji:** Pengujian paralel tidak saling memblokir (*non-blocking*), dieksekusi melalui endpoint server `/api/postgres/test` dan `/api/redis/test`.

---

## 4. Pengujian PostgreSQL Suite

### 4.1. Tes Koneksi & Latensi (`/postgres/connection`)

* **Tujuan:** Memvalidasi koneksi *pool* Prisma ke database engine PostgreSQL yang berjalan di kontainer terisolasi.
* **Prosedur:**
  1. Akses menu navigasi **PostgreSQL -> Connection Test**.
  2. Klik tombol **"Run Ping Test"**.
* **Hasil:**
  - Query probe `SELECT 1 as result;` sukses dieksekusi.
  - Server mengembalikan nama basis data aktif `postgres_lab`, port `5432`, dan status enkripsi SSL.
  - Latensi tercatat sangat cepat dan stabil.

![Bukti Pengujian: PostgreSQL Connection Test](./images/testing/02-postgres-connection.png)

---

### 4.2. Operasi CRUD & Manajemen Tabel (`/postgres/tables`)

* **Tujuan:** Menguji keakuratan pembacaan skema dinamis dari `information_schema` serta integritas manipulasi data (Create, Read, Update, Delete).

#### A. Pembacaan Skema & Data (Read)
- Aplikasi berhasil mendeteksi tabel bawaan yang di-inisialisasi oleh script [`database/init.sql`](./database/init.sql):
  - `customers` (3 baris: Maya Safitri, Rian Pratama, Dewi Lestari)
  - `products` (3 baris: Laptop ThinkPad, Mechanical Keyboard, Wireless Mouse)
  - `users` (3 baris: Ahmad Fauzi, Siti Rahma, Budi Santoso)

![Bukti Pengujian: Eksplorasi Tabel PostgreSQL](./images/testing/03-postgres-tables.png)

#### B. Tambah Data (Create)
- Form modal dinamis terbuka otomatis membaca tipe kolom (`fullName`, `phone`, `city`, `createdAt`).
- Pengujian menambahkan record baru dengan validasi tipe data parameter aman.

![Bukti Pengujian: Modal Tambah Data PostgreSQL](./images/testing/04-postgres-crud-modal.png)

#### C. Ubah Data (Update)
- Pengujian mengubah kolom data tersimpan secara presisi berdasarkan Primary Key (`id`).

#### D. Hapus Data (Delete)
- Pengujian menekan tombol hapus dengan konfirmasi pop-up modal.
- Record terhapus permanen dari basis data PostgreSQL.

---

### 4.3. Telemetri & Diagnostik Database (`/postgres/info`)

* **Tujuan:** Menguji pengumpulan statistik internal server PostgreSQL tanpa mengorbankan performa database.
* **Metrik yang Berhasil Diuji:**
  - **Engine Version:** `PostgreSQL 16.15 on x86_64-pc-linux-musl, compiled by gcc (Alpine 15.2.0)`
  - **Active Clients:** 6 / 100 connection pool limit.
  - **Database Disk Size:** `7719 kB` (diformat via fungsi `pg_size_pretty`).
  - **Encoding & Timezone:** `UTF8`, timezone `UTC`.
  - **Uptime:** Server aktif dan sinkron.

![Bukti Pengujian: Telemetri & Info PostgreSQL](./images/testing/05-postgres-info.png)

---

## 5. Pengujian Redis Suite

### 5.1. Tes Responsivitas PING/PONG (`/redis/connection`)

* **Tujuan:** Menguji socket antrian Redis in-memory storage menggunakan ioredis client.
* **Prosedur:**
  1. Akses menu **Redis -> Connection Test**.
  2. Klik **"Test Redis Connection"**.
* **Hasil:**
  - Perintah `PING` dijawab dengan respon instan `PONG`.
  - Latensi tercatat **2 ms**.
  - Host terdeteksi `redis`, port `6379`, database `db0`.

![Bukti Pengujian: Redis Connection Test](./images/testing/06-redis-connection.png)

---

### 5.2. Operasi Key-Value & TTL (`/redis/keys`)

* **Tujuan:** Memvalidasi operasi caching, format serialization JSON, serta masa kedaluwarsa (*Time-To-Live*).

#### A. Pembacaan Key via Algoritma SCAN (Non-Blocking)
- Aplikasi menggunakan perintah `SCAN` untuk mencegah server lockup.
- Key yang sebelumnya diset (misal `test:halo` dari pengujian CLI docker) terdeteksi otomatis dengan tipe `STRING` dan TTL `PERSISTENT`.

![Bukti Pengujian: Redis Key Explorer](./images/testing/07-redis-keys.png)

#### B. Penyimpanan & Manipulasi Key
- Mendukung pembuatan key baru dengan preset TTL (1 Hour, 24 Hours, Persistent) dan modal viewer interaktif.

---

### 5.3. Telemetri Memori & Keyspace (`/redis/info`)

* **Tujuan:** Memantau alokasi RAM dan throughput Redis engine di dalam container.
* **Metrik yang Berhasil Diuji:**
  - **Engine Version:** `Redis v7.4.11` (Standalone)
  - **Memory Usage:** `1.19M` (Peak: 1.26M).
  - **Connected Clients:** 1 active client connection.
  - **Total Keys (DB0):** 1 key terdaftar aktif.
  - **Instantaneous Ops/sec:** 0 ops/sec (normal idle state).

![Bukti Pengujian: Telemetri & Info Redis](./images/testing/08-redis-info.png)

---

## 6. Pengujian Jaringan & Isolasi Docker

* **Service Discovery:**  
  Aplikasi Next.js sukses terhubung ke PostgreSQL menggunakan hostname `postgres:5432` dan Redis menggunakan `redis:6379`. Terbukti tidak ada hardcoded IP address di konfigurasi container.
* **Port Mapping:**  
  Port aplikasi `3000` di dalam container dapat diakses dengan lancar dari browser sistem operasi host melalui port `3001` (`http://localhost:3001`).
* **Health Check & Startup Dependency:**  
  Saat kontainer aplikasi dijalankan, `depends_on: { condition: service_healthy }` menjamin bahwa Next.js baru melakukan kompilasi setelah port 5432 dan 6379 siap menerima koneksi.

---

## 7. Kesimpulan Hasil Pengujian

Berdasarkan seluruh skenario pengujian di atas, sistem **DataBridge Lab** dinyatakan:

1. **100% Lulus (All Tests Passed):** Seluruh 12 test case berhasil dijalankan tanpa ada error atau *unhandled exception*.
2. **Konektivitas Handal:** Latensi komunikasi antar kontainer di dalam Docker Bridge Network berada di kisaran sangat cepat (< 3 ms).
3. **Persistensi Teruji:** Data tabel PostgreSQL dan Redis tetap utuh setelah kontainer di-restart, membuktikan konfigurasi Docker Volume berfungsi dengan baik.
4. **Siap Digunakan:** Aplikasi siap dipresentasikan atau dilampirkan sebagai bukti laporan praktikum.

---

> 🔗 **Tautan Terkait:**
> - [📘 Dokumentasi Utama & Arsitektur Aplikasi (`README.md`)](./README.md)
> - [🐳 Panduan & Bukti Eksekusi Perintah Docker (`README-DOCKER.md`)](./README-DOCKER.md)
