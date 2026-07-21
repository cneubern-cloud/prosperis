// budgets.js — parte do Prosperis (extraído automaticamente, revisar dependências ao editar)

let SUBCATEGORY_BUDGETS = loadSubcategoryBudgets();

let MANUAL_SUBCATEGORIES = loadManualSubcategories();

const SUBCATEGORY_BUDGETS_KEY = 'subcategory_budgets_v1';

function loadSubcategoryBudgets(){
  try{
    return JSON.parse(localStorage.getItem(SUBCATEGORY_BUDGETS_KEY) || '{}');
  }catch(e){ return {}; }
}

function saveSubcategoryBudgets(){
  localStorage.setItem(SUBCATEGORY_BUDGETS_KEY, JSON.stringify(SUBCATEGORY_BUDGETS));
}

function subcategoryBudgetKey(category, subcategory){
  return `${category}||${subcategory || ''}`;
}

function getSubcategoryBudget(category, subcategory){
  return Number(SUBCATEGORY_BUDGETS[subcategoryBudgetKey(category, subcategory)] || 0);
}

function setSubcategoryBudget(category, subcategory, value){
  SUBCATEGORY_BUDGETS[subcategoryBudgetKey(category, subcategory)] = Number(value || 0);
  saveSubcategoryBudgets();
}

const MANUAL_SUBCATEGORIES_KEY = 'manual_subcategories_v1';

function loadManualSubcategories(){
  try{
    return JSON.parse(localStorage.getItem(MANUAL_SUBCATEGORIES_KEY) || '{}');
  }catch(e){ return {}; }
}

function saveManualSubcategories(){
  localStorage.setItem(MANUAL_SUBCATEGORIES_KEY, JSON.stringify(MANUAL_SUBCATEGORIES));
}

function getManualSubcategories(category){
  return Array.isArray(MANUAL_SUBCATEGORIES[category]) ? MANUAL_SUBCATEGORIES[category] : [];
}

function removeManualSubcategory(category, subcategory){
  if (!MANUAL_SUBCATEGORIES[category]) return;
  MANUAL_SUBCATEGORIES[category] = MANUAL_SUBCATEGORIES[category].filter(s => s !== subcategory);
  delete SUBCATEGORY_BUDGETS[subcategoryBudgetKey(category, subcategory)];
  saveManualSubcategories();
  saveSubcategoryBudgets();
}

function addManualSubcategory(category, subcategory){
  const name = String(subcategory || '').trim();
  if (!name) return false;
  if (!MANUAL_SUBCATEGORIES[category]) MANUAL_SUBCATEGORIES[category] = [];
  if (!MANUAL_SUBCATEGORIES[category].includes(name)){
    MANUAL_SUBCATEGORIES[category].push(name);
    MANUAL_SUBCATEGORIES[category].sort((a,b) => a.localeCompare(b,'pt-BR'));
    saveManualSubcategories();
  }
  return true;
}

const MONTHLY_TOTAL_BUDGETS_KEY = 'monthly_total_budgets_v1';

function loadMonthlyTotalBudgets(){
  try{
    return JSON.parse(localStorage.getItem(MONTHLY_TOTAL_BUDGETS_KEY) || '{}');
  }catch(e){
    return {};
  }
}

function saveMonthlyTotalBudgets(map){
  localStorage.setItem(MONTHLY_TOTAL_BUDGETS_KEY, JSON.stringify(map));
}

let MONTHLY_TOTAL_BUDGETS = loadMonthlyTotalBudgets();

function getEffectiveBudgetMonth(){
  const selected = document.getElementById('monthFilter')?.value || 'all';
  if (selected && selected !== 'all') return selected;
  const months = [...new Set((allTransactions || []).filter(t => !t.futuro).map(t => monthKey(t.data)))].sort().reverse();
  return months[0] || '';
}

function getMonthlyTotalBudget(monthValue){
  const key = monthValue || getEffectiveBudgetMonth();
  if (key && MONTHLY_TOTAL_BUDGETS[key] !== undefined) return Number(MONTHLY_TOTAL_BUDGETS[key] || 0);
  return 7200;
}

function setMonthlyTotalBudget(monthValue, value){
  const key = monthValue || getEffectiveBudgetMonth();
  if (!key) return;
  MONTHLY_TOTAL_BUDGETS[key] = Number(value || 0);
  saveMonthlyTotalBudgets(MONTHLY_TOTAL_BUDGETS);
}

function copyPreviousMonthBudget(){
  const current = getEffectiveBudgetMonth();
  if (!current){
    alert('Selecione ou carregue um mês primeiro.');
    return;
  }
  const [y, m] = current.split('-').map(Number);
  const prev = new Date(y, m - 2, 1);
  const prevKey = prev.getFullYear() + '-' + String(prev.getMonth() + 1).padStart(2, '0');
  const prevValue = getMonthlyTotalBudget(prevKey);
  const input = document.getElementById('totalBudgetInput');
  if (input) input.value = String(prevValue || 0);
  setMonthlyTotalBudget(current, prevValue || 0);
  renderBudgetDistribution();
}

function renderBudgetDistribution(){
  const input = document.getElementById('totalBudgetInput');
  const effectiveMonth = getEffectiveBudgetMonth();
  const total = input === document.activeElement
    ? (Number(input?.value || 0) || 0)
    : getMonthlyTotalBudget(effectiveMonth);

  if (input && input !== document.activeElement) input.value = String(total || 0);

  const allocated = CATEGORY_RULES
    .filter(c => c.name !== 'Receitas')
    .reduce((sum,c) => sum + Number(c.budget || 0), 0);

  const remaining = total - allocated;

  const spentReal = (allTransactions || [])
    .filter(t => !t.futuro && effectiveMonth && monthKey(t.data) === effectiveMonth && Number(t.valor || 0) < 0)
    .reduce((sum, t) => sum + Math.abs(Number(t.valor || 0)), 0);

  const realRemaining = total - spentReal;

  document.getElementById('budgetTotalView').textContent = formatBRL(total);
  document.getElementById('budgetAllocatedView').textContent = formatBRL(allocated);
  document.getElementById('budgetRemainingView').textContent = formatBRL(remaining);
  document.getElementById('budgetRemainingView').className = 'small-value ' + (remaining >= 0 ? 'good' : 'bad');
  document.getElementById('budgetHintPct').textContent = total > 0 ? `${Math.round((allocated / total) * 100)}%` : '0%';

  const spentBox = document.getElementById('budgetSpentRealView');
  const realRemainBox = document.getElementById('budgetRealRemainingView');
  if (spentBox) spentBox.textContent = formatBRL(spentReal);
  if (realRemainBox){
    realRemainBox.textContent = formatBRL(Math.abs(realRemaining));
    realRemainBox.className = 'small-value ' + (realRemaining >= 0 ? 'good' : 'bad');
  }

  const monthText = effectiveMonth ? monthLabel(effectiveMonth) : 'mês atual';

  if (!effectiveMonth){
    document.getElementById('budgetHint').textContent = 'Defina a meta total do mês. Quando houver dados, ela ficará associada ao mês selecionado.';
    return;
  }

  if (remaining < 0){
    document.getElementById('budgetHint').textContent = `Em ${monthText}, você distribuiu ${formatBRL(Math.abs(remaining))} acima da meta total.`;
  } else if (realRemaining < 0){
    document.getElementById('budgetHint').textContent = `Em ${monthText}, seus gastos reais já ultrapassaram a meta total em ${formatBRL(Math.abs(realRemaining))}.`;
  } else {
    document.getElementById('budgetHint').textContent = `Em ${monthText}, ainda faltam ${formatBRL(remaining)} para distribuir entre categorias e ${formatBRL(realRemaining)} de folga real na meta total.`;
  }
}

function budgetFor(category){ return Number(CATEGORY_RULES.find(c => c.name === category)?.budget ?? 0); }

function setBudget(category, value){
  const cat = CATEGORY_RULES.find(c => c.name === category);
  if (cat){ cat.budget = Number(value || 0); saveCategories(); }
}

const FIXED_ITEMS_KEY = 'dashboard_fixed_items_v1';

let fixedItems = loadFixedItems();

function loadFixedItems(){
  try{ return JSON.parse(localStorage.getItem(FIXED_ITEMS_KEY) || '[]'); }catch(e){ return []; }
}

function saveFixedItems(items){
  localStorage.setItem(FIXED_ITEMS_KEY, JSON.stringify(items));
}

function openFixedModal(){
  document.getElementById('fixedDescription').value = '';
  document.getElementById('fixedSubcategory').value = '';
  document.getElementById('fixedValue').value = '';
  document.getElementById('fixedDay').value = '';
  const sel = document.getElementById('fixedCategory');
  sel.innerHTML = CATEGORY_RULES.filter(c => c.name !== 'Receitas').map(c => `<option value="${c.name}">${c.icon} ${c.name}</option>`).join('');
  document.getElementById('fixedModal').style.display = 'flex';
}

function closeFixedModal(){
  document.getElementById('fixedModal').style.display = 'none';
}

function saveFixedItem(){
  const description = document.getElementById('fixedDescription').value.trim();
  const category = document.getElementById('fixedCategory').value;
  const subcategory = document.getElementById('fixedSubcategory').value.trim();
  const value = Number(document.getElementById('fixedValue').value || 0);
  const day = Number(document.getElementById('fixedDay').value || 0);
  if (!description || value <= 0 || day < 1 || day > 31){
    alert('Preencha descrição, valor e dia corretamente.');
    return;
  }
  fixedItems.push({description, category, subcategory, value, day});
  saveFixedItems(fixedItems);
  closeFixedModal();
  renderFixedItems();
  alert('Conta fixa salva com sucesso.');
}

function renderFixedItems(){
  const box = document.getElementById('fixedList');
  if (!box) return;
  box.innerHTML = fixedItems.length ? fixedItems.map((item, idx) => `
    <div class="rule-item">
      <div><strong>${item.description}</strong><div class="tiny">Dia ${item.day} • ${formatBRL(item.value)} • ${item.category}${item.subcategory ? ' • ' + item.subcategory : ''}</div></div>
      <button class="secondary" data-fixed-launch="${idx}">Lançar neste mês</button>
      <button class="danger" data-fixed-delete="${idx}">Excluir</button>
    </div>
  `).join('') : '<div class="empty">Nenhuma conta fixa cadastrada.</div>';

  box.querySelectorAll('button[data-fixed-delete]').forEach(btn => btn.addEventListener('click', e => {
    const i = Number(e.target.dataset.fixedDelete);
    fixedItems.splice(i,1);
    saveFixedItems(fixedItems);
    renderFixedItems();
  }));
  box.querySelectorAll('button[data-fixed-launch]').forEach(btn => btn.addEventListener('click', e => {
    const i = Number(e.target.dataset.fixedLaunch);
    const item = fixedItems[i];
    const monthValue = document.getElementById('monthFilter')?.value;
    let baseDate = new Date();
    if (monthValue && monthValue !== 'all'){
      const [y,m] = monthValue.split('-');
      baseDate = new Date(Number(y), Number(m)-1, Math.min(item.day, 28));
    } else {
      baseDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), Math.min(item.day, 28));
    }
    allTransactions.push({
      data: baseDate,
      descricao: item.description,
      valor: -Math.abs(item.value),
      categoria: item.category,
      subcategoria: item.subcategory || '',
      tipo: 'Saída',
      futuro: false
    });
    allTransactions.sort((a,b) => a.data - b.data || a.descricao.localeCompare(b.descricao));
    renderMonthFilter();
    const mk = formatMonthKey(baseDate);
    const mf = document.getElementById('monthFilter');
    if (mf && [...mf.options].some(o => o.value === mk)) mf.value = mk;
    renderAll();
    ensureMonthAutoSaved();
  }));
}
