select cron.schedule(
  'poll-traffic-alerts',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url:='https://kmapvntjwhhtfgvjzsof.supabase.co/functions/v1/poll-traffic-alerts',
    headers:='{"Content-Type": "application/json"}'::jsonb,
    body:=concat('{"scheduled_at": "', now(), '"}')::jsonb
  );
  $$
);