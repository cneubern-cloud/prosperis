// auth.js — parte do Prosperis
//
// Login/cadastro real com Firebase Authentication (e-mail/senha).
// Substitui a antiga senha fixa gravada no localStorage.
//
// Depende de firebase-config.js (carregado antes deste arquivo), que já
// deixa prontos os objetos globais `auth` e `db`.

let authMode = "login"; // "login" ou "signup"

function showLoginOverlay(){
  const overlay = document.getElementById("loginOverlay");
  if (overlay) overlay.style.display = "flex";
}

function hideLoginOverlay(){
  const overlay = document.getElementById("loginOverlay");
  if (overlay) overlay.style.display = "none";
}

function setAuthError(msg){
  const error = document.getElementById("authError");
  if(!error) return;
  if(msg){
    error.textContent = msg;
    error.style.display = "block";
  } else {
    error.style.display = "none";
  }
}

// Traduz os códigos de erro do Firebase pra mensagens que fazem sentido em português
function translateAuthError(error){
  const code = error && error.code;
  const map = {
    "auth/invalid-email": "E-mail inválido.",
    "auth/user-not-found": "Não existe conta com esse e-mail.",
    "auth/wrong-password": "Senha incorreta.",
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/email-already-in-use": "Já existe uma conta com esse e-mail.",
    "auth/weak-password": "A senha precisa ter no mínimo 6 caracteres.",
    "auth/missing-password": "Digite uma senha.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde um pouco e tente de novo."
  };
  return map[code] || "Não foi possível concluir. Tente novamente.";
}

function setAuthMode(mode){
  authMode = mode;
  const nameInput = document.getElementById("authName");
  const subtitle = document.getElementById("authSubtitle");
  const submitBtn = document.getElementById("authSubmitBtn");
  const toggleBtn = document.getElementById("authToggleModeBtn");
  setAuthError(null);

  if(mode === "signup"){
    if(nameInput) nameInput.style.display = "block";
    if(subtitle) subtitle.textContent = "Crie sua conta pra começar";
    if(submitBtn) submitBtn.textContent = "Criar conta";
    if(toggleBtn) toggleBtn.textContent = "Já tem conta? Entrar";
  } else {
    if(nameInput) nameInput.style.display = "none";
    if(subtitle) subtitle.textContent = "Entre com seu e-mail e senha";
    if(submitBtn) submitBtn.textContent = "Entrar";
    if(toggleBtn) toggleBtn.textContent = "Não tem conta? Criar conta";
  }
}

function handleAuthSubmit(){
  const email = (document.getElementById("authEmail")||{}).value?.trim();
  const password = (document.getElementById("authPassword")||{}).value;
  const name = (document.getElementById("authName")||{}).value?.trim();

  setAuthError(null);

  if(!email || !password){
    setAuthError("Preencha e-mail e senha.");
    return;
  }

  if(authMode === "signup"){
    auth.createUserWithEmailAndPassword(email, password)
      .then((cred) => {
        // Primeira escrita real no Firestore: cria o "perfil" do cliente,
        // seguindo exatamente o desenho de dados que combinamos (users/{uid}/perfil).
        return db.collection("users").doc(cred.user.uid).set({
          nome: name || email.split("@")[0],
          email: email,
          criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
          plano: "gratuito"
        });
      })
      .catch((error) => setAuthError(translateAuthError(error)));
  } else {
    auth.signInWithEmailAndPassword(email, password)
      .catch((error) => setAuthError(translateAuthError(error)));
  }
}

function handleForgotPassword(){
  const email = (document.getElementById("authEmail")||{}).value?.trim();
  if(!email){
    setAuthError("Digite seu e-mail acima e clique em \"Esqueci minha senha\" de novo.");
    return;
  }
  auth.sendPasswordResetEmail(email)
    .then(() => setAuthError("Enviamos um link de recuperação para " + email + "."))
    .catch((error) => setAuthError(translateAuthError(error)));
}

function logoutUser(){
  auth.signOut();
}

function initLogin(){
  const overlay = document.getElementById("loginOverlay");
  const submitBtn = document.getElementById("authSubmitBtn");
  const toggleBtn = document.getElementById("authToggleModeBtn");
  const forgotBtn = document.getElementById("authForgotPasswordBtn");
  const passwordInput = document.getElementById("authPassword");
  if(!overlay || !submitBtn) return;

  submitBtn.addEventListener("click", handleAuthSubmit);
  if(passwordInput){
    passwordInput.addEventListener("keydown", function(e){
      if(e.key === "Enter") handleAuthSubmit();
    });
  }
  if(toggleBtn){
    toggleBtn.addEventListener("click", function(){
      setAuthMode(authMode === "login" ? "signup" : "login");
    });
  }
  if(forgotBtn){
    forgotBtn.addEventListener("click", handleForgotPassword);
  }

  setAuthMode("login");

  // onAuthStateChanged é o "coração" do login: dispara sempre que o estado
  // muda (login, logout, ou quando a página recarrega e o Firebase já
  // lembra a sessão). É por aqui que decidimos mostrar ou esconder a tela.
  auth.onAuthStateChanged(function(user){
    if(user){
      hideLoginOverlay();
      updateWelcome();
    } else {
      showLoginOverlay();
    }
  });
}

document.addEventListener("DOMContentLoaded", initLogin);


// ---- Nome do usuário (agora vem do Firestore, não mais de um prompt()) ----

function updateWelcome(){
  const el = document.getElementById("welcomeText");
  if(!el || !auth.currentUser) return;
  el.textContent = "Olá! Vamos organizar suas finanças?";
  db.collection("users").doc(auth.currentUser.uid).get()
    .then((doc) => {
      const nome = doc.exists ? doc.data().nome : null;
      el.textContent = "Olá, " + (nome || auth.currentUser.email) + "! Vamos organizar suas finanças?";
    })
    .catch(() => {
      el.textContent = "Olá, " + auth.currentUser.email + "! Vamos organizar suas finanças?";
    });
}

function changeUserName(){
  if(!auth.currentUser) return;
  const newName = prompt("Digite o novo nome:");
  if(newName){
    db.collection("users").doc(auth.currentUser.uid).update({ nome: newName })
      .then(updateWelcome)
      .catch((error) => alert("Não foi possível salvar o nome: " + error.message));
  }
}
