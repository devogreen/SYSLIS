import React, { useState, useEffect } from 'react';
import { startOfWeek, endOfWeek, format, getWeek } from 'date-fns';
import DatePicker from '../../components/form/date-picker';
import { RefreshTimeIcon } from '../../icons';
// import type { DemandeStats } from '../../types';

interface DemandeStats {
  demandes: Record<string, number>;
  total: number;
  en_cours: number;
  valide: number;
  partiel: number;
  retourne: number;
  refuse: number;
}

export default function SousDashboardDemande() {
  const currentWeek = getWeek(new Date(), { weekStartsOn: 1 });
  const getFormattedDate = (date: Date) => format(date, 'yyyy-MM-dd');

  const [startDate, setStartDate] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [endDate, setEndDate] = useState(endOfWeek(new Date(), { weekStartsOn: 1 }));
  const [stats, setStats] = useState<DemandeStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStats();
  }, [startDate, endDate]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const url = `http://localhost:5500/api/stats/general?startDate=${getFormattedDate(startDate)}&endDate=${getFormattedDate(endDate)}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const rawDemandes: Record<string, number> = data.demandes || {};
        const demandesStats: DemandeStats = {
          demandes: rawDemandes,
          total: Object.values(rawDemandes).reduce((sum: number, count: number) => sum + count, 0),
          en_cours: rawDemandes.en_cours || 0,
          valide: rawDemandes.valide || 0,
          partiel: rawDemandes.partiel || 0,
          retourne: rawDemandes.retourne || 0,
          refuse: rawDemandes.refuse || 0,
        };
        setStats(demandesStats);
      }
    } catch (error) {
      console.error('Stats fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => window.location.reload();

  return (
    <div className="space-y-8 p-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-gradient-to-r from-emerald-50 to-green-50 p-6 rounded-2xl">
        <h1 className="text-3xl font-bold text-gray-800">📋 DASHBOARD DEMANDES</h1>
        <div className="text-right">
          <div className="text-2xl font-black text-emerald-600">
            Semaine {currentWeek}
          </div>
          <div className="text-sm opacity-70">
            Du {getFormattedDate(startDate)} au {getFormattedDate(endDate)}
          </div>
        </div>
      </div>

      {/* GLOBAL DATE FILTER */}
      <div className="bg-white shadow-xl rounded-2xl p-6 border border-gray-100">
        <div className="flex flex-wrap gap-4 items-end justify-center md:justify-start">
          <DatePicker
            id="demandes-debut"
            label="📅 Date début"
            value={getFormattedDate(startDate)}
onChange={(_selectedDates: Date[], dateStr: string) => {
              if (dateStr) {
                setStartDate(new Date(dateStr));
              }
            }}
            className="flex-1 min-w-[200px]"
          />
          <DatePicker
            id="demandes-fin"
            label="📅 Date fin"
            value={getFormattedDate(endDate)}
            onChange={(selectedDates: Date[], dateStr: string) => {
              if (selectedDates && selectedDates[0]) {
                const d = new Date(selectedDates[0]);
                d.setDate(d.getDate() + 1);
                setEndDate(d);
              }
            }}
            className="flex-1 min-w-[200px]"
          />
          <button
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-lg transition-all flex items-center gap-2"
            onClick={refresh}
          >
            <RefreshTimeIcon className="w-4 h-4" />
            Actualiser
          </button>
        </div>
        {loading && (
          <div className="text-center mt-4 text-emerald-600 animate-pulse">
            🔄 Mise à jour des statistiques des demandes...
          </div>
        )}
      </div>

      {/* MAIN STATS GRID */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* TOTAL DEMANDES */}
          <div className="group p-8 bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-200 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-emerald-800">📊 Total Demandes</h3>
                <div className="text-3xl font-black text-emerald-600 mt-2">
                  {stats.total}
                </div>
              </div>
              <div className="p-3 bg-emerald-200 rounded-2xl">
                <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* EN COURS */}
          <div className="group p-8 bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-200 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-yellow-800">⏳ En cours</h3>
                <div className="text-3xl font-black text-yellow-600 mt-2">
                  {stats.en_cours}
                </div>
              </div>
              <div className="p-3 bg-yellow-200 rounded-2xl">
                <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* VALIDÉES */}
          <div className="group p-8 bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-green-800">✅ Validées</h3>
                <div className="text-3xl font-black text-green-600 mt-2">
                  {stats.valide}
                </div>
              </div>
              <div className="p-3 bg-green-200 rounded-2xl">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>

          {/* PARTIEL */}
          <div className="group p-8 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-blue-800">🔄 Partiel</h3>
                <div className="text-3xl font-black text-blue-600 mt-2">
                  {stats.partiel}
                </div>
              </div>
              <div className="p-3 bg-blue-200 rounded-2xl">
                <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
            </div>
          </div>

          {/* RETOURNÉES */}
          <div className="group p-8 bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-orange-800">↩️ Retournées</h3>
                <div className="text-3xl font-black text-orange-600 mt-2">
                  {stats.retourne}
                </div>
              </div>
              <div className="p-3 bg-orange-200 rounded-2xl">
                <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm7 2a1 1 0 110-2 1 1 0 010 2zm-10 0a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* REFUSÉES */}
          <div className="group p-8 bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-red-800">❌ Refusées</h3>
                <div className="text-3xl font-black text-red-600 mt-2">
                  {stats.refuse}
                </div>
              </div>
              <div className="p-3 bg-red-200 rounded-2xl">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STATUS BREAKDOWN CHART PLACEHOLDER */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h3 className="text-xl font-bold mb-6">📊 Répartition par Statut</h3>
          <div className="h-64 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500">
            Chart placeholder - Add ApexCharts/Chart.js component
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h3 className="text-xl font-bold mb-6">📈 Évolution Mensuelle</h3>
          <div className="h-64 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500">
            Line chart placeholder
          </div>
        </div>
      </div>

      {/* RECENT DEMANDES TABLE */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h3 className="text-xl font-bold mb-6">📋 Dernières Demandes</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qté</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Dynamic table rows from /api/demandes/getRecent */}
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">#123</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Validée
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">2024-01-15</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">12 pièces</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

