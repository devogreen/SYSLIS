# Plan: Ajout notification pour demandes validées

## Étapes à suivre:

### 1. Backend - Ajouter une route API pour récupérer les demandes validées
- [x] Modifier backend/controllers/Demande/demandeController.js pour ajouter la fonction getDemandesValidees
- [x] Modifier backend/routes/demandesRoutes.js pour ajouter la route

### 2. Frontend - Ajouter la méthode API
- [x] Modifier frontend/src/backend/demandes/Demandes.js pour ajouter getDemandesValidees()

### 3. Frontend - Modifier le composant NotificationDropdown
- [x] Modifier frontend/src/components/header/headerAdmin/NotificationDropdown.tsx pour afficher les demandes validées en plus des demandes en attente

