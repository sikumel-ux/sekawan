// =========================================================================
// KONFIGURASI FIREBASE RESMI PROJECT TUNTAS04
// =========================================================================
const firebaseConfig = {
    apiKey: "AIzaSyAHXqxr7jh3BrRlYqLrIn-fqT0ys9AnRBU",
    authDomain: "tuntas04.firebaseapp.com",
    databaseURL: "https://tuntas04-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "tuntas04",
    storageBucket: "tuntas04.firebasestorage.app",
    messagingSenderId: "208840175808",
    appId: "1:208840175808:web:2ad07fdb8930845fbdbd25"
};

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);
const dbFirebase = firebase.database();

// URL Google Apps Script Web App
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzpZZt53kE0d5y7xXfsPFI21NKMx9MLh8N7NXkgtZV_u5QPg9ldAQApH4NzpGOShFDs/exec";
const daftarBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

let dbGlobalAdmin = { anggota: [], petugas: [] };
let sessionAdmin = null;

// FUNGSI UI (LOADING & ALERT)
function showAdminLoading() { 
    document.getElementById('loadingAdmin').style.display = 'flex'; 
}
function hideAdminLoading() { 
    document.getElementById('loadingAdmin').style.display = 'none'; 
}

function tampilAdminAlert(title, msg, isSuccess = true) {
    document.getElementById('alertAdminTitle').innerText = title;
    document.getElementById('alertAdminMsg').innerText = msg;
    const iconBox = document.getElementById('alertIconBox');
    
    if(isSuccess) {
        iconBox.className = "w-12 h-12 mx-auto rounded-full flex items-center justify-center bg-emerald-50 text-emerald-600";
        iconBox.innerHTML = '<span class="material-symbols-rounded">check_circle</span>';
    } else {
        iconBox.className = "w-12 h-12 mx-auto rounded-full flex items-center justify-center bg-red-50 text-red-600";
        iconBox.innerHTML = '<span class="material-symbols-rounded">cancel</span>';
    }
    document.getElementById('adminAlert').classList.add('active');
}

function closeAdminAlert() { 
    document.getElementById('adminAlert').classList.remove('active'); 
}

function switchTabAdmin(tabId, btnElement) {
    const tabs = document.querySelectorAll('.tab-admin-content');
    tabs.forEach(t => t.classList.add('hidden'));
    document.getElementById(tabId).classList.remove('hidden');

    const navButtons = document.querySelectorAll('nav button');
    navButtons.forEach(btn => btn.classList.remove('active-tab-btn'));
    if(btnElement) btnElement.classList.add('active-tab-btn');
}

// AMBIL DATA KESELURUHAN DARI GOOGLE SHEETS PUSAT
async function ambilDataSheetsAdmin() {
    try {
        let res = await fetch(`${SCRIPT_URL}?action=loadAll`, { method: "GET", mode: "cors" });
        let json = await res.json();
        if(json.status === "success") {
            dbGlobalAdmin = json.data;
            return true;
        }
        return false;
    } catch(e) {
        console.error("Error Fetch Sheets:", e);
        return false;
    }
}

// PROSES AUTENTIKASI LOGIN PETUGAS
async function prosesLoginAdmin() {
    const hp = document.getElementById('admHp').value.trim();
    const pass = document.getElementById('admPass').value.trim();

    if(!hp || !pass) {
        tampilAdminAlert("Gagal", "Semua form wajib diisi, bro!", false);
        return;
    }

    showAdminLoading();
    let sukses = await ambilDataSheetsAdmin();
    if(!sukses) {
        hideAdminLoading();
        tampilAdminAlert("Error", "Gagal terhubung ke Google Sheets pusat.", false);
        return;
    }

    // Validasi pengecekan apakah properti/sheet 'petugas' ada
    if (!dbGlobalAdmin.petugas) {
        hideAdminLoading();
        tampilAdminAlert("Gagal", "Sheet 'Petugas' tidak terbaca di API Web App, bro.", false);
        return;
    }

    const cocok = dbGlobalAdmin.petugas.find(u => (u.hp || '').toString().trim() === hp);
    
    if(cocok) {
        // Cek password terupdate di Firebase
        dbFirebase.ref('users/' + hp).once('value').then((snapshot) => {
            let dataFb = snapshot.val();
            let pwValid = (cocok.password || '').toString().trim();
            if(dataFb && dataFb.password) pwValid = dataFb.password.toString().trim();

            if(pass === pwValid) {
                const peran = (cocok.peran || cocok.status || '').toLowerCase();
                // Validasi hak akses khusus admin/pengurus/petugas/ketua
                if(peran.includes('pengurus') || peran.includes('petugas') || peran.includes('ketua') || peran.includes('admin')) {
                    sessionAdmin = cocok;
                    bukaDashboardAdmin();
                } else {
                    tampilAdminAlert("Akses Ditolak", "Hak peran Anda di tabel Petugas tidak valid.", false);
                }
            } else {
                tampilAdminAlert("Gagal", "Kata Sandi salah!", false);
            }
            hideAdminLoading();
        }).catch((err) => {
            console.error(err);
            hideAdminLoading();
            tampilAdminAlert("Error Firebase", "Gagal melakukan sinkronisasi data enkripsi.", false);
        });
    } else {
        hideAdminLoading();
        tampilAdminAlert("Ditolak", "Nomor HP Petugas tidak terdaftar.", false);
    }
}

function bukaDashboardAdmin() {
    document.getElementById('screen-login-admin').classList.add('hidden');
    document.getElementById('screen-dashboard-admin').classList.remove('hidden');
    
    document.getElementById('namaPetugasText').innerText = sessionAdmin.nama.toUpperCase();
    switchTabAdmin('tab-admin-sampah', document.querySelectorAll('nav button')[0]);

    const sekarang = new Date();
    document.getElementById('infoTanggalHariIni').innerText = `Hari Ini: ${sekarang.getDate()} ${daftarBulan[sekarang.getMonth()]} ${sekarang.getFullYear()}`;

    // Isi Dropdown Pilihan Rumah Warga
    const selSampah = document.getElementById('admPilihWarga');
    const selKas = document.getElementById('kasPilihWarga');
    selSampah.innerHTML = '';
    selKas.innerHTML = '';

    if(dbGlobalAdmin.anggota) {
        dbGlobalAdmin.anggota.forEach(w => {
            let opt = `<option value="${w.hp}">${w.nama.toUpperCase()} (${w.hp})</option>`;
            selSampah.insertAdjacentHTML('beforeend', opt);
            selKas.insertAdjacentHTML('beforeend', opt);
        });
    }

    // Aktifkan pemantauan Log Angkutan Sampah Real-Time
    dengarStatusSampahHariIni();
}

// FEED REAL-TIME LISTENER LOG SAMPAH WARGA
function dengarStatusSampahHariIni() {
    const sekarang = new Date();
    const tglHariIni = sekarang.getDate();
    const thnBlnNode = `${sekarang.getFullYear()}-${String(sekarang.getMonth() + 1).padStart(2, '0')}`;

    dbFirebase.ref(`status_sampah`).on('value', (snapshot) => {
        const rootSampah = snapshot.val() || {};
        const listContainer = document.getElementById('listStatusSampahHariIni');
        listContainer.innerHTML = '';

        if(dbGlobalAdmin.anggota) {
            dbGlobalAdmin.anggota.forEach(w => {
                let statusWarga = "Belum Diabsen";
                let jamWaktu = "-";
                let warnaBadge = "bg-slate-100 text-slate-500";

                if(rootSampah[w.hp] && rootSampah[w.hp][thnBlnNode] && rootSampah[w.hp][thnBlnNode][tglHariIni]) {
                    const dataHariIni = rootSampah[w.hp][thnBlnNode][tglHariIni];
                    statusWarga = dataHariIni.status || "Kosong";
                    jamWaktu = dataHariIni.waktu || "-";

                    if(statusWarga === "Diambil") warnaBadge = "bg-emerald-100 text-emerald-700 font-bold";
                    else if(statusWarga === "Tidak Diambil") warnaBadge = "bg-rose-100 text-rose-700 font-bold";
                }

                listContainer.insertAdjacentHTML('beforeend', `
                    <div class="py-3 flex justify-between items-center text-xs">
                        <div>
                            <p class="font-black text-slate-700 uppercase leading-none">${w.nama}</p>
                            <p class="text-[9px] text-slate-400 font-semibold mt-1">Waktu: ${jamWaktu}</p>
                        </div>
                        <span class="px-2.5 py-1 rounded-lg text-[9px] uppercase tracking-wider ${warnaBadge}">${statusWarga}</span>
                    </div>
                `);
            });
        }
    });
}

// EKSEKUSI UPDATE ABSEN SAMPAH KE FIREBASE
function adminSetelSampah(statusPilihan) {
    const hpTarget = document.getElementById('admPilihWarga').value;
    if(!hpTarget) return;

    showAdminLoading();
    const sekarang = new Date();
    const tglHariIni = sekarang.getDate();
    const thnBlnNode = `${sekarang.getFullYear()}-${String(sekarang.getMonth() + 1).padStart(2, '0')}`;
    const jamMenit = sekarang.toTimeString().split(' ')[0].substring(0, 5);
    const teksWaktu = `${jamMenit} WIB`;

    const targetNode = dbFirebase.ref(`status_sampah/${hpTarget}/${thnBlnNode}/${tglHariIni}`);

    if (statusPilihan === "Kosong") {
        targetNode.remove().then(() => {
            hideAdminLoading();
            tampilAdminAlert("Sukses", "Data status berhasil direset kosong.", true);
        });
    } else {
        targetNode.update({
            status: statusPilihan,
            waktu: teksWaktu
        }).then(() => {
            hideAdminLoading();
            tampilAdminAlert("Berhasil", "Berhasil memperbarui data absen sampah.", true);
        });
    }
}

// SUBMIT INPUT IURAN MANUAL KE GOOGLE SHEETS VIA POST
async function prosesSubmitIuranBaru() {
    const hpTarget = document.getElementById('kasPilihWarga').value;
    const wargaObj = dbGlobalAdmin.anggota.find(u => u.hp == hpTarget);
    const nominal = document.getElementById('kasNominal').value.trim();
    const keterangan = document.getElementById('kasKeterangan').value.trim();

    if(!nominal || !keterangan) {
        tampilAdminAlert("Gagal", "Nominal dan Keterangan Bulan wajib diisi, bro!", false);
        return;
    }

    showAdminLoading();
    
    const params = new URLSearchParams();
    params.append('action', 'addPembayaran');
    params.append('nama', wargaObj.nama);
    params.append('nominal', nominal);
    params.append('keterangan', keterangan);

    try {
        let res = await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            body: params,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        let json = await res.json();
        
        hideAdminLoading();
        if(json.status === 'success') {
            document.getElementById('kasKeterangan').value = '';
            tampilAdminAlert("Transaksi Sukses", "Data iuran berhasil direkam ke kas pusat!", true);
        } else {
            tampilAdminAlert("Gagal", "Gagal menyimpan transaksi ke Sheets.", false);
        }
    } catch(e) {
        console.error(e);
        hideAdminLoading();
        tampilAdminAlert("Koneksi Putus", "Gagal mengirim data ke cloud.", false);
    }
}

function logoutAdmin() {
    sessionAdmin = null;
    dbFirebase.ref(`status_sampah`).off();
    document.getElementById('screen-dashboard-admin').classList.add('hidden');
    document.getElementById('screen-login-admin').classList.remove('hidden');
    document.getElementById('admHp').value = '';
    document.getElementById('admPass').value = '';
}
