export interface TypeLivraison {
  type: string;
  total: number;
  index: number;
}

export interface GeneralStats {
  typesLivraisons: TypeLivraison[];
  livraisons: {
    total: number;
    attente: number;
    livrees: number;
    retours: number;
  };
  demandes: Record<string, number>;
  stocks: {
    quantite_piece?: number;
    quantite_carton?: number;
    quantite_lot?: number;
  };
  qr_codes: Record<string, number>;
}

export interface LivraisonType {
  id: number;
  nom: string;
  count: number;
}

export interface DemandeStats {
  demandes: Record<string, number>;
  total: number;
  en_cours: number;
  valide: number;
  partiel: number;
  retourne: number;
  refuse: number;
}

export interface GeneralStats {
  typesLivraisons: TypeLivraison[];
  livraisons: {
    total: number;
    attente: number;
    livrees: number;
    retours: number;
  };
  demandes: Record<string, number>;
  stocks: {
    quantite_piece?: number;
    quantite_carton?: number;
    quantite_lot?: number;
  };
  qr_codes: Record<string, number>;
  livraisonsParType?: LivraisonType[];
}

