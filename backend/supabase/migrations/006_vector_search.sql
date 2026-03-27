-- Function to perform vector similarity search on raga embeddings
CREATE OR REPLACE FUNCTION match_ragas (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  raga_name text,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    raga_embeddings.id,
    raga_embeddings.raga_name,
    raga_embeddings.content,
    1 - (raga_embeddings.embedding <=> query_embedding) AS similarity
  FROM raga_embeddings
  WHERE 1 - (raga_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
