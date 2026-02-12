-- Migration: add_raw_responses
-- Creates table raw_responses to persist provider raw payloads

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.raw_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL,
  request_country text,
  url text NOT NULL,
  payload jsonb NOT NULL,
  fetched_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS raw_responses_endpoint_idx ON public.raw_responses (endpoint);
CREATE INDEX IF NOT EXISTS raw_responses_fetched_at_idx ON public.raw_responses (fetched_at);
