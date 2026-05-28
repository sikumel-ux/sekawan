import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAuth, onAuthStateChanged, updatePassword, signOut } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, query, where, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-storage.js";

// Konfigurasi Project Firebase Tuntas-04
const firebaseConfig = {
    apiKey: "AIzaSyCzz0INhgBUARAxqLlMnCC8vyCciI9jpJk",
    authDomain: "tuntas-04.firebaseapp.com",
    projectId: "tuntas-04",
    storageBucket: "tuntas-04.firebasestorage.app",
    messagingSenderId: "509433415219",
    appId: "1:509433415219:web:e485a0eab1a612fda64546"
};

// URL Google Apps Script Web App untuk Kas Umum RT
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzpZZt53kE0d5y7xXfsPFI21NKMx9MLh8N7NXkgtZV_u5QPg9ldAQApH4NzpGOShFDs/exec";

// Inisialisasi Firebase Services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

let currentUser = null;
let userDataGlobal = null;

const loadingEl = document.getElementById('loading');

function showLoading() { loadingEl.classList.remove('hidden'); }
function hideLoading() { loadingEl.classList.add('hidden'); }

// --- 🔒 SATELLITE SECURITY GUARD: CEK STATE USER ---
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        // Jika tidak ada session auth, kembalikan ke gerbang root login.html
        window.location.href = "../login";
    } else {
        currentUser = user;
        // Ambil data detail role dari Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid));
        
        if (userDoc.exists() && userDoc.data().role === 'warga') {
            userDataGlobal = userDoc.data();
            
            // Pasang Informasi Akun ke UI
            document.getElementById('userNama').innerText = userDataGlobal.nama;
            if (userDataGlobal.avatar_url) {
                document.getElementById('userAvatar').src = userDataGlobal.avatar_url;
            }
            
            // Eksekusi penarikan data dashboard
            loadDashboardWarga();
        } else {
            // Jika role ternyata admin atau data kosong, tendang balik
            window.location.href = "../login.html";
        }
    }
});

// --- 📊 RENDER & ENGINE DATA DASHBOARD ---
async function loadDashboardWarga() {
    showLoading();
    const hpUser = userDataGlobal.hp;
    const hariIni = new Date().toISOString().split('T')[0];

    try {
        // 1. Ambil Log Status Sampah Hari Ini dari Firestore
        const logSampahRef = doc(db, "log_sampah", `${hariIni}_${hpUser}`);
        const logSampahSnap = await getDoc(logSampahRef);
        const badge = document.getElementById('badgeSampahUser');
        
        if (logSampahSnap.exists()) {
            const sData = logSampahSnap.data();
            badge.innerText = `${sData.status} (${sData.waktu})`;
            badge.className = sData.status === "Diambil" 
                ? "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-100"
                : "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase bg-red-50 text-red-700 border border-red-100";
        } else {
            badge.innerText = "Belum Diabsen";
            badge.className = "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase bg-slate-100 text-slate-400 border border-slate-200";
        }

        // 2. Ambil Histori Pembayaran Iuran Warga dari Firestore
        const iuranQ = query(collection(db, "pembayaran_iuran"), where("hp_anggota", "==", hpUser));
        const iuranSnap = await getDocs(iuranQ);
        
        const containerIuran = document.getElementById('listIuranUser');
        containerIuran.innerHTML = '';
        let totalIuran = 0;

        if (iuranSnap.empty) {
            containerIuran.innerHTML = '<p class="text-center text-[11px] text-slate-400 py-4 font-bold">Belum ada riwayat iuran.</p>';
        } else {
            iuranSnap.forEach((doc) => {
                const d = doc.data();
                totalIuran += Number(d.nominal);
                containerIuran.insertAdjacentHTML('beforeend', `
                    <div class="bg-white p-4 rounded-2xl flex justify-between items-center border border-slate-50 shadow-sm">
                        <div>
                            <p class="text-xs font-black uppercase text-slate-700">Iuran Bulan: ${d.bulan_dibayar}</p>
                            <p class="text-[8px] text-slate-300 font-bold mt-0.5">${new Date(d.tanggal_bayar).toLocaleDateString('id-ID')}</p>
                        </div>
                        <p class="font-black text-xs text-emerald-700">+ Rp ${Number(d.nominal).toLocaleString('id-ID')}</p>
                    </div>
                `);
            });
        }
        document.getElementById('totalIuranUser').innerText = 'Rp ' + totalIuran.toLocaleString('id-ID');

        // 3. Ambil Log Kas Umum Transparan RT dari Google Sheets via Fetch Web App API
        let resSheets = await fetch(`${SCRIPT_URL}?action=loadAll`, { method: "GET" });
        let jsonSheets = await resSheets.json();
        if (jsonSheets.status === "success") {
            renderKasUmumSheets(jsonSheets.data.kas || [], jsonSheets.data.pembayaran || []);
        }

    } catch (e) {
        console.error("Gagal sinkronisasi data:", e);
    }
    hideLoading();
}

function renderKasUmumSheets(dataKas, dataIuranGlobal) {
    let totalMasuk = 0, totalKeluar = 0;
    let gabungan = [];

    dataKas.forEach(k => {
        let nom = Number(k.nominal || 0);
        if (k.kategori.toLowerCase() === 'masuk') totalMasuk += nom; else totalKeluar += nom;
        gabungan.push({ tgl: new Date(k.tanggal), ket: k.keterangan, nom: nom, tipe: k.kategori.toLowerCase() });
    });

    dataIuranGlobal.forEach(i => {
        let nom = Number(i.nominal || 0);
        totalMasuk += nom;
        gabungan.push({ tgl: new Date(i.tanggal), ket: `IURAN: ${i.nama.toUpperCase()} (${i.keterangan})`, nom: nom, tipe: 'masuk' });
    });

    document.getElementById('saldoUmumRT').innerText = 'Rp ' + (totalMasuk - totalKeluar).toLocaleString('id-ID');
    
    const containerKas = document.getElementById('listKasUmum');
    containerKas.innerHTML = '';
    
    gabungan.sort((a,b) => b.tgl - a.tgl).slice(0, 10).forEach(t => {
        const isMasuk = t.tipe === 'masuk';
        containerKas.insertAdjacentHTML('beforeend', `
            <div class="bg-white p-4 rounded-2xl flex justify-between items-center border border-slate-50 shadow-sm">
                <div>
                    <p class="text-[11px] font-black uppercase text-slate-700 max-w-[220px] truncate">${t.ket}</p>
                    <p class="text-[8px] text-slate-300 font-bold">${t.tgl.toLocaleDateString('id-ID')}</p>
                </div>
                <p class="font-black text-xs ${isMasuk ? 'text-emerald-700' : 'text-red-600'}">${isMasuk ? '+' : '-'} Rp ${t.nom.toLocaleString('id-ID')}</p>
            </div>
        `);
    });
}

// --- 📸 ENGINE MEDIA: UPLOAD AVATAR KE FIREBASE STORAGE ---
document.getElementById('btnPilihFoto').addEventListener('click', () => {
    document.getElementById('fileAvatar').click();
});

document.getElementById('fileAvatar').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const statusTxt = document.getElementById('avatarStatus');
    statusTxt.innerText = "Mengunggah foto baru...";
    showLoading();

    try {
        // Taruh file di path /avatar_warga/UID_NamaFile
        const storageRef = ref(storage, `avatar_warga/${currentUser.uid}_${file.name}`);
        await uploadBytes(storageRef, file);
        
        // Dapatkan URL Download Publik dari Storage Google
        const downloadURL = await getDownloadURL(storageRef);
        
        // Update data url di dokumen profil user Firestore
        await updateDoc(doc(db, "users", currentUser.uid), {
            avatar_url: downloadURL
        });

        document.getElementById('userAvatar').src = downloadURL;
        statusTxt.innerText = "Foto profil berhasil diperbarui!";
        statusTxt.className = "text-[10px] text-emerald-700 font-bold";
    } catch (err) {
        console.error(err);
        statusTxt.innerText = "Gagal mengunggah foto profil.";
        statusTxt.className = "text-[10px] text-red-600 font-bold";
    }
    hideLoading();
});

// --- 🔐 SECURITY SYSTEM: EDIT PASSWORD USER ---
document.getElementById('btnGantiPass').addEventListener('click', async () => {
    const newPass = document.getElementById('newPassword').value.trim();
    const statusTxt = document.getElementById('passStatus');

    if (newPass.length < 6) {
        statusTxt.innerText = "Password baru minimal 6 karakter!";
        statusTxt.className = "text-center text-[11px] font-bold text-red-600 block";
        statusTxt.classList.remove('hidden');
        return;
    }

    showLoading();
    try {
        await updatePassword(currentUser, newPass);
        statusTxt.innerText = "Password Anda berhasil diubah!";
        statusTxt.className = "text-center text-[11px] font-bold text-emerald-700 block";
        statusTxt.classList.remove('hidden');
        document.getElementById('newPassword').value = '';
    } catch (err) {
        console.error(err);
        statusTxt.innerText = "Gagal mengubah password. Sesi kedaluwarsa, silakan keluar lalu masuk lagi.";
        statusTxt.className = "text-center text-[11px] font-bold text-red-600 block";
        statusTxt.classList.remove('hidden');
    }
    hideLoading();
});

// --- 🔄 SAKLAR NAVIGASI TAB MENU ---
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('screen-' + tabName).classList.add('active');
    
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
    document.getElementById('nav-' + tabName).classList.add('active');
}

document.getElementById('nav-iuran').addEventListener('click', () => switchTab('iuran'));
document.getElementById('nav-kas').addEventListener('click', () => switchTab('kas'));
document.getElementById('nav-profil').addEventListener('click', () => switchTab('profil'));

// --- 🚪 ENGINE LOGOUT ---
document.getElementById('btnLogout').addEventListener('click', () => {
    signOut(auth).then(() => {
        localStorage.removeItem('user_session');
        window.location.href = "../login.html";
    });
});
