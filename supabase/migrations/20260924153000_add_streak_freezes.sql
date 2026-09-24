-- Streak freezes cover skipped calendar days when the learner returns.
alter table public.streak_state
  add column freezes integer not null default 0 check (freezes between 0 and 2),
  add column pending_freezes_used smallint not null default 0 check (pending_freezes_used between 0 and 2);
