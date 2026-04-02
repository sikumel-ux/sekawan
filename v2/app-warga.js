// CONFIG (Gunakan Milikmu)
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

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    loadBerita();
    renderUserHistory(); // Mock data bayar
});

async function loadData() {
    try {
        const [dkas, diur] = await Promise.all([
            db.collection("kas").get(), 
            db.collection("pembayaran").get()
        ]);
        
        let tIn = 0, tOut = 0, tIur = 0;
        let allTrx = [];
        const listR = document.getElementById('listRiwayat');

        const iuranArr = diur.docs.map(doc => doc.data());

        dkas.docs.forEach(doc => {
            const d = doc.data(); 
            const nom = Number(d.nom || 0);
            if(d.kat === 'Masuk') tIn += nom; else tOut += nom;
            
            // Filter 2 Bulan Terakhir (Maret & April 2026)
            const tglTrx = d.tgl.toDate();
            if(tglTrx.getMonth() >= 2 && tglTrx.getFullYear() === 2026) {
                allTrx.push({ ket: d.ket, nom: nom, kat: d.kat, tgl: tglTrx });
            }
        });

        iuranArr.forEach(d => {
            const nom = Number(d.nom || 0); tIur += nom;
            const tglIur = (d.tgl ? d.tgl.toDate() : new Date());
            if(tglIur.getMonth() >= 2 && tglIur.getFullYear() === 2026) {
                allTrx.push({ ket: `Iuran: ${d.nama || 'Warga'}`, nom: nom, kat: 'Masuk', tgl: tglIur });
            }
        });

        const saldoBersih = (tIn + tIur) - tOut;
        const fmt = (n) => 'Rp ' + n.toLocaleString('id-ID');

        document.getElementById('totalSaldoHome').innerText = fmt(saldoBersih);
        document.getElementById('totalSaldoKas').innerText = fmt(saldoBersih);
        document.getElementById('tMasuk').innerText = '+ ' + (tIn + tIur).toLocaleString();
        document.getElementById('tKeluar').innerText = '- ' + tOut.toLocaleString();

        if(listR) {
            listR.innerHTML = '';
            allTrx.sort((a,b) => b.tgl - a.tgl);
            allTrx.forEach(tx => {
                const isM = tx.kat === 'Masuk';
                listR.insertAdjacentHTML('beforeend', `
                    <div class="bg-white p-4 rounded-2xl flex justify-between items-center border border-slate-50 shadow-sm">
                        <div class="flex gap-3 items-center">
                            <div class="w-8 h-8 rounded-lg ${isM ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'} flex items-center justify-center text-[10px]"><i class="fa-solid ${isM ? 'fa-arrow-up' : 'fa-arrow-down'}"></i></div>
                            <div><p class="text-[10px] font-black uppercase text-slate-700 italic">${tx.ket}</p><p class="text-[8px] text-slate-400 font-bold uppercase">${tx.tgl.toLocaleDateString('id-ID')}</p></div>
                        </div>
                        <p class="font-black text-[10px] ${isM ? 'text-green-600' : 'text-red-500'}">${isM ? '+' : '-'} ${tx.nom.toLocaleString()}</p>
                    </div>
                `);
            });
        }
    } catch (err) { console.error(err); }
}

async function loadBerita() {
    const slider = document.getElementById('blogContainer');
    try {
        const snap = await db.collection("berita").orderBy("createdAt", "desc").get();
        if(slider) {
            slider.innerHTML = '';
            snap.forEach(doc => {
                const b = doc.data();
                const postData = JSON.stringify(b).replace(/"/g, '&quot;');
                slider.insertAdjacentHTML('beforeend', `
                    <div class="min-w-[220px] bg-white rounded-[28px] overflow-hidden border border-slate-100 shadow-lg shadow-slate-200/40" 
                         @click="selectedPost = ${postData}; showDetail = true">
                        <img src="${b.img}" class="w-full h-28 object-cover" />
                        <div class="p-4">
                            <h4 class="font-black text-[10px] uppercase text-slate-700 truncate italic">${b.judul}</h4>
                            <p class="text-[8px] text-slate-400 mt-2 font-bold italic uppercase tracking-tighter">Klik baca detail</p>
                        </div>
                    </div>
                `);
            });
        }
    } catch (err) { console.error(err); }
}

function renderUserHistory() {
    const container = document.getElementById('historyBayar');
    const months = [
        {m: 'Januari 2026', s: 'Lunas', c: 'text-emerald-500'},
        {m: 'Februari 2026', s: 'Lunas', c: 'text-emerald-500'},
        {m: 'Maret 2026', s: 'Lunas', c: 'text-emerald-500'},
        {m: 'April 2026', s: 'Belum Bayar', c: 'text-slate-300'}
    ];
    container.innerHTML = months.map(h => `
        <div class="flex justify-between items-center border-b border-slate-50 pb-3 last:border-0">
            <span class="text-[10px] font-black text-slate-600 uppercase italic">${h.m}</span>
            <span class="text-[9px] font-black uppercase ${h.c} italic tracking-widest">${h.s}</span>
        </div>
    `).reverse().join('');
            }
                        
