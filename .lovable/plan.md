

# Builder Transparency System: Deep Upgrade

## Current State Assessment

What exists today is a **basic milestone tracker** -- admin posts an update, residents react. That solves maybe 10% of the actual home-purchase anxiety. The real pain points (document chaos, payment confusion, delay silence, post-handover defects, structured Q&A) are completely unaddressed.

Here is what I recommend building, prioritized by **pain severity** and **implementation feasibility**.

---

## Phase 1: Tower-Wise Progress + Delay Intelligence (Upgrade Existing)

The current system treats the entire society as one blob. Real projects have multiple towers at different stages.

**What changes:**

- New `project_towers` table: each society can have multiple towers (e.g., Tower A, Tower B)
- Milestones become tower-scoped (add `tower_id` to `construction_milestones`)
- Add `expected_completion_date` and `revised_completion_date` to towers
- Add `delay_reason` field (mandatory when revised date exceeds expected) with categories: Weather, Material Shortage, Government Approval, Labour, Other
- Tower selector dropdown on the Progress page
- Visual "Expected vs Revised" date comparison card per tower
- Overall society progress computed as average of all towers

**Database:**
```
project_towers (id, society_id, name, total_floors, expected_completion, revised_completion, delay_reason, delay_category, current_stage, current_percentage, created_at)
```
- Modify `construction_milestones`: add nullable `tower_id` column (backward-compatible)

**UI Changes:**
- `SocietyProgressPage.tsx`: Add tower filter tabs at top
- New `TowerProgressCard.tsx`: Shows per-tower expected vs revised date with delay badge
- `AddMilestoneSheet.tsx`: Add tower selector dropdown
- `ProgressTimeline.tsx`: Render per-tower when tower selected, or aggregate when "All" selected

---

## Phase 2: Document Vault (RERA & Approvals)

Buyers need one place for all project documents instead of hunting through emails and WhatsApp.

**What changes:**

- New `project_documents` table storing metadata + file URL (files go to existing `app-images` bucket)
- Document categories: RERA Registration, Commencement Certificate, Environmental Clearance, Fire NOC, OC Status, Layout Approval, Other
- Admin uploads documents; all society members can view
- Each document shows upload date and a "verified" badge if admin marks it so
- Simple list UI grouped by category with download/preview capability

**Database:**
```
project_documents (id, society_id, tower_id nullable, category, title, description, file_url, uploaded_by, is_verified, created_at)
```
RLS: Members can SELECT; admins can INSERT/UPDATE/DELETE.

**UI:**
- New `DocumentVaultTab.tsx` component rendered as a tab on the Progress page (not a separate route -- keeps it contextual)
- Grouped accordion by document category
- Each item shows title, date, download link, verified badge

---

## Phase 3: Structured Q&A Board (Builder-Resident Communication)

Replace chaotic WhatsApp with a searchable, categorized Q&A system specific to construction/project concerns.

**What changes:**

- New `project_questions` table: residents ask, committee/builder answers
- Categories: Construction, Timeline, Payment, Legal, Amenities, General
- "Official Answer" flag -- when admin responds, it is highlighted distinctly
- Duplicate detection: before posting, show similar existing questions (simple text search)
- Questions ordered by recency; answered questions can be collapsed
- FAQ mode: admin can pin top questions

**Database:**
```
project_questions (id, society_id, asked_by, category, question_text, is_answered, is_pinned, created_at)
project_answers (id, question_id, answered_by, answer_text, is_official, created_at)
```
RLS: Society members can ask and view; admins can answer and pin.

**UI:**
- New tab "Q&A" on the Progress page
- `ProjectQATab.tsx`: List of questions with inline answers
- `AskQuestionSheet.tsx`: Form with category picker, question text, and "similar questions" preview before submit
- Official answers get a green "Builder Response" badge

---

## Phase 4: Defect & Snag Management (Post-Handover)

This reuses the existing dispute system architecture but is specifically for construction defects after possession.

**What changes:**

- New `snag_tickets` table (separate from disputes -- different lifecycle and SLA)
- Categories: Plumbing, Electrical, Civil, Painting, Carpentry, Lift, Common Area, Other
- Photo upload (reuse existing `app-images` bucket)
- Status flow: Reported > Acknowledged > Contractor Assigned > In Progress > Fixed > Verified by Resident > Closed
- SLA: 72 hours for acknowledgment, 15 days for resolution
- Resident can "verify fix" or "reopen" ticket
- Admin dashboard tab for snag management with stats

**Database:**
```
snag_tickets (id, society_id, tower_id nullable, flat_number, reported_by, category, description, photo_urls text[], status, sla_deadline, assigned_to_name, acknowledged_at, fixed_at, verified_at, created_at)
```
RLS: Reporter sees own tickets; admins see all in society.

**UI:**
- New route `/society/snags` with `SnagListPage.tsx`
- `CreateSnagSheet.tsx`: Category, description, photos, flat number auto-filled
- `SnagTicketCard.tsx`: Status badges, SLA countdown
- `SnagDetailSheet.tsx`: Timeline of status changes, resident verify/reopen buttons
- Admin tab in AdminPage for snag management

---

## Phase 5: Upgrade Trust Score Formula

The current trust score ignores all the new data. Update `calculate_society_trust_score` to incorporate:

- **Transparency** weight now includes: document uploads count + Q&A response rate + delay explanation completeness
- **Governance** weight now includes: snag resolution rate alongside dispute resolution
- New sub-score: **Builder Responsiveness** = (answered questions / total questions) * factor

Update the `refresh_all_trust_scores` function accordingly.

---

## What I Am NOT Building (And Why)

| Idea from your brief | Why not now |
|---|---|
| Per-buyer payment schedule sync | Requires individual buyer-to-unit mapping, loan data integration, and builder ERP connectivity. This is Phase 2 of a SaaS product, not an MVP feature. |
| RERA API integration | No public RERA API exists in 2026 that is reliably accessible. Document upload is the pragmatic path. |
| AI-powered FAQ auto-creation | Adds complexity without proportional value. Manual pinning by admin achieves 80% of the benefit. |
| Public-facing progress page (no auth) | Security risk for under-construction projects. Can be added later with a simple toggle. |

---

## Implementation Sequence

1. **Phase 1** - Tower-wise progress + delay intelligence (extends existing tables, highest immediate value)
2. **Phase 2** - Document vault (simple CRUD, high trust impact)
3. **Phase 3** - Structured Q&A (moderate complexity, eliminates WhatsApp chaos)
4. **Phase 4** - Snag management (reuses patterns from disputes, post-handover essential)
5. **Phase 5** - Trust score upgrade (quick SQL function update)

---

## Technical Notes

- All new tables use society-scoped RLS via `get_user_society_id()`
- File uploads use existing `app-images` storage bucket
- Tower concept is optional -- societies with single tower just have one entry; the UI gracefully hides the tower selector when only one exists
- The Progress page becomes a tabbed experience: **Timeline | Documents | Q&A** (keeping everything contextual rather than scattered across routes)
- Snags get a separate route because they serve a fundamentally different user journey (post-possession vs pre-possession)
- No new edge functions needed for Phase 1-4; all client-side with existing Supabase SDK patterns

## New Files

```text
src/components/progress/TowerProgressCard.tsx
src/components/progress/TowerSelector.tsx
src/components/progress/DocumentVaultTab.tsx
src/components/progress/AddDocumentSheet.tsx
src/components/progress/ProjectQATab.tsx
src/components/progress/AskQuestionSheet.tsx
src/pages/SnagListPage.tsx
src/components/snags/CreateSnagSheet.tsx
src/components/snags/SnagTicketCard.tsx
src/components/snags/SnagDetailSheet.tsx
src/components/admin/AdminSnagsTab.tsx
```

## Modified Files

```text
src/pages/SocietyProgressPage.tsx (tabbed layout, tower filter)
src/components/progress/AddMilestoneSheet.tsx (tower selector)
src/components/progress/ProgressTimeline.tsx (per-tower rendering)
src/pages/AdminPage.tsx (snags tab)
src/pages/ProfilePage.tsx (snags menu link)
src/App.tsx (snags route)
```

