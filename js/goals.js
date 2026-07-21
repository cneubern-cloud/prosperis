// goals.js — parte do Prosperis (extraído automaticamente, revisar dependências ao editar)

const RESERVA_META_KEY = "prosperis_reserva_meta";

const RESERVA_VALOR_KEY = "prosperis_reserva_valor";

function atualizarReserva(){
  const meta = Number(localStorage.getItem(RESERVA_META_KEY) || 1000);
  const valor = Number(localStorage.getItem(RESERVA_VALOR_KEY) || 0);

  const perc = meta > 0 ? Math.round((valor/meta)*100) : 0;

  const metaEl = document.getElementById("reservaMeta");
  const valorEl = document.getElementById("reservaGuardado");
  const percEl = document.getElementById("reservaPercentual");

  if(metaEl) metaEl.textContent = formatBRL(meta);
  if(valorEl) valorEl.textContent = formatBRL(valor);
  if(percEl) percEl.textContent = perc + "%";
}

function editarReservaMeta(){
  const nova = prompt("Qual a meta da sua Reserva de Segurança?");
  if(nova){
    localStorage.setItem(RESERVA_META_KEY, Number(nova));
    atualizarReserva();
  }
}

function registrarReserva(){
  const valor = prompt("Quanto você quer guardar agora?");
  if(valor){
    const atual = Number(localStorage.getItem(RESERVA_VALOR_KEY) || 0);
    localStorage.setItem(RESERVA_VALOR_KEY, atual + Number(valor));
    atualizarReserva();
  }
}

document.addEventListener("DOMContentLoaded", function(){
  setTimeout(atualizarReserva, 300);
});

const SONHO_NOME_KEY = "prosperis_sonho_nome";

const SONHO_META_KEY = "prosperis_sonho_meta";

const SONHO_VALOR_KEY = "prosperis_sonho_valor";

function atualizarReservaSonhos(){
  const nome = localStorage.getItem(SONHO_NOME_KEY) || "Meu sonho";
  const meta = Number(localStorage.getItem(SONHO_META_KEY) || 0);
  const valor = Number(localStorage.getItem(SONHO_VALOR_KEY) || 0);
  const perc = meta > 0 ? Math.round((valor / meta) * 100) : 0;

  const nomeEl = document.getElementById("sonhoNome");
  const metaEl = document.getElementById("sonhoMeta");
  const valorEl = document.getElementById("sonhoGuardado");
  const percEl = document.getElementById("sonhoPercentual");

  if (nomeEl) nomeEl.textContent = nome;
  if (metaEl) metaEl.textContent = typeof formatBRL === 'function' ? formatBRL(meta) : `R$ ${meta}`;
  if (valorEl) valorEl.textContent = typeof formatBRL === 'function' ? formatBRL(valor) : `R$ ${valor}`;
  if (percEl) percEl.textContent = perc + "%";
}

function definirSonho(){
  const nomeAtual = localStorage.getItem(SONHO_NOME_KEY) || "";
  const metaAtual = localStorage.getItem(SONHO_META_KEY) || "";
  const nome = prompt("Qual o nome do seu sonho? Ex.: viagem, casamento, carro, celular", nomeAtual);
  if (nome === null) return;

  const meta = prompt("Quanto você precisa para realizar esse sonho?", metaAtual);
  if (meta === null) return;

  localStorage.setItem(SONHO_NOME_KEY, nome.trim() || "Meu sonho");
  localStorage.setItem(SONHO_META_KEY, Number(meta || 0));
  atualizarReservaSonhos();
}

function registrarSonho(){
  const valor = prompt("Quanto você quer guardar agora para esse sonho?");
  if (valor === null) return;

  const atual = Number(localStorage.getItem(SONHO_VALOR_KEY) || 0);
  localStorage.setItem(SONHO_VALOR_KEY, atual + Number(valor || 0));
  atualizarReservaSonhos();
}

function resetarSonho(){
  const ok = confirm("Deseja limpar os dados da Reserva de Sonhos?");
  if (!ok) return;
  localStorage.removeItem(SONHO_NOME_KEY);
  localStorage.removeItem(SONHO_META_KEY);
  localStorage.removeItem(SONHO_VALOR_KEY);
  atualizarReservaSonhos();
}

document.addEventListener("DOMContentLoaded", function(){
  setTimeout(atualizarReservaSonhos, 350);
});
