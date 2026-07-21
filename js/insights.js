// insights.js — parte do Prosperis (extraído automaticamente, revisar dependências ao editar)

function renderMonthFilter(){
  const months = [...new Set(allTransactions.filter(t => !t.futuro).map(t => monthKey(t.data)))].sort();
  const sel = document.getElementById('monthFilter');
  sel.innerHTML = '<option value="all">Todos os meses</option>';
  months.forEach(m => {
    const o = document.createElement('option');
    o.value = m; o.textContent = monthLabel(m); sel.appendChild(o);
  });
}

function renderKPIs(data){
  const entradas = data.filter(t => t.valor > 0).reduce((a,b) => a + b.valor, 0);
  const gastos = data.filter(t => t.valor < 0).reduce((a,b) => a + Math.abs(b.valor), 0);
  const monthValue = document.getElementById('monthFilter')?.value || 'all';
  const openingForView = getOpeningBalanceForFilter(monthValue);
  const saldoFinal = openingForView + entradas - gastos;
  document.getElementById('arquivoInfo').textContent = currentFileName;
  document.getElementById('saldoInicialKpi').textContent = formatBRL(openingForView);
  document.getElementById('entradasKpi').textContent = formatBRL(entradas);
  document.getElementById('saidasKpi').textContent = formatBRL(gastos);
  document.getElementById('saldoFinalKpi').textContent = formatBRL(saldoFinal);
  document.getElementById('saldoFinalKpi').className = 'value ' + (saldoFinal >= 0 ? 'good' : 'bad');
  document.getElementById('qtdeKpi').textContent = data.length;
  document.getElementById('periodoInfo').textContent = data.length ? `${data[0].data.toLocaleDateString('pt-BR')} a ${data[data.length-1].data.toLocaleDateString('pt-BR')}` : 'Sem dados';
}

function renderCategoryCards(data){
  const wrap = document.getElementById('categoryCards');
  const totals = categoryTotals(data);

  const selectedMonth = document.getElementById('monthFilter')?.value || 'all';
  const effectiveMonth = selectedMonth !== 'all'
    ? selectedMonth
    : ([...new Set((allTransactions || []).filter(t => !t.futuro).map(t => monthKey(t.data)))].sort().reverse()[0] || '');

  const cards = CATEGORY_RULES.filter(c => c.name !== 'Receitas').map(cat => {
    const spent = totals[cat.name]?.gasto || 0;
    const budget = budgetFor(cat.name);
    const remaining = budget - spent;
    const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
    const st = statusFor(spent, budget);

    const [y,m] = effectiveMonth ? effectiveMonth.split('-').map(Number) : [0,0];
    const daysInMonth = effectiveMonth ? new Date(y, m, 0).getDate() : 0;
    const now = new Date();
    const isCurrentMonth = effectiveMonth && now.getFullYear() === y && (now.getMonth() + 1) === m;
    const daysElapsed = effectiveMonth ? (isCurrentMonth ? Math.max(1, now.getDate()) : daysInMonth) : 0;
    const daysRemaining = effectiveMonth ? Math.max(daysInMonth - daysElapsed, 0) : 0;

    let dailyRemainingHint = 'Sem cálculo disponível';
    if (budget <= 0) {
      dailyRemainingHint = 'Defina uma meta para ver o valor por dia';
    } else if (remaining <= 0) {
      dailyRemainingHint = 'Meta esgotada neste mês';
    } else if (daysRemaining <= 0) {
      dailyRemainingHint = 'Hoje é o último dia do mês';
    } else {
      const perDay = remaining / daysRemaining;
      dailyRemainingHint = `Você pode gastar ${formatBRL(perDay)} por dia até o fim do mês`;
    }

    return { cat, spent, budget, remaining, pct, st, dailyRemainingHint, isReceita:false };
  }).sort((a,b) => a.st.rank - b.st.rank || b.spent - a.spent || a.cat.name.localeCompare(b.cat.name));

  const cats = [...cards];

  if (!selectedCategory && cats.length) selectedCategory = cats[0].cat.name;
  if (selectedCategory && !cats.find(x => x.cat.name === selectedCategory) && selectedCategory !== 'Receitas') selectedCategory = cats[0]?.cat.name || null;

  wrap.innerHTML = cats.map(({cat, spent, budget, remaining, pct, st, dailyRemainingHint}) => `
    <div class="goal-card state-${st.cls || 'good'} ${selectedCategory === cat.name ? 'active' : ''}" data-cat="${cat.name}">
      <div class="goal-top">
        <div class="goal-name"><span class="icon">${cat.icon}</span><span>${cat.name}</span></div>
        <span class="pill ${st.cls}">${st.text}</span>
      </div>
      <div class="goal-main">
        <div>
          <div class="micro">Gasto atual</div>
          <div class="spent-big">${formatBRL(spent)}</div>
        </div>
        <div class="remain-big ${remaining >= 0 ? 'good' : 'bad'}">
          <div class="micro">Restante</div>
          ${formatBRL(remaining)}
        </div>
      </div>
      <div class="progress"><div class="bar ${st.cls || 'good'}" style="width:${pct}%"></div></div>
      <div class="helper">${budget > 0 ? Math.round((spent / budget) * 100 || 0) : 0}% usado</div>
      <div class="tiny" style="margin-top:4px">${dailyRemainingHint}</div>
      <div class="goal-footer">
        <button class="secondary" type="button" data-open-details="${cat.name}" onclick="selectedCategory='${cat.name}';openDetailModal('${cat.name}')" style="min-height:32px;padding:6px 8px;font-size:11px">Ver detalhes</button>
        <input type="number" min="0" step="0.01" value="${budget}" data-budget="${cat.name}" />
      </div>
    </div>
  `).join('');

  wrap.querySelectorAll('.goal-card').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.matches('input')) return;
      selectedCategory = el.dataset.cat;
      renderAll();
      ensureMonthAutoSaved();
    });
  });
  wrap.querySelectorAll('button[data-open-details]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      selectedCategory = btn.dataset.openDetails;
      openDetailModal(selectedCategory);
    });
  });
  wrap.querySelectorAll('input[data-budget]').forEach(inp => {
    const stop = (e) => e.stopPropagation();
    inp.addEventListener('click', stop);
    inp.addEventListener('mousedown', stop);
    inp.addEventListener('mouseup', stop);
    inp.addEventListener('touchstart', stop, {passive:true});
    inp.addEventListener('pointerdown', stop);
    inp.addEventListener('input', e => {
      setBudget(e.target.dataset.budget, e.target.value);
      renderBudgetDistribution();
      try{ addPercentualMeta(); }catch(err){}
      ensureMonthAutoSaved();
    });
    inp.addEventListener('change', e => {
      setBudget(e.target.dataset.budget, e.target.value);
      renderAll();
      ensureMonthAutoSaved();
    });
  });
}

function renderSummaryTable(data){
  const tbody = document.getElementById('summaryTable');
  const totals = categoryTotals(data);
  const rows = CATEGORY_RULES.filter(c => c.name !== 'Receitas').map(cat => {
    const budget = budgetFor(cat.name), spent = totals[cat.name]?.gasto || 0, remaining = budget - spent, st = statusFor(spent, budget);
    return { cat, budget, spent, remaining, st };
  }).sort((a,b) => a.st.rank - b.st.rank || b.spent - a.spent);

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.cat.icon} ${r.cat.name}</td>
      <td>${formatBRL(r.budget)}</td>
      <td class="bad">${formatBRL(r.spent)}</td>
      <td class="${r.remaining >= 0 ? 'good' : 'bad'}">${formatBRL(r.remaining)}</td>
      <td><span class="pill ${r.st.cls}">${r.st.text}</span></td>
    </tr>
  `).join('') || '<tr><td colspan="6" class="empty">Sem dados.</td></tr>';
}

function renderMetaAlerts(data){
  const totals = categoryTotals(data);
  const warnings = CATEGORY_RULES.filter(c => c.name !== 'Receitas').map(cat => {
    const budget = budgetFor(cat.name);
    const spent = totals[cat.name]?.gasto || 0;
    if (budget <= 0) return null;
    const remaining = budget - spent;
    const remainingPct = remaining / budget;
    const st = statusFor(spent, budget);
    return { cat, budget, spent, remaining, remainingPct, st };
  }).filter(Boolean).filter(x => x.st.cls === 'warn' || x.st.cls === 'bad')
    .sort((a,b) => a.st.rank - b.st.rank || a.remaining - b.remaining);

  const box = document.getElementById('metaAlertBox');
  if (!warnings.length){
    box.style.display = 'none';
    box.innerHTML = '';
    return;
  }

  box.style.display = 'block';
  box.innerHTML = `
    <div style="font-weight:800;font-size:13px;margin-bottom:6px">Avisos de meta</div>
    <div style="display:grid;gap:6px">
      ${warnings.map(w => {
        if (w.st.cls === 'bad'){
          return `<div class="tiny" style="font-size:12px;color:var(--bad)">${w.cat.icon} <strong>${w.cat.name}</strong>: meta estourada em ${formatBRL(Math.abs(w.remaining))}.</div>`;
        }
        return `<div class="tiny" style="font-size:12px;color:var(--warn)">${w.cat.icon} <strong>${w.cat.name}</strong>: faltam ${formatBRL(Math.max(w.remaining,0))}, ou seja, 20% ou menos da meta.</div>`;
      }).join('')}
    </div>
  `;
}

function refreshCompareSelectors(){
  const selA = document.getElementById('compareMonthA');
  const selB = document.getElementById('compareMonthB');
  if (!selA || !selB) return;
  const months = getArchiveMonthKeys();
  const opts = '<option value="">Selecione</option>' + months.map(m => `<option value="${m}">${monthLabel(m)}</option>`).join('');
  selA.innerHTML = opts;
  selB.innerHTML = opts;

  if (months.length >= 2){
    selA.value = months[1];
    selB.value = months[0];
  } else if (months.length === 1){
    selA.value = months[0];
    selB.value = months[0];
  }
}

function renderMonthComparison(){
  const a = document.getElementById('compareMonthA')?.value;
  const b = document.getElementById('compareMonthB')?.value;
  if (!a || !b){
    document.getElementById('compareMonthsText').textContent = 'Escolha dois meses salvos para comparar.';
    return;
  }
  const ma = getMonthStatsFromArchive(a);
  const mb = getMonthStatsFromArchive(b);
  const deltaExpense = mb.expense - ma.expense;
  document.getElementById('cmpIncome').textContent = `${formatBRL(ma.income)} → ${formatBRL(mb.income)}`;
  document.getElementById('cmpExpense').textContent = `${formatBRL(ma.expense)} → ${formatBRL(mb.expense)}`;
  document.getElementById('cmpBalance').textContent = `${formatBRL(ma.balance)} → ${formatBRL(mb.balance)}`;
  const deltaEl = document.getElementById('cmpDelta');
  deltaEl.textContent = formatBRL(deltaExpense);
  deltaEl.className = 'small-value ' + (deltaExpense <= 0 ? 'good' : 'bad');
  const status = deltaExpense > 0 ? 'aumentaram' : (deltaExpense < 0 ? 'diminuíram' : 'ficaram iguais');
  document.getElementById('compareMonthsText').innerHTML = `Comparando <strong>${monthLabel(a)}</strong> com <strong>${monthLabel(b)}</strong>, suas despesas <strong>${status}</strong>. Diferença: <strong>${formatBRL(Math.abs(deltaExpense))}</strong>.`;
}

function renderProjectionPanel(){
  const monthValue = document.getElementById('monthFilter')?.value || 'all';
  if (monthValue === 'all'){
    document.getElementById('projectionText').textContent = 'Selecione um mês específico no filtro para ver a projeção.';
    document.getElementById('projOpening').textContent = formatBRL(0);
    document.getElementById('projIncome').textContent = formatBRL(0);
    document.getElementById('projExpense').textContent = formatBRL(0);
    document.getElementById('projBalance').textContent = formatBRL(0);
    return;
  }
  const stats = monthStats(monthValue);
  document.getElementById('projOpening').textContent = formatBRL(stats.opening);
  document.getElementById('projIncome').textContent = formatBRL(stats.income);
  document.getElementById('projExpense').textContent = formatBRL(stats.expense);
  const balEl = document.getElementById('projBalance');
  balEl.textContent = formatBRL(stats.balance);
  balEl.className = 'small-value ' + (stats.balance >= 0 ? 'good' : 'bad');

  const upcomingInstallments = allTransactions
    .filter(t => !t.futuro && monthKey(t.data) > monthValue && /\d+\/\d+$/.test(t.descricao))
    .slice(0,6)
    .map(t => `${t.descricao} (${monthLabel(monthKey(t.data))})`);
  document.getElementById('projectionText').innerHTML = upcomingInstallments.length
    ? `Saldo projetado de <strong>${monthLabel(monthValue)}</strong>: <strong>${formatBRL(stats.balance)}</strong>.<br>Parcelas futuras encontradas: ${upcomingInstallments.join(', ')}.`
    : `Saldo projetado de <strong>${monthLabel(monthValue)}</strong>: <strong>${formatBRL(stats.balance)}</strong>.`;
}

function toggleComparePanel(){
  const panel = document.getElementById('compareMonthsPanel');
  if (!panel) return;
  panel.style.display = panel.style.display === 'none' || !panel.style.display ? 'block' : 'none';
  if (panel.style.display === 'block') {
    refreshCompareSelectors();
    renderMonthComparison();
  }
}

function toggleProjectionPanel(){
  const panel = document.getElementById('projectionPanel');
  if (!panel) return;
  panel.style.display = panel.style.display === 'none' || !panel.style.display ? 'block' : 'none';
  if (panel.style.display === 'block') renderProjectionPanel();
}

function populateCategoryMonthComparison(){
  const catSel = document.getElementById('compareCategorySelect');
  const m1 = document.getElementById('compareMonth1');
  const m2 = document.getElementById('compareMonth2');
  if (!catSel || !m1 || !m2) return;

  const categories = (CATEGORY_RULES || []).filter(c => c.name !== 'Receitas');
  const currentCat = catSel.value || '';
  catSel.innerHTML = categories.length
    ? categories.map(c => `<option value="${c.name}">${c.icon} ${c.name}</option>`).join('')
    : '<option value="">Sem categorias</option>';
  if (currentCat && [...catSel.options].some(o => o.value === currentCat)) catSel.value = currentCat;

  const months = [...new Set((allTransactions || [])
    .filter(t => t && !t.futuro && t.data)
    .map(t => monthKey(t.data))
    .filter(Boolean))]
    .sort()
    .reverse();

  if (!months.length){
    m1.innerHTML = '<option value="">Sem dados</option>';
    m2.innerHTML = '<option value="">Sem dados</option>';
    return;
  }

  const prev1 = m1.value || '';
  const prev2 = m2.value || '';
  const options = months.map(m => `<option value="${m}">${monthLabel(m)}</option>`).join('');
  m1.innerHTML = options;
  m2.innerHTML = options;

  if (prev1 && [...m1.options].some(o => o.value === prev1)) m1.value = prev1;
  else m1.value = months[Math.min(1, months.length - 1)];

  if (prev2 && [...m2.options].some(o => o.value === prev2)) m2.value = prev2;
  else m2.value = months[0];
}

function renderCategoryMonthComparison(){
  const catSel = document.getElementById('compareCategorySelect');
  const m1 = document.getElementById('compareMonth1');
  const m2 = document.getElementById('compareMonth2');
  const v1El = document.getElementById('cmpCatMonth1Value');
  const v2El = document.getElementById('cmpCatMonth2Value');
  const diffEl = document.getElementById('cmpCatDiffValue');
  const pctEl = document.getElementById('cmpCatPctValue');
  const noteEl = document.getElementById('cmpCatNote');
  if (!catSel || !m1 || !m2 || !v1El || !v2El || !diffEl || !pctEl || !noteEl) return;

  const categoryName = catSel.value;
  const month1 = m1.value;
  const month2 = m2.value;

  if (!categoryName || !month1 || !month2){
    v1El.textContent = formatBRL(0);
    v2El.textContent = formatBRL(0);
    diffEl.textContent = '— ' + formatBRL(0);
    pctEl.textContent = '— 0%';
    diffEl.className = 'small-value';
    pctEl.className = 'small-value';
    noteEl.textContent = 'Selecione a categoria e os dois meses para comparar.';
    return;
  }

  const value1 = monthExpenseForCategory(categoryName, month1);
  const value2 = monthExpenseForCategory(categoryName, month2);
  const diff = value2 - value1;
  const pct = value1 > 0 ? ((diff / value1) * 100) : (value2 > 0 ? 100 : 0);

  v1El.textContent = formatBRL(value1);
  v2El.textContent = formatBRL(value2);

  if (diff > 0){
    diffEl.textContent = '▲ ' + formatBRL(Math.abs(diff));
    pctEl.textContent = '▲ ' + `${Math.round(Math.abs(pct))}%`;
    diffEl.className = 'small-value bad';
    pctEl.className = 'small-value bad';
    noteEl.textContent = `${categoryName} aumentou de ${monthLabel(month1)} para ${monthLabel(month2)} em ${formatBRL(Math.abs(diff))}.`;
  } else if (diff < 0){
    diffEl.textContent = '▼ ' + formatBRL(Math.abs(diff));
    pctEl.textContent = '▼ ' + `${Math.round(Math.abs(pct))}%`;
    diffEl.className = 'small-value good';
    pctEl.className = 'small-value good';
    noteEl.textContent = `${categoryName} diminuiu de ${monthLabel(month1)} para ${monthLabel(month2)} em ${formatBRL(Math.abs(diff))}.`;
  } else {
    diffEl.textContent = '• ' + formatBRL(0);
    pctEl.textContent = '• 0%';
    diffEl.className = 'small-value';
    pctEl.className = 'small-value';
    noteEl.textContent = `${categoryName} ficou igual em ${monthLabel(month1)} e ${monthLabel(month2)}.`;
  }
}

function getEffectiveMonthForInsights(){
  const selected = document.getElementById('monthFilter')?.value || 'all';
  if (selected && selected !== 'all') return selected;
  const rows = Array.isArray(allTransactions) ? allTransactions : [];
  const months = [...new Set(rows
    .filter(t => t && !t.futuro && t.data)
    .map(t => monthKey(t.data))
    .filter(Boolean))]
    .sort()
    .reverse();
  return months[0] || '';
}

function getPreviousMonthKey(monthValue){
  if (!monthValue) return '';
  const [y,m] = monthValue.split('-').map(Number);
  const prev = new Date(y, m - 2, 1);
  return prev.getFullYear() + '-' + String(prev.getMonth() + 1).padStart(2,'0');
}

function renderRankingPanel(){
  const table = document.getElementById('rankingTable');
  const note = document.getElementById('rankingNote');
  const badge = document.getElementById('rankingMonthLabel');
  if (!table || !note || !badge) return;

  const rowsAll = Array.isArray(allTransactions) ? allTransactions : [];
  const effectiveMonth = getEffectiveMonthForInsights();
  if (!effectiveMonth || !rowsAll.length){
    badge.textContent = 'Sem dados';
    table.innerHTML = '<tr><td colspan="4" class="empty">Sem dados para montar o ranking.</td></tr>';
    note.textContent = 'Importe um extrato ou use lançamentos manuais para montar o ranking.';
    return;
  }

  const rows = rowsAll.filter(t => !t.futuro && monthKey(t.data) === effectiveMonth && Number(t.valor || 0) < 0);
  const totalSpent = rows.reduce((s,t) => s + Math.abs(Number(t.valor || 0)), 0);
  const map = {};
  rows.forEach(t => {
    map[t.categoria] = (map[t.categoria] || 0) + Math.abs(Number(t.valor || 0));
  });

  const ranking = Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a,b) => b.value - a.value)
    .slice(0, 5);

  badge.textContent = monthLabel(effectiveMonth);

  if (!ranking.length){
    table.innerHTML = '<tr><td colspan="4" class="empty">Sem gastos no mês selecionado.</td></tr>';
    note.textContent = 'Não houve gastos no mês para montar o ranking.';
    return;
  }

  table.innerHTML = ranking.map((item, idx) => {
    const category = CATEGORY_RULES.find(c => c.name === item.name);
    const label = category ? `${category.icon} ${category.name}` : item.name;
    const pct = totalSpent > 0 ? Math.round((item.value / totalSpent) * 100) : 0;
    return `<tr>
      <td>${idx + 1}</td>
      <td>${label}</td>
      <td class="bad">${formatBRL(item.value)}</td>
      <td>${pct}%</td>
    </tr>`;
  }).join('');

  const top = ranking[0];
  const category = CATEGORY_RULES.find(c => c.name === top.name);
  const topLabel = category ? `${category.icon} ${category.name}` : top.name;
  note.textContent = `${topLabel} é a categoria que mais consumiu dinheiro em ${monthLabel(effectiveMonth)}, com ${formatBRL(top.value)}.`;
}

function buildTopDescriptionAlert(currentRows){
  const descMap = {};
  currentRows.forEach(t => {
    const key = (t.descricao || '').trim();
    if (!key) return;
    descMap[key] = (descMap[key] || 0) + Math.abs(Number(t.valor || 0));
  });
  const topEntry = Object.entries(descMap).sort((a,b) => b[1] - a[1])[0];
  if (!topEntry) return null;
  const [desc, value] = topEntry;
  const normalized = normalizeText(desc);
  const lower = normalized.toLowerCase();
  let prefix = 'Você está gastando muito com';
  if (lower.includes('ifood')) prefix = 'Você está gastando muito com iFood';
  return {
    level: 'warn',
    text: lower.includes('ifood')
      ? `Você está gastando muito com iFood: ${formatBRL(value)} no mês.`
      : `${prefix} ${desc}: ${formatBRL(value)} no mês.`
  };
}

function renderSmartAlerts(){
  const list = document.getElementById('smartAlertsList');
  const badge = document.getElementById('smartAlertsBadge');
  const note = document.getElementById('smartAlertsNote');
  if (!list || !badge || !note) return;

  const rowsAll = Array.isArray(allTransactions) ? allTransactions : [];
  const effectiveMonth = getEffectiveMonthForInsights();
  if (!effectiveMonth || !rowsAll.length){
    badge.textContent = 'Sem dados';
    list.innerHTML = '<div class="empty">Sem dados para gerar alertas.</div>';
    note.textContent = 'Os avisos aparecem quando houver lançamentos suficientes no mês.';
    return;
  }

  const prevMonth = getPreviousMonthKey(effectiveMonth);
  const currentRows = rowsAll.filter(t => !t.futuro && monthKey(t.data) === effectiveMonth && Number(t.valor || 0) < 0);
  const prevRows = rowsAll.filter(t => !t.futuro && monthKey(t.data) === prevMonth && Number(t.valor || 0) < 0);

  const alerts = [];
  const catCurrent = {};
  const catPrev = {};
  currentRows.forEach(t => { catCurrent[t.categoria] = (catCurrent[t.categoria] || 0) + Math.abs(Number(t.valor || 0)); });
  prevRows.forEach(t => { catPrev[t.categoria] = (catPrev[t.categoria] || 0) + Math.abs(Number(t.valor || 0)); });

  Object.keys(catCurrent).forEach(cat => {
    const currentVal = catCurrent[cat] || 0;
    const prevVal = catPrev[cat] || 0;
    if (prevVal > 0 && currentVal >= prevVal * 1.2){
      alerts.push({
        level: 'bad',
        text: `${cat} veio mais alta que no mês anterior: ${formatBRL(currentVal)} agora contra ${formatBRL(prevVal)} antes.`
      });
    }
  });

  const keywords = [
    { label:'conta de luz', terms:['enel','luz','energia'] },
    { label:'internet', terms:['internet','claro','vivo fibra','tim live'] },
    { label:'água', terms:['agua','água','sabesp'] }
  ];

  keywords.forEach(k => {
    const curr = currentRows.filter(t => k.terms.some(term => normalizeText(t.descricao).includes(normalizeText(term))))
      .reduce((s,t) => s + Math.abs(Number(t.valor || 0)), 0);
    const prev = prevRows.filter(t => k.terms.some(term => normalizeText(t.descricao).includes(normalizeText(term))))
      .reduce((s,t) => s + Math.abs(Number(t.valor || 0)), 0);
    if (prev > 0 && curr >= prev * 1.15){
      alerts.push({
        level: 'warn',
        text: `Sua ${k.label} veio mais alta que no mês anterior: ${formatBRL(curr)} agora contra ${formatBRL(prev)} antes.`
      });
    }
  });

  const topDescAlert = buildTopDescriptionAlert(currentRows);
  if (topDescAlert) alerts.push(topDescAlert);

  const totalSpent = currentRows.reduce((s,t) => s + Math.abs(Number(t.valor || 0)), 0);
  const topCategory = Object.entries(catCurrent).sort((a,b) => b[1] - a[1])[0];
  if (topCategory && totalSpent > 0){
    const pct = Math.round((topCategory[1] / totalSpent) * 100);
    if (pct >= 35){
      alerts.push({
        level: 'warn',
        text: `${topCategory[0]} concentra ${pct}% dos seus gastos do mês (${formatBRL(topCategory[1])}).`
      });
    }
  }

  const uniqueAlerts = [];
  const seen = new Set();
  alerts.forEach(a => {
    if (!seen.has(a.text)){
      seen.add(a.text);
      uniqueAlerts.push(a);
    }
  });

  if (!uniqueAlerts.length){
    badge.textContent = 'Sem alertas';
    badge.className = 'pill';
    list.innerHTML = '<div class="empty">Nenhum alerta importante encontrado no mês selecionado.</div>';
    note.textContent = `Os alertas são comparados principalmente com ${prevMonth ? monthLabel(prevMonth) : 'o histórico disponível'}.`;
    return;
  }

  badge.textContent = `${uniqueAlerts.length} alerta(s)`;
  badge.className = 'pill warn';
  list.innerHTML = uniqueAlerts.slice(0, 5).map(alert => `
    <div class="smart-alert-item" title="${alert.text}">
      <span class="icon">${alert.level === 'bad' ? '🔴' : '🟡'}</span>
      <span class="text">${alert.text}</span>
    </div>
  `).join('');
  note.textContent = `Os alertas analisam ${monthLabel(effectiveMonth)} e comparam com ${prevMonth ? monthLabel(prevMonth) : 'o histórico disponível'}.`;
}

function renderAll(){
  populateCategoryActionSelect();
  const data = filteredTransactions();
  renderKPIs(data); renderBudgetDistribution(); renderMetaAlerts(data); renderCategoryCards(data); renderSummaryTable(data); renderChart(data); renderCategoryDetail(data); renderCategoryConfig(); renderRuleList();
  saveDashboardSession();
  refreshSavedMonthSelect();

  try{ populateCategoryMonthComparison(); renderCategoryMonthComparison(); }catch(e){ console.error(e); }
}

function clearAll(){
  clearDashboardSession();
  allTransactions = []; currentFileName = 'Nenhum'; openingBalance = 0; selectedCategory = null; selectedSubcategoryFilter = ''; detailsCollapsed = false; detailMode = 'rows';
  document.getElementById('detailSearch').value = '';
  if (document.getElementById('detailSubcategoryFilter')) document.getElementById('detailSubcategoryFilter').innerHTML = '<option value="">Todas as subcategorias</option>';
  document.getElementById('monthFilter').innerHTML = '<option value="all">Todos os meses</option>';
  document.getElementById('arquivoInfo').textContent = 'Nenhum';
  document.getElementById('saldoInicialKpi').textContent = formatBRL(0);
  document.getElementById('entradasKpi').textContent = formatBRL(0);
  document.getElementById('saidasKpi').textContent = formatBRL(0);
  document.getElementById('saldoFinalKpi').textContent = formatBRL(0);
  document.getElementById('qtdeKpi').textContent = '0';
  document.getElementById('periodoInfo').textContent = 'Sem dados';
  document.getElementById('metaAlertBox').style.display = 'none'; document.getElementById('metaAlertBox').innerHTML = ''; document.getElementById('categoryCards').innerHTML = '<div class="empty">Importe o extrato para ver as metas.</div>';
  document.getElementById('summaryTable').innerHTML = '<tr><td colspan="6" class="empty">Importe o extrato para preencher.</td></tr>';
  document.getElementById('detailTitle').textContent = 'Selecione uma categoria';
  document.getElementById('detailStatus').textContent = '—';
  document.getElementById('detailStatus').className = 'pill';
  document.getElementById('detailBudget').textContent = formatBRL(0);
  document.getElementById('detailSpent').textContent = formatBRL(0);
  document.getElementById('detailRemaining').textContent = formatBRL(0);
  document.getElementById('detailDays').textContent = '0';
  document.getElementById('detailTable').innerHTML = '<tr><td colspan="6" class="empty">Importe o extrato e clique em uma categoria.</td></tr>';
  document.getElementById('detailDayView').innerHTML = '';
  document.getElementById('detailNote').textContent = 'Use esta janela para analisar, filtrar, criar subcategorias, definir metas por subcategoria, editar categoria e subcategoria, e excluir lançamentos.';
  if (categoryChart) { categoryChart.destroy(); categoryChart = null; }
  populateCategoryActionSelect(); renderCategoryConfig(); renderRuleList(); renderCategoryDetail([]);
}

function addPercentualMeta(){
  try{
    document.querySelectorAll('.goal-card').forEach(card => {
      const spentText = card.querySelector('.spent-big')?.textContent || '';
      const helperText = card.querySelector('.helper')?.textContent || '';
      const budgetMatch = helperText.match(/Meta\s+R\$\s*([\d\.]+,\d{2})/);
      if (!budgetMatch) return;

      const spentMatch = spentText.match(/R\$\s*([\d\.]+,\d{2})/);
      if (!spentMatch) return;

      const parseBR = (s) => Number(String(s).replace(/\./g,'').replace(',','.')) || 0;
      const spent = parseBR(spentMatch[1]);
      const budget = parseBR(budgetMatch[1]);
      if (!budget) return;

      const percent = Math.round((spent / budget) * 100);
      let color = '#22c55e';
      if (percent >= 70) color = '#eab308';
      if (percent >= 100) color = '#ef4444';

      let badge = card.querySelector('.percentual-meta-badge');
      if (!badge){
        badge = document.createElement('div');
        badge.className = 'percentual-meta-badge';
        badge.style.fontSize = '12px';
        badge.style.fontWeight = '700';
        badge.style.marginTop = '4px';
        card.appendChild(badge);
      }

      badge.style.color = color;
      badge.textContent = percent + '% da meta';
    });
  }catch(e){
    console.error('Erro ao calcular percentual da meta', e);
  }
}

document.addEventListener('DOMContentLoaded', function(){
  setTimeout(addPercentualMeta, 120);
});

const __originalRenderAllPercentual = window.renderAll;

if (__originalRenderAllPercentual){
  window.renderAll = function(){
    __originalRenderAllPercentual();
    setTimeout(addPercentualMeta, 80);
  }
}

document.addEventListener('DOMContentLoaded', function(){
  const ids = ['compareCategorySelect','compareMonth1','compareMonth2'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', renderCategoryMonthComparison);
  });
  setTimeout(function(){
    try{ populateCategoryMonthComparison(); renderCategoryMonthComparison(); }catch(e){}
  }, 180);
});

function initCategoryComparison(){
  try{
    populateCategoryMonthComparison();
    renderCategoryMonthComparison();
    ['compareCategorySelect','compareMonth1','compareMonth2'].forEach(function(id){
      const el = document.getElementById(id);
      if (el && !el.dataset.boundCompare){
        el.addEventListener('change', renderCategoryMonthComparison);
        el.dataset.boundCompare = '1';
      }
    });
  }catch(e){
    console.error('Erro na comparação por categoria', e);
  }
}

document.addEventListener('DOMContentLoaded', function(){
  setTimeout(initCategoryComparison, 200);
});

window.addEventListener('load', function(){
  setTimeout(initCategoryComparison, 400);
});

document.addEventListener('DOMContentLoaded', function(){
  try{
    const compare = document.getElementById('categoryComparePanel');
    const chartCanvas = document.getElementById('categoryChart');
    if(compare && chartCanvas){
      const chartSection = chartCanvas.closest('section');
      if(chartSection && chartSection.parentNode){
        chartSection.parentNode.insertBefore(compare, chartSection.nextSibling);
      }
    }
  }catch(e){
    console.log('Erro ao mover card de comparação', e);
  }
});

function initInsightsPanels(){
  try{ populateCategoryMonthComparison(); }catch(e){ console.error(e); }
  try{ renderCategoryMonthComparison(); }catch(e){ console.error(e); }
  try{ renderRankingPanel(); }catch(e){ console.error(e); }
  try{ renderSmartAlerts(); }catch(e){ console.error(e); }
}

document.addEventListener('DOMContentLoaded', function(){
  setTimeout(initInsightsPanels, 250);
  setTimeout(initInsightsPanels, 1000);
});

window.addEventListener('load', function(){
  setTimeout(initInsightsPanels, 400);
  setTimeout(initInsightsPanels, 1200);
});

document.addEventListener('change', function(e){
  if (e.target && (e.target.id === 'monthFilter' || e.target.id === 'savedMonthSelect' || e.target.id === 'fileInput')){
    setTimeout(initInsightsPanels, 180);
  }
});

document.addEventListener('click', function(e){
  if (e.target && (
    e.target.id === 'saveMonthBtn' ||
    e.target.id === 'resetBtn' ||
    e.target.id === 'saveEntryBtn' ||
    e.target.id === 'saveInstallmentBtn' ||
    e.target.id === 'saveFixedBtn'
  )){
    setTimeout(initInsightsPanels, 250);
  }
});
