// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBUlHiaEpxH5D3lgI0c3shbEBP53gdp970",
    authDomain: "modisteria-71f30.firebaseapp.com",
    projectId: "modisteria-71f30",
    storageBucket: "modisteria-71f30.firebasestorage.app",
    messagingSenderId: "813272222816",
    appId: "1:813272222816:web:62bd337834ced61a1d0705"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Exporta los servicios que usarás
export const auth = getAuth(app);
export const db = getFirestore(app);