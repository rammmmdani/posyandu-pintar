# API Contract - Posyandu Pintar

> **Status: DRAFT v0.1.** Disusun dari `backend/database/schema.sql` dan kode `backend/src`.
> Saat ini backend baru punya endpoint `GET /health`. Endpoint lain di dokumen ini
> adalah **usulan** yang harus disepakati frontend dan backend sebelum diimplementasi.
> Kalau ada perubahan, update dokumen ini di PR yang sama.

Base URL (development): `http://localhost:5000/api/v1`

---

## 1. Konvensi Umum

### 1.1 Format response sukses

Sesuai `backend/src/utils/response.js`.

```json
{
  "success": true,
  "message": "Berhasil",
  "data": {},
  "meta": {}
}
```

- `data`: objek (detail) atau array (daftar). `null` kalau tidak ada isi.
- `meta`: hanya ada pada response berpaginasi.

### 1.2 Format response error

Sesuai `backend/src/middlewares/errorHandler.js`.

```json
{
  "success": false,
  "message": "Data tidak valid",
  "code": "VALIDATION_ERROR",
  "errors": [
    { "field": "name", "message": "Nama wajib diisi" }
  ]
}
```

| HTTP | `code`             | Keterangan                                   |
| ---- | ------------------ | -------------------------------------------- |
| 400  | `VALIDATION_ERROR` | Input tidak valid atau JSON rusak            |
| 401  | `UNAUTHORIZED`     | Token tidak ada atau tidak valid *(usulan)*  |
| 403  | `FORBIDDEN`        | Role tidak berhak *(usulan)*                 |
| 404  | `NOT_FOUND`        | Data atau endpoint tidak ditemukan           |
| 500  | `INTERNAL_ERROR`   | Kesalahan server                             |

### 1.3 Aturan umum

- Autentikasi: header `Authorization: Bearer <JWT>` *(usulan)*.
- Tanggal: `YYYY-MM-DD`. Waktu: ISO 8601 UTC, contoh `2026-11-20T02:15:00.000Z`.
- Field memakai `snake_case`.
- `id` bertipe angka.
- `posyandu_id` diambil dari token pengguna, **tidak dikirim di body**.
- Paginasi: query `page` (default 1) dan `per_page` (default 10, maksimal 100).

```json
"meta": { "page": 1, "per_page": 10, "total": 25, "total_pages": 3 }
```

### 1.4 Health check

`GET /health`

```json
{
  "success": true,
  "message": "Server berjalan",
  "data": { "status": "ok", "database": "connected" }
}
```

---

## 2. Autentikasi *(usulan, ringkas)*

`POST /auth/login`

Request:

```json
{ "email": "kader@posyandu.test", "password": "rahasia123" }
```

Response 200:

```json
{
  "success": true,
  "message": "Login berhasil",
  "data": {
    "token": "eyJhbGciOi...",
    "user": {
      "id": 1,
      "posyandu_id": 1,
      "name": "Siti Aminah",
      "email": "kader@posyandu.test",
      "role": "kader"
    }
  }
}
```

`role` bernilai `kader` atau `koordinator`.

---

## 3. Balita (`children`) *(usulan)*

Field mengikuti tabel `children`. Field `deleted_at`, `created_by`, dan `posyandu_id` tidak ditampilkan.

| Field          | Tipe          | Keterangan                                      |
| -------------- | ------------- | ----------------------------------------------- |
| `id`           | number        |                                                 |
| `name`         | string        | wajib                                           |
| `birth_date`   | string / null | `YYYY-MM-DD`, tidak boleh di masa depan         |
| `gender`       | string        | `L` atau `P`, wajib                             |
| `parent_name`  | string        | wajib                                           |
| `parent_phone` | string / null |                                                 |
| `address`      | string / null |                                                 |
| `rt`           | string / null | 3 digit angka, misalnya `001`; boleh null       |
| `rw`           | string / null | 3 digit angka, misalnya `002`; boleh null       |
| `status`       | string        | `aktif` atau `nonaktif`, default `aktif`        |
| `consent_status` | string / null | **Field turunan** (hanya di response, bukan kolom): status consent terbaru, `diberikan`, `ditarik`, atau `null` bila belum ada |
| `created_at`   | string        | ISO 8601                                        |
| `updated_at`   | string        | ISO 8601                                        |

### 3.1 Daftar balita

`GET /children`

Query (semua opsional): `page`, `limit`, `q` (cari nama anak atau wali), `status` (`aktif` / `nonaktif` / `semua` / `terhapus`), `single` (`true` untuk hanya mengembalikan 1 hasil paling relevan saat `q` diisi), `rt` (3 digit), `rw` (3 digit). Filter `rt` dan `rw` dapat dipakai sendiri-sendiri atau bersamaan. `status=terhapus` hanya untuk `koordinator` dan menampilkan balita yang dihapus lunak.

Contoh: `GET /children?page=1&limit=10&q=bud&status=semua&single=true`, `GET /children?rt=001&rw=002`

Response 200:

```json
{
  "success": true,
  "message": "Berhasil",
  "data": [
    {
      "id": 1,
      "name": "Budi Santoso",
      "birth_date": "2024-03-12",
      "gender": "L",
      "parent_name": "Ahmad Santoso",
      "parent_phone": "081234567890",
      "address": "Jl. Melati No. 5, Bekasi",
      "rt": "001",
      "rw": "002",
      "status": "aktif",
      "consent_status": "diberikan",
      "created_at": "2026-10-01T03:00:00.000Z",
      "updated_at": "2026-10-01T03:00:00.000Z"
    },
    {
      "id": 2,
      "name": "Sari Lestari",
      "birth_date": "2023-11-05",
      "gender": "P",
      "parent_name": "Dewi Lestari",
      "parent_phone": null,
      "address": "Jl. Kenanga No. 12, Bekasi",
      "rt": "010",
      "rw": "003",
      "status": "aktif",
      "consent_status": null,
      "created_at": "2026-10-02T03:30:00.000Z",
      "updated_at": "2026-10-02T03:30:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 10, "total": 2, "total_pages": 1 }
}
```

### 3.2 Detail balita

`GET /children/:id`

Response 200: `data` berupa satu objek balita (bentuk sama seperti satu item di 3.1).
Response 404: `code: "NOT_FOUND"`.

### 3.3 Tambah balita

`POST /children`

Request:

```json
{
  "name": "Budi Santoso",
  "birth_date": "2024-03-12",
  "gender": "L",
  "parent_name": "Ahmad Santoso",
  "parent_phone": "081234567890",
  "address": "Jl. Melati No. 5, Bekasi",
  "rt": "001",
  "rw": "002",
  "consent": {
    "guardian_name": "Ahmad Santoso",
    "notice_version": "v2"
  }
}
```

Wajib: `name`, `gender`, `parent_name`, `consent.guardian_name`, `consent.notice_version`. `rt` dan `rw` opsional; bila diisi harus 3 digit angka. `consent.method` opsional dan default `checklist`; nilai lama `lisan` / `tertulis` masih diterima.

Response 201: `message: "Balita berhasil ditambahkan"`, `data` berupa objek balita.
Response 400: `VALIDATION_ERROR` dengan detail per field di `errors`.

### 3.4 Ubah balita

`PATCH /children/:id`

Body: field yang ingin diubah saja (termasuk `status`).
Response 200: `data` berupa objek balita terbaru. Response 404 bila tidak ada.

### 3.5 Hapus balita

`DELETE /children/:id` — hanya `koordinator` (`403` untuk `kader`).

Soft delete (mengisi `deleted_at`). Data tetap ada di database dan riwayat terkait tetap tersimpan, tetapi tidak muncul di daftar, detail, dan laporan normal. Response 404 bila tidak ada atau sudah dihapus.

Response 200:

```json
{ "success": true, "message": "Balita berhasil dihapus", "data": null }
```

### 3.6 Pulihkan balita

`PATCH /children/:id/restore` — hanya `koordinator` (`403` untuk `kader`).

Mengosongkan `deleted_at` sehingga balita muncul kembali dengan status sebelumnya. Response 404 bila tidak ada atau belum dihapus.

Response 200: `data` berupa objek balita yang dipulihkan.

---

## 4. Persetujuan Wali (`guardian_consents`) *(usulan)*

Riwayat persetujuan disimpan sebagai baris baru setiap ada perubahan (tidak menimpa baris lama).
Status terkini = baris dengan `created_at` paling baru.

| Field            | Tipe          | Keterangan                                       |
| ---------------- | ------------- | ------------------------------------------------ |
| `id`             | number        |                                                  |
| `child_id`       | number        |                                                  |
| `guardian_name`  | string        | wajib                                            |
| `consent_status` | string        | `diberikan` atau `ditarik`, wajib                |
| `method`         | string        | `checklist` (default), atau `lisan` / `tertulis` untuk data lama |
| `notice_version` | string        | versi teks pemberitahuan yang disetujui, wajib   |
| `consented_at`   | string / null | wajib diisi bila status `diberikan`              |
| `withdrawn_at`   | string / null | wajib diisi bila status `ditarik`                |
| `recorded_by`    | number        | id pengguna pencatat (dari token)                |
| `created_at`     | string        | ISO 8601                                         |

### 4.1 Riwayat consent satu balita

`GET /children/:id/consents`

Response 200 (urut terbaru lebih dulu):

```json
{
  "success": true,
  "message": "Berhasil",
  "data": [
    {
      "id": 1,
      "child_id": 1,
      "guardian_name": "Ahmad Santoso",
      "consent_status": "diberikan",
      "method": "checklist",
      "notice_version": "v2",
      "consented_at": "2026-10-01T03:05:00.000Z",
      "withdrawn_at": null,
      "recorded_by": 1,
      "created_at": "2026-10-01T03:05:00.000Z"
    }
  ]
}
```

### 4.2 Catat consent baru

`POST /children/:id/consents`

Request (memberikan persetujuan):

```json
{
  "guardian_name": "Ahmad Santoso",
  "consent_status": "diberikan",
  "notice_version": "v2"
}
```

Request (menarik persetujuan):

```json
{
  "guardian_name": "Ahmad Santoso",
  "consent_status": "ditarik",
  "notice_version": "v2"
}
```

Server mengisi `method` dengan `checklist` bila tidak dikirim, `consented_at` / `withdrawn_at` dengan waktu saat ini, serta `recorded_by` dari token.

Response 201: `message: "Persetujuan berhasil dicatat"`, `data` berupa satu objek consent (bentuk seperti item di 4.1).
Response 404: balita tidak ditemukan. Response 400: `VALIDATION_ERROR`.

---

## 5. Laporan (`reports`)

Semua endpoint laporan hanya dapat diakses oleh `koordinator`. Data selalu dibatasi pada `posyandu_id` pengguna yang login.

### 5.1 Daftar laporan

`GET /api/v1/reports?page=1&limit=20`

Query:

| Parameter | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `page` | integer | tidak | Default `1`. |
| `limit` | integer | tidak | Default `20`, maksimal `100`. |

Response 200:

```json
{
  "success": true,
  "message": "Data laporan berhasil diambil",
  "data": [
    {
      "id": 1,
      "report_type": "bulanan",
      "period_start": "2026-11-01",
      "period_end": "2026-11-30",
      "status": "selesai",
      "error_message": null,
      "created_at": "2026-11-28T09:12:00.000Z",
      "created_by": { "id": 2, "name": "Koordinator Posyandu" }
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1, "total_pages": 1 }
}
```

### 5.2 Buat laporan

`POST /api/v1/reports`

Body untuk laporan bulanan:

```json
{ "report_type": "bulanan", "month": "2026-11" }
```

Body untuk rekap 6 bulan (enam bulan termasuk `month` yang dipilih):

```json
{ "report_type": "rekap_6_bulan", "month": "2026-11" }
```

Body untuk periode khusus:

```json
{
  "report_type": "kustom",
  "period_start": "2026-10-01",
  "period_end": "2026-10-31"
}
```

Validasi:

- `report_type` harus salah satu dari `bulanan`, `rekap_6_bulan`, `kustom`.
- `month` wajib berformat `YYYY-MM` dan valid untuk `bulanan`/`rekap_6_bulan`.
- `period_start` dan `period_end` wajib berformat `YYYY-MM-DD` dan valid untuk `kustom`.
- `period_end` tidak boleh sebelum `period_start`.

Response 201 mengembalikan satu objek laporan seperti item di 5.1. Laporan dibuat synchronous; `status` langsung `selesai` bila PDF berhasil, atau `gagal` dengan `error_message` bila tidak.

### 5.3 Unduh PDF

`GET /api/v1/reports/:id/download`

Response 200: `application/pdf` dengan header `Content-Disposition: attachment`. Nama file: `laporan-posyandu-<period_start>-sd-<period_end>.pdf`.

Response 404: ID bukan angka atau laporan bukan milik posyandu pengguna. Response 409: laporan belum `selesai`. Response 403: bukan koordinator.

Isi PDF: ringkasan balita aktif, jumlah pengukuran dan peringatan dalam periode, sebaran RT/RW, serta daftar peringatan terbaru. Halaman berikutnya memuat tabel detail balita yang memiliki pengukuran dalam periode (nama, jenis kelamin, tanggal lahir, usia, RT/RW, nama wali, status persetujuan) dan tabel semua pengukuran dalam periode tersebut (nama balita, tanggal, BB, TB/PB, tipe ukur, validitas). Data wali yang ditampilkan hanya nama; telepon dan alamat tidak dimasukkan. Berkas dibuat dari data saat unduh, bukan disimpan di server.

---

## Catatan untuk frontend

- Body response selalu dibungkus `{ success, message, data, meta? }`. Service di frontend mengembalikan `res.data` dari axios, yaitu **seluruh body ini**, jadi komponen membaca `response.data` untuk isinya dan `response.meta` untuk paginasi. File mock juga harus memakai pembungkus yang sama.
- Daftar balita dipakai komponen Table dan Pagination: gunakan `meta.total`, `meta.page`, `meta.total_pages`.

## Pertanyaan terbuka (perlu diputuskan tim)

1. Apakah `consent_status` dimasukkan ke daftar balita (3.1) seperti usulan di atas, atau frontend memanggil 4.1 per baris?
2. ~~Apakah `koordinator` dan `kader` punya hak yang sama untuk hapus balita?~~ **Diputuskan: hapus dan pulihkan hanya untuk `koordinator`; `kader` mendapat 403.**
3. Apakah `PATCH` atau `PUT` yang dipakai untuk ubah data?

Objek Alert (bagian 6): tambahkan field "status_note": null setelah "status". Nilainya terisi catatan saat peringatan ditutup.
6.3 PATCH /alerts/:id/status: ganti isi aturan menjadi:
1. Body: status bernilai dilihat atau ditutup. Status ditindaklanjuti tidak bisa dipilih manual, terbentuk otomatis saat tindak lanjut dicatat.
2. note wajib saat ditutup.
3. Transisi: baru ke dilihat; baru, dilihat, atau ditindaklanjuti ke ditutup; ditutup ke dilihat (buka kembali). Transisi lain: 400.
6.2 GET /alerts/:id: tambahkan bahwa assessment adalah penilaian yang memicu peringatan (assessment_id), bukan penilaian terbaru.