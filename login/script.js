import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCzz0INhgBUARAxqLlMnCC8vyCciI9jpJk",
    authDomain: "tuntas-04.firebaseapp.com",
    projectId: "tuntas-04",
    storageBucket: "tuntas-04.firebasestorage.app",
    messagingSenderId: "509433415219",
    appId: "1:509433415219:web:e485a0eab1a612fda64546"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- PROTEKSI & AUTO LOGIN GUARD ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.role === 'admin') {
                window.location.href = "admin/index.html";
            } else {
                window.location.href = "user/index.html";
            }
        }
    }
});

// --- ENGINE PROSES LOGIN ---
async function prosesLogin() {
    const hpInput = document.getElementById('loginHp').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const errorEl = document.getElementById('errorMsg');
    const btn = document.getElementById('btnLogin');

    if(!hpInput || !password) {
        errorEl.innerText = "Nomor HP dan Password wajib diisi!";
        errorEl.classList.remove('hidden');
        return;
    }

    errorEl.classList.add('hidden');
    btn.disabled = true;
    btn.innerText = "Memverifikasi...";

    // Bungkus no hp jadi format email Firebase Auth
    const emailFormat = `${hpInput}@tuntas.com`;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, emailFormat, password);
        const user = userCredential.user;

        const userDoc = await getDoc(doc(db, "users", user.uid));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            if (userData.role === 'admin') {
                window.location.href = "admin/index.html";
            } else {
                window.location.href = "user/index.html";
            }
        } else {
            errorEl.innerText = "Akun tidak terdaftar di database!";
            errorEl.classList.remove('hidden');
            btn.disabled = false;
            btn.innerText = "Masuk ke Aplikasi";
        }

    } catch (error) {
        console.error(error);
        let pesanError = "Nomor HP atau password salah!";
        if (error.code === 'auth/network-request-failed') {
            pesanError = "Koneksi internet bermasalah!";
        }
        errorEl.innerText = pesanError;
        errorEl.classList.remove('hidden');
        btn.disabled = false;
        btn.innerText = "Masuk ke Aplikasi";
    }
}

document.getElementById('btnLogin').addEventListener('click', prosesLogin);
