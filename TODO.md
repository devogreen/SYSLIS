# TODO - Tableau des impressions QR hebdomadaire

- [ ] Mettre à jour le mapping `getDataImpressionQr` côté frontend (`SousDashboardQRcode.tsx`) pour utiliser `total_demandes` et `total_imprime` renvoyés par le backend.
- [ ] Calculer `numero` et `imprimes` correctement pour Orange/MTN/MOOV.
- [ ] Remplacer le champ `pourcentage` par : `Math.round((total_imprime/total_genere)*100)` (ou garder arrondi au besoin).
- [ ] Mettre à jour le footer total si nécessaire.

