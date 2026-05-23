const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzpZZt53kE0d5y7xXfsPFI21NKMx9MLh8N7NXkgtZV_u5QPg9ldAQApH4NzpGOShFDs/exec";
const daftarBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

let dbGlobal = { pembayaran: [], anggota: [], kas: [] };
let sessionWarga = null;

function showLoading() { document.getElementById('loading').style.display = 'flex'; }
function hideLoading() { document.getElementById('loading').style.display = 'none'; }

function tuntasAlert(title, message, type = 'success') {
    document.getElementById('alertTitle').innerText = title;
    document.getElementById('alertMsg').innerText = message;
    document.getElementById('alertIcon').className = type === 'error' ? "w-12 h-12 mx-auto rounded-full flex items-center justify-center bg-red-50 text-red-600" : "w-12 h-12 mx-auto rounded-full flex items-center justify-center bg-emerald-50 text-emerald-600";
    document.getElementById('alertIcon').innerHTML = type === 'error' ? '<span class="material-symbols-rounded">gpp_maybe</span>' : '<span class="material-symbols-rounded">check_circle</span>';
    document.getElementById('customAlert').style.display = 'flex';
}
function closeAlert() { document.getElementById('customAlert').style.display = 'none'; }

function bersihkanNoHp(hp) {
    if (!hp) return "";
    let str = hp.toString().trim().replace(/[-+\s]/g, "");
    if (str.startsWith("62")) str = "0" + str.substring(2);
    return str;
}

async function loadDataWargaPortal() {
    showLoading();
    try {
        let res = await fetch(`${SCRIPT_URL}?action=loadAll`, { method: "GET" });
        let json = await res.json();
        if(json.status === "success") {
            dbGlobal = json.data;
            
            hitungDanTampilkanSaldoKas();

            if(sessionStorage.getItem('warga_login')) {
                sessionWarga = JSON.parse(sessionStorage.getItem('warga_login'));
                let targetHpClean = bersihkanNoHp(sessionWarga['No Hp'] || sessionWarga.hp);
                let updateData = dbGlobal.anggota.find(a => bersihkanNoHp(a['No Hp'] || a.hp) === targetHpClean);
                if(updateData) {
                    sessionWarga = updateData;
                    sessionStorage.setItem('warga_login', JSON.stringify(updateData));
                }
                bukaDashboard();
            }
        }
    } catch(e) { console.error(e); }
    hideLoading();
}

function hitungDanTampilkanSaldoKas() {
    let totalMasuk = 0;
    let totalKeluar = 0;
    
    if (dbGlobal.kas) {
        dbGlobal.kas.forEach(k => {
            let nom = Number(k.Nominal || k.nom || 0);
            if ((k.Kategori || k.kat || '').toLowerCase() === 'masuk') {
                totalMasuk += nom;
            } else if ((k.Kategori || k.kat || '').toLowerCase() === 'keluar') {
                totalKeluar += nom;
            }
        });
    }
    let sisaSaldo = totalMasuk - totalKeluar;
    document.getElementById('widgetSaldoKas').innerText = "Rp " + sisaSaldo.toLocaleString('id-ID');
}

function prosesLoginWarga() {
    const hpInput = bersihkanNoHp(document.getElementById('lHp').value);
    const passInput = document.getElementById('lPass').value.trim();

    if(!hpInput || !passInput) return tuntasAlert("Form Kosong", "Harap isi Nomor HP dan Kata Sandi Anda!", "error");

    const ketemu = dbGlobal.anggota.find(a => {
        let sHp = bersihkanNoHp(a['No Hp'] || a.hp);
        let sPass = (a['Password'] || a.password || '').toString().trim();
        return sHp === hpInput && sPass === passInput;
    });

    if(ketemu) {
        sessionWarga = ketemu;
        sessionStorage.setItem('warga_login', JSON.stringify(ketemu));
        bukaDashboard();
    } else {
        tuntasAlert("Gagal Masuk", "Nomor HP atau kata sandi salah. Silakan coba kembali.", "error");
    }
}

function bukaDashboard() {
    document.getElementById('screen-login').classList.add('hidden');
    document.getElementById('screen-dashboard').classList.remove('hidden');

    const sNama = (sessionWarga.Nama || sessionWarga.nama || '').toUpperCase();
    let sHp = sessionWarga['No Hp'] || sessionWarga.hp || '-';
    if(sHp.toString().startsWith("62")) sHp = "0" + sHp.toString().substring(2);

    const sGabung = sessionWarga['Bulan Bergabung'] || sessionWarga.gabung || 'Warga Lama';
    const sFoto = sessionWarga['Foto'] || sessionWarga.foto || '';

    document.getElementById('cardNama').innerText = sNama;
    document.getElementById('cardHp').innerText = "HP: " + sHp;
    document.getElementById('cardGabung').innerText = sGabung;
    
    if(sFoto) document.getElementById('avatarWarga').src = sFoto;

    const containerRiwayat = document.getElementById('listRiwayatPribadi');
    const containerGridBulan = document.getElementById('statusBulanGrid');
    containerRiwayat.innerHTML = ''; containerGridBulan.innerHTML = '';

    let totalBayar = 0;
    let listLunasBulan = [];

    if(dbGlobal.pembayaran) {
        const myPayment = dbGlobal.pembayaran.filter(p => (p.Nama || p.nama || '').trim().toUpperCase() === sNama)
                         .sort((a,b) => new Date(b.Tanggal || b.tgl) - new Date(a.Tanggal || a.tgl));

        myPayment.forEach(p => {
            let nom = Number(p.Nominal || p.nom || 0);
            let ketBln = p.Keterangan || p.ket || '';
            let tgl = p.Tanggal || p.tgl || '';
            totalBayar += nom;

            daftarBulan.forEach(b => {
                if(ketBln.toLowerCase().includes(b.toLowerCase())) listLunasBulan.push(b);
            });

            containerRiwayat.insertAdjacentHTML('beforeend', `
                <div class="bg-white p-4 rounded-2xl flex justify-between items-center border border-slate-50 shadow-sm">
                    <div class="flex gap-3 items-center">
                        <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-[9px]">LUNAS</div>
                        <div>
                            <p class="text-xs font-black uppercase text-slate-700 tracking-tighter">${ketBln}</p>
                            <p class="text-[8px] text-slate-300 font-bold">${tgl}</p>
                        </div>
                    </div>
                    <p class="font-black text-xs text-emerald-700">Rp ${nom.toLocaleString()}</p>
                </div>
            `);
        });

        if(myPayment.length === 0) {
            containerRiwayat.innerHTML = '<p class="text-center text-xs text-slate-400 font-bold py-6">Belum ada riwayat iuran tercatat.</p>';
        }
    }

    document.getElementById('cardTotalKontribusi').innerText = "Rp " + totalBayar.toLocaleString('id-ID');

    daftarBulan.forEach(bln => {
        const isLunas = listLunasBulan.includes(bln);
        containerGridBulan.insertAdjacentHTML('beforeend', `
            <div class="p-2 rounded-xl text-center border text-[9px] font-black uppercase ${isLunas ? 'bg-emerald-900 text-white border-emerald-900':'bg-slate-50 text-slate-300 border-slate-100'}">
                ${bln.substring(0,3)}
            </div>
        `);
    });
}

function bukaModalKas() {
    const container = document.getElementById('listMutasiKasMasyarakat');
    container.innerHTML = '';

    if (!dbGlobal.kas || dbGlobal.kas.length === 0) {
        container.innerHTML = '<p class="text-center text-xs font-bold text-slate-400 py-8">Belum ada mutasi pencatatan kas.</p>';
        return openModal('mDetailKas');
    }

    const kasSorted = [...dbGlobal.kas].sort((a,b) => new Date(b.Tanggal || b.tgl) - new Date(a.Tanggal || a.tgl));

    kasSorted.forEach(k => {
        let kat = (k.Kategori || k.kat || '').toLowerCase();
        let nom = Number(k.Nominal || k.nom || 0);
        let ket = k.Keterangan || k.ket || '';
        let tgl = k.Tanggal || k.tgl || '';

        let isMasuk = kat === 'masuk';

        container.insertAdjacentHTML('beforeend', `
            <div class="bg-slate-50 p-3.5 rounded-2xl flex justify-between items-center border border-slate-100">
                <div class="flex items-center gap-3">
                    <div class="w-7 h-7 rounded-lg flex items-center justify-center font-black text-[9px] ${isMasuk ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}">
                        ${isMasuk ? 'IN' : 'OUT'}
                    </div>
                    <div>
                        <p class="text-xs font-black uppercase text-slate-700 tracking-tight leading-none">${ket}</p>
                        <p class="text-[8px] text-slate-400 font-bold mt-1">${tgl}</p>
                    </div>
                </div>
                <p class="text-xs font-black ${isMasuk ? 'text-emerald-700' : 'text-red-600'}">
                    ${isMasuk ? '+' : '-'} Rp ${nom.toLocaleString('id-ID')}
                </p>
            </div>
        `);
    });

    openModal('mDetailKas');
}

async function prosesGantiPassword() {
    const passwordBaru = document.getElementById('newPass').value.trim();
    if(!passwordBaru || passwordBaru.length < 4) return tuntasAlert("Sandi Terlalu Pendek", "Kata sandi minimal berisi 4 karakter!", "error");

    showLoading();
    try {
        let res = await fetch(SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify({
                action: "updatePasswordWarga",
                hp: sessionWarga['No Hp'] || sessionWarga.hp,
                passwordData: passwordBaru
            })
        });
        let json = await res.json();
        if(json.status === "success") {
            sessionWarga.Password = passwordBaru;
            sessionStorage.setItem('warga_login', JSON.stringify(sessionWarga));
            tuntasAlert("Berhasil", "Kata sandi akun Anda sukses diperbarui!");
            closeModal('mKeamanan');
            document.getElementById('newPass').value = '';
        } else { tuntasAlert("Gagal", "Gagal menyimpan perubahan ke server", "error"); }
    } catch(err) { console.error(err); tuntasAlert("Error", "Gagal karena gangguan jaringan!", "error"); }
    hideLoading();
}

function uploadFotoProfil(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = async function (e) {
            const base64Data = e.target.result;
            document.getElementById('avatarWarga').src = base64Data;
            
            showLoading();
            try {
                let res = await fetch(SCRIPT_URL, {
                    method: "POST",
                    body: JSON.stringify({
                        action: "updateFotoWarga",
                        nama: (sessionWarga.Nama || sessionWarga.nama).trim().toUpperCase(),
                        fotoData: base64Data
                    })
                });
                let json = await res.json();
                if(json.status === "success") {
                    sessionWarga.Foto = base64Data;
                    sessionStorage.setItem('warga_login', JSON.stringify(sessionWarga));
                    tuntasAlert("Foto Diperbarui", "Foto profil Anda berhasil disimpan!");
                } else { tuntasAlert("Gagal", "Gagal menyimpan foto", "error"); }
            } catch(err) { console.error(err); }
            hideLoading();
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function salinRekening() {
    const noRek = document.getElementById('noRekText').innerText;
    navigator.clipboard.writeText(noRek);
    tuntasAlert("Berhasil Disalin", "Nomor rekening BCA " + noRek + " berhasil disalin!");
}

function kontfirmasiBayarWA() {
    const msg = `Halo Pengurus TUNTAS, saya *${(sessionWarga.Nama || '').toUpperCase()}* ingin mengonfirmasi bahwa saya baru saja melakukan pembayaran iuran warga via transfer bank. Mohon dicek ya, terima kasih!`;
    window.open(`https://wa.me/628123456789?text=${encodeURIComponent(msg)}`);
}

function logoutWarga() {
    sessionStorage.removeItem('warga_login');
    sessionWarga = null;
    document.getElementById('screen-dashboard').classList.add('hidden');
    document.getElementById('screen-login').classList.remove('hidden');
    document.getElementById('lHp').value = ''; document.getElementById('lPass').value = '';
}

function openModal(id) { document.getElementById(id).style.display='flex'; }
function closeModal(id) { document.getElementById(id).style.display='none'; }
window.onload = loadDataWargaPortal;
