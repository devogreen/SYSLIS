import { useEffect, useState } from "react";
import { chargerAideGuide, GUIDE_NOM_FICHIER, lienGuide, type AideGuide } from "../../guide/guide";

// Bouton de l'en-tête (à côté du mode sombre) : télécharge le guide utilisateur en PDF.
export default function TelechargerGuideButton() {
  const [aide, setAide] = useState<AideGuide | null>(null);

  useEffect(() => {
    let actif = true;
    chargerAideGuide().then((a) => {
      if (actif) setAide(a);
    });
    return () => {
      actif = false;
    };
  }, []);

  const titre = "Télécharger le guide utilisateur (PDF)";

  return (
    <a
      href={lienGuide(aide)}
      download={GUIDE_NOM_FICHIER}
      title={titre}
      aria-label={titre}
      className="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-dark-900 h-11 w-11 hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
    >
      {/* livre + flèche de téléchargement */}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 19.5V5a2 2 0 0 1 2-2h12v13H6a2 2 0 0 0-2 2v1.5a2 2 0 0 0 2 2h4" />
        <path d="M18 16v5" />
        <path d="m15.5 18.5 2.5 2.5 2.5-2.5" />
        <path d="M8 7h6" />
        <path d="M8 10.5h4" />
      </svg>
    </a>
  );
}
