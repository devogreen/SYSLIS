
// @ts-ignore
import React, { useState, useEffect } from 'react';
import { startOfMonth, endOfMonth, format, getWeek } from 'date-fns';
import DatePicker from '../../components/form/date-picker';
import { RefreshTimeIcon } from '../../icons';
import type { LivraisonType } from '../../types';

// @ts-ignore
import { Stock } from '../../backend/stock/Stock.js'

// @ts-ignore
import urlBase from '../../backend/const.js'

// @ts-ignore
type StockTotals = { total_lot: number; total_carton: number; total_piece: number; total: number };

interface GeneralStats {
  typesLivraisons: any;
  livraisons: { total: number; attente: number; livrees: number; retours: number };
  demandes: Record<string, number>;
  demandesValideesNonRecues?: number;
  stocks: { quantite_piece?: number; quantite_carton?: number; quantite_lot?: number };
  qr_codes: Record<string, number>;
  remplacementsLivres?: number;
  livraisonsParType?: LivraisonType[];
}


export default function Dashboard() {

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [stats, setStats] = useState<GeneralStats | null>(null);

  const statsSafe: GeneralStats =
    (stats as GeneralStats | null) ?? {
      typesLivraisons: {},
      livraisons: { total: 0, attente: 0, livrees: 0, retours: 0 },
      demandes: {},
      demandesValideesNonRecues: 0,
      stocks: { quantite_piece: 0, quantite_carton: 0, quantite_lot: 0 },
      qr_codes: {},
      remplacementsLivres: 0,
      livraisonsParType: []
    };


  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const stockData = new Stock();

  const currentWeek = getWeek(new Date(), { weekStartsOn: 1 });
  // const getFormattedDate = (date) => format(date, 'yyyy-MM-dd');
  const getFormattedDate = (date: Date | null): string => (date ? format(date, 'yyyy-MM-dd') : '');

  // Total produits = somme des quantités livrées (qte_totale_livraison) via l’API général
  const totalProduit = stats?.livraisons?.livrees ?? 0;


  // @ts-ignore
  const [livraisonsParType, setLivraisonsParType] = useState<LivraisonType[]>([]);
  const [loading, setLoading] = useState(false);
  // const [tpeStock, setTpeStock] = useState({ total_lot: 0, total_carton: 0, total_piece: 0, total: 0 });
  const [tpeStock, setTpeStock] = useState({ total_lot: 0, total_carton: 0, total_piece: 0, total: 0 });
  // @ts-ignore
  const [tpeStockId2, setTpeStockId2] = useState({ total_lot: 0, total_carton: 0, total_piece: 0, total: 0 });



  useEffect(() => {
    fetchStats();
  }, [startDate, endDate]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Stats générales d'abord
      const effectiveStartDate = startDate || startOfMonth(new Date());
      const effectiveEndDate = endDate || endOfMonth(new Date());
      const url = `${urlBase}/api/stats/general?startDate=${getFormattedDate(effectiveStartDate)}&endDate=${getFormattedDate(effectiveEndDate)}`;
      // const url = statsData.getGeneralStats(getFormattedDate(startDate), getFormattedDate(endDate));
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        console.error('Stats API error:', response.status);
      }

      // Stock id_piece=2
      const itemsRes = await fetch(`${urlBase}/api/stock/getAllItems`);
      // const itemsRes = await stockData.getAllItems();
      const stocksRes = await fetch(`${urlBase}/api/stock/getAllStocks`);
      // const stocksRes = await stockData.getAllStocks();
      const items = await itemsRes.json();
      const stocks = await stocksRes.json();

      // @ts-ignore
      const tpeItem = items.find((item: any) => item.id_piece === 2);
      const tpeStocks = stocks.filter((stock: any) => stock.piece_id === 2);

      const totals = tpeStocks.reduce((acc: any, stock: any) => ({
        total_lot: acc.total_lot + (stock.quantite_lot || 0),
        total_carton: acc.total_carton + (stock.quantite_carton || 0),
        total_piece: acc.total_piece + (stock.quantite_piece || 0)
      }), { total_lot: 0, total_carton: 0, total_piece: 0 });

      totals.total = totals.total_piece + totals.total_carton + totals.total_lot;
      setTpeStock(totals);
      setTpeStockId2(totals);
    } catch (error) {

      console.error('Stats fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => window.location.reload();
  // const stockTotal = stats?.stocks ? (stats.stocks.quantite_piece || 0) + (stats.stocks.quantite_carton || 0) + (stats.stocks.quantite_lot || 0) : 0;

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
            {startDate && endDate ? `Du ${getFormattedDate(startDate)} au ${getFormattedDate(endDate)}` : 'Sélectionnez les dates'}
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
            // @ts-ignore
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
            // @ts-ignore
            onChange={(selectedDates: Date[], dateStr: string) => {
              if (dateStr) {
                const d = new Date(dateStr);
                d.setDate(d.getDate() + 1);
                setEndDate(d);
              } else {
                setEndDate(null);
              }
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
        <div className="p-6 bg-purple-50 rounded-2xl shadow-md">
          <div className="flex items-center mb-4">
            {/* Titre */}
            <span className="text-purple-800 font-bold text-lg mr-3">📦 Livraison TPE</span>
            {/* Icône décorative */}
            <div className="p-2 bg-purple-200 rounded-2xl">
              <svg
                className="w-6 h-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 7l9-4 9 4-9 4-9-4zm0 7l9 4 9-4M3 7v7m18-7v7"
                />
              </svg>
            </div>
          </div>

          {/* Cartes des stats */}
          <div className="flex flex-wrap gap-4">
            {/* QR Codes reçus */}
            {/* <div className="bg-white p-4 rounded-xl shadow min-w-[120px] max-w-[160px] min-h-[100px] flex flex-col justify-between">
              <p className="text-gray-500 text-sm">Demandes QR reçues</p>
              <p className="text-xl font-bold ">{stats?.qr_codes?.recue ?? 0}</p>
            </div> */}

            {/* TPE GIM livrés */}
            {/* <div className="bg-white p-4 rounded-xl shadow min-w-[120px] max-w-[160px] min-h-[100px] flex flex-col justify-between">
              <p className="text-gray-500 text-sm">TPE GIM livrés</p>
              <p className="text-xl font-bold ">{stats?.livraisons?.livrees}</p>
            </div> */}

            {/* MAJ livrées */}
            {/* <div className="bg-white p-4 rounded-xl shadow min-w-[120px] max-w-[160px] min-h-[100px] flex flex-col justify-between">
              <p className="text-gray-500 text-sm">MAJ livrées</p>
              <p className="text-xl font-bold">{stats?.typesLivraisons?.["MAJ"] ?? 0}</p>
            </div> */}

            {/* TPE remplacés livrés */}
            {/* <div className="bg-white p-4 rounded-xl shadow min-w-[120px] max-w-[160px] min-h-[100px] flex flex-col justify-between">
              <p className="text-gray-500 text-sm">TPE remplacés livrés</p>
              <p className="text-xl font-bold">{stats?.remplacementsLivres ?? 0}</p>
            </div> */}

            {/* Types de livraisons dynamiques */}
            {stats?.typesLivraisons &&
              Object.entries(stats.typesLivraisons).map(([type, total]) => (
                <div
                  key={type}
                  className="bg-white p-4 rounded-xl shadow min-w-[120px] max-w-[160px] min-h-[100px] flex flex-col justify-between"
                >
                  <p className="text-gray-500 text-sm">{type}</p>
                  {/* Affichage du nombre de produits livrés pour ce type (livraisons livrées) */}
                  {/* Pour afficher la quantité, il faut que le backend retourne qte_totale_livraison par type.
                      Pour l’instant, `stats.typesLivraisons` semble être un comptage de livraisons (lignes) => nombre de produits livrés. */}
                  <p className="text-xl font-bold">{total as number}</p>
                  <p className="text-gray-500 text-xs">Quantité livrée</p>
                </div>
              ))}
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
      {totalProduit !== 0 ? (

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-6">
          {/* DEMANDES */}
          <div className="group p-8 bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-green-800">📋 Demandes</h3>
                <div className="text-3xl font-black text-green-600 mt-2">
                  {Object.values(statsSafe.demandes || {}).reduce((a, b) => (a || 0) + (b || 0), 0)}
                </div>

              </div>
              <div className="p-3 bg-green-200 rounded-2xl">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <div>⏳ En cours: <span className="font-semibold">{statsSafe.demandes?.en_cours || 0}</span></div>
              <div>✅ Valides: <span className="font-semibold text-green-600">{statsSafe.demandes?.valide || 0}</span></div>
              <div>📦 Non Receptionnés: <span className="font-semibold text-orange-600">{statsSafe?.demandesValideesNonRecues ?? 0}</span></div>

            </div>
          </div>

          {/* STOCKS Terminal */}
          <div className="group p-8 bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-orange-800">📦Stock Terminal</h3>
                <div className="text-3xl font-black text-orange-600 mt-2">
                  {tpeStock.total_piece.toLocaleString()}
                </div>

              </div>
              <div className="p-3 bg-orange-200 rounded-2xl">
                <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4l-8-4m-16 0l8 4m-8-4l8-4" />
                </svg>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <div>📦 Lots: <span className="font-semibold">{tpeStock.total_lot.toLocaleString()}</span></div>
              <div>📦 Cartons: <span className="font-semibold">{tpeStock.total_carton.toLocaleString()}</span></div>
              <div>🔧 Pièces: <span className="font-semibold">{tpeStock.total_piece.toLocaleString()}</span></div>
              <div className="font-bold mt-2 text-sm">Total: {tpeStock.total_piece.toLocaleString()}</div>

            </div>
          </div>

          {/*  STOCKS  */}
          <div className="group p-8 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-blue-800">📦 Stocks Pièces</h3>
                <div className="text-3xl font-black text-blue-600 mt-2">
                  {(stats?.stocks?.quantite_piece || 0) }
                </div>
                
              </div>
              <div className="p-3 bg-orange-200 rounded-2xl">
                  <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4l-8-4m-16 0l8 4m-8-4l8-4" />
                  </svg>
              </div>
              </div>
              <div className="space-y-1 text-sm">
                <div>📦 Lots: <span className="font-semibold">{statsSafe.stocks?.quantite_lot || 0}</span></div>
                <div>📦 Cartons: <span className="font-semibold">{statsSafe.stocks?.quantite_carton || 0}</span></div>
                <div>🔧 Pièces: <span className="font-semibold">{statsSafe.stocks?.quantite_piece || 0}</span></div>

              </div>
          </div>

            {/* QR CODES */}
            <div className="group p-8 bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-purple-800">📱 QR Codes</h3>
                  <div className="text-3xl font-black text-purple-600 mt-2">
                    {Object.values(statsSafe.qr_codes || {}).reduce((a, b) => (a || 0) + (b || 0), 0)}

                  </div>
                </div>
                <div className="p-3 bg-purple-200 rounded-2xl">
                  <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
              </div>
              <div className="space-y-1 text-sm">
                <div>📤 Soumises: <span className="font-semibold">{statsSafe.qr_codes?.soumise || 0}</span></div>
                <div>✅ Reçues: <span className="font-semibold text-green-600">{statsSafe.qr_codes?.recue || 0}</span></div>

              </div>
            </div>
          </div>
     ) : (
        <div className="col-span-full p-12 text-center bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border-2 border-dashed border-gray-300">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-xl font-semibold text-gray-500 mb-2">Chargement des statistiques...</h3>
          <p className="text-gray-400">Vérifiez que le backend est démarré</p>
        </div>
         )}
    </div>
  );
}







