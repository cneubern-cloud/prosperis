// charts.js — parte do Prosperis (extraído automaticamente, revisar dependências ao editar)

let categoryChart = null;

function renderChart(data){
  const totals = categoryTotals(data);
  const cats = CATEGORY_RULES
    .filter(c => c.name !== 'Receitas')
    .map(c => {
      const spent = totals[c.name]?.gasto || 0;
      const budget = Number(c.budget || 0);
      return {
        label: `${c.icon} ${c.name}`,
        spent,
        budget,
        spentWithin: budget > 0 ? Math.min(spent, budget) : spent,
        remaining: budget > 0 ? Math.max(budget - spent, 0) : 0,
        overspent: budget > 0 ? Math.max(spent - budget, 0) : 0
      };
    })
    .filter(c => c.spent > 0 || c.budget > 0)
    .sort((a,b) => Math.max(b.spent, b.budget) - Math.max(a.spent, a.budget));

  const labels = cats.map(c => c.label);
  const spentWithinValues = cats.map(c => c.spentWithin);
  const remainingValues = cats.map(c => c.remaining);
  const overspentValues = cats.map(c => c.overspent);

  const subtitle = document.getElementById('chartSubtitle');
  if (subtitle){
    subtitle.textContent = labels.length ? `${labels.length} categoria(s)` : 'Sem gastos';
  }

  if (categoryChart) categoryChart.destroy();

  const fixedColors = [
    '#f59e0b','#ef4444','#3b82f6','#22c55e','#a855f7',
    '#f97316','#06b6d4','#84cc16','#ec4899','#eab308',
    '#dc2626','#2563eb','#16a34a','#9333ea','#14b8a6',
    '#f43f5e','#0ea5e9','#65a30d','#ca8a04','#7c3aed'
  ];

  categoryChart = new Chart(document.getElementById('categoryChart'), {
    type:'bar',
    data:{
      labels,
      datasets:[
        {
          label:'Gasto',
          data: spentWithinValues,
          backgroundColor: labels.map((label, i) => {
          const parts = String(label || '').split(' ');
          const name = parts.slice(1).join(' ');
          const category = CATEGORY_RULES.find(c => c.name === name);
          return category?.color || fixedColors[i % fixedColors.length];
        }),
          borderRadius:8,
          borderSkipped:false,
          stack:'meta'
        },
        {
          label:'Disponível',
          data: remainingValues,
          backgroundColor:'rgba(148,163,184,0.35)',
          borderColor:'rgba(148,163,184,0.7)',
          borderWidth:1,
          borderRadius:8,
          borderSkipped:false,
          stack:'meta'
        },
        {
          label:'Excedido',
          data: overspentValues,
          backgroundColor:'rgba(220,38,38,0.9)',
          borderRadius:6,
          borderSkipped:false,
          stack:'extra'
        }
      ]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      animation:{ duration:650 },
      layout:{ padding:{ top:18, right:12, bottom:8, left:8 } },
      plugins:{
        legend:{
          display:true,
          position:'top',
          labels:{ boxWidth:12, usePointStyle:true, pointStyle:'rectRounded' }
        },
        tooltip:{
          displayColors:true,
          backgroundColor:'#111827',
          padding:10,
          callbacks:{
            label:(ctx)=> `${ctx.dataset.label}: ` + Number(ctx.raw || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),
            afterBody:(items)=>{
              const i = items[0].dataIndex;
              const spent = cats[i].spent || 0;
              const budget = cats[i].budget || 0;
              if (budget <= 0 && spent > 0) return 'Sem meta definida';
              if (spent > budget) return `Excedeu: ${Number(spent - budget).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}`;
              return `Restante: ${Number(budget - spent).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}`;
            }
          }
        }
      },
      scales:{
        x:{
          stacked:true,
          grid:{ display:false },
          ticks:{
            maxRotation:35,
            minRotation:35,
            font:{ size:11, weight:'600' }
          }
        },
        y:{
          stacked:true,
          beginAtZero:true,
          grid:{ color:'#edf2f7' },
          border:{ display:false },
          ticks:{
            callback:(value)=> Number(value).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
          }
        }
      }
    }
  });
}
