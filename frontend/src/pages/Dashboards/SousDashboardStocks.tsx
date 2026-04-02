import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import DatePicker from '../../components/form/date-picker';
type DateValue = string | Date | Date[];

interface Item {
  id_piece: number;
  nom_piece: string;
}

interface StockItem {
  id: number;
  piece_id: number;
  quantite_lot?: number;
  quantite_carton?: number;
  quantite_piece?: number;
  code_stock?: string;
}

interface StockSummary {
  nom_piece: string;
  id_piece: number;
  total_lot: number;
  total_carton: number;
  total_piece: number;
  total: number;
  stocks: StockItem[];
}

export default function SousDashboardStocks() {
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [items, setItems] = useState<Item[]>([]);
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [stockSummary, setStockSummary] = useState<StockSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const getFormattedDate = (date: Date) => format(date, 'yyyy-MM-dd');

  const handleStartDateChange = (value: DateValue) => {
    if (Array.isArray(value) && value[0]) {
      setStartDate(new Date(value[0]));
    } else if (value instanceof Date) {
      setStartDate(value);
    }
  };

  const handleEndDateChange = (value: DateValue) => {
    if (Array.isArray(value) && value[0]) {
      setEndDate(new Date(value[0]));
    } else if (value instanceof Date) {
      setEndDate(value);
    }
  };

  const fetchStockData = async () => {
    setLoading(true);
    try {
      // Direct API calls (Stock service removed)
      const itemsResponse = await fetch('http://localhost:5500/api/stock/getAllItems');
      const stocksResponse = await fetch('http://localhost:5500/api/stock/getAllStocks');
      
      const itemsData = await itemsResponse.json();
      const stocksData = await stocksResponse.json();

      setItems(Array.isArray(itemsData) ? itemsData : []);
      setStocks(Array.isArray(stocksData) ? stocksData : []);

      // Group stocks by piece and calculate totals
      const summary = itemsData.reduce((acc: StockSummary[], item: Item) => {
        const pieceStocks = stocksData.filter((s: StockItem) => s.piece_id === item.id_piece);
        const totals = pieceStocks.reduce(
          (sum: { total_lot: number; total_carton: number; total_piece: number }, stock: StockItem) => ({
            total_lot: sum.total_lot + (stock.quantite_lot || 0),
            total_carton: sum.total_carton + (stock.quantite_carton || 0),
            total_piece: sum.total_piece + (stock.quantite_piece || 0),
          }),
          { total_lot: 0, total_carton: 0, total_piece: 0 }
        );

        const total = totals.total_piece + totals.total_carton + totals.total_lot;

        if (total > 0) {
          acc.push({
            nom_piece: item.nom_piece,
            id_piece: item.id_piece,
            ...totals,
            total,
            stocks: pieceStocks,
          });
        }

        return acc;
      }, []).sort((a: StockSummary, b: StockSummary) => b.total - a.total);

      setStockSummary(summary);
    } catch (error) {
      console.error('Erreur stock dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockData();
  }, []);

  const refresh = () => {
    fetchStockData();
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 flex items-center gap-3">
        <svg className="w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4l-8-4m-16 0l8 4m-8-4l8-4" />
        </svg>
        Dashboard Stocks
      </h1>

      {/* Date Filter */}
      <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
        <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-800 gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Filtrer par période (Stocks créés)
        </h3>
        <div className="flex flex-wrap gap-4 items-end justify-center md:justify-start">
          <DatePicker 
            id="date-debut" 
            label="Date début" 
            onChange={handleStartDateChange} 
            className="min-w-[200px]"
          />
          <DatePicker 
            id="date-fin" 
            label="Date fin" 
            onChange={handleEndDateChange} 
            className="min-w-[200px]"
          />
          <button
            className="px-8 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl shadow-lg flex items-center gap-2"
            onClick={refresh}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualiser Stocks
          </button>
        </div>
        {loading && (
          <p className="text-center mt-4 text-orange-600 animate-pulse flex items-center justify-center gap-2">
            <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Chargement des stocks...
          </p>
        )}
      </div>

      {/* Stock Detail Table */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3">
            📋 Détail Stocks par Pièce
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {stockSummary.length} références
            </span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Nom Pièce
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Lots
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Cartons
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Pièces
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stockSummary.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v12l-8 6v-6l-8-4V3m16 4" />
                      </svg>
                      <p className="text-lg font-medium">Aucun stock disponible</p>
                      <p className="text-sm">Commencez par ajouter des stocks</p>
                    </div>
                  </td>
                </tr>
              ) : (
                stockSummary.map((summary) => (
                  <tr key={summary.id_piece} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-orange-400 to-orange-500 flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v12l-8 6v-6l-8-4V3m16 4" />
                            </svg>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-bold text-gray-900">
                            {summary.nom_piece}
                          </div>
                          <div className="text-xs text-gray-500">
                            {summary.stocks.length} stocks
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-mono">
                      {summary.total_lot.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-mono">
                      {summary.total_carton.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-mono">
                      {summary.total_piece.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-right">
                      <span className="text-2xl font-black bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                        {summary.total.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

