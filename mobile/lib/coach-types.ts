export interface CoachResult {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  photo: string | null;
  bio: string | null;
  certifications: string[];
  specialties: string[];
  languages: string[];
  focusLevels: string[];
  groupSizes: string[];
  experienceBand: string | null;
  yearsExperience: number | null;
  responseHint: string | null;
  ratingOverall: number | null;
  ratingOnTime: number | null;
  ratingFriendly: number | null;
  ratingProfessional: number | null;
  ratingRecommend: number | null;
  reviewCount: number;
  isActive: boolean;
  isProfilePublic: boolean;
  subscriptionPlan: string;
  hourlyRate1on1: number;
  hourlyRateGroup: number | null;
  maxGroupSize: number;
  cancellationHours: number;
  creditExpiryDays: number;
  bankName: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankBin: string | null;
  courts?: CoachCourtLinkResult[];
  creditPacks?: CreditPackResult[];
}

export interface CoachCourtLinkResult {
  id: string;
  venueId: string;
  venueName: string;
  venueAddress: string;
  courtIds: string[];
  isActive: boolean;
}

export interface CoachAvailabilityResult {
  id: string;
  dayOfWeek: number | null;
  date: string | null;
  startTime: string;
  endTime: string;
  venueId: string | null;
  isBlocked: boolean;
}

export interface CoachSessionResult {
  id: string;
  coachId: string;
  coachName?: string;
  venueId: string;
  venueName: string;
  courtName: string | null;
  date: string;
  startTime: string;
  endTime: string;
  sessionType: string;
  maxPlayers: number;
  status: string;
  coachFee: number;
  courtFee: number;
  totalPerPlayer: number;
  paymentMethod: string | null;
  paymentStatus: string;
  paymentFlaggedAt: string | null;
  slotIds: string[];
  participants: SessionParticipantResult[];
  createdAt: string;
}

export interface SessionParticipantResult {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  amountDue: number;
  paymentMethod: string | null;
  paymentStatus: string;
  paymentProofUrl: string | null;
  paidAt: string | null;
  creditId: string | null;
}

export interface CreditPackResult {
  id: string;
  coachId: string;
  name: string;
  creditCount: number;
  price: number;
  discountPercent: number | null;
  isActive: boolean;
}

export interface CreditResult {
  id: string;
  coachId: string;
  coachName?: string;
  userId: string;
  creditPackId: string | null;
  totalCredits: number;
  remainingCredits: number;
  pricePerCredit: number;
  totalPaid: number;
  paymentStatus: string;
  expiresAt: string;
  createdAt: string;
}

export interface CoachReviewResult {
  id: string;
  coachId: string;
  sessionId: string | null;
  userId: string;
  userName: string;
  ratingOnTime: number;
  ratingFriendly: number;
  ratingProfessional: number;
  ratingRecommend: number;
  ratingOverall: number;
  comment: string | null;
  createdAt: string;
}

export interface CoachVenueInviteResult {
  id: string;
  coachId: string;
  venueId: string;
  venueName?: string;
  invitedBy: string;
  status: string;
  createdAt: string;
  respondedAt: string | null;
}
