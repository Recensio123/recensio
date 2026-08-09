-- Add country field to companies table
-- Run this in Supabase SQL editor

ALTER TABLE companies ADD COLUMN IF NOT EXISTS country TEXT;
