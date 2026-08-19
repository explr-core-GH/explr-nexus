-- Read-only view powering the "Items Out" map/report: each checked-out item
-- with its holder and the holder's linked school (most recent assignment) for
-- map coordinates. security_invoker so it respects the caller's RLS.
create or replace view public.items_out_map
with (security_invoker = true) as
select
  i.id as item_id,
  i.name as item_name,
  i.qr_code,
  i.category,
  i.checked_out_at,
  coalesce(hp.full_name, 'Unknown') as holder,
  ps.name as school,
  ps.address as location_address,
  ps.latitude,
  ps.longitude
from public.inventory_items i
left join public.profiles hp on hp.user_id = i.checked_out_by
left join public.teachers t on t.profile_id = hp.id
left join lateral (
  select a.school_id
  from public.teacher_school_assignments a
  where a.teacher_id = t.id
  order by a.school_year desc nulls last, a.created_at desc
  limit 1
) a on true
left join public.partner_schools ps on ps.id = a.school_id
where i.status = 'checked-out';

grant select on public.items_out_map to authenticated;
