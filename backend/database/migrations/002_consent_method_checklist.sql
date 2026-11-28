ALTER TABLE guardian_consents DROP CONSTRAINT IF EXISTS guardian_consents_method_check;
ALTER TABLE guardian_consents ADD CONSTRAINT guardian_consents_method_check CHECK (method IN ('lisan', 'tertulis', 'checklist'));
ALTER TABLE guardian_consents ALTER COLUMN method SET DEFAULT 'checklist';
