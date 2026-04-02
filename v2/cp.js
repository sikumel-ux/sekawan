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

// GITHUB CONFIG - HARUS DIISI
const GITHUB_TOKEN = "GANTI_DENGAN_TOKEN_KAMU"; 
const GITHUB_REPO = "Username/RepoName"; 
const GITHUB_BRANCH = "main";

const daftarBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni"];
let dataWarga = {};

auth.onAuthStateChanged(user => {
    if (user) { document.getElementById('mainApp').classList.remove('hidden'); document.getElementById('loginPage').classList.add('hidden'); init(); }
    else { document.getElementById('mainApp').classList.add('hidden'); document.getElementById('loginPage').classList.remove('hidden'); }
});

async function login() {
    const e = document.getElementById('email').value, p = document.getElementById('pass').value;
    try { await auth.signInWithEmailAndPassword(e, p); } catch(err) { alert("Sandi Salah!"); }
}
async function logout() { if(confirm("Keluar Panel?")) await auth.signOut(); }

function init() {
    const today = new Date().toISOString().split('T')[0];
    ['iTgl', 'kTgl', 'bTgl'].forEach(id => { if(document.getElementById(id)) document.getElementById(id).value = today; });
    
    const grid = document.getElementById('gridBulan');
    const thr = document.getElementById('th-rekap');
    if(grid && thr) {
        grid.innerHTML = ''; thr.innerHTML = '<th class="sticky-col shadow-sm">NAMA</th>';
        daftarBulan.forEach(bln => {
            grid.innerHTML += `<label class="relative block"><input type="checkbox" name="blnCek" value="${bln}" class="hidden peer"><div class="cursor-pointer text-[9px] font-black py-4 text-center border-2 border-emerald-800/40 rounded-2xl bg-transparent text-emerald-200 peer-checked:bg-white peer-checked:text-primary peer-checked:border-white uppercase transition-all shadow-sm">${bln.substring(0,3)}</div></label>`;
            thr.innerHTML += `<th>${bln.substring(0,3)}</th>`;
        });
    }
    loadData();
    loadBeritaAdmin();
}

async function uploadToGithub(file) {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const content = reader.result.split(',')[1];
            const fileName = `giat/${Date.now()}-${file.name.replace(/\s/g, '-')}`;
            try {
                const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${fileName}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: `Upload Giat`, content: content, branch: GITHUB_BRANCH })
                });
                resolve(`https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${fileName}`);
            } catch (err) { reject(err); }
        };
    });
}

function previewImage(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => document.getElementById('imgPreview').innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover">`;
        reader.readAsDataURL(file);
    }
}

async function simpanBerita() {
    const btn = document.getElementById('btnPublish');
    const j = document.getElementById('bJudul').value.toUpperCase(), isi = document.getElementById('bIsi').value, tRaw = document.getElementById('bTgl').value, f = document.getElementById('bFile').files[0];
    if(!j || !isi || !f) return alert("Data Giat Tidak Lengkap!");
    btn.disabled = true; btn.innerText = "UPLOADING...";
    try {
        const imgUrl = await uploadToGithub(f);
        const d = new Date(tRaw);
        const tFmt = `${d.getDate().toString().padStart(2, '0')} - ${(d.getMonth()+1).toString().padStart(2, '0')} - ${d.getFullYear()}`;
        await db.collection("berita").add({ judul: j, img: imgUrl, isi: isi, tgl: tFmt, createdAt: new Date(tRaw) });
        alert("Giat Berhasil Publish!"); location.reload();
    } catch (e) { alert("Gagal Upload!"); btn.disabled = false; btn.innerText = "PUBLISH GIAT"; }
}

async function loadData() {
    const [dkas, diur, dang] = await Promise.all([db.collection("kas").get(), db.collection("pembayaran").get(), db.collection("anggota").orderBy("nama","asc").get()]);
    let tIn=0, tOut=0, tIur=0;
    let totalsBln = {}; daftarBulan.forEach(b => totalsBln[b] = 0);
    let allTrx = [];
    const ti=document.getElementById('tBodyWarga'), tr=document.getElementById('tb-rekap'), sel=document.getElementById('iNama'), listR = document.getElementById('listRiwayat');
    ti.innerHTML=''; tr.innerHTML=''; sel.innerHTML='<option value="">CARI WARGA...</option>'; listR.innerHTML='';
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
    allTrx.sort((a,b) => b.tgl - a.tgl).forEach(tx => {
        const isM = tx.kat === 'Masuk';
        listR.insertAdjacentHTML('beforeend', `<div class="bg-white p-5 rounded-[28px] flex justify-between items-center border border-slate-50 shadow-sm"><div class="flex gap-4 items-center"><div class="w-10 h-10 rounded-2xl ${isM?'bg-emerald-50 text-emerald-600':'bg-orange-50 text-orange-600'} flex items-center justify-center font-black text-[10px] italic">${isM?'IN':'OUT'}</div><div><p class="text-[11px] font-black uppercase text-slate-700 italic">${tx.ket}</p><p class="font-mono text-[8px] text-slate-300 font-bold">${tx.tgl.toLocaleDateString('id-ID')}</p></div></div><div class="flex items-center gap-4"><p class="font-black text-[11px] ${isM?'text-emerald-700':'text-orange-500'} italic">${isM?'+':'-'} ${tx.nom.toLocaleString()}</p><button onclick="hapus('${tx.col}','${tx.id}')" class="text-slate-200"><span class="material-symbols-rounded text-sm">delete</span></button></div></div>`);
    });
    dang.docs.forEach(doc => {
        const d = doc.data(); const n = (d.nama || "").toUpperCase();
        dataWarga[n] = d.hp || '';
        sel.insertAdjacentHTML('beforeend', `<option value="${n}">${n}</option>`);
        ti.insertAdjacentHTML('beforeend', `<div class="bg-white p-4 rounded-2xl flex justify-between items-center border border-slate-50"><div><p class="font-black text-xs uppercase text-slate-700 italic">${n}</p><p class="text-[9px] text-slate-400 font-bold">${d.hp || '-'}</p></div><button onclick="hapus('anggota','${doc.id}')" class="text-red-100"><span class="material-symbols-rounded">delete</span></button></div>`);
        let row = `<tr><td class="sticky-col font-black uppercase">${n.split(' ')[0]}</td>`;
        daftarBulan.forEach(bln => {
            const lunas = iuranArr.filter(k => (k.nama||"").toUpperCase() === n && (k.bulan||"").includes(bln));
            if(lunas.length > 0) {
                let nomBln = 0; lunas.forEach(l => nomBln += (Number(l.nom) / (l.bulan||"").split(',').length));
                row += `<td class="text-center text-emerald-600 font-black">${(nomBln/1000).toFixed(0)}K</td>`;
                totalsBln[bln] += nomBln;
            } else { row += `<td class="text-center text-slate-100">-</td>`; }
        });
        tr.insertAdjacentHTML('beforeend', row + `</tr>`);
    });
}

async function simpanIuran() {
    const n = document.getElementById('iNama').value, nmn = Number(document.getElementById('iNom').value), tglVal = document.getElementById('iTgl').value, blns = Array.from(document.querySelectorAll('input[name="blnCek"]:checked')).map(c => c.value);
    if(!n || !nmn || blns.length === 0) return alert("Data Kosong!");
    const k = "T-" + Math.floor(100000 + Math.random() * 900000); 
    await db.collection("pembayaran").doc(k).set({ nama: n, bulan: blns.join(","), nom: nmn, tgl: new Date(tglVal), kode: k }); 
    const hp = (dataWarga[n]||'').replace(/^0/,'62');
    window.open(`https://wa.me/${hp}?text=Halo *${n}*, iuran diterima (Ref: ${k}). Cek kuitansi: ${window.location.origin}/kuitansi.html?id=${k}`);
    location.reload();
}

async function loadBeritaAdmin() {
    const listB = document.getElementById('listBeritaAdmin');
    const snap = await db.collection("berita").orderBy("createdAt", "desc").get();
    listB.innerHTML = '';
    snap.forEach(doc => {
        const b = doc.data();
        listB.insertAdjacentHTML('beforeend', `<div class="bg-white p-4 rounded-3xl flex justify-between items-center border border-slate-50 shadow-sm"><div class="flex gap-4 items-center"><img src="${b.img}" class="w-12 h-12 rounded-2xl object-cover"><p class="text-[10px] font-black uppercase italic text-slate-700 truncate max-w-[120px]">${b.judul}</p></div><button onclick="hapus('berita','${doc.id}')" class="text-red-100"><span class="material-symbols-rounded">delete</span></button></div>`);
    });
}

async function simpanKas() {
    const tgl = document.getElementById('kTgl').value, kat = document.getElementById('kKat').value, ket = document.getElementById('kKet').value.toUpperCase(), nom = Number(document.getElementById('kNom').value);
    await db.collection("kas").add({ kat, ket, nom, tgl: new Date(tgl) });
    alert("Kas Simpan!"); loadData();
}

async function simpanAnggota() {
    const n = document.getElementById('aNama').value.trim().toUpperCase(), h = document.getElementById('aHp').value;
    if(n) { await db.collection("anggota").add({ nama: n, hp: h }); loadData(); }
}

async function hapus(c, id) { if(confirm("Hapus?")) { await db.collection(c).doc(id).delete(); loadData(); loadBeritaAdmin(); } }

function st(t) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('screen-'+t).classList.add('active');
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
    document.getElementById('n-'+t).classList.add('active');
}
