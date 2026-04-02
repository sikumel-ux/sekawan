// Konfigurasi Firebase (Gunakan milikmu)
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

// Jalankan saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    loadBeritaWarga(); // Tambahan untuk slider berita
});

async function loadData() {
    try {
        // Ambil data (Logika asli kamu)
        const [dkas, diur] = await Promise.all([
            db.collection("kas").get(), 
            db.collection("pembayaran").get()
        ]);
        
        let tIn = 0, tOut = 0, tIur = 0;
        let allTrx = [];
        const listR = document.getElementById('listRiwayat');
        
        if(listR) listR.innerHTML = '';

        const iuranArr = diur.docs.map(doc => ({id: doc.id, ...doc.data()}));

        // Olah Kas Umum (Sesuai JS kamu)
        dkas.docs.forEach(doc => {
            const d = doc.data(); 
            const nom = Number(d.nom || 0);
            if(d.kat === 'Masuk') tIn += nom; else tOut += nom;
            allTrx.push({ 
                ket: d.ket, 
                nom: nom, 
                kat: d.kat, 
                tgl: (d.tgl && d.tgl.toDate ? d.tgl.toDate() : new Date()) 
            });
        });

        // Olah Iuran Warga (Sesuai JS kamu)
        iuranArr.forEach(d => {
            const nom = Number(d.nom || 0); 
            tIur += nom;
            allTrx.push({ 
                ket: `Iuran: ${d.nama || 'WARGA'}`, 
                nom: nom, 
                kat: 'Masuk', 
                tgl: (d.tgl && d.tgl.toDate ? d.tgl.toDate() : new Date()) 
            });
        });

        // HITUNG SALDO (Logika asli kamu)
        const saldoBersih = (tIn + tIur) - tOut;

        // UPDATE UI (Pastikan ID di index.html cocok)
        // Kita pakai .toLocaleString agar format ribuan muncul otomatis
        if(document.getElementById('totalSaldo')) {
            document.getElementById('totalSaldo').innerText = 'Rp ' + saldoBersih.toLocaleString('id-ID');
        }
        if(document.getElementById('totalMasuk')) {
            document.getElementById('totalMasuk').innerText = '+ ' + (tIn + tIur).toLocaleString('id-ID');
        }
        if(document.getElementById('totalKeluar')) {
            document.getElementById('totalKeluar').innerText = '- ' + tOut.toLocaleString('id-ID');
        }

        // TAMPILKAN HISTORI DI TAB KAS
        if(listR) {
            allTrx.sort((a,b) => b.tgl - a.tgl);
            allTrx.forEach(tx => {
                const isM = tx.kat === 'Masuk';
                listR.insertAdjacentHTML('beforeend', `
                    <div class="bg-white p-5 rounded-2xl flex justify-between items-center border border-slate-50 shadow-sm">
                        <div class="flex gap-4 items-center">
                            <div class="w-10 h-10 rounded-xl ${isM ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'} flex items-center justify-center font-bold text-xs shrink-0">
                                <i class="fa-solid ${isM ? 'fa-arrow-up' : 'fa-arrow-down'}"></i>
                            </div>
                            <div>
                                <p class="text-[11px] font-extrabold text-slate-700 uppercase tracking-tighter leading-none mb-1">${tx.ket}</p>
                                <p class="text-[9px] text-slate-400 font-bold">${tx.tgl.toLocaleDateString('id-ID')}</p>
                            </div>
                        </div>
                        <p class="font-extrabold text-[11px] ${isM ? 'text-green-600' : 'text-red-500'}">
                            ${isM ? '+' : '-'} ${tx.nom.toLocaleString()}
                        </p>
                    </div>
                `);
            });
        }

    } catch (err) {
        console.error("Error Load Data: ", err);
    }
}

// FUNGSI UNTUK SLIDER BERITA (Tetap pakai yang dinamis)
async function loadBeritaWarga() {
    const slider = document.getElementById('newsSlider');
    if(!slider) return;
    try {
        const snap = await db.collection("berita").orderBy("createdAt", "desc").limit(5).get();
        if(snap.empty) {
            slider.innerHTML = '<p class="text-[10px] text-slate-400 italic">Belum ada kegiatan.</p>';
            return;
        }
        slider.innerHTML = '';
        snap.forEach(doc => {
            const b = doc.data();
            slider.insertAdjacentHTML('beforeend', `
                <div class="min-w-[280px] bg-white rounded-[28px] overflow-hidden border border-slate-100 shadow-sm">
                    <img src="${b.img}" class="w-full h-32 object-cover bg-slate-50" />
                    <div class="p-4">
                        <h4 class="font-extrabold text-[11px] uppercase text-slate-700 truncate">${b.judul}</h4>
                        <p class="text-[9px] text-slate-400 mt-2 font-bold italic uppercase tracking-widest">${b.tgl}</p>
                    </div>
                </div>
            `);
        });
    } catch (err) { console.error(err); }
}
