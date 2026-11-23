-- =====================================================================
-- Posyandu Pintar - Skema Database v1.0
-- DBMS: PostgreSQL 15+
-- Menjalankan ulang file ini akan MENGHAPUS semua data (untuk development).
-- =====================================================================

DROP TABLE IF EXISTS audit_logs          CASCADE;
DROP TABLE IF EXISTS reports             CASCADE;
DROP TABLE IF EXISTS menu_ingredients    CASCADE;
DROP TABLE IF EXISTS menus               CASCADE;
DROP TABLE IF EXISTS food_item_prices    CASCADE;
DROP TABLE IF EXISTS child_allergies     CASCADE;
DROP TABLE IF EXISTS food_items          CASCADE;
DROP TABLE IF EXISTS notifications       CASCADE;
DROP TABLE IF EXISTS follow_ups          CASCADE;
DROP TABLE IF EXISTS alerts              CASCADE;
DROP TABLE IF EXISTS growth_assessments  CASCADE;
DROP TABLE IF EXISTS who_growth_references CASCADE;
DROP TABLE IF EXISTS measurements        CASCADE;
DROP TABLE IF EXISTS guardian_consents   CASCADE;
DROP TABLE IF EXISTS children            CASCADE;
DROP TABLE IF EXISTS users               CASCADE;
DROP TABLE IF EXISTS posyandus           CASCADE;

-- ---------------------------------------------------------------------
-- 1. POSYANDU DAN PENGGUNA
-- ---------------------------------------------------------------------
CREATE TABLE posyandus (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        TEXT        NOT NULL,
    address     TEXT,
    region      TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    posyandu_id   BIGINT      NOT NULL REFERENCES posyandus(id),
    name          TEXT        NOT NULL,
    email         TEXT        NOT NULL,
    password_hash TEXT        NOT NULL,
    role          TEXT        NOT NULL CHECK (role IN ('kader', 'koordinator')),
    is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_unique ON users (lower(email));
CREATE INDEX users_posyandu_idx ON users (posyandu_id);

-- ---------------------------------------------------------------------
-- 2. BALITA DAN PERSETUJUAN WALI
-- ---------------------------------------------------------------------
CREATE TABLE children (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    posyandu_id  BIGINT      NOT NULL REFERENCES posyandus(id),
    name         TEXT        NOT NULL,
    birth_date   DATE,                                   -- nullable: tanggal lahir bisa belum diketahui
    gender       TEXT        NOT NULL CHECK (gender IN ('L', 'P')),
    parent_name  TEXT        NOT NULL,
    parent_phone TEXT,
    address      TEXT,
    status       TEXT        NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'nonaktif')),
    created_by   BIGINT      NOT NULL REFERENCES users(id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at   TIMESTAMPTZ,
    CONSTRAINT children_birth_date_not_future CHECK (birth_date IS NULL OR birth_date <= CURRENT_DATE)
);
CREATE INDEX children_posyandu_idx ON children (posyandu_id) WHERE deleted_at IS NULL;
CREATE INDEX children_name_idx     ON children (lower(name));

CREATE TABLE guardian_consents (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    child_id       BIGINT      NOT NULL REFERENCES children(id),
    guardian_name  TEXT        NOT NULL,
    consent_status TEXT        NOT NULL CHECK (consent_status IN ('diberikan', 'ditarik')),
    method         TEXT        NOT NULL CHECK (method IN ('lisan', 'tertulis')),
    notice_version TEXT        NOT NULL,
    consented_at   TIMESTAMPTZ,
    withdrawn_at   TIMESTAMPTZ,
    recorded_by    BIGINT      NOT NULL REFERENCES users(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX guardian_consents_child_idx ON guardian_consents (child_id, created_at DESC);

-- ---------------------------------------------------------------------
-- 3. PENGUKURAN
-- ---------------------------------------------------------------------
CREATE TABLE measurements (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    child_id         BIGINT      NOT NULL REFERENCES children(id),
    measured_by      BIGINT      NOT NULL REFERENCES users(id),
    measurement_date DATE        NOT NULL,
    weight_kg        NUMERIC(5,2),                       -- nullable: pengukuran bisa belum lengkap
    height_cm        NUMERIC(5,1),
    measurement_type TEXT        CHECK (measurement_type IN ('recumbent', 'standing')),
                                                         -- recumbent = panjang terlentang, standing = tinggi berdiri
    validity_status  TEXT        NOT NULL DEFAULT 'valid'
                     CHECK (validity_status IN ('valid', 'perlu_diperiksa', 'tidak_lengkap')),
    notes            TEXT,
    version          INTEGER     NOT NULL DEFAULT 1,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT measurements_date_not_future CHECK (measurement_date <= CURRENT_DATE),
    CONSTRAINT measurements_weight_positive CHECK (weight_kg IS NULL OR weight_kg > 0),
    CONSTRAINT measurements_height_positive CHECK (height_cm IS NULL OR height_cm > 0)
);
CREATE INDEX measurements_child_date_idx ON measurements (child_id, measurement_date DESC);

-- ---------------------------------------------------------------------
-- 4. REFERENSI WHO DAN PENILAIAN
-- ---------------------------------------------------------------------
-- Satu tabel generik untuk semua indikator.
--   BB/U, TB/U, PB/U, IMT/U -> kunci pencarian = age_days
--   BB/PB, BB/TB            -> kunci pencarian = measurement_value (cm)
CREATE TABLE who_growth_references (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    indicator         TEXT          NOT NULL
                      CHECK (indicator IN ('bb_u', 'pb_u', 'tb_u', 'bb_pb', 'bb_tb', 'imt_u')),
    gender            TEXT          NOT NULL CHECK (gender IN ('L', 'P')),
    age_days          INTEGER,
    measurement_value NUMERIC(5,1),
    l                 NUMERIC(10,5) NOT NULL,
    m                 NUMERIC(10,5) NOT NULL,
    s                 NUMERIC(10,5) NOT NULL,
    reference_version TEXT          NOT NULL,
    source            TEXT          NOT NULL,
    CONSTRAINT who_ref_key_present CHECK (age_days IS NOT NULL OR measurement_value IS NOT NULL)
);
CREATE UNIQUE INDEX who_ref_unique
    ON who_growth_references (indicator, gender, COALESCE(age_days, -1), COALESCE(measurement_value, -1), reference_version);

CREATE TABLE growth_assessments (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    measurement_id      BIGINT      NOT NULL REFERENCES measurements(id),
    age_days            INTEGER,
    zscore_bb_u         NUMERIC(6,2),
    category_bb_u       TEXT,
    zscore_tb_u         NUMERIC(6,2),                    -- dipakai untuk PB/U maupun TB/U
    category_tb_u       TEXT,
    zscore_bb_tb        NUMERIC(6,2),                    -- dipakai untuk BB/PB maupun BB/TB
    category_bb_tb      TEXT,
    zscore_imt_u        NUMERIC(6,2),
    category_imt_u      TEXT,
    overall_note        TEXT,                            -- mis. "indikator X tidak dapat dihitung: di luar cakupan"
    reference_version   TEXT        NOT NULL,
    calculation_version TEXT        NOT NULL,
    assessed_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX growth_assessments_measurement_idx ON growth_assessments (measurement_id, assessed_at DESC);

-- ---------------------------------------------------------------------
-- 5. PERINGATAN, TINDAK LANJUT, NOTIFIKASI
-- ---------------------------------------------------------------------
CREATE TABLE alerts (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    child_id       BIGINT      NOT NULL REFERENCES children(id),
    assessment_id  BIGINT      NOT NULL REFERENCES growth_assessments(id),
    type           TEXT        NOT NULL,                 -- indikator pemicu, mis. 'bb_u', 'tb_u'
    severity       TEXT        NOT NULL CHECK (severity IN ('perlu_perhatian', 'perlu_pemeriksaan', 'perlu_tindak_lanjut')),
    message        TEXT        NOT NULL,
    recommendation TEXT        NOT NULL,
    status         TEXT        NOT NULL DEFAULT 'baru'
                   CHECK (status IN ('baru', 'dilihat', 'ditindaklanjuti', 'ditutup')),
    status_note    TEXT,               
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX alerts_child_idx  ON alerts (child_id);
CREATE INDEX alerts_status_idx ON alerts (status, created_at DESC);
-- Mencegah alert ganda untuk penilaian dan indikator yang sama
CREATE UNIQUE INDEX alerts_assessment_type_unique ON alerts (assessment_id, type);

CREATE TABLE follow_ups (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    alert_id        BIGINT      NOT NULL REFERENCES alerts(id),
    recorded_by     BIGINT      NOT NULL REFERENCES users(id),
    action_date     DATE        NOT NULL,
    action_note     TEXT        NOT NULL,
    referral_status TEXT        NOT NULL DEFAULT 'tidak_dirujuk'
                    CHECK (referral_status IN ('tidak_dirujuk', 'direncanakan', 'sudah_dirujuk', 'selesai')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX follow_ups_alert_idx ON follow_ups (alert_id);

CREATE TABLE notifications (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id    BIGINT      NOT NULL REFERENCES users(id),
    alert_id   BIGINT      REFERENCES alerts(id),
    type       TEXT        NOT NULL,
    body       TEXT        NOT NULL,
    is_read    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON notifications (user_id, is_read, created_at DESC);
-- Hindari notifikasi ganda untuk peristiwa yang sama
CREATE UNIQUE INDEX notifications_user_alert_type_unique
    ON notifications (user_id, alert_id, type) WHERE alert_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- 6. PANGAN DAN MENU
-- ---------------------------------------------------------------------
CREATE TABLE food_items (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name          TEXT NOT NULL,
    unit          TEXT NOT NULL,                         -- satuan harga, mis. 'kg', 'butir', 'ikat'
    food_group    TEXT NOT NULL,                         -- mis. 'karbohidrat', 'protein_hewani', 'sayur'
    allergen_tags TEXT[] NOT NULL DEFAULT '{}',          -- mis. {'telur','susu','ikan','kacang'}
    is_active     BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE UNIQUE INDEX food_items_name_unique ON food_items (lower(name));

CREATE TABLE child_allergies (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    child_id     BIGINT      NOT NULL REFERENCES children(id),
    food_item_id BIGINT      REFERENCES food_items(id),
    allergen_tag TEXT,                                   -- alternatif: pantangan berupa kategori (mis. 'telur')
    note         TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT child_allergies_target CHECK (food_item_id IS NOT NULL OR allergen_tag IS NOT NULL)
);
CREATE INDEX child_allergies_child_idx ON child_allergies (child_id);

CREATE TABLE food_item_prices (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    food_item_id   BIGINT        NOT NULL REFERENCES food_items(id),
    price          NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    source         TEXT,
    effective_date DATE          NOT NULL,
    created_by     BIGINT        REFERENCES users(id),
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX food_item_prices_item_idx ON food_item_prices (food_item_id, effective_date DESC);

CREATE TABLE menus (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name         TEXT NOT NULL,
    age_group    TEXT NOT NULL CHECK (age_group IN ('6-8_bulan', '9-11_bulan', '12-23_bulan', '24-59_bulan')),
    serving_info TEXT,
    status       TEXT NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'nonaktif'))
);

CREATE TABLE menu_ingredients (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    menu_id      BIGINT        NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    food_item_id BIGINT        NOT NULL REFERENCES food_items(id),
    quantity     NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
    unit         TEXT          NOT NULL
);
CREATE INDEX menu_ingredients_menu_idx ON menu_ingredients (menu_id);

-- ---------------------------------------------------------------------
-- 7. LAPORAN DAN AUDIT
-- ---------------------------------------------------------------------
CREATE TABLE reports (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    posyandu_id       BIGINT      NOT NULL REFERENCES posyandus(id),
    created_by        BIGINT      NOT NULL REFERENCES users(id),
    report_type       TEXT        NOT NULL CHECK (report_type IN ('bulanan', 'rekap_6_bulan', 'kustom')),
    period_start      DATE        NOT NULL,
    period_end        DATE        NOT NULL,
    private_file_path TEXT,
    status            TEXT        NOT NULL DEFAULT 'diproses'
                      CHECK (status IN ('diproses', 'selesai', 'gagal')),
    error_message     TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT reports_period_valid CHECK (period_end >= period_start)
);
CREATE INDEX reports_posyandu_idx ON reports (posyandu_id, created_at DESC);

CREATE TABLE audit_logs (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     BIGINT      REFERENCES users(id),
    action      TEXT        NOT NULL,                    -- mis. 'create', 'update', 'login', 'download_report'
    entity_type TEXT        NOT NULL,
    entity_id   BIGINT,
    old_data    JSONB,
    new_data    JSONB,
    ip_address  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_entity_idx ON audit_logs (entity_type, entity_id);
CREATE INDEX audit_logs_user_idx   ON audit_logs (user_id, created_at DESC);