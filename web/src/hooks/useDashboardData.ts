import { useState, useEffect, useMemo } from 'react';
import { ApiService, MapPoint } from '../services/api';

export function useDashboardData() {
  const [allMapPoints, setAllMapPoints] = useState<MapPoint[]>([]);
  const [globalTopExpenses, setGlobalTopExpenses] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initData() {
      try {
        const [mapPoints, expenses] = await Promise.all([
          ApiService.fetchMapPoints(),
          ApiService.fetchRankingExpenses()
        ]);
        setAllMapPoints(mapPoints);
        setGlobalTopExpenses(expenses);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }
    initData();
  }, []);

  const filteredData = useMemo(() => {
    const safePoints = Array.isArray(allMapPoints) ? allMapPoints : [];
    const safeTopExpenses = Array.isArray(globalTopExpenses) ? globalTopExpenses : [];

    let points = [...safePoints];

    if (selectedYear !== 'ALL') {
      points = points.filter(p => {
        if (!p) return false;
        const dateStr = String(p.reference_date || '');
        // Se for ISO string (2026-01-01...), pega os 4 primeiros
        // Se for string de data formatada ou objeto Date convertido, procura o ano
        return dateStr.includes(selectedYear);
      });
    }

    if (selectedSector) {
      points = points.filter(p => p && p.sector === selectedSector);
    }
    
    // Calcula Resumo (KPIs)
    const totalSpent = points.reduce((acc, p) => acc + Number(p?.contract_value || 0), 0);
    const uniqueCompanies = new Set(points.map(p => p?.company_name).filter(Boolean)).size;
    const uniqueAgencies = new Set(points.map(p => p?.agency).filter(Boolean)).size;

    // Calcula Rankings (Empresas)
    const companyMap: Record<string, number> = {};
    points.forEach(p => {
      if (!p || !p.company_name) return;
      companyMap[p.company_name] = (companyMap[p.company_name] || 0) + Number(p.contract_value || 0);
    });
    const topCompanies = Object.entries(companyMap)
      .map(([name, value]) => ({ company_name: name, total_received: value }))
      .sort((a, b) => Number(b.total_received) - Number(a.total_received))
      .slice(0, 10);

    // Calcula Rankings (Órgãos)
    const agencyMap: Record<string, number> = {};
    points.forEach(p => {
      if (!p || !p.agency) return;
      agencyMap[p.agency] = (agencyMap[p.agency] || 0) + Number(p.contract_value || 0);
    });
    const topAgencies = Object.entries(agencyMap)
      .map(([name, value]) => ({ agency: name, total_spent: value }))
      .sort((a, b) => Number(b.total_spent) - Number(a.total_spent))
      .slice(0, 10);

    // Maiores Despesas Individuais (Empenhos Reais) - Segura contra nulos
    const topExpensesList = safeTopExpenses
      .filter(e => e && e.description)
      .map(e => ({
        description: e.description,
        total_spent: e.amount || 0,
        company_name: e.company_name || 'N/A',
        agency: e.agency || 'N/A',
        type: e.type,
        latitude: e.latitude,
        longitude: e.longitude
      }));

    // Calcula Lista de Setores baseada nos pontos TOTAIS do ano selecionado
    const sectorSource = selectedYear === 'ALL' 
      ? safePoints 
      : safePoints.filter(p => p && String(p.reference_date || '').includes(selectedYear));
    
    const sectorMap: Record<string, { count: number, total: number }> = {};
    sectorSource.forEach(p => {
      if (!p || !p.sector) return;
      if (!sectorMap[p.sector]) sectorMap[p.sector] = { count: 0, total: 0 };
      sectorMap[p.sector].count++;
      sectorMap[p.sector].total += Number(p.contract_value || 0);
    });
    
    const sectorList = Object.entries(sectorMap).map(([name, stat]) => ({
      name,
      count: stat.count,
      total: String(stat.total)
    })).sort((a, b) => Number(b.total) - Number(a.total));

    return {
      points,
      summary: {
        total_spent: String(totalSpent),
        contracts_count: String(points.length),
        companies_count: String(uniqueCompanies),
        agencies_count: String(uniqueAgencies)
      },
      topCompanies,
      topAgencies,
      topExpenses: topExpensesList,
      sectorList
    };
  }, [allMapPoints, globalTopExpenses, selectedYear, selectedSector]);

  return {
    allMapPoints,
    filteredData,
    selectedYear,
    setSelectedYear,
    selectedSector,
    setSelectedSector,
    loading,
    error
  };
}
