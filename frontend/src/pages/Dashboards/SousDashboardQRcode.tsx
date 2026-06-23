// @ts-ignore
import React, { useEffect, useMemo, useState } from 'react';
// @ts-ignore
import DatePicker from '../../components/form/date-picker';
// @ts-ignore
import { format, getWeek } from 'date-fns';
import axios from 'axios';
// @ts-ignore
import urlBase from '../../backend/const.js';


import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-var-requires
// Utilisation de require pour éviter les problèmes d'import au runtime si le module n'est pas résolu.
// @ts-ignore


type DateValue = string | Date | Date[];

// (interface supprimée: non utilisée)


interface QRStats {
  total: number;
  soumise: number;
  generee: number;
  imprimee: number;
  livree: number;
  recue: number;
}

declare global {
  interface Window {
    demandeQrService: any;
  }
}

export default function SousDashboardQRcode() {
  const getFormattedDate = (date: Date | null) => (date ? format(date, 'yyyy-MM-dd') : '');

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const currentWeek = getWeek(new Date(), { weekStartsOn: 1 });

  const getIsoWeekRange = (date: Date) => {
    // Retourne le début (lundi 00:00:00) et fin (dimanche 23:59:59) de la semaine ISO
    const d = new Date(date);
    const day = d.getDay(); // 0 dimanche ... 6 samedi
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const start = new Date(d);
    start.setDate(d.getDate() + diffToMonday);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  };

  const isoWeekRange = useMemo(() => getIsoWeekRange(new Date()), []);
  const formattedIsoStart = useMemo(() => getFormattedDate(isoWeekRange.start), [isoWeekRange.start]);
  const formattedIsoEnd = useMemo(() => getFormattedDate(isoWeekRange.end), [isoWeekRange.end]);

  // bornes iso recalculées selon la période choisie pour éviter les soucis timezone
  const formattedIsoStartByState = startDate ? getFormattedDate(startDate) : formattedIsoStart;
  const formattedIsoEndByState = endDate ? getFormattedDate(endDate) : formattedIsoEnd;




  const [stats, setStats] = useState<QRStats>({
    total: 0,
    soumise: 0,
    generee: 0,
    imprimee: 0,
    livree: 0,
    recue: 0
  });

  const [qrQuantities, setQrQuantities] = useState<QRStats>({
    total: 0,
    soumise: 0,
    generee: 0,
    imprimee: 0,
    livree: 0,
    recue: 0
  });

  const [recentDemandes, setRecentDemandes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Tableau Excel (données - à partir des données existantes quand elles sont disponibles)
  // IMPORTANT: la colonne COMMENTAIRES est volontairement vide.
  const [tableData, setTableData] = useState<any[]>([]);
  const [tableTotals, setTableTotals] = useState({ totalQrCodes: 0, totalQrGeneres: 0, pourcentageGlobal: 0 });

  // Tableau d'impression (source: getDataImpressionQr)
  const [impressionTableData, setImpressionTableData] = useState<any[]>([]);


  const handleStartDateChange = (value: DateValue) => {
    if (Array.isArray(value)) {
      if (value.length === 0) setStartDate(null);
      else setStartDate(new Date(value[0]));
    } else if (value instanceof Date) {
      setStartDate(value);
    } else if (typeof value === 'string' && value) {
      setStartDate(new Date(value));
    } else {
      setStartDate(null);
    }
  };

  const handleEndDateChange = (value: DateValue) => {
    if (Array.isArray(value)) {
      if (value.length === 0) setEndDate(null);
      else setEndDate(new Date(value[0]));
    } else if (value instanceof Date) {
      setEndDate(value);
    } else if (typeof value === 'string' && value) {
      setEndDate(new Date(value));
    } else {
      setEndDate(null);
    }
  };

  const handleRefresh = () => window.location.reload();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 0) Tableau des demandes QR (via getAllDataDemandeQr)
        try {
          await axios.get(
            `${urlBase}/api/demandes/getAllDemandes`,
            {
              params: {
                startDate: '2026-01-01',
                endDate: '2026-01-31'
              }
            }
          );
          //  console.log(res.data);

          // NOTE: dataset différent (noms de clés différents).
          // On n’alimente le tableau hebdomadaire que via getAllDataDemandeQr.
          // Le code ci-dessous était conservé mais n’était pas utilisé.
          // const formatted = (res.data?.data || []).map(...)
        } catch (error) {
          console.error('Erreur chargement données getAllDataDemandeQr', error);
        }

        // 1) Stats globales (tuiles)
        let statsUrl = `${urlBase}/api/stats/general`;
        if (startDate && endDate) {
          const formattedStartDate = getFormattedDate(startDate);
          const formattedEndDate = getFormattedDate(endDate);
          statsUrl += `?startDate=${formattedStartDate}&endDate=${formattedEndDate}`;
        }

        const statsResponse = await axios.get(statsUrl);

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

        // 2) Quantités par étape
        let cumulUrl = `${urlBase}/api/demandeQr/getCumulQrCodes`;
        if (startDate && endDate) {
          const formattedStartDate = getFormattedDate(startDate);
          const formattedEndDate = getFormattedDate(endDate);
          cumulUrl += `?startDate=${formattedStartDate}&endDate=${formattedEndDate}`;
        }

        const cumulResponse = await axios.get(cumulUrl);
        const cumulData = cumulResponse.data?.data || {};

        setQrQuantities({
          total:
            (cumulData.soumis || 0) +
            (cumulData.genere || 0) +
            (cumulData.imprime || 0) +
            (cumulData.livree || 0) +
            (cumulData.recue || 0),
          soumise: cumulData.soumis || 0,
          generee: cumulData.genere || 0,
          imprimee: cumulData.imprime || 0,
          livree: cumulData.livree || 0,
          recue: cumulData.recue || 0
        });

        // 3) Dernières demandes
        try {
          const qrListResponse = await axios.get(`${urlBase}/api/demandeQr/getAllDemandesQr`);
          setRecentDemandes(qrListResponse.data);
        } catch (error) {
          console.error('Recent QR list error:', error);
        }

        // 4) Données du tableau (demandes - source: getAllDataDemandeQr)
        try {
          const tableUrl = `${urlBase}/api/demandeQr/getAllDataDemandeQr`;
          const resp = await axios.get(
            `${tableUrl}?startDate=${formattedIsoStartByState}&endDate=${formattedIsoEndByState}`
          );

          const rows = resp.data?.data ?? resp.data ?? [];

          // console.log('[getAllDataDemandeQr] statusResponse', resp.status);
          // console.log('[getAllDataDemandeQr] raw resp.data', resp.data);
          // console.log('[getAllDataDemandeQr] rows length', (rows || []).length);

          const formattedTable = (rows || [])

            .map((item: any) => {
              const statutNorm = (item?.statut ?? '')
                .toString()
                .trim()
                .toLowerCase();

              const pourcentageValue =
                ['generee', 'imprimee', 'recue','livree'].includes(statutNorm) ? 100 : 0;

              const dateValue = item?.date_demande;
              const dateObj = dateValue ? new Date(dateValue) : null;
              const dateFormatted = dateObj && !Number.isNaN(dateObj.getTime())
                ? dateObj.toLocaleDateString('fr-FR')
                : '';

              return {
                demande_id: item.demande_id,
                statut: item.statut,
                total_qr: item.total_qr,
                operateur: item.operateur,
                date_demande: dateFormatted,
                total_genere: item.total_genere,
                pourcentage: pourcentageValue,
              };
            })
            .filter(Boolean);

          setTableData(formattedTable);
        } catch (e) {
          console.error('Erreur mapping tableData:', e);
          setTableData([]);
        }

        // 5) Données du tableau d'impression (source: getDataImpressionQr)
        try {
          const impressionUrl = `${urlBase}/api/demandeQr/getDataImpressionQr`;
          const resp = await axios.get(
            `${impressionUrl}?startDate=${formattedIsoStartByState}&endDate=${formattedIsoEndByState}`
          );

          const apiData = resp.data?.data ?? [];



          console.log('[getDataImpressionQr] resp.data.data length:', Array.isArray(apiData) ? apiData.length : 'not-array');
          if (Array.isArray(apiData) && apiData.length > 0) {
            console.log('[getDataImpressionQr] sample first element keys:', Object.keys(apiData[0] || {}));
            const sampleOps = (apiData[0] as any)?.operateurs;
            console.log('[getDataImpressionQr] sample operateurs:', (sampleOps || []).map((o: any) => o?.operateur));
          }

          // apiData = [{ format_id, format, operateurs: [{ operateur_id, operateur, demandes: [...] }] }]
          // Debug global: voir les libellés exacts envoyés par le backend
          console.log('[impressionTableData] raw apiData =>', apiData);

          setImpressionTableData(apiData || []);

          // setImpressionTableData(apiData);
          setImpressionTableData(apiData);
        } catch (e) {
          console.error('Erreur mapping impressionTableData:', e);
          setImpressionTableData([]);
        }
      } catch (error) {
        console.error('Erreur dashboard QR:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  // Calcul des totaux pour le footer (si on a des données)
  const computedTableTotals = useMemo(() => {
    // tableData est alimenté par getAllDataDemandeQr avec les clés:
    // - total_qr
    // - total_genere
    const totalQrCodes = (tableData || []).reduce(
      (sum, r) => sum + (Number(r.total_qr) || 0),
      0
    );
    const totalQrGeneres = (tableData || []).reduce(
      (sum, r) => sum + (Number(r.total_genere) || 0),
      0
    );
    const pourcentageGlobal =
      totalQrCodes > 0 ? Math.round((totalQrGeneres / totalQrCodes) * 100) : 0;

    return { totalQrCodes, totalQrGeneres, pourcentageGlobal };
  }, [tableData]);

  useEffect(() => {
    setTableTotals(computedTableTotals);
  }, [computedTableTotals]);

  const operateurData = [
    { name: 'Orange', value: qrQuantities.imprimee || 0 },
    { name: 'MTN', value: qrQuantities.livree || 0 },
    { name: 'MOOV', value: qrQuantities.recue || 0 }
  ];

  const formatData = [
    { name: 'format-A', value: qrQuantities.soumise || 0 },
    { name: 'format-B', value: qrQuantities.generee || 0 }
  ];

  const COLORS_OPERATEUR = ['#ff8200', '#ffcc00', '#025ba7', '#4b4b4b'];
  const COLORS_FORMAT = ['#67e6dc', ' #7158e2', '#17c0eb', '#3ae374', '#ffb8b8'];

  // Recharts: on utilise un type implicite (any) pour éviter les erreurs de typage PieLabelRenderProps
  const renderLabel = ((props: any) => {
    const name = props?.name ?? '';

    // IMPORTANT: on veut le % basé sur (total généré opérateur * 100) / total généré global.
    // Recharts calcule `props.percent` avec la somme locale des `value`, donc on n'utilise pas `props.percent`.
    const pctValue = props?.payload?.percentage;

    // percentage est calculé en amont et stocké sous forme string (toFixed(1)) dans operateurData.
    const pct =
      pctValue === null || pctValue === undefined || pctValue === ''
        ? ''
        : `${Number(pctValue)}%`;

    return `${name} ${pct}`.trim();
  }) as unknown as any;




  const exportExcel = async () => {
    // Import dynamique pour corriger l'erreur TypeScript et garantir l'exécution.
    const XLSXmod: any = await import('xlsx');
    const XLSX = XLSXmod?.default ?? XLSXmod;
    const headers = [
      'N° Demande',
      'Statut',
      'Nbre QR Codes',
      'Opérateur',
      'Date Demande',
      'Nbre QR Générés',
      '% QR Générés',
      'Commentaires'
    ];

    const rows = (tableData || []).map((demande) => {
      // L’idée: COMMENTAIRES doit être vide, même si item.commentaire existe.
      // tableData est construit avec les clés backend :
      // - demande_id, statut, total_qr, operateur, date_demande, total_genere, pourcentage
      return {
        'N° Demande': demande.demande_id ?? demande.id ?? '',
        'Statut': demande.statut ?? '',
        'Nbre QR Codes': demande.total_qr ?? demande.quantite_qr ?? '',
        'Opérateur': demande.operateur ?? '',
        'Date Demande': demande.date_demande ?? demande.dateDemande ?? '',
        'Nbre QR Générés': demande.total_genere ?? demande.nbreQrGeneres ?? '',
        '% QR Générés': demande.pourcentage ?? '',
        'Commentaires': ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers, skipHeader: true });

    // On force les en-têtes dans la feuille (pour garder l’ordre exact)
    XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: 'A1' });

    // Footer TOTAL (optionnel mais utile)
    XLSX.utils.sheet_add_aoa(
      worksheet,
      [
        [
          'TOTAL',
          '-',
          tableTotals.totalQrCodes,
          '-',
          '-',
          tableTotals.totalQrGeneres,
          `${tableTotals.pourcentageGlobal}%`,
          ''
        ]
      ],
      { origin: `A${rows.length + 2}` }
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'QR Codes');

    const fileName = `dashboard-qr-${startDate ? getFormattedDate(startDate) : 'all'}-${endDate ? getFormattedDate(endDate) : 'all'}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 flex items-center">
        <svg className="w-8 h-8 mr-3 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z" />
        </svg>
        Dashboard QR Codes
      </h1>

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
            value={startDate ? getFormattedDate(startDate) : ''}
            onChange={handleStartDateChange}
          />
          <DatePicker
            id="date-fin"
            label="Date fin"
            value={endDate ? getFormattedDate(endDate) : ''}
            onChange={handleEndDateChange}
          />

          <button
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium whitespace-nowrap"
            onClick={handleRefresh}
          >
            🔄 Actualiser
          </button>
        </div>
        {loading && <p className="text-center mt-4 text-blue-600 animate-pulse">Chargement des données QR...</p>}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
        <h2 className="text-3xl font-bold mb-8 text-gray-800 flex items-center">Total des demandes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
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

          <div className="group p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 border-l-4 border-emerald-400 rounded-xl shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700">✅ Reçues</p>
                <p className="text-4xl font-bold text-emerald-600">{stats.recue}</p>
              </div>
              <div className="p-3 bg-emerald-200 rounded-full">
                <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
        <h2 className="text-3xl font-bold mb-8 text-gray-800 flex items-center">Quantité de QR Codes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          <div className="group p-6 bg-gradient-to-br from-gray-50 to-gray-100 border-l-4 border-gray-400 rounded-xl shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">📤 Soumis</p>
                <p className="text-4xl font-bold text-gray-600">{qrQuantities.soumise || 0}</p>
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
                <p className="text-sm font-medium text-indigo-700">⚙️ Générés</p>
                <p className="text-4xl font-bold text-indigo-600">{qrQuantities.generee || 0}</p>
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
                <p className="text-sm font-medium text-orange-700">🖨️ Imprimés</p>
                <p className="text-4xl font-bold text-orange-600">{qrQuantities.imprimee || 0}</p>
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
                <p className="text-sm font-medium text-green-700">✅ Livrés</p>
                <p className="text-4xl font-bold text-green-600">{qrQuantities.livree}</p>
              </div>
              <div className="p-3 bg-green-200 rounded-full">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="group p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 border-l-4 border-emerald-400 rounded-xl shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700">✅ Reçus</p>
                <p className="text-4xl font-bold text-emerald-600">{qrQuantities.recue}</p>
              </div>
              <div className="p-3 bg-emerald-200 rounded-full">
                <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* TABLEAU DES DEMANDE SR CODE HEBDOMADAIRE */}
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-green-700">TABLEAU DES DEMANDES DE QR CODE HEBDOMADAIRE
            {/* S {currentWeek} */}
          </h2>
          <button onClick={exportExcel} className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded">
            Télécharger Excel
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border border-gray-300">
            <thead className="bg-green-700 text-white">
              <tr>
                <th className="border p-3">N° DEMANDE</th>
                <th className="border p-3">STATUT</th>
                <th className="border p-3">NBRE QR CODES</th>
                <th className="border p-3">OPERATEUR</th>
                <th className="border p-3">DATE DEMANDE</th>
                <th className="border p-3">NBRE QR GENERES</th>
                <th className="border p-3">% QR GENERES</th>
                <th className="border p-3">COMMENTAIRES</th>
              </tr>
            </thead>

            <tbody>

              {(tableData || []).map((demande: any, index: number) => (
                <tr key={index} className="text-center bg-gray-100">
                  <td className="border p-2">{demande.id ?? demande.demande_id}</td>
                  <td className="border p-2">{demande.statut}</td>
                  <td className="border p-2">{demande.total_qr}</td>
                  <td className="border p-2">{demande.operateur}</td>
                  <td className="border p-2">{demande.date_demande}</td>
                  <td className="border p-2">{demande.total_genere}</td>
                  <td className="border p-2">{demande.pourcentage}%</td>
                  <td className="border p-2"></td>
                </tr>
              ))}
              {(tableData || []).length === 0 && (
                <tr>
                  <td colSpan={8} className="border p-6 text-center text-gray-500">
                    Aucune donnée à exporter pour ce tableau.
                  </td>
                </tr>
              )}
            </tbody>

            <tfoot className="bg-green-600 text-white font-bold">
              <tr>
                <td className="border p-3">TOTAL</td>
                <td className="border p-3">-</td>
                <td className="border p-3">{tableTotals.totalQrCodes}</td>
                <td className="border p-3">-</td>
                <td className="border p-3">-</td>
                <td className="border p-3">{tableTotals.totalQrGeneres}</td>
                <td className="border p-3">{tableTotals.pourcentageGlobal}%</td>
                <td className="border p-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      {/* FIN TABLEAU DES DEMANDE SR CODE HEBDOMADAIRE */}

      {/* TABLEAU DES IMPRESSION DE QR CODE HEBDOMADAIRE */}

      <div className="p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-2xl font-bold text-green-700">
            TABLEAU DES IMPRESSIONS DE QR CODE HEBDOMADAIRE
            {/* S {currentWeek} */}
          </h2>
        </div>

        {(() => {
          const rows = impressionTableData || [];

          const operateurs =
            rows.length > 0
              ? rows[0].operateurs || []
              : [];

          const getBgClass = (index: number) => {
            const colors = [
              "bg-orange-500",
              "bg-yellow-400",
              "bg-blue-800",
            ];

            return colors[index] || "bg-gray-600";
          };

          const sumOperateurField = (
            operateurId: number,
            field: string
          ) => {
            return rows.reduce((acc: number, row: any) => {
              const op = row.operateurs?.find(
                (o: any) => o.operateur_id === operateurId
              );

              return acc + (Number(op?.[field]) || 0);
            }, 0);
          };

          const totalImprimeGeneral = rows.reduce(
            (acc: number, row: any) =>
              acc +
              (row.operateurs || []).reduce(
                (s: number, op: any) =>
                  s + (Number(op.total_imprime) || 0),
                0
              ),
            0
          );

          const totalGenereGeneral = rows.reduce(
            (acc: number, row: any) =>
              acc +
              (row.operateurs || []).reduce(
                (s: number, op: any) =>
                  s + (Number(op.totalGenere) || Number(op.total_genere) || 0),
                0
              ),
            0
          );

          const formatImpressionValue = (value: any) => {
            const n = Number(value);
            if (!Number.isFinite(n) || n === 0) return '-';
            return n;
          };

          const globalPourcentage =
            totalGenereGeneral > 0
              ? (() => {
                const pct = (totalImprimeGeneral / totalGenereGeneral) * 100;
                if (!Number.isFinite(pct) || pct === 0) return '-';
                return `${pct.toFixed(1)}%`;
              })()
              : '-';


          return (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 text-center">
                <thead>
                  <tr className="text-white">
                    <th className="bg-green-700 border px-2 py-1 text-xs">
                      FORMAT
                    </th>

                    {operateurs.map(
                      (operateur: any, index: number) => (
                        <React.Fragment
                          key={operateur.operateur_id}
                        >
                          <th
                            className={`${getBgClass(
                              index
                            )} border px-2 py-1 text-xs`}
                          >
                            N° DEMANDE
                          </th>

                          <th
                            className={`${getBgClass(
                              index
                            )} border px-2 py-1 text-xs`}
                          >
                            {operateur.operateur}
                          </th>

                          <th
                            className={`${getBgClass(
                              index
                            )} border px-2 py-1 text-xs`}
                          >
                            IMPRIMES
                          </th>
                        </React.Fragment>
                      )
                    )}

                    <th className="bg-green-700 border px-2 py-1 text-xs">
                      TOTAL GENERAL
                    </th>

                    <th className="bg-green-700 borderpx-2 py-1 text-xs">
                      % D IMPRESSION
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={
                          1 +
                          operateurs.length * 3 +
                          2
                        }
                        className="border p-6 text-center text-gray-500"
                      >
                        Aucune donnée d'impression pour ce tableau.
                      </td>
                    </tr>
                  )}

                  {rows.map((row: any) => {
                    const totalGenere = (
                      row.operateurs || []
                    ).reduce(
                      (acc: number, op: any) =>
                        acc +
                        (Number(op.total_genere) || 0),
                      0
                    );

                    const totalImprime = (
                      row.operateurs || []
                    ).reduce(
                      (acc: number, op: any) =>
                        acc +
                        (Number(op.total_imprime) || 0),
                      0
                    );

                    const pourcentage =
                      totalGenere > 0
                        ? `${(
                          (totalImprime /
                            totalGenere) *
                          100
                        ).toFixed(1)}%`
                        : "-";

                    return (
                      <tr
                        key={row.format_id}
                        className="bg-gray-100"
                      >
                        <td className="border p-3 font-bold">
                          {row.format}
                        </td>

                        {(row.operateurs || []).map(
                          (op: any) => (
                            <React.Fragment
                              key={op.operateur_id}
                            >
                              <td className="border p-3">
                                {formatImpressionValue(op.total_demandes)}
                              </td>

                              <td className="border p-3">
                                {formatImpressionValue(op.total_genere)}
                              </td>

                              <td className="border p-3">
                                {formatImpressionValue(op.total_imprime)}
                              </td>
                            </React.Fragment>
                          )
                        )}

                        <td className="border p-3 font-semibold">
                          {totalImprime}/{totalGenere}
                        </td>

                        <td className="border p-3 font-bold">
                          {pourcentage}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                <tfoot>
                  <tr className="text-white font-bold">
                    <td className="bg-green-600 border p-3">
                      TOTAL
                    </td>

                    {operateurs.map(
                      (operateur: any, index: number) => (
                        <React.Fragment
                          key={operateur.operateur_id}
                        >
                          <td
                            className={`${getBgClass(
                              index
                            )} border p-3`}
                          >
                            {sumOperateurField(
                              operateur.operateur_id,
                              "total_demandes"
                            )}
                          </td>

                          <td
                            className={`${getBgClass(
                              index
                            )} border p-3`}
                          >
                            {sumOperateurField(
                              operateur.operateur_id,
                              "total_genere"
                            )}
                          </td>

                          <td
                            className={`${getBgClass(
                              index
                            )} border p-3`}
                          >
                            {sumOperateurField(
                              operateur.operateur_id,
                              "total_imprime"
                            )}
                          </td>
                        </React.Fragment>
                      )
                    )}

                    <td className="bg-green-600 border p-3">
                      {formatImpressionValue(totalImprimeGeneral)} /{totalGenereGeneral}
                    </td>

                    <td className="bg-green-600 border p-3">
                      {globalPourcentage}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          );
        })()}
      </div>


      {/* FIN TABLEAU DES IMPRESSION DE QR CODE HEBDOMADAIRE */}

      {/* BILAN D'IMPRESSION DES QR CODE DE LA SEMAINE  */}

      {/* BILAN D'IMPRESSION DES QR CODE DE LA SEMAINE  */}

      <div className="bg-gray-100 min-h-screen p-10">
        <h2 className="text-4xl font-bold text-center mb-16">
          BILAN D'IMPRESSION DES QR CODE DE LA SEMAINE
        </h2>

        {(() => {
          //  Données reçues depuis l'API (formats + opérateurs)
          const rows = impressionTableData || [];

          //  Normalisation des noms opérateurs (regroupement)
          const normalizeOperateur = (name: string) => {
            const n = (name || "").toLowerCase();
            if (n.includes("orange")) return "ORANGE";
            if (n.includes("mtn")) return "MTN";
            if (n.includes("moov")) return "MOOV";
            return "AUTRES";
          };

          //  Agrégation des QR générés par opérateur
          const operateurMap: Record<string, number> = {};

          rows.forEach((f: any) => {
            (f.operateurs || []).forEach((op: any) => {
              const key = normalizeOperateur(op.operateur);

              operateurMap[key] =
                (operateurMap[key] || 0) + (Number(op.total_genere) || 0);
            });
          });

          //  Total global des QR imprimés
          const totalImprimeGlobal = rows.reduce(
            (acc: number, f: any) =>
              acc +
              (f.operateurs || []).reduce(
                (s: number, op: any) => s + (Number(op.total_imprime) || 0),
                0
              ),
            0
          );

          //  Total global des QR générés (basé sur opérateurs agrégés)
          const totalGenereGlobal = Object.values(operateurMap).reduce(
            (acc: number, val: any) => acc + Number(val || 0),
            0
          );

          //  Pourcentage global d'impression
          const pourcentageGlobal =
            totalGenereGlobal > 0
              ? ((totalImprimeGlobal / totalGenereGlobal) * 100).toFixed(1)
              : "0";

          //  Préparation des données pour le graphique "Par opérateur"
          const operateurData = Object.keys(operateurMap).map((name) => {
            const totalOperateur = operateurMap[name];

            const percentage =
              totalGenereGlobal > 0
                ? (totalOperateur * 100) / totalGenereGlobal
                : 0;

            return {
              name,
              value: totalOperateur,
              percentage: Number(percentage.toFixed(1)),
            };
          });

          //  Liste des formats disponibles
          const ALL_FORMATS = rows.map((f: any) => f.format);

          //  Agrégation des impressions par format
         

          //  Préparation des données pour le graphique "Par format"
          // const formatData = ALL_FORMATS.map((name) => ({
          //   name,
          //   value: formatMap[name] || 0,
          // }));
          // 📌 Agrégation des QR générés par format
          const formatMap: Record<string, number> = {};

          rows.forEach((f: any) => {
            const totalGenere = (f.operateurs || []).reduce(
              (s: number, op: any) => s + (Number(op.total_genere) || 0),
              0
            );

            formatMap[f.format] = totalGenere;
          });

          // 📌 Préparation des données pour le graphique "Par format"
          // % format = totalGenere * 100 / totalGenereGlobal
          const formatData = Object.keys(formatMap).map((name) => {
            const totalFormat = formatMap[name];

            const percentage =
              totalGenereGlobal > 0
                ? (totalFormat * 100) / totalGenereGlobal
                : 0;

            return {
              name,
              value: totalFormat,
              percentage: Number(percentage.toFixed(1)),
            };
          });
          return (
            <div>
              {/* 📊 Résumé global */}
              <div className="text-center mb-10">
                <h3 className="text-xl font-bold">
                  Total QR Imprimés : {totalImprimeGlobal}
                </h3>
                <h3 className="text-xl font-bold">
                  % Global Impression : {pourcentageGlobal}%
                </h3>
              </div>

              {/* 📊 Graphiques */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

                {/*  Graphique par opérateur */}
                <div className="bg-gray-200 p-6 shadow-md">
                  <h2 className="text-2xl font-semibold text-center mb-6">
                    PAR OPERATEUR
                  </h2>

                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={operateurData}
                        cx="50%"
                        cy="50%"
                        outerRadius={130}
                        dataKey="value"
                        label={renderLabel}
                        labelLine={true}
                      >
                        {operateurData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              COLORS_OPERATEUR[
                              index % COLORS_OPERATEUR.length
                              ]
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/*  Graphique par format */}
                <div className="bg-gray-200 p-6 shadow-md">
                  <h2 className="text-2xl font-semibold text-center mb-6">
                    PAR FORMAT
                  </h2>

                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={formatData}
                        cx="50%"
                        cy="50%"
                        outerRadius={130}
                        dataKey="value"
                        label={renderLabel}
                        labelLine={true}
                      >
                        {formatData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              COLORS_FORMAT[index % COLORS_FORMAT.length]
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* FIN BILAN D'IMPRESSION DES QR CODE DE LA SEMAINE  */}

      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h3 className="text-xl font-bold mb-6">📋 Dernières Demandes QR (10)</h3>
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
              {recentDemandes.slice(0, 10).map((demande: any) => {
                const statusMap: Record<string, { text: string; color: string }> = {
                  soumise: { text: 'Soumise', color: 'bg-yellow-100 text-yellow-800' },
                  generee: { text: 'Générée', color: 'bg-blue-100 text-blue-800' },
                  imprimee: { text: 'Imprimée', color: 'bg-orange-100 text-orange-800' },
                  livree: { text: 'Livrée', color: 'bg-emerald-100 text-emerald-800' },
                  recue: { text: 'Reçue', color: 'bg-green-100 text-green-800' }
                };

                const status = statusMap[demande.statut] || {
                  text: demande.statut,
                  color: 'bg-gray-100 text-gray-800'
                };

                return (
                  <tr key={demande.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{demande.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${status.color}`}>
                        {status.text}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {demande.forms?.last_modified_at ? format(new Date(demande.forms.last_modified_at), 'yyyy-MM-dd') : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{demande.quantite_qr} QR</td>
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

