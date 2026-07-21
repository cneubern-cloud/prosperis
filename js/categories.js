// categories.js — parte do Prosperis (extraído automaticamente, revisar dependências ao editar)

const DEFAULT_CATEGORY_RULES = [
  { name:'Moradia', icon:'🏠', keywords:['aluguel','condominio','condomínio','iptu','imovel','imóvel'], budget:1200 },
  { name:'Contas da casa', icon:'💡', keywords:['enel','sabesp','claro','internet','vivo','tim','gas','gás','luz','agua','água'], budget:450 },
  { name:'Mercado e alimentação', icon:'🛒', keywords:['mercado','supermercado','ifood','restaurante','padaria','fornatto','juninhos','sumalev','nossa casa'], budget:900 },
  { name:'Transporte', icon:'🚗', keywords:['uber','99','posto','combustivel','combustível','ipva'], budget:400 },
  { name:'Saúde', icon:'💊', keywords:['farmacia','farmácia','droga','drogaria','consulta','clinica','clínica'], budget:250 },
  { name:'Dívidas e bancos', icon:'🏦', keywords:['renegociacao','renegociação','juros','iof','limite da conta','tarifa','anuidade'], budget:350 },
  { name:'Seguros', icon:'🛡️', keywords:['portoseg','seguro'], budget:200 },
  { name:'Impostos e taxas', icon:'📄', keywords:['das mei','imposto','taxa','tributo'], budget:150 },
  { name:'Receitas', icon:'💰', keywords:['salario','salário','folha','pix recebido','dev pix','sispag','ted recebida','credito','crédito','rend pago','aplic'], budget:0 },
  { name:'Outros', icon:'📌', keywords:[], budget:300 }
];

let CATEGORY_RULES = loadCategories();

let learnedRules = loadLearnedRules();

function normalizeText(text){ return String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(); }

function formatBRL(v){ return Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }

function loadCategories(){
  try{
    const saved = localStorage.getItem('custom_categories_v1');
    return saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(DEFAULT_CATEGORY_RULES));
  }catch(e){ return JSON.parse(JSON.stringify(DEFAULT_CATEGORY_RULES)); }
}

function saveCategories(){ localStorage.setItem('custom_categories_v1', JSON.stringify(CATEGORY_RULES)); }

function loadLearnedRules(){
  try{
    const saved = localStorage.getItem('learned_rules_v1');
    return saved ? JSON.parse(saved) : [];
  }catch(e){ return []; }
}

function saveLearnedRules(){ localStorage.setItem('learned_rules_v1', JSON.stringify(learnedRules)); }

function learnRuleFromDescription(description, category){
  const text = normalizeText(description);
  const tokens = text.split(/\s+/).filter(t => t.length >= 4 && !/^\d+$/.test(t));
  const keyword = tokens.slice(0,3).join(' ').trim();
  if (!keyword) return;
  const existing = learnedRules.find(r => r.keyword === keyword);
  if (existing) existing.category = category; else learnedRules.push({ keyword, category });
  saveLearnedRules();
}

function categorize(description, value){
  const d = normalizeText(description);
  if (value > 0) return 'Receitas';
  const learned = learnedRules.find(r => d.includes(normalizeText(r.keyword)));
  if (learned && CATEGORY_RULES.find(c => c.name === learned.category)) return learned.category;
  for (const cat of CATEGORY_RULES){
    if (cat.name === 'Receitas') continue;
    if ((cat.keywords || []).some(k => d.includes(normalizeText(k)))) return cat.name;
  }
  return 'Outros';
}
