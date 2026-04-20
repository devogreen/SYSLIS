// @ts-ignore
import React, { useState, useEffect } from 'react';
// @ts-ignore
import DatePicker from '../../components/form/date-picker';
// @ts-ignore
import { startOfWeek, endOfWeek, format, getWeek } from 'date-fns';
// @ts-ignore
import { fr } from 'date-fns/locale';
import axios from 'axios';
// @ts-ignore
import urlBase from '../../backend/const.js'

type DateValue = string | Date | Date[];

// @ts-ignore
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
  soumise: number;
  generee: number;
  imprimee: number;
  livree: number;
  recue: number;
}


// interface DemandesResponse {
//   demandes: DemandeQR[];
// }

declare global {
  interface Window {
    demandeQrService: any;
  }
}

export default function SousDashboardQRcode() {
  const getFormattedDate = (date: Date) => format(date, 'yyyy-MM-dd');

  // Lazy load service only when needed

  const [startDate, setStartDate] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [endDate, setEndDate] = useState<Date>(endOfWeek(new Date(), { weekStartsOn: 1 }));
  const [stats, setStats] = useState<QRStats>({ 
    total: 0, 
    soumise: 0, 
    generee: 0, 
    imprimee: 0, 
    livree: 0, 
    recue: 0 
  });
  const [recentDemandes, setRecentDemandes] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  // @ts-ignore
  const [loading, setLoading] = useState(false);

  // @ts-ignore
  const handleStartDateChange = (value: DateValue) => {
    if (Array.isArray(value)) {
      setStartDate(new Date(value[0]));
    } else if (value instanceof Date) {
      setStartDate(value);
    }
  };

  // @ts-ignore
  const handleEndDateChange = (value: DateValue) => {
    if (Array.isArray(value)) {
      setEndDate(new Date(value[0]));
    } else if (value instanceof Date) {
      setEndDate(value);
    }
  };

  // @ts-ignore
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

       
// Use backend-provided qr_codes stats (matches Dashboard.tsx)
        const qrData = statsResponse.data.qr_codes || {};
        const total = Object.values(qrData as Record<string, number>).reduce((sum, val) => sum + (val || 0), 0);
        
        const computedStats: QRStats = {
          total,
          soumise: qrData.soumise || 0,
          generee: qrData.generee || 0,
          imprimee: qrData.imprimee || 0,
          livree: qrData.livree || 0,
          recue: qrData.recue || 0
        };
        setStats(computedStats);

        // Fetch recent QR demandes for table
        try {
          const qrListResponse = await axios.get(`${urlBase}/api/demandeQr/getAllDemandesQr`);
          setRecentDemandes(qrListResponse.data);
        } catch (error) {
          console.error('Recent QR list error:', error);
        }
      } catch (error) {
        console.error('Erreur dashboard QR:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  // @ts-ignore
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
      {/* <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
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
      </div> */}

      {/* Status Cards - ALL STATUTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
        <div className="group p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-400 rounded-xl shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">Total</p>
              <p className="text-4xl font-bold text-blue-600">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-200 rounded-full">
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="group p-6 bg-gradient-to-br from-gray-50 to-gray-100 border-l-4 border-gray-400 rounded-xl shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">📤 Soumises</p>
              <p className="text-4xl font-bold text-gray-600">{stats.soumise || 0}</p>
            </div>
            <div className="p-3 bg-gray-200 rounded-full">
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="group p-6 bg-gradient-to-br from-indigo-50 to-indigo-100 border-l-4 border-indigo-400 rounded-xl shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-indigo-700">⚙️ Générées</p>
              <p className="text-4xl font-bold text-indigo-600">{stats.generee || 0}</p>
            </div>
            <div className="p-3 bg-indigo-200 rounded-full">
              <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4L5 20l4 4 4-4M7 20h10" />
              </svg>
            </div>
          </div>
        </div>

        <div className="group p-6 bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-orange-400 rounded-xl shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700">🖨️ Imprimées</p>
              <p className="text-4xl font-bold text-orange-600">{stats.imprimee || 0}</p>
            </div>
            <div className="p-3 bg-orange-200 rounded-full">
              <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v.01" />
              </svg>
            </div>
          </div>
        </div>

        <div className="group p-6 bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-400 rounded-xl shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">✅ Livrées</p>
              <p className="text-4xl font-bold text-green-600">{stats.livree}</p>
            </div>
            <div className="p-3 bg-green-200 rounded-full">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>
        <div className="group p-6 bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-400 rounded-xl shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">✅ Reçues</p>
              <p className="text-4xl font-bold text-green-600">{stats.recue}</p>
            </div>
            <div className="p-3 bg-green-200 rounded-full">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Recent QR Demandes Table - Live DB Data */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h3 className="text-xl font-bold mb-6">📋 Dernières Demandes QR</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qté QR</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentDemandes.slice(0, 5).map((demande: any) => {
                const statusMap = {
                  'soumise': { text: 'Soumise', color: 'bg-yellow-100 text-yellow-800' },
                  'generee': { text: 'Générée', color: 'bg-blue-100 text-blue-800' },
                  'imprimee': { text: 'Imprimée', color: 'bg-orange-100 text-orange-800' },
                  'livree': { text: 'Livrée', color: 'bg-emerald-100 text-emerald-800' },
                  'recue': { text: 'Reçue', color: 'bg-green-100 text-green-800' },
                } as Record<string, { text: string; color: string }>;
                const status = statusMap[demande.statut as string] || { text: demande.statut as string, color: 'bg-gray-100 text-gray-800' };
                return (
                  <tr key={demande.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{demande.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${status.color}`}>
                        {status.text}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {demande.forms?.last_modified_at ? format(new Date(demande.forms.last_modified_at), 'yyyy-MM-dd') : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {demande.quantite_qr} QR
                    </td>
                  </tr>
                );
              })}

              {recentDemandes.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500 italic">
                    Aucune demande QR récente
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

