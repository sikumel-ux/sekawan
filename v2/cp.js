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

// AUTHENTICATION
auth.onAuthStateChanged(user => {
    if (user) { 
        document.getElementById('mainApp').classList.remove('hidden'); 
        document.getElementById('loginPage').classList.add('hidden'); 
        init(); 
    } else { 
        document.getElementById('mainApp').classList.add('hidden'); 
        document.getElementById('loginPage').classList.remove('hidden'); 
    }
});

async function login() {
    const e = document.getElementById('email').value, p = document.getElementById('pass').value;
    try { await auth.signInWithEmailAndPassword(e, p); } catch(err) { alert("Login Gagal!"); }
}

async function logout() { if(confirm("Keluar dari Control Panel?")) await auth.signOut(); }

// INITIALIZE APP
function init() {
    const today = new Date().toISOString().split('T')[0];
    ['iTgl', 'kTgl', 'bTgl'].forEach(id => { if(document.getElementById(id)) document.getElementById(id).value = today; });
    
    const grid = document.getElementById('gridBulan');
    const thr = document.getElementById('th-rekap');
    if(grid && thr) {
        grid.innerHTML = ''; thr.innerHTML = '<th class="sticky-col p-4 bg-white shadow-sm">NAMA</th>';
        daftarBulan.forEach(bln => {
            grid.innerHTML += `<label class="relative block"><input type="checkbox" name="blnCek" value="${bln}" class="hidden peer"><div class="cursor-pointer text-[9px] font-black py-3 text-center border rounded-xl bg-white text-slate-300 peer-checked:bg-primary peer-checked:text-white uppercase transition-all shadow-sm">${bln.substring(0,3)}</div></label>`;
            thr.innerHTML += `<th>${bln.substring(0,3)}</th>`;
        });
    }
    loadData();
    loadBeritaAdmin();
}

// LOAD FIREBASE DATA
async function loadData() {
    try {
        const [dkas, diur, dang] = await Promise.all([
            db.collection("kas").get(), 
            db.collection("pembayaran").get(), 
            db.collection("anggota").orderBy("nama","asc").get()
        ]);
        
        let tIn=0, tOut=0, tIur=0;
        let totalsBln = {}; daftarBulan.forEach(b => totalsBln[b] = 0);
        let allTrx = [];
        
        const ti=document.getElementById('tBodyWarga'), tr=document.getElementById('tb-rekap'), sel=document.getElementById('iNama'), listR = document.getElementById('listRiwayat');
        if(ti) ti.innerHTML=''; if(tr) tr.innerHTML=''; if(sel) sel.innerHTML='<option value="">Pilih Warga</option>'; if(listR) listR.innerHTML='';
        
        const iuranArr = diur.docs.map(doc => ({id: doc.id, ...doc.data()}));

        dkas.docs.forEach(doc => {
            const d = doc.data(); const nom = Number(d.nom || 0);
            if(d.kat==='Masuk') tIn+=nom; else tOut+=nom;
            allTrx.push({ id: doc.id, col: 'kas', ket: d.ket, nom: nom, kat: d.kat, tgl: d.tgl.toDate() });
        });

        iuranArr.forEach(d => {
            const nom = Number(d.nom || 0); tIur += nom;
            allTrx.push({ id: d.id, col: 'pembayaran', ket: `IURAN: ${(d.nama||'').split(' ')[0]}`, nom: nom, kat: 'Masuk', tgl: (d.tgl?d.tgl.toDate():new Date()) });
        });

        document.getElementById('totalSaldo').innerText = 'Rp ' + ((tIn + tIur) - tOut).toLocaleString('id-ID');
        document.getElementById('totalMasuk').innerText = 'Rp ' + (tIn + tIur).toLocaleString('id-ID');
        document.getElementById('totalKeluar').innerText = 'Rp ' + tOut.toLocaleString('id-ID');

        // Render Riwayat
        const s = document.getElementById('fStart').value ? new Date(document.getElementById('fStart').value) : null;
        const e = document.getElementById('fEnd').value ? new Date(document.getElementById('fEnd').value) : null;
        if(e) e.setHours(23,59,59);

        allTrx.sort((a,b) => b.tgl - a.tgl).filter(tx => {
            if(!s && !e) return true;
            if(s && tx.tgl < s) return false;
            if(e && tx.tgl > e) return false;
            return true;
        }).forEach(tx => {
            const isM = tx.kat === 'Masuk';
            listR.insertAdjacentHTML('beforeend', `
                <div class="bg-white p-4 rounded-2xl flex justify-between items-center border border-slate-50 shadow-sm">
                    <div class="flex gap-3 items-center">
                        <div class="w-8 h-8 rounded-lg ${isM?'bg-emerald-50 text-emerald-600':'bg-red-50 text-red-600'} flex items-center justify-center font-black text-[9px] italic">${isM?'IN':'OUT'}</div>
                        <div><p class="text-[10px] font-black uppercase text-slate-700 italic">${tx.ket}</p><p class="text-[8px] text-slate-300 font-bold">${tx.tgl.toLocaleDateString('id-ID')}</p></div>
                    </div>
                    <div class="flex items-center gap-4">
                        <p class="font-black text-[10px] ${isM?'text-emerald-700':'text-red-600'} italic">${isM?'+':'-'} ${tx.nom.toLocaleString()}</p>
                        <button onclick="hapus('${tx.col}','${tx.id}')" class="text-slate-200 hover:text-red-400 transition-colors"><span class="material-symbols-rounded text-sm">delete</span></button>
                    </div>
                </div>
            `);
        });

        // Render Rekap & Master
        dang.docs.forEach(doc => {
            const d = doc.data(); const n = (d.nama || "").trim().toUpperCase();
            dataWarga[n] = d.hp || '';
            if(sel) sel.insertAdjacentHTML('beforeend', `<option value="${n}">${n}</option>`);
            if(ti) ti.insertAdjacentHTML('beforeend', `<div class="bg-white p-4 rounded-2xl flex justify-between items-center border border-slate-100 shadow-sm"><div><p class="font-black text-xs uppercase text-slate-700 italic">${n}</p><p class="text-[9px] text-slate-400 font-bold">${d.hp || '-'}</p></div><button onclick="hapus('anggota','${doc.id}')" class="text-red-100 hover:text-red-500"><span class="material-symbols-rounded">delete</span></button></div>`);

            let row = `<tr><td class="sticky-col font-bold text-slate-700 bg-white uppercase">${n.split(' ')[0]}</td>`;
            daftarBulan.forEach(bln => {
                const lunas = iuranArr.filter(k => (k.nama||"").toUpperCase() === n && (k.bulan||"").includes(bln));
                if(lunas.length > 0) {
                    let nomBln = 0; lunas.forEach(l => nomBln += (Number(l.nom) / (l.bulan||"").split(',').length));
                    row += `<td class="text-center text-emerald-600 font-black italic">${(nomBln/1000).toFixed(0)}K</td>`;
                    totalsBln[bln] += nomBln;
                } else { row += `<td class="text-center text-slate-100">-</td>`; }
            });
            if(tr) tr.insertAdjacentHTML('beforeend', row + `</tr>`);
        });

        let frow = `<tr class="bg-emerald-900 text-white"><td class="sticky-col p-4 font-black bg-emerald-900 uppercase">TOTAL</td>`;
        daftarBulan.forEach(bln => frow += `<td class="text-center p-4 font-black italic">${(totalsBln[bln]/1000).toFixed(0)}K</td>`);
        if(document.getElementById('tf-rekap')) document.getElementById('tf-rekap').innerHTML = frow + `</tr>`;

    } catch (e) { console.error(e); }
}

// LOGIC SIMPAN
async function simpanIuran() {
    const n = document.getElementById('iNama').value, nmn = Number(document.getElementById('iNom').value), tglVal = document.getElementById('iTgl').value;
    const blns = Array.from(document.querySelectorAll('input[name="blnCek"]:checked')).map(c => c.value);
    if(!n || !nmn || blns.length === 0 || !tglVal) return alert("Lengkapi data!");
    
    const kodeUnik = "T-" + Math.floor(100000 + Math.random() * 900000); 
    await db.collection("pembayaran").doc(kodeUnik).set({ nama: n, bulan: blns.join(","), nom: nmn, tgl: new Date(tglVal), kode: kodeUnik }); 
    
    alert("Iuran Disimpan!");
    const hp = (dataWarga[n]||'').replace(/^0/,'62');
    const path = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
    const msg = `Halo, pak/bu *${n}*..%0APembayaran Anda telah kami terima dengan no referensi *${kodeUnik}*.%0ACek kuitansi: ${window.location.origin + path}kuitansi.html?id=${kodeUnik}`;
    window.open(`https://wa.me/${hp}?text=${msg}`);
    loadData();
}

async function simpanBerita() {
    const j = document.getElementById('bJudul').value.toUpperCase(), img = document.getElementById('bImg').value, isi = document.getElementById('bIsi').value, tRaw = document.getElementById('bTgl').value;
    if(!j || !img || !isi || !tRaw) return alert("Lengkapi berita!");
    const d = new Date(tRaw);
    const tFmt = `${d.getDate().toString().padStart(2, '0')} - ${(d.getMonth()+1).toString().padStart(2, '0')} - ${d.getFullYear()}`;
    await db.collection("berita").add({ judul: j, img: img, isi: isi, tgl: tFmt, createdAt: new Date(tRaw) });
    alert("Berita Publish!");
    loadBeritaAdmin();
}

async function loadBeritaAdmin() {
    const listB = document.getElementById('listBeritaAdmin');
    if(!listB) return;
    const snap = await db.collection("berita").orderBy("createdAt", "desc").get();
    listB.innerHTML = '';
    snap.forEach(doc => {
        const b = doc.data();
        listB.insertAdjacentHTML('beforeend', `<div class="bg-white p-4 rounded-2xl flex justify-between items-center border border-slate-100 shadow-sm"><div class="flex gap-3 items-center"><img src="${b.img}" class="w-10 h-10 rounded-lg object-cover"><p class="text-[10px] font-black uppercase text-slate-700 italic truncate max-w-[120px]">${b.judul}</p></div><button onclick="hapus('berita','${doc.id}')" class="text-red-100 hover:text-red-400"><span class="material-symbols-rounded text-sm">delete</span></button></div>`);
    });
}

async function simpanKas() {
    const tgl = document.getElementById('kTgl').value, kat = document.getElementById('kKat').value, ket = document.getElementById('kKet').value.toUpperCase(), nom = Number(document.getElementById('kNom').value);
    await db.collection("kas").add({ kat, ket, nom, tgl: new Date(tgl) });
    alert("Kas Disimpan!"); loadData();
}

async function simpanAnggota() {
    const n = document.getElementById('aNama').value.trim().toUpperCase(), h = document.getElementById('aHp').value;
    if(n) { await db.collection("anggota").add({ nama: n, hp: h }); alert("Warga Ditambah!"); loadData(); }
}

async function hapus(c, id) { if(confirm("Hapus data ini?")) { await db.collection(c).doc(id).delete(); loadData(); loadBeritaAdmin(); } }

function st(t) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('screen-'+t).classList.add('active');
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
    document.getElementById('n-'+t).classList.add('active');
}
