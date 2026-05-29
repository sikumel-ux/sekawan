const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzpZZt53kE0d5y7xXfsPFI21NKMx9MLh8N7NXkgtZV_u5QPg9ldAQApH4NzpGOShFDs/exec";

const daftarBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

let dbGlobal = { kas: [], pembayaran: [], anggota: [] };
let cacheAllTrx = []; 
dataWarga = {};
let onConfirmSuccess = null;

function tuntasAlert(title, message, type = 'success') {
    const el = document.getElementById('customAlert');
    const icon = document.getElementById('alertIcon');
    document.getElementById('alertTitle').innerText = title;
    document.getElementById('alertMsg').innerText = message;
    
    if (type === 'error') {
        icon.className = "w-12 h-12 mx-auto rounded-full flex items-center justify-center bg-red-50 text-red-600";
        icon.innerHTML = '<span class="material-symbols-rounded">gpp_maybe</span>';
    } else {
        icon.className = "w-12 h-12 mx-auto rounded-full flex items-center justify-center bg-emerald-50 text-emerald-600";
        icon.innerHTML = '<span class="material-symbols-rounded">check_circle</span>';
    }
    el.style.display = 'flex';
}

function closeAlert() { document.getElementById('customAlert').style.display = 'none'; }

function tuntasConfirm(message, onYes) {
    document.getElementById('confirmMsg').innerText = message;
    onConfirmSuccess = onYes;
    document.getElementById('customConfirm').style.display = 'flex';
}

function closeConfirm() { document.getElementById('customConfirm').style.display = 'none'; onConfirmSuccess = null; }

document.getElementById('confirmBtnOk').onclick = function() {
    if (onConfirmSuccess) onConfirmSuccess();
    closeConfirm();
};

function showLoading() { document.getElementById('loading').style.display = 'flex'; }
function hideLoading() { document.getElementById('loading').style.display = 'none'; }

function init() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    document.getElementById('fMulai').value = startOfMonth;
    document.getElementById('fSelesai').value = now.toISOString().split('T')[0];
    document.getElementById('iTgl').value = now.toISOString().split('T')[0];
    document.getElementById('kTgl').value = now.toISOString().split('T')[0];
    document.getElementById('sTgl').value = now.toISOString().split('T')[0];
    
    const grid = document.getElementById('gridBulan');
    const thr = document.getElementById('th-rekap');
    grid.innerHTML = ''; 
    thr.innerHTML = '<th class="sticky-col p-4 bg-white">Nama</th>';
    
    daftarBulan.forEach(bln => {
        grid.innerHTML += `<label class="relative block"><input type="checkbox" name="blnCek" value="${bln}" class="hidden peer"><div class="cursor-pointer text-[9px] font-black py-3 text-center border rounded-xl bg-white text-slate-300 peer-checked:bg-emerald-900 peer-checked:text-white uppercase transition-all">${bln.substring(0,3)}</div></label>`;
        thr.innerHTML += `<th class="text-center p-3 font-bold text-slate-400">${bln.substring(0,3)}</th>`;
    });
    thr.innerHTML += '<th class="text-center p-3 font-bold text-slate-400">AKSI</th>';
    
    loadDataDariSheets();
}

async function loadDataDariSheets() {
    showLoading();
    try {
        let res = await fetch(`${SCRIPT_URL}?action=loadAll`, { method: "GET" });
        let json = await res.json();
        if(json.status === "success") {
            dbGlobal = json.data;
            renderDataTabel();
        } else { tuntasAlert("Gagal", "Gagal mengambil database!", "error"); }
    } catch(e) { console.error(e); tuntasAlert("Koneksi Error", "Periksa jaringan internet Anda", "error"); }
    hideLoading();
}

function renderDataTabel() {
    const fMulai = new Date(document.getElementById('fMulai').value);
    const fSelesai = new Date(document.getElementById('fSelesai').value);
    fSelesai.setHours(23,59,59);

    let tInFilter = 0, tOutFilter = 0;
    let tInTotal = 0, tOutTotal = 0;
    let trxFilter = [];
    let totalsBln = {}; daftarBulan.forEach(b => totalsBln[b] = 0);

    const listR = document.getElementById('listRiwayat');
    const ti = document.getElementById('tBodyWarga'), tr = document.getElementById('tb-rekap');
    const selBayar = document.getElementById('iNama');
    const selSampah = document.getElementById('sNama');
    
    listR.innerHTML = ''; ti.innerHTML = ''; tr.innerHTML = ''; 
    selBayar.innerHTML = '<option value="">PILIH WARGA</option>';
    selSampah.innerHTML = '<option value="">PILIH WARGA</option>';

    let allSource = [];
    
    if(dbGlobal.kas) {
        dbGlobal.kas.forEach(d => {
            let itemKat = (d.kategori || "Masuk").trim();
            itemKat = itemKat.charAt(0).toUpperCase() + itemKat.slice(1).toLowerCase();

            allSource.push({ 
                col: 'kas', 
                tgl: new Date(d.tanggal), 
                ket: d.keterangan || "", 
                nom: Number(d.nominal || 0), 
                kat: itemKat
            });
        });
    }
    
    if(dbGlobal.pembayaran) {
        dbGlobal.pembayaran.forEach(d => {
            let itemNama = (d.nama || "").trim().toUpperCase();
            let itemKet = (d.keterangan || "").toString().trim();
            let itemNom = Number(d.nominal || 0);
            let itemTgl = new Date(d.tanggal);
            let itemKode = d.kode || "";

            allSource.push({ 
                col: 'pembayaran', 
                kode: itemKode,
                tgl: itemTgl, 
                ket: `Iuran: ${itemNama} (${itemKet})`, 
                nom: itemNom, 
                kat: 'Masuk', 
                parserNama: itemNama, 
                parserBulan: itemKet 
            });
        });
    }

    allSource.forEach(tx => {
        if(tx.kat === 'Masuk') tInTotal += tx.nom; else tOutTotal += tx.nom;
        if(tx.tgl >= fMulai && tx.tgl <= fSelesai) {
            trxFilter.push(tx);
            if(tx.kat === 'Masuk') tInFilter += tx.nom; else tOutFilter += tx.nom;
        }
    });

    cacheAllTrx = trxFilter.sort((a,b) => b.tgl - a.tgl);
    let saldoKeseluruhanGlobal = tInTotal - tOutTotal;

    document.getElementById('totalSaldo').innerText = 'Rp ' + (tInFilter - tOutFilter).toLocaleString('id-ID');
    document.getElementById('saldoSelamanya').innerText = 'Rp ' + saldoKeseluruhanGlobal.toLocaleString('id-ID');
    document.getElementById('totalMasuk').innerText = 'Rp ' + tInFilter.toLocaleString('id-ID');
    document.getElementById('totalKeluar').innerText = 'Rp ' + tOutFilter.toLocaleString('id-ID');

    cacheAllTrx.forEach(tx => {
        const isM = tx.kat === 'Masuk';
        let idHapus = tx.col == 'kas' ? `${tx.ket}|${tx.nom}` : tx.kode;
        let paramHapus = `'${tx.col}', '${idHapus}'`;
        
        listR.insertAdjacentHTML('beforeend', `<div class="bg-white p-4 rounded-2xl flex justify-between items-center border border-slate-50 shadow-sm"><div class="flex gap-3 items-center"><div class="w-8 h-8 rounded-lg ${isM?'bg-emerald-50 text-emerald-600':'bg-red-50 text-red-600'} flex items-center justify-center font-black text-[9px]">${isM?'IN':'OUT'}</div><div><p class="text-xs font-black uppercase text-slate-700 tracking-tighter">${tx.ket}</p><p class="text-[8px] text-slate-300 font-bold">${tx.tgl.toLocaleDateString('id-ID')}</p></div></div><div class="text-right flex items-center gap-2"><p class="font-black text-xs ${isM?'text-emerald-700':'text-red-600'}">${isM?'+':'-'} ${tx.nom.toLocaleString()}</p><button onclick="hapusTrx(${paramHapus})" class="text-slate-200"><span class="material-symbols-rounded text-sm">delete</span></button></div></div>`);
    });

    if(dbGlobal.anggota) {
        dbGlobal.anggota.forEach(d => {
            const n = (d.nama || '').trim().toUpperCase();
            const hpWarga = d.hp || ''; 
            if(!n) return;
            
            dataWarga[n] = hpWarga;
            selBayar.insertAdjacentHTML('beforeend', `<option value="${n}">${n}</option>`);
            selSampah.insertAdjacentHTML('beforeend', `<option value="${n}">${n}</option>`);
            ti.insertAdjacentHTML('beforeend', `<div class="bg-white p-4 rounded-2xl flex justify-between items-center border border-slate-50 shadow-sm"><div><p class="font-black text-xs uppercase text-slate-700">${n}</p><p class="text-[9px] text-slate-400 font-bold">${hpWarga || '-'}</p></div><button onclick="hapusTrx('anggota','${n}')" class="text-red-200"><span class="material-symbols-rounded">delete</span></button></div>`);

            let row = `<tr><td class="sticky-col p-4 font-bold text-slate-700 bg-white border-b border-slate-50 uppercase">${n}</td>`;
            
            daftarBulan.forEach(bln => {
                const lunas = allSource.filter(k => {
                    if (k.col !== 'pembayaran' || k.parserNama !== n) return false;
                    
                    let blnDb = (k.parserBulan || "").trim().toLowerCase();
                    if (!blnDb) return false; 

                    let blnCariPanjang = bln.toLowerCase();
                    let blnCariPendek = bln.substring(0,3).toLowerCase();
                    
                    let arrayBulanDb = blnDb.split(',').map(b => b.trim());
                    return arrayBulanDb.some(b => b.includes(blnCariPanjang) || b.includes(blnCariPendek) || blnCariPanjang.includes(b));
                });
                
                if(lunas.length > 0) {
                    let nomBln = 0; 
                    lunas.forEach(l => {
                        let blnDb = (l.parserBulan || "").trim().toLowerCase();
                        let arrayBulanDb = blnDb.split(',').map(b => b.trim());
                        let jumlahBulanDibayar = arrayBulanDb.length;
                        if (jumlahBulanDibayar < 1) jumlahBulanDibayar = 1;
                        nomBln += (Number(l.nom) / jumlahBulanDibayar);
                    });
                    row += `<td class="text-center text-emerald-600 font-black">${(nomBln/1000).toFixed(0)}K</td>`;
                    totalsBln[bln] += nomBln;
                } else { 
                    row += `<td class="text-center text-slate-100">-</td>`; 
                }
            });
            
            row += `<td class="text-center p-4"><button onclick="bukaDetailIuranWarga('${n}')" class="text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg font-black text-[9px] uppercase border border-emerald-100 flex items-center gap-0.5 mx-auto">Lihat/Hapus</button></td>`;
            tr.insertAdjacentHTML('beforeend', row + `</tr>`);
        });
    }

    let frow = `<tr><td class="sticky-col p-4 font-black bg-emerald-50 text-emerald-900 uppercase">TOTAL</td>`;
    daftarBulan.forEach(bln => frow += `<td class="text-center p-4 bg-emerald-50 text-emerald-800 font-black">${(totalsBln[bln]/1000).toFixed(0)}K</td>`);
    document.getElementById('tf-rekap').innerHTML = frow + `<td class="bg-emerald-50"></td></tr>`;
}

function bukaDetailIuranWarga(namaWarga) {
    document.getElementById('mdTitle').innerText = `Iuran: ${namaWarga}`;
    const listContainer = document.getElementById('mdList');
    listContainer.innerHTML = '';

    if (!dbGlobal.pembayaran) return;
    
    const filterIuran = dbGlobal.pembayaran.filter(d => (d.nama || '').trim().toUpperCase() === namaWarga.toUpperCase());
    
    if (filterIuran.length === 0) {
        listContainer.innerHTML = '<p class="text-center text-[11px] text-slate-400 py-4 font-bold">Belum ada riwayat pembayaran.</p>';
    } else {
        filterIuran.forEach(d => {
            let tgl = d.tanggal || '';
            let ket = d.keterangan || '';
            let nom = Number(d.nominal || 0);
            let kode = d.kode || '';

            listContainer.insertAdjacentHTML('beforeend', `
                <div class="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                    <div>
                        <p class="text-[11px] font-black text-slate-700 uppercase">${ket}</p>
                        <p class="text-[8px] text-slate-400 font-bold">${tgl} | Rp ${nom.toLocaleString()}</p>
                    </div>
                    <button onclick="closeModal('mDetailIuran'); hapusTrx('pembayaran', '${kode}')" class="text-red-500 hover:text-red-700 p-1">
                        <span class="material-symbols-rounded text-sm">delete</span>
                    </button>
                </div>
            `);
        });
    }
    openModal('mDetailIuran');
}

async function kirimKeSheets(payload) {
    showLoading();
    try {
        let res = await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) });
        let json = await res.json();
        if(json.status === "success") {
            await loadDataDariSheets();
            tuntasAlert("Sukses", "Data database berhasil disinkronkan!");
        } else { tuntasAlert("Gagal", "Gagal menyimpan data ke Sheets!", "error"); hideLoading(); }
    } catch(e) { console.error(e); tuntasAlert("Error", "Gagal memproses karena masalah koneksi!", "error"); hideLoading(); }
}

async function simpanIuran() {
    const n = document.getElementById('iNama').value, nmn = Number(document.getElementById('iNom').value), tglVal = document.getElementById('iTgl').value;
    const blns = Array.from(document.querySelectorAll('input[name="blnCek"]:checked')).map(c => c.value);
    if(!n || !nmn || blns.length === 0 || !tglVal) return tuntasAlert("Lengkapi Data", "Silakan tentukan warga, nominal, dan bulan iurannya!", "error");
    
    const kode = "T-" + Math.floor(100000 + Math.random() * 900000); 
    const txtKeterangan = blns.join(", ");
    
    await kirimKeSheets({ 
        action: "simpanIuran", 
        kode: kode,
        nama: n,
        tgl: tglVal,
        ket: txtKeterangan, 
        nom: nmn 
    });
    
    const msg = `Halo, pak/bu *${n}*..%0APembayaran iuran telah kami terima dengan no referensi *${kode}*.%0A%0ATerimakasih atas partisipasinya.%0A%0APengurus TUNTAS.`;
    window.open(`https://wa.me/${(dataWarga[n]||'').toString().replace(/^0/,'62')}?text=${msg}`);
    document.getElementById('iNom').value = '';
    document.querySelectorAll('input[name="blnCek"]').forEach(c => c.checked = false);
}

async function simpanLaporanSampah() {
    const tgl = document.getElementById('sTgl').value;
    const nama = document.getElementById('sNama').value;
    const status = document.querySelector('input[name="sStatus"]:checked').value;

    if(!tgl || !nama) {
        return tuntasAlert("Lengkapi Data", "Silakan tentukan tanggal operasional dan nama warga terlebih dahulu!", "error");
    }

    await kirimKeSheets({
        action: "simpanSampah", 
        tgl: tgl,
        nama: nama,
        status: status
    });

    tuntasAlert("Berhasil", `Status sampah ${nama} diatur: ${status}`);
}

async function simpanKas() {
    const tgl = document.getElementById('kTgl').value, kat = document.getElementById('kKat').value, ket = document.getElementById('kKet').value, nom = Number(document.getElementById('kNom').value);
    if(!customValidateKasInput(tgl, kat, ket, nom)) return;
    
    await kirimKeSheets({ action: "simpanKas", tgl, kat, ket, nom });
    document.getElementById('kKet').value = ''; document.getElementById('kNom').value = '';
    closeModal('mKas');
}

function customValidateKasInput(tgl, kat, ket, nom) {
    if(!ket || !nom || !tgl || !kat) {
        tuntasAlert("Lengkapi Data", "Form input kas wajib diisi semua!", "error");
        return false;
    }
    return true;
}

async function simpanAnggota() {
    const n = document.getElementById('aNama').value.trim().toUpperCase(), h = document.getElementById('aHp').value;
    if(!n) return tuntasAlert("Nama Kosong", "Isi nama lengkap warga terlebih dahulu!", "error");
    
    await kirimKeSheets({ action: "simpanAnggota", nama: n, hp: h }); 
    closeModal('mAnggota'); 
}

function hapusTrx(col, id) { 
    tuntasConfirm("Apakah Anda yakin ingin menghapus transaksi ini secara permanen?", async function() {
        let payload = { action: "hapusTrx", col: col, id: id };
        if (col == 'kas') {
            let splitData = id.split('|');
            payload.ket = splitData[0];
            payload.nom = Number(splitData[1]);
        }
        await kirimKeSheets(payload);
    });
}

function st(t) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('screen-'+t).classList.add('active');
    
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
    document.getElementById('n-'+t).classList.add('active');
}

function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const tglAwal = document.getElementById('fMulai').value;
    const fSelesai = document.getElementById('fSelesai').value;
    doc.setFontSize(22); doc.setTextColor(6, 78, 59); doc.setFont("helvetica", "bold");
    doc.text("TUNTAS.", 14, 20);
    doc.setFontSize(10); doc.setTextColor(100); doc.text(`Laporan Kas: ${tglAwal} s/d ${fSelesai}`, 14, 28);
    doc.autoTable({
        startY: 40,
        head: [['Tanggal', 'Keterangan', 'Tipe', 'Nominal']],
        body: cacheAllTrx.map(t => [t.tgl.toLocaleDateString('id-ID'), t.ket.toUpperCase(), t.kat.toUpperCase(), t.nom.toLocaleString()]),
        headStyles: { fillColor: [6, 78, 59] }
    });
    doc.save(`Laporan_Kas_Tuntas.pdf`);
}

function openModal(id) { document.getElementById(id).style.display='flex'; }
function closeModal(id) { document.getElementById(id).style.display='none'; }

// Run Initialization on Load
window.onload = init;
