# CourtMap - Product Requirements Document

## Overview

CourtMap is a mobile-first web app (PWA) for discovering, comparing, and booking pickleball courts in Vietnam. It aggregates court data scraped from alobo/datlich and presents it with an Agoda-inspired UX: search-first flow, results with floating Map/Saved pills, and a venue detail bottom sheet with combined court+time availability and in-app booking.

**Target:** Vietnamese pickleball players looking to find and book courts near them.
**Stack suggestion:** React Native (or Next.js PWA), Supabase (auth, database, realtime), Railway or Vercel for hosting.
**Design:** Dark theme by default with light theme toggle. Lime green accent (#b8f200 dark / #7cb300 light).

---

## Navigation Architecture

The app has no permanent bottom tab bar. Navigation is screen-based:

```
Search (home) --> Results --> [Map | Saved] (floating pills toggle)
                          --> Venue Detail (bottom sheet overlay)
                                --> Booking Form (bottom sheet step 2)
                                    --> Booking Confirmation

My Bookings (accessible from Results top bar, user avatar or hamburger)
Profile (accessible from My Bookings or Results top bar)
```

The floating pill buttons (Map / Saved) appear on Results, Map, and Saved screens. They toggle between views. The pill label changes contextually: "Map" becomes "List" when on the map view.

---

## Screen Specifications

### 1. Search Screen (Home)

This is the landing screen. Full-screen search form, no distractions.

**Components:**
- App header: "COURTMAP" logo with venue count ("1,976 pickleball courts - Vietnam")
- Location input: text field with pin icon, placeholder "Search area or venue name..."
- Date selector: horizontal scrollable chips showing next 7-14 days. Format: "Wed Apr 1". Default: today
- Duration selector: chips for 1h, 1h30, 2h, 2h30, 3h. Default: 1h30
- Time of Day selector: chips for Morning, Noon, Afternoon, Night. Default: Morning
- Near Me toggle: switch with radius display (default 10km, adjustable)
- Fixed bottom CTA: "SEARCH COURTS" button, full width, lime green

**Behavior:**
- Tapping "SEARCH COURTS" transitions to Results screen
- All search parameters are passed as filters
- Location input supports both area names ("Thu Duc", "Q2") and venue names

### 2. Results Screen

Vertical scrollable list of venue cards sorted by user preference.

**Top bar (sticky):**
- Back arrow (returns to Search)
- Search summary: "Apr 1 - 1h30 - Morning"
- "Edit" link (returns to Search with current params preserved)
- Sort chips below: Nearest (default), Cheapest, Top rated
- User avatar / profile icon (top right, navigates to Profile)

**Venue Card:**
- Image placeholder area (top, 140px height)
- Heart button (top right of image, toggles saved)
- Price badge (bottom left of image): "39k/h" on lime green background
- "Fully booked" badge (bottom right, red) if all courts/slots booked
- Venue name (bold, 16px, single line truncated)
- Address (12px, secondary color, single line truncated)
- Rating pill: star icon + rating + review count
- Distance + court count row
- Tag chips: up to 4 tags (e.g. "Indoor", "AC", "Lights", "Pro Shop")

**Floating pills (fixed bottom center):**
- "Map" pill with pin icon (toggles to Map screen, label becomes "List" when on map)
- "Saved" pill with heart icon + badge count

### 3. Map Screen

Full-screen map with venue pins showing prices.

**Components:**
- Map (Leaflet + CartoDB dark tiles for dark theme, standard for light)
- Search bar (top, floating, glassmorphism background)
- Price pins for each venue: lime green if selected, white if available, gray if fully booked
- Tapping a pin shows a compact venue card at bottom (above the floating pills)
- Tapping the compact card opens the venue detail bottom sheet
- Floating pills: "List" + "Saved"

### 4. Saved Screen

List of venues the user has hearted. Same layout as Results but filtered to saved venues only.

**Empty state:** Heart emoji + "No saved courts yet" + "Tap the heart on any court to save it here"

**Top bar:** Back arrow + "Saved Courts" title

Saved state is persisted locally (localStorage or Supabase if user has profile).

### 5. Venue Detail Bottom Sheet

Slides up from bottom (92vh max height) when tapping any venue card. Overlay backdrop dismisses it.

**Structure:**
- Drag handle (top center)
- Photo gallery: horizontal scrollable, first image wider (200px), rest 130px, 130px height, rounded corners
- Venue header: name (22px bold), address with pin icon, heart + share buttons
- Quick stats row: rating pill, court count pill, distance pill
- Price range: "39k to 55k/hour"
- Tab bar: **Availability** | **Info**

#### 5a. Availability Tab

Combined court + time slot view. Each court is a row.

**Court row:**
- Court name (bold, e.g. "Court 3")
- Note if any (e.g. "Less sun", "Best lights", "VIP", or empty)
- Open slot count on the right (e.g. "5 open" in green, or "Unavailable" in orange for maintenance courts)

**Below each court name:** horizontally scrollable strip of time slot chips.

**Time slot chip:**
- Time (e.g. "6:00") bold, 13px
- Price below (e.g. "45k") in accent color, 11px
- States:
  - **Available:** normal background, standard border. Tappable.
  - **Booked:** dimmed (opacity 0.35), darker background. Not tappable.
  - **Selected:** lime green background, dark text, subtle shadow. Tappable to deselect.

**No "few left" state.** Slots are binary: available or booked.
**No Indoor/Outdoor labels** on court rows.
**No "Selected" in the legend.** The visual highlight is self-explanatory.

**Legend (simplified):** Only two items:
- Green dot + "Available"
- Gray dot + "Booked"

**Multi-select:** Users can select multiple slots across multiple courts. Useful for booking consecutive hours or booking for multiple groups.

**Sticky bottom CTA:**
- Directions button (left, square, opens Google Maps with venue coordinates)
- Book button (flex, full width):
  - No selection: "SELECT COURT & TIME" (grayed out, not tappable)
  - 1 slot selected: "BOOK Court 3 at 6:00 - 45k"
  - Multiple slots: "BOOK 3 SLOTS - 135k" (sum of selected slot prices)

Tapping the Book button opens the Booking Form (step 2 of the bottom sheet).

#### 5b. Info Tab

Venue details and amenities.

**Sections:**
- Operating hours (clock icon + hours string, e.g. "5:00 AM - 10:00 PM")
- Phone number (phone icon + number, tappable to call)
- Address (pin icon + full address, tappable to open in maps)
- Social links row:
  - Facebook URL (Facebook icon, tappable, opens in browser)
  - Instagram URL (Instagram icon, tappable)
  - TikTok URL (TikTok icon, tappable)
  - Google Maps URL (Google icon, tappable)
  - Only show icons for URLs that exist in the venue data. Hide if null.
- Amenities grid (3 columns): emoji icon + label for each amenity
- Tag chips: all venue tags

---

### 6. Booking Form (Bottom Sheet Step 2)

After tapping "BOOK" on the venue detail sheet, the sheet content transitions to the booking form. The sheet stays open, content slides/fades to the booking form.

**Header:** "Confirm Booking" with back arrow to return to availability view.

**Booking summary card (read-only):**
- Venue name
- Date (from search params)
- Selected slots listed: "Court 3, 6:00 - 6:30" / "Court 1, 5:00 - 5:30" etc.
- Total price

**User info form:**
- Name field (pre-filled from profile if exists)
- Phone number field (pre-filled from profile if exists)
- Optional notes field (e.g. "Need 4 paddles", "Birthday group")

**CTA button:** "SEND BOOKING REQUEST" (lime green, full width)

**Behavior:**
- On submit, create a booking record with status "pending"
- Show success state: checkmark animation + "Request sent!" + "The venue will confirm your booking shortly"
- "VIEW MY BOOKINGS" button below
- "DONE" button to close the sheet

If user has no profile yet (first time), the form also shows a small note: "Your name and phone will be saved for future bookings" and creates/updates the user profile on submit.

---

### 7. My Bookings Screen

Accessible from the Results screen top bar (calendar icon or "My Bookings" text link).

**Top bar:** Back arrow + "My Bookings" title

**Tabs/filters:** "Upcoming" (default) | "Past" | "All"

**Booking card:**
- Status badge (top right):
  - **Pending:** orange badge "Awaiting approval"
  - **Booked:** green badge "Confirmed"
  - **Paid:** blue badge "Paid"
  - **Canceled:** red badge "Canceled"
- Venue name (bold)
- Date + time: "Wed Apr 1, 6:00 - 7:30"
- Court(s): "Court 3"
- Total price: "135k"
- Action buttons (contextual by status):
  - Pending: "Cancel Request" button
  - Booked: "Cancel Booking" button
  - Paid: no action (read-only)
  - Canceled: no action (read-only, grayed out card)

**Empty state:** "No bookings yet" + "Search for courts to make your first booking"

**Tapping a booking card** opens a booking detail view (can be a bottom sheet or full screen):
- Full booking details (venue, date, court, time, price, status, notes)
- Status timeline (visual): empty > pending > booked > paid (or canceled branch)
- Venue quick info (name, phone, address - tappable)
- Cancel button (if status allows)
- "Rebook" button (if canceled or past - opens venue detail with same params)

### 8. Profile Screen

Minimal profile, no real authentication. Accessible from My Bookings or Results top bar.

**Fields:**
- Name (text input, required for booking)
- Phone number (text input, required for booking)
- Profile photo placeholder (optional, not critical for MVP)

**Actions:**
- "Save" button to persist changes
- "My Bookings" link
- "Saved Courts" link
- Theme toggle (dark/light)

**Storage:** Profile data stored in localStorage for MVP. Can migrate to Supabase auth later.

---

## Data Models

### Venue

```typescript
interface Venue {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
  hours: string; // e.g. "5:00 AM - 10:00 PM"
  rating: number;
  reviewCount: number;
  priceMin: number; // in VND
  priceMax: number; // in VND
  tags: string[]; // ["Indoor", "AC", "Lights", "Pro Shop"]
  amenities: string[]; // ["Parking", "Water", "Locker", ...]
  images: string[]; // URLs
  facebookUrl: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  googleUrl: string | null;
  availability: CourtAvailability[];
}
```

### Court Availability

```typescript
interface CourtAvailability {
  courtName: string; // "Court 1", "Court A", "Premium 1"
  note: string; // "Less sun", "VIP", "Best lights", "" for none
  isAvailable: boolean; // false if under maintenance
  slots: TimeSlot[];
}

interface TimeSlot {
  time: string; // "06:00", "06:30" - 30min increments
  price: number; // in VND
  isBooked: boolean; // true = already booked, false = available
}
```

### Booking

```typescript
interface Booking {
  id: string;
  oderId: string; // unique order reference for user communication
  venueId: string;
  venueName: string; // denormalized for display
  venuePhone: string; // denormalized for display
  venueAddress: string; // denormalized for display
  userId: string;
  userName: string;
  userPhone: string;
  date: string; // ISO date "2026-04-01"
  slots: BookingSlot[];
  totalPrice: number; // in VND
  notes: string;
  status: BookingStatus;
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
}

interface BookingSlot {
  courtName: string;
  time: string; // "06:00"
  duration: number; // in minutes, typically 30
  price: number;
}

type BookingStatus = 
  | "pending"    // Request sent, awaiting venue approval
  | "booked"     // Venue approved, not yet paid
  | "paid"       // Booked and paid (marked by venue)
  | "canceled";  // Canceled by user or venue
```

### User Profile

```typescript
interface UserProfile {
  id: string;
  name: string;
  phone: string;
  savedVenues: string[]; // array of venue IDs
  createdAt: string;
}
```

---

## Booking State Machine

```
[empty] --user submits form--> [pending]
[pending] --venue approves--> [booked]
[pending] --user cancels--> [canceled]
[pending] --venue rejects--> [canceled]
[booked] --venue marks paid--> [paid]
[booked] --user cancels--> [canceled]
[paid] -- (terminal state, no transitions)
[canceled] -- (terminal state, no transitions)
```

**Rules:**
- Users can cancel when status is "pending" or "booked"
- Users cannot cancel "paid" bookings (must contact venue directly)
- Venue owners approve/reject "pending" bookings (separate admin interface, out of scope for this PRD)
- Venue owners mark "booked" as "paid" after receiving payment outside the system
- Payment happens outside the system (cash, bank transfer, MoMo, etc.)

---

## Search & Filtering Logic

**Search parameters:**
- Location/area (text query or GPS coordinates)
- Date (specific date)
- Duration (1h, 1h30, 2h, 2h30, 3h)
- Time of day (Morning: 5-11, Noon: 11-14, Afternoon: 14-17, Night: 17-23)
- Radius (default 10km from user location)

**Sort options:**
- Nearest (by distance from user, default)
- Cheapest (by priceMin ascending)
- Top rated (by rating descending)

**Filtering behavior:**
- Date + Time of Day determines which time slots to show in venue availability
- Duration determines how many consecutive slots the user might need (informational, not enforced)
- Venues with zero available slots matching the search criteria should show "Fully booked" badge but still appear in results (sorted to bottom optionally)

---

## Key UX Behaviors

### Saved/Favorites
- Heart icon on venue cards and venue detail sheet
- Saved state toggles immediately (optimistic UI)
- Persisted in localStorage (MVP) or Supabase user profile
- Saved count shown as badge on floating "Saved" pill

### Multi-slot Selection
- Users can tap multiple time slots across multiple courts
- Selected slots highlighted with accent color
- Deselect by tapping again
- CTA updates dynamically with count and total price
- All selected slots are submitted as a single booking

### Theme
- Dark theme default
- Light theme toggle via sun/moon icon (top right, fixed position)
- Theme persisted in localStorage

### Directions Button
- Square button left of Book CTA in venue detail
- Opens Google Maps directions to venue coordinates
- URL format: `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}`

### Social Links (Info Tab)
- Only display icons for URLs that exist (non-null)
- Displayed as a horizontal row of circular icon buttons
- Tap opens URL in new browser tab
- Icons: Facebook (f), Instagram (camera), TikTok (music note), Google Maps (G pin)

---

## Screens Summary

| Screen | Entry Point | Key Components |
|---|---|---|
| Search | App launch / Back from Results | Date, duration, time, location, CTA |
| Results | Search CTA | Venue cards, sort, floating pills |
| Map | "Map" floating pill | Map with price pins, search bar |
| Saved | "Saved" floating pill | Filtered venue list |
| Venue Detail | Tap venue card (any screen) | Bottom sheet: photos, stats, availability, info |
| Booking Form | Tap "Book" in venue detail | Bottom sheet step 2: summary, name, phone, notes |
| Booking Confirmation | Submit booking form | Success state with actions |
| My Bookings | Top bar icon on Results | Booking cards with status, filters |
| Booking Detail | Tap booking card | Full details, status timeline, actions |
| Profile | Top bar or My Bookings | Name, phone, saved, theme |

---

## Out of Scope (MVP)

- Real authentication (login/signup with OTP or social)
- Payment processing (handled outside the system)
- Venue admin/owner interface (separate product)
- Push notifications for booking status changes
- Reviews and ratings submission
- Real-time availability updates (polling or websocket)
- Chat with venue
- Group booking / player matching
- Booking history analytics
- Multi-language support

---

## Technical Notes for Implementation

1. **Data source:** Court availability data is scraped from datlich.alobo.vn. The scraping pipeline is a separate system. This app consumes the processed data via API.

2. **No backend auth for MVP:** User profile (name + phone) stored in localStorage. Bookings can be stored in Supabase with the phone number as a soft identifier. Migrate to proper auth later.

3. **Bottom sheet:** Use a library like `react-spring` or `framer-motion` for the sheet animation. The sheet has two internal states: "detail" (showing venue info + availability) and "booking" (showing the booking form). Transition between them with a slide/fade.

4. **Map:** Use Leaflet with CartoDB dark tiles for dark theme. React-leaflet for the React wrapper. Price pins are custom markers.

5. **Booking submission:** POST to Supabase `bookings` table. Return booking ID. Show success state. No real-time confirmation, the venue owner will update status via a separate admin tool.

6. **Responsive:** The app is mobile-first (max-width 430px centered). It should work on desktop but the primary experience is mobile browser or PWA.

7. **Offline:** Saved venues and user profile should work offline (localStorage). Bookings require network.
