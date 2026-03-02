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

document.addEventListener('DOMContentLoaded', () => {
    init();
    loadData();
    loadPon(); // Load data PON juga
});

function init() {
    const grid = document.getElementById('gridBulan');
    const thr = document.getElementById('th-rekap');
    document.getElementById('pTgl').value = new Date().toISOString().split('T')[0];
    document.getElementById('kTgl').value = new Date().toISOString().split('T')[0];
    
    thr.innerHTML = '<th class="sticky-col p-4 bg-white text-[10px]">NAMA WARGA</th>';
    daftarBulan.forEach(bln => {
        grid.innerHTML += `<label class="relative"><input type="checkbox" name="blnCek" value="${bln}" class="hidden peer"><div class="cursor-pointer text-[9px] font-black py-3 text-center border rounded-xl bg-white text-slate-300 peer-checked:bg-emerald-900 peer-checked:text-white uppercase transition-all">${bln.substring(0,3)}</div></label>`;
        thr.innerHTML += `<th class="text-center p-3 font-bold text-slate-400">${bln.substring(0,3)}</th>`;
    });
}

// LOGIKA KAS UTAMA
async function loadData() {
    const [dkas, diur, dang] = await Promise.all([
        db.collection("kas").get(), db.collection("pembayaran").get(), db.collection("anggota").orderBy("nama","asc").get()
    ]);
    let tIn=0, tOut=0, tIur=0;
    let totalsBln = {}; daftarBulan.forEach(b => totalsBln[b] = 0);
    let allTrx = [];

    const ti=document.getElementById('tBodyWarga'), tr=document.getElementById('tb-rekap'), sel=document.getElementById('iNama'), listR = document.getElementById('listRiwayat');
    ti.innerHTML=''; tr.innerHTML=''; sel.innerHTML='<option value="">PILIH WARGA</option>'; listR.innerHTML='';
    const iuranArr = diur.docs.map(doc => ({...doc.data()}));

    dkas.docs.forEach(doc => {
        const d = doc.data(); const n = Number(d.nom || 0);
        if(d.kat==='Masuk') tIn+=n; else tOut+=n;
        allTrx.push({ ket: d.ket, nom: n, kat: d.kat, tgl: d.tgl.toDate() });
    });

    iuranArr.forEach(d => {
        const n = Number(d.nom || 0); tIur += n;
        allTrx.push({ ket: `IURAN: ${d.nama}`, nom: n, kat: 'Masuk', tgl: d.tgl ? d.tgl.toDate() : new Date() });
    });

    document.getElementById('totalSaldo').innerText = 'Rp ' + ((tIn + tIur) - tOut).toLocaleString('id-ID');
    document.getElementById('tMasuk').innerText = 'Rp ' + (tIn + tIur).toLocaleString('id-ID');
    document.getElementById('tKeluar').innerText = 'Rp ' + tOut.toLocaleString('id-ID');

    allTrx.sort((a,b) => b.tgl - a.tgl).slice(0, 6).forEach(tx => {
        const isM = tx.kat === 'Masuk';
        listR.insertAdjacentHTML('beforeend', `<div class="bg-white p-4 rounded-2xl flex justify-between items-center border border-slate-50 shadow-sm"><div class="flex gap-3 items-center"><div class="w-8 h-8 rounded-lg ${isM?'bg-emerald-50 text-emerald-600':'bg-red-50 text-red-600'} flex items-center justify-center font-black text-[9px]">${isM?'IN':'OUT'}</div><div><p class="text-[11px] font-black uppercase text-slate-700 leading-tight">${tx.ket}</p><p class="text-[8px] text-slate-300 font-bold">${tx.tgl.toLocaleDateString('id-ID')}</p></div></div><p class="font-black text-xs ${isM?'text-emerald-700':'text-red-600'}">${isM?'+':'-'} ${tx.nom.toLocaleString()}</p></div>`);
    });

    dang.docs.forEach(doc => {
        const n = doc.data().nama.toUpperCase();
        sel.insertAdjacentHTML('beforeend', `<option value="${n}">${n}</option>`);
        ti.insertAdjacentHTML('beforeend', `<div class="bg-white p-4 rounded-2xl flex justify-between items-center border border-slate-100 shadow-sm"><p class="font-black text-xs text-slate-700">${n}</p><span class="material-symbols-rounded text-slate-200">person</span></div>`);

        let row = `<tr><td class="sticky-col p-4 font-black text-slate-700 bg-white border-b border-slate-50 uppercase text-[10px]">${n}</td>`;
        daftarBulan.forEach(bln => {
            const lunas = iuranArr.filter(k => k.nama === n && k.bulan.includes(bln));
            if(lunas.length > 0) {
                let nB = 0; lunas.forEach(l => nB += (Number(l.nom) / l.bulan.split(',').length));
                row += `<td class="text-center text-emerald-600 font-black">${(nB/1000).toFixed(0)}K</td>`;
                totalsBln[bln] += nB;
            } else row += `<td class="text-center text-slate-100">-</td>`;
        });
        tr.insertAdjacentHTML('beforeend', row + `</tr>`);
    });
}

// LOGIKA PON MANDIRI
async function simpanPon() {
    const tgl = document.getElementById('pTgl').value, kat = document.getElementById('pKat').value, ket = document.getElementById('pKet').value.trim().toUpperCase(), nom = Number(document.getElementById('pNom').value);
    if(!ket || !nom) return alert("Isi data PON!");
    await db.collection("pon_mandiri").add({ tgl: new Date(tgl), kat, ket, nom });
    document.getElementById('pKet').value = ''; document.getElementById('pNom').value = '';
    loadPon();
}

async function loadPon() {
    const snap = await db.collection("pon_mandiri").orderBy("tgl", "desc").get();
    const list = document.getElementById('listPon');
    let total = 0; list.innerHTML = '';
    snap.forEach(doc => {
        const d = doc.data(); const isM = d.kat === 'Masuk';
        if(isM) total += d.nom; else total -= d.nom;
        list.insertAdjacentHTML('beforeend', `<div class="bg-white p-4 rounded-2xl flex justify-between items-center border border-slate-100 shadow-sm"><div class="flex gap-3 items-center"><div class="w-8 h-8 rounded-lg ${isM?'bg-emerald-50 text-emerald-600':'bg-red-50 text-red-600'} flex items-center justify-center font-black text-[9px]">${isM?'IN':'OUT'}</div><div><p class="text-[11px] font-black text-slate-700 uppercase">${d.ket}</p><p class="text-[8px] text-slate-300 font-bold">${d.tgl.toDate().toLocaleDateString('id-ID')}</p></div></div><p class="font-black text-xs ${isM?'text-emerald-700':'text-red-600'}">${isM?'+':'-'} ${d.nom.toLocaleString()}</p></div>`);
    });
    document.getElementById('totalPon').innerText = 'Rp ' + total.toLocaleString('id-ID');
}

// NAVIGATION
function st(t) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('screen-' + t).classList.add('active');
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
    document.getElementById('n-' + t).classList.add('active');
    window.scrollTo(0,0);
}
function openModal(id) { document.getElementById(id).style.display='flex'; }
function closeModal(id) { document.getElementById(id).style.display='none'; }
async function simpanKas() { /* Sama seperti sebelumnya */ }
async function simpanIuran() { /* Sama seperti sebelumnya */ }
