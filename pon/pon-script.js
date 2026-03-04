// --- 1. SIMPAN DATA ---
async function simpanPon() {
    const tgl = document.getElementById('pTgl').value;
    const kat = document.getElementById('pKat').value;
    const ket = document.getElementById('pKet').value.trim().toUpperCase();
    const nom = Number(document.getElementById('pNom').value);

    if (!ket || !nom) {
        return Swal.fire({ icon: 'error', title: 'Data Kosong', text: 'Keterangan & Nominal wajib diisi!' });
    }

    await db.collection("pon").add({
        tgl: new Date(tgl), kat, ket, nom, createdAt: new Date()
    });

    document.getElementById('pKet').value = '';
    document.getElementById('pNom').value = '';
    Swal.fire({ icon: 'success', title: 'Tersimpan', timer: 1500, showConfirmButton: false });
    loadData(); // Memanggil loadData di kastuntas.html
}

// --- 2. TAMPILKAN DATA (Dipanggil oleh loadData di kastuntas.html) ---
async function loadDataPon() {
    const snap = await db.collection("pon").orderBy("tgl", "desc").get();
    const list = document.getElementById('listPon');
    let total = 0;
    list.innerHTML = '';
    
    if(document.getElementById('countPon')) {
        document.getElementById('countPon').innerText = `${snap.size} DATA`;
    }

    snap.forEach(doc => {
        const d = doc.data();
        const id = doc.id;
        const isM = d.kat === 'Masuk';
        if (isM) total += Number(d.nom); else total -= Number(d.nom);

        const dateStr = d.tgl.toDate().toLocaleDateString('id-ID', {day:'numeric', month:'short'});

        list.insertAdjacentHTML('beforeend', `
            <div class="bg-white p-5 rounded-[2rem] flex justify-between items-center border border-slate-50 shadow-sm mb-2">
                <div class="flex gap-4 items-center">
                    <div class="w-10 h-10 rounded-2xl ${isM ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} flex items-center justify-center">
                        <span class="material-symbols-rounded text-lg">${isM ? 'north_east' : 'south_west'}</span>
                    </div>
                    <div>
                        <p class="text-[12px] font-black text-slate-700 uppercase leading-tight tracking-tight">${d.ket}</p>
                        <p class="text-[9px] text-slate-300 font-black mt-0.5">${dateStr}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="font-black text-[13px] ${isM ? 'text-emerald-600' : 'text-rose-600'}">
                        ${isM ? '+' : '-'} ${Number(d.nom).toLocaleString('id-ID')}
                    </p>
                    <div class="flex gap-3 justify-end mt-1">
                        <button onclick="openEditPon('${id}', '${d.tgl.toDate().toISOString().split('T')[0]}', '${d.kat}', '${d.ket}', ${d.nom})" class="text-slate-200">
                            <span class="material-symbols-rounded text-sm">edit_note</span>
                        </button>
                        <button onclick="hapusPon('${id}')" class="text-slate-200">
                            <span class="material-symbols-rounded text-sm">delete</span>
                        </button>
                    </div>
                </div>
            </div>
        `);
    });

    document.getElementById('totalPon').innerText = 'Rp ' + total.toLocaleString('id-ID');
}

// --- 3. HAPUS DATA ---
async function hapusPon(id) {
    if (confirm("Hapus data PON ini?")) {
        await db.collection("pon").doc(id).delete();
        loadData();
    }
}

// --- 4. EDIT & UPDATE ---
function openEditPon(id, tgl, kat, ket, nom) {
    document.getElementById('editId').value = id;
    document.getElementById('eTgl').value = tgl;
    document.getElementById('eKat').value = kat;
    document.getElementById('eKet').value = ket;
    document.getElementById('eNom').value = nom;
    document.getElementById('modalEdit').style.display = 'flex';
}

async function updatePon() {
    const id = document.getElementById('editId').value;
    const tgl = document.getElementById('eTgl').value;
    const kat = document.getElementById('eKat').value;
    const ket = document.getElementById('eKet').value.toUpperCase();
    const nom = Number(document.getElementById('eNom').value);

    await db.collection("pon").doc(id).update({
        tgl: new Date(tgl), kat, ket, nom
    });

    closeModal('modalEdit');
    loadData();
}
    
