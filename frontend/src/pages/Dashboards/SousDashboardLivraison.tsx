// @ts-ignore
import React, { useState, useEffect } from 'react';
import DatePicker from '../../components/form/date-picker';
import {
  startOfWeek, endOfWeek, format, getWeek
} from 'date-fns';
import { fr } from 'date-fns/locale';

// @ts-ignore
import urlBase from '../../backend/const.js'

type DateValue = string | Date | Date[];

interface Livraison {
  id_livraison: number;
  date_livraison: string;
  qte_totale_livraison: number;
  statut_livraison: string;
  nom_livreur?: string;
  type_livraison_commerciale: {
    nom_type_livraison: string;
  };
  validations?: Array<{
    etat_validation: string;
  }>;
}

interface Stats {
  attente: number;
  livrees: number;
  returns: number;
}

interface HierarchyNode {
  count: number;
  /** Somme des quantités TPE livrées (statut_livraison === 'livre') */
  tpeLivrees?: number;
  months?: Record<string, HierarchyNode>;
  weeks?: Record<string, HierarchyNode>;
  days?: Record<string, Livraison[]>;
}


export default function SousDashboardLivraison() {
  const getFormattedDate = (date: Date) => format(date, 'yyyy-MM-dd');

  // Par défaut : afficher toutes les données depuis le début (valeur minimale)
  const [startDate, setStartDate] = useState<Date>(new Date('2000-01-01'));
  const [endDate, setEndDate] = useState<Date>(endOfWeek(new Date(), { weekStartsOn: 1 }));

  const [stats, setStats] = useState<Stats>({
    attente: 0,
    livrees: 0,
    returns: 0,
  });

  // @ts-ignore
  const [weeklyData, setWeeklyData] = useState<Record<string, Livraison[]>>({});
  // @ts-ignore
  const [typesData, setTypesData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [hierarchyOpen, setHierarchyOpen] = useState<Record<string, boolean>>({});
  const [livraisonsHierarchy, setLivraisonsHierarchy] = useState<Record<string, HierarchyNode>>({});

  const handleStartDateChange = (value: DateValue) => {
    if (Array.isArray(value)) {
      setStartDate(new Date(value[0]));
    } else if (value) {
      setStartDate(new Date(value));
    }
  };

  const handleEndDateChange = (value: DateValue) => {
    if (Array.isArray(value)) {
      setEndDate(new Date(value[0]));
    } else if (value) {
      setEndDate(new Date(value));
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  // Toggle hierarchy level
  const toggleHierarchy = (key: string) => {
    setHierarchyOpen(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // @ts-ignore
        const formattedStartDate = getFormattedDate(startDate);
        // @ts-ignore
        const formattedEndDate = getFormattedDate(endDate);

        // Livraisons pour tableau
        const livraisonsResponse = await fetch(`${urlBase}/api/delivery/getAllLivraisons`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (livraisonsResponse.ok) {
          const allLivraisons: Livraison[] = await livraisonsResponse.json();

          const filteredLivraisons = allLivraisons.filter((l: Livraison) => {
            const dateLivraison = new Date(l.date_livraison);
            return dateLivraison >= startDate && dateLivraison <= endDate;
          });

          // Compute stats from filtered data
          const computedStats = {
            attente: filteredLivraisons.filter(l => l.statut_livraison === 'en_cours' || l.statut_livraison === 'en_attente').length,
            livrees: filteredLivraisons.filter(l => l.statut_livraison === 'livre').length,
            returns: filteredLivraisons.filter(l => l.validations && l.validations.some(v => v.etat_validation === 'retourne')).length,
          };
          setStats(computedStats);

          // DEBUG: Log sample data structure for type_livraison_commerciale issue
          if (filteredLivraisons.length > 0) {
            console.log('Sample Livraison data:', filteredLivraisons[0]);
            console.log('All available fields:', Object.keys(filteredLivraisons[0]));
            console.log('type_livraison_commerciale:', filteredLivraisons[0].type_livraison_commerciale);
          }


          // Group by hierarchy: year > month > week > day (TS ERROR FIXED)
          const hierarchy: Record<string, HierarchyNode> = {};
          filteredLivraisons.forEach((livraison) => {
            const date = new Date(livraison.date_livraison);
            const yearKey = format(date, 'yyyy');
            const monthKey = format(date, 'MM-yyyy');
            const weekKey = `W${getWeek(date, { weekStartsOn: 1 })}`;
            const dayKey = format(date, 'dd-MM');

            if (!hierarchy[yearKey]) {
              hierarchy[yearKey] = { count: 0, tpeLivrees: 0, months: {} };
            }
            hierarchy[yearKey].count += 1;

            if (!hierarchy[yearKey].months![monthKey]) {
              hierarchy[yearKey].months![monthKey] = { count: 0, tpeLivrees: 0, weeks: {} };
            }
            hierarchy[yearKey].months![monthKey].count += 1;


            const qte = livraison.qte_totale_livraison || 0;
            if (livraison.statut_livraison === 'livre') {
              hierarchy[yearKey].tpeLivrees = (hierarchy[yearKey].tpeLivrees || 0) + qte;
              hierarchy[yearKey].months![monthKey].tpeLivrees = (hierarchy[yearKey].months![monthKey].tpeLivrees || 0) + qte;
              // Quantité TPE livrée au niveau année/mois
              // (le bloc week calcule via .count pour éviter l'accès à un nœud non initialisé)
              
            }


            if (!hierarchy[yearKey].months![monthKey].weeks![weekKey]) {
              hierarchy[yearKey].months![monthKey].weeks![weekKey] = { count: 0, days: {}, tpeLivrees: 0 };
            }
            hierarchy[yearKey].months![monthKey].weeks![weekKey].count += 1;
            // Quantité TPE livrée au niveau semaine
            if (livraison.statut_livraison === 'livre') {
              hierarchy[yearKey].months![monthKey].weeks![weekKey].tpeLivrees =
                (hierarchy[yearKey].months![monthKey].weeks![weekKey].tpeLivrees || 0) + qte;
            }

            if (!hierarchy[yearKey].months![monthKey].weeks![weekKey].days![dayKey]) {
              hierarchy[yearKey].months![monthKey].weeks![weekKey].days![dayKey] = [];
            }
            hierarchy[yearKey].months![monthKey].weeks![weekKey].days![dayKey].push(livraison);
          });

          setLivraisonsHierarchy(hierarchy);
          setWeeklyData({});
        }
      } catch (error) {
        console.error('Erreur dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Dashboard Livraisons TPE</h1>

      {/* Date Picker */}
      <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
        <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-800">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Filtrer la période
        </h3>
        <div className="flex flex-wrap gap-4 justify-center items-end">
          <DatePicker
            id="date-debut"
            label="Date début"
            onChange={handleStartDateChange}
          />
          <DatePicker
            id="date-fin"
            label="Date fin"
            onChange={handleEndDateChange}
          />
          <button
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium whitespace-nowrap"
            onClick={handleRefresh}
          >
            🔄 Actualiser
          </button>
        </div>
        {loading && (
          <p className="text-center mt-4 text-blue-600 animate-pulse">Chargement des données...</p>
        )}
      </div>

      {/* Stats Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="group p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 border-l-4 border-yellow-400 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-700 opacity-80">En attente</p>
              <p className="text-4xl font-bold text-yellow-600">{stats.attente}</p>
            </div>
            <div className="p-3 bg-yellow-200 rounded-full">
              <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="group p-6 bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-400 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700 opacity-80">Livrées</p>
              <p className="text-4xl font-bold text-green-600">{stats.livrees}</p>
            </div>
            <div className="p-3 bg-green-200 rounded-full">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="group p-6 bg-gradient-to-br from-red-50 to-red-100 border-l-4 border-red-400 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-700 opacity-80">Retours</p>
              <p className="text-4xl font-bold text-red-600">{stats.returns}</p>
            </div>
            <div className="p-3 bg-red-200 rounded-full">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Hierarchical Livraisons View: Year > Month > Week > Day (FULLY FIXED) */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          📋 Hiérarchie Livraisons
          <span className="text-sm font-normal text-gray-500">(Année → Mois → Semaine → Jour)</span>
        </h3>
        <div className="space-y-2 max-h-[70vh] overflow-y-auto">
          {Object.entries(livraisonsHierarchy).length > 0 ? (
            Object.entries(livraisonsHierarchy)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([yearKey, yearData]) => (
                <div key={yearKey} className="border-l-4 border-blue-400 pl-4">
                  <button
                    className="w-full text-left p-4 hover:bg-gray-50 rounded-lg transition-all flex justify-between items-center cursor-pointer border-0 bg-transparent"
                    onClick={() => toggleHierarchy(`year-${yearKey}`)}
                  >
                    <span className="font-semibold text-lg">{yearKey}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-blue-600">{yearData.tpeLivrees || 0} TPE livrées</span>
                      <span className={`w-5 h-5 flex items-center justify-center rounded-full text-white text-xs font-bold
                                ${hierarchyOpen[`year-${yearKey}`] ? 'bg-red-500' : 'bg-green-500'}`}>
                        {hierarchyOpen[`year-${yearKey}`] ? '-' : '+'}
                      </span>
                    </div>
                  </button>
                  {hierarchyOpen[`year-${yearKey}`] && (
                    <div className="ml-4 mt-2 space-y-1">
                      {Object.entries(yearData.months || {}).map(([monthKey, monthData]) => {
                        const [monthNum, monthYear] = monthKey.split('-');
                        const monthName = format(new Date(parseInt(monthYear), parseInt(monthNum) - 1, 1), 'MMM yyyy', { locale: fr });
                        return (
                          <div key={monthKey} className="border-l-2 border-blue-300 pl-3">
                            <button
                              className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-all flex justify-between items-center text-sm cursor-pointer border-0 bg-transparent"
                              onClick={() => toggleHierarchy(`month-${yearKey}-${monthKey}`)}
                            >
                              <span>{monthName}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{monthData.tpeLivrees || 0} TPE</span>
                                <span className={`w-4 h-4 flex items-center justify-center rounded-full text-white text-[10px] font-bold
                                    ${hierarchyOpen[`month-${yearKey}-${monthKey}`] ? 'bg-red-500' : 'bg-green-500'}`}>
                                  {hierarchyOpen[`month-${yearKey}-${monthKey}`] ? '-' : '+'}
                                </span>
                              </div>
                            </button>
                            {hierarchyOpen[`month-${yearKey}-${monthKey}`] && (
                              <div className="ml-3 mt-1 space-y-1">
                                {Object.entries(monthData.weeks || {})
                                  .sort(([wa], [wb]) => parseInt(wa.replace('W', '')) - parseInt(wb.replace('W', '')))
                                  .map(([weekKey, weekData]) => (
                                    <div key={weekKey} className="border-l border-blue-200 pl-2">
                                      <button
                                        className="w-full text-left p-2 hover:bg-blue-50 rounded text-xs flex justify-between items-center cursor-pointer border-0 bg-transparent"
                                        onClick={() => toggleHierarchy(`week-${yearKey}-${monthKey}-${weekKey}`)}
                                      >
                                        <span>Semaine {weekKey}</span>
                                        <div className="flex items-center gap-1">
                                          {/* Total TPE livrées sur la semaine */}
                                          <span className="font-semibold text-blue-700">{weekData.tpeLivrees || 0} TPE </span>
                                          <span className={`w-4 h-4 flex items-center justify-center rounded-full text-white text-[10px] font-bold
                                              ${hierarchyOpen[`week-${yearKey}-${monthKey}-${weekKey}`] ? 'bg-red-500' : 'bg-green-500'}`}>
                                            {hierarchyOpen[`week-${yearKey}-${monthKey}-${weekKey}`] ? '-' : '+'}
                                          </span>
                                        </div>
                                      </button>
                                      {hierarchyOpen[`week-${yearKey}-${monthKey}-${weekKey}`] && (
                                        <div className="ml-2 mt-1 space-y-1">
                                          {Object.entries(weekData.days || {}).map(([dayKey, dayLivraisons]) => (
                                            <div key={dayKey} className="bg-white border rounded-lg p-3 shadow-sm">
                                              <div className="font-medium text-xs text-gray-700 mb-2">
                                                {dayKey.replace('-', '/')} ({dayLivraisons.length} livraison.)
                                              </div>
                                              <div className="overflow-x-auto">
                                                <table className="w-full text-xs">
                                                  <thead className="bg-gray-50">
                                                    <tr>
                                                      <th className="px-2 py-1 text-left font-semibold">ID</th>
                                                      <th className="px-2 py-1 text-left font-semibold">Type</th>
                                                      <th className="px-2 py-1 text-left font-semibold">Qté</th>
                                                      <th className="px-2 py-1 text-left font-semibold">Nom livreur</th>
                                                      <th className="px-2 py-1 text-left font-semibold">Statut</th>
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    {dayLivraisons.map((livraison) => (
                                                      <tr key={livraison.id_livraison} className="border-b hover:bg-gray-50">
                                                        <td className="px-2 py-1 font-mono text-xs">#{livraison.id_livraison}</td>
                                                        <td className="px-2 py-1 text-xs">{livraison.type_livraison_commerciale.nom_type_livraison}</td>
                                                        <td className="px-2 py-1 font-semibold text-xs">{livraison.qte_totale_livraison}</td>
                                                        <td className="px-2 py-1 font-semibold text-xs">{livraison.nom_livreur}</td>
                                                        <td className="px-2 py-1">
                                                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${livraison.statut_livraison === 'livre' ? 'bg-green-100 text-green-800' :
                                                            livraison.statut_livraison === 'en_cours' || livraison.statut_livraison === 'en_attente' ? 'bg-yellow-100 text-yellow-800' :
                                                              'bg-gray-100 text-gray-800'
                                                            }`}>
                                                            {livraison.statut_livraison}
                                                          </span>
                                                        </td>
                                                      </tr>
                                                    ))}
                                                  </tbody>
                                                </table>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
          ) : (
            <div className="p-12 text-center text-gray-500">
              📊 Aucune livraison pour cette période
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

