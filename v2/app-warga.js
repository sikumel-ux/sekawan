// CONFIGURATION (Firebase)
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

// INITIALIZE
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    loadBeritaWarga();
});

// LOGIKA UTAMA LOAD DATA KAS (SESUAI JS ASLIMU)
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

        // 1. Olah Kas Umum
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

        // 2. Olah Iuran Warga
        iuranArr.forEach(d => {
            const nom = Number(d.nom || 0); 
            tIur += nom;
            allTrx.push({ 
                ket: `Iuran: ${d.nama || 'Warga'}`, 
                nom: nom, 
                kat: 'Masuk', 
                tgl: (d.tgl && d.tgl.toDate ? d.tgl.toDate() : new Date()) 
            });
        });

        // 3. Update Dashboard Saldo (Logika aslimu)
        const saldoBersih = (tIn + tIur) - tOut;
        
        if(document.getElementById('totalSaldo')) {
            document.getElementById('totalSaldo').innerText = 'Rp ' + saldoBersih.toLocaleString('id-ID');
        }
        if(document.getElementById('totalMasuk')) {
            document.getElementById('totalMasuk').innerText = '+ ' + (tIn + tIur).toLocaleString('id-ID');
        }
        if(document.getElementById('totalKeluar')) {
            document.getElementById('totalKeluar').innerText = '- ' + tOut.toLocaleString('id-ID');
        }

        // 4. Render Histori Lengkap di Tab Kas
        if(listR) {
            listR.innerHTML = '';
            allTrx.sort((a,b) => b.tgl - a.tgl);
            allTrx.forEach(tx => {
                const isM = tx.kat === 'Masuk';
                listR.insertAdjacentHTML('beforeend', `
                    <div class="bg-white p-5 rounded-2xl flex justify-between items-center border border-slate-50 shadow-sm active:scale-95 transition-all">
                        <div class="flex gap-4 items-center">
                            <div class="w-10 h-10 rounded-xl ${isM ? 'bg-emerald-50 text-primary' : 'bg-red-50 text-red-500'} flex items-center justify-center shrink-0">
                                <i class="fa-solid ${isM ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'} text-xs"></i>
                            </div>
                            <div>
                                <p class="text-[11px] font-black text-slate-700 uppercase tracking-tighter leading-none mb-1.5">${tx.ket}</p>
                                <p class="text-[9px] text-slate-400 font-bold uppercase italic">${tx.tgl.toLocaleDateString('id-ID')}</p>
                            </div>
                        </div>
                        <p class="font-extrabold text-[11px] ${isM ? 'text-emerald-700' : 'text-red-500'}">
                            ${isM ? '+' : '-'} ${tx.nom.toLocaleString()}
                        </p>
                    </div>
                `);
            });
        }
    } catch (err) { console.error("Data Kas Error:", err); }
}

// LOGIKA LOAD BERITA (BLOG & SLIDER)
async function loadBeritaWarga() {
    const slider = document.getElementById('newsSlider');
    const blogContainer = document.getElementById('blogContainer');
    
    try {
        const snap = await db.collection("berita").orderBy("createdAt", "desc").get();
        
        if(slider) slider.innerHTML = '';
        if(blogContainer) blogContainer.innerHTML = '';

        if(snap.empty) {
            if(slider) slider.innerHTML = '<p class="text-[10px] text-slate-400 italic">Belum ada giat warga.</p>';
            return;
        }

        snap.forEach(doc => {
            const b = doc.data();
            
            // Render Slider di Home
            if(slider) {
                slider.insertAdjacentHTML('beforeend', `
                    <div @click="activeTab = 'blog'" class="min-w-[280px] bg-white rounded-[32px] overflow-hidden border border-slate-100 shadow-sm relative active:scale-95 transition-transform">
                        <img src="${b.img}" class="w-full h-36 object-cover bg-slate-50" />
                        <div class="p-4 bg-white/80 backdrop-blur-sm">
                            <h4 class="font-extrabold text-[10px] uppercase text-slate-700 truncate tracking-tight">${b.judul}</h4>
                            <p class="text-[8px] text-slate-400 mt-2 font-black uppercase italic">${b.tgl}</p>
                        </div>
                    </div>
                `);
            }

            // Render Blog Lengkap di Tab Blog
            if(blogContainer) {
                blogContainer.insertAdjacentHTML('beforeend', `
                    <article class="space-y-4 border-b border-slate-100 pb-10 last:border-0">
                        <div class="relative">
                            <img src="${b.img}" class="w-full h-56 object-cover rounded-[40px] shadow-xl shadow-green-900/5 bg-slate-50" />
                            <div class="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-4 py-1.5 rounded-full shadow-sm">
                                <span class="text-[9px] font-black text-primary uppercase italic tracking-widest">${b.tgl}</span>
                            </div>
                        </div>
                        <div class="px-2">
                            <h3 class="text-xl font-black leading-tight text-slate-800 uppercase italic mb-3 tracking-tighter">${b.judul}</h3>
                            <p class="text-[11px] text-slate-500 leading-relaxed font-semibold italic">
                                ${b.isi || 'Admin belum menambahkan detail deskripsi untuk kegiatan ini.'}
                            </p>
                        </div>
                    </article>
                `);
            }
        });
    } catch (err) { console.error("Berita Error:", err); }
}
