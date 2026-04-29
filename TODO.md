# TODO - Dashboard QR Code : Afficher toutes les données par défaut

## Plan de modifications

- [x] 1. Analyser le problème : `startDate`/`endDate` initialisés à la semaine courante → filtre appliqué dès le chargement
- [x] 2. Lire les fichiers concernés (`SousDashboardQRcode.tsx`, `statsController.js`, `date-picker.tsx`)
- [x] 3. Modifier `SousDashboardQRcode.tsx` :
  - Changer `startDate`/`endDate` en `Date | null` initialisés à `null`
  - Adapter `getFormattedDate` pour gérer `null`
  - Adapter les handlers de changement de date pour le cas vide
  - Modifier `fetchData` pour ne pas passer les query params si dates `null`
  - Ajouter un bouton "Réinitialiser / Toutes les périodes"
  - Corriger la grille `xl:grid-cols-5` → `xl:grid-cols-6` (6 cartes)
- [x] 4. Tester le comportement par défaut (toutes les données affichées)
- [x] 5. Tester le filtre par date (fonctionnement normal)

## Notes
- Le backend (`statsController.js`) gère déjà l'absence de `startDate`/`endDate` → requête sans filtre temporel
- Aucune modification backend nécessaire

