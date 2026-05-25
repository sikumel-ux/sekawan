// URL Web App GAS (Google Apps Script) TUNTAS Aktif
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzpZZt53kE0d5y7xXfsPFI21NKMx9MLh8N7NXkgtZV_u5QPg9ldAQApH4NzpGOShFDs/exec";

const daftarBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
let dbGlobal = { kas: [], pembayaran: [], anggota: [] };
let sessionWarga = null; // Menyimpan data profil warga yang sedang login

// Manajemen Loading Screen
function showLoading() { document.getElementById('loading').style.display = 'flex'; }
function hideLoading() { document.getElementById('loading').style.display = 'none'; }

// Fungsi Custom Alert pengganti window.alert agar serasi dengan UI Tuntas
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

// Toggle Mata pada Input Password Login
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

// KIRIM WHATSAPP UNTUK KONFIRMASI PEMBAYARAN
function kontfirmasiBayarWA() {
    if(!sessionWarga) return;
    const nomorPengurus = "628123456789"; // <-- Ganti dengan nomor WhatsApp Admin/Bendahara RT, bro!
    const teks = `Halo Admin TUNTAS, saya ${sessionWarga.nama.toUpperCase()} ingin mengonfirmasi pembayaran iuran. Mohon bantuannya untuk divalidasi. Terima kasih!`;
    window.open(`https://wa.me/${nomorPengurus}?text=${encodeURIComponent(teks)}`, '_blank');
}

// SALIN REKENING
function salinRekening() {
    const rek = document.getElementById('noRekText').innerText;
    navigator.clipboard.writeText(rek).then(() => {
        tampilAlert("Berhasil Copas", "Nomor rekening BCA berhasil disalin ke papan klip!", true);
    });
}

// SINKRONISASI BASIS DATA DARI GOOGLE SHEETS
async function ambilDataZSheets() {
    try {
        let res = await fetch(`${SCRIPT_URL}?action=loadAll`, { 
            method: "GET",
            mode: "cors",
            redirect: "follow"
        });
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
        tampilAlert("Putus Koneksi", "Gagal terhubung ke server. Periksa kuota/sinyal internetmu, bro.", false);
        return false;
    }
}

// PROSES VALIDASI LOGIN WARGA
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

    // Validasi data (mencocokkan no hp dan password dari database sheet Anggota)
    const cocok = dbGlobal.anggota.find(u => 
        (u.hp || '').toString().trim() === inputHp && 
        (u.password || '').toString().trim() === inputPass
    );

    if(cocok) {
        localStorage.setItem('tuntas_warga_hp', inputHp);
        localStorage.setItem('tuntas_warga_pw', inputPass);
        sessionWarga = cocok;
        
        // Bersihkan inputan password
        document.getElementById('lPass').value = "";
        bukaDashboardWarga();
    } else {
        tampilAlert("Akses Ditolak", "Nomor WhatsApp atau Kata Sandi salah. Periksa kembali datamu, bro!", false);
    }
    hideLoading();
}

// MASUK KE DASHBOARD & SINKRONKAN SEMUA METRIK DATA
function bukaDashboardWarga() {
    document.getElementById('screen-login').classList.add('hidden');
    document.getElementById('screen-dashboard').classList.remove('hidden');

    let totalPemasukan = 0;
    let totalPengeluaran = 0;
    let kontribusiSaya = 0;
    let riwayatIuranPribadi = [];
    let mutasiKasGabungan = []; // Menampung gabungan mutasi kas umum dan iuran masuk dari semua anggota

    const namaUserUpper = (sessionWarga.nama || '').trim().toUpperCase();

    // 1. SEDOT & FILTER DATA TAB PEMBAYARAN IURAN (DARI SEMUA ANGGOTA)
    if(dbGlobal.pembayaran) {
        dbGlobal.pembayaran.forEach(d => {
            const nominal = Number(d.nominal || 0);
            totalPemasukan += nominal; // Seluruh iuran otomatis menambah kas masuk umum

            const namaPenyetor = (d.nama || '').trim().toUpperCase();

            // Masukkan data pembayaran ini ke dalam daftar rincian mutasi kas masyarakat
            mutasiKasGabungan.push({
                tanggal: d.tanggal,
                keterangan: `Iuran ${namaPenyetor} (${d.keterangan || ''})`,
                nominal: nominal,
                kategori: 'masuk'
            });

            // Filter khusus iuran milik warga yang sedang login saat ini
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

    // 2. SEDOT & FILTER DATA TAB KAS UMUM
    if(dbGlobal.kas) {
        dbGlobal.kas.forEach(d => {
            const nominal = Number(d.nominal || 0);
            const kategori = (d.kategori || 'Masuk').trim().toLowerCase();
            
            if(kategori === 'masuk') {
                totalPemasukan += nominal;
            } else {
                totalPengeluaran += nominal;
            }

            mutasiKasGabungan.push({
                tanggal: d.tanggal,
                keterangan: d.keterangan || 'Tanpa keterangan',
                nominal: nominal,
                kategori: kategori
            });
        });
    }

    // HITUNG REAL-TIME KAS RT (Pemasukan Total - Pengeluaran Total)
    const saldoKasRealTime = totalPemasukan - totalPengeluaran;

    // SUNTIK DATA KE KARTU PROFIL & SALDO UTAMA
    document.getElementById('cardNama').innerText = namaUserUpper;
    document.getElementById('cardHp').innerText = sessionWarga.hp || '-';
    document.getElementById('cardTotalKontribusi').innerText = 'Rp ' + kontribusiSaya.toLocaleString('id-ID');
    document.getElementById('widgetSaldoKas').innerText = 'Rp ' + saldoKasRealTime.toLocaleString('id-ID');

    // FORMAT DATA BULAN/TANGGAL BERGABUNG AGAR SESUAI STANDAR INDONESIA
    let tanggalMentah = sessionWarga.bergabung || sessionWarga.Bergabung || sessionWarga.tanggal || sessionWarga.Tanggal;
    let tanggalTercetak = "JANUARI 2025"; // Nilai fallback bawaan template jika kosong

    if (tanggalMentah) {
        // Cek apakah tipenya teks biasa (Misal: "Maret 2025") atau format Date ISO ("2025-03-12")
        if (isNaN(Date.parse(tanggalMentah))) {
            tanggalTercetak = tanggalMentah.toString().toUpperCase();
        } else {
            // Ubah otomatis ke format teks Indonesia (Hanya Bulan dan Tahun saja)
            let opsiFormat = { month: 'long', year: 'numeric' };
            tanggalTercetak = new Date(tanggalMentah).toLocaleDateString('id-ID', opsiFormat).toUpperCase();
        }
    }
    document.getElementById('cardGabung').innerText = tanggalTercetak;

    // PENANGANAN FOTO PROFIL AVATAR (OFF - SELALU PAKAI AVATAR.PNG LOKAL)
    const avatar = document.getElementById('avatarWarga');
    avatar.src = "avatar.png";

    // 3. CETAK CHECKLIST STATUS GRID BULANAN
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
                <div class="p-3 bg-emerald-600 border border-emerald-700 rounded-2xl text-center shadow-sm text-white animate-fade-in flex flex-col items-center justify-center min-h-[54px]">
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

    // 4. CETAK HISTORI DAFTAR TRANSAKSI PEMBAYARAN PRIBADI WARGA
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
                            <span class="material-symbols-rounded !text-sm">payments</span>
                        </div>
                        <div>
                            <p class="text-xs font-black uppercase text-slate-700 tracking-tight">Iuran Bulan: ${tx.keterangan}</p>
                            <p class="text-[8px] text-slate-400 font-bold">${tglFormat} | Ref: ${tx.kode}</p>
                        </div>
                    </div>
                    <p class="font-black text-xs text-emerald-600">
                        + ${tx.nominal.toLocaleString('id-ID')}
                    </p>
                </div>
            `);
        });
    }

    // 5. MEMBUAT DATA MODAL DETAIL LAPORAN MUTASI KAS GABUNGAN
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
                    <p class="font-black ${isM ? 'text-emerald-600' : 'text-red-500'} shrink-0">
                        ${isM ? '+' : '-'} ${m.nominal.toLocaleString('id-ID')}
                    </p>
                </div>
            `);
        });
    }
}

// MEMBUKA MODAL DETAIL KAS KESELURUHAN
function bukaModalKas() { openModal('mDetailKas'); }

// PROSES GANTI PASSWORD VIA PORTAL WARGA (FIXED METHOD POST BODY JSON)
async function prosesGantiPassword() {
    const passBaru = document.getElementById('newPass').value.trim();
    if(!passBaru) {
        tampilAlert("Gagal", "Kolom kata sandi baru tidak boleh kosong!", false);
        return;
    }

    showLoading();
    try {
        let dataPaketSandi = {
            action: "gantiPassword",
            hp: sessionWarga.hp.toString().trim(),
            passwordBaru: passBaru
        };

        let res = await fetch(SCRIPT_URL, { 
            method: "POST",
            mode: "cors",
            redirect: "follow",
            body: JSON.stringify(dataPaketSandi)
        });
        
        let json = await res.json();
        if(json.status === "success") {
            localStorage.setItem('tuntas_warga_pw', passBaru);
            sessionWarga.password = passBaru;
            document.getElementById('newPass').value = "";
            closeModal('mKeamanan');
            tampilAlert("Sandi Diperbarui", "Kata sandi akun Anda sukses diubah, bro!", true);
        } else {
            tampilAlert("Gagal", json.message || "Gagal mengubah password di server.", false);
        }
    } catch(e) {
        console.error(e);
        tampilAlert("Error", "Gagal melakukan koneksi untuk ganti password.", false);
    } finally {
        hideLoading();
    }
}

// LOGOUT WARGA
function logoutWarga() {
    localStorage.removeItem('tuntas_warga_hp');
    localStorage.removeItem('tuntas_warga_pw');
    sessionWarga = null;
    document.getElementById('screen-dashboard').classList.add('hidden');
    document.getElementById('screen-login').classList.remove('hidden');
    document.getElementById('lHp').value = "";
}

// CEK AUTO LOGIN SAAT HALAMAN DIBUKA (FIRST INITIALIZATION)
window.onload = async function() {
    showLoading();
    const savedHp = localStorage.getItem('tuntas_warga_hp');
    const savedPw = localStorage.getItem('tuntas_warga_pw');

    if(savedHp && savedPw) {
        let suksesLoad = await ambilDataZSheets();
        if(suksesLoad) {
            const cocok = dbGlobal.anggota.find(u => 
                (u.hp || '').toString().trim() === savedHp && 
                (u.password || '').toString().trim() === savedPw
            );
            if(cocok) {
                sessionWarga = cocok;
                bukaDashboardWarga();
                hideLoading();
                return;
            }
        }
        localStorage.clear();
    }
    hideLoading();
};
