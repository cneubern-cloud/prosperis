// ui-modals.js — parte do Prosperis (extraído automaticamente, revisar dependências ao editar)

let selectedCategory = null;

let selectedSubcategoryFilter = '';

let detailsCollapsed = false;

let detailMode = 'rows';

function refreshEntryCategoryOptions(type='expense'){
  const sel = document.getElementById('entryCategory');
  if (!sel) return;
  const cats = type === 'income'
    ? CATEGORY_RULES
    : CATEGORY_RULES.filter(c => c.name !== 'Receitas');
  sel.innerHTML = cats.map(c => `<option value="${c.name}">${c.icon} ${c.name}</option>`).join('');
  if (type === 'income' && [...sel.options].some(o => o.value === 'Receitas')) sel.value = 'Receitas';
}

function openEntryModal(type='expense'){
  const modal = document.getElementById('entryModal');
  document.getElementById('entryModalTitle').textContent = type === 'income' ? 'Nova receita' : 'Nova despesa';
  document.getElementById('entryType').value = type;
  document.getElementById('entryDate').value = new Date().toISOString().slice(0,10);
  document.getElementById('entryDescription').value = '';
  document.getElementById('entrySubcategory').value = '';
  document.getElementById('entryValue').value = '';
  refreshEntryCategoryOptions(type);
  modal.style.display = 'flex';
}

function closeEntryModal(){
  document.getElementById('entryModal').style.display = 'none';
}

function saveManualEntry(){
  const type = document.getElementById('entryType').value;
  const dateRaw = document.getElementById('entryDate').value;
  const description = document.getElementById('entryDescription').value.trim();
  const category = document.getElementById('entryCategory').value;
  const subcategory = document.getElementById('entrySubcategory').value.trim();
  const valueRaw = Number(document.getElementById('entryValue').value || 0);
  if (!dateRaw || !description || !valueRaw){
    alert('Preencha data, descrição e valor.');
    return;
  }
  const date = new Date(dateRaw + 'T00:00:00');
  const value = type === 'income' ? Math.abs(valueRaw) : -Math.abs(valueRaw);
  allTransactions.push({
    data: date,
    descricao: description,
    valor: value,
    categoria: type === 'income' ? 'Receitas' : category,
    subcategoria: subcategory,
    tipo: type === 'income' ? 'Entrada' : 'Saída',
    futuro: false
  });
  allTransactions.sort((a,b) => a.data - b.data || a.descricao.localeCompare(b.descricao));
  currentFileName = currentFileName === 'Nenhum' ? 'Lançamentos manuais' : currentFileName;
  renderMonthFilter();
  const mf = document.getElementById('monthFilter');
  const mk = formatMonthKey(date);
  if (mf && [...mf.options].some(o => o.value === mk)) mf.value = mk;
  closeEntryModal();
  renderAll();
  ensureMonthAutoSaved();
}

function categoryOptionsHtml(selected){
  return CATEGORY_RULES.filter(c => c.name !== 'Receitas').map(c =>
    `<option value="${c.name}" ${selected === c.name ? 'selected' : ''}>${c.icon} ${c.name}</option>`
  ).join('');
}

function populateCategoryActionSelect(){
  const sel = document.getElementById('detailCategoryAction');
  sel.innerHTML = '<option value="">Alterar categoria dos itens filtrados…</option>' +
    CATEGORY_RULES.filter(c => c.name !== 'Receitas').map(c => `<option value="${c.name}">${c.icon} ${c.name}</option>`).join('');
}

function renderCategoryDetail(data){
  const title = document.getElementById('detailTitle'), status = document.getElementById('detailStatus'),
        budgetEl = document.getElementById('detailBudget'), spentEl = document.getElementById('detailSpent'),
        remainingEl = document.getElementById('detailRemaining'), daysEl = document.getElementById('detailDays'),
        table = document.getElementById('detailTable'), note = document.getElementById('detailNote'),
        dayView = document.getElementById('detailDayView'), tableWrap = document.getElementById('detailTableWrap'),
        detailContent = document.getElementById('detailContent'),
        toggleBtn = document.getElementById('toggleDetailBtn'), toggleViewBtn = document.getElementById('toggleViewBtn'),
        subcategoryFilter = document.getElementById('detailSubcategoryFilter'),
        subGoalsTable = document.getElementById('subcategoryGoalsTable');

  toggleBtn.textContent = detailsCollapsed ? 'Expandir detalhes' : 'Recolher detalhes';
  toggleViewBtn.textContent = detailMode === 'rows' ? 'Ver total por dia' : 'Ver lançamentos';
  detailContent.style.display = detailsCollapsed ? 'none' : 'block';

  if (!selectedCategory){
    title.textContent = 'Selecione uma categoria';
    status.textContent = '—'; status.className = 'pill';
    budgetEl.textContent = formatBRL(0); spentEl.textContent = formatBRL(0); remainingEl.textContent = formatBRL(0); daysEl.textContent = '0';
    table.innerHTML = '<tr><td colspan="6" class="empty">Sem categoria selecionada.</td></tr>';
    if (subGoalsTable) subGoalsTable.innerHTML = '<tr><td colspan="5" class="empty">Sem categoria selecionada.</td></tr>';
    if (subcategoryFilter) subcategoryFilter.innerHTML = '<option value="">Todas as subcategorias</option>';
    dayView.innerHTML = '';
    note.textContent = 'Clique em um card acima para ver os lançamentos daquela categoria.';
    return;
  }

  const icon = CATEGORY_RULES.find(c => c.name === selectedCategory)?.icon || '📌';
  const categoryRows = data.filter(t => t.categoria === selectedCategory);
  const foundSubcats = [...new Set(categoryRows.map(t => (t.subcategoria || '').trim()).filter(Boolean))];
  const manualSubcats = getManualSubcategories(selectedCategory);
  const subcats = [...new Set([...foundSubcats, ...manualSubcats])].sort((a,b) => a.localeCompare(b,'pt-BR'));

  if (subcategoryFilter){
    const current = selectedSubcategoryFilter || '';
    subcategoryFilter.innerHTML = '<option value="">Todas as subcategorias</option>' +
      subcats.map(s => `<option value="${s}">${s}</option>`).join('');
    if ([...subcategoryFilter.options].some(o => o.value === current)) subcategoryFilter.value = current;
    else {
      selectedSubcategoryFilter = '';
      subcategoryFilter.value = '';
    }
  }

  const rows = getCurrentCategoryRows(data);
  const baseRows = selectedSubcategoryFilter
    ? categoryRows.filter(t => (t.subcategoria || '') === selectedSubcategoryFilter)
    : categoryRows;

  const spent = baseRows.filter(t => t.valor < 0).reduce((s,t) => s + Math.abs(t.valor), 0);
  const incomes = baseRows.filter(t => t.valor > 0).reduce((s,t) => s + t.valor, 0);
  const isReceita = selectedCategory === 'Receitas';
  const budget = selectedSubcategoryFilter ? getSubcategoryBudget(selectedCategory, selectedSubcategoryFilter) : budgetFor(selectedCategory);
  const remaining = budget - spent;
  const st = statusFor(spent, budget);
  const uniqueDays = new Set(baseRows.map(t => t.data.toISOString().slice(0,10)));

  title.textContent = `${icon} ${selectedCategory}${selectedSubcategoryFilter ? ' • ' + selectedSubcategoryFilter : ''}`;
  status.textContent = isReceita ? 'Entradas' : (selectedSubcategoryFilter ? (budget > 0 ? st.text : 'Sem meta') : st.text);
  status.className = `pill ${isReceita ? 'good' : st.cls}`;
  budgetEl.textContent = isReceita ? formatBRL(incomes) : formatBRL(budget);
  spentEl.textContent = isReceita ? formatBRL(incomes) : formatBRL(spent);
  remainingEl.textContent = isReceita ? formatBRL(0) : formatBRL(remaining);
  remainingEl.className = `small-value ${isReceita ? 'good' : (remaining >= 0 ? 'good' : 'bad')}`;
  daysEl.textContent = uniqueDays.size;

  tableWrap.style.display = detailMode === 'rows' ? 'block' : 'none';
  dayView.style.display = detailMode === 'days' ? 'block' : 'none';

  table.innerHTML = rows.map(t => {
    const idx = allTransactions.indexOf(t);
    return `<tr>
      <td>${t.data.toLocaleDateString('pt-BR')}</td>
      <td>${t.descricao}</td>
      <td><select data-row-category="${idx}" style="min-height:30px;padding:5px 7px;font-size:12px">${categoryOptionsHtml(t.categoria)}</select></td>
      <td><input type="text" data-row-subcategory="${idx}" value="${t.subcategoria || ''}" placeholder="Subcategoria" style="min-height:30px;padding:5px 7px;font-size:12px;width:100%" /></td>
      <td class="${t.valor >= 0 ? 'good' : 'bad'}">${formatBRL(Math.abs(t.valor))}</td>
      <td><button class="danger" data-row-delete="${idx}" style="min-height:30px;padding:5px 8px;font-size:11px">Excluir</button></td>
    </tr>`;
  }).join('') || '<tr><td colspan="6" class="empty">Nenhum lançamento encontrado para esse filtro.</td></tr>';

  table.querySelectorAll('select[data-row-category]').forEach(sel => {
    sel.addEventListener('change', e => {
      const i = Number(e.target.dataset.rowCategory), newCat = e.target.value;
      learnRuleFromDescription(allTransactions[i].descricao, newCat);
      allTransactions[i].categoria = newCat;
      renderAll();
      renderRuleList();
    });
  });

  table.querySelectorAll('input[data-row-subcategory]').forEach(inp => {
    inp.addEventListener('change', e => {
      const i = Number(e.target.dataset.rowSubcategory);
      allTransactions[i].subcategoria = e.target.value.trim();
      renderAll();
    });
  });

  table.querySelectorAll('button[data-row-delete]').forEach(btn => {
    btn.addEventListener('click', e => {
      const i = Number(e.target.dataset.rowDelete);
      allTransactions.splice(i, 1);
      renderAll();
    });
  });

  const dayMap = {};
  rows.forEach(t => {
    const key = t.data.toLocaleDateString('pt-BR');
    if (!dayMap[key]) dayMap[key] = { total:0, items:[] };
    dayMap[key].total += Math.abs(t.valor);
    dayMap[key].items.push(t);
  });

  const dayEntries = Object.entries(dayMap).sort((a,b) => {
    const [da,ma,ya] = a[0].split('/'), [db,mb,yb] = b[0].split('/');
    return new Date(`${yb}-${mb}-${db}`) - new Date(`${ya}-${ma}-${da}`);
  });

  dayView.innerHTML = dayEntries.length ? `<div class="day-list">${
    dayEntries.map(([day, info]) => `<div class="day-item"><div class="day-top"><strong>${day}</strong><span class="${isReceita ? 'good' : 'bad'}">${formatBRL(info.total)}</span></div><div class="footer-note">${info.items.length} lançamento(s)</div></div>`).join('')
  }</div>` : '<div class="empty">Nenhum total diário para mostrar.</div>';

  if (subGoalsTable){
    const expenseRows = categoryRows.filter(t => t.valor < 0);
    const summary = {};
    expenseRows.forEach(t => {
      const key = (t.subcategoria || '').trim() || 'Sem subcategoria';
      if (!summary[key]) summary[key] = 0;
      summary[key] += Math.abs(t.valor);
    });
    const names = [...new Set([...Object.keys(summary), ...subcats])]
      .map(name => {
        const realName = name === 'Sem subcategoria' ? '' : name;
        const budgetSub = getSubcategoryBudget(selectedCategory, realName);
        const spentSub = summary[name] || 0;
        let rank = 3;
        if (budgetSub > 0 && spentSub >= budgetSub) rank = 0;
        else if (budgetSub > 0 && spentSub >= budgetSub * 0.8) rank = 1;
        else if (budgetSub > 0) rank = 2;
        else if (spentSub > 0) rank = 0;
        else rank = 4;
        return { name, realName, budgetSub, spentSub, rank };
      })
      .sort((a,b) => a.rank - b.rank || b.spentSub - a.spentSub || a.name.localeCompare(b.name,'pt-BR'));

    subGoalsTable.innerHTML = names.length ? names.map(item => {
      const name = item.name;
      const realName = item.realName;
      const budgetSub = item.budgetSub;
      const spentSub = item.spentSub;
      const remainSub = budgetSub - spentSub;
      return `<tr>
        <td>${name}</td>
        <td><input type="number" min="0" step="0.01" value="${budgetSub}" data-subcat-budget="${realName}" style="min-height:30px;padding:5px 7px;font-size:12px;width:110px" /></td>
        <td class="bad">${formatBRL(spentSub)}</td>
        <td class="${remainSub >= 0 ? 'good' : 'bad'}">${formatBRL(remainSub)}</td>
        <td><span class="pill ${budgetSub > 0 ? (spentSub >= budgetSub ? 'bad' : (spentSub >= budgetSub * 0.8 ? 'warn' : 'good')) : (spentSub > 0 ? 'bad' : '')}">${budgetSub > 0 ? (spentSub >= budgetSub ? 'Meta estourada' : (spentSub >= budgetSub * 0.8 ? 'Perto do limite' : 'Dentro da meta')) : (spentSub > 0 ? 'Meta estourada' : 'Sem meta')}</span></td>
        <td><button class="danger" data-subcat-delete="${realName}" style="min-height:28px;padding:4px 8px;font-size:11px">Excluir</button></td>
      </tr>`;
    }).join('') : '<tr><td colspan="6" class="empty">Nenhuma subcategoria encontrada.</td></tr>';

    subGoalsTable.querySelectorAll('input[data-subcat-budget]').forEach(inp => {
      inp.addEventListener('change', e => {
        setSubcategoryBudget(selectedCategory, e.target.dataset.subcatBudget, e.target.value);
        renderCategoryDetail(filteredTransactions());
        saveDashboardSession();
      });
    });

    const toggleBtnAdd = document.getElementById('toggleAddSubcategoryBtn');
    const addBox = document.getElementById('addSubcategoryBox');
    const addBtn = document.getElementById('addSubcategoryBtn');
    const nameInput = document.getElementById('newSubcategoryName');
    const budgetInput = document.getElementById('newSubcategoryBudget');

    if (toggleBtnAdd && addBox){
      toggleBtnAdd.onclick = () => {
        const open = addBox.style.display !== 'none';
        addBox.style.display = open ? 'none' : 'block';
        if (!open && nameInput) nameInput.focus();
      };
    }

    subGoalsTable.querySelectorAll('button[data-subcat-delete]').forEach(btn => {
      btn.addEventListener('click', e => {
        const name = e.target.dataset.subcatDelete;
        if (!confirm('Excluir esta subcategoria e sua meta?')){
          return;
        }
        removeManualSubcategory(selectedCategory, name);
        selectedSubcategoryFilter = '';
        renderCategoryDetail(filteredTransactions());
        saveDashboardSession();
      });
    });

    if (addBtn){
      addBtn.onclick = () => {
        const name = (nameInput?.value || '').trim();
        const budgetValue = budgetInput?.value || 0;
        if (!name){
          alert('Digite o nome da subcategoria.');
          return;
        }
        addManualSubcategory(selectedCategory, name);
        setSubcategoryBudget(selectedCategory, name, budgetValue);
        if (nameInput) nameInput.value = '';
        if (budgetInput) budgetInput.value = '';
        if (addBox) addBox.style.display = 'none';
        selectedSubcategoryFilter = '';
        renderCategoryDetail(filteredTransactions());
        saveDashboardSession();
      };
    }
  }

  if (!baseRows.length) note.textContent = `Não houve lançamentos em ${selectedCategory}${selectedSubcategoryFilter ? ' / ' + selectedSubcategoryFilter : ''} no período filtrado.`;
  else if (rows.length !== baseRows.length && document.getElementById('detailSearch').value.trim()) note.textContent = `Mostrando ${rows.length} de ${baseRows.length} lançamento(s) após a busca.`;
  else note.textContent = `Mostrando ${rows.length} lançamento(s) de ${selectedCategory}${selectedSubcategoryFilter ? ' / ' + selectedSubcategoryFilter : ''}.`;
}

function renderCategoryConfig(){
  const box = document.getElementById('categoryConfigList');
  box.innerHTML = CATEGORY_RULES.map((cat, idx) => `
    <div class="category-item">
      <input type="text" value="${cat.icon}" data-cat-icon="${idx}" />
      <input type="text" value="${cat.name}" data-cat-name="${idx}" />
      <input type="color" value="${cat.color || '#64748b'}" data-cat-color="${idx}" title="Cor da categoria" style="width:52px;padding:4px" />
      <input type="number" min="0" step="0.01" value="${cat.budget || 0}" data-cat-budget="${idx}" />
      <input type="text" value="${(cat.keywords || []).join(', ')}" data-cat-keywords="${idx}" placeholder="palavras-chave separadas por vírgula" />
      <button class="danger" data-cat-delete="${idx}" ${cat.name === 'Receitas' ? 'disabled' : ''}>Excluir</button>
    </div>
  `).join('');

  box.querySelectorAll('input[data-cat-icon]').forEach(inp => inp.addEventListener('change', e => {
    CATEGORY_RULES[Number(e.target.dataset.catIcon)].icon = e.target.value || '📌'; saveCategories(); renderAll(); renderCategoryConfig(); populateCategoryActionSelect();
  }));
  box.querySelectorAll('input[data-cat-name]').forEach(inp => inp.addEventListener('change', e => {
    const i = Number(e.target.dataset.catName), oldName = CATEGORY_RULES[i].name, newName = e.target.value.trim() || oldName;
    CATEGORY_RULES[i].name = newName;
    allTransactions.forEach(t => { if (t.categoria === oldName) t.categoria = newName; });
    learnedRules.forEach(r => { if (r.category === oldName) r.category = newName; });
    saveCategories(); saveLearnedRules(); selectedCategory = newName; renderAll(); renderCategoryConfig(); renderRuleList(); populateCategoryActionSelect();
  }));
  box.querySelectorAll('input[data-cat-color]').forEach(inp => inp.addEventListener('change', e => {
    CATEGORY_RULES[Number(e.target.dataset.catColor)].color = e.target.value || '#64748b';
    saveCategories(); renderAll(); renderCategoryConfig();
  }));
  box.querySelectorAll('input[data-cat-budget]').forEach(inp => inp.addEventListener('change', e => {
    CATEGORY_RULES[Number(e.target.dataset.catBudget)].budget = Number(e.target.value || 0); saveCategories(); renderAll(); renderCategoryConfig();
  }));
  box.querySelectorAll('input[data-cat-keywords]').forEach(inp => inp.addEventListener('change', e => {
    CATEGORY_RULES[Number(e.target.dataset.catKeywords)].keywords = e.target.value.split(',').map(s => s.trim()).filter(Boolean); saveCategories(); renderAll(); renderCategoryConfig();
  }));
  box.querySelectorAll('button[data-cat-delete]').forEach(btn => btn.addEventListener('click', e => {
    const i = Number(e.target.dataset.catDelete), deleted = CATEGORY_RULES[i].name;
    CATEGORY_RULES.splice(i,1);
    allTransactions.forEach(t => { if (t.categoria === deleted) t.categoria = 'Outros'; });
    learnedRules = learnedRules.filter(r => r.category !== deleted);
    saveCategories(); saveLearnedRules(); selectedCategory = 'Outros'; renderAll(); renderCategoryConfig(); renderRuleList(); populateCategoryActionSelect();
  }));
}

function renderRuleList(){
  const box = document.getElementById('ruleList');
  box.innerHTML = learnedRules.length ? learnedRules.map((r, idx) => `
    <div class="rule-item">
      <div><strong>${r.keyword}</strong><div class="tiny">Será enviado para ${r.category}</div></div>
      <select data-rule-category="${idx}">${categoryOptionsHtml(r.category)}</select>
      <button class="danger" data-rule-delete="${idx}">Excluir</button>
    </div>
  `).join('') : '<div class="empty">Nenhuma regra aprendida ainda.</div>';

  box.querySelectorAll('select[data-rule-category]').forEach(sel => sel.addEventListener('change', e => {
    learnedRules[Number(e.target.dataset.ruleCategory)].category = e.target.value; saveLearnedRules(); renderRuleList(); renderAll();
  }));
  box.querySelectorAll('button[data-rule-delete]').forEach(btn => btn.addEventListener('click', e => {
    learnedRules.splice(Number(e.target.dataset.ruleDelete), 1); saveLearnedRules(); renderRuleList();
  }));
}

function openDetailModal(categoryName){
  if (categoryName) selectedCategory = categoryName;
  const modal = document.getElementById('detailModal');
  if (!modal) {
    alert('Não consegui abrir a janela de detalhes.');
    return;
  }
  modal.style.display = 'flex';
  renderCategoryDetail(filteredTransactions());
}

function closeDetailModal(){
  const modal = document.getElementById('detailModal');
  if (modal) modal.style.display = 'none';
}

function monthExpenseForCategory(categoryName, monthValue){
  return allTransactions
    .filter(t => !t.futuro && monthKey(t.data) === monthValue && t.categoria === categoryName && Number(t.valor || 0) < 0)
    .reduce((sum, t) => sum + Math.abs(Number(t.valor || 0)), 0);
}

function openReceitasDetail(){
  try{
    selectedCategory = 'Receitas';
    selectedSubcategoryFilter = '';
    const detailFilter = document.getElementById('detailSubcategoryFilter');
    if (detailFilter) detailFilter.value = '';
    if (typeof openDetailModal === 'function'){
      openDetailModal('Receitas');
      return;
    }
    if (typeof renderCategoryDetail === 'function'){
      renderCategoryDetail(filteredTransactions ? filteredTransactions() : []);
    }
  }catch(e){
    console.error(e);
  }
}

document.addEventListener('keydown', function(e){
  if (e.key === 'Escape'){
    closeDetailModal();
  }
});
