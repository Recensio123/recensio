-- Add city and postal_code to companies
-- Run this in Supabase SQL editor

ALTER TABLE companies ADD COLUMN IF NOT EXISTS city        TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS postal_code TEXT;
