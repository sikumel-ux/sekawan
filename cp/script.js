/**
 * TUNTAS Kas Engine - Pure Native Light-Eco Framework
 */

// 1. DATABASE DUMMY (KAS UMUM)
let dataKas = [
    { id: "1", tanggal: "2026-05-20", jenis: "Pemasukan", kategori: "Penjualan Sampah", keterangan: "Setor botol plastik RT 04", nominal: 350000 },
    { id: "2", tanggal: "2026-05-21", jenis: "Pengeluaran", kategori: "Operasional", keterangan: "Bensin armada angkut", nominal: 75000 }
];

// DATA DUMMY IURAN BULANAN PERSONAL (Kewajiban Anggota)
const tarifIuranBulanan = 20000; 
const historiIuranDummy = [
    { bulan: "Januari 2026", lunas: true, nominal: 20000 },
    { bulan: "Februari 2026", lunas: true, nominal: 20000 },
    { bulan: "Maret 2026", lunas: true, nominal: 20000 },
    { bulan: "April 2026", lunas: true, nominal: 20000 },
    { bulan: "Mei 2026", lunas: false, nominal: 0 },
    { bulan: "Juni 2026", lunas: false, nominal: 0 }
];

// DATA PROFILE USER LOGGED IN
const userLogged = {
    nama: "Rian Suryadi",
    no_hp: "0857-1234-5678",
    role: "Anggota RT 04",
    bulan_bergabung: "Juli 2025"
};

// 2. DOM ELEMENT REGISTRATION
const listTransaksiMobile = document.getElementById('list-transaksi-mobile');
const totalPemasukanEl = document.getElementById('total-pemasukan');
const totalPengeluaranEl = document.getElementById('total-pengeluaran');
const totalSaldoEl = document.getElementById('total-saldo');
const formKas = document.getElementById('form-kas');

// 3. TAB ROUTING ENGINE (BOTTOM NAVIGATION CONTROLLER)
const navItems = document.querySelectorAll('.nav-item');
const appTabs = document.querySelectorAll('.app-tab');

navItems.forEach(item => {
    item.addEventListener('click', function() {
        const targetTab = this.getAttribute('data-tab');

        // Ganti status aktif tombol Navigasi
        navItems.forEach(nav => nav.classList.remove('active'));
        this.classList.add('active');

        // Ganti Container Tab yang aktif dilayar
        appTabs.forEach(tab => tab.classList.remove('active'));
        document.getElementById(targetTab).classList.add('active');
    });
});

// 4. FORMATTERS
function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(angka);
}

function formatTanggal(stringTanggal) {
    if (!stringTanggal) return "-";
    const opsi = { day: 'numeric', month: 'short', year: 'numeric' };
    return new Date(stringTanggal).toLocaleDateString('id-ID', opsi);
}

// 5. MATH & RENDER ENGINE (TAB 1 - HOME KAS)
function updateSummary() {
    let pemasukan = 0;
    let pengeluaran = 0;

    dataKas.forEach(item => {
        if (item.jenis === 'Pemasukan') pemasukan += Number(item.nominal);
        else if (item.jenis === 'Pengeluaran') pengeluaran += Number(item.nominal);
    });

    totalPemasukanEl.innerText = formatRupiah(pemasukan);
    totalPengeluaranEl.innerText = formatRupiah(pengeluaran);
    totalSaldoEl.innerText = formatRupiah(pemasukan - pengeluaran);
}

function renderList() {
    listTransaksiMobile.innerHTML = '';

    if (dataKas.length === 0) {
        listTransaksiMobile.innerHTML = `
            <div style="text-align: center; color: #8fa496; padding: 40px 10px;">
                <i class="fa-solid fa-receipt" style="font-size: 32px; margin-bottom: 10px; color: #dbe3de;"></i>
                <p style="font-size: 13px;">Belum ada riwayat transaksi kas.</p>
            </div>
        `;
        return;
    }

    const sortedData = [...dataKas].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

    sortedData.forEach(item => {
        const itemCard = document.createElement('div');
        itemCard.className = 'item-card';

        const isIn = item.jenis === 'Pemasukan';
        itemCard.innerHTML = `
            <div class="item-left">
                <div class="item-badge ${isIn ? 'badge-in' : 'badge-out'}">
                    <i class="${isIn ? 'fa-solid fa-arrow-down' : 'fa-solid fa-arrow-up'}"></i>
                </div>
                <div class="item-meta">
                    <h4>${item.keterangan}</h4>
                    <p>${formatTanggal(item.tanggal)} • ${item.kategori}</p>
                </div>
            </div>
            <div class="item-right">
                <div class="item-nominal ${isIn ? 'text-in' : 'text-out'}">
                    ${isIn ? '+' : '-'}${formatRupiah(item.nominal)}
                </div>
                <button class="btn-item-delete" onclick="hapusTransaksi('${item.id}')">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        `;
        listTransaksiMobile.appendChild(itemCard);
    });
}

// 6. FORM HANDLER (TAB 2 - INPUT)
formKas.addEventListener('submit', function(e) {
    e.preventDefault();

    const tanggal = document.getElementById('tanggal').value;
    const jenis = document.getElementById('jenis').value;
    const kategori = document.getElementById('kategori').value;
    const nominal = parseInt(document.getElementById('nominal').value, 10);
    const keterangan = document.getElementById('keterangan').value;

    const id = Date.now().toString();
    dataKas.push({ id, tanggal, jenis, kategori, keterangan, nominal });

    renderList();
    updateSummary();
    formKas.reset();
    setDefaultDate();

    // Selesai input, auto oper tab ke halaman Home
    document.querySelector('[data-tab="tab-home"]').click();
});

function hapusTransaksi(id) {
    if (confirm("Hapus catatan transaksi kas ini?")) {
        dataKas = dataKas.filter(item => item.id !== id);
        renderList();
        updateSummary();
    }
}

function setDefaultDate() {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().split('T')[0];
    document.getElementById('tanggal').value = localISOTime;
}

// 7. PROFILE & UPLOAD MANAGEMENT (TAB 3 - PROFILE)
function triggerPhotoUpload() {
    document.getElementById('upload-foto-input').click();
}

function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('profile-img').src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function renderHistoriIuran() {
    const listIuranEl = document.getElementById('list-iuran-bulanan');
    const statTotalBayarEl = document.getElementById('stat-total-bayar');
    const statTotalTunggakanEl = document.getElementById('stat-total-tunggakan');
    
    if(!listIuranEl) return;

    let totalBayar = 0;
    let totalTunggakan = 0;
    listIuranEl.innerHTML = '';

    historiIuranDummy.forEach(item => {
        if (item.lunas) {
            totalBayar += item.nominal;
        } else {
            totalTunggakan += tarifIuranBulanan;
        }

        const row = document.createElement('div');
        row.className = 'iuran-item';
        
        row.innerHTML = `
            <span class="iuran-month">${item.bulan}</span>
            <div class="iuran-status ${item.lunas ? 'status-paid' : 'status-unpaid'}">
                <i class="${item.lunas ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-xmark'}"></i>
                <span>${item.lunas ? 'Lunas' : 'Belum Bayar'}</span>
            </div>
        `;
        listIuranEl.appendChild(row);
    });

    statTotalBayarEl.innerText = formatRupiah(totalBayar);
    statTotalTunggakanEl.innerText = formatRupiah(totalTunggakan);
}

function initProfile() {
    document.getElementById('app-bar-role').innerHTML = `<i class="fa-solid fa-user"></i> Warga`;
    document.getElementById('profile-nama').innerText = userLogged.nama;
    document.getElementById('profile-role').innerText = userLogged.role;
    document.getElementById('profile-hp').innerText = userLogged.no_hp;
    document.getElementById('profile-join').innerText = userLogged.bulan_bergabung;
    
    renderHistoriIuran();
}

// 8. INITIALIZE ALL ENGINE
function initApp() {
    setDefaultDate();
    renderList();
    updateSummary();
    initProfile();
}
initApp();
