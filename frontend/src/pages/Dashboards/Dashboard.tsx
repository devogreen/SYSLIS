

import React, { useState, useEffect } from 'react';
import { startOfWeek, endOfWeek, format, getWeek } from 'date-fns';
import DatePicker from '../../components/form/date-picker';
import { RefreshTimeIcon } from '../../icons';
import type { LivraisonType } from '../../types';

interface GeneralStats {
  typesLivraisons: any;
  livraisons: { total: number; attente: number; livrees: number; retours: number };
  demandes: Record<string, number>;
  stocks: { quantite_piece?: number; quantite_carton?: number; quantite_lot?: number };
  qr_codes: Record<string, number>;
  livraisonsParType?: LivraisonType[];
}



export default function Dashboard() {
  const currentWeek = getWeek(new Date(), { weekStartsOn: 1 });
  // const getFormattedDate = (date) => format(date, 'yyyy-MM-dd');
  const getFormattedDate = (date: Date) => format(date, 'yyyy-MM-dd');


  const [startDate, setStartDate] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [endDate, setEndDate] = useState(endOfWeek(new Date(), { weekStartsOn: 1 }));
  const [stats, setStats] = useState<GeneralStats | null>(null);
  const [livraisonsParType, setLivraisonsParType] = useState<LivraisonType[]>([]);
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
        setStats(data);
      } else {
        console.error('Stats API error:', response.status);
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
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl">
        <h1 className="text-3xl font-bold text-gray-800">📊 DASHBOARD GÉNÉRAL</h1>
        <div className="text-right">
          <div className="text-2xl font-black text-blue-600">
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
            id="date-debut"
            label="📅 Date début"
            value={getFormattedDate(startDate)}
            onChange={(selectedDates: Date[], dateStr: string) => {
              const originalOnChange = (dateStr: string) => {
                if (dateStr) {
                  setStartDate(new Date(dateStr));
                }
              };
              originalOnChange(dateStr);
            }}
            className="flex-1 min-w-[200px]"
          />
          <DatePicker
            id="date-fin"
            label="📅 Date fin"
            value={getFormattedDate(endDate)}
            onChange={(selectedDates: Date[], dateStr: string) => {
              const originalOnChange = (selectedDates: Date[]) => {
                if (selectedDates && selectedDates[0]) {
                  const d = new Date(selectedDates[0]);
                  d.setDate(d.getDate() + 1);
                  setEndDate(d);
                }
              };
              originalOnChange(selectedDates);
            }}
            className="flex-1 min-w-[200px]"
          />
          <button
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg transition-all flex items-center gap-2"
            onClick={refresh}
          >
            <RefreshTimeIcon className="w-4 h-4" />
            Actualiser
          </button>
        </div>
        {loading && (
          <div className="text-center mt-4 text-blue-600 animate-pulse">
            🔄 Mise à jour des statistiques...
          </div>
        )}
      </div>
      {/* <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {data.map((item, index) => (
          <div key={index} className="bg-white p-4 rounded-xl shadow">
            <p className="text-gray-500">{item.label}</p>
            <p className="text-xl font-bold">{item.value}</p>
          </div>
        ))}
      </div> */}
      {/* CARD TYPES DE LIVRAISON */}
      <div className="group p-8 bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">

        {/* HEADER */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-purple-800">📦 Types livrés</h3>
          </div>
          {/* QR Codes dynamiques */}
          <div className="bg-white p-4 rounded-xl shadow">
            <p className="text-gray-500">Demandes QR reçues</p>
            <p className="text-xl font-bold">
              {stats?.qr_codes?.recue ?? 0}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow">
            <p className="text-gray-500">TPE GIM livrés</p>
            <p className="text-xl font-bold">
              {stats?.livraisons?.livrees}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow">
            <p className="text-gray-500">MAJ livrées</p>
            <p className="text-xl font-bold">
              {stats?.typesLivraisons?.["MAJ"] ?? 0}
            </p>
          </div>
          {stats?.typesLivraisons &&
            Object.entries(stats.typesLivraisons).map(([type, total]) => (
              <div key={type} className="bg-white p-4 rounded-xl shadow">
                <p className="text-gray-500">{type}</p>
                <p className="text-xl font-bold">{total as number}</p>
                <p className="text-gray-500">Livrés</p>
              </div>
            ))}
          {/* <div className="bg-white p-4 rounded-xl shadow">
            <p className="text-gray-500">Chargeurs</p>
            <p className="text-xl font-bold">
              {stats?.chargeur}</p>
          </div> */}
          <div className="p-3 bg-purple-200 rounded-2xl">
            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7l9-4 9 4-9 4-9-4zm0 7l9 4 9-4M3 7v7m18-7v7" />
            </svg>
          </div>
        </div>

        {/* GRID DES STATS */}
        {/* <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">

          <div className="bg-white p-4 rounded-xl shadow">
            <p className="text-gray-500">TPE GIM livrés</p>
            <p className="text-xl font-bold">{stats.tpeGim}</p>
          </div>

          <div className="bg-white p-4 rounded-xl shadow">
            <p className="text-gray-500">MAJ livrées</p>
            <p className="text-xl font-bold">{stats.maj}</p>
          </div>

          <div className="bg-white p-4 rounded-xl shadow">
            <p className="text-gray-500">Chargeurs</p>
            <p className="text-xl font-bold">{stats.chargeur}</p>
          </div>

          <div className="bg-white p-4 rounded-xl shadow">
            <p className="text-gray-500">Chargeur OK</p>
            <p className="text-xl font-bold text-green-600">{stats.chargeurOk}</p>
          </div>

          <div className="bg-white p-4 rounded-xl shadow">
            <p className="text-gray-500">Chargeur NOK</p>
            <p className="text-xl font-bold text-red-600">{stats.chargeurNok}</p>
          </div>

          <div className="bg-white p-4 rounded-xl shadow">
            <p className="text-gray-500">TPE RNE</p>
            <p className="text-xl font-bold">{stats.tpeRne}</p>
          </div>

          <div className="bg-white p-4 rounded-xl shadow">
            <p className="text-gray-500">TPE Mobile</p>
            <p className="text-xl font-bold">{stats.tpeMobile}</p>
          </div>

          <div className="bg-white p-4 rounded-xl shadow">
            <p className="text-gray-500">TPE remplacés</p>
            <p className="text-xl font-bold">{stats.tpeRemplaces}</p>
          </div>

        </div> */}
      </div>
      {/* 🏗️ MAIN STATS GRID */}
{stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
          {/* DEMANDES */}
          <div className="group p-8 bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-green-800">📋 Demandes</h3>
                <div className="text-3xl font-black text-green-600 mt-2">
                  {Object.values(stats.demandes || {}).reduce((a, b) => (a || 0) + (b || 0), 0)}
                </div>
              </div>
              <div className="p-3 bg-green-200 rounded-2xl">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <div>⏳ En cours: <span className="font-semibold">{stats.demandes?.en_cours || 0}</span></div>
              <div>✅ Valides: <span className="font-semibold text-green-600">{stats.demandes?.valide || 0}</span></div>
            </div>
          </div>

          {/* STOCKS */}
          <div className="group p-8 bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-orange-800">📦 Stocks</h3>
                <div className="text-3xl font-black text-orange-600 mt-2">
                  {(stats.stocks?.quantite_piece || 0) + (stats.stocks?.quantite_carton || 0) + (stats.stocks?.quantite_lot || 0)}
                </div>
              </div>
              <div className="p-3 bg-orange-200 rounded-2xl">
                <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4l-8-4m-16 0l8 4m-8-4l8-4" />
                </svg>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <div>🔧 Pièces: <span className="font-semibold">{stats.stocks?.quantite_piece || 0}</span></div>
              <div>📦 Cartons: <span className="font-semibold">{stats.stocks?.quantite_carton || 0}</span></div>
            </div>
          </div>

          {/* QR CODES */}
          <div className="group p-8 bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-purple-800">📱 QR Codes</h3>
                <div className="text-3xl font-black text-purple-600 mt-2">
                  {Object.values(stats.qr_codes || {}).reduce((a, b) => (a || 0) + (b || 0), 0)}
                </div>
              </div>
              <div className="p-3 bg-purple-200 rounded-2xl">
                <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <div>📤 Soumises: <span className="font-semibold">{stats.qr_codes?.soumise || 0}</span></div>
              <div>✅ Reçues: <span className="font-semibold text-green-600">{stats.qr_codes?.recue || 0}</span></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="col-span-full p-12 text-center bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border-2 border-dashed border-gray-300">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-xl font-semibold text-gray-500 mb-2">Chargement des statistiques...</h3>
          <p className="text-gray-400">Vérifiez que le backend est démarré (port 5500)</p>
        </div>
      )}

      {/* 📈 CHARTS & TABLES */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h3 className="text-xl font-bold mb-6">📊 Livraisons par Statut</h3>
          {/* <LivraisonsPieStats startDate={startDate} endDate={endDate} /> */}
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h3 className="text-xl font-bold mb-6">📋 Dernières Demandes</h3>
          <div className="text-sm space-y-2">
            <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
              <span>En attente</span>
              <span className="font-semibold">{stats?.demandes?.en_cours || 0}</span>
            </div>
            <div className="flex justify-between p-3 bg-blue-50 rounded-lg">
              <span>Validées</span>
              <span className="font-semibold text-blue-600">{stats?.demandes?.valide || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 📋 RECENT ACTIVITY */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-xl p-6">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            🚚 Dernières Livraisons <span className="text-sm opacity-70">({stats?.livraisons?.total || 0})</span>
          </h3>
          {/* <LivraisonsLivrees startDate={startDate} endDate={endDate} limit={5} /> */}
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h3 className="text-xl font-bold mb-6">📦 Stocks Critiques</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
              <span>Pièces total</span>
              <span className="font-bold text-orange-600">{stats?.stocks?.quantite_piece || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
              <span>Cartons</span>
              <span className="font-bold text-yellow-600">{stats?.stocks?.quantite_carton || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

