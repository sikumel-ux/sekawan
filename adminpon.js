// --- KONFIGURASI FIREBASE ---
const config = {
    apiKey: "AIzaSyDjxOJZeiLHaxoaS3-hVdbIGfIXCfCT2Is",
    authDomain: "tuntas-sekawan.firebaseapp.com",
    projectId: "tuntas-sekawan",
    storageBucket: "tuntas-sekawan.firebasestorage.app",
    messagingSenderId: "1090506516563",
    appId: "1:1090506516563:web:63c429677caea28addfea6"
};

firebase.initializeApp(config);
const db = firebase.firestore();
const daftarBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni"];

// --- JALANKAN SAAT LOAD ---
document.addEventListener('DOMContentLoaded', () => {
    init();
});

function init() {
    const grid = document.getElementById('gridBulan');
    const thr = document.getElementById('th-rekap');
    
    // Setup Grid Bulan untuk Tab Bayar
    if(grid) grid.innerHTML = '';
    // Setup Header Tabel Rekap
    if(thr) thr.innerHTML = '<th class="sticky-col p-4 bg-white text-[10px]">NAMA WARGA</th>';
    
    daftarBulan.forEach(bln => {
        if(grid) {
            grid.innerHTML += `
                <label class="relative">
                    <input type="checkbox" name="blnCek" value="${bln}" class="hidden peer">
                    <div class="cursor-pointer text-[9px] font-black py-3 text-center border rounded-xl bg-white text-slate-300 peer-checked:bg-emerald-900 peer-checked:text-white uppercase transition-all">
                        ${bln.substring(0,3)}
                    </div>
                </label>`;
        }
        if(thr) thr.innerHTML += `<th class="text-center p-3 font-bold text-slate-400">${bln.substring(0,3)}</th>`;
    });
    
    loadData();
}

// --- LOGIKA AMBIL DATA ---
async function loadData() {
    try {
        const [dkas, diur, dang] = await Promise.all([
            db.collection("kas").get(), 
            db.collection("pembayaran").get(), 
            db.collection("anggota").orderBy("nama","asc").get()
        ]);
        
        let tIn=0, tOut=0, tIur=0;
        let totalsBln = {}; 
        daftarBulan.forEach(b => totalsBln[b] = 0);
        let allTrx = [];

        const ti=document.getElementById('tBodyWarga'), 
              tr=document.getElementById('tb-rekap'), 
              sel=document.getElementById('iNama'), 
              listR = document.getElementById('listRiwayat');
        
        if(ti) ti.innerHTML=''; 
        if(tr) tr.innerHTML=''; 
        if(sel) sel.innerHTML='<option value="">PILIH WARGA</option>'; 
        if(listR) listR.innerHTML='';

        const iuranArr = diur.docs.map(doc => ({id: doc.id, ...doc.data()}));

        // Proses Kas Umum
        dkas.docs.forEach(doc => {
            const d = doc.data(); 
            const nom = Number(d.nom || 0);
            if(d.kat==='Masuk') tIn+=nom; else tOut+=nom;
            allTrx.push({ ket: d.ket, nom: nom, kat: d.kat, tgl: d.tgl.toDate() });
        });

        // Proses Iuran
        iuranArr.forEach(d => {
            const nom = Number(d.nom || 0); 
            tIur += nom;
            allTrx.push({ ket: `IURAN: ${d.nama || ''}`, nom: nom, kat: 'Masuk', tgl: d.tgl ? d.tgl.toDate() : new Date() });
        });

        // Update Saldo Dashboard
        const saldoElement = document.getElementById('totalSaldo');
        if(saldoElement) saldoElement.innerText = 'Rp ' + ((tIn + tIur) - tOut).toLocaleString('id-ID');

        // Render Histori (5 terakhir)
        if(listR) {
            allTrx.sort((a,b) => b.tgl - a.tgl).slice(0, 5).forEach(tx => {
                const isM = tx.kat === 'Masuk';
                listR.insertAdjacentHTML('beforeend', `
                    <div class="bg-white p-4 rounded-2xl flex justify-between items-center border border-slate-50 shadow-sm">
                        <div class="flex gap-3 items-center">
                            <div class="w-8 h-8 rounded-lg ${isM?'bg-emerald-50 text-emerald-600':'bg-red-50 text-red-600'} flex items-center justify-center font-black text-[9px]">
                                ${isM?'IN':'OUT'}
                            </div>
                            <div>
                                <p class="text-[11px] font-black uppercase text-slate-700 leading-tight">${tx.ket}</p>
                                <p class="text-[8px] text-slate-300 font-bold">${tx.tgl.toLocaleDateString('id-ID')}</p>
                            </div>
                        </div>
                        <p class="font-black text-xs ${isM?'text-emerald-700':'text-red-600'}">${isM?'+':'-'} ${tx.nom.toLocaleString()}</p>
                    </div>`);
            });
        }

        // Render Warga & Tabel Rekap
        dang.docs.forEach(doc => {
            const d = doc.data(); 
            const n = d.nama.toUpperCase();
            if(sel) sel.insertAdjacentHTML('beforeend', `<option value="${n}">${n}</option>`);
            if(ti) ti.insertAdjacentHTML('beforeend', `<div class="bg-white p-4 rounded-2xl flex justify-between items-center border border-slate-100 shadow-sm"><p class="font-black text-xs text-slate-700">${n}</p><span class="material-symbols-rounded text-slate-200">person</span></div>`);

            if(tr) {
                let row = `<tr><td class="sticky-col p-4 font-black text-slate-700 bg-white border-b border-slate-50 uppercase text-[10px]">${n}</td>`;
                daftarBulan.forEach(bln => {
                    const lunas = iuranArr.filter(k => (k.nama||"").toUpperCase() === n && (k.bulan||"").includes(bln));
                    if(lunas.length > 0) {
                        let nomBln = 0; lunas.forEach(l => nomBln += (Number(l.nom) / (l.bulan||"").split(',').length));
                        row += `<td class="text-center text-emerald-600 font-black">${(nomBln/1000).toFixed(0)}K</td>`;
                        totalsBln[bln] += nomBln;
                    } else { row += `<td class="text-center text-slate-100">-</td>`; }
                });
                tr.insertAdjacentHTML('beforeend', row + `</tr>`);
            }
        });

        // Footer Total Rekap
        const tf = document.getElementById('tf-rekap');
        if(tf) {
            let frow = `<tr><td class="sticky-col p-4 font-black bg-emerald-50">TOTAL</td>`;
            daftarBulan.forEach(bln => { frow += `<td class="text-center p-4 bg-emerald-50 text-emerald-700 font-black">${(totalsBln[bln]/1000).toFixed(0)}K</td>`; });
            tf.innerHTML = frow + `</tr>`;
        }

    } catch(e) { console.error("Error Load Data: ", e); }
}

// --- FUNGSI TOOLS & ACTIONS ---
function st(t) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    const target = document.getElementById('screen-' + t);
    if(target) target.classList.add('active');
    
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
    const navBtn = document.getElementById('n-' + t);
    if(navBtn) navBtn.classList.add('active');
}

function openModal(id) { document.getElementById(id).style.display='flex'; }
function closeModal(id) { document.getElementById(id).style.display='none'; }

async function simpanKas() {
    const tgl = document.getElementById('kTgl').value, 
          kat = document.getElementById('kKat').value, 
          ket = document.getElementById('kKet').value.trim().toUpperCase(), 
          nom = Number(document.getElementById('kNom').value);
    
    if(!ket || !nom || !tgl) return alert("Lengkapi data!");
    await db.collection("kas").add({ tgl: new Date(tgl), kat, ket, nom });
    closeModal('mKas'); 
    loadData();
}

async function simpanAnggota() {
    const n = document.getElementById('aNama').value.trim().toUpperCase(), 
          h = document.getElementById('aHp').value;
    if(!n) return alert("Nama wajib diisi!");
    await db.collection("anggota").add({ nama: n, hp: h });
    closeModal('mAnggota');
    loadData();
}

async function simpanIuran() {
    const nama = document.getElementById('iNama').value;
    const nom = Number(document.getElementById('iNom').value);
    const ceks = document.querySelectorAll('input[name="blnCek"]:checked');
    
    if(!nama || !nom || ceks.length === 0) return alert("Lengkapi data pembayaran!");
    
    const blns = Array.from(ceks).map(c => c.value).join(',');
    await db.collection("pembayaran").add({
        nama: nama,
        nom: nom,
        bulan: blns,
        tgl: new Date()
    });
    
    alert("Iuran berhasil dicatat!");
    // Reset checkbox
    ceks.forEach(c => c.checked = false);
    document.getElementById('iNom').value = '';
    st('home');
    loadData();
                      }
  
