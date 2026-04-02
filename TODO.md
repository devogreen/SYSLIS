# New Task: Create Remplacement Dashboard

## Current Task Plan:
**File**: `frontend/src/pages/Dashboards/SousDashboardRemplacement.tsx`

**Backend APIs** (deliveryController.js):
- `GET /api/delivery/getAllRemplacements` → all + validation_remplacement
- `GET /api/delivery/getOneRemplacement/:id`
- Prisma: `remplacements` (quantite, details_remplacement JSON, statut, date_remplacement, validation_remplacement[])

**Dashboard Features**:
1. **Date picker** (filter `date_remplacement`)
2. **Stats cards**: Total, en_attente, livre, retourne/refuse
3. **Recent table**: ID, Old/New Model, Quantite, Statut, Date, Livreur
4. **Expandable hierarchy** (Year/Month/Week if data volume high)
5. **TS interfaces** + error handling

**Step Status**:
- [ ] Step 1: Update TODO.md (current)
- [ ] Step 2: Create complete dashboard component
- [ ] Step 3: Test API integration + filtering
- [ ] Step 4: VSCode validation

## Previous Tasks ✅:
**Livraison Dashboard**: monthKey fixed, hierarchy working, debug logs added
**QR Dashboard**: All TS errors resolved (reduce, mapping, types)

**Test**: Refresh Remplacement page after creation → `http://localhost:5500/api/delivery/getAllRemplacements`

