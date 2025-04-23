// Importar Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

// Configuración de Firebase (con los datos de tu proyecto)
const firebaseConfig = {
  apiKey: "AIzaSyBUlHiaEpxH5D3lgI0c3shbEBP53gdp970",
  authDomain: "modisteria-71f30.firebaseapp.com",
  projectId: "modisteria-71f30",
  storageBucket: "modisteria-71f30.firebasestorage.app",
  messagingSenderId: "813272222816",
  appId: "1:813272222816:web:62bd337834ced61a1d0705"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Firestore
const db = getFirestore(app);

// Inicializar Firebase Auth (si es necesario para autenticación)
const auth = getAuth(app);

// Exportar la base de datos y la autenticación para que se puedan usar en otros archivos
export { db, auth };
