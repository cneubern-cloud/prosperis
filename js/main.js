// main.js — parte do Prosperis (extraído automaticamente, revisar dependências ao editar)

document.getElementById('fileInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file){ clearAll(); return; }
  currentFileName = file.name;
  const ext = file.name.split('.').pop().toLowerCase();
  const reader = new FileReader();
  reader.onload = (event) => {
    try{
      let rows;
      if (ext === 'csv'){
        const workbook = XLSX.read(event.target.result, { type:'string', raw:false });
        rows = extractRowsFromWorkbook(workbook);
      } else {
        const workbook = XLSX.read(event.target.result, { type:'array', raw:false, cellDates:true });
        rows = extractRowsFromWorkbook(workbook);
      }
      allTransactions = parseItauRows(rows);
      renderMonthFilter();
      selectedCategory = CATEGORY_RULES.find(c => c.name !== 'Receitas')?.name || null;
      document.getElementById('detailSearch').value = '';
      renderAll();
    } catch (err){
      console.error(err);
      alert('Não consegui ler esse extrato.');
      clearAll();
    }
  };
  if (ext === 'csv') reader.readAsText(file, 'utf-8'); else reader.readAsArrayBuffer(file);
});

document.getElementById('monthFilter').addEventListener('change', () => { renderAll(); });

document.getElementById('resetBtn').addEventListener('click', () => { document.getElementById('fileInput').value = ''; clearAll(); });

document.getElementById('detailSearch').addEventListener('input', () => renderCategoryDetail(filteredTransactions()));

document.getElementById('detailSubcategoryFilter').addEventListener('change', (e) => {
  selectedSubcategoryFilter = e.target.value || '';
  renderCategoryDetail(filteredTransactions());
  saveDashboardSession();
});

document.getElementById('toggleDetailBtn').addEventListener('click', () => { detailsCollapsed = !detailsCollapsed; renderCategoryDetail(filteredTransactions()); });

document.getElementById('toggleViewBtn').addEventListener('click', () => { detailMode = detailMode === 'rows' ? 'days' : 'rows'; renderCategoryDetail(filteredTransactions()); });

document.getElementById('detailCategoryAction').addEventListener('change', (e) => {
  const newCat = e.target.value;
  if (!newCat || !selectedCategory) return;
  const rows = getCurrentCategoryRows(filteredTransactions());
  rows.forEach(row => {
    const i = allTransactions.indexOf(row);
    if (i >= 0){ learnRuleFromDescription(allTransactions[i].descricao, newCat); allTransactions[i].categoria = newCat; }
  });
  e.target.value = ''; renderAll();
});

document.getElementById('addCategoryBtn').addEventListener('click', () => {
  CATEGORY_RULES.push({ name:'Nova categoria', icon:'✨', keywords:[], budget:0 }); saveCategories(); renderAll();
});

document.getElementById('clearRulesBtn').addEventListener('click', () => { learnedRules = []; saveLearnedRules(); renderRuleList(); });

document.getElementById('toggleCategoriesBtn').addEventListener('click', () => {
  const body = document.getElementById('categoriesBody');
  const btn = document.getElementById('toggleCategoriesBtn');
  if (body.style.display === 'none'){ body.style.display = 'block'; btn.textContent = 'Fechar'; }
  else { body.style.display = 'none'; btn.textContent = 'Expandir'; }
});

document.getElementById('toggleRulesBtn').addEventListener('click', () => {
  const body = document.getElementById('rulesBody');
  const btn = document.getElementById('toggleRulesBtn');
  if (body.style.display === 'none'){ body.style.display = 'block'; btn.textContent = 'Fechar'; }
  else { body.style.display = 'none'; btn.textContent = 'Expandir'; }
});

refreshSavedMonthSelect();

document.getElementById('addExpenseBtn').addEventListener('click', () => openEntryModal('expense'));

document.getElementById('addIncomeBtn').addEventListener('click', () => openEntryModal('income'));

document.getElementById('saveMonthBtn').addEventListener('click', saveCurrentDisplayedMonth);

document.getElementById('savedMonthSelect').addEventListener('change', (e) => {
  if (e.target.value) loadSavedMonth(e.target.value);
});

document.getElementById('entryType').addEventListener('change', (e) => refreshEntryCategoryOptions(e.target.value));

document.getElementById('saveEntryBtn').addEventListener('click', saveManualEntry);

document.getElementById('cancelEntryBtn').addEventListener('click', closeEntryModal);

document.getElementById('closeEntryModalBtn').addEventListener('click', closeEntryModal);

document.addEventListener('keydown', function(e){
  if (e.key === 'Escape'){
    const modal = document.getElementById('entryModal');
    if (modal && modal.style.display === 'flex'){
      modal.style.display = 'none';
    }
  }
});

document.getElementById('entryModal').addEventListener('click', (e) => {
  if (e.target.id === 'entryModal') closeEntryModal();
});

document.getElementById('totalBudgetInput').addEventListener('input', () => {
  setMonthlyTotalBudget(getEffectiveBudgetMonth(), Number(document.getElementById('totalBudgetInput').value || 0));
  renderBudgetDistribution();
});

document.getElementById('copyPrevBudgetBtn').addEventListener('click', copyPreviousMonthBudget);

document.addEventListener('keydown', function(e){
  if (e.key === 'Escape'){
    closeDetailModal();
  }
});
