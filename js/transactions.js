// transactions.js — parte do Prosperis (extraído automaticamente, revisar dependências ao editar)

let allTransactions = [];

let currentFileName = 'Nenhum';

let openingBalance = 0;

function parseMoney(value){
  if (typeof value === 'number') return value;
  let str = String(value ?? '').trim();
  if (!str) return null;
  str = str.replace(/R\$/gi,'').replace(/\s+/g,'').replace(/[^0-9,.\-]/g,'');
  if (!str) return null;
  const hasComma = str.includes(','), hasDot = str.includes('.');
  if (hasComma && hasDot){
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) str = str.replace(/\./g,'').replace(',', '.');
    else str = str.replace(/,/g,'');
  } else if (hasComma){
    str = str.replace(/\./g,'').replace(',', '.');
  }
  const num = Number(str);
  return Number.isNaN(num) ? null : num;
}

function parseDate(value){
  if (value instanceof Date && !isNaN(value)) return value;
  if (typeof value === 'number'){
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return new Date(parsed.y, parsed.m - 1, parsed.d);
  }
  const str = String(value || '').trim();
  if (!str) return null;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)){
    const [d,m,y] = str.split('/');
    return new Date(`${y}-${m}-${d}T00:00:00`);
  }
  return null;
}

function extractRowsFromWorkbook(workbook){
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { header:1, raw:false, defval:'' });
}

function parseItauRows(rows){
  let headerIndex = rows.findIndex(row => normalizeText(row[0]) === 'data' && normalizeText(row[1]).includes('lanc'));
  if (headerIndex === -1){
    headerIndex = rows.findIndex(row => {
      const joined = normalizeText(row.join(' '));
      return joined.includes('data') && joined.includes('lanc') && joined.includes('valor');
    });
  }
  if (headerIndex === -1) throw new Error('Não encontrei a tabela do extrato.');

  const out = [];
  let currentSection = 'normal';
  openingBalance = 0;
  for (const row of rows.slice(headerIndex + 1)){
    const dateRaw = row[0], desc = String(row[1] || '').trim(), valueRaw = row[3], balanceRaw = row[4];
    const text = normalizeText(desc);
    if (!String(dateRaw || '').trim() && !desc && !String(valueRaw || '').trim() && !String(balanceRaw || '').trim()) continue;
    if (['lancamentos futuros','saidas futuras','entradas futuras'].includes(text)){ currentSection = 'future'; continue; }
    if (text === 'lancamentos') continue;
    if (text.includes('saldo anterior')){
      let s = parseMoney(balanceRaw);
      if (s === null) s = parseMoney(valueRaw);
      if (s === null) {
        const joined = row.map(v => String(v || '')).join(' ');
        const m = joined.match(/saldo anterior[^\d-]*([\d.]+,\d{2}|[\d,]+\.\d{2}|\d+[\.,]\d{2})/i);
        if (m) s = parseMoney(m[1]);
      }
      if (s !== null) openingBalance = s;
      continue;
    }
    if (text.includes('saldo total disponivel dia') || text.includes('saldo total dispon')) continue;
    const date = parseDate(dateRaw), value = parseMoney(valueRaw);
    if (!date || value === null || !desc) continue;
    out.push({ data: date, descricao: desc, valor: value, categoria: categorize(desc, value), subcategoria: '', tipo: value >= 0 ? 'Entrada' : 'Saída', futuro: currentSection === 'future' });
  }
  return out.sort((a,b) => a.data - b.data || a.descricao.localeCompare(b.descricao));
}

function monthKey(date){ return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`; }

function monthLabel(key){
  const [y,m] = key.split('-');
  return new Date(Number(y), Number(m)-1, 1).toLocaleDateString('pt-BR',{month:'long', year:'numeric'});
}

function getOpeningBalanceForFilter(monthValue){
  if (!monthValue || monthValue === 'all') return openingBalance || 0;

  const archive = loadMonthArchive();
  if (archive[monthValue] && archive[monthValue].openingBalance !== undefined && archive[monthValue].openingBalance !== null){
    return Number(archive[monthValue].openingBalance || 0);
  }

  if (!allTransactions.length) return openingBalance || 0;
  const previousNet = allTransactions
    .filter(t => !t.futuro && monthKey(t.data) < monthValue)
    .reduce((sum, t) => sum + Number(t.valor || 0), 0);
  return (openingBalance || 0) + previousNet;
}

function filteredTransactions(){
  const m = document.getElementById('monthFilter').value;
  return allTransactions.filter(t => !t.futuro && (m === 'all' || monthKey(t.data) === m));
}

function statusFor(spent, budget){
  if (budget <= 0) return { text:'Sem meta', cls:'', rank:3 };
  const pct = spent / budget;
  const remainingPct = 1 - pct;
  if (pct > 1) return { text:'Meta estourada', cls:'bad', rank:0 };
  if (remainingPct <= 0.20) return { text:'Faltam 20% ou menos', cls:'warn', rank:1 };
  return { text:'Dentro da meta', cls:'good', rank:2 };
}

function categoryTotals(data){
  const map = {}; CATEGORY_RULES.forEach(c => map[c.name] = { gasto:0, entrada:0, total:0 });
  data.forEach(t => {
    if (!map[t.categoria]) map[t.categoria] = { gasto:0, entrada:0, total:0 };
    if (t.valor >= 0) map[t.categoria].entrada += t.valor; else map[t.categoria].gasto += Math.abs(t.valor);
    map[t.categoria].total += t.valor;
  });
  return map;
}

function getCurrentCategoryRows(data){
  const search = normalizeText(document.getElementById('detailSearch').value);
  return data
    .filter(t => t.categoria === selectedCategory)
    .filter(t => !selectedSubcategoryFilter || (t.subcategoria || '') === selectedSubcategoryFilter)
    .filter(t => !search || normalizeText(t.descricao).includes(search))
    .sort((a,b) => b.data - a.data || a.descricao.localeCompare(b.descricao));
}

function addMonthsSafe(date, months){
  const d = new Date(date);
  const originalDay = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < originalDay) d.setDate(0);
  return d;
}

function openInstallmentModal(){
  const sel = document.getElementById('installmentCategory');
  if (sel){
    sel.innerHTML = CATEGORY_RULES.filter(c => c.name !== 'Receitas').map(c => `<option value="${c.name}">${c.icon} ${c.name}</option>`).join('');
  }
  document.getElementById('installmentDate').value = new Date().toISOString().slice(0,10);
  document.getElementById('installmentDescription').value = '';
  document.getElementById('installmentSubcategory').value = '';
  document.getElementById('installmentTotalValue').value = '';
  document.getElementById('installmentCount').value = 2;
  document.getElementById('installmentManageModal').style.display = 'flex';
}

function closeInstallmentModal(){
  document.getElementById('installmentManageModal').style.display = 'none';
}

function saveInstallmentPlan(){
  const dateRaw = document.getElementById('installmentDate').value;
  const description = document.getElementById('installmentDescription').value.trim();
  const category = document.getElementById('installmentCategory').value;
  const subcategory = document.getElementById('installmentSubcategory').value.trim();
  const total = Number(document.getElementById('installmentTotalValue').value || 0);
  const count = Number(document.getElementById('installmentCount').value || 0);

  if (!dateRaw || !description || total <= 0 || count < 2){
    alert('Preencha data, descrição, valor total e número de parcelas.');
    return;
  }

  const start = new Date(dateRaw + 'T00:00:00');
  const centavosTotal = Math.round(total * 100);
  const baseCentavos = Math.floor(centavosTotal / count);
  let acumulado = 0;

  for (let i = 0; i < count; i++){
    let centavos = baseCentavos;
    if (i === count - 1) centavos = centavosTotal - acumulado;
    acumulado += centavos;

    allTransactions.push({
      data: addMonthsSafe(start, i),
      descricao: `${description} ${i+1}/${count}`,
      valor: -(centavos / 100),
      categoria: category,
      subcategoria: subcategory,
      tipo: 'Saída',
      futuro: false,
      installmentGroup: description,
      installmentNumber: i + 1,
      installmentTotal: count,
      isInstallment: true
    });
  }

  allTransactions.sort((a,b) => a.data - b.data || a.descricao.localeCompare(b.descricao));
  currentFileName = currentFileName === 'Nenhum' ? 'Lançamentos manuais' : currentFileName;
  renderMonthFilter();

  const monthFilterEl = document.getElementById('monthFilter');
  const currentMonth = monthKey(start);
  if (monthFilterEl && [...monthFilterEl.options].some(o => o.value === currentMonth)){
    monthFilterEl.value = currentMonth;
  }

  closeInstallmentModal();
  renderAll();
  ensureMonthAutoSaved();
  alert('Compra parcelada salva com sucesso.');
}

function getMonthRows(monthKeyValue){
  return allTransactions.filter(t => !t.futuro && monthKey(t.data) === monthKeyValue);
}

function monthStats(monthKeyValue){
  const rows = getMonthRows(monthKeyValue);
  const income = rows.filter(t => t.valor > 0).reduce((s,t) => s + t.valor, 0);
  const expense = rows.filter(t => t.valor < 0).reduce((s,t) => s + Math.abs(t.valor), 0);
  const opening = getOpeningBalanceForFilter(monthKeyValue);
  const balance = opening + income - expense;
  return { rows, income, expense, opening, balance };
}

function exportBackup(){
  try{
    const payload = {
      exportedAt: new Date().toISOString(),
      categories: CATEGORY_RULES,
      learnedRules,
      fixedItems,
      dashboardSession: localStorage.getItem(DASHBOARD_SESSION_KEY),
      monthArchive: loadMonthArchive()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_dashboard_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  }catch(e){
    console.error(e);
    alert('Não consegui exportar o backup.');
  }
}

function importBackup(event){
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try{
      const payload = JSON.parse(e.target.result);
      if (payload.categories) {
        CATEGORY_RULES = payload.categories;
        saveCategories();
      }
      if (payload.learnedRules) {
        learnedRules = payload.learnedRules;
        saveLearnedRules();
      }
      if (payload.fixedItems) {
        fixedItems = payload.fixedItems;
        saveFixedItems(fixedItems);
      }
      if (payload.monthArchive) saveMonthArchive(payload.monthArchive);
      if (payload.dashboardSession) localStorage.setItem(DASHBOARD_SESSION_KEY, payload.dashboardSession);
      alert('Backup importado com sucesso.');
      location.reload();
    } catch(err){
      console.error(err);
      alert('Não consegui importar esse backup.');
    }
  };
  reader.readAsText(file, 'utf-8');
}

function parseInstallmentInfo(description){
  const text = String(description || '').trim();
  const match = text.match(/^(.*?)(?:\s*-\s*)?(?:parcela\s*)?(\d+)\s*\/\s*(\d+)$/i);
  if (match){
    return {
      base: match[1].trim(),
      current: Number(match[2]),
      total: Number(match[3])
    };
  }
  return { base: text, current: 0, total: 0 };
}

function monthGap(dateA, dateB){
  const a = new Date(dateA), b = new Date(dateB);
  return Math.abs((b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()));
}

function buildLegacyInstallmentGroups(){
  const candidateMap = {};

  (allTransactions || []).forEach((t, idx) => {
    if (!t || !t.descricao) return;
    const info = parseInstallmentInfo(t.descricao);
    if (!info.base || !info.current || !info.total || info.total < 2) return;

    const key = info.base + "__" + info.total;
    if (!candidateMap[key]){
      candidateMap[key] = { name: info.base, total: info.total, items: [] };
    }
    candidateMap[key].items.push({
      idx,
      tx: t,
      current: info.current,
      total: info.total
    });
  });

  const valid = {};
  Object.entries(candidateMap).forEach(([key, group]) => {
    const items = group.items.slice().sort((a,b) => a.current - b.current || new Date(a.tx.data) - new Date(b.tx.data));

    // must have at least 2 parcelas
    if (items.length < 2) return;

    // require unique installment numbers
    const numbers = items.map(x => x.current);
    const unique = [...new Set(numbers)];
    if (unique.length < 2) return;

    // require sequence starting at 1 and without jumps in the items we have
    if (Math.min(...unique) !== 1) return;
    for (let i = 1; i < unique.length; i++){
      if (unique[i] !== unique[i-1] + 1) return;
    }

    // require dates to look monthly for consecutive parcelas
    let monthlyLike = true;
    for (let i = 1; i < items.length; i++){
      const prev = items[i-1], curr = items[i];
      if (curr.current === prev.current + 1){
        const gap = monthGap(prev.tx.data, curr.tx.data);
        if (gap !== 1){
          monthlyLike = false;
          break;
        }
      }
    }
    if (!monthlyLike) return;

    valid[key] = group;
  });

  return valid;
}

function getInstallmentGroups(){
  const explicit = {};
  (allTransactions || []).forEach((t, idx) => {
    if (!t) return;
    if (t.isInstallment && t.installmentGroup){
      const key = t.installmentGroup;
      if (!explicit[key]){
        explicit[key] = { name: key, total: Number(t.installmentTotal || 0), items: [] };
      }
      explicit[key].items.push({
        idx,
        tx: t,
        current: Number(t.installmentNumber || 0),
        total: Number(t.installmentTotal || explicit[key].total || 0)
      });
      if (Number(t.installmentTotal || 0) > explicit[key].total){
        explicit[key].total = Number(t.installmentTotal || 0);
      }
    }
  });

  const merged = { ...explicit };

  // only use legacy fallback when there is NO explicit group with same name
  const legacy = buildLegacyInstallmentGroups();
  Object.values(legacy).forEach(group => {
    if (!merged[group.name]){
      merged[group.name] = group;
    }
  });

  return merged;
}

function renderInstallmentsPanel(){
  const tbody = document.getElementById('installmentsTable');
  if (!tbody) return;

  const groups = getInstallmentGroups();
  const rows = Object.values(groups).sort((a,b) => a.name.localeCompare(b.name, 'pt-BR'));

  if (!rows.length){
    tbody.innerHTML = '<tr><td colspan="2" class="empty">Nenhuma compra parcelada encontrada.</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(group => `
    <tr data-open-installment="${group.name}" style="cursor:pointer">
      <td>${group.name} - ${group.total || group.items.length} parcelas</td>
      <td><button class="secondary" type="button" data-open-installment-btn="${group.name}">Abrir</button></td>
    </tr>
  `).join('');

  tbody.querySelectorAll('tr[data-open-installment]').forEach(row => {
    row.addEventListener('click', () => openInstallmentDetails(row.dataset.openInstallment));
  });

  tbody.querySelectorAll('button[data-open-installment-btn]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openInstallmentDetails(btn.dataset.openInstallmentBtn);
    });
  });
}

function openInstallmentDetails(name){
  const modal = document.getElementById('installmentManageModal');
  const title = document.getElementById('installmentDetailTitle');
  const tbody = document.getElementById('installmentDetailTable');
  if (!modal || !title || !tbody) return;

  const groups = getInstallmentGroups();
  const group = Object.values(groups).find(g => g.name === name);
  const items = group ? group.items.slice().sort((a,b) => (a.current || 9999) - (b.current || 9999)) : [];

  title.textContent = `${name} - ${group ? (group.total || items.length) : 0} parcelas`;

  if (!items.length){
    tbody.innerHTML = '<tr><td colspan="7" class="empty">Nenhuma parcela encontrada.</td></tr>';
    modal.style.display = 'flex';
    return;
  }

  tbody.innerHTML = items.map(item => `
    <tr>
      <td>${item.current ? item.current + '/' + (item.total || items.length) : '-'}</td>
      <td>${new Date(item.tx.data).toLocaleDateString('pt-BR')}</td>
      <td><input type="text" data-inst-desc="${item.idx}" value="${String(item.tx.descricao || '').replace(/"/g,'&quot;')}" style="width:100%" /></td>
      <td><select data-inst-cat="${item.idx}" style="min-height:30px;padding:5px 7px;font-size:12px">${categoryOptionsHtml(item.tx.categoria)}</select></td>
      <td><input type="text" data-inst-sub="${item.idx}" value="${String(item.tx.subcategoria || '').replace(/"/g,'&quot;')}" style="width:100%" /></td>
      <td><input type="number" min="0" step="0.01" data-inst-val="${item.idx}" value="${Math.abs(Number(item.tx.valor || 0))}" style="width:110px" /></td>
      <td><button class="danger" type="button" data-inst-del="${item.idx}">Excluir</button></td>
    </tr>
  `).join('');

  tbody.querySelectorAll('input[data-inst-desc]').forEach(inp => {
    inp.addEventListener('change', e => {
      const i = Number(e.target.dataset.instDesc);
      allTransactions[i].descricao = e.target.value.trim();
      renderAll();
      renderInstallmentsPanel();
      openInstallmentDetails(name);
    });
  });

  tbody.querySelectorAll('select[data-inst-cat]').forEach(sel => {
    sel.addEventListener('change', e => {
      const i = Number(e.target.dataset.instCat);
      allTransactions[i].categoria = e.target.value;
      renderAll();
      renderInstallmentsPanel();
      openInstallmentDetails(name);
    });
  });

  tbody.querySelectorAll('input[data-inst-sub]').forEach(inp => {
    inp.addEventListener('change', e => {
      const i = Number(e.target.dataset.instSub);
      allTransactions[i].subcategoria = e.target.value.trim();
      renderAll();
      renderInstallmentsPanel();
      openInstallmentDetails(name);
    });
  });

  tbody.querySelectorAll('input[data-inst-val]').forEach(inp => {
    inp.addEventListener('change', e => {
      const i = Number(e.target.dataset.instVal);
      allTransactions[i].valor = -Math.abs(Number(e.target.value || 0));
      renderAll();
      renderInstallmentsPanel();
      openInstallmentDetails(name);
    });
  });

  tbody.querySelectorAll('button[data-inst-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = Number(btn.dataset.instDel);
      allTransactions.splice(i, 1);
      renderAll();
      renderInstallmentsPanel();
      openInstallmentDetails(name);
    });
  });

  modal.style.display = 'flex';
}

function closeInstallmentDetails(){
  const modal = document.getElementById('installmentManageModal');
  if (modal) modal.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function(){
  setTimeout(renderInstallmentsPanel, 500);
});
