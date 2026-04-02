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

// GITHUB (ISI TOKEN KAMU)
const GITHUB_TOKEN = "GANTI_DISINI"; 
const GITHUB_REPO = "Username/RepoName"; 

const daftarBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni"];
let dataWarga = {};

auth.onAuthStateChanged(user => {
    if (user) { document.getElementById('mainApp').classList.remove('hidden'); document.getElementById('loginPage').classList.add('hidden'); init(); }
    else { document.getElementById('mainApp').classList.add('hidden'); document.getElementById('loginPage').classList.remove('hidden'); }
});

async function login() {
    const e = document.getElementById('email').value, p = document.getElementById('pass').value;
    try { await auth.signInWithEmailAndPassword(e, p); } catch(err) { alert("Error!"); }
}
async function logout() { if(confirm("Keluar?")) await auth.signOut(); }

function init() {
    const today = new Date().toISOString().split('T')[0];
    ['iTgl', 'bTgl'].forEach(id => { if(document.getElementById(id)) document.getElementById(id).value = today; });
    const grid = document.getElementById('gridBulan');
    const thr = document.getElementById('th-rekap');
    if(grid) {
        grid.innerHTML = ''; thr.innerHTML = '<th class="p-4 bg-white">NAMA</th>';
        daftarBulan.forEach(bln => {
            grid.innerHTML += `<label class="block"><input type="checkbox" name="blnCek" value="${bln}" class="hidden peer"><div class="cursor-pointer text-[9px] font-black py-3 text-center border rounded-xl bg-white text-slate-300 peer-checked:bg-primary peer-checked:text-white uppercase transition-all shadow-sm">${bln.substring(0,3)}</div></label>`;
            thr.innerHTML += `<th>${bln.substring(0,3)}</th>`;
        });
    }
    loadData(); loadBeritaAdmin();
}

async function uploadToGithub(file) {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const content = reader.result.split(',')[1];
            const fileName = `giat/${Date.now()}-${file.name.replace(/\s/g, '-')}`;
            try {
                await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${fileName}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: `Giat`, content: content, branch: "main" })
                });
                resolve(`https://raw.githubusercontent.com/${GITHUB_REPO}/main/${fileName}`);
            } catch (err) { reject(err); }
        };
    });
}

function previewImage(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => document.getElementById('imgPreview').innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover rounded-[22px]">`;
        reader.readAsDataURL(file);
    }
}

async function loadData() {
    const [dkas, diur, dang] = await Promise.all([db.collection("kas").get(), db.collection("pembayaran").get(), db.collection("anggota").orderBy("nama","asc").get()]);
    let tIn=0, tOut=0, tIur=0;
    const ti=document.getElementById('tBodyWarga'), tr=document.getElementById('tb-rekap'), sel=document.getElementById('iNama'), listR = document.getElementById('listRiwayat');
    ti.innerHTML=''; tr.innerHTML=''; sel.innerHTML='<option value="">Pilih Warga</option>'; listR.innerHTML='';
    const iuranArr = diur.docs.map(doc => ({id: doc.id, ...doc.data()}));
    dkas.docs.forEach(doc => {
        const d = doc.data(); const nom = Number(d.nom || 0);
        if(d.kat==='Masuk') tIn+=nom; else tOut+=nom;
    });
    iuranArr.forEach(d => tIur += Number(d.nom || 0));
    document.getElementById('totalSaldo').innerText = 'Rp ' + ((tIn + tIur) - tOut).toLocaleString('id-ID');
    document.getElementById('totalMasuk').innerText = 'Rp ' + (tIn + tIur).toLocaleString('id-ID');
    document.getElementById('totalKeluar').innerText = 'Rp ' + tOut.toLocaleString('id-ID');
    dang.docs.forEach(doc => {
        const d = doc.data(); const n = (d.nama || "").toUpperCase();
        dataWarga[n] = d.hp || '';
        sel.insertAdjacentHTML('beforeend', `<option value="${n}">${n}</option>`);
        ti.insertAdjacentHTML('beforeend', `<div class="bg-white p-4 rounded-2xl flex justify-between items-center border border-slate-50 shadow-sm"><div><p class="font-black text-xs uppercase italic text-slate-700">${n}</p><p class="text-[9px] text-slate-400 font-bold">${d.hp || '-'}</p></div><button onclick="hapus('anggota','${doc.id}')" class="text-red-100"><span class="material-symbols-rounded">delete</span></button></div>`);
    });
}

async function simpanBerita() {
    const btn = document.getElementById('btnPublish'), j = document.getElementById('bJudul').value.toUpperCase(), isi = document.getElementById('bIsi').value, tRaw = document.getElementById('bTgl').value, f = document.getElementById('bFile').files[0];
    if(!j || !isi || !f) return alert("Lengkapi data!");
    btn.disabled = true; btn.innerText = "UPLOADING...";
    try {
        const imgUrl = await uploadToGithub(f);
        await db.collection("berita").add({ judul: j, img: imgUrl, isi: isi, tgl: tRaw, createdAt: new Date(tRaw) });
        location.reload();
    } catch (e) { alert("Gagal!"); btn.disabled = false; }
}

async function simpanIuran() {
    const n = document.getElementById('iNama').value, nmn = Number(document.getElementById('iNom').value), tglVal = document.getElementById('iTgl').value, blns = Array.from(document.querySelectorAll('input[name="blnCek"]:checked')).map(c => c.value);
    if(!n || !nmn || blns.length === 0) return alert("Data Kosong!");
    const k = "T-" + Math.floor(100000 + Math.random() * 900000); 
    await db.collection("pembayaran").doc(k).set({ nama: n, bulan: blns.join(","), nom: nmn, tgl: new Date(tglVal), kode: k }); 
    alert("Berhasil!"); location.reload();
}

async function simpanAnggota() {
    const n = document.getElementById('aNama').value.trim().toUpperCase(), h = document.getElementById('aHp').value;
    if(n) { await db.collection("anggota").add({ nama: n, hp: h }); loadData(); }
}

async function loadBeritaAdmin() {
    const listB = document.getElementById('listBeritaAdmin');
    const snap = await db.collection("berita").orderBy("createdAt", "desc").get();
    listB.innerHTML = '';
    snap.forEach(doc => {
        listB.insertAdjacentHTML('beforeend', `<div class="bg-white p-3 rounded-2xl flex justify-between items-center border border-slate-50"><p class="text-[10px] font-black uppercase italic">${doc.data().judul}</p><button onclick="hapus('berita','${doc.id}')" class="text-red-100"><span class="material-symbols-rounded">delete</span></button></div>`);
    });
}

async function hapus(c, id) { if(confirm("Hapus?")) { await db.collection(c).doc(id).delete(); location.reload(); } }

function st(t) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('screen-'+t).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b => {
        b.classList.remove('text-primary'); b.classList.add('text-slate-300');
    });
    document.getElementById('n-'+t).classList.add('text-primary');
    document.getElementById('n-'+t).classList.remove('text-slate-300');
                                                  }
        
