// firebase-config.js — conexão do Prosperis com o Firebase (projeto: prosperis-app)
//
// Este arquivo só INICIALIZA a conexão. Ele ainda não troca o localStorage
// pelo Firestore nos módulos (categories.js, budgets.js, transactions.js etc.) —
// isso é o próximo passo, feito com calma módulo por módulo.
//
// O apiKey abaixo NÃO é secreto: é seguro deixá-lo público (inclusive no GitHub).
// A segurança de verdade vem das Regras do Firestore + do login obrigatório,
// que já publicamos.

const firebaseConfig = {
  apiKey: "AIzaSyCcK93JIdSVQ3CwSRP4SbFqeNjzT3yVGUE",
  authDomain: "prosperis-app.firebaseapp.com",
  projectId: "prosperis-app",
  storageBucket: "prosperis-app.firebasestorage.app",
  messagingSenderId: "5735463153",
  appId: "1:5735463153:web:bf5b9f9933ce17011e9150"
};

firebase.initializeApp(firebaseConfig);

// auth e db ficam disponíveis pra todos os outros arquivos .js (mesmo escopo global)
const auth = firebase.auth();
const db = firebase.firestore();

// Log simples só pra confirmar no console do navegador que a conexão foi feita.
// (Não confirma se as credenciais estão certas, só que o SDK inicializou sem erro.)
console.log("Prosperis: Firebase conectado ao projeto", firebaseConfig.projectId);
