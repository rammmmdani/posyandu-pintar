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
| `status`       | string        | `aktif` atau `nonaktif`, default `aktif`        |
| `consent_status` | string / null | **Field turunan** (hanya di response, bukan kolom): status consent terbaru, `diberikan`, `ditarik`, atau `null` bila belum ada |
| `created_at`   | string        | ISO 8601                                        |
| `updated_at`   | string        | ISO 8601                                        |

### 3.1 Daftar balita

`GET /children`

Query (semua opsional): `page`, `per_page`, `search` (cari nama), `status` (`aktif` / `nonaktif`), `gender` (`L` / `P`).

Contoh: `GET /children?page=1&per_page=10&search=bud&status=aktif`

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
      "status": "aktif",
      "consent_status": null,
      "created_at": "2026-10-02T03:30:00.000Z",
      "updated_at": "2026-10-02T03:30:00.000Z"
    }
  ],
  "meta": { "page": 1, "per_page": 10, "total": 2, "total_pages": 1 }
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
  "address": "Jl. Melati No. 5, Bekasi"
}
```

Wajib: `name`, `gender`, `parent_name`.

Response 201: `message: "Balita berhasil ditambahkan"`, `data` berupa objek balita.
Response 400: `VALIDATION_ERROR` dengan detail per field di `errors`.

### 3.4 Ubah balita

`PATCH /children/:id`

Body: field yang ingin diubah saja (termasuk `status`).
Response 200: `data` berupa objek balita terbaru. Response 404 bila tidak ada.

### 3.5 Hapus balita

`DELETE /children/:id`

Soft delete (mengisi `deleted_at`). Data tetap ada di database.

Response 200:

```json
{ "success": true, "message": "Balita berhasil dihapus", "data": null }
```

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
| `method`         | string        | `lisan` atau `tertulis`, wajib                   |
| `notice_version` | string        | versi teks pemberitahuan yang dibacakan, wajib   |
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
      "method": "tertulis",
      "notice_version": "v1.0",
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
  "method": "tertulis",
  "notice_version": "v1.0"
}
```

Request (menarik persetujuan):

```json
{
  "guardian_name": "Ahmad Santoso",
  "consent_status": "ditarik",
  "method": "lisan",
  "notice_version": "v1.0"
}
```

Server mengisi `consented_at` / `withdrawn_at` dengan waktu saat ini, serta `recorded_by` dari token.

Response 201: `message: "Persetujuan berhasil dicatat"`, `data` berupa satu objek consent (bentuk seperti item di 4.1).
Response 404: balita tidak ditemukan. Response 400: `VALIDATION_ERROR`.

---

## Catatan untuk frontend

- Body response selalu dibungkus `{ success, message, data, meta? }`. Service di frontend mengembalikan `res.data` dari axios, yaitu **seluruh body ini**, jadi komponen membaca `response.data` untuk isinya dan `response.meta` untuk paginasi. File mock juga harus memakai pembungkus yang sama.
- Daftar balita dipakai komponen Table dan Pagination: gunakan `meta.total`, `meta.page`, `meta.per_page`.

## Pertanyaan terbuka (perlu diputuskan tim)

1. Apakah `consent_status` dimasukkan ke daftar balita (3.1) seperti usulan di atas, atau frontend memanggil 4.1 per baris?
2. Apakah `koordinator` dan `kader` punya hak yang sama untuk hapus balita?
3. Apakah `PATCH` atau `PUT` yang dipakai untuk ubah data?
