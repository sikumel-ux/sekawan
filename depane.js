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
const daftarBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni"];

document.addEventListener('DOMContentLoaded', () => { init(); });

function init() {
    const thr = document.getElementById('th-rekap');
    if (thr) {
        let head = '<th class="sticky-col p-4 bg-white">Nama</th>';
        daftarBulan.forEach(bln => {
            head += `<th class="text-center p-3 font-bold text-slate-400">${bln.substring(0,3)}</th>`;
        });
        thr.innerHTML = head;
    }
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
        let totalsBln = {}; 
        daftarBulan.forEach(b => totalsBln[b] = 0);
        
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
        document.getElementById('totalSaldo').innerText = 'Rp ' + ((tIn + tIur) - tOut).toLocaleString('id-ID');
        document.getElementById('totalMasuk').innerText = 'Rp ' + (tIn + tIur).toLocaleString('id-ID');
        document.getElementById('totalKeluar').innerText = 'Rp ' + tOut.toLocaleString('id-ID');

        // Render Riwayat
        allTrx.sort((a,b) => b.tgl - a.tgl);
        let htmlFull = "";
        let htmlShort = "";
        
        allTrx.forEach((tx, i) => {
            const isM = tx.kat === 'Masuk';
            const card = `
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
            htmlFull += card;
            if(i < 5) htmlShort += card;
        });
        document.getElementById('listRiwayatLengkap').innerHTML = htmlFull;
        document.getElementById('listRiwayat').innerHTML = htmlShort;

        // Render Anggota & Rekap
        let htmlAnggota = "";
        let htmlRekap = "";
        
        dang.docs.forEach(doc => {
            const d = doc.data(); 
            const n = (d.nama || "").trim().toUpperCase();
            
            // Item Anggota (HP dihapus)
            htmlAnggota += `
                <div class="bg-white p-4 rounded-2xl flex justify-between items-center border border-slate-100 shadow-sm">
                    <p class="font-bold text-xs text-slate-700 uppercase">${n}</p>
                    <div class="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
                        <i class="fa-solid fa-user text-[10px]"></i>
                    </div>
                </div>`;

            // Baris Rekap
            let row = `<tr><td class="sticky-col p-4 font-bold text-slate-700 bg-white border-b border-slate-50 uppercase text-[10px]">${n}</td>`;
            daftarBulan.forEach(bln => {
                const lunas = iuranArr.filter(k => (k.nama || "").toUpperCase() === n && (k.bulan || "").includes(bln));
                if(lunas.length > 0) {
                    let nomBln = 0; 
                    lunas.forEach(l => nomBln += (Number(l.nom) / (l.bulan || "").split(',').length));
                    row += `<td class="text-center text-emerald-600 font-bold">${(nomBln/1000).toFixed(0)}K</td>`;
                    totalsBln[bln] += nomBln;
                } else { row += `<td class="text-center text-slate-200">-</td>`; }
            });
            htmlRekap += row + `</tr>`;
        });
        document.getElementById('tBodyWarga').innerHTML = htmlAnggota;
        document.getElementById('tb-rekap').innerHTML = htmlRekap;

        // Footer Total
        let frow = `<tr><td class="sticky-col p-4 font-bold bg-emerald-50 text-emerald-900 uppercase">TOTAL</td>`;
        daftarBulan.forEach(bln => { frow += `<td class="text-center p-4 bg-emerald-50 text-emerald-800 font-bold">${(totalsBln[bln]/1000).toFixed(0)}K</td>`; });
        document.getElementById('tf-rekap').innerHTML = frow + `</tr>`;

    } catch (err) { console.error("Error: ", err); }
}

function st(t) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('screen-' + t).classList.add('active');
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
    document.getElementById('n-' + t).classList.add('active');
    window.scrollTo(0, 0);
}
