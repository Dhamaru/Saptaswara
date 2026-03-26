CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS raga_embeddings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  raga_name text NOT NULL,
  content text NOT NULL,
  embedding vector(768),
  created_at timestamptz DEFAULT now()
);
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'raga_embeddings_embedding_idx') THEN
        CREATE INDEX raga_embeddings_embedding_idx ON raga_embeddings USING ivfflat (embedding vector_cosine_ops);
    END IF;
END $$;
