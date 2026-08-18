-- Public, aggregated equipment-map data for the anonymous landing page.
-- SECURITY DEFINER so it can read behind RLS, but it returns only
-- non-identifying aggregates: library sites with status counts + overall totals.
-- No names, no user ids, no off-site/partner-school coordinates.
create or replace function public.public_equipment_map()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'locations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', t.name,
        'lat', t.latitude,
        'lng', t.longitude,
        'total', t.total,
        'available', t.available,
        'checked_out', t.checked_out,
        'maintenance', t.maintenance
      ))
      from (
        select l.id, l.name, l.latitude, l.longitude,
          count(i.id) as total,
          count(i.id) filter (where i.status = 'available') as available,
          count(i.id) filter (where i.status = 'checked-out') as checked_out,
          count(i.id) filter (where i.status = 'maintenance') as maintenance
        from public.locations l
        left join public.inventory_items i on i.location_id = l.id
        where l.latitude is not null and l.longitude is not null
        group by l.id
      ) t
    ), '[]'::jsonb),
    'summary', jsonb_build_object(
      'total', (select count(*) from public.inventory_items),
      'available', (select count(*) from public.inventory_items where status = 'available'),
      'out', (select count(*) from public.inventory_items where status = 'checked-out')
    )
  );
$$;

grant execute on function public.public_equipment_map() to anon, authenticated;
