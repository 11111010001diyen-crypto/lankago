-- Run this migration manually in the Supabase SQL Editor before using the updated booking flow.
-- Existing rows must be populated (or removed) before the two constraints are added.

alter table public.bookings
    add column if not exists passenger_names text[] not null default '{}',
    add column if not exists seat_numbers text[] not null default '{}';

alter table public.bookings
    add constraint bookings_passenger_names_count_check
    check (
        (mode in ('train', 'bus') and cardinality(passenger_names) = passengers)
        or
        (mode in ('car', 'three-wheel') and cardinality(passenger_names) = 1)
    );

alter table public.bookings
    add constraint bookings_seat_numbers_count_check
    check (
        (mode in ('train', 'bus') and cardinality(seat_numbers) = passengers)
        or
        (mode in ('car', 'three-wheel') and cardinality(seat_numbers) = 0)
    );