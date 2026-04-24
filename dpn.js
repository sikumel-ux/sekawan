// Config Firebase
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

document.addEventListener('DOMContentLoaded', () => { init(); });

function init() {
    loadData();
}

async function loadData() {
    try {
        const [dkas, diur, dang] = await Promise.all([
            db.collection("kas").get(), 
            db.collection("pembayaran").get(), 
            db.collection("anggota").orderBy("nama","asc").get()
        ]);
        
        let tIn = 0, tOut = 0, tIur = 0;
        let allTrx = [];
        const iuranArr = diur.docs.map(doc => ({id: doc.id, ...doc.data()}));

        // Olah Kas
        dkas.docs.forEach(doc => {
            const d = doc.data(); 
            const nom = Number(d.nom || 0);
            if(d.kat === 'Masuk') tIn += nom; else tOut += nom;
            allTrx.push({ 
                ket: d.ket || 'Tanpa Keterangan', nom: nom, kat: d.kat, 
                tgl: (d.tgl ? d.tgl.toDate() : new Date()) 
            });
        });

        // Olah Iuran
        iuranArr.forEach(d => {
            const nom = Number(d.nom || 0); 
            tIur += nom;
            allTrx.push({ 
                ket: `Iuran: ${d.nama || 'WARGA'}`, nom: nom, kat: 'Masuk', 
                tgl: (d.tgl ? d.tgl.toDate() : new Date()) 
            });
        });

        // Dashboard Update
        const totalSaldoEl = document.getElementById('totalSaldo');
        const totalMasukEl = document.getElementById('totalMasuk');
        const totalKeluarEl = document.getElementById('totalKeluar');

        if(totalSaldoEl) totalSaldoEl.innerText = 'Rp ' + ((tIn + tIur) - tOut).toLocaleString('id-ID');
        if(totalMasukEl) totalMasukEl.innerText = 'Rp ' + (tIn + tIur).toLocaleString('id-ID');
        if(totalKeluarEl) totalKeluarEl.innerText = 'Rp ' + tOut.toLocaleString('id-ID');

        // Render Riwayat Lengkap (Tab Riwayat)
        allTrx.sort((a,b) => b.tgl - a.tgl);
        let htmlFull = "";
        
        allTrx.forEach((tx) => {
            const isM = tx.kat === 'Masuk';
            htmlFull += `
                <div class="bg-white p-4 rounded-2xl flex justify-between items-center border border-slate-50 shadow-sm">
                    <div class="flex gap-3 items-center">
                        <div class="w-8 h-8 rounded-lg ${isM ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'} flex items-center justify-center font-bold text-[10px]">
                            ${isM ? 'IN' : 'OUT'}
                        </div>
                        <div>
                            <p class="text-[11px] font-bold uppercase text-slate-700 leading-tight">${tx.ket}</p>
                            <p class="text-[9px] text-slate-400 mt-1">${tx.tgl.toLocaleDateString('id-ID')}</p>
                        </div>
                    </div>
                    <p class="font-bold text-[11px] ${isM ? 'text-emerald-700' : 'text-red-600'}">
                        ${isM ? '+' : '-'} ${tx.nom.toLocaleString()}
                    </p>
                </div>`;
        });
        
        const listHistoryLengkap = document.getElementById('listRiwayatLengkap');
        if(listHistoryLengkap) listHistoryLengkap.innerHTML = htmlFull;

        // Render Anggota (Tab Anggota)
        let htmlAnggota = "";
        dang.docs.forEach(doc => {
            const d = doc.data(); 
            const n = (d.nama || "").trim().toUpperCase();
            htmlAnggota += `
                <div class="bg-white p-4 rounded-2xl flex justify-between items-center border border-slate-100 shadow-sm">
                    <p class="font-bold text-xs text-slate-700 uppercase">${n}</p>
                    <div class="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
                        <i class="fa-solid fa-user text-[10px]"></i>
                    </div>
                </div>`;
        });
        
        const tBodyWarga = document.getElementById('tBodyWarga');
        if(tBodyWarga) tBodyWarga.innerHTML = htmlAnggota;

    } catch (err) { 
        console.error("Error loading data: ", err); 
    }
}

// Fungsi Navigasi Tab
function st(t) {
    const screens = ['home', 'history', 'warga'];
    
    screens.forEach(s => {
        const el = document.getElementById('screen-' + s);
        const btn = document.getElementById('n-' + s);
        if(el) el.classList.remove('active');
        if(btn) btn.classList.remove('active');
    });

    const targetScreen = document.getElementById('screen-' + t);
    const targetBtn = document.getElementById('n-' + t);
    
    if(targetScreen) targetScreen.classList.add('active');
    if(targetBtn) targetBtn.classList.add('active');
    
    window.scrollTo(0, 0);
}
