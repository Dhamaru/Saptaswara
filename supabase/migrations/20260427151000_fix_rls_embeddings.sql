-- Migration: Enable Row Level Security on raga_embeddings
-- Description: Fixes a critical security vulnerability where embeddings were publicly accessible without RLS.

-- 1. Enable RLS on raga_embeddings
ALTER TABLE IF EXISTS raga_embeddings ENABLE ROW LEVEL SECURITY;

-- 2. Add public read access policy
-- Since embeddings are used for public raga search/suggestions, we allow everyone to read them.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'raga_embeddings' AND policyname = 'Public Read Access for Embeddings'
    ) THEN
        CREATE POLICY "Public Read Access for Embeddings" ON raga_embeddings FOR SELECT USING (true);
    END IF;
END
$$;
