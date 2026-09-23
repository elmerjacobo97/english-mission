-- Store the learner's selected CEFR route without changing existing progress rows.
alter table public.progress_core
  add column course_band text
  check (course_band in ('basic', 'intermediate', 'advanced'));
