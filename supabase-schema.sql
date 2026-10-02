create table if not exists public.profiles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    full_name text not null check (char_length(trim(full_name)) between 2 and 120),
    phone text not null unique check (phone ~ '^[0-9]{10}$'),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.bookings (
    id bigint generated always as identity primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    booking_reference text not null unique check (booking_reference ~ '^LG-[A-Z0-9]{10}$'),
    from_location text not null check (char_length(trim(from_location)) between 1 and 180),
    to_location text not null check (char_length(trim(to_location)) between 1 and 180),
    travel_date date not null,
    mode text not null check (mode in ('train', 'bus', 'car', 'three-wheel')),
    bus_type text,
    train_class text,
    passengers integer not null check (passengers between 1 and 100),
    units integer not null check (units >= 1),
    unit_price numeric(12, 2) not null check (unit_price >= 0),
    total_price numeric(12, 2) not null check (total_price >= 0),
    lead_passenger_name text not null check (char_length(trim(lead_passenger_name)) between 2 and 120),
    passenger_names text[] not null default '{}',
    seat_numbers text[] not null default '{}',
    contact_number text not null check (contact_number ~ '^[0-9]{10}$'),
    assistance_notes text,
    payment_method text not null check (payment_method in ('card', 'cash')),
    payment_status text not null check (payment_status in ('paid_demo', 'pending_cash')),
    created_at timestamptz not null default now(),
    constraint bookings_transport_class_matches_mode check ((mode = 'bus' and bus_type is not null and train_class is null) or (mode = 'train' and train_class is not null and bus_type is null) or (mode in ('car', 'three-wheel') and bus_type is null and train_class is null)),
    constraint bookings_passenger_names_count_check check ((mode in ('train', 'bus') and cardinality(passenger_names) = passengers) or (mode in ('car', 'three-wheel') and cardinality(passenger_names) = 1)),
    constraint bookings_seat_numbers_count_check check ((mode in ('train', 'bus') and cardinality(seat_numbers) = passengers) or (mode in ('car', 'three-wheel') and cardinality(seat_numbers) = 0))
);

create index if not exists bookings_user_id_created_at_idx on public.bookings (user_id, created_at desc);
create index if not exists bookings_user_id_reference_idx on public.bookings (user_id, booking_reference);
alter table public.profiles enable row level security;
alter table public.bookings enable row level security;
drop policy if exists "Profiles are viewable by their owner" on public.profiles;
create policy "Profiles are viewable by their owner" on public.profiles for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Profiles are updatable by their owner" on public.profiles;
create policy "Profiles are updatable by their owner" on public.profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Bookings are viewable by their owner" on public.bookings;
create policy "Bookings are viewable by their owner" on public.bookings for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Bookings are insertable by their owner" on public.bookings;
create policy "Bookings are insertable by their owner" on public.bookings for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Bookings are updatable by their owner" on public.bookings;
create policy "Bookings are updatable by their owner" on public.bookings for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Bookings are deletable by their owner" on public.bookings;
create policy "Bookings are deletable by their owner" on public.bookings for delete to authenticated using (auth.uid() = user_id);