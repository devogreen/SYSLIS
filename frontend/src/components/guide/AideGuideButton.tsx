import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { chargerAideGuide, lienGuide, pagePourChemin, type AideGuide } from "../../guide/guide";

interface Props {
  className?: string;
}

// Bouton « ? » : ouvre le guide utilisateur (nouvel onglet) à la section qui décrit l'écran affiché.
// Écran non référencé dans le guide : ouvre le sommaire.
export default function AideGuideButton({ className = "" }: Props) {
  const { pathname } = useLocation();
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

  const page = pagePourChemin(aide, pathname) ?? aide?.sommaire ?? null;
  const titre = "Aide : ouvrir le guide utilisateur sur cet écran";

  return (
    <a
      href={lienGuide(aide, page)}
      target="_blank"
      rel="noopener noreferrer"
      title={titre}
      aria-label={titre}
      className={`inline-flex shrink-0 items-center justify-center w-6 h-6 rounded-full border border-gray-300 bg-white text-xs font-bold leading-none text-gray-500 no-underline transition-colors hover:border-brand-500 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-brand-400 dark:hover:text-brand-400 ${className}`}
    >
      ?
    </a>
  );
}
