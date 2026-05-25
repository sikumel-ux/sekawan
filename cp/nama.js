// URL Web App GAS (Google Apps Script) TUNTAS
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzpZZt53kE0d5y7xXfsPFI21NKMx9MLh8N7NXkgtZV_u5QPg9ldAQApH4NzpGOShFDs/exec";

const daftarBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
let dbGlobal = { kas: [], pembayaran: [], anggota: [] };
let sessionWarga = null;

function showLoading() { document.getElementById('loading').style.display = 'flex'; }
function hideLoading() { document.getElementById('loading').style.display = 'none'; }

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

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// Perbaikan Toggle Mata Password
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

function kontfirmasiBayarWA() {
    if(!sessionWarga) return;
    const nomorPengurus = "628123456789"; 
    const teks = `Halo Admin TUNTAS, saya ${sessionWarga.nama.toUpperCase()} ingin mengonfirmasi pembayaran iuran. Mohon bantuannya untuk divalidasi. Terima kasih!`;
    window.open(`https://wa.me/${nomorPengurus}?text=${encodeURIComponent(teks)}`, '_blank');
}

function salinRekening() {
    const rek = document.getElementById('noRekText').innerText;
    navigator.clipboard.writeText(rek).then(() => {
        tampilAlert("Berhasil Copas", "Nomor rekening BCA berhasil disalin ke papan klip!", true);
    });
}

async function ambilDataZSheets() {
    showLoading();
    try {
        let res = await fetch(`${SCRIPT_URL}?action=loadAll`, { method: "GET" });
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
        tampilAlert("Putus Koneksi", "Gagal terhubung ke server. Periksa jaringan internet, bro.", false);
        return false;
    } finally {
        hideLoading();
    }
}

async function prosesLoginWarga() {
    const inputHp = document.getElementById('lHp').value.trim();
    const inputPass = document.getElementById('lPass').value.trim();

    if(!inputHp || !inputPass) {
        tampilAlert("Form Kosong", "Nomor HP dan Kata Sandi tidak boleh kosong!", false);
        return;
    }

    let suksesAmbil = await ambilDataZSheets();
    if(!suksesAmbil) return;

    const cocok = dbGlobal.anggota.find(u => 
        (u.hp || '').toString().trim() === inputHp && 
        (u.password || '').toString().trim() === inputPass
    );

    if(cocok) {
        localStorage.setItem('tuntas_warga_hp', inputHp);
        localStorage.setItem('tuntas_warga_pw', inputPass);
        sessionWarga = cocok;
        document.getElementById('lPass').value = "";
        bukaDashboardWarga();
    } else {
        tampilAlert("Akses Ditolak", "Nomor WhatsApp atau Kata Sandi salah.", false);
    }
}

// SINKRONISASI DATASHEET KE DASHBOARD PORTAL
function bukaDashboardWarga() {
    document.getElementById('screen-login').classList.add('hidden');
    document.getElementById('screen-dashboard').classList.remove('hidden');

    let totalPemasukan = 0;
    let totalPengeluaran = 0;
    let kontribusiSaya = 0;
    let riwayatIuranPribadi = [];
    let mutasiKasGabungan = [];

    const namaUserUpper = (sessionWarga.nama || '').trim().toUpperCase();

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

    const saldoKasRealTime = totalPemasukan - totalPengeluaran;

    // --- 🛠️ FIX SINKRONISASI TOTAL BULAN BERGABUNG (Mengakomodasi spasi label) ---
    let txtBergabung = "JANUARI 2025"; 
    let mentahBergabung = sessionWarga['Bulan Bergabung'] || sessionWarga.bulanBergabung || sessionWarga.bergabung;
    
    if (mentahBergabung) {
        let objekTgl = new Date(mentahBergabung);
        if (!isNaN(objekTgl.getTime())) {
            txtBergabung = `${daftarBulan[objekTgl.getMonth()]} ${objekTgl.getFullYear()}`;
        } else {
            txtBergabung = mentahBergabung.toString().toUpperCase();
        }
    }

    document.getElementById('cardNama').innerText = namaUserUpper;
    document.getElementById('cardHp').innerText = sessionWarga.hp || '-';
    document.getElementById('cardGabung').innerText = txtBergabung;
    document.getElementById('cardTotalKontribusi').innerText = 'Rp ' + kontribusiSaya.toLocaleString('id-ID');
    document.getElementById('widgetSaldoKas').innerText = 'Rp ' + saldoKasRealTime.toLocaleString('id-ID');

    // --- 🛠️ FIX TAMPILAN FOTO PROFIL (Membaca label kapital 'Foto') ---
    const avatar = document.getElementById('avatarWarga');
    let urlFoto = sessionWarga.Foto || sessionWarga.foto;
    if(urlFoto && urlFoto.trim() !== "") {
        avatar.src = urlFoto;
    } else {
        avatar.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(namaUserUpper)}&backgroundColor=064e3b`;
    }

    // 3. CETAK GRID BULANAN (MINIMALIS KOTAK HIJAU)
    const gridBulan = document.getElementById('statusBulanGrid');
    gridBulan.innerHTML = '';

    daftarBulan.forEach(bln => {
        const isLunas = riwayatIuranPribadi.some(r => {
            let blnDb = r.keterangan.toLowerCase();
            let cariPanjang = bln.toLowerCase();
            let cariPendek = bln.substring(0,3).toLowerCase();
            return blnDb.includes(cariPanjang) || blnDb.includes(cariPendek);
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

    // 4. CETAK LIST HISTORI PRIBADI
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
                    <p class="font-black text-xs text-emerald-600">+ ${tx.nominal.toLocaleString('id-ID')}</p>
                </div>
            `);
        });
    }

    // 5. CETAK MUTASI TRANSAKSI GABUNGAN
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

function bukaModalKas() { openModal('mDetailKas'); }

// --- 🛠️ FUNGSI BARU: PROSES UPLOAD FOTO KE GOOGLE SHEETS VIA BASE64 ---
function uploadFotoProfil(input) {
    if (!input.files || !input.files[0]) return;
    
    const file = input.files[0];
    const reader = new FileReader();
    
    showLoading();
    
    reader.onload = async function(e) {
        const base64Data = e.target.result.split(',')[1];
        try {
            let formData = new URLSearchParams();
            formData.append('action', 'updateFoto');
            formData.append('hp', sessionWarga.hp);
            formData.append('filename', file.name);
            formData.append('mimeType', file.type);
            formData.append('fileData', base64Data);

            let res = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: formData,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            
            let json = await res.json();
            if(json.status === "success") {
                // Update local session data dengan URL foto dari Drive yang baru
                sessionWarga.Foto = json.videoUrl || json.url || json.fileUrl; 
                document.getElementById('avatarWarga').src = e.target.result; // Tampilkan lokal preview langsung
                tampilAlert("Sukses", "Foto profil berhasil diperbarui, bro!", true);
            } else {
                tampilAlert("Gagal", "Server gagal memproses penyimpanan foto.", false);
            }
        } catch(err) {
            console.error(err);
            tampilAlert("Error", "Gagal mengunggah foto ke database pusat.", false);
        } finally {
            hideLoading();
        }
    };
    reader.readAsDataURL(file);
}

async function prosesGantiPassword() {
    const passBaru = document.getElementById('newPass').value.trim();
    if(!passBaru) {
        tampilAlert("Gagal", "Kolom kata sandi baru tidak boleh kosong!", false);
        return;
    }
    showLoading();
    try {
        let res = await fetch(`${SCRIPT_URL}?action=gantiPassword&hp=${sessionWarga.hp}&passwordBaru=${encodeURIComponent(passBaru)}`, { method: "POST" });
        let json = await res.json();
        if(json.status === "success") {
            localStorage.setItem('tuntas_warga_pw', passBaru);
            sessionWarga.password = passBaru;
            document.getElementById('newPass').value = "";
            closeModal('mKeamanan');
            tampilAlert("Sandi Diperbarui", "Kata sandi sukses diubah, bro!", true);
        } else {
            tampilAlert("Gagal", "Gagal merubah password di database.", false);
        }
    } catch(e) {
        console.error(e);
        tampilAlert("Error", "Gagal merubah password.", false);
    } finally {
        hideLoading();
    }
}

function logoutWarga() {
    localStorage.removeItem('tuntas_warga_hp');
    localStorage.removeItem('tuntas_warga_pw');
    sessionWarga = null;
    document.getElementById('screen-dashboard').classList.add('hidden');
    document.getElementById('screen-login').classList.remove('hidden');
    document.getElementById('lHp').value = "";
}

window.onload = async function() {
    showLoading();
    const savedHp = localStorage.getItem('tuntas_warga_hp');
    const savedPw = localStorage.getItem('tuntas_warga_pw');

    let suksesLoad = await ambilDataZSheets();
    
    if(suksesLoad && savedHp && savedPw) {
        const cocok = dbGlobal.anggota.find(u => 
            (u.hp || '').toString().trim() === savedHp && 
            (u.password || '').toString().trim() === savedPw
        );
        if(cocok) {
            sessionWarga = cocok;
            bukaDashboardWarga();
            hideLoading();
            return;
        } else {
            localStorage.clear();
        }
    }
    hideLoading();
};
