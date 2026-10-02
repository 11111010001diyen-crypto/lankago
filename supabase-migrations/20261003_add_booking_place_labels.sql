-- Apply this migration manually to an existing Supabase database.
alter table public.bookings
    add column if not exists from_name text,
    add column if not exists from_area text,
    add column if not exists to_name text,
    add column if not exists to_area text;