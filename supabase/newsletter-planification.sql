-- Sweet Family : envoi automatique des newsletters programmées et des e-mails de bienvenue.
-- À exécuter UNE FOIS dans Supabase (SQL Editor), après avoir déployé la fonction « newsletter ».
-- Remplacez les 3 valeurs entre <...> :
--   <REF>   = l'identifiant de votre projet Supabase (la partie avant .supabase.co de l'adresse du projet)
--   <SECRET> = exactement le même mot de passe que le secret CRON_SECRET de la fonction
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('sweet-family-newsletter') where exists (select 1 from cron.job where jobname = 'sweet-family-newsletter');
select cron.schedule('sweet-family-newsletter', '*/5 * * * *', $$
  select net.http_post(
    url := 'https://<REF>.supabase.co/functions/v1/newsletter',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', '<SECRET>'),
    body := '{"action":"planning"}'::jsonb
  );
$$);
