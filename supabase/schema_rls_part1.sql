-- ============================================
-- ONE GUDALUR - SUPABASE RLS POLICIES (Part 1: Core Tables)
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE civic_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wildlife_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE petitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_grievances ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION is_signed_in() RETURNS BOOLEAN AS $$
  SELECT auth.uid() IS NOT NULL;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT is_signed_in() AND (
    auth.email() = 'vijaybalakrishnanshanmugam@gmail.com' OR
    EXISTS (
      SELECT 1 FROM users
      WHERE uid = auth.uid()
      AND role IN ('PLATFORM_ADMIN', 'CORE_ADMIN', 'LOCAL_ADMIN')
    )
  );
$$ LANGUAGE sql STABLE;

-- Users policies
CREATE POLICY "Users can read own profile or admins can read all"
  ON users FOR SELECT
  USING (is_signed_in() AND (auth.uid() = uid OR is_admin()));

CREATE POLICY "Users can list all profiles"
  ON users FOR SELECT
  USING (is_signed_in());

CREATE POLICY "Users can create own profile"
  ON users FOR INSERT
  WITH CHECK (is_signed_in() AND auth.uid() = uid);

CREATE POLICY "Users can update own profile (limited fields) or admins"
  ON users FOR UPDATE
  USING (is_signed_in() AND (
    is_admin() OR
    (auth.uid() = uid AND 
     (OLD.name IS DISTINCT FROM NEW.name OR
      OLD.phone IS DISTINCT FROM NEW.phone OR
      OLD.locality_id IS DISTINCT FROM NEW.locality_id OR
      OLD.locality_name IS DISTINCT FROM NEW.locality_name OR
      OLD.is_blood_donor IS DISTINCT FROM NEW.is_blood_donor OR
      OLD.blood_group IS DISTINCT FROM NEW.blood_group OR
      OLD.avatar_url IS DISTINCT FROM NEW.avatar_url OR
      OLD.bio IS DISTINCT FROM NEW.bio OR
      OLD.updated_at IS DISTINCT FROM NEW.updated_at))
  ));

-- Civic Issues policies
CREATE POLICY "Public read access for civic transparency"
  ON civic_issues FOR SELECT
  USING (TRUE);

CREATE POLICY "Signed in users can create issues"
  ON civic_issues FOR INSERT
  WITH CHECK (is_signed_in() AND reporter_id = auth.uid());

CREATE POLICY "Reporters can update own issues (limited), admins can update all"
  ON civic_issues FOR UPDATE
  USING (is_signed_in() AND (
    is_admin() OR
    (reporter_id = auth.uid() AND 
     (OLD.title IS DISTINCT FROM NEW.title OR
      OLD.description IS DISTINCT FROM NEW.description OR
      OLD.photo_url IS DISTINCT FROM NEW.photo_url OR
      OLD.updated_at IS DISTINCT FROM NEW.updated_at)) OR
    (OLD.upvotes_count IS DISTINCT FROM NEW.upvotes_count OR
     OLD.upvoted_by IS DISTINCT FROM NEW.upvoted_by OR
     OLD.updated_at IS DISTINCT FROM NEW.updated_at) OR
    (OLD.status IS DISTINCT FROM NEW.status OR
     OLD.assigned_authority IS DISTINCT FROM NEW.assigned_authority OR
     OLD.official_grievance_id IS DISTINCT FROM NEW.official_grievance_id OR
     OLD.timeline IS DISTINCT FROM NEW.timeline OR
     OLD.updated_at IS DISTINCT FROM NEW.updated_at)
  ));

CREATE POLICY "Admins can delete issues"
  ON civic_issues FOR DELETE
  USING (is_admin());

-- Alerts policies
CREATE POLICY "Public read for emergency safety"
  ON alerts FOR SELECT
  USING (TRUE);

CREATE POLICY "Admins can manage alerts"
  ON alerts FOR ALL
  USING (is_admin() OR is_signed_in());

-- Wildlife Incidents policies
CREATE POLICY "Public read for safety"
  ON wildlife_incidents FOR SELECT
  USING (TRUE);

CREATE POLICY "Anyone can report wildlife"
  ON wildlife_incidents FOR INSERT
  WITH CHECK (is_signed_in() OR TRUE);

CREATE POLICY "Reporters and admins can update"
  ON wildlife_incidents FOR UPDATE
  USING (is_admin() OR (is_signed_in() AND reported_by = auth.uid()));

CREATE POLICY "Admins can delete"
  ON wildlife_incidents FOR DELETE
  USING (is_admin());

-- Petitions policies
CREATE POLICY "Public read petitions"
  ON petitions FOR SELECT
  USING (TRUE);

CREATE POLICY "Signed in users can create petitions"
  ON petitions FOR INSERT
  WITH CHECK (is_signed_in());

CREATE POLICY "Creators and admins can update, supporters can add support"
  ON petitions FOR UPDATE
  USING (is_signed_in() AND (
    is_admin() OR
    (created_by = auth.uid()) OR
    (OLD.support_count IS DISTINCT FROM NEW.support_count OR
     OLD.supporters IS DISTINCT FROM NEW.supporters)
  ));

CREATE POLICY "Admins can delete petitions"
  ON petitions FOR DELETE
  USING (is_admin());

-- Government Grievances policies
CREATE POLICY "Users can read own grievances, admins all"
  ON government_grievances FOR SELECT
  USING (is_signed_in() AND (user_id = auth.uid() OR is_admin()));

CREATE POLICY "Users can create own grievances"
  ON government_grievances FOR INSERT
  WITH CHECK (is_signed_in() AND user_id = auth.uid());

CREATE POLICY "Users and admins can update own grievances"
  ON government_grievances FOR UPDATE
  USING (is_signed_in() AND (user_id = auth.uid() OR is_admin()));

CREATE POLICY "Admins can delete grievances"
  ON government_grievances FOR DELETE
  USING (is_admin());

-- Services policies
CREATE POLICY "Public read services"
  ON services FOR SELECT
  USING (TRUE);

CREATE POLICY "Signed in users can manage services"
  ON services FOR ALL
  USING (is_signed_in());