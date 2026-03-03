// Konfigurasi Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDjxOJZeiLHaxoaS3-hVdbIGfIXCfCT2Is",
    authDomain: "tuntas-sekawan.firebaseapp.com",
    projectId: "tuntas-sekawan",
    storageBucket: "tuntas-sekawan.firebasestorage.app",
    messagingSenderId: "1090506516563",
    appId: "1:1090506516563:web:63c429677caea28addfea6"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Set Tanggal Hari Ini
document.getElementById('pTgl').value = new Date().toISOString().split('T')[0];

// 1. Simpan Transaksi Baru
async function simpanPon() {
    const tgl = document.getElementById('pTgl').value;
    const kat = document.getElementById('pKat').value;
    const ket = document.getElementById('pKet').value.trim().toUpperCase();
    const nom = Number(document.getElementById('pNom').value);

    if (!ket || !nom) return alert("Keterangan & Nominal harus diisi!");

    await db.collection("pon_mandiri").add({
        tgl: new Date(tgl),
        kat: kat,
        ket: ket,
        nom: nom,
        createdAt: new Date()
    });

    document.getElementById('pKet').value = '';
    document.getElementById('pNom').value = '';
    loadPon();
}

// 2. Tampilkan Data & Hitung Saldo
async function loadPon() {
    const snap = await db.collection("pon_mandiri").orderBy("tgl", "desc").get();
    const list = document.getElementById('listPon');
    let total = 0;
    list.innerHTML = '';

    snap.forEach(doc => {
        const d = doc.data();
        const id = doc.id;
        const isM = d.kat === 'Masuk';
        if (isM) total += d.nom; else total -= d.nom;

        const dateStr = d.tgl.toDate().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

        list.insertAdjacentHTML('beforeend', `
            <div class="bg-white p-4 rounded-2xl flex justify-between items-center border border-slate-100 shadow-sm">
                <div class="flex gap-3 items-center">
                    <div class="w-8 h-8 rounded-lg ${isM ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'} flex items-center justify-center font-black text-[9px]">
                        ${isM ? 'IN' : 'OUT'}
                    </div>
                    <div>
                        <p class="text-[11px] font-black text-slate-700 uppercase leading-tight">${d.ket}</p>
                        <p class="text-[8px] text-slate-300 font-bold">${dateStr}</p>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <div class="text-right">
                        <p class="font-black text-xs ${isM ? 'text-emerald-700' : 'text-red-600'}">
                            ${isM ? '+' : '-'} ${d.nom.toLocaleString('id-ID')}
                        </p>
                        <div class="flex gap-2 justify-end mt-1">
                            <button onclick="openEdit('${id}', '${d.tgl.toDate().toISOString().split('T')[0]}', '${d.kat}', '${d.ket}', ${d.nom})" class="text-slate-300 hover:text-blue-500">
                                <span class="material-symbols-rounded text-xs">edit</span>
                            </button>
                            <button onclick="hapusPon('${id}')" class="text-slate-300 hover:text-red-500">
                                <span class="material-symbols-rounded text-xs">delete</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `);
    });

    document.getElementById('totalPon').innerText = 'Rp ' + total.toLocaleString('id-ID');
}

// 3. Fungsi Hapus
async function hapusPon(id) {
    if (confirm("Hapus transaksi ini?")) {
        await db.collection("pon_mandiri").doc(id).delete();
        loadPon();
    }
}

// 4. Fungsi Edit
function openEdit(id, tgl, kat, ket, nom) {
    document.getElementById('editId').value = id;
    document.getElementById('eTgl').value = tgl;
    document.getElementById('eKat').value = kat;
    document.getElementById('eKet').value = ket;
    document.getElementById('eNom').value = nom;
    document.getElementById('modalEdit').classList.replace('hidden', 'flex');
}

function closeModal() {
    document.getElementById('modalEdit').classList.replace('flex', 'hidden');
}

async function updatePon() {
    const id = document.getElementById('editId').value;
    const tgl = document.getElementById('eTgl').value;
    const kat = document.getElementById('eKat').value;
    const ket = document.getElementById('eKet').value.toUpperCase();
    const nom = Number(document.getElementById('eNom').value);

    await db.collection("pon_mandiri").doc(id).update({
        tgl: new Date(tgl),
        kat: kat,
        ket: ket,
        nom: nom
    });

    closeModal();
    loadPon();
}

// Jalankan load data saat buka
loadPon();
                 
