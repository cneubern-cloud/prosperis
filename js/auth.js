// auth.js — parte do Prosperis (extraído automaticamente, revisar dependências ao editar)

const PROSPERIS_USER_KEY = "prosperis_user_name";

function getUserName(){
  let name = localStorage.getItem(PROSPERIS_USER_KEY);
  if(!name){
    name = prompt("Digite seu nome:");
    if(name){
      localStorage.setItem(PROSPERIS_USER_KEY, name);
    }else{
      name = "Usuário";
    }
  }
  return name;
}

function updateWelcome(){
  const el = document.getElementById("welcomeText");
  if(!el) return;
  const name = getUserName();
  el.textContent = "Olá, " + name + "! Vamos organizar suas finanças?";
}

function changeUserName(){
  const newName = prompt("Digite o novo nome:");
  if(newName){
    localStorage.setItem(PROSPERIS_USER_KEY, newName);
    updateWelcome();
  }
}

document.addEventListener("DOMContentLoaded", function(){
  setTimeout(updateWelcome, 200);
});

const PROSPERIS_PASSWORD_KEY = "prosperis_password";

const PROSPERIS_SESSION_KEY = "prosperis_session";

function getProsperisPassword(){
  let pwd = localStorage.getItem(PROSPERIS_PASSWORD_KEY);
  if(!pwd){
    pwd = "1234";
    localStorage.setItem(PROSPERIS_PASSWORD_KEY, pwd);
  }
  return pwd;
}

function showLoginOverlay(){
  const overlay = document.getElementById("loginOverlay");
  if (overlay) overlay.style.display = "flex";
}

function hideLoginOverlay(){
  const overlay = document.getElementById("loginOverlay");
  if (overlay) overlay.style.display = "none";
}

function checkLogin(){
  const input = document.getElementById("loginPassword");
  const error = document.getElementById("loginError");
  if(!input) return;
  if(input.value === getProsperisPassword()){
    sessionStorage.setItem(PROSPERIS_SESSION_KEY, "ok");
    hideLoginOverlay();
    if(error) error.style.display = "none";
  } else {
    if(error) error.style.display = "block";
    input.focus();
    input.select();
  }
}

function initLogin(){
  const overlay = document.getElementById("loginOverlay");
  const input = document.getElementById("loginPassword");
  const btn = document.getElementById("loginEnterBtn");
  if(!overlay || !input || !btn) return;

  btn.addEventListener("click", checkLogin);
  input.addEventListener("keydown", function(e){
    if(e.key === "Enter") checkLogin();
  });

  if(sessionStorage.getItem(PROSPERIS_SESSION_KEY) === "ok"){
    hideLoginOverlay();
  } else {
    showLoginOverlay();
    setTimeout(() => input.focus(), 200);
  }
}

document.addEventListener("DOMContentLoaded", initLogin);
