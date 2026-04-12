import React, { useState, useEffect } from 'react';
import DatePicker from '../../components/form/date-picker';
import { startOfWeek, endOfWeek, format, getWeek } from 'date-fns';
import { fr } from 'date-fns/locale';

type DateValue = string | Date | Date[];

interface Remplacement {
  id: number;
  quantite: number;
  details_remplacement: string;
  commentaire?: string;
  date_remplacement: string;
  statut: 'en_cours' | 'livre' | 'en_attente' | 'refuse' | 'annule';
  old_model_id: number;
  new_model_id: number;
  nom_livreur?: string;
  validation_remplacement: Array<{
    date_validation: string;
    nom_recepteur?: string;
    commentaire?: string;
  }>;
}

interface Stats {
  total: number;
  en_attente: number;
  livre: number;
  refuse: number;
}

export default function SousDashboardRemplacement() {
  const getFormattedDate = (date: Date) => format(date, 'yyyy-MM-dd');

  const [startDate, setStartDate] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [endDate, setEndDate] = useState<Date>(endOfWeek(new Date(), { weekStartsOn: 1 }));
  const [stats, setStats] = useState<Stats>({ total: 0, en_attente: 0, livre: 0, refuse: 0 });
  const [recentRemplacements, setRecentRemplacements] = useState<Remplacement[]>([]);
  const [loading, setLoading] = useState(false);

  const handleStartDateChange = (value: DateValue) => {
    if (Array.isArray(value)) {
      setStartDate(new Date(value[0]));
    } else if (value instanceof Date) {
      setStartDate(value);
    }
  };

  const handleEndDateChange = (value: DateValue) => {
    if (Array.isArray(value)) {
      setEndDate(new Date(value[0]));
    } else if (value instanceof Date) {
      setEndDate(value);
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

        // Fetch all remplacements
        const response = await fetch('http://localhost:5500/api/delivery/getAllRemplacements');
        if (response.ok) {
          const allRemplacements: Remplacement[] = await response.json();

          // Filter by date
          const filteredRemplacements = allRemplacements.filter((r: Remplacement) => {
            const dateRemplacement = new Date(r.date_remplacement);
            return dateRemplacement >= startDate && dateRemplacement <= endDate;
          });

          // Compute stats
          const computedStats: Stats = {
            total: filteredRemplacements.length,
            en_attente: filteredRemplacements.filter(r => r.statut === 'en_attente').length,
            livre: filteredRemplacements.filter(r => r.statut === 'livre').length,
            refuse: filteredRemplacements.filter(r => r.statut === 'refuse' || r.statut === 'annule').length,
          };
          setStats(computedStats);

          // Recent 10
          const recent = filteredRemplacements.slice(0, 10);
          setRecentRemplacements(recent);

          console.log('Sample Remplacement:', recent[0]);
        }
      } catch (error) {
        console.error('Erreur dashboard Remplacement:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  const parseDetails = (details: string) => {
    try {
      const parsed = JSON.parse(details);
      return parsed;
    } catch {
      return [];
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 flex items-center">
        🔄 Dashboard Remplacements
      </h1>

      {/* Date Picker */}
      <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
        <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-800">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Filtrer la période
        </h3>
        <div className="flex flex-wrap gap-4 justify-center items-end">
          <DatePicker id="date-debut" label="Date début" onChange={handleStartDateChange} />
          <DatePicker id="date-fin" label="Date fin" onChange={handleEndDateChange} />
          <button
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium whitespace-nowrap"
            onClick={handleRefresh}
          >
            🔄 Actualiser
          </button>
        </div>
        {loading && (
          <p className="text-center mt-4 text-purple-600 animate-pulse">Chargement remplacements...</p>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-purple-400 rounded-xl shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700">Total</p>
              <p className="text-4xl font-bold text-purple-600">{stats.total}</p>
            </div>
            <div className="p-3 bg-purple-200 rounded-full">
              <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 border-l-4 border-yellow-400 rounded-xl shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-700">En attente</p>
              <p className="text-4xl font-bold text-yellow-600">{stats.en_attente}</p>
            </div>
            <div className="p-3 bg-yellow-200 rounded-full">
              <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-400 rounded-xl shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">Livrées</p>
              <p className="text-4xl font-bold text-green-600">{stats.livre}</p>
            </div>
            <div className="p-3 bg-green-200 rounded-full">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gradient-to-br from-red-50 to-red-100 border-l-4 border-red-400 rounded-xl shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-700">Refusées</p>
              <p className="text-4xl font-bold text-red-600">{stats.refuse}</p>
            </div>
            <div className="p-3 bg-red-200 rounded-full">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Remplacements Table */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          📋 Derniers Remplacements ({recentRemplacements.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ancien Model</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nouveau Model</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qté</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Livreur</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentRemplacements.map((remplacement) => {
                const details = parseDetails(remplacement.details_remplacement);
                const latestValidation = remplacement.validation_remplacement[remplacement.validation_remplacement.length - 1];
                const statusColor = {
                  'en_cours': 'bg-blue-100 text-blue-800',
                  'livre': 'bg-green-100 text-green-800',
                  'en_attente': 'bg-yellow-100 text-yellow-800',
                  'refuse': 'bg-red-100 text-red-800',
                  'annule': 'bg-gray-100 text-gray-800'
                }[remplacement.statut] || 'bg-gray-100 text-gray-800';

                return (
                  <tr key={remplacement.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{remplacement.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {details.map((d: any) => d.old_model).join(', ') || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {details.map((d: any) => d.new_model).join(', ') || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {remplacement.quantite}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor}`}>
                        {remplacement.statut}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(remplacement.date_remplacement), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {remplacement.nom_livreur || latestValidation?.nom_recepteur || 'N/A'}
                    </td>
                  </tr>
                );
              })}
              {recentRemplacements.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 italic">
                    Aucun remplacement pour cette période
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

