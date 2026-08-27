-- ============================================
-- ONE GUDALUR - SUPABASE INDEXES
-- ============================================

-- Users
CREATE INDEX idx_users_locality_id ON users(locality_id);
CREATE INDEX idx_users_gudalur_id ON users(gudalur_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_verification ON users(verification_level);

-- Civic Issues
CREATE INDEX idx_civic_issues_locality ON civic_issues(locality_id);
CREATE INDEX idx_civic_issues_reporter ON civic_issues(reporter_id);
CREATE INDEX idx_civic_issues_status ON civic_issues(status);
CREATE INDEX idx_civic_issues_created ON civic_issues(created_at DESC);
CREATE INDEX idx_civic_issues_category ON civic_issues(category);

-- Alerts
CREATE INDEX idx_alerts_active ON alerts(active) WHERE active = TRUE;
CREATE INDEX idx_alerts_created ON alerts(created_at DESC);
CREATE INDEX idx_alerts_category ON alerts(category);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_localities ON alerts USING GIN(affected_localities);

-- Wildlife Incidents
CREATE INDEX idx_wildlife_locality ON wildlife_incidents(locality_id);
CREATE INDEX idx_wildlife_timestamp ON wildlife_incidents(timestamp DESC);
CREATE INDEX idx_wildlife_type ON wildlife_incidents(type);
CREATE INDEX idx_wildlife_urgency ON wildlife_incidents(urgency);

-- Petitions
CREATE INDEX idx_petitions_status ON petitions(status);
CREATE INDEX idx_petitions_created ON petitions(created_at DESC);
CREATE INDEX idx_petitions_created_by ON petitions(created_by);

-- Government Grievances
CREATE INDEX idx_grievances_user ON government_grievances(user_id);
CREATE INDEX idx_grievances_status ON government_grievances(status);

-- Services
CREATE INDEX idx_services_locality ON services(locality_id);
CREATE INDEX idx_services_category ON services(category);
CREATE INDEX idx_services_verified ON services(is_verified);

-- Comments
CREATE INDEX idx_comments_parent ON comments(parent_id);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_created ON comments(created_at ASC);

-- Market Prices
CREATE INDEX idx_market_updated ON market_prices(updated_at DESC);
CREATE INDEX idx_market_item ON market_prices(item);

-- Community Posts
CREATE INDEX idx_community_created ON community_posts(created_at DESC);
CREATE INDEX idx_community_user ON community_posts(user_id);

-- Help Requests
CREATE INDEX idx_help_created ON help_requests(created_at DESC);
CREATE INDEX idx_help_user ON help_requests(user_id);

-- Volunteers
CREATE INDEX idx_volunteers_locality ON volunteers(locality_id);
CREATE INDEX idx_volunteers_status ON volunteers(status);
CREATE INDEX idx_volunteers_user ON volunteers(user_id);