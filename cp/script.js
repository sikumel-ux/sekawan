// Dummy Data awal untuk simulasi visual sebelum dicolok GAS
let dataKas = [
    { id: "1", tanggal: "2026-05-20", jenis: "Pemasukan", kategori: "Iuran Warga", keterangan: "Iuran rutin RT 04", nominal: 250000 },
    { id: "2", tanggal: "2026-05-21", jenis: "Pengeluaran", kategori: "Operasional", keterangan: "Beli bensin truck sampah", nominal: 50000 }
];

// DOM Elements
const formKas = document.getElementById('form-kas');
const listTransaksi = document.getElementById('list-transaksi');
const totalPemasukanEl = document.getElementById('total-pemasukan');
const totalPengeluaranEl = document.getElementById('total-pengeluaran');
const totalSaldoEl = document.getElementById('total-saldo');

// Format Angka ke Rupiah
function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(angka);
}

// Hitung Rekap & Update Cards UI
function updateSummary() {
    let pemasukan = 0;
    let pengeluaran = 0;

    dataKas.forEach(item => {
        if (item.jenis === 'Pemasukan') {
            pemasukan += item.nominal;
        } else {
            pengeluaran += item.nominal;
        }
    });

    const saldo = pemasukan - pengeluaran;

    totalPemasukanEl.innerText = formatRupiah(pemasukan);
    totalPengeluaranEl.innerText = formatRupiah(pengeluaran);
    totalSaldoEl.innerText = formatRupiah(saldo);
}

// Render Data ke Tabel
function renderTable() {
    listTransaksi.innerHTML = '';

    // Urutkan berdasarkan tanggal terbaru
    const sortedData = [...dataKas].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

    sortedData.forEach(item => {
        const tr = document.createElement('tr');
        
        const kelasJenis = item.jenis === 'Pemasukan' ? 'text-pemasukan' : 'text-pengeluaran';
        const prefixNominal = item.jenis === 'Pemasukan' ? '+' : '-';

        tr.innerHTML = `
            <td>${formatTanggal(item.tanggal)}</td>
            <td class="${kelasJenis}">${item.jenis}</td>
            <td>${item.kategori}</td>
            <td>${item.keterangan}</td>
            <td class="${kelasJenis}">${prefixNominal} ${formatRupiah(item.nominal)}</td>
            <td>
                <button class="btn-delete" onclick="hapusTransaksi('${item.id}')" title="Hapus">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        listTransaksi.appendChild(tr);
    });
}

// Format Tanggal YYYY-MM-DD ke DD MMM YYYY
function formatTanggal(stringTanggal) {
    const opsi = { day: 'numeric', month: 'short', year: 'numeric' };
    return new Date(stringTanggal).toLocaleDateString('id-ID', opsi);
}

// Handle Form Submit (Tambah Transaksi)
formKas.addEventListener('submit', function(e) {
    e.preventDefault();

    const tanggal = document.getElementById('tanggal').value;
    const jenis = document.getElementById('jenis').value;
    const kategori = document.getElementById('kategori').value;
    const nominal = parseInt(document.getElementById('nominal').value);
    const keterangan = document.getElementById('keterangan').value;

    // Generate ID unik sementara menggunakan timestamp
    const id = Date.now().toString();

    const transaksiBaru = { id, tanggal, jenis, kategori, keterangan, nominal };

    // Tambah data ke array dummy
    dataKas.push(transaksiBaru);

    // Refresh UI
    renderTable();
    updateSummary();

    // Reset Form
    formKas.reset();
});

// Handle Hapus Transaksi (Simulasi)
function hapusTransaksi(id) {
    if(confirm("Apakah Anda yakin ingin menghapus transaksi ini?")) {
        dataKas = dataKas.filter(item => item.id !== id);
        renderTable();
        updateSummary();
    }
}

// Inisialisasi Aplikasi pertama kali running
function init() {
    // Set default input tanggal ke hari ini
    document.getElementById('tanggal').valueToDate = new Date();
    
    renderTable();
    updateSummary();
}

init();
