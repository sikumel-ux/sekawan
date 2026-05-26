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

// Inisialisasi Firebase Core & Realtime Database
firebase.initializeApp(firebaseConfig);
const dbFirebase = firebase.database();

// URL Web App GAS untuk sedot data utama Kas & Iuran dari Google Sheets
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzpZZt53kE0d5y7xXfsPFI21NKMx9MLh8N7NXkgtZV_u5QPg9ldAQApH4NzpGOShFDs/exec";

const daftarBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
let dbGlobal = { kas: [], pembayaran: [], anggota: [] };
let sessionWarga = null;

// Node Listener Sampah Global
let statusSampahRef = null;
let dataSampahBulanIni = {};

// Nomor Whatsapp Admin Pusat untuk Kritik & Saran
const NOMOR_ADMIN_WHATSAPP = "628123456789";

// Manajemen Loading Screen
function showLoading() { document.getElementById('loading').style.display = 'flex'; }
function hideLoading() { document.getElementById('loading').style.display = 'none'; }

// Custom Alert UI TUNTAS
function tampilAlert(title, msg, isSuccess = true) {
    document.getElementById('alertTitle').innerText = title;
    document.getElementById('alertMsg').innerText = msg;
    const iconBox = document.getElementById('alertIcon');
    if(isSuccess) {
        iconBox.className = "w-12 h-12 mx-auto rounded-full flex items-center justify-center bg-emerald-50 text-emerald-600";
        iconBox.innerHTML = '<span class="material-symbols-rounded">check_circle</span>';
    } else {
        iconBox.className = "w-12 h-12 mx-auto rounded-full flex items-center justify-center bg-red-50 text-red-600";
        iconBox.innerHTML = '<span class="material-symbols-rounded">cancel</span>';
    }
    document.getElementById('customAlert').classList.add('active');
}
function closeAlert() { document.getElementById('customAlert').classList.remove('active'); }

// Modal Handler
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// SYSTEM SWITCH TAB NAVIGASI BAWAH (ALA APPS NATIVE)
function switchTab(tabId, btnElement) {
    // Sembunyikan semua konten tab
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(t => t.classList.add('hidden'));

    // Tampilkan tab target
    document.getElementById(tabId).classList.remove('hidden');

    // Reset style semua tombol navigasi
    const navButtons = document.querySelectorAll('nav button');
    navButtons.forEach(btn => btn.classList.remove('active-tab-btn'));

    // Nyalakan tombol terpilih
    if(btnElement) btnElement.classList.add('active-tab-btn');
}

// Toggle Input Password Login
function togglePasswordLogin() {
    const pInput = document.getElementById('lPass');
    const eye = document.getElementById('eyeIcon');
    if (pInput.type === "password") {
        pInput.type = "text";
        eye.className = "fa-solid fa-eye text-sm";
    } else {
        pInput.type = "password";
        eye.className = "fa-solid fa-eye-slash text-sm";
    }
}

// Konfirmasi WA Iuran & Kirim Masukan Admin
function kontfirmasiBayarWA() {
    if(!sessionWarga) return;
    const teks = `Halo Admin TUNTAS, saya ${sessionWarga.nama.toUpperCase()} ingin mengonfirmasi pembayaran iuran. Mohon bantuannya untuk divalidasi. Terima kasih!`;
    window.open(`https://wa.me/${NOMOR_ADMIN_WHATSAPP}?text=${encodeURIComponent(teks)}`, '_blank');
}

function kirimKritikSaranWA() {
    if(!sessionWarga) return;
    const teks = `Halo Admin TUNTAS, saya ${sessionWarga.nama.toUpperCase()} ingin memberikan kritik & saran masukan untuk program ini:\n\n- `;
    window.open(`https://wa.me/${NOMOR_ADMIN_WHATSAPP}?text=${encodeURIComponent(teks)}`, '_blank');
}

function salinRekening() {
    const rek = document.getElementById('noRekText').innerText;
    navigator.clipboard.writeText(rek).then(() => {
        tampilAlert("Berhasil Copas", "Nomor rekening BCA berhasil disalin ke papan klip!", true);
    });
}

// SINKRONISASI BASIS DATA DARI GOOGLE SHEETS
async function ambilDataZSheets() {
    try {
        let res = await fetch(`${SCRIPT_URL}?action=loadAll`, { method: "GET", mode: "cors", redirect: "follow" });
        let json = await res.json();
        if(json.status === "success") {
            dbGlobal = json.data;
            return true;
        } else {
            tampilAlert("Gagal", "Sistem gagal mengambil data dari database pusat.", false);
            return false;
        }
    } catch(e) {
        console.error(e);
        tampilAlert("Putus Koneksi", "Gagal terhubung ke server. Periksa sinyal internetmu, bro.", false);
        return false;
    }
}

// VALIDASI LOGIN WARGA
async function prosesLoginWarga() {
    const inputHp = document.getElementById('lHp').value.trim();
    const inputPass = document.getElementById('lPass').value.trim();

    if(!inputHp || !inputPass) {
        tampilAlert("Form Kosong", "Nomor HP dan Kata Sandi tidak boleh kosong!", false);
        return;
    }

    showLoading();
    let suksesAmbil = await ambilDataZSheets();
    if(!suksesAmbil) {
        hideLoading();
        return;
    }

    const cocok = dbGlobal.anggota.find(u => (u.hp || '').toString().trim() === inputHp);

    if(cocok) {
        dbFirebase.ref('users/' + inputHp).once('value').then((snapshot) => {
            let dataFb = snapshot.val();
            let passwordValid = (cocok.password || '').toString().trim();

            if (dataFb && dataFb.password) {
                passwordValid = dataFb.password.toString().trim();
            }

            if (inputPass === passwordValid) {
                localStorage.setItem('tuntas_warga_hp', inputHp);
                localStorage.setItem('tuntas_warga_pw', inputPass);
                sessionWarga = cocok;
                sessionWarga.password = passwordValid;
                
                document.getElementById('lPass').value = "";
                bukaDashboardWarga();
            } else {
                tampilAlert("Akses Ditolak", "Kata Sandi yang Anda masukkan salah, bro!", false);
            }
            hideLoading();
        }).catch((err) => {
            console.error(err);
            hideLoading();
            tampilAlert("Error", "Gagal memvalidasi database Firebase.", false);
        });
    } else {
        hideLoading();
        tampilAlert("Akses Ditolak", "Nomor WhatsApp belum terdaftar di keanggotaan TUNTAS.", false);
    }
}

// MASUK KE DASHBOARD & SINKRONKAN SEMUA METRIK DATA MALAM
function bukaDashboardWarga() {
    document.getElementById('screen-login').classList.add('hidden');
    document.getElementById('screen-dashboard').classList.remove('hidden');

    // Reset default View Tab ke Dashboard saat login
    switchTab('tab-dashboard', document.querySelectorAll('nav button')[0]);

    let totalPemasukan = 0;
    let totalPengeluaran = 0;
    let kontribusiSaya = 0;
    let riwayatIuranPribadi = [];
    let mutasiKasGabungan = [];

    const namaUserUpper = (sessionWarga.nama || '').trim().toUpperCase();

    // Set Data Header Atas
    document.getElementById('topNamaWarga').innerText = namaUserUpper;
    document.getElementById('topHpWarga').innerText = sessionWarga.hp || '-';

    // 1. Sedot Data Pembayaran Iuran
    if(dbGlobal.pembayaran) {
        dbGlobal.pembayaran.forEach(d => {
            const nominal = Number(d.nominal || 0);
            totalPemasukan += nominal;
            const namaPenyetor = (d.nama || '').trim().toUpperCase();

            mutasiKasGabungan.push({
                tanggal: d.tanggal,
                keterangan: `Iuran ${namaPenyetor} (${d.keterangan || ''})`,
                nominal: nominal,
                kategori: 'masuk'
            });

            if(namaPenyetor === namaUserUpper) {
                kontribusiSaya += nominal;
                riwayatIuranPribadi.push({
                    tanggal: d.tanggal,
                    keterangan: (d.keterangan || '').toString().trim(),
                    nominal: nominal,
                    kode: d.kode || '-'
                });
            }
        });
    }

    // 2. Sedot Data Kas Umum
    if(dbGlobal.kas) {
        dbGlobal.kas.forEach(d => {
            const nominal = Number(d.nominal || 0);
            const kategori = (d.kategori || 'Masuk').trim().toLowerCase();
            if(kategori === 'masuk') totalPemasukan += nominal;
            else totalPengeluaran += nominal;

            mutasiKasGabungan.push({
                tanggal: d.tanggal,
                keterangan: d.keterangan || 'Tanpa keterangan',
                nominal: nominal,
                kategori: kategori
            });
        });
    }

    const saldoKasRealTime = totalPemasukan - totalPengeluaran;

    // Masukkan data ke widget profil & kas
    document.getElementById('cardNama').innerText = namaUserUpper;
    document.getElementById('cardHp').innerText = sessionWarga.hp || '-';
    document.getElementById('cardTotalKontribusi').innerText = 'Rp ' + kontribusiSaya.toLocaleString('id-ID');
    document.getElementById('widgetSaldoKas').innerText = 'Rp ' + saldoKasRealTime.toLocaleString('id-ID');

    // RENDERING BULAN BERGABUNG
    let txtBergabung = "JANUARI 2025"; 
    let mentahBergabung = null;
    for (let key in sessionWarga) {
        if (key.toLowerCase().replace(/\s+/g, '') === 'bulanbergabung' || key.toLowerCase() === 'bergabung') {
            mentahBergabung = sessionWarga[key];
            break;
        }
    }
    if(!mentahBergabung) {
        mentahBergabung = sessionWarga['Bulan Bergabung'] || sessionWarga.bulanBergabung || sessionWarga.bergabung || sessionWarga.tanggal;
    }
    if (mentahBergabung) {
        let objekTgl = new Date(mentahBergabung);
        if (!isNaN(objekTgl.getTime())) {
            txtBergabung = `${daftarBulan[objekTgl.getMonth()]} ${objekTgl.getFullYear()}`;
        } else {
            txtBergabung = mentahBergabung.toString().toUpperCase();
        }
    }
    document.getElementById('cardGabung').innerText = txtBergabung.toUpperCase();

    // LOAD FOTO PROFIL PROFILE TAB
    const avatarImg = document.getElementById('avatarWarga');
    dbFirebase.ref('users/' + sessionWarga.hp + '/fotoProfil').once('value').then((snapshot) => {
        let base64Foto = snapshot.val();
        if (base64Foto) avatarImg.src = base64Foto;
        else avatarImg.src = "avatar.png";
    }).catch(() => { avatarImg.src = "avatar.png"; });

    // =========================================================================
    // FITUR REAL-TIME KALENDER MONITORING SAMPAH BULANAN (TAB DASHBOARD)
    // =========================================================================
    const saiki = new Date();
    const thnBlnNode = `${saiki.getFullYear()}-${String(saiki.getMonth() + 1).padStart(2, '0')}`;
    
    document.getElementById('judulKalenderSampah').innerText = `Sampah (${daftarBulan[saiki.getMonth()]} ${saiki.getFullYear()})`;

    if(statusSampahRef) statusSampahRef.off();

    statusSampahRef = dbFirebase.ref(`status_sampah/${sessionWarga.hp}/${thnBlnNode}`);
    statusSampahRef.on('value', (snapshot) => {
        dataSampahBulanIni = snapshot.val() || {};
        gambarGridKalender(saiki.getFullYear(), saiki.getMonth());
    });

    // =========================================================================
    // PANEL INTEGRISED PETUGAS SAMPAH
    // =========================================================================
    const peranUser = (sessionWarga.status || sessionWarga.peran || '').toLowerCase();
    if (peranUser.includes('pengurus') || peranUser.includes('petugas') || peranUser.includes('ketua')) {
        document.getElementById('areaInputPetugas').classList.remove('hidden');
        const selectWarga = document.getElementById('pilihWargaSampah');
        selectWarga.innerHTML = '';
        
        dbGlobal.anggota.forEach(w => {
            selectWarga.insertAdjacentHTML('beforeend', `
                <option value="${w.hp}">${w.nama.toUpperCase()} (${w.hp})</option>
            `);
        });
    } else {
        document.getElementById('areaInputPetugas').classList.add('hidden');
    }

    // 3. Cetak Checklist Bulanan Iuran (TAB DATA)
    const gridBulan = document.getElementById('statusBulanGrid');
    gridBulan.innerHTML = '';
    daftarBulan.forEach(bln => {
        const isLunas = riwayatIuranPribadi.some(r => {
            let blnDb = r.keterangan.toLowerCase();
            let cariPanjang = bln.toLowerCase();
            let cariPendek = bln.substring(0,3).toLowerCase();
            let arrayBln = blnDb.split(',').map(b => b.trim());
            return arrayBln.some(b => b.includes(cariPanjang) || b.includes(cariPendek) || cariPanjang.includes(b));
        });

        if(isLunas) {
            gridBulan.insertAdjacentHTML('beforeend', `
                <div class="p-3 bg-emerald-600 border border-emerald-700 rounded-2xl text-center shadow-sm text-white flex flex-col items-center justify-center min-h-[54px]">
                    <p class="text-xs font-black uppercase tracking-wider">${bln.substring(0,3)}</p>
                </div>
            `);
        } else {
            gridBulan.insertAdjacentHTML('beforeend', `
                <div class="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-center flex flex-col items-center justify-center min-h-[54px]">
                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">${bln.substring(0,3)}</p>
                    <p class="text-[10px] font-bold text-slate-300 uppercase mt-0.5">-</p>
                </div>
            `);
        }
    });

    // 4. Cetak Histori Pembayaran Pribadi (TAB DATA)
    const listPribadi = document.getElementById('listRiwayatPribadi');
    listPribadi.innerHTML = '';
    if(riwayatIuranPribadi.length === 0) {
        listPribadi.innerHTML = '<p class="text-center text-[11px] text-slate-400 py-6 font-semibold">Belum ada riwayat iuran masuk, bro.</p>';
    } else {
        let sortedPribadi = riwayatIuranPribadi.sort((a,b) => new Date(b.tanggal) - new Date(a.tanggal));
        sortedPribadi.forEach(tx => {
            let tglFormat = tx.tanggal ? new Date(tx.tanggal).toLocaleDateString('id-ID') : '-';
            listPribadi.insertAdjacentHTML('beforeend', `
                <div class="bg-white p-4 rounded-2xl flex justify-between items-center border border-slate-100 shadow-xs">
                    <div class="flex gap-3 items-center">
                        <div class="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black">
                            <i class="fa-solid fa-receipt text-[11px]"></i>
                        </div>
                        <div>
                            <p class="text-xs font-black uppercase text-slate-700 tracking-tight">Iuran Bulan: ${tx.keterangan}</p>
                            <p class="text-[8px] text-slate-400 font-bold">${tglFormat} | Ref: ${tx.kode}</p>
                        </div>
                    </div>
                    <p class="font-black text-xs text-emerald-600">+ ${tx.nominal.toLocaleString('id-ID')}</p>
                </div>
            `);
        });
    }

    // 5. Cetak Laporan Mutasi Kas Gabungan (MODAL)
    const listMutasi = document.getElementById('listMutasiKasMasyarakat');
    listMutasi.innerHTML = '';
    if(mutasiKasGabungan.length === 0) {
        listMutasi.innerHTML = '<p class="text-center text-xs text-slate-400 py-4">Data arus mutasi kas kosong.</p>';
    } else {
        let sortedMutasi = mutasiKasGabungan.sort((a,b) => new Date(b.tanggal) - new Date(a.tanggal));
        sortedMutasi.forEach(m => {
            let isM = m.kategori === 'masuk';
            let tglMFormat = m.tanggal ? new Date(m.tanggal).toLocaleDateString('id-ID') : '-';
            listMutasi.insertAdjacentHTML('beforeend', `
                <div class="p-3 border-b border-slate-100 flex justify-between items-center text-[11px]">
                    <div class="max-w-[70%]">
                        <p class="font-bold text-slate-800 uppercase tracking-tight break-words">${m.keterangan}</p>
                        <p class="text-[8px] text-slate-400 font-medium">${tglMFormat} (${m.kategori.toUpperCase()})</p>
                    </div>
                    <p class="font-black ${isM ? 'text-emerald-600' : 'text-red-500'} shrink-0">${isM ? '+' : '-'} ${m.nominal.toLocaleString('id-ID')}</p>
                </div>
            `);
        });
    }
}

// RENDERING GRID KOTAK ANGKA KALENDER
function gambarGridKalender(tahun, bulan) {
    const container = document.getElementById('gridAngkaKalender');
    container.innerHTML = '';

    const tglPertama = new Date(tahun, bulan, 1).getDay();
    const jumlahHari = new Date(tahun, bulan + 1, 0).getDate();

    for (let i = 0; i < tglPertama; i++) {
        container.insertAdjacentHTML('beforeend', `<div></div>`);
    }

    for (let hari = 1; hari <= jumlahHari; hari++) {
        let rincian = dataSampahBulanIni[hari];
        let kelasWarna = "bg-slate-50 border border-slate-100 text-slate-700 hover:bg-slate-100";
        
        if (rincian) {
            if (rincian.status === "Diambil") {
                kelasWarna = "bg-emerald-600 text-white font-black shadow-xs active:scale-90";
            } else if (rincian.status === "Tidak Diambil") {
                kelasWarna = "bg-rose-500 text-white font-black shadow-xs active:scale-90";
            }
        }

        container.insertAdjacentHTML('beforeend', `
            <button onclick="klikDetailTanggalSampah(${hari})" class="${kelasWarna} py-2.5 rounded-xl text-xs font-bold transition-all focus:outline-none">
                ${hari}
            </button>
        `);
    }
}

// CLICK MANAGER KALENDER POP UP
function klikDetailTanggalSampah(hari) {
    const dataDay = dataSampahBulanIni[hari];
    const saiki = new Date();
    
    document.getElementById('popTglJudul').innerText = `Catatan Tanggal ${hari} ${daftarBulan[saiki.getMonth()]}`;
    const boxIcon = document.getElementById('popBoxIcon');
    const txtStatus = document.getElementById('popStatusTeks');
    const txtJam = document.getElementById('popJamWaktu');

    if (dataDay && dataDay.status !== "Kosong") {
        txtStatus.innerText = dataDay.status;
        txtJam.innerText = `Waktu Angkut: ${dataDay.waktu || '-'}`;
        
        if (dataDay.status === "Diambil") {
            boxIcon.className = "w-14 h-14 mx-auto rounded-2xl flex items-center justify-center bg-emerald-50 text-emerald-600";
            boxIcon.innerHTML = '<span class="material-symbols-rounded !text-3xl">delete_check</span>';
            txtStatus.className = "text-base font-black uppercase tracking-tight mt-1 text-emerald-600";
        } else {
            boxIcon.className = "w-14 h-14 mx-auto rounded-2xl flex items-center justify-center bg-rose-50 text-rose-500";
            boxIcon.innerHTML = '<span class="material-symbols-rounded !text-3xl">delete_forever</span>';
            txtStatus.className = "text-base font-black uppercase tracking-tight mt-1 text-rose-500";
        }
    } else {
        boxIcon.className = "w-14 h-14 mx-auto rounded-2xl flex items-center justify-center bg-slate-100 text-slate-400";
        boxIcon.innerHTML = '<span class="material-symbols-rounded !text-3xl">delete</span>';
        txtStatus.innerText = "KOSONG";
        txtStatus.className = "text-base font-black uppercase tracking-tight mt-1 text-slate-400";
        txtJam.innerText = "Tidak ada jadwal atau petugas libur di tanggal ini.";
    }

    openModal('mDetailSampah');
}

function bukaModalKas() { openModal('mDetailKas'); }

// PROSES GANTI PASSWORD VIA FIREBASE
function prosesGantiPasswordFirebase() {
    const passBaru = document.getElementById('newPass').value.trim();
    if(!passBaru) {
        tampilAlert("Gagal", "Kolom kata sandi baru tidak boleh kosong!", false);
        return;
    }

    showLoading();
    dbFirebase.ref('users/' + sessionWarga.hp).update({
        password: passBaru
    }).then(() => {
        localStorage.setItem('tuntas_warga_pw', passBaru);
        sessionWarga.password = passBaru;
        document.getElementById('newPass').value = "";
        closeModal('mKeamanan');
        hideLoading();
        tampilAlert("Sandi Diperbarui", "Kata sandi akun Anda sukses diubah di server Firebase, bro!", true);
    }).catch(() => {
        hideLoading();
        tampilAlert("Error", "Gagal menyimpan password baru ke Firebase.", false);
    });
}

// PROSES UPLOAD FOTO PROFIL
function prosesUploadFotoFirebase(input) {
    if (!input.files || !input.files[0]) return;
    
    showLoading();
    const file = input.files[0];
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const img = new Image();
        img.src = e.target.result;
        
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            const MAX_WIDTH = 180; 
            const MAX_HEIGHT = 180;
            let width = img.width;
            let height = img.height;
            
            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
            
            dbFirebase.ref('users/' + sessionWarga.hp).update({
                fotoProfil: compressedBase64
            }).then(() => {
                document.getElementById('avatarWarga').src = compressedBase64;
                hideLoading();
                tampilAlert("Foto Diperbarui", "Foto profil baru berhasil diunggah, bro!", true);
            }).catch(() => {
                hideLoading();
                tampilAlert("Gagal Upload", "Gagal mengunggah foto ke Firebase.", false);
            });
        };
    };
    reader.readAsDataURL(file);
}

// UPDATE STATUS SAMPAH OLEH PETUGAS
function updateStatusSampah(statusPilihan) {
    const hpWargaTerpilih = document.getElementById('pilihWargaSampah').value;
    if(!hpWargaTerpilih) return;

    showLoading();

    const sekarang = new Date();
    const tglHariIni = sekarang.getDate();
    const thnBlnNode = `${sekarang.getFullYear()}-${String(sekarang.getMonth() + 1).padStart(2, '0')}`;
    const jamMenit = sekarang.toTimeString().split(' ')[0].substring(0, 5);
    const teksWaktu = `${jamMenit} WIB`;

    const targetNode = dbFirebase.ref(`status_sampah/${hpWargaTerpilih}/${thnBlnNode}/${tglHariIni}`);

    if (statusPilihan === "Kosong") {
        targetNode.remove().then(() => {
            hideLoading();
            tampilAlert("Data Direset", "Catatan sampah warga pada tanggal ini dikosongkan.", true);
        }).catch(() => {
            hideLoading();
            tampilAlert("Gagal", "Gagal mereset data.", false);
        });
    } else {
        targetNode.update({
            status: statusPilihan,
            waktu: teksWaktu
        }).then(() => {
            hideLoading();
            tampilAlert("Status Terkirim", `Berhasil mencatat status sampah warga: ${statusPilihan}`, true);
        }).catch(() => {
            hideLoading();
            tampilAlert("Gagal", "Gagal mengirim data status sampah.", false);
        });
    }
}

// LOGOUT WARGA
function logoutWarga() {
    if(statusSampahRef) {
        statusSampahRef.off();
        statusSampahRef = null;
    }
    localStorage.removeItem('tuntas_warga_hp');
    localStorage.removeItem('tuntas_warga_pw');
    sessionWarga = null;
    document.getElementById('screen-dashboard').classList.add('hidden');
    document.getElementById('screen-login').classList.remove('hidden');
    document.getElementById('lHp').value = "";
}

// AUTO LOGIN HANDLER DUA JALUR
window.onload = async function() {
    showLoading();
    const savedHp = localStorage.getItem('tuntas_warga_hp');
    const savedPw = localStorage.getItem('tuntas_warga_pw');

    if(savedHp && savedPw) {
        let suksesLoad = await ambilDataZSheets();
        if(suksesLoad) {
            const cocok = dbGlobal.anggota.find(u => (u.hp || '').toString().trim() === savedHp);
            if(cocok) {
                dbFirebase.ref('users/' + savedHp).once('value').then((snapshot) => {
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
                    } else {
                        localStorage.clear();
                        hideLoading();
                    }
                }).catch(() => {
                    localStorage.clear();
                    hideLoading();
                });
                return;
            }
        }
        localStorage.clear();
    }
    hideLoading();
};
