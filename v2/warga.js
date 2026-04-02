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

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    loadBeritaWarga();
});

// LOAD KEUANGAN & RIWAYAT
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
        document.getElementById('totalMasuk').innerText = '+ ' + (tIn + tIur).toLocaleString('id-ID');
        document.getElementById('totalKeluar').innerText = '- ' + tOut.toLocaleString('id-ID');

        // Tampilkan Riwayat
        if(listR) {
            listR.innerHTML = '';
            allTrx.sort((a,b) => b.tgl - a.tgl);
            allTrx.forEach(tx => {
                const isM = tx.kat === 'Masuk';
                listR.insertAdjacentHTML('beforeend', `
                    <div class="bg-white p-5 rounded-2xl flex justify-between items-center border border-slate-50 shadow-sm">
                        <div class="flex gap-4 items-center">
                            <div class="w-10 h-10 rounded-xl ${isM ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'} flex items-center justify-center font-bold text-xs shrink-0">
                                <i class="fa-solid ${isM ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}"></i>
                            </div>
                            <div>
                                <p class="text-xs font-extrabold text-slate-700 uppercase tracking-tighter">${tx.ket}</p>
                                <p class="text-[9px] text-slate-400 font-bold">${tx.tgl.toLocaleDateString('id-ID')}</p>
                            </div>
                        </div>
                        <p class="font-extrabold text-xs ${isM ? 'text-green-600' : 'text-red-500'}">
                            ${isM ? '+' : '-'} ${tx.nom.toLocaleString()}
                        </p>
                    </div>
                `);
            });
        }
    } catch (err) { console.error(err); }
}

// LOAD BERITA DARI ADMIN
async function loadBeritaWarga() {
    const slider = document.getElementById('newsSlider');
    try {
        const snap = await db.collection("berita").orderBy("createdAt", "desc").get();
        if(snap.empty) {
            slider.innerHTML = '<p class="text-[10px] text-slate-400 italic">Belum ada kegiatan terbaru.</p>';
            return;
        }
        
        slider.innerHTML = '';
        snap.forEach(doc => {
            const b = doc.data();
            slider.insertAdjacentHTML('beforeend', `
                <div class="min-w-[280px] bg-white rounded-[28px] overflow-hidden border border-slate-100 shadow-sm active:scale-95 transition-transform">
                    <img src="${b.img}" class="w-full h-32 object-cover bg-slate-100" />
                    <div class="p-4">
                        <h4 class="font-extrabold text-xs uppercase text-slate-700 truncate">${b.judul}</h4>
                        <p class="text-[10px] text-slate-400 mt-2 font-bold italic">${b.tgl} • RT 04 Area</p>
                    </div>
                </div>
            `);
        });
    } catch (err) { console.error(err); }
}
