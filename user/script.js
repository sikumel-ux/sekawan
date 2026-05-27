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

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const dbFirebase = firebase.database();

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzpZZt53kE0d5y7xXfsPFI21NKMx9MLh8N7NXkgtZV_u5QPg9ldAQApH4NzpGOShFDs/exec";

const daftarBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
let dbGlobal = { kas: [], pembayaran: [], anggota: [] };
let sessionWarga = null;

// Objek penampung data sampah real-time dari Firebase
let dataSampahBulanIni = {};

function showLoading() { document.getElementById('loading').style.display = 'flex'; }
function hideLoading() { document.getElementById('loading').style.display = 'none'; }

function alertTuntas(title, msg, type='success') {
    const el = document.getElementById('customAlert');
    const icon = document.getElementById('alertIcon');
    document.getElementById('alertTitle').innerText = title;
    document.getElementById('alertMsg').innerText = msg;
    
    if(type === 'error') {
        icon.className = "w-12 h-12 mx-auto rounded-full flex items-center justify-center bg-red-50 text-red-600";
        icon.innerHTML = '<span class="material-symbols-rounded">gpp_maybe</span>';
    } else {
        icon.className = "w-12 h-12 mx-auto rounded-full flex items-center justify-center bg-emerald-50 text-emerald-600";
        icon.innerHTML = '<span class="material-symbols-rounded">check_circle</span>';
    }
    el.style.display = 'flex';
}

function closeAlert() { document.getElementById('customAlert').style.display = 'none'; }

function togglePasswordLogin() {
    const p = document.getElementById('lPass');
    const icon = document.getElementById('eyeIcon');
    if(p.type === 'password') {
        p.type = 'text';
        icon.className = "fa-solid fa-eye text-sm";
    } else {
        p.type = 'password';
        icon.className = "fa-solid fa-eye-slash text-sm";
    }
}

async function ambilDataZSheets() {
    try {
        let res = await fetch(`${SCRIPT_URL}?action=loadAll`);
        let json = await res.json();
        if(json.status === 'success') {
            dbGlobal = json.data;
            return true;
        }
        return false;
    } catch(e) {
        console.error(e);
        return false;
    }
}

async function prosesLoginWarga() {
    const hp = document.getElementById('lHp').value.trim();
    const pw = document.getElementById('lPass').value.trim();

    if(!hp || !pw) {
        return alertTuntas("Gagal", "Nomor WA dan Kata Sandi wajib diisi!", "error");
    }

    showLoading();
    let suksesLoad = await ambilDataZSheets();
    if(!suksesLoad) {
        hideLoading();
        return alertTuntas("Koneksi Bermasalah", "Gagal mengambil data dari server cloud.", "error");
    }

    const cocok = dbGlobal.anggota.find(u => (u.hp || '').toString().trim() === hp);
    if(!cocok) {
        hideLoading();
        return alertTuntas("Gagal", "Nomor WhatsApp tidak terdaftar!", "error");
    }

    try {
        let snapshot = await dbFirebase.ref('users/' + hp).once('value');
        let dataFb = snapshot.val();
        let pwValid = (cocok.password || '').toString().trim();

        if(dataFb && dataFb.password) {
            pwValid = dataFb.password.toString().trim();
        }

        if(pw === pwValid) {
            sessionWarga = cocok;
            sessionWarga.password = pwValid;

            localStorage.setItem('tuntas_warga_hp', hp);
            localStorage.setItem('tuntas_warga_pw', pwValid);

            bukaDashboardWarga();
            alertTuntas("Sukses", `Selamat datang kembali, ${sessionWarga.nama}!`);
        } else {
            alertTuntas("Gagal", "Kata Sandi yang Anda masukkan salah!", "error");
        }
    } catch(err) {
        console.error(err);
        alertTuntas("Error", "Gagal melakukan otentikasi keamanan database.", "error");
    }
    hideLoading();
}

function bukaDashboardWarga() {
    document.getElementById('screen-login').classList.add('hidden');
    document.getElementById('screen-dashboard').classList.remove('hidden');

    document.getElementById('topNamaWarga').innerText = sessionWarga.nama.toUpperCase();
    document.getElementById('topHpWarga').innerText = sessionWarga.hp;
    document.getElementById('infoNamaUser').innerText = sessionWarga.nama.toUpperCase();
    document.getElementById('infoHpUser').innerText = sessionWarga.hp;
    document.getElementById('infoGabungUser').innerText = sessionWarga.bergabung || 'Warga Aktif';

    if(sessionWarga.avatar_url) {
        document.getElementById('avatarWarga').src = sessionWarga.avatar_url;
    }

    renderSemuaDataWarga();
    
    // AKTIFKAN MONITORING SAMPAH FIREBASE SECARA REAL-TIME
    inisialisasiRealtimeSampah(sessionWarga.nama);
}

function renderSemuaDataWarga() {
    let tIn = 0, tOut = 0, kontribusiSaya = 0;
    const listMutasi = document.getElementById('listMutasiKasDashboard');
    const listRiwayat = document.getElementById('listRiwayatPribadi');
    const gridBulan = document.getElementById('statusBulanGrid');

    listMutasi.innerHTML = '';
    listRiwayat.innerHTML = '';
    gridBulan.innerHTML = '';

    let gabungan = [];

    if(dbGlobal.kas) {
        dbGlobal.kas.forEach(k => {
            let kat = (k.kategori || 'Masuk').trim();
            kat = kat.charAt(0).toUpperCase() + kat.slice(1).toLowerCase();
            gabungan.push({ asal: 'kas', tgl: new Date(k.tanggal), ket: k.keterangan || '', nom: Number(k.nominal || 0), kat: kat });
        });
    }

    if(dbGlobal.pembayaran) {
        dbGlobal.pembayaran.forEach(p => {
            let nUser = (p.nama || '').trim().toUpperCase();
            let nLogin = sessionWarga.nama.trim().toUpperCase();
            let nom = Number(p.nominal || 0);

            gabungan.push({
                asal: 'pembayaran',
                tgl: new Date(p.tanggal),
                ket: `IURAN: ${nUser} (${p.keterangan || ''})`,
                nom: nom,
                kat: 'Masuk',
                namaWarga: nUser,
                bulanTarget: p.keterangan || ''
            });

            if(nUser === nLogin) {
                kontribusiSaya += nom;
            }
        });
    }

    gabungan.sort((a,b) => b.tgl - a.tgl).forEach(x => {
        let isMasuk = x.kat === 'Masuk';
        if(isMasuk) tIn += x.nom; else tOut += x.nom;

        listMutasi.insertAdjacentHTML('beforeend', `
            <div class="py-3 flex justify-between items-center text-xs">
                <div class="flex items-center gap-2.5">
                    <div class="w-6 h-6 rounded-md ${isMasuk ? 'bg-emerald-50 text-emerald-600':'bg-rose-50 text-rose-600'} flex items-center justify-center font-bold text-[9px]">${isMasuk?'IN':'OUT'}</div>
                    <div>
                        <p class="font-bold text-slate-700 max-w-[180px] truncate uppercase text-[11px]">${x.ket}</p>
                        <p class="text-[8px] text-slate-300 font-semibold">${x.tgl.toLocaleDateString('id-ID')}</p>
                    </div>
                </div>
                <p class="font-black ${isMasuk ? 'text-emerald-600':'text-rose-500'}">${isMasuk?'+':'-'} ${x.nom.toLocaleString('id-ID')}</p>
            </div>
        `);

        if(x.asal === 'pembayaran' && x.namaWarga === sessionWarga.nama.trim().toUpperCase()) {
            listRiwayat.insertAdjacentHTML('beforeend', `
                <div class="p-3.5 bg-white border border-slate-100 rounded-2xl flex justify-between items-center shadow-2xs">
                    <div>
                        <p class="text-xs font-black text-slate-700 uppercase">${x.bulanTarget}</p>
                        <p class="text-[8px] text-slate-400 font-bold">${x.tgl.toLocaleDateString('id-ID')} | Kas Swadaya</p>
                    </div>
                    <p class="text-xs font-black text-emerald-600">Rp ${x.nom.toLocaleString('id-ID')}</p>
                </div>
            `);
        }
    });

    document.getElementById('dashPemasukanKas').innerText = 'Rp ' + tIn.toLocaleString('id-ID');
    document.getElementById('dashPengeluaranKas').innerText = 'Rp ' + tOut.toLocaleString('id-ID');
    document.getElementById('dashSisaSaldoKas').innerText = 'Rp ' + (tIn - tOut).toLocaleString('id-ID');
    document.getElementById('dataTotalKontribusi').innerText = 'Rp ' + kontribusiSaya.toLocaleString('id-ID');

    daftarBulan.forEach(b => {
        let isLunas = gabungan.some(g => {
            if(g.asal !== 'pembayaran' || g.namaWarga !== sessionWarga.nama.trim().toUpperCase()) return false;
            let dbBln = (g.bulanTarget || '').trim().toLowerCase();
            return dbBln.includes(b.toLowerCase());
        });

        let bg = isLunas ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-300 border-slate-100";
        let statusText = isLunas ? "LUNAS" : "BELUM";

        gridBulan.innerHTML += `
            <div class="p-2 border rounded-xl text-center ${bg}">
                <p class="text-[8px] font-black uppercase leading-none">${b.substring(0,3)}</p>
                <p class="text-[7px] font-black mt-1 tracking-tighter">${statusText}</p>
            </div>
        `;
    });
}

// =========================================================================
// INTEGRASI REAL-TIME KALENDER SAMPAH FIREBASE
// =========================================================================
function inisialisasiRealtimeSampah(namaWarga) {
    if (!namaWarga) return;
    const namaClean = namaWarga.trim().toUpperCase();
    const sekarang = new Date();
    const pathBulan = `${sekarang.getFullYear()}-${String(sekarang.getMonth() + 1).padStart(2, '0')}`;

    // Sinkronkan teks nama bulan aktif di kalender
    document.getElementById('judulKalenderSampah').innerText = `Kalender Sampah (${daftarBulan[sekarang.getMonth()]} ${sekarang.getFullYear()})`;

    // .on('value') membuat halaman auto-update ketika petugas klik tombol di petugas.html
    dbFirebase.ref(`data_sampah/${namaClean}/${pathBulan}`).on('value', (snapshot) => {
        dataSampahBulanIni = snapshot.val() || {};
        renderKalenderSampahWarga();
    });
}

function renderKalenderSampahWarga() {
    const gridKalender = document.getElementById('gridAngkaKalender');
    if (!gridKalender) return;
    gridKalender.innerHTML = '';

    const sekarang = new Date();
    const tahun = sekarang.getFullYear();
    const bulan = sekarang.getMonth();
    const jumlahHari = new Date(tahun, bulan + 1, 0).getDate();

    for (let tgl = 1; tgl <= jumlahHari; tgl++) {
        const keyHari = String(tgl).padStart(2, '0'); // "01", "02", dst sesuai data petugas.html
        const infoHari = dataSampahBulanIni[keyHari] || null;
        
        let status = infoHari ? infoHari.status : "Belum Ada";
        let waktu = infoHari ? infoHari.waktu : "--:--";

        let bgClass = "bg-slate-100 text-slate-400 border border-slate-200/40";
        let subIkon = "";

        if (status === "Diambil") {
            bgClass = "bg-emerald-500 text-white font-black shadow-sm";
            subIkon = `<span class="block text-[7px] font-black mt-0.5 opacity-90">${waktu}</span>`;
        } else if (status === "Tidak Diambil") {
            bgClass = "bg-rose-500 text-white font-black shadow-sm";
            subIkon = `<span class="block text-[7px] font-black mt-0.5 opacity-90">LEWAT</span>`;
        } else if (status === "Kosong") {
            bgClass = "bg-slate-400 text-white font-black";
            subIkon = `<span class="block text-[7px] font-black mt-0.5 opacity-80">KOSONG</span>`;
        }

        // Output button agar bisa merespon klik dengan rapi
        gridKalender.innerHTML += `
            <button onclick="bukaDetailModalSampah('${tgl}', '${status}', '${waktu}')" 
                    class="p-2 py-3 rounded-xl text-center cursor-pointer active:scale-90 transition-all flex flex-col justify-center items-center h-14 ${bgClass}">
                <span class="text-xs font-black">${tgl}</span>
                ${subIkon}
            </button>
        `;
    }
}

function bukaDetailModalSampah(hari, status, waktu) {
    const title = document.getElementById('popTglJudul');
    const txtStatus = document.getElementById('popStatusTeks');
    const txtJam = document.getElementById('popJamWaktu');
    const boxIcon = document.getElementById('popBoxIcon');

    title.innerText = `Laporan Tanggal ${hari}`;
    txtStatus.innerText = status === "Belum Ada" ? "BELUM ADA DATA" : status.toUpperCase();

    if (status === "Diambil") {
        txtStatus.className = "text-base font-black text-emerald-600 tracking-tight mt-1";
        txtJam.innerText = `Sampah rumah Anda telah selesai diangkut petugas pada jam ${waktu} WIB.`;
        boxIcon.className = "w-14 h-14 mx-auto rounded-2xl flex items-center justify-center bg-emerald-50 text-emerald-600 shadow-xs";
    } else if (status === "Tidak Diambil") {
        txtStatus.className = "text-base font-black text-rose-500 tracking-tight mt-1";
        txtJam.innerText = `Petugas melewati atau menandai tempat Anda terlewati/tidak dapat diakses.`;
        boxIcon.className = "w-14 h-14 mx-auto rounded-2xl flex items-center justify-center bg-red-50 text-red-500 shadow-xs";
    } else if (status === "Kosong") {
        txtStatus.className = "text-base font-black text-slate-500 tracking-tight mt-1";
        txtJam.innerText = `Petugas memeriksa lokasi Anda, namun kondisi tempat sampah kosong.`;
        boxIcon.className = "w-14 h-14 mx-auto rounded-2xl flex items-center justify-center bg-slate-100 text-slate-500 shadow-xs";
    } else {
        txtStatus.className = "text-base font-black text-slate-400 tracking-tight mt-1";
        txtJam.innerText = `Belum ada riwayat aktivitas / pelaporan dari operasional petugas hari ini.`;
        boxIcon.className = "w-14 h-14 mx-auto rounded-2xl flex items-center justify-center bg-slate-50 text-slate-300";
    }

    openModal('mDetailSampah');
}

function switchTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.getElementById(tabId).classList.remove('hidden');
    
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active-tab-btn'));
    if(btn) btn.classList.add('active-tab-btn');
}

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function logoutWarga() {
    localStorage.clear();
    location.reload();
}

function salinRekening() {
    const rek = document.getElementById('noRekText').innerText;
    navigator.clipboard.writeText(rek);
    alertTuntas("Tersalin", "Nomor Rekening BCA Berhasil Disalin!");
}

function kontfirmasiBayarWA() {
    const text = `Halo Admin TUNTAS,\nSaya *${sessionWarga.nama}* ingin mengonfirmasi pembayaran iuran kas swadaya warga.`;
    window.open(`https://wa.me/628123456789?text=${encodeURIComponent(text)}`);
}

function kirimKritikSaranWA() {
    const text = `Halo Pengurus TUNTAS,\nSaya *${sessionWarga.nama}* ingin menyampaikan kritik & saran masukan: `;
    window.open(`https://wa.me/628123456789?text=${encodeURIComponent(text)}`);
}

async function prosesGantiPasswordFirebase() {
    const nw = document.getElementById('newPass').value.trim();
    if(!nw) return alertTuntas("Error", "Ketik sandi baru Anda!", "error");
    
    showLoading();
    try {
        await dbFirebase.ref('users/' + sessionWarga.hp).update({ password: nw });
        localStorage.setItem('tuntas_warga_pw', nw);
        alertTuntas("Sukses", "Kata Sandi Akun Berhasil Diperbarui!");
        document.getElementById('newPass').value = '';
    } catch(e) {
        alertTuntas("Gagal", "Gagal menyimpan kata sandi ke server.", "error");
    }
    hideLoading();
}

async function prosesUploadFotoFirebase(input) {
    if(!input.files || !input.files[0]) return;
    showLoading();
    
    const file = input.files[0];
    const reader = new FileReader();
    reader.onloadend = async function() {
        const base64 = reader.result;
        try {
            await dbFirebase.ref('users/' + sessionWarga.hp).update({ avatar_url: base64 });
            document.getElementById('avatarWarga').src = base64;
            alertTuntas("Sukses", "Foto profil Anda berhasil diubah!");
        } catch(e) {
            alertTuntas("Gagal", "Gagal menyimpan foto ke server.", "error");
        }
        hideLoading();
    };
    reader.readAsDataURL(file);
}

// =========================================================================
// RUNTIME AUTO LOG-IN INITIALIZER
// =========================================================================
window.onload = async function() {
    showLoading();
    const savedHp = localStorage.getItem('tuntas_warga_hp');
    const savedPw = localStorage.getItem('tuntas_warga_pw');

    if(savedHp && savedPw) {
        let suksesLoad = await ambilDataZSheets();
        if(suksesLoad) {
            const cocok = dbGlobal.anggota.find(u => (u.hp || '').toString().trim() === savedHp);
            if(cocok) {
                try {
                    let snapshot = await dbFirebase.ref('users/' + savedHp).once('value');
                    let dataFb = snapshot.val();
                    let pwValid = (cocok.password || '').toString().trim();
                    
                    if(dataFb && dataFb.password) {
                        pwValid = dataFb.password.toString().trim();
                    }
                    
                    if(savedPw === pwValid) {
                        sessionWarga = cocok;
                        sessionWarga.password = pwValid;
                        bukaDashboardWarga();
                        hideLoading();
                        return;
                    }
                } catch(e) { console.error(e); }
            }
        }
        localStorage.clear();
    }
    hideLoading();
};
