const config = {
    apiKey: "AIzaSyDjxOJZeiLHaxoaS3-hVdbIGfIXCfCT2Is",
    authDomain: "tuntas-sekawan.firebaseapp.com",
    projectId: "tuntas-sekawan",
    storageBucket: "tuntas-sekawan.firebasestorage.app",
    messagingSenderId: "1090506516563",
    appId: "1:1090506516563:web:63c429677caea28addfea6"
};

firebase.initializeApp(config);
const db = firebase.firestore(), auth = firebase.auth();
const daftarBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni"];
let dataWarga = {};

auth.onAuthStateChanged(user => {
    if (user) { document.getElementById('mainApp').classList.remove('hidden'); document.getElementById('loginPage').classList.add('hidden'); init(); } 
    else { document.getElementById('mainApp').classList.add('hidden'); document.getElementById('loginPage').classList.remove('hidden'); }
});

async function login() {
    const e = document.getElementById('email').value, p = document.getElementById('pass').value;
    try { await auth.signInWithEmailAndPassword(e, p); } catch(err) { alert("Gagal!"); }
}

async function logout() { if(confirm("Keluar?")) await auth.signOut(); }

function init() {
    const grid = document.getElementById('gridBulan');
    const thr = document.getElementById('th-rekap');
    grid.innerHTML = ''; thr.innerHTML = '<th class="sticky-col p-4 bg-white">Nama</th>';
    daftarBulan.forEach(bln => {
        grid.innerHTML += `<label class="relative block"><input type="checkbox" name="blnCek" value="${bln}" class="hidden peer"><div class="cursor-pointer text-[9px] font-black py-3 text-center border rounded-xl bg-white text-slate-300 peer-checked:bg-emerald-900 peer-checked:text-white uppercase transition-all">${bln.substring(0,3)}</div></label>`;
        thr.innerHTML += `<th class="text-center p-3 font-bold text-slate-400">${bln.substring(0,3)}</th>`;
    });
    loadData();
}

async function loadData() {
    const [dkas, diur, dang] = await Promise.all([
        db.collection("kas").get(), 
        db.collection("pembayaran").get(), 
        db.collection("anggota").orderBy("nama","asc").get()
    ]);
    
    let tIn=0, tOut=0, tIur=0;
    let totalsBln = {}; daftarBulan.forEach(b => totalsBln[b] = 0);
    let allTrx = [];
    
    const ti=document.getElementById('tBodyWarga'), tr=document.getElementById('tb-rekap'), sel=document.getElementById('iNama'), listR = document.getElementById('listRiwayat');
    ti.innerHTML=''; tr.innerHTML=''; sel.innerHTML='<option value="">Pilih Warga</option>'; listR.innerHTML='';
    const iuranArr = diur.docs.map(doc => ({id: doc.id, ...doc.data()}));

    dkas.docs.forEach(doc => {
        const d = doc.data(); const nom = Number(d.nom || 0);
        if(d.kat==='Masuk') tIn+=nom; else tOut+=nom;
        allTrx.push({ id: doc.id, col: 'kas', ket: d.ket, nom: nom, kat: d.kat, tgl: d.tgl.toDate() });
    });

    iuranArr.forEach(d => {
        const nom = Number(d.nom || 0); tIur += nom;
        // PERBAIKAN: Nama Lengkap
        allTrx.push({ id: d.id, col: 'pembayaran', ket: `IURAN: ${d.nama || ''}`, nom: nom, kat: 'Masuk', tgl: (d.tgl?d.tgl.toDate():new Date()) });
    });

    document.getElementById('totalSaldo').innerText = 'Rp ' + ((tIn + tIur) - tOut).toLocaleString('id-ID');
    allTrx.sort((a,b) => b.tgl - a.tgl).slice(0,10).forEach(tx => {
        const isM = tx.kat === 'Masuk';
        listR.insertAdjacentHTML('beforeend', `<div class="bg-white p-4 rounded-2xl flex justify-between items-center border border-slate-50 shadow-sm"><div class="flex gap-3 items-center"><div class="w-8 h-8 rounded-lg ${isM?'bg-emerald-50 text-emerald-600':'bg-red-50 text-red-600'} flex items-center justify-center font-black text-[9px]">${isM?'IN':'OUT'}</div><div><p class="text-xs font-black uppercase text-slate-700">${tx.ket}</p><p class="text-[8px] text-slate-300">${tx.tgl.toLocaleDateString('id-ID')}</p></div></div><p class="font-black text-xs ${isM?'text-emerald-700':'text-red-600'}">${isM?'+':'-'} ${tx.nom.toLocaleString()}</p></div>`);
    });

    dang.docs.forEach(doc => {
        const d = doc.data(); const n = (d.nama || "").trim().toUpperCase();
        dataWarga[n] = d.hp || '';
        sel.insertAdjacentHTML('beforeend', `<option value="${n}">${n}</option>`);
        
        ti.insertAdjacentHTML('beforeend', `<div class="bg-white p-4 rounded-2xl flex justify-between items-center border border-slate-100 shadow-sm"><div><p class="font-black text-xs uppercase text-slate-700">${n}</p><p class="text-[9px] text-slate-400">${d.hp || '-'}</p></div><button onclick="bukaEditWarga('${doc.id}', '${n}', '${d.hp || ''}')" class="text-emerald-600"><span class="material-symbols-rounded">edit</span></button></div>`);

        // PERBAIKAN: Nama Lengkap di Tabel
        let row = `<tr><td class="sticky-col p-4 font-bold text-slate-700 bg-white border-b border-slate-50 uppercase text-[10px]">${n}</td>`;
        daftarBulan.forEach(bln => {
            const lunas = iuranArr.filter(k => (k.nama||"").toUpperCase() === n && (k.bulan||"").includes(bln));
            if(lunas.length > 0) {
                let nomBln = 0; lunas.forEach(l => nomBln += (Number(l.nom) / (l.bulan||"").split(',').length));
                row += `<td class="text-center text-emerald-600 font-black">${(nomBln/1000).toFixed(0)}K</td>`;
                totalsBln[bln] += nomBln;
            } else { row += `<td class="text-center text-slate-200">-</td>`; }
        });
        tr.insertAdjacentHTML('beforeend', row + `</tr>`);
    });
}

function bukaEditWarga(id, nama, hp) { document.getElementById('eId').value = id; document.getElementById('eNama').value = nama; document.getElementById('eHp').value = hp; openModal('mEditWarga'); }
async function updateAnggota() {
    const id = document.getElementById('eId').value, n = document.getElementById('eNama').value.trim().toUpperCase(), h = document.getElementById('eHp').value;
    await db.collection("anggota").doc(id).update({ nama: n, hp: h }); closeModal('mEditWarga'); loadData();
}

function st(t) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('screen-'+t).classList.add('active');
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
    if(document.getElementById('n-'+t)) document.getElementById('n-'+t).classList.add('active');
}
function openModal(id) { document.getElementById(id).style.display='flex'; }
function closeModal(id) { document.getElementById(id).style.display='none'; }
