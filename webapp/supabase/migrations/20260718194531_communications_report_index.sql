create index if not exists admin_activity_events_report_id_idx
  on private.admin_activity_events (report_id)
  where report_id is not null;
