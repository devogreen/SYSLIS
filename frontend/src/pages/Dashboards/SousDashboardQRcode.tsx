import React, { useState, useEffect } from 'react';
import DatePicker from '../../components/form/date-picker';
import { startOfWeek, endOfWeek, format, getWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import axios from 'axios';
const urlBase = 'http://localhost:5500';

type DateValue = string | Date | Date[];

interface DemandeQR {
  id: number;
  statut: string;
  quantite_qr: number;
  quantite_marchand: number;
  forms: {
    created_at: string;
  };
}

interface QRStats {
  total: number;
  livree: number;
  recue: number;
  en_cours: number;
}

interface DemandesResponse {
  demandes: DemandeQR[];
}

declare global {
  interface Window {
    demandeQrService: any;
  }
}

export default function SousDashboardQRcode() {
  const getFormattedDate = (date: Date) => format(date, 'yyyy-MM-dd');

  // Lazy load service only when needed
  const getDemandeQrService = () => {
    if (!window.demandeQrService) {
      window.demandeQrService = require('../../backend/demandeQr/DemandeQr').DemandeQr;
    }
    return new (window.demandeQrService as any)();
  };

  const [startDate, setStartDate] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [endDate, setEndDate] = useState<Date>(endOfWeek(new Date(), { weekStartsOn: 1 }));
  const [stats, setStats] = useState<QRStats>({ total: 0, livree: 0, recue: 0, en_cours: 0 });
  const [weeklyData, setWeeklyData] = useState<Record<string, DemandeQR[]>>({});
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
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

        // Fetch general stats
        const statsResponse = await axios.get(
          `${urlBase}/api/stats/general?startDate=${formattedStartDate}&endDate=${formattedEndDate}`
        );
        const generalStats = statsResponse.data;
        const qrStatsRaw = generalStats.qr_codes || {};

        // Direct axios call to avoid class import issues
        const demandesResponse = await axios.get(`${urlBase}/api/demandeQr/getAllDemandesQr`);
        const demandesData = demandesResponse.data;
        const allDemandes: DemandeQR[] = (demandesData as DemandesResponse).demandes || [];

        // Filter by date range
        const filteredDemandes = allDemandes.filter((demande: DemandeQR) => {
          const dateCreated = new Date(demande.forms.created_at);
          return dateCreated >= startDate && dateCreated <= endDate;
        });

        // Compute stats from filtered data (focus livree/recue)
        const computedStats: QRStats = {
          total: filteredDemandes.length,
          livree: filteredDemandes.filter(d => d.statut === 'livree').length,
          recue: filteredDemandes.filter(d => d.statut === 'recue').length,
          en_cours: filteredDemandes.filter(d => ['soumise', 'generee', 'imprimee'].includes(d.statut)).length,
        };
        setStats(computedStats);

        // Group by week
        const grouped = filteredDemandes.reduce((acc: Record<string, DemandeQR[]>, demande: DemandeQR) => {
          const week = getWeek(new Date(demande.forms.created_at), { weekStartsOn: 1 }).toString();
          if (!acc[week]) {
            acc[week] = [];
          }
          acc[week].push(demande);
          return acc;
        }, {});

        setWeeklyData(grouped);
      } catch (error) {
        console.error('Erreur dashboard QR:', error);
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
      <h1 className="text-3xl font-bold mb-8 text-gray-800 flex items-center">
        <svg className="w-8 h-8 mr-3 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z"/>
        </svg>
        Dashboard QR Codes
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
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium whitespace-nowrap"
            onClick={handleRefresh}
          >
            🔄 Actualiser
          </button>
        </div>
        {loading && (
          <p className="text-center mt-4 text-blue-600 animate-pulse">Chargement des données QR...</p>
        )}
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="group p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-400 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700 opacity-80">Total</p>
              <p className="text-4xl font-bold text-blue-600">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-200 rounded-full">
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="group p-6 bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-400 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700 opacity-80">Livrées</p>
              <p className="text-4xl font-bold text-green-600">{stats.livree}</p>
            </div>
            <div className="p-3 bg-green-200 rounded-full">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="group p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-purple-400 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700 opacity-80">Reçues</p>
              <p className="text-4xl font-bold text-purple-600">{stats.recue}</p>
            </div>
            <div className="p-3 bg-purple-200 rounded-full">
              <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Table */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-xl font-bold mb-4 flex items-center">
          📋 Demandes QR par semaine (Livrées & Reçues)
        </h3>
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
                        <td className="p-3 font-bold text-green-600">
                          {weeklyData[week].length} ({weeklyData[week].filter(d => d.statut === 'livree').length} livrées, {weeklyData[week].filter(d => d.statut === 'recue').length} reçues)
                        </td>
                      </tr>
                      {selectedWeek === week && (
                        <tr>
                          <td colSpan={2} className="p-4 bg-gray-50">
                            <table className="w-full text-xs">
                              <thead className="bg-gray-200">
                                <tr>
                                  <th className="p-2 border">Date</th>
                                  <th className="p-2 border">Qté QR</th>
                                  <th className="p-2 border">Marchands</th>
                                  <th className="p-2 border">Statut</th>
                                </tr>
                              </thead>
                              <tbody>
                                {weeklyData[week]
                                  .filter(d => ['livree', 'recue'].includes(d.statut))
                                  .map((demande) => (
                                    <tr key={demande.id} className="hover:bg-white">
                                      <td className="p-2 border">
                                        {format(new Date(demande.forms.created_at), 'dd/MM/yyyy', { locale: fr })}
                                      </td>
                                      <td className="p-2 border font-bold">
                                        {demande.quantite_qr}
                                      </td>
                                      <td className="p-2 border">
                                        {demande.quantite_marchand}
                                      </td>
                                      <td className="p-2 border">
                                        <span className={`px-2 py-1 rounded text-xs ${
                                          demande.statut === 'livree' ? 'bg-green-100 text-green-800' :
                                          'bg-purple-100 text-purple-800'
                                        }`}>
                                          {demande.statut === 'livree' ? 'Livrée' : 'Reçue'}
                                        </span>
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
                    📊 Aucune demande QR livrée/reçue pour cette période
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

