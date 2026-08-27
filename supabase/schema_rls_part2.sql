-- ============================================
-- ONE GUDALUR - SUPABASE RLS POLICIES (Part 2: Community & Content)
-- ============================================

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE manifesto_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE manifesto_signatures ENABLE ROW LEVEL SECURITY;

-- Comments policies
CREATE POLICY "Public read comments"
  ON comments FOR SELECT
  USING (TRUE);

CREATE POLICY "Signed in users can create comments"
  ON comments FOR INSERT
  WITH CHECK (is_signed_in());

CREATE POLICY "Authors and admins can delete comments"
  ON comments FOR DELETE
  USING (is_admin() OR (is_signed_in() AND user_id = auth.uid()));

-- Market Prices policies
CREATE POLICY "Public read market prices"
  ON market_prices FOR SELECT
  USING (TRUE);

CREATE POLICY "Signed in users can manage market prices"
  ON market_prices FOR ALL
  USING (is_signed_in());

-- Community Posts policies
CREATE POLICY "Public read community posts"
  ON community_posts FOR SELECT
  USING (TRUE);

CREATE POLICY "Signed in users can create posts"
  ON community_posts FOR INSERT
  WITH CHECK (is_signed_in());

-- Help Requests policies
CREATE POLICY "Public read help requests"
  ON help_requests FOR SELECT
  USING (TRUE);

CREATE POLICY "Signed in users can create help requests"
  ON help_requests FOR INSERT
  WITH CHECK (is_signed_in());

-- Volunteers policies
CREATE POLICY "Public read approved volunteers"
  ON volunteers FOR SELECT
  USING (TRUE);

CREATE POLICY "Signed in users can apply"
  ON volunteers FOR INSERT
  WITH CHECK (is_signed_in());

CREATE POLICY "Admins can manage volunteers"
  ON volunteers FOR ALL
  USING (is_admin());

-- Manifesto Stats policies
CREATE POLICY "Public read manifesto stats"
  ON manifesto_stats FOR SELECT
  USING (TRUE);

CREATE POLICY "Signed in users can update stats"
  ON manifesto_stats FOR UPDATE
  USING (is_signed_in());

-- Manifesto Signatures policies
CREATE POLICY "Public read manifesto signatures"
  ON manifesto_signatures FOR SELECT
  USING (TRUE);

CREATE POLICY "Signed in users can sign"
  ON manifesto_signatures FOR INSERT
  WITH CHECK (is_signed_in());