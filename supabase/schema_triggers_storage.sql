-- ============================================
-- ONE GUDALUR - SUPABASE TRIGGERS & STORAGE
-- ============================================

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_civic_issues_updated_at
  BEFORE UPDATE ON civic_issues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at
  BEFORE UPDATE ON alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_petitions_updated_at
  BEFORE UPDATE ON petitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_government_grievances_updated_at
  BEFORE UPDATE ON government_grievances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STORAGE BUCKETS (create via Supabase Dashboard -> Storage)
-- ============================================

-- Run these in Supabase SQL Editor after creating buckets:

-- 1. issue-photos (public) - for civic issue photos
-- INSERT INTO storage.buckets (id, name, public) VALUES ('issue-photos', 'issue-photos', true);

-- 2. wildlife-photos (public) - for wildlife incident photos
-- INSERT INTO storage.buckets (id, name, public) VALUES ('wildlife-photos', 'wildlife-photos', true);

-- 3. user-avatars (public) - for user profile pictures
-- INSERT INTO storage.buckets (id, name, public) VALUES ('user-avatars', 'user-avatars', true);

-- 4. petition-documents (private) - for petition PDFs
-- INSERT INTO storage.buckets (id, name, public) VALUES ('petition-documents', 'petition-documents', false);

-- 5. community-images (public) - for community post images
-- INSERT INTO storage.buckets (id, name, public) VALUES ('community-images', 'community-images', true);

-- ============================================
-- STORAGE POLICIES (run after buckets created)
-- ============================================

-- Issue Photos Policies
-- CREATE POLICY "Public read issue photos" ON storage.objects FOR SELECT USING (bucket_id = 'issue-photos');
-- CREATE POLICY "Authenticated upload issue photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'issue-photos' AND auth.role() = 'authenticated');
-- CREATE POLICY "Owner update issue photos" ON storage.objects FOR UPDATE USING (bucket_id = 'issue-photos' AND owner = auth.uid());
-- CREATE POLICY "Owner delete issue photos" ON storage.objects FOR DELETE USING (bucket_id = 'issue-photos' AND owner = auth.uid());

-- Wildlife Photos Policies
-- CREATE POLICY "Public read wildlife photos" ON storage.objects FOR SELECT USING (bucket_id = 'wildlife-photos');
-- CREATE POLICY "Authenticated upload wildlife photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'wildlife-photos' AND auth.role() = 'authenticated');
-- CREATE POLICY "Owner update wildlife photos" ON storage.objects FOR UPDATE USING (bucket_id = 'wildlife-photos' AND owner = auth.uid());
-- CREATE POLICY "Owner delete wildlife photos" ON storage.objects FOR DELETE USING (bucket_id = 'wildlife-photos' AND owner = auth.uid());

-- User Avatars Policies
-- CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'user-avatars');
-- CREATE POLICY "Authenticated upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'user-avatars' AND auth.role() = 'authenticated');
-- CREATE POLICY "Owner update avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'user-avatars' AND owner = auth.uid());
-- CREATE POLICY "Owner delete avatars" ON storage.objects FOR DELETE USING (bucket_id = 'user-avatars' AND owner = auth.uid());

-- Petition Documents Policies
-- CREATE POLICY "Owner read petition docs" ON storage.objects FOR SELECT USING (bucket_id = 'petition-documents' AND owner = auth.uid());
-- CREATE POLICY "Authenticated upload petition docs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'petition-documents' AND auth.role() = 'authenticated');
-- CREATE POLICY "Owner update petition docs" ON storage.objects FOR UPDATE USING (bucket_id = 'petition-documents' AND owner = auth.uid());
-- CREATE POLICY "Owner delete petition docs" ON storage.objects FOR DELETE USING (bucket_id = 'petition-documents' AND owner = auth.uid());

-- Community Images Policies
-- CREATE POLICY "Public read community images" ON storage.objects FOR SELECT USING (bucket_id = 'community-images');
-- CREATE POLICY "Authenticated upload community images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'community-images' AND auth.role() = 'authenticated');
-- CREATE POLICY "Owner update community images" ON storage.objects FOR UPDATE USING (bucket_id = 'community-images' AND owner = auth.uid());
-- CREATE POLICY "Owner delete community images" ON storage.objects FOR DELETE USING (bucket_id = 'community-images' AND owner = auth.uid());