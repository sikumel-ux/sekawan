// MASUK KE DASHBOARD & SINKRONKAN SEMUA METRIK DATA (FIXED BULAN BERGABUNG)
function bukaDashboardWarga() {
    document.getElementById('screen-login').classList.add('hidden');
    document.getElementById('screen-dashboard').classList.remove('hidden');

    let totalPemasukan = 0;
    let totalPengeluaran = 0;
    let kontribusiSaya = 0;
    let riwayatIuranPribadi = [];
    let mutasiKasGabungan = [];

    const namaUserUpper = (sessionWarga.nama || '').trim().toUpperCase();

    // 1. SEDOT & FILTER DATA TAB PEMBAYARAN IURAN (DARI SEMUA ANGGOTA)
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

    // HITUNG REAL-TIME KAS RT
    const saldoKasRealTime = totalPemasukan - totalPengeluaran;

    // --- LOGIKA SEDOT & FORMAT SINKRONISASI TANGGAL BERGABUNG ---
    let txtBergabung = "JANUARI 2025"; // Nilai default backup
    // Cek seluruh kemungkinan nama kolom tanggal bergabung di Sheets (bergabung / tanggal / tgl)
    let mentahBergabung = sessionWarga.bergabung || sessionWarga.tanggal || sessionWarga.tgl;
    
    if (mentahBergabung) {
        let objekTgl = new Date(mentahBergabung);
        // Validasi apakah format tanggalnya valid atau tidak
        if (!isNaN(objekTgl.getTime())) {
            let namaBlnIndo = daftarBulan[objekTgl.getMonth()];
            let thnIndo = objekTgl.getFullYear();
            txtBergabung = `${namaBlnIndo} ${thnIndo}`;
        } else {
            // Jika di sheet berupa teks biasa (bukan format tanggal asli), langsung tampilkan teksnya
            txtBergabung = mentahBergabung.toString().toUpperCase();
        }
    }

    // SUNTIK DATA KE KARTU PROFIL & SALDO UTAMA
    document.getElementById('cardNama').innerText = namaUserUpper;
    document.getElementById('cardHp').innerText = sessionWarga.hp || '-';
    document.getElementById('cardGabung').innerText = txtBergabung; // SINKRON TOTAL!
    document.getElementById('cardTotalKontribusi').innerText = 'Rp ' + kontribusiSaya.toLocaleString('id-ID');
    document.getElementById('widgetSaldoKas').innerText = 'Rp ' + saldoKasRealTime.toLocaleString('id-ID');

    // PENANGANAN FOTO PROFIL AVATAR
    const avatar = document.getElementById('avatarWarga');
    if(sessionWarga.foto && sessionWarga.foto.trim() !== "") {
        avatar.src = sessionWarga.foto;
    } else {
        avatar.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(namaUserUpper)}&backgroundColor=064e3b`;
    }

    // 3. CETAK CHECKLIST STATUS GRID BULANAN (MINIMALIS WARNA)
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
