export type Role = 
  | 'RESIDENT' 
  | 'LOCAL_MEMBER' 
  | 'LOCAL_MODERATOR' 
  | 'LOCAL_ADMIN' 
  | 'CORE_ADMIN' 
  | 'VERIFIER' 
  | 'PLATFORM_ADMIN';

export type VerificationLevel = 
  | 'REGISTERED' 
  | 'PHONE_VERIFIED' 
  | 'LOCALITY_VERIFIED' 
  | 'TRUSTED_MEMBER' 
  | 'LOCAL_ADMIN' 
  | 'CORE_ADMIN' 
  | 'PLATFORM_ADMIN';

export interface Locality {
  id: string;
  name: string;
  nameTa: string;
  slug: string;
  alternativeNames: string[];
  administrativeParent: 'Gudalur Municipality' | 'Nelliyalam Municipality' | 'Devala Town Panchayat' | 'O\'Valley Town Panchayat' | 'Cherangode Panchayat' | 'Mudumalai Buffer Zone' | 'Masinagudi Panchayat';
  wardNumber?: number;
  revenueVillage: string;
  pincode: string;
  lat: number;
  lng: number;
  borderZone: 'EAST_MUDUMALAI' | 'WEST_WAYANAD_NILAMBUR' | 'NORTH_BANDIPUR' | 'SOUTH_OVALLEY_RIDGE' | 'CENTRAL_TOWN';
  description: string;
  descriptionTa: string;
  verificationStatus: 'VERIFIED_OFFICIAL' | 'VERIFIED_COMMUNITY' | 'PENDING_SURVEY';
  coordinatorName?: string;
  coordinatorPhone?: string;
  whatsAppGroupLink?: string;
  activeIssuesCount?: number;
  memberCount?: number;
  alertStatus: 'NORMAL' | 'CAUTION' | 'ALERT';
  landmarks: string[];
}

export interface AdministrativeArea {
  id: string;
  name: string;
  nameTa: string;
  type: 'Taluk' | 'Municipality' | 'Town Panchayat' | 'Revenue Village' | 'Border Gate';
  headquarters: string;
  wardsCount?: number;
  borderDescription?: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  phone: string;
  localityId: string;
  localityName: string;
  customPlaceName?: string;
  pincode: string;
  gudalurId: string; // e.g. GD-2026-8921
  role: Role;
  verificationLevel: VerificationLevel;
  isBloodDonor: boolean;
  bloodGroup?: string;
  avatarUrl?: string;
  bio?: string;
  lat?: number;
  lng?: number;
  createdAt: number;
  updatedAt: number;
}

export type AlertCategory = 
  | 'WILDLIFE'
  | 'WEATHER'
  | 'TRAFFIC'
  | 'CIVIC'
  | 'wildlife' 
  | 'weather' 
  | 'road' 
  | 'emergency' 
  | 'health' 
  | 'public_safety' 
  | 'government' 
  | 'infrastructure';

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'INFO' | 'NOTICE' | 'WARNING' | 'URGENT';

export interface UrgentAlert {
  id: string;
  title: string;
  titleTa: string;
  description: string;
  descriptionTa: string;
  category: AlertCategory;
  severity: AlertSeverity;
  affectedLocalities?: string[];
  source: string;
  verificationStatus: 'OFFICIAL' | 'VERIFIED_OFFICIAL' | 'VERIFIED_COMMUNITY' | 'UNVERIFIED_REPORT';
  createdBy?: string;
  verifiedBy?: string;
  createdAt: number;
  expiresAt?: number;
  active?: boolean;
}

export type IssueCategory = 
  | 'roads'
  | 'water'
  | 'electricity'
  | 'sanitation'
  | 'wildlife'
  | 'ghat_safety'
  | 'health'
  | 'other'
  | 'Roads & Potholes' 
  | 'Water Supply' 
  | 'Drainage & Waste' 
  | 'Streetlights & Power' 
  | 'Public Health & Sanitation' 
  | 'Wildlife Safety' 
  | 'Public Transport' 
  | 'School & Anganwadi' 
  | 'Other';

export type IssueStatus = 
  | 'REPORTED' 
  | 'RECEIVED' 
  | 'VERIFICATION' 
  | 'ASSIGNED' 
  | 'ACTION' 
  | 'OFFICIAL_RESPONSE' 
  | 'COMMUNITY_REVIEW' 
  | 'RESOLVED';

export interface IssueTimelineEntry {
  status: IssueStatus;
  note: string;
  actor?: string;
  updatedBy?: string;
  timestamp: number;
}

export interface CivicIssue {
  id: string; // e.g. GD-2026-1042
  title: string;
  description: string;
  category: IssueCategory;
  photoUrl?: string;
  localityId: string;
  localityName: string;
  customPlaceName?: string;
  pincode?: string;
  lat?: number;
  lng?: number;
  address: string;
  reporterId: string;
  reporterName: string;
  reporterGudalurId: string;
  status: IssueStatus;
  assignedAuthority?: string;
  officialGrievanceId?: string; // e.g. TN-MM-2026-8910
  timeline?: IssueTimelineEntry[];
  upvotesCount: number;
  upvotedBy?: string[];
  createdAt: number;
  updatedAt: number;
}

export type WildlifeAnimal = 
  | 'TIGER' 
  | 'ELEPHANT' 
  | 'LONE_TUSKER' 
  | 'LEOPARD' 
  | 'GAUR' 
  | 'SLOTH_BEAR' 
  | 'WILD_BOAR'
  | 'OTHER';

export type WildlifeIncidentType = 
  | 'TIGER'
  | 'ELEPHANT'
  | 'LONE_TUSKER'
  | 'LEOPARD'
  | 'GAUR'
  | 'WILD_BOAR'
  | 'SLOTH_BEAR'
  | 'OTHER'
  | 'elephant_sighting' 
  | 'elephant_crossing' 
  | 'crop_damage' 
  | 'property_damage' 
  | 'road_danger' 
  | 'other_wildlife';

export type ThreatLevel = 
  | 'CRITICAL_ATTACK' 
  | 'IMMINENT_DANGER' 
  | 'ACTIVE_MOVEMENT' 
  | 'ESTATE_CROSSING' 
  | 'CAUTION';

export interface WildlifeIncident {
  id: string;
  type: WildlifeIncidentType;
  animalType: WildlifeAnimal;
  threatLevel: ThreatLevel;
  localityId: string;
  localityName: string;
  customPlace?: string;
  pincode?: string;
  lat: number; // Mandatory Live GPS
  lng: number; // Mandatory Live GPS
  accuracyMeters?: number;
  generalizedArea: string;
  herdSize: number;
  behavior: string;
  urgency: 'LOW' | 'MEDIUM' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  mediaUrl?: string; // Photo / video uploaded
  mediaType?: 'image' | 'video';
  reportedBy: string;
  reporterPhone?: string;
  reporterGudalurId?: string;
  reporterLocality?: string;
  reporterPincode?: string;
  verifiedByForestDept: boolean;
  timestamp: number;
  distanceFromUserKm?: number; // Real-time client calculated
}

export interface SupporterInfo {
  uid: string;
  name: string;
  localityName: string;
  pincode: string;
  gudalurId: string;
  signedAt: number;
}

export type PetitionStatus = 
  | 'OPEN' 
  | 'SUBMITTED_TO_GOVT' 
  | 'IN_GOVT_REVIEW' 
  | 'ACTION_TAKEN' 
  | 'RESOLVED' 
  | 'CLOSED';

export interface Petition {
  id: string;
  title: string;
  titleTa: string;
  problem: string;
  problemTa: string;
  demand: string;
  demandTa: string;
  targetAuthority: string;
  targetAuthorityTa?: string;
  evidenceSummary: string;
  evidenceSummaryTa?: string;
  targetSignatures?: number;
  supportCount: number;
  supporters: SupporterInfo[]; // Real list of verified residents
  deadline?: number;
  status: PetitionStatus;
  officialResponse?: {
    authority: string;
    responseDate: number;
    text: string;
    actionPlan?: string;
    documentUrl?: string;
  };
  createdBy: string;
  createdByName: string;
  createdAt: number;
}

export interface GovernmentChannel {
  id: string;
  authorityName: string;
  authorityNameTa: string;
  category: string;
  description: string;
  descriptionTa: string;
  onlineUrl: string;
  helpline: string;
  address: string;
  submissionMethod: string;
  trackingMechanism: string;
  expectedWorkflow: string;
}

export interface UserGrievanceRecord {
  id: string;
  userId: string;
  userGudalurId: string;
  issueId?: string;
  authority: string;
  complaintId: string;
  title: string;
  submissionDate: number;
  status: string;
  notes: string;
}

export interface WeatherSnapshot {
  temp: number;
  code: number;
  aqi: number;
  uv: number;
  humidity: number;
  windSpeed: number;
  rainProbability: number;
  timestamp: number;
}

export interface BusRoute {
  id: string;
  routeNumber: string;
  routeName: string;
  routeNameTa: string;
  type: string;
  from: string;
  to: string;
  via: string[];
  timings: string[];
  frequency: string;
  fareEstimate: string;
}

export interface GudalurChapter {
  id: string;
  number: string;
  title: string;
  titleTa: string;
  era: string;
  summary: string;
  summaryTa: string;
  content: string[];
  contentTa: string[];
  sources: string[];
  tag: string;
}

export interface ServiceListing {
  id: string;
  name: string;
  nameTa?: string;
  category: string;
  phone: string;
  localityId: string;
  localityName: string;
  description: string;
  address: string;
  is24x7: boolean;
  isVerified: boolean;
  createdAt: number;
}

export interface Comment {
  id: string;
  parentId: string;
  userId: string;
  userName: string;
  userGudalurId?: string;
  text: string;
  createdAt: number;
}

// Backward compatibility legacy types
export interface Alert {
  id?: string;
  level: number;
  message: string;
  area: string;
  type: string;
  lat: number;
  lng: number;
  createdAt: number;
}
export interface ElephantSighting {
  id?: string;
  lat: number;
  lng: number;
  herdSize: number;
  behavior: string;
  area: string;
  timestamp: number;
}
export interface Report {
  id?: string;
  title: string;
  category: string;
  description: string;
  photoUrl?: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  status: string;
  createdAt: number;
  updatedAt?: number;
}
export interface CommunityPost {
  id?: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: number;
  likesCount?: number;
  commentsCount?: number;
}
export interface HelpRequest {
  id?: string;
  title: string;
  description: string;
  phone: string;
  area: string;
  urgency: string;
  createdAt: number;
}
export interface Service {
  id?: string;
  name: string;
  category: string;
  phone: string;
  area: string;
  isVerified?: boolean;
}
export interface MarketPrice {
  id?: string;
  crop: string;
  price: number;
  unit: string;
  trend: string;
  updatedAt: number;
}
export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
}
export interface Volunteer {
  id: string;
  name: string;
  skills: string[];
}
export type ReportCategory = string;
