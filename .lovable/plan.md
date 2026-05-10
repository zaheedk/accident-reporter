## Fleet Manager Feature

Mirror the Family feature with a Fleet/Driver model. Fleet managers invite drivers, assign specific vehicles to them, and drivers only see their assigned fleet vehicles plus their own personal vehicles.

### Data model (new tables)

- **`fleets`** — fleet org owned by a manager
  - `manager_user_id`, `name`
- **`fleet_members`** — drivers belonging to a fleet
  - `fleet_id`, `user_id`, `role` (`manager` | `driver`), `joined_at`
  - Unique on `user_id` (a user belongs to at most one fleet, like family)
- **`fleet_invites`** — invite codes/emails, mirrors `family_invites`
  - `fleet_id`, `code`, `email`, `invited_by`, `status`, `expires_at`
- **`fleet_vehicle_assignments`** — which vehicle is assigned to which driver
  - `fleet_id`, `vehicle_id`, `driver_user_id`, `assigned_at`
  - Unique on `vehicle_id` (a fleet vehicle is assigned to one driver at a time; null driver = unassigned pool)

Vehicles themselves stay in `vehicles`. A vehicle is a "fleet vehicle" when its `user_id` belongs to a fleet manager AND it has a row in `fleet_vehicle_assignments`. Drivers' personal vehicles continue to use existing ownership.

### RLS / security helpers

New SECURITY DEFINER functions:
- `user_fleet_id(_user_id)` — returns the fleet a user belongs to (manager or driver)
- `is_fleet_manager(_fleet_id, _user_id)`
- `driver_can_see_vehicle(_user_id, _vehicle_id)` — true if vehicle is assigned to that driver in their fleet
- Extend `can_access_user_data` is NOT changed (keeps family logic clean). Vehicle visibility for drivers handled via a new policy.

Updated `vehicles` SELECT policy: existing family policy stays, plus a new policy "Drivers can view assigned fleet vehicles" using `driver_can_see_vehicle`. Same for related tables (`claims`, `claim_photos`, `notifications`) when the claim's `vehicle_id` is an assigned fleet vehicle — scoped to driver's assigned vehicles only.

Managers can SELECT all vehicles owned by themselves (already covered by `auth.uid() = user_id`).

### Edge function

`fleet-invite` — mirrors `family-invite`: create invite, accept invite by code, list pending. Sends email via Resend with the invite link `/fleet?code=...`.

### Frontend

- New page **`/fleet`** (`src/pages/Fleet.tsx`) — manager dashboard:
  - Fleet name, list of drivers, pending invites, invite by email button
  - Vehicle assignment UI: list of fleet vehicles with a dropdown to assign/unassign drivers
  - Driver view: shows their fleet name, manager contact, assigned vehicles list (read-only)
- Add `/fleet` route to `App.tsx` (protected)
- Add **Fleet** entry to `AppLayout` menu (icon: `Briefcase` or `Truck`)
- `VehicleList`: when the user is a driver, surface a section "Assigned fleet vehicles" alongside "My vehicles". When manager, badge fleet vehicles with assignment status.
- Auto-accept pending fleet invite from `localStorage` after auth (mirror family pattern).

### Out of scope (this iteration)

- Fleet billing
- Fleet-level reporting / aggregated dashboards
- Cross-fleet vehicle transfers
- Driver hour logging

### Order of operations

1. Migration (tables, helpers, RLS, triggers)
2. Edge function `fleet-invite`
3. `Fleet.tsx` page + route + nav entry
4. VehicleList tweaks for drivers
5. Memory note for the new feature
