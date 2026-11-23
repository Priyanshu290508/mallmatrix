-- ==============================================================================
-- MALLMATRIX — Public Landing Page Aggregate Statistics Function
-- ==============================================================================
-- Run this script in your Supabase SQL Editor.
-- This function runs with SECURITY DEFINER to compute safe, non-sensitive summary
-- metrics for public display on landing.html without exposing raw row data.
-- Your tables remain protected by Row Level Security (RLS) from direct anon access.
-- ==============================================================================

create or replace function public.get_public_stats()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    -- 1. Total connected tenant stores whose status is not Vacant
    'storesTotal', coalesce(
      (
        select count(*)::int
        from public.stores
        where lower(coalesce(status, '')) != 'vacant'
      ), 0
    ),
    -- 2. Total catalog SKU / product count
    'skuCount', coalesce(
      (
        select count(*)::int
        from public.products
      ), 0
    ),
    -- 3. Total products at critical stock (stock < 50% of safety buffer)
    -- Supports standard PostgreSQL snake_case min_buffer or camelCase "minBuffer"
    'criticalCount', coalesce(
      (
        select count(*)::int
        from public.products
        where coalesce(stock, 0) < (coalesce(min_buffer, 0) * 0.5)
      ), 0
    ),
    -- 4. Timestamp of calculation
    'updatedAt', now()
  );
$$;

-- Revoke all default execution permissions from public
revoke all on function public.get_public_stats() from public;

-- Grant execution to anon (public landing visitors) and authenticated users
grant execute on function public.get_public_stats() to anon, authenticated;

