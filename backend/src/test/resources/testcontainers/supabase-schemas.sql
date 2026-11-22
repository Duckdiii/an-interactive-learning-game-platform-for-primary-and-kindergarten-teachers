-- Supabase có sẵn schema "extensions"; V1 cài uuid-ossp và vector vào đó, nên Postgres thường phải tạo trước.
CREATE SCHEMA IF NOT EXISTS extensions;
