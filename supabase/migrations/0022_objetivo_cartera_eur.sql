-- ============================================================
-- Objetivo de cartera en euros (objetivo "dinamico"): en vez de un % fijo, una cantidad de
-- dinero; la app calcula que % del patrimonio total representa en cada momento.
-- Una fila usa objetivo_pct o objetivo_eur, nunca los dos. Ver src/lib/finance/objetivosCartera.ts.
-- ============================================================

alter table objetivos_cartera
  add column if not exists objetivo_eur numeric(14,2) check (objetivo_eur >= 0);

alter table objetivos_cartera
  drop constraint if exists objetivos_cartera_un_solo_objetivo;
alter table objetivos_cartera
  add constraint objetivos_cartera_un_solo_objetivo check (objetivo_pct is null or objetivo_eur is null);
