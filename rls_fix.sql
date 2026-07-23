-- 1. Drop any existing policies first to prevent conflicts
DROP POLICY IF EXISTS "Allow all access" ON public.courts;
DROP POLICY IF EXISTS "Allow all access" ON public.bookings;
DROP POLICY IF EXISTS "Allow all access" ON public.inventory;
DROP POLICY IF EXISTS "Allow all access" ON public.court_tabs;
DROP POLICY IF EXISTS "Allow all access" ON public.tab_items;
DROP POLICY IF EXISTS "Allow all access" ON public.daily_tasks;

-- 2. Disable Row Level Security (RLS) on all tables
ALTER TABLE public.courts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.court_tabs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tab_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_tasks DISABLE ROW LEVEL SECURITY;

-- 3. Create broad allow-all policies for absolute compatibility (just in case RLS remains active)
CREATE POLICY "Allow all access" ON public.courts FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON public.bookings FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON public.inventory FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON public.court_tabs FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON public.tab_items FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON public.daily_tasks FOR ALL TO public USING (true) WITH CHECK (true);
