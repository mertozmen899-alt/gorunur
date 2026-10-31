-- Ölçüm motoru sitesi aramalarda çıkmayan işletme için marka aramasını bu alana yazıyor; alan yoktu ve kayıt 400 ile reddediliyordu
alter table public.olcumler add column if not exists marka_arama jsonb;
