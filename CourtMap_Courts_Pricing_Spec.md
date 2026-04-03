# CourtMap Admin — Courts & Pricing (Corrected Spec)

## Problem with Current Implementation

The current Courts screen shows 39 individual time slot chips per court, each with a random price. This is unusable for venue owners because:

1. No venue owner thinks in 39 individual half-hour prices. They think in time ranges: "Morning is 60k, Evening is 120k."
2. Editing prices means tapping 39 chips per court, per day. For a venue with 6 courts and 7 days, that's 1,638 taps.
3. Prices are per-slot with no connection to the venue's actual pricing structure (weekday vs weekend, member vs walk-in).
4. Adding a new court requires manually setting up all 39 slots again.

## How Venue Owners Actually Think About Pricing

A pickleball venue has:
- A set of **courts** (Court 1, Court 2, etc.)
- One or more **pricing tables** that define rates by time range
- Different tables for different day types (Weekday, Weekend, Holiday)
- Optionally, two rate tiers: **Walk-in** (default/guest) and **Member** (regulars with membership)
- Some venues have only Walk-in pricing, no member tier

The individual 30-minute time slots that players see are **generated** from these pricing tables, not manually created.

---

## Revised Architecture

```
Pricing Tables (owner creates these)
  → defines price per time range per day type
  → system auto-generates TimeSlot records from these

Courts (simple list)
  → name, note, active toggle
  → no pricing here, pricing comes from the tables

Day Type Mapping
  → which dates use which pricing table
  → default: Mon-Fri = "Weekday", Sat-Sun = "Weekend"
  → override specific dates (e.g. April 30 = "Holiday")
```

---

## Data Model Changes

### New: PricingTable

```prisma
model PricingTable {
  id          String        @id @default(cuid())
  venueId     String
  venue       Venue         @relation(fields: [venueId], references: [id])
  name        String        // "Weekday", "Weekend & Holiday", "Special Event"
  dayTypes    String[]      // ["weekday"] or ["saturday", "sunday"] or ["holiday"]
  rows        Json          // PricingRow[] - see structure below
  sortOrder   Int           @default(0)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
}
```

**`dayTypes` values:**
- `"monday"`, `"tuesday"`, `"wednesday"`, `"thursday"`, `"friday"` — individual weekdays
- `"weekday"` — shorthand for Mon-Fri
- `"saturday"`, `"sunday"` — individual weekend days
- `"weekend"` — shorthand for Sat-Sun
- `"holiday"` — manually flagged dates

Most venues will just use `["weekday"]` and `["weekend"]` or `["weekend", "holiday"]`.

**`rows` JSON structure:**

```typescript
interface PricingRow {
  startTime: string;   // "05:00"
  endTime: string;     // "07:00"
  walkIn: number;      // price in VND, e.g. 60000
  member: number | null; // null if venue has no member pricing
}
```

**Example `rows` for a Weekday table:**
```json
[
  { "startTime": "05:00", "endTime": "07:00", "walkIn": 60000, "member": 45000 },
  { "startTime": "07:00", "endTime": "16:00", "walkIn": 80000, "member": 60000 },
  { "startTime": "16:00", "endTime": "22:00", "walkIn": 120000, "member": 90000 }
]
```

Time ranges must be contiguous and cover the full operating hours. Gaps are allowed (venue is closed during that time).

### New: DateOverride

For marking specific dates as holidays or applying a different pricing table.

```prisma
model DateOverride {
  id              String    @id @default(cuid())
  venueId         String
  venue           Venue     @relation(fields: [venueId], references: [id])
  date            String    // "2026-04-30" (Reunification Day)
  dayType         String    // "holiday", "weekend", or a custom label
  note            String?   // "Reunification Day", "Tet Holiday"
}
```

### Venue — add field

```prisma
model Venue {
  // ... existing fields
  hasMemberPricing   Boolean   @default(false)  // toggles member column visibility
  pricingTables      PricingTable[]
  dateOverrides      DateOverride[]
}
```

### TimeSlot — now auto-generated

TimeSlot records are **not manually created**. They are generated on-the-fly or batch-generated when:
- A pricing table is created or updated
- A player searches for a specific date
- An admin views slots for a date

The generation logic: for a given date, determine which pricing table applies (check DateOverride first, then fall back to dayType matching), then for each court, create 30-minute slots from the pricing rows.

**TimeSlot still stores `isBooked`** — that's the only field that changes per-slot (when a player books). Price comes from the pricing table at generation time.

---

## Admin UI: Courts Tab

### Section 1: Courts

Simple list. No pricing, no slots.

**Each court row:**
```
[Court name field]  [Note field]  [Active toggle]  [Delete]
```

Example:
```
┌─────────────────────────────────────────────────────────┐
│ Court 1          Less sun exposure      [Active ✓]  [×] │
│ Court 2          Near entrance           [Active ✓]  [×] │
│ Court 3          VIP court               [Active ✓]  [×] │
│ Court 4          Under repair            [Active ○]  [×] │
├─────────────────────────────────────────────────────────┤
│ [+ Add court]                                            │
└─────────────────────────────────────────────────────────┘
```

**Behavior:**
- Inline editing: tap name or note to edit, auto-saves on blur
- Active toggle: inactive courts don't appear in player search results and no slots are generated
- Delete: confirmation dialog, only allowed if no future bookings exist for this court
- Add court: creates a new row with empty name, focus on name field

### Section 2: Pricing Tables

Below the courts list, or as a separate "Pricing" tab in the admin nav.

**Header:**
```
Pricing Tables
[Member pricing toggle: OFF / ON]    ← toggles hasMemberPricing for the venue
```

When member pricing is OFF, the Member column is hidden in all tables.

**Each pricing table is a card:**

```
┌─────────────────────────────────────────────────────────┐
│ Weekday                                          [Edit] │
│ Applies to: Mon, Tue, Wed, Thu, Fri                     │
│                                                         │
│  Time Range      Walk-in      Member                    │
│  05:00 - 07:00   60,000 đ     45,000 đ                 │
│  07:00 - 16:00   80,000 đ     60,000 đ                 │
│  16:00 - 22:00   120,000 đ    90,000 đ                 │
│                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Weekend & Holiday                                [Edit] │
│ Applies to: Sat, Sun, Holidays                          │
│                                                         │
│  Time Range      Walk-in      Member                    │
│  05:00 - 07:00   80,000 đ     60,000 đ                 │
│  07:00 - 22:00   150,000 đ    110,000 đ                │
│                                                         │
└─────────────────────────────────────────────────────────┘

[+ Add pricing table]
```

**Edit mode (when tapping Edit on a pricing table):**

The card expands into an editable form:

```
┌─────────────────────────────────────────────────────────┐
│ Table name: [Weekday                              ]     │
│                                                         │
│ Applies to:                                             │
│ [✓ Mon] [✓ Tue] [✓ Wed] [✓ Thu] [✓ Fri]               │
│ [○ Sat] [○ Sun] [○ Holiday]                            │
│                                                         │
│  Start     End        Walk-in       Member              │
│  [05:00]   [07:00]    [60,000]      [45,000]     [×]   │
│  [07:00]   [16:00]    [80,000]      [60,000]     [×]   │
│  [16:00]   [22:00]    [120,000]     [90,000]     [×]   │
│  [+ Add row]                                            │
│                                                         │
│ [Save]  [Cancel]  [Delete table]                        │
└─────────────────────────────────────────────────────────┘
```

**Validation:**
- Table name required
- At least one day type selected
- At least one row
- Start time must be before end time in each row
- Time ranges within a table must not overlap
- Walk-in price required, member price required only if `hasMemberPricing` is on
- Warn (don't block) if time ranges have gaps (venue may be closed midday)
- Warn if a day type is not covered by any table (e.g. no table covers Saturdays)

### Section 3: Date Overrides (optional, below pricing tables)

For marking holidays or special dates.

```
Holiday & Special Dates
┌─────────────────────────────────────────────────────────┐
│ Apr 30, 2026    Holiday    "Reunification Day"    [×]   │
│ May 1, 2026     Holiday    "Labor Day"            [×]   │
│ [+ Add date]                                            │
└─────────────────────────────────────────────────────────┘
```

**Add date form:**
- Date picker
- Day type dropdown: Holiday, Weekend pricing, Custom
- Optional note
- When a date is marked as "Holiday," it uses whatever pricing table has "holiday" in its `dayTypes`

---

## Slot Generation Logic

This is the core algorithm that replaces manual slot management.

### When to generate

**Option A (recommended for MVP): Generate on read.**
When a player or admin requests slots for a specific court + date, compute them on the fly:

```typescript
function generateSlots(court: Court, date: string, venue: Venue): TimeSlot[] {
  // 1. Determine day type for this date
  const override = venue.dateOverrides.find(o => o.date === date);
  let dayType: string;
  
  if (override) {
    dayType = override.dayType; // "holiday"
  } else {
    const dayOfWeek = getDayOfWeek(date); // "monday", "tuesday", etc.
    dayType = ["saturday", "sunday"].includes(dayOfWeek) ? "weekend" : "weekday";
  }
  
  // 2. Find matching pricing table
  const table = venue.pricingTables.find(t => 
    t.dayTypes.includes(dayType) || 
    t.dayTypes.includes(getDayOfWeek(date))
  );
  
  if (!table) return []; // No pricing defined for this day type
  
  // 3. Generate 30-min slots from pricing rows
  const slots: TimeSlot[] = [];
  for (const row of table.rows) {
    let current = parseTime(row.startTime);
    const end = parseTime(row.endTime);
    
    while (current < end) {
      const timeStr = formatTime(current);
      
      // Check if this slot is already booked (from Booking records)
      const isBooked = await checkIfBooked(court.id, date, timeStr);
      
      slots.push({
        time: timeStr,
        price: row.walkIn, // default to walk-in price for player view
        memberPrice: row.member,
        isBooked: isBooked,
      });
      
      current += 30; // advance 30 minutes
    }
  }
  
  return slots;
}
```

**Option B: Batch pre-generate.**
A cron job or admin action generates TimeSlot records for the next 7-14 days whenever a pricing table changes. Slots are stored in the database. This is better for performance at scale but adds complexity.

**Recommendation:** Start with Option A. If performance becomes an issue (many concurrent players), switch to Option B with a generation trigger when pricing tables are saved.

### Booking check

The `isBooked` flag is determined by checking the Booking table:
- Find all bookings for this court + date that are NOT "canceled"
- Any booking slot matching the time means `isBooked = true`

This means the TimeSlot table can potentially be eliminated entirely for MVP, with slots computed from PricingTable + Booking records. But keeping TimeSlot as a materialized view is fine for query performance.

---

## Player Side: Pricing Tab

Add a third tab to the venue detail bottom sheet: **Availability** | **Pricing** | **Info**

### Pricing Tab Content

Shows the venue's pricing tables in a clean read-only format. One card per table.

```
┌─────────────────────────────────────────────────────────┐
│ Weekday                                                 │
│ Monday to Friday                                        │
│                                                         │
│              Walk-in      Member                        │
│  05:00-07:00   60k         45k                          │
│  07:00-16:00   80k         60k                          │
│  16:00-22:00   120k        90k                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Weekend & Holiday                                       │
│ Saturday, Sunday, Public holidays                       │
│                                                         │
│              Walk-in      Member                        │
│  05:00-07:00   80k         60k                          │
│  07:00-22:00   150k        110k                         │
└─────────────────────────────────────────────────────────┘
```

**Styling:**
- Table name as header (bold, 16px)
- Subtitle showing which days it applies to (secondary text)
- Rows with alternating subtle background for readability
- Prices formatted with "k" shorthand (60k, not 60,000 đ) for consistency with the rest of the app
- If venue has no member pricing, hide the Member column entirely
- If venue has no pricing tables defined, show: "Pricing not available. Contact the venue for rates." with phone number

---

## API Changes

### New Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/admin/pricing` | Get all pricing tables for the admin's venue |
| POST | `/api/admin/pricing` | Create a new pricing table |
| PUT | `/api/admin/pricing/[id]` | Update a pricing table (name, dayTypes, rows) |
| DELETE | `/api/admin/pricing/[id]` | Delete a pricing table |
| GET | `/api/admin/date-overrides` | List date overrides for the venue |
| POST | `/api/admin/date-overrides` | Add a date override |
| DELETE | `/api/admin/date-overrides/[id]` | Remove a date override |

### Modified Routes

**GET `/api/venues/[id]`** — Include `pricingTables` in the response (for the player Pricing tab). Also include `hasMemberPricing` flag.

**GET `/api/venues/[id]` with `?date=`** — When a date is provided, the slot generation uses the matching pricing table to compute prices. The response includes both `availability` (courts with generated slots) and `pricingTables` (for the Pricing tab).

### Slot generation endpoint

**GET `/api/venues/[id]/slots?date=2026-04-01`**

Returns generated slots per court for the requested date:
```json
{
  "date": "2026-04-01",
  "dayType": "weekday",
  "pricingTable": "Weekday",
  "courts": [
    {
      "courtId": "...",
      "courtName": "Court 1",
      "note": "Less sun",
      "isActive": true,
      "slots": [
        { "time": "05:00", "walkIn": 60000, "member": 45000, "isBooked": false },
        { "time": "05:30", "walkIn": 60000, "member": 45000, "isBooked": false },
        { "time": "06:00", "walkIn": 60000, "member": 45000, "isBooked": true },
        ...
      ]
    }
  ]
}
```

---

## Seed Migration

Update `prisma/seed.ts` to:

1. Parse the existing `pricing_tables` (or equivalent) from `courts.json`
2. Map the scraped data into `PricingTable` records:
   - If the source has "Regular" pricing, rename to "Member"
   - If the source has "Guest" or a single "Price" column, use as "Walk-in"
   - If only one column exists, set `hasMemberPricing: false` on the venue
3. Create appropriate `dayTypes` based on table names in the JSON (e.g. "Weekday", "Weekend", "T2-T6", "T7-CN")

### Vietnamese day name mapping (from scraped data)

| Source label | dayTypes |
|---|---|
| T2-T6, Thứ 2 - Thứ 6 | `["weekday"]` |
| T7-CN, Thứ 7 - CN | `["weekend"]` |
| T7, Thứ 7 | `["saturday"]` |
| CN, Chủ nhật | `["sunday"]` |
| Lễ, Ngày lễ | `["holiday"]` |
| Hàng ngày, Tất cả | `["weekday", "weekend"]` |

---

## Summary: What Changes Where

| Document | Change |
|---|---|
| **Admin PRD** | Replace "Court & Slot Management" section entirely with this spec. Courts are a simple list. Pricing tables replace per-slot chips. Add "Pricing" to admin nav. |
| **Player PRD** | Add "Pricing" tab to venue detail bottom sheet (3 tabs: Availability, Pricing, Info). Availability tab slot prices now come from pricing table generation, not stored per-slot. |
| **Database** | Add PricingTable model, DateOverride model, `hasMemberPricing` on Venue. TimeSlot can be kept as a cache/materialized view or generated on read. |
| **Seed** | Reverse-engineer pricing tables from courts.json scraped data. Map Vietnamese labels. |
