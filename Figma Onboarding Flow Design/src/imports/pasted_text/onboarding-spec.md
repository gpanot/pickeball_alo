**ONBOARDING SPECIFICATION - FIGMA MAKE**

**CourtMap**

3-Slide Onboarding Flow

_Version 2.0 - English first. Translation-ready for Vietnamese, Thai, Malay._

# **Overview**

Three slides shown to every new user on first launch. Goal: earn trust and create urgency - not explain features. Each slide has one job. After slide 3 the user proceeds to signup.

The role selector (Player / Coach) lives on the signup screen, not here. Onboarding is for convincing, not collecting.

| **#** | **Job**        | **Headline**                              | **Tone**                      |
| ----- | -------------- | ----------------------------------------- | ----------------------------- |
| 1     | Name the pain  | Find your coach. No group chats required. | Validating - 'we get it'      |
| 2     | Build trust    | Ratings you can actually trust.           | Reassuring - 'we protect you' |
| 3     | Create urgency | The best coaches fill up fast.            | FOMO - 'don't miss your slot' |

Global design rules - apply to all 3 slides:

- Dark background #0A0A0A - app chrome from the first pixel
- Illustration area: top 55% of screen. Text + CTA: bottom 45%.
- One primary CTA per slide - accent #B8F200, black text, 14px radius, 52px height, full width
- 'Skip' text link on slides 1 and 2 - jumps to slide 3 directly
- Slide 3 has no Skip - it is the destination, forward only
- Progress dots: 3 dots row. Active = accent #B8F200 wide pill 20px. Inactive = #333 circle 6px.
- Back text link on slides 2 and 3
- All photos: real photography, not avatars or illustrations. Southeast Asian subjects. Action shots preferred over posed.

# **Photo Direction - All Slides**

This is the most important production decision. Every photo must feel like a real person in a real place, not a stock photo from a US fitness brand. The visual language should be warm, local, and genuine.

## **General rules**

- Use real photography - no avatars, no illustrated characters, no AI-generated faces
- All subjects should read as Southeast Asian - Vietnamese, Thai, or Malaysian players and coaches
- Pickleball context is mandatory - court surface, paddle, ball, or net must be visible in at least 2 of the 3 slides
- Lighting: natural outdoor light or indoor court lighting. No studio white backgrounds.
- Mood: active, candid, community feel. Not overly posed or corporate.
- All photos must be dark-mode compatible - the app background is #0A0A0A so photos must either have a natural dark background or be placed in a darkened container card

## **Photo sourcing options**

- Option A (preferred): Commission a local photographer at a HCMC pickleball venue for a 2-hour shoot. Cost: ~2-3M VND. Output: 30-50 usable photos for onboarding, coach profiles, and marketing.
- Option B: Use Unsplash / Pexels with search terms 'pickleball Asia', 'pickleball Vietnam', 'pickleball coach outdoor'. Filter for non-posed, natural light shots.
- Option C for Figma Make prototyping only: use placeholder URLs from Unsplash Source API (<https://source.unsplash.com/featured/?pickleball>) - replace with real photos before launch.

_For Figma Make: insert real photo URLs directly into the image components. Do not use grey placeholder boxes - they kill the premium feel that the design is trying to create._

# **Slide 1 - Find your coach. No group chats required.**

Job: name the universal pain. Every pickleball player in Vietnam, Thailand, and Malaysia finds coaches the same way - word of mouth and group chats. This slide makes them feel understood immediately.

## **Copy**

**TAG LINE (UPPERCASE, ACCENT #B8F200, 10PX, LETTER-SPACING 2PX)**

**COURTMAP**

**HEADLINE (22PX, BOLD, WHITE #F0F0F0, LINE HEIGHT 1.25)**

**Find your coach.**

**No group chats required.**

**SUBTEXT (13PX, #888888, LINE HEIGHT 1.6)**

Stop asking around. Every verified pickleball coach near you - with real ratings from real players.

**PRIMARY CTA**

**Next**

**SECONDARY LINK (12PX, #555555)**

Skip

## **Illustration concept**

A real photo of a pickleball group in action - 3 or 4 people on a court, mid-rally or mid-conversation between points. The energy should be social and fun. Overlaid on the bottom half of the photo is a semi-transparent dark card showing a generic group chat UI with an unanswered question.

**PHOTO SPEC**

_Real photo: group of Southeast Asian players on a pickleball court. Outdoor or indoor court surface visible. Candid shot - mid-game or between points. Aspect ratio: 16:9 or 3:2. Minimum width: 800px. Dark edges preferred so it blends into #0A0A0A background._

**CHAT OVERLAY CARD (ON TOP OF PHOTO, BOTTOM HALF)**

- Dark card: bgCard #161616, 12px radius, 80% opacity, placed over the lower 40% of the photo
- Chat header: generic group name e.g. 'Pickleball Players' with a group icon
- Message bubbles: one outgoing message 'Anyone know a good coach near here?' in muted green
- Below it: a timestamp '3 hours ago' and status 'No replies yet' in textMuted
- A second outgoing bubble: 'Really need a coach...' with a trailing question mark
- No app branding on the chat UI - keep it generic so it works for all markets

_This overlay does not need to look exactly like any real app. It just needs to communicate 'unanswered group chat question' clearly._

## **Translation table**

| **Language** | **Headline**                              | **Subtext**                                                                                         |
| ------------ | ----------------------------------------- | --------------------------------------------------------------------------------------------------- |
| English      | Find your coach. No group chats required. | Stop asking around. Every verified pickleball coach near you - with real ratings from real players. |
| Vietnamese   | \[Translation TBD\]                       | \[Translation TBD\]                                                                                 |
| Thai         | \[Translation TBD\]                       | \[Translation TBD\]                                                                                 |
| Malay        | \[Translation TBD\]                       | \[Translation TBD\]                                                                                 |

# **Slide 2 - Ratings you can actually trust.**

Job: address the trust problem before the player even asks. Fake reviews and bought ratings are common across Southeast Asia. This slide shows the mechanism - real photos, real sessions, real scores - without explaining it in text.

## **Copy**

**TAG LINE**

**TRUST**

**HEADLINE**

**Ratings you can actually trust.**

**SUBTEXT**

Every review comes from a player who completed at least 3 sessions. No fake stars. No bought reviews. Just honest feedback.

**TRUST NOTE BELOW ILLUSTRATION (11PX, #555555)**

Reviews unlock only after 3 real completed sessions.

**PRIMARY CTA**

**Next**

**SECONDARY LINK**

Back

## **Illustration concept**

A real coach profile card - the exact CourtMap design - with a real photo of a coach in the avatar position. The card shows their name, specialties, and the 4-dimension rating bars filled to realistic scores. Below the card, a small verified badge.

**COACH PHOTO SPEC - CRITICAL**

_Real photo: a Southeast Asian male or female coach holding a pickleball paddle, on or near a court. Head and shoulders shot or upper body. Natural expression - confident but approachable. Not a posed corporate headshot. The photo must feel like someone you would actually want to train with. Circular crop 64px diameter in the card. High resolution source - minimum 400x400px._

**COACH PROFILE CARD SPEC**

- Card background: #161616, 16px radius, 1px border #2A2A2A, 16px padding
- Left: circular photo 64px - real coach photo, not avatar
- Coach name: e.g. 'Coach Nguyen Van A' in text/700/15px white
- Subtitle: 'IPTPA Level 2 · 47 sessions completed' in textSec/12px
- 4 rating bars below: On time / Friendly / Professional / Recommend
- Each bar: label 10px grey left + filled accent bar + score accent bold right
- Example scores: On time 4.6 / Friendly 4.8 / Professional 4.4 / Recommend 5.0
- Below the 4 bars: verified badge - accent bg pill, checkmark icon, 'Verified · 3+ sessions confirmed'

**BELOW CARD**

- Small line with a lock icon: 'Reviews unlock after 3 completed sessions'
- Subtext: 'No fake stars possible.' in textMuted/11px

## **Translation table**

| **Language** | **Headline**                    | **Subtext**                                                                                           |
| ------------ | ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| English      | Ratings you can actually trust. | Every review comes from a player who completed at least 3 sessions. No fake stars. No bought reviews. |
| Vietnamese   | \[Translation TBD\]             | \[Translation TBD\]                                                                                   |
| Thai         | \[Translation TBD\]             | \[Translation TBD\]                                                                                   |
| Malay        | \[Translation TBD\]             | \[Translation TBD\]                                                                                   |

# **Slide 3 - The best coaches fill up fast.**

Job: create urgency. Good coaches in Southeast Asia are impossible to book in advance because there is no system. Players lose sessions to whoever messages first. This slide shows scarcity visually - a real coach's calendar mostly full, a few slots left. No skip. Forward only.

## **Copy**

**TAG LINE**

**BOOK NOW**

**HEADLINE**

**The best coaches fill up fast.**

**SUBTEXT**

Stop waiting for a reply that might not come. See real availability, book instantly, get confirmed in seconds.

**URGENCY NOTE BELOW ILLUSTRATION (11PX, ACCENT COLOUR)**

**2 slots left this week with Coach Minh**

**PRIMARY CTA**

**Get started**

**SECONDARY LINK**

Back

_No Skip on this slide. This is the last slide before signup - the CTA should be the only forward path._

## **Illustration concept**

A real coach photo as the hero - full width, upper half of the screen - with a weekly availability calendar overlaid on the lower portion. Most slots show as Booked (dark, muted). Only 2 or 3 slots are open in accent green. The scarcity is immediately visible without reading anything.

**COACH HERO PHOTO SPEC - CRITICAL**

_Real photo: a Southeast Asian coach mid-session on a pickleball court - demonstrating a shot, coaching a player, or pointing with a paddle. Action shot preferred over portrait. Wide enough to work as a full-width background (landscape or square crop). Should feel dynamic and aspirational - this is the coach you want. The photo fills the top 55% of the screen. Apply a dark gradient overlay at the bottom so the calendar card reads cleanly on top._

**COACH IDENTITY STRIP (OVERLAID ON BOTTOM OF PHOTO)**

- Small pill or name chip overlaid on the photo: coach name + overall rating e.g. '★ 4.8 Coach Nguyen Van A'
- Background: rgba(10,10,10,0.75), 20px radius, 12px padding
- Text: white #F0F0F0, 13px

**AVAILABILITY CALENDAR CARD (BELOW PHOTO OR OVERLAPPING BOTTOM OF PHOTO)**

- Card: bgCard #161616, 16px radius, 1px border, 16px padding
- Header: 'This week' label in textSec/12px + current week dates
- 7 day columns (Mon-Sun), each showing 2-3 time slot pills
- Booked slots: dark fill #222, textMuted text, 'Booked' label - majority of slots
- Available slots: accent #B8F200 fill, black text, time shown e.g. '6pm' - only 2 or 3 visible
- The ratio must feel like scarcity: at least 80% of slots shown as booked
- Below calendar: accent pill - '2 slots left this week' with a small clock icon

**URGENCY PSYCHOLOGY NOTES**

- The photo makes the coach feel real and desirable - someone worth booking
- The calendar makes the scarcity feel real and immediate - not manufactured
- The '2 slots left' pill anchors the feeling - specific is more credible than vague
- No countdown timer - that would feel manipulative. Scarcity without pressure.

## **Translation table**

| **Language** | **Headline**                   | **Subtext**                                                                                                    |
| ------------ | ------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| English      | The best coaches fill up fast. | Stop waiting for a reply that might not come. See real availability, book instantly, get confirmed in seconds. |
| Vietnamese   | \[Translation TBD\]            | \[Translation TBD\]                                                                                            |
| Thai         | \[Translation TBD\]            | \[Translation TBD\]                                                                                            |
| Malay        | \[Translation TBD\]            | \[Translation TBD\]                                                                                            |

# **Navigation and Prototype Wiring**

## **Connection map for Figma Make**

| **Trigger**       | **From** | **To**        | **Animation** |
| ----------------- | -------- | ------------- | ------------- |
| Tap 'Next'        | Slide 1  | Slide 2       | Slide left    |
| Tap 'Skip'        | Slide 1  | Slide 3       | Dissolve      |
| Tap 'Next'        | Slide 2  | Slide 3       | Slide left    |
| Tap 'Skip'        | Slide 2  | Slide 3       | Dissolve      |
| Tap 'Back'        | Slide 2  | Slide 1       | Slide right   |
| Tap 'Back'        | Slide 3  | Slide 2       | Slide right   |
| Tap 'Get started' | Slide 3  | Signup screen | Slide left    |

## **Returning users**

- Onboarding shown exactly once per device
- AsyncStorage key: '@courtmap_onboarding_complete'
- Check on app launch in root layout - if key exists, skip to home
- Force quit before completing slide 3: onboarding restarts from slide 1 on next launch

# **Implementation Notes for Cursor**

## **Component structure**

- OnboardingScreen.tsx - parent, manages slide index state, AsyncStorage write on completion
- OnboardingSlide1.tsx - group chat overlay on photo background
- OnboardingSlide2.tsx - coach profile card with real photo
- OnboardingSlide3.tsx - coach hero photo + scarcity calendar
- OnboardingDots.tsx - shared 3-dot progress indicator
- All photos loaded via Image component from assets/onboarding/ - not remote URLs in production
- SafeAreaView from react-native-safe-area-context on all screens
- No web primitives. No hardcoded colours. All tokens from lib/theme.ts.

## **Photo assets required before Cursor builds UI**

- assets/onboarding/slide1-group.jpg - group of players on court (for slide 1 background)
- assets/onboarding/slide2-coach-avatar.jpg - coach portrait, min 400x400px (for slide 2 card)
- assets/onboarding/slide3-coach-action.jpg - coach action shot, landscape (for slide 3 hero)

_Use Unsplash placeholder URLs during development. Replace with real photos before any user testing or launch. A placeholder that looks like a real person is better than a grey box - it reveals whether the design actually works._

## **i18n structure**

- All copy lives in locales/en.json - never hardcoded string literals in components
- locales/vi.json, locales/th.json, locales/ms.json - created empty, filled in later
- Use expo-localization to detect device language and load the correct file
- Fallback to English if device language has no translation file yet

_END OF DOCUMENT - CourtMap Onboarding Spec v2.0_