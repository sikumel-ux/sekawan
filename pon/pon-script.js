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

document.getElementById('pTgl').value = new Date().toISOString().split('T')[0];

// NOTIFIKASI CUSTOM
const Toast = Swal.mixin({
    toast: true,
    position: 'top',
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true
});

async function simpanPon() {
    const tgl = document.getElementById('pTgl').value;
    const kat = document.getElementById('pKat').value;
    const ket = document.getElementById('pKet').value.trim().toUpperCase();
    const nom = Number(document.getElementById('pNom').value);

    if (!ket || !nom) {
        return Swal.fire({ icon: 'error', title: 'Oops!', text: 'Keterangan & Nominal harus diisi.', borderRadius: '2rem' });
    }

    await db.collection("pon_mandiri").add({
        tgl: new Date(tgl), kat, ket, nom, createdAt: new Date()
    });

    document.getElementById('pKet').value = '';
    document.getElementById('pNom').value = '';
    
    Toast.fire({ icon: 'success', title: 'Berhasil disimpan!' });
    loadPon();
}

async function loadPon() {
    const snap = await db.collection("pon_mandiri").orderBy("tgl", "desc").get();
    const list = document.getElementById('listPon');
    let total = 0;
    list.innerHTML = '';
    
    document.getElementById('countData').innerText = `${snap.size} DATA`;

    snap.forEach(doc => {
        const d = doc.data();
        const id = doc.id;
        const isM = d.kat === 'Masuk';
        if (isM) total += d.nom; else total -= d.nom;

        list.insertAdjacentHTML('beforeend', `
            <div class="bg-white p-5 rounded-[1.8rem] flex justify-between items-center border border-slate-50 shadow-sm transition-all hover:shadow-md">
                <div class="flex gap-4 items-center">
                    <div class="w-10 h-10 rounded-2xl ${isM ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} flex items-center justify-center">
                        <span class="material-symbols-rounded text-lg">${isM ? 'north_east' : 'south_west'}</span>
                    </div>
                    <div>
                        <p class="text-[12px] font-black text-slate-700 uppercase leading-tight tracking-tight">${d.ket}</p>
                        <p class="text-[9px] text-slate-300 font-black mt-0.5">${d.tgl.toDate().toLocaleDateString('id-ID', {day:'numeric', month:'short'})}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="font-black text-[13px] ${isM ? 'text-emerald-600' : 'text-rose-600'}">
                        ${isM ? '+' : '-'} ${d.nom.toLocaleString('id-ID')}
                    </p>
                    <div class="flex gap-3 justify-end mt-1">
                        <button onclick="openEdit('${id}', '${d.tgl.toDate().toISOString().split('T')[0]}', '${d.kat}', '${d.ket}', ${d.nom})" class="text-slate-200 hover:text-orange-400 transition-colors">
                            <span class="material-symbols-rounded text-sm">edit_note</span>
                        </button>
                        <button onclick="hapusPon('${id}')" class="text-slate-200 hover:text-rose-500 transition-colors">
                            <span class="material-symbols-rounded text-sm">delete</span>
                        </button>
                    </div>
                </div>
            </div>
        `);
    });

    document.getElementById('totalPon').innerText = 'Rp ' + total.toLocaleString('id-ID');
}

async function hapusPon(id) {
    Swal.fire({
        title: 'Hapus Data?',
        text: "Data yang dihapus tidak bisa dikembalikan!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#F97316',
        cancelButtonColor: '#F1F5F9',
        confirmButtonText: 'Ya, Hapus!',
        cancelButtonText: 'Batal',
        customClass: { popup: 'rounded-[2rem]', confirmButton: 'rounded-xl font-bold', cancelButton: 'rounded-xl font-bold text-slate-500' }
    }).then(async (result) => {
        if (result.isConfirmed) {
            await db.collection("pon_mandiri").doc(id).delete();
            Toast.fire({ icon: 'success', title: 'Data berhasil dihapus' });
            loadPon();
        }
    });
}

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
        tgl: new Date(tgl), kat, ket, nom
    });

    closeModal();
    Toast.fire({ icon: 'success', title: 'Data diperbarui!' });
    loadPon();
}

loadPon();

