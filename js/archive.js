// archive.js — parte do Prosperis (extraído automaticamente, revisar dependências ao editar)

const DASHBOARD_SESSION_KEY = 'dashboard_session_v2';

function saveDashboardSession(){
  try{
    const payload = {
      allTransactions: allTransactions.map(t => ({
        ...t,
        data: t.data instanceof Date ? t.data.toISOString() : t.data
      })),
      currentFileName,
      openingBalance,
      selectedCategory,
      detailsCollapsed,
      detailMode,
      selectedSubcategoryFilter,
      monthFilter: document.getElementById('monthFilter')?.value || 'all',
      detailSearch: document.getElementById('detailSearch')?.value || '',
      categoriesOpen: document.getElementById('categoriesBody')?.style.display !== 'none',
      rulesOpen: document.getElementById('rulesBody')?.style.display !== 'none'
    };
    localStorage.setItem(DASHBOARD_SESSION_KEY, JSON.stringify(payload));
  }catch(e){
    console.error('Erro ao salvar sessão', e);
  }
}

function loadDashboardSession(){
  try{
    const raw = localStorage.getItem(DASHBOARD_SESSION_KEY);
    if(!raw){
      const archive = loadMonthArchive();
      if (Object.keys(archive).length){
        rebuildAllTransactionsFromArchive();
        currentFileName = 'Histórico salvo';
        renderMonthFilter();
        renderAll();
        return true;
      }
      return false;
    }
    const payload = JSON.parse(raw);
    allTransactions = Array.isArray(payload.allTransactions) ? payload.allTransactions.map(t => ({
      ...t,
      subcategoria: t.subcategoria || '',
      isInstallment: !!t.isInstallment,
      installmentGroup: t.installmentGroup || '',
      installmentNumber: Number(t.installmentNumber || 0),
      installmentTotal: Number(t.installmentTotal || 0),
      data: new Date(t.data)
    })) : [];
    currentFileName = payload.currentFileName || 'Extrato salvo';
    openingBalance = Number(payload.openingBalance || 0);
    selectedCategory = payload.selectedCategory || null;
    detailsCollapsed = !!payload.detailsCollapsed;
    detailMode = payload.detailMode || 'rows';
    selectedSubcategoryFilter = payload.selectedSubcategoryFilter || '';

    const archive = loadMonthArchive();
    if (Object.keys(archive).length){
      const archiveMonths = Object.keys(archive);
      const sessionMonths = [...new Set(allTransactions.map(t => monthKey(t.data)))];
      if (archiveMonths.length > sessionMonths.length){
        rebuildAllTransactionsFromArchive();
        currentFileName = payload.currentFileName || 'Histórico salvo';
      }
    }

    renderMonthFilter();

    const monthFilterEl = document.getElementById('monthFilter');
    if(monthFilterEl && payload.monthFilter && [...monthFilterEl.options].some(o => o.value === payload.monthFilter)){
      monthFilterEl.value = payload.monthFilter;
    }

    const detailSearchEl = document.getElementById('detailSearch');
    if(detailSearchEl) detailSearchEl.value = payload.detailSearch || '';
    selectedSubcategoryFilter = payload.selectedSubcategoryFilter || '';

    const categoriesBody = document.getElementById('categoriesBody');
    const toggleCategoriesBtn = document.getElementById('toggleCategoriesBtn');
    if(categoriesBody && toggleCategoriesBtn){
      categoriesBody.style.display = payload.categoriesOpen ? 'block' : 'none';
      toggleCategoriesBtn.textContent = payload.categoriesOpen ? 'Fechar' : 'Expandir';
    }

    const rulesBody = document.getElementById('rulesBody');
    const toggleRulesBtn = document.getElementById('toggleRulesBtn');
    if(rulesBody && toggleRulesBtn){
      rulesBody.style.display = payload.rulesOpen ? 'block' : 'none';
      toggleRulesBtn.textContent = payload.rulesOpen ? 'Fechar' : 'Expandir';
    }

    renderAll();
    return true;
  }catch(e){
    console.error('Erro ao carregar sessão', e);
    return false;
  }
}

function clearDashboardSession(){
  try{
    localStorage.removeItem(DASHBOARD_SESSION_KEY);
  }catch(e){
    console.error('Erro ao limpar sessão', e);
  }
}

const MONTH_ARCHIVE_KEY = 'dashboard_month_archive_v1';

function formatMonthKey(date){
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

function parseMonthLabel(key){
  const [y,m] = key.split('-');
  return new Date(Number(y), Number(m)-1, 1).toLocaleDateString('pt-BR',{month:'long', year:'numeric'});
}

function loadMonthArchive(){
  try{
    const raw = localStorage.getItem(MONTH_ARCHIVE_KEY);
    return raw ? JSON.parse(raw) : {};
  }catch(e){ return {}; }
}

function saveMonthArchive(archive){
  localStorage.setItem(MONTH_ARCHIVE_KEY, JSON.stringify(archive));
}

function refreshSavedMonthSelect(){
  const sel = document.getElementById('savedMonthSelect');
  if (!sel) return;
  const archive = loadMonthArchive();
  const keys = Object.keys(archive).sort().reverse();
  sel.innerHTML = '<option value="">Histórico salvo</option>' + keys.map(k => `<option value="${k}">${parseMonthLabel(k)}</option>`).join('');
}

function buildMonthPayload(monthKey){
  const rows = allTransactions.filter(t => formatMonthKey(t.data) === monthKey).map(t => ({
    ...t,
    data: t.data instanceof Date ? t.data.toISOString() : t.data
  }));
  return {
    monthKey,
    openingBalance: getOpeningBalanceForFilter(monthKey),
    transactions: rows,
    savedAt: new Date().toISOString()
  };
}

function saveCurrentDisplayedMonth(){
  const selected = document.getElementById('monthFilter')?.value || 'all';
  const candidate = selected !== 'all' ? selected : (allTransactions[0] ? formatMonthKey(allTransactions[0].data) : '');
  if (!candidate){
    alert('Não há mês carregado para salvar.');
    return;
  }
  const archive = loadMonthArchive();
  archive[candidate] = buildMonthPayload(candidate);
  saveMonthArchive(archive);
  refreshSavedMonthSelect();
  alert(`Mês ${parseMonthLabel(candidate)} salvo no histórico.`);
}

function loadSavedMonth(monthKey){
  const archive = loadMonthArchive();
  const payload = archive[monthKey];
  if (!payload) return false;

  rebuildAllTransactionsFromArchive();
  currentFileName = `Histórico ${parseMonthLabel(monthKey)}`;
  renderMonthFilter();
  const mf = document.getElementById('monthFilter');
  if (mf && [...mf.options].some(o => o.value === monthKey)) mf.value = monthKey;
  renderAll();
  return true;
}

function ensureMonthAutoSaved(){
  const months = [...new Set(allTransactions.map(t => formatMonthKey(t.data)))];
  if (!months.length) return;
  const archive = loadMonthArchive();
  months.forEach(m => { archive[m] = buildMonthPayload(m); });
  saveMonthArchive(archive);
  refreshSavedMonthSelect();
}

function rebuildAllTransactionsFromArchive(){
  const archive = loadMonthArchive();
  const months = Object.keys(archive).sort();
  const merged = [];
  months.forEach(m => {
    (archive[m].transactions || []).forEach(t => {
      merged.push({
        ...t,
        data: new Date(t.data)
      });
    });
  });
  merged.sort((a,b) => a.data - b.data || a.descricao.localeCompare(b.descricao));
  allTransactions = merged;
  if (months.length){
    const firstMonth = months[0];
    if (archive[firstMonth] && archive[firstMonth].openingBalance !== undefined){
      openingBalance = Number(archive[firstMonth].openingBalance || 0);
    }
  }
}

function getArchiveMonthKeys(){
  const archive = loadMonthArchive();
  return Object.keys(archive).sort().reverse();
}

function getMonthStatsFromArchive(monthKeyValue){
  const archive = loadMonthArchive();
  const payload = archive[monthKeyValue];
  if (!payload) return monthStats(monthKeyValue);
  const rows = (payload.transactions || []).map(t => ({
    ...t,
    subcategoria: t.subcategoria || '',
    isInstallment: !!t.isInstallment,
    installmentGroup: t.installmentGroup || '',
    installmentNumber: Number(t.installmentNumber || 0),
    installmentTotal: Number(t.installmentTotal || 0),
    data:new Date(t.data)
  }));
  const income = rows.filter(t => t.valor > 0).reduce((s,t) => s + t.valor, 0);
  const expense = rows.filter(t => t.valor < 0).reduce((s,t) => s + Math.abs(t.valor), 0);
  const opening = getOpeningBalanceForFilter(monthKeyValue);
  const balance = opening + income - expense;
  return { rows, income, expense, opening, balance };
}

function autoCloseMonthIfNeeded(){
  try{
    if(!Array.isArray(allTransactions)) return;

    const now = new Date();
    const currentMonth = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0");

    // pegar meses existentes
    const months = [...new Set(allTransactions.map(t => monthKey(t.data)))].sort();
    if(!months.length) return;

    const lastMonth = months[months.length - 1];

    // se mudou o mês e ainda não existe registro no novo mês
    if(currentMonth !== lastMonth){
      const existsCurrent = months.includes(currentMonth);
      if(!existsCurrent){
        console.log("Novo mês detectado:", currentMonth);

        // copiar metas do mês anterior (se existir função)
        try{
          if(typeof copyPrevBudgetBtn !== "undefined"){
            // apenas mantém metas existentes
          }
        }catch(e){}

        // apenas atualiza seletor e salva sessão
        refreshSavedMonthSelect();
        saveDashboardSession();
      }
    }
  }catch(e){
    console.error("Erro no fechamento automático:", e);
  }
}

document.addEventListener("DOMContentLoaded", function(){
  setTimeout(autoCloseMonthIfNeeded, 500);
});
