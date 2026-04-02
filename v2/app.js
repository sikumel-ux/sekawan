// CONFIGURATION
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

// INITIALIZE
document.addEventListener('DOMContentLoaded', () => {
    init();
});

function init() {
    const thr = document.getElementById('th-rekap');
    if(thr) {
        thr.innerHTML = '<th class="sticky-col p-4 bg-white text-slate-400">Nama</th>';
        daftarBulan.forEach(bln => {
            thr.innerHTML += `<th class="text-center p-3 text-slate-400">${bln.substring(0,3)}</th>`;
        });
    }
    loadData();
    loadBerita();
}

// MAIN DATA LOADER
async function loadData() {
    try {
        const [dkas, diur, dang] = await Promise.all([
            db.collection("kas").get(), 
            db.collection("pembayaran").get(), 
            db.collection("anggota").orderBy("nama","asc").get()
        ]);
        
        let tIn = 0, tOut = 0, tIur = 0;
        let totalsBln = {}; 
        daftarBulan.forEach(b => totalsBln[b] = 0);
        
        let allTrx = [];
        const ti = document.getElementById('tBodyWarga');
        const tr = document.getElementById('tb-rekap');
        const listR = document.getElementById('listRiwayat');
        
        if(ti) ti.innerHTML = ''; 
        if(tr) tr.innerHTML = ''; 
        if(listR) listR.innerHTML = '';

        const iuranArr = diur.docs.map(doc => ({id: doc.id, ...doc.data()}));

        // Kas Umum
        dkas.docs.forEach(doc => {
            const d = doc.data(); 
            const nom = Number(d.nom || 0);
            if(d.kat === 'Masuk') tIn += nom; else tOut += nom;
            allTrx.push({ ket: d.ket, nom: nom, kat: d.kat, tgl: d.tgl.toDate() });
        });

        // Iuran
        iuranArr.forEach(d => {
            const nom = Number(d.nom || 0); 
            tIur += nom;
            allTrx.push({ 
                ket: `Iuran: ${d.nama || 'Warga'}`, 
                nom: nom, kat: 'Masuk', 
                tgl: (d.tgl ? d.tgl.toDate() : new Date()) 
            });
        });

        // Dashboard Saldo
        const saldoBersih = (tIn + tIur) - tOut;
        document.getElementById('totalSaldo').innerText = 'Rp ' + saldoBersih.toLocaleString('id-ID');
        document.getElementById('totalMasuk').innerText = 'Rp ' + (tIn + tIur).toLocaleString('id-ID');
        document.getElementById('totalKeluar').innerText = 'Rp ' + tOut.toLocaleString('id-ID');

        // Histori List
        allTrx.sort((a,b) => b.tgl - a.tgl);
        allTrx.slice(0, 6).forEach(tx => {
            const isM = tx.kat === 'Masuk';
            listR.insertAdjacentHTML('beforeend', `
                <div class="bg-white p-4 rounded-2xl flex justify-between items-center border border-slate-50">
                    <div class="flex gap-3 items-center">
                        <div class="w-8 h-8 rounded-lg ${isM ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'} flex items-center justify-center font-extrabold text-[9px]">
                            ${isM ? 'IN' : 'OUT'}
                        </div>
                        <div class="truncate max-w-[140px]">
                            <p class="text-[11px] font-bold text-slate-700 truncate uppercase tracking-tighter">${tx.ket}</p>
                            <p class="text-[9px] text-slate-400 font-bold tracking-widest">${tx.tgl.toLocaleDateString('id-ID')}</p>
                        </div>
                    </div>
                    <p class="font-extrabold text-[11px] ${isM ? 'text-emerald-700' : 'text-red-500'}">
                        ${isM ? '+' : '-'} ${tx.nom.toLocaleString()}
                    </p>
                </div>
            `);
        });

        // Warga & Table
        dang.docs.forEach(doc => {
            const d = doc.data(); 
            const n = (d.nama || "").trim().toUpperCase();
            
            if(ti) {
                ti.insertAdjacentHTML('beforeend', `
                    <div class="bg-white p-4 rounded-2xl flex justify-between items-center border border-slate-100 active:scale-95 transition-all">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center border border-slate-50"><i class="fa-solid fa-user text-xs"></i></div>
                            <div>
                                <p class="font-extrabold text-xs text-slate-700 truncate w-40">${n}</p>
                                <p class="text-[9px] text-slate-400 font-bold uppercase italic">${d.hp || '-'}</p>
                            </div>
                        </div>
                        <i class="fa-solid fa-angle-right text-slate-200"></i>
                    </div>
                `);
            }

            if(tr) {
                let row = `<tr><td class="sticky-col p-4 font-bold text-slate-700 border-b border-slate-50 uppercase text-[10px]">${n}</td>`;
                daftarBulan.forEach(bln => {
                    const lunas = iuranArr.filter(k => (k.nama || "").toUpperCase() === n && (k.bulan || "").includes(bln));
                    if(lunas.length > 0) {
                        let nomBln = 0; 
                        lunas.forEach(l => nomBln += (Number(l.nom) / (l.bulan || "").split(',').length));
                        row += `<td class="text-center text-emerald-600 border-b border-slate-50">${(nomBln/1000).toFixed(0)}K</td>`;
                        totalsBln[bln] += nomBln;
                    } else { 
                        row += `<td class="text-center text-slate-200 border-b border-slate-50">-</td>`; 
                    }
                });
                tr.insertAdjacentHTML('beforeend', row + `</tr>`);
            }
        });

        const tf = document.getElementById('tf-rekap');
        if(tf) {
            let frow = `<tr class="bg-emerald-50"><td class="sticky-col p-4 font-extrabold text-emerald-900 uppercase bg-emerald-50">TOTAL</td>`;
            daftarBulan.forEach(bln => {
                frow += `<td class="text-center p-4 text-emerald-800 font-extrabold">${(totalsBln[bln]/1000).toFixed(0)}K</td>`;
            });
            tf.innerHTML = frow + `</tr>`;
        }

    } catch (err) { console.error("Data Load Failed:", err); }
}

// NEWS LOGIC
async function loadBerita() {
    const listB = document.getElementById('listAdminBerita');
    if(!listB) return;
    
    try {
        const snap = await db.collection("berita").orderBy("createdAt", "desc").get();
        listB.innerHTML = '';
        snap.forEach(doc => {
            const b = doc.data();
            listB.insertAdjacentHTML('beforeend', `
                <div class="bg-white p-3 rounded-[24px] border border-slate-100 flex gap-4 items-center shadow-sm">
                    <img src="${b.img}" class="w-16 h-16 rounded-2xl object-cover shrink-0">
                    <div class="flex-1 min-w-0">
                        <h5 class="text-[11px] font-bold truncate uppercase text-slate-700">${b.judul}</h5>
                        <p class="text-[9px] text-slate-400 font-bold uppercase italic">${b.tgl}</p>
                    </div>
                    <button onclick="deleteNews('${doc.id}')" class="text-red-200 p-2"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            `);
        });
    } catch (err) { console.error(err); }
}

async function saveNews() {
    const judul = document.getElementById('newsTitle').value;
    const img = document.getElementById('newsImg').value || 'https://images.unsplash.com/photo-1542601906990-b4d3fb773b09?w=400';
    const tglRaw = document.getElementById('newsDate').value;
    
    if(!judul || !tglRaw) return alert("Lengkapi judul & tanggal, bro!");
    
    const d = new Date(tglRaw);
    const tgl = `${String(d.getDate()).padStart(2,'0')} - ${String(d.getMonth()+1).padStart(2,'0')} - ${d.getFullYear()}`;

    try {
        document.getElementById('btnSaveNews').innerText = "Wait...";
        await db.collection("berita").add({ judul, img, tgl, createdAt: new Date() });
        document.getElementById('newsTitle').value = '';
        document.getElementById('newsImg').value = '';
        document.getElementById('btnSaveNews').innerText = "Posting";
        loadBerita();
    } catch (err) { alert(err); }
}

async function deleteNews(id) {
    if(confirm("Hapus berita?")) {
        await db.collection("berita").doc(id).delete();
        loadBerita();
    }
}

// TAB NAVIGATION
function st(t) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('screen-' + t).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('n-' + t).classList.add('active');
    window.scrollTo(0, 0);
}
