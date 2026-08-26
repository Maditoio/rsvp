# Interactive Floor Plan & QR Indoor Navigation (Bizcon RSVP)

## Objective

Give summit attendees a simple way to find rooms, facilities, and meetings on a venue map — and let organisers publish that map without learning CAD.

**Positioning model:** QR checkpoints set the attendee’s last known location. There is no indoor GPS, beacons, or live tracking in this product.

**Architecture:** two layers — a visual floor plan (image + POIs) and an optional navigation graph (nodes/paths) used only when walking directions are enabled.

---

## Product principles (Bizcon)

1. **Upload-first** — organisers bring a PNG/JPG/WebP from the venue. Freehand “draw a building” is deferred.
2. **Manual authoring is the default** — place/edit POIs and generate QRs by hand remains a first-class, always-available flow. It must not be removed or blocked when AI tools ship.
3. **AI assist is platform-gated (per organisation)** — auto-detect / plot / name from image (+ optional stand list) is enabled only when a platform admin turns on `Organisation.venueAiFloorPlanEnabled`. No paid/Pro tiers in MVP; never require AI.
4. **Link, don’t duplicate** — POIs can attach to existing `MeetingRoom` and `Session` records.
5. **Attendee job-to-be-done** — Map lives in `/me` with a mobile bottom sheet (search, route, ETA), not a dense GIS UI.
6. **Organiser wizard** — guided checklist; one job per step. Aurora patterns (lists on page, drawers for edit).
7. **Token security** — floor QR tokens are opaque + hashed (same pattern as invitations / desk QR / badges). Venue QR ≠ desk check-in ≠ badge credential.
8. **Publish gate** — draft maps are invisible to attendees until published.
9. **Tenant scope** — every row is `organisationId` + `eventId`. Attendees only see published maps for events they may access.
10. **Ship value early** — map + POIs + QR + deep links before full Dijkstra routing.

---

## Authoring modes

Both modes write the same `MapPoi` / `MapCheckpoint` records. Attendee experience is identical.

### Mode 1 — Manual (default, all plans)

Always available. Current MVP flow:

1. Upload floor plan image  
2. Place POIs on the map (click / move / edit)  
3. Link rooms / sessions where relevant  
4. **Select** which locations get QR checkpoints (not necessarily every stand)  
5. Preview → Publish  

Organisers who prefer full control or smaller venues use only this path.

### Mode 2 — AI assist (platform-gated, per organisation)

Optional for large halls (e.g. 300 stands). Shown only when `Organisation.venueAiFloorPlanEnabled` is true (set on `/platform` by a platform admin). Default **off**.

1. Upload labeled floor plan image (stand numbers, toilets, café, coffee, etc.)  
2. Optionally upload a details document (CSV/Excel/PDF) with stand codes + names — **no x,y required from humans**  
3. AI proposes POIs (names + normalized positions)  
4. Organiser reviews / corrects a short list of mismatches  
5. Organiser **selects** which proposed (or existing) locations get QRs  
6. Preview → Publish  

**Rules:**

- AI never auto-publishes; review is required  
- AI never forces QR generation for every POI — selection stays explicit  
- After AI propose, the map editor falls back to **Mode 1** tools for fixes  
- Flag off: venue UI shows Manual only (no AI entry points)  
- MVP has no billing tiers — enablement is operational (platform admin), not self-serve Pro

---

## Out of scope (MVP)

- Freehand wall/room CAD editor
- Multi-floor routing UI (schema may reserve `floorIndex` / connectors)
- Bluetooth / Wi-Fi / UWB positioning
- Real-time attendee tracking on the map
- Full exhibitor CRM (free-text stand POIs are enough)
- AI floor detect / OCR / stand auto-plot pipeline (Phase G; gate UI may ship first)

---

## Layers

### Layer A — Visual

- Background image (Blob storage)
- Points of interest (normalized coordinates)
- Labels / category icons

### Layer B — Navigation graph (Phase D+)

- Nodes and walkable edges
- Distances from calibration (override allowed)
- Source of truth for route calculation — never “draw a line through walls” from the image alone

---

## Coordinate system

Store positions as normalized coordinates `x,y ∈ [0,1]` relative to the floor image (0 = left/top, 1 = right/bottom). Do not persist pixel positions as the source of truth.

---

## Calibration

Organiser picks two points and enters a real-world distance (metres or feet). Scale is stored and used for:

- Display distances
- Auto edge lengths when the graph exists
- Walking-time estimates (default 1.2 m/s, event-overridable later)

Recalibration must not wipe POIs.

---

## Points of interest

Categories (MVP set):

Entrance · Exit · Registration · Main stage · Session room · Meeting room · Toilet · Accessible toilet · Coffee · Food · Networking · VIP · Exhibition · Exhibitor stand · First aid · Prayer room · Parking · Lift · Stairs · Information · Cloakroom

Each POI:

- `name`, optional `description`
- `category`
- normalized `x`, `y`
- optional `meetingRoomId`, `sessionId`
- optional `connectedNodeId` (when graph exists)

---

## QR checkpoints

- Opaque token in the QR payload (URL like `/v/[token]`)
- Store `tokenHash` only; allow disable/revoke
- Bound to event + floor plan + node and/or POI
- On scan: validate → set attendee last-known location → open event map

Printed venue QRs are **not** desk check-in or badge credentials.

---

## Organiser experience

**Route:** `/app/[orgSlug]/events/[eventId]/venue`

### Wizard checklist (Manual — default)

1. Upload floor plan image  
2. Calibrate scale (optional for pin-only MVP; required for distances/routes)  
3. Add points of interest (templates + place on map)  
4. Link meeting rooms / sessions where relevant  
5. Select locations → generate & print QR checkpoints  
6. Preview as attendee → **Publish**

### Wizard checklist (AI — when org flag enabled)

1. Upload floor plan image  
2. Optional: upload stand / facility details document (no coordinates)  
3. Run AI propose → review matches  
4. Continue with Manual tools for edits  
5. Select locations → generate & print QR checkpoints  
6. Preview → **Publish**

### Editor tools (MVP)

Select · Pan · Zoom · Add POI · Move POI · Add QR · Delete · Save · Preview · Publish  

**Deferred:** Add Node · Connect Nodes · Draw Wall · Measure as primary workflow.  
**When `venueAiFloorPlanEnabled`:** Detect stands · Import stand list · Review AI proposals (detect pipeline may ship after the gate UI).

---

## Attendee experience

**Route:** `/me/events/[eventId]/map`  
**Public scan entry:** `/v/[token]` → auth if needed → map with location set

### Entry points

1. Event nav **Map**
2. Agenda / meeting **Navigate** (destination preselected)
3. Scan floor QR (“You are here”)

### Mobile UX

- Full-bleed map with pan/zoom
- Bottom sheet: search, nearest facilities, route summary (distance / ETA when graph exists)
- Stale location: “Last seen at Registration · 12 min ago — scan a nearby QR to update”
- No location: “Scan a floor QR or pick a starting point”

---

## Event integrations

| Source | Action |
|---|---|
| Agenda session with linked POI / room | **Navigate** → map with destination |
| Meeting with `MeetingRoom` linked to POI | **Navigate** → map |
| Exhibitor / stand POI | **Find on map** |

---

## Routing (Phase D+)

- Dijkstra (or A*) on the navigation graph
- Prefer accessible edges when requested (later)
- Return nodes, edges, `totalDistanceMeters`, `estimatedWalkingSeconds`
- Recompute when attendee scans a new checkpoint

**Before graph exists:** show destination pin + “You are here”; optional straight-line hint is **not** a walking route — label honestly (“Directions available when the organiser enables walking paths”).

---

## Multi-floor (design only)

Schema may include `floorIndex` and inter-floor connectors (stairs / lift). Do not block MVP on multi-floor UI.

---

## Data model (logical)

```
Organisation → Event → VenueFloorPlan
                 ├── calibration JSON
                 ├── imageUrl
                 ├── publishedAt
                 ├── MapPoi[]
                 ├── NavNode[] / NavEdge[]   (later)
                 └── MapCheckpoint[]        (tokenHash)
```

Attendee location (ephemeral or stored): last checkpoint / POI / node + `updatedAt`.

---

## Security

- Validate image type/size; authenticated organiser uploads (Vercel Blob)
- Organiser routes: event permission (settings / venue write)
- Attendee: published map only; registered/confirmed (or event access policy consistent with `/me`)
- QR: secure random token, hash at rest, disable flag, event-bound
- Rate-limit public `/v/[token]` scans
- Audit: publish, checkpoint create/disable

---

## Implementation phases (ship order)

### Phase A — Map + POIs (this release core)

- Upload floor plan (Blob)
- Organiser place/edit POIs (normalized coords)
- Attendee view published map, pan/zoom, search POIs
- Draft vs published

### Phase B — QR checkpoints

- Generate checkpoint QRs (print sheet)
- `/v/[token]` sets last known location
- “You are here” on map

### Phase C — Deep links

- Link POI ↔ MeetingRoom / Session
- Navigate from agenda + meetings

### Phase D — Walking graph

- Calibration UI
- Nodes / paths editor
- Shortest path + ETA on attendee map

### Phase E — Find nearest

- Nearest toilet / coffee / exit by graph distance

### Phase F — Later

- Multi-floor UI
- Accessibility routing preferences
- Advanced trace/draw tools

### Phase G — AI floor assist (platform-gated)

- `Organisation.venueAiFloorPlanEnabled` (default false); toggle on `/platform` by platform admin
- Venue AI UI hidden unless flag is on; Manual Mode 1 always available
- Image detect + OCR for stand numbers and facility labels
- Optional details-document import (stand_code, name, hall — no x,y)
- Propose → review UI; then same Manual editor + selective QR
- No paid/Pro tiers required for this gate in MVP

---

## Success criteria (MVP A–C)

- Organiser can upload a plan, drop Registration + rooms, publish, print entrance QRs (**Manual path**)
- Attendee opens Map, sees POIs, scans QR, sees “You are here”
- Attendee taps Navigate from a meeting/session and lands on the map with destination selected
- No CAD required; no indoor GPS; tokens hashed; tenant-scoped
- Platform admin can enable/disable AI floor assist per organisation; AI UI stays hidden when off

---

## Important

The floor image is a visual reference. The navigation graph (when present) is the source of truth for walkable routes. QR checkpoints provide last-known physical location so future positioning tech can update the same “current node” without changing routing.
