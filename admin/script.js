import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, getDocs, setDoc, addDoc, query, where } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

// Konfigurasi Project Firebase Tuntas-04 milikmu
const firebaseConfig = {
    apiKey: "AIzaSyCzz0INhgBUARAxqLlMnCC8vyCciI9jpJk",
    authDomain: "tuntas-04.firebaseapp.com",
    projectId: "tuntas-04",
    storageBucket: "tuntas-04.firebasestorage.app",
    messagingSenderId: "509433415219",
    appId: "1:509433415219:web:e485a0eab1a612fda64546"
};

// URL Google Apps Script Web App (Tercatat di Google Sheets kuitansi & kas)
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzpZZt53kE0d5y7xXfsPFI21NKMx9MLh8N7NXkgtZV_u5QPg9ldAQApH4NzpGOShFDs/exec";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentAdmin = null;
let listWargaCached = [];

function showLoading() { document.getElementById('loading').classList.remove('hidden'); }
function hideLoading() { document.getElementById('loading').classList.add('hidden'); }

// --- 🔒 PROTEKSI DASHBOARD ADMIN ---
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "../login.html";
    } else {
        currentAdmin = user;
        const adminDoc = await getDoc(doc(db, "users", user.uid));
        if (adminDoc.exists() && adminDoc.data().role === 'admin') {
            document.getElementById('adminNama').innerText = adminDoc.data().nama;
            initAdminDashboard();
        } else {
            // Jika bukan admin, paksa keluar ke gerbang utama
            window.location.href = "../login.html";
        }
    }
});

// --- INITIALIZER DATA UTAMA ---
async function initAdminDashboard() {
    showLoading();
    
    // Set text info tanggal hari ini
    const hariIni = new Date();
    const opsiTgl = { day: 'numeric', month: 'long', year: 'numeric' };
    document.getElementById('txtTglSampah').innerText = `Hari ini, ${hariIni.toLocaleDateString('id-ID', opsiTgl)}`;

    await loadSeluruhWarga();
    hideLoading();
}

// --- 👥 AMBIL DATA WARGA DARI FIRESTORE ---
async function loadSeluruhWarga() {
    try {
        const q = query(collection(db, "users"), where("role", "==", "warga"));
        const snap = await getDocs(q);
        
        listWargaCached = [];
        const selectElement = document.getElementById('selectWargaIuran');
        const containerMaster = document.getElementById('listWargaMaster');
        
        selectElement.innerHTML = '<option value="">-- Pilih Anggota --</option>';
        containerMaster.innerHTML = '';

        // Tarik log sampah global hari ini untuk mencocokkan status tombol checklist
        const hariIniIso = new Date().toISOString().split('T')[0];
        const logSampahSnap = await getDocs(collection(db, "log_sampah"));
        let statusSampahHariIni = {};
        
        logSampahSnap.forEach(ls => {
            if(ls.data().tanggal === hariIniIso) {
                statusSampahHariIni[ls.data().hp_anggota'] = ls.data().status;
            }
        });

        snap.forEach((docData) => {
            const item = docData.data();
            listWargaCached.push(item);

            // A. Masukkan ke Opsi Pilihan Form Pembayaran Iuran
            selectElement.insertAdjacentHTML('beforeend', `
                <option value="${item.hp}">${item.nama.toUpperCase()} (${item.hp})</option>
            `);

            // B. Masukkan ke Daftar Manajemen Warga Terdaftar (Tab 3)
            containerMaster.insertAdjacentHTML('beforeend', `
                <div class="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm">
                    <div class="flex items-center gap-3">
                        <img src="${item.avatar_url || 'https://ui-avatars.com/api/?name='+item.nama+'&background=064E3B&color=fff'}" class="w-9 h-9 rounded-full object-cover">
                        <div>
                            <p class="text-xs font-black text-slate-800 uppercase">${item.nama}</p>
                            <p class="text-[9px] text-slate-400 font-bold">WA: ${item.hp}</p>
                        </div>
                    </div>
                </div>
            `);
        });

        // C. Render ke Daftar Operasional Absensi Sampah (Tab 1)
        renderDaftarAbsenSampah(statusSampahHariIni);

    } catch (e) {
        console.error("Gagal memuat data warga: ", e);
    }
}

// --- 🗑️ ENGINE ABSENSI SAMPAH (TAB 1) ---
function renderDaftarAbsenSampah(statusSampahHariIni) {
    const container = document.getElementById('listAbsenSampah');
    container.innerHTML = '';

    if (listWargaCached.length === 0) {
        container.innerHTML = '<p class="text-center text-xs text-slate-400 py-6 font-bold">Belum ada data warga terdaftar.</p>';
        return;
    }

    listWargaCached.forEach(w => {
        const currentStatus = statusSampahHariIni[w.hp] || "Belum Diabsen";
        
        let badgeColor = "bg-slate-100 text-slate-400 border-slate-200";
        if(currentStatus === "Diambil") badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-100";
        if(currentStatus === "Tidak Diambil") badgeColor = "bg-red-50 text-red-700 border-red-100";

        container.insertAdjacentHTML('beforeend', `
            <div class="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col gap-3 shadow-sm">
                <div class="flex justify-between items-center">
                    <div>
                        <h5 class="text-xs font-black text-slate-800 uppercase tracking-tight">${w.nama}</h5>
                        <p class="text-[9px] text-slate-400 font-semibold">WA: ${w.hp}</p>
                    </div>
                    <span class="px-2.5 py-1 rounded-lg text-[8px] font-black uppercase border ${badgeColor}">${currentStatus}</span>
                </div>
                
                <div class="grid grid-cols-2 gap-2">
                    <button onclick="updateStatusSampahWarga('${w.hp}', '${w.nama}', 'Diambil')" class="bg-emerald-800 text-white text-[9px] font-black uppercase py-2 rounded-xl shadow-sm active:scale-95 transition-transform">
                        Diambil
                    </button>
                    <button onclick="updateStatusSampahWarga('${w.hp}', '${w.nama}', 'Tidak Diambil')" class="bg-red-50 text-red-600 border border-red-100 text-[9px] font-black uppercase py-2 rounded-xl active:scale-95 transition-transform">
                        Lewati
                    </button>
                </div>
            </div>
        `);
    });
}

// Global function agar bisa dipicu oleh atribut onclick HTML di atas
window.updateStatusSampahWarga = async function(hp, nama, status) {
    showLoading();
    const hariIniIso = new Date().toISOString().split('T')[0];
    const jamMenit = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
    
    // Dokumen ID gabungan unik: YYYY-MM-DD_NoHP
    const docId = `${hariIniIso}_${hp}`;

    try {
        await setDoc(doc(db, "log_sampah", docId), {
            hp_anggota: hp,
            nama: nama,
            tanggal: hariIniIso,
            status: status,
            waktu: jamMenit
        });
        
        // Refresh data tampilan halaman otomatis setelah sukses
        await loadSeluruhWarga();
    } catch (e) {
        alert("Gagal mencatat status sampah!");
        console.error(e);
    }
    hideLoading();
};

// --- 💳 ENGINE INPUT KAS & GENERATOR KUITANSI IURAN (TAB 2) ---
document.getElementById('btnSimpanIuran').addEventListener('click', async () => {
    const hpWarga = document.getElementById('selectWargaIuran').value;
    const bulan = document.getElementById('inputBulanIuran').value.trim();
    const nominal = document.getElementById('inputNominalIuran').value;

    if(!hpWarga || !bulan || !nominal) {
        alert("Semua data input formulir iuran wajib diisi!");
        return;
    }

    const wargaObj = listWargaCached.find(w => w.hp === hpWarga);
    showLoading();

    try {
        // ALUR A: Simpan riwayat iuran ke Firestore (untuk histori real-time di HP Warga)
        await addDoc(collection(db, "pembayaran_iuran"), {
            hp_anggota: hpWarga,
            nama: wargaObj.nama,
            bulan_dibayar: bulan,
            nominal: Number(nominal),
            tanggal_bayar: new Date().toISOString()
        });

        // ALUR B: Tembak ke Google Sheets untuk pembukuan besar kas utama RT & pembuatan kode kuitansi
        let resSheets = await fetch(SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify({
                action: "tambah_iuran",
                nama: wargaObj.nama,
                hp: hpWarga,
                bulan: bulan,
                nominal: Number(nominal)
            })
        });

        let jsonRes = await resSheets.json();
        
        if (jsonRes.status === "success") {
            // Bersihkan input form setelah selesai
            document.getElementById('inputBulanIuran').value = '';
            
            // Ambil kode random unik hasil pembuatan dari Google Sheets, buka file kuitansi.html di tab baru!
            const kodeKuitansi = jsonRes.kode_kuitansi;
            window.open(`../kuitansi.html?id=${kodeKuitansi}`, '_blank');
        } else {
            alert("Iuran tersimpan di aplikasi, tapi gagal masuk ke kuitansi Sheets.");
        }

        await loadSeluruhWarga();
    } catch (err) {
        console.error("Gagal memproses pembayaran iuran: ", err);
        alert("Terjadi gangguan jaringan, silakan coba lagi.");
    }
    hideLoading();
});

// --- 📓 CATAT ARUS KAS GLOBAL RT LANGSUNG KE GOOGLE SHEETS ---
document.getElementById('btnSimpanKasGeneral').addEventListener('click', async () => {
    const kategori = document.getElementById('selectKategoriKas').value;
    const keterangan = document.getElementById('inputKetKas').value.trim();
    const nominal = document.getElementById('inputNominalKas').value;

    if(!keterangan || !nominal) {
        alert("Keterangan dan nominal kas RT tidak boleh kosong!");
        return;
    }

    showLoading();
    try {
        // Kirim log kas langsung ke Google Sheets (Tabel Kas)
        let response = await fetch(SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify({
                action: "tambah_kas", // Pastikan fungsi Apps Script kamu kemarin mengenali aksi tambah_kas
                kategori: kategori,
                keterangan: keterangan,
                nominal: Number(nominal)
            })
        });

        let result = await response.json();
        if(result.status === "success") {
            alert("Transaksi kas umum RT berhasil dicatat di Google Sheets!");
            document.getElementById('inputKetKas').value = '';
            document.getElementById('inputNominalKas').value = '';
        } else {
            alert("Gagal menyimpan kas ke Sheets.");
        }
    } catch (e) {
        console.error(e);
        alert("Koneksi gagal.");
    }
    hideLoading();
});

// --- ➕ REGISTER WARGA BARU (TAB 3) ---
document.getElementById('btnTambahWarga').addEventListener('click', async () => {
    const nama = document.getElementById('addNamaWarga').value.trim();
    const hp = document.getElementById('addHpWarga').value.trim();

    if(!nama || !hp) {
        alert("Nama dan No WhatsApp warga wajib diisi!");
        return;
    }

    showLoading();
    try {
        // Konversi format nomor telepon menjadi akun email seragam Firebase Auth
        const emailWarga = `${hp}@tuntas.com`;
        const defaultPassword = hp; // Password standar default menggunakan nomor hp warga

        // 1. Daftarkan kredensial akun autentikasi baru di Firebase Auth
        const cred = await createUserWithEmailAndPassword(auth, emailWarga, defaultPassword);
        
        // 2. Simpan profil lengkap warga ke Firestore collection "users"
        await setDoc(doc(db, "users", cred.user.uid), {
            uid: cred.user.uid,
            nama: nama,
            hp: hp,
            role: "warga",
            avatar_url: ""
        });

        alert(`Warga atas nama ${nama} berhasil didaftarkan!`);
        document.getElementById('addNamaWarga').value = '';
        document.getElementById('addHpWarga').value = '';
        
        await loadSeluruhWarga();
    } catch (err) {
        console.error(err);
        if(err.code === "auth/email-already-in-use") {
            alert("Nomor HP warga ini sudah terdaftar sebelumnya!");
        } else {
            alert("Gagal mendaftarkan warga baru.");
        }
    }
    hideLoading();
});

// --- 🔄 SAKLAR SINKRON TAB PANEL ---
function switchTabAdmin(tabName) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('screen-' + tabName).classList.add('active');
    
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
    document.getElementById('nav-' + tabName).classList.add('active');
}
document.getElementById('nav-sampah').addEventListener('click', () => switchTabAdmin('sampah'));
document.getElementById('nav-keuangan').addEventListener('click', () => switchTabAdmin('keuangan'));
document.getElementById('nav-warga').addEventListener('click', () => switchTabAdmin('warga'));

// --- LOGOUT ENGINE ---
document.getElementById('btnLogout').addEventListener('click', () => {
    signOut(auth).then(() => {
        localStorage.removeItem('user_session');
        window.location.href = "../login.html";
    });
});
