-- Interactive Course Platform — PoC schema
-- Designed with auth.users from the start so sharing/multi-user is additive later

-- Courses created by a user
create table courses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  mission text not null,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

-- Ordered chapters within a course
create table chapters (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  position int not null,
  title text not null,
  topic text not null,
  unique (course_id, position)
);

-- Cached/generated HTML lessons, per user per chapter
-- (same chapter can have different generated content per learner)
create table generated_lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chapter_id uuid not null references chapters(id) on delete cascade,
  html_content text not null,
  created_at timestamptz not null default now(),
  unique (user_id, chapter_id)
);

-- Progress + learning notes, drives future personalization
create table user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chapter_id uuid not null references chapters(id) on delete cascade,
  completed boolean not null default false,
  learning_note text,
  updated_at timestamptz not null default now(),
  unique (user_id, chapter_id)
);

-- Source material attached to a course (text paste, YouTube transcript, PDF)
create table course_sources (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  source_type text not null check (source_type in ('text', 'youtube', 'pdf')),
  label text not null,
  summary text not null,
  created_at timestamptz not null default now()
);

-- Row Level Security
alter table courses enable row level security;
alter table chapters enable row level security;
alter table generated_lessons enable row level security;
alter table user_progress enable row level security;
alter table course_sources enable row level security;

-- Courses: owner has full access; public courses are readable by anyone
create policy "Owners manage their courses"
  on courses for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Anyone can read public courses"
  on courses for select
  using (is_public = true);

-- Chapters: readable if the parent course is owned or public
create policy "Read chapters of accessible courses"
  on chapters for select
  using (
    exists (
      select 1 from courses c
      where c.id = chapters.course_id
        and (c.owner_id = auth.uid() or c.is_public = true)
    )
  );

create policy "Owners manage chapters"
  on chapters for all
  using (
    exists (
      select 1 from courses c
      where c.id = chapters.course_id and c.owner_id = auth.uid()
    )
  );

-- Generated lessons + progress: strictly per-user
create policy "Users manage their own generated lessons"
  on generated_lessons for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users manage their own progress"
  on user_progress for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Course sources: readable/writable by course owner
create policy "Owners manage course sources"
  on course_sources for all
  using (
    exists (
      select 1 from courses c
      where c.id = course_sources.course_id and c.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from courses c
      where c.id = course_sources.course_id and c.owner_id = auth.uid()
    )
  );
