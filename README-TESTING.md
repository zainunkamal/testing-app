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
- **Status PostgreSQL:** `CONNECTED` (Latensi rata-rata: ~1-3 ms).
- **Status Redis:** `CONNECTED` (Latensi rata-rata: ~0.8-2 ms).
- **Keamanan Data:** Informasi host dan database ditampilkan secara aman, password terpotong (*redacted*).

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
  - Latensi berkisar antara 1 ms hingga 4 ms (sangat optimal karena berada dalam satu virtual bridge Docker).

---

### 4.2. Operasi CRUD & Manajemen Tabel (`/postgres/tables`)

* **Tujuan:** Menguji keakuratan pembacaan skema dinamis dari `information_schema` serta integritas manipulasi data (Create, Read, Update, Delete).

#### A. Pembacaan Skema (Read)
- Aplikasi berhasil mendeteksi tabel bawaan yang di-inisialisasi oleh script [`database/init.sql`](./database/init.sql):
  - `users` (3 baris data awal: Ahmad Fauzi, Siti Rahma, Budi Santoso)
  - `products` (3 baris data awal: Laptop ThinkPad, Mechanical Keyboard, Wireless Mouse)
  - `customers` (3 baris data awal: PT Maju Jaya, CV Berkah Abadi, Toko Sukses)

#### B. Tambah Data (Create)
- Pengujian menambahkan user baru:
  - `name`: `"Zainun Lab Tester"`
  - `email`: `"zainun@test.lab"`
  - `age`: `25`
- **Hasil:** Data langsung masuk ke tabel dengan auto-increment ID yang valid.

#### C. Ubah Data (Update)
- Pengujian mengubah kolom `age` dari `25` menjadi `26`.
- **Hasil:** Data ter-update secara presisi berdasarkan Primary Key (`id`).

#### D. Hapus Data (Delete)
- Pengujian menekan tombol hapus dengan konfirmasi pop-up modal.
- **Hasil:** Record dihapus dari database. Verifikasi dilakukan langsung via `docker exec -it databridge-postgres psql` dan record terbukti sudah tidak ada.

---

### 4.3. Telemetri & Diagnostik Database (`/postgres/info`)

* **Tujuan:** Menguji pengumpulan statistik internal server PostgreSQL tanpa mengorbankan performa database.
* **Metrik yang Berhasil Diuji:**
  - **Engine Version:** `PostgreSQL 16.15 on x86_64-pc-linux-musl, compiled by gcc (Alpine 15.2.0)`
  - **Active Connections:** 2 / 100 connection pool limit.
  - **Database Disk Size:** ~8.4 MB (diformat secara rapi via fungsi `pg_size_pretty`).
  - **Encoding & Timezone:** `UTF8`, timezone `UTC`.
  - **Fitur Auto-refresh:** Toggle refresh otomatis setiap 10 detik berfungsi normal.

---

## 5. Pengujian Redis Suite

### 5.1. Tes Responsivitas PING/PONG (`/redis/connection`)

* **Tujuan:** Menguji socket antrian Redis in-memory storage menggunakan ioredis client.
* **Prosedur:**
  1. Akses menu **Redis -> Connection Test**.
  2. Klik **"Ping Redis Server"**.
* **Hasil:**
  - Perintah `PING` dijawab dengan respon instan `PONG`.
  - Latensi tercatat stabil di bawah 1.5 ms.
  - Client mode terdeteksi sebagai `Standalone` (non-cluster).

---

### 5.2. Operasi Key-Value & TTL (`/redis/keys`)

* **Tujuan:** Memvalidasi operasi caching, format serialization JSON, serta masa kedaluwarsa (*Time-To-Live*).

#### A. Penyimpanan Data & Format JSON
- Pengujian membuat key baru:
  - **Key:** `session:user:101`
  - **Value:** `{"userId": 101, "role": "admin", "token": "xyz987"}`
  - **TTL Preset:** `1 Hour (3600s)`
- **Hasil:** Value otomatis diformat dan terdeteksi sebagai JSON terstruktur di modal viewer.

#### B. Pengujian Algoritma SCAN (Non-Blocking)
- Aplikasi menggunakan perintah `SCAN` dengan `COUNT 50` untuk mencegah server lockup yang biasa terjadi jika menggunakan `KEYS *` di skala produksi.
- Seluruh key berhasil diindeks beserta badge tipe data (`string`, `hash`, `list`) dan status TTL (`PERSISTENT` atau countdown waktu tersisa).

#### C. Penghapusan Key
- Key `session:user:101` berhasil dihapus melalui tombol dialog konfirmasi, dan hilang seketika dari tabel cache browser.

---

### 5.3. Telemetri Memori & Keyspace (`/redis/info`)

* **Tujuan:** Memantau alokasi RAM dan throughput Redis engine di dalam container.
* **Metrik yang Berhasil Diuji:**
  - **Engine Version:** `Redis 7.x (Alpine)`
  - **Memory Used:** ~1.15 MB / Peak ~1.30 MB.
  - **Connected Clients:** 1 active client connection.
  - **Total Keys:** Menghitung total key aktif di database index 0 secara akurat.
  - **Instantaneous Ops/sec:** 0-15 ops/sec saat pengujian aktif.

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
