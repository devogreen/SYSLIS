// @ts-ignore
import React, { useState, useEffect } from 'react';
import DatePicker from '../../components/form/date-picker';
import { startOfWeek, endOfWeek, format } from 'date-fns';
// @ts-ignore
import { fr } from 'date-fns/locale';

type DateValue = string | Date | Date[];

interface Demande {
  id: number;
  nom_demandeur?: string;
  date_demande: string;
  qte_total_demande: number;
  motif_demande?: string;
  statut_demande: 'en_cours' | 'valide' | 'partiel' | 'retourne' | 'refuse';
  service_demandeur?: number;
}

interface Stats {
  total: number;
  valide: number;
  en_cours: number;
  refuse: number;
  retourne: number;
}

const getStatusColor = (statut: string): string => {
  const colors: Record<string, string> = {
    'valide': 'bg-green-100 text-green-800',
    'en_cours': 'bg-blue-100 text-blue-800',
    'partiel': 'bg-yellow-100 text-yellow-800',
    'refuse': 'bg-red-100 text-red-800',
    'retourne': 'bg-orange-100 text-orange-800',
  };
  return colors[statut as keyof typeof colors] || 'bg-gray-100 text-gray-800';
};

const getStatusLabel = (statut: string): string => {
  const labels: Record<string, string> = {
    'valide': 'Validée',
    'en_cours': 'En cours',
    'partiel': 'Partielle',
    'refuse': 'Refusée',
    'retourne': 'Retourné',
  };
  return labels[statut as keyof typeof labels] || statut;
};

export default function SousDashboardDemande() {
  const getFormattedDate = (date: Date) => format(date, 'yyyy-MM-dd');

  const [startDate, setStartDate] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [endDate, setEndDate] = useState<Date>(endOfWeek(new Date(), { weekStartsOn: 1 }));
  const [stats, setStats] = useState<Stats>({ total: 0, valide: 0, en_cours: 0, refuse: 0, retourne: 0 });
  const [allDemandes, setAllDemandes] = useState<Demande[]>([]);
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
        // @ts-ignore
        const formattedStartDate = getFormattedDate(startDate);
        // @ts-ignore
        const formattedEndDate = getFormattedDate(endDate);

        // Fetch all demandes
        const response = await fetch('http://localhost:5500/api/demandes/getAllDemandes');
        if (response.ok) {
          const rawDemandes: Demande[] = await response.json();

          // Filter by date
          const filteredDemandes = rawDemandes.filter((d: Demande) => {
            const dateDemande = new Date(d.date_demande);
            return dateDemande >= startDate && dateDemande <= endDate;
          });

          // Compute stats
          const computedStats: Stats = {
            total: filteredDemandes.length,
            valide: filteredDemandes.filter(d => d.statut_demande === 'valide').length,
            en_cours: filteredDemandes.filter(d => d.statut_demande === 'en_cours').length,
            refuse: filteredDemandes.filter(d => d.statut_demande === 'refuse').length,
            retourne: filteredDemandes.filter(d => d.statut_demande === 'retourne').length,
          };
          setStats(computedStats);

          setAllDemandes(filteredDemandes);
        }
      } catch (error) {
        console.error('Erreur dashboard Demandes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 flex items-center">
        📝 Dashboard Demandes 
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
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium whitespace-nowrap"
            onClick={handleRefresh}
          >
            🔄 Actualiser
          </button>
        </div>
        {loading && (
          <p className="text-center mt-4 text-indigo-600 animate-pulse">Chargement demandes...</p>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="p-6 bg-gradient-to-br from-indigo-50 to-indigo-100 border-l-4 border-indigo-400 rounded-xl shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-indigo-700">Total</p>
              <p className="text-4xl font-bold text-indigo-600">{stats.total}</p>
            </div>
            <div className="p-3 bg-indigo-200 rounded-full">
              <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-400 rounded-xl shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">Validées</p>
              <p className="text-4xl font-bold text-green-600">{stats.valide}</p>
            </div>
            <div className="p-3 bg-green-200 rounded-full">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-400 rounded-xl shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">En cours</p>
              <p className="text-4xl font-bold text-blue-600">{stats.en_cours}</p>
            </div>
            <div className="p-3 bg-blue-200 rounded-full">
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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

        <div className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-orange-400 rounded-xl shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700">Retour</p>
              <p className="text-4xl font-bold text-orange-600">{stats.retourne}</p>
            </div>
            <div className="p-3 bg-orange-200 rounded-full">
              <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Demandes Cards */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h3 className="text-xl font-bold mb-6">📋 Toutes les Demandes ({allDemandes.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {allDemandes.map((demande) => (
            <div key={demande.id} className="group p-6 bg-gray-50 border border-gray-200 rounded-xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all hover:bg-white">
              <div className="flex items-start justify-between mb-3">
                <div className="text-sm font-medium text-gray-500">#{demande.id}</div>
                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(demande.statut_demande)}`}>
                  {getStatusLabel(demande.statut_demande)}
                </span>
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-1 truncate">
                {demande.nom_demandeur || 'N/A'}
              </h4>
              <p className="text-2xl font-bold text-indigo-600 mb-2">
                {demande.qte_total_demande}
              </p>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {demande.motif_demande || 'Sans motif'}
              </p>
              <div className="text-xs text-gray-500 mb-3">
                📅 {format(new Date(demande.date_demande), 'dd/MM/yyyy')}
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                <span className="text-xs text-gray-500">{demande.service_demandeur || 'N/A'}</span>
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></span>
                </div>
              </div>
            </div>
          ))}
          {allDemandes.length === 0 && (
            <div className="col-span-full p-12 text-center text-gray-500 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="text-xl font-semibold mb-2">Aucune demande</h3>
              <p className="text-gray-400">Aucune demande pour cette période</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

