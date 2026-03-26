import React, { useState, useEffect } from 'react';
import DatePicker from '../../components/form/date-picker';
import { startOfWeek, endOfWeek, format, getWeek } from 'date-fns';
import { fr } from 'date-fns/locale';

type DateValue = string | Date | Date[];

interface Livraison {
  id_livraison: number;
  date_livraison: string;
  qte_totale_livraison: number;
  statut_livraison: string;
  nom_livreur?: string;
  type_livraison_commerciale?: {
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

export default function SousDashboardLivraison() {
  const getFormattedDate = (date: Date) => format(date, 'yyyy-MM-dd');

  const [startDate, setStartDate] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [endDate, setEndDate] = useState<Date>(
    endOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const [stats, setStats] = useState<Stats>({
    attente: 0,
    livrees: 0,
    returns: 0,
  });

  const [weeklyData, setWeeklyData] = useState<Record<string, Livraison[]>>({});
  const [typesData, setTypesData] = useState<Record<string, number>>({});
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const formattedStartDate = getFormattedDate(startDate);
        const formattedEndDate = getFormattedDate(endDate);

        // Stats globales
        // const statsResponse = await fetch(`http://localhost:5500/api/delivery/statsLivraisons?startDate=${formattedStartDate}&endDate=${formattedEndDate}`);
        // if (statsResponse.ok) {
        //   const statsData = await statsResponse.json();
        //   setStats(statsData);
        // }

        // Stats types
        // const typesResponse = await fetch(
        //   `http://localhost:5500/api/delivery/statsTypesLivraisons?startDate=${formattedStartDate}&endDate=${formattedEndDate}`
        // );
        // if (typesResponse.ok) {
        //   const typesStats = await typesResponse.json();
        //   setTypesData(typesStats);
        // }

        // Livraisons pour tableau
        const livraisonsResponse = await fetch('http://localhost:5500/api/delivery/getAllLivraisons');
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

          const grouped = filteredLivraisons.reduce((acc: Record<string, Livraison[]>, livraison: Livraison) => {
            const week = getWeek(new Date(livraison.date_livraison), { weekStartsOn: 1 }).toString();
            if (!acc[week]) {
              acc[week] = [];
            }
            acc[week].push(livraison);
            return acc;
          }, {});

          setWeeklyData(grouped);
        }
      } catch (error) {
        console.error('Erreur dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  const toggleWeekDetails = (week: string) => {
    setSelectedWeek(selectedWeek === week ? null : week);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Dashboard Livraisons</h1>

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

      {/* Cards Types Livraisons */}
      {/* <div className="mb-8">
        <h3 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
          📦 Livraisons par Type
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {Object.entries(typesData).length > 0 ? (
            Object.entries(typesData)
              .sort(([,a], [,b]) => b - a)
              .map(([typeName, count]) => (
                <div key={typeName} className="group p-6 bg-white rounded-2xl shadow-lg border border-gray-200 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{typeName}</p>
                      <p className="text-3xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        {count}
                      </p>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl group-hover:scale-110 transition-transform">
                      <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4l-8-4m-16 0l8 4m-8-4l8-4" />
                      </svg>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all" 
                      style={{ width: `${Math.min((count / Math.max(...Object.values(typesData))) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))
          ) : (
            <div className="col-span-full p-12 text-center bg-white rounded-2xl shadow-lg border-2 border-dashed border-gray-300">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-500 mb-2">Aucun type de livraison</h3>
              <p className="text-gray-400">Aucune donnée disponible pour cette période</p>
            </div>
          )}
        </div>
      </div> */}

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

      {/* Tableau Livraisons par Semaine */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-xl font-bold mb-4">📋 Livraisons par semaine</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left font-semibold">Semaine</th>
                <th className="p-3 text-left font-semibold">Nombre</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(weeklyData).length > 0 ? (
                Object.keys(weeklyData)
                  .sort((a, b) => Number(b) - Number(a))
                  .map((week) => (
                    <React.Fragment key={week}>
                      <tr 
                        className="cursor-pointer hover:bg-gray-50 border-b"
                        onClick={() => toggleWeekDetails(week)}
                      >
                        <td className="p-3 font-medium">
                          {selectedWeek === week ? '▼' : '▶'} Semaine {week}
                        </td>
                        <td className="p-3 font-bold text-blue-600">
                          {weeklyData[week].length}
                        </td>
                      </tr>
                      {selectedWeek === week && (
                        <tr>
                          <td colSpan={2} className="p-4 bg-gray-50">
                            <table className="w-full text-xs">
                              <thead className="bg-gray-200">
                                <tr>
                                  <th className="p-2 border">Date</th>
                                  <th className="p-2 border">Type</th>
                                  <th className="p-2 border">Qté</th>
                                  <th className="p-2 border">Statut</th>
                                  <th className="p-2 border">Livreur</th>
                                </tr>
                              </thead>
                              <tbody>
                                {weeklyData[week].map((livraison) => (
                                  <tr key={livraison.id_livraison}>
                                    <td className="p-2 border">
                                      {format(new Date(livraison.date_livraison), 'dd/MM', { locale: fr })}
                                    </td>
                                    <td className="p-2 border">
                                      {livraison.type_livraison_commerciale?.nom_type_livraison || 'N/A'}
                                    </td>
                                    <td className="p-2 border font-bold">
                                      {livraison.qte_totale_livraison}
                                    </td>
                                    <td className="p-2 border">
                                      <span className={`px-2 py-1 rounded text-xs ${
                                        livraison.statut_livraison === 'livre' ? 'bg-green-100 text-green-800' :
                                        livraison.statut_livraison === 'en_cours' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-red-100 text-red-800'
                                      }`}>
                                        {livraison.statut_livraison}
                                      </span>
                                    </td>
                                    <td className="p-2 border">
                                      {livraison.nom_livreur || 'N/A'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
              ) : (
                <tr>
                  <td colSpan={2} className="p-8 text-center text-gray-500 italic">
                    📊 Aucune livraison pour cette période
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
