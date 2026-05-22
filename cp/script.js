/**
 * TUNTAS (Turun Tangan Atasi Sampah) - Kas Engine
 * Desain khusus Mobile-First & Ramah PWA
 */

// 1. DUMMY DATA INITIALIZATION
// Ini buat simulasi visual di browser/HP sebelum nanti dicolok ke Google Apps Script (GAS)
let dataKas = [
    { 
        id: "1", 
        tanggal: "2026-05-20", 
        jenis: "Pemasukan", 
        kategori: "Penjualan Sampah", 
        keterangan: "Setor botol plastik & kardus dari RT 04", 
        nominal: 350000 
    },
    { 
        id: "2", 
        tanggal: "2026-05-21", 
        jenis: "Pengeluaran", 
        kategori: "Operasional", 
        keterangan: "Bensin armada angkut sampah", 
        nominal: 75000 
    },
    { 
        id: "3", 
        tanggal: "2026-05-22", 
        jenis: "Pemasukan", 
        kategori: "Iuran Warga", 
        keterangan: "Iuran bulanan kas kebersihan", 
        nominal: 500000 
    }
];

// 2. DOM ELEMENTS REGISTRATION
const formKas = document.getElementById('form-kas');
const listTransaksi = document.getElementById('list-transaksi');
const totalPemasukanEl = document.getElementById('total-pemasukan');
const totalPengeluaranEl = document.getElementById('total-pengeluaran');
const totalSaldoEl = document.getElementById('total-saldo');

// 3. UTILITY FUNCTIONS (Formatting & Helpers)

/**
 * Mengubah angka murni menjadi format mata uang Rupiah
 * Contoh: 50000 -> Rp 50.000
 */
function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(angka);
}

/**
 * Mengubah format tanggal standar HTML (YYYY-MM-DD) menjadi format lokal Indonesia
 * Contoh: 2026-05-22 -> 22 Mei 2026
 */
function formatTanggal(stringTanggal) {
    if (!stringTanggal) return "-";
    const opsi = { day: 'numeric', month: 'short', year: 'numeric' };
    return new Date(stringTanggal).toLocaleDateString('id-ID', opsi);
}


// 4. CORE FUNCTIONS (Kalkulasi & Render)

/**
 * Menghitung ulang total pemasukan, pengeluaran, dan sisa saldo,
 * kemudian memperbarui teks pada Card Dashboard secara real-time.
 */
function updateSummary() {
    let totalPemasukan = 0;
    let totalPengeluaran = 0;

    dataKas.forEach(item => {
        if (item.jenis === 'Pemasukan') {
            totalPemasukan += Number(item.nominal);
        } else if (item.jenis === 'Pengeluaran') {
            totalPengeluaran += Number(item.nominal);
        }
    });

    const totalSaldo = totalPemasukan - totalPengeluaran;

    // Suntik nilai ke elemen UI HTML
    totalPemasukanEl.innerText = formatRupiah(totalPemasukan);
    totalPengeluaranEl.innerText = formatRupiah(totalPengeluaran);
    totalSaldoEl.innerText = formatRupiah(totalSaldo);
}

/**
 * Membaca data array dan merendernya ke dalam tabel HTML.
 * Data diurutkan secara descending (tanggal terbaru muncul paling atas).
 */
function renderTable() {
    // Bersihkan isi tabel lama agar tidak double render
    listTransaksi.innerHTML = '';

    if (dataKas.length === 0) {
        listTransaksi.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: #a0b0a2; padding: 20px;">
                    <i class="fa-solid fa-box-open" style="display:block; font-size: 24px; margin-bottom: 8px;"></i>
                    Belum ada data transaksi kas.
                </td>
            </tr>
        `;
        return;
    }

    // Sortir: Tanggal terbaru ditaruh paling atas
    const sortedData = [...dataKas].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

    // Iterasi data untuk disuntik ke baris tabel (tr)
    sortedData.forEach(item => {
        const tr = document.createElement('tr');
        
        // Atur styling teks hijau untuk pemasukan, merah untuk pengeluaran
        const kelasJenis = item.jenis === 'Pemasukan' ? 'text-pemasukan' : 'text-pengeluaran';
        const prefixNominal = item.jenis === 'Pemasukan' ? '+' : '-';

        tr.innerHTML = `
            <td>${formatTanggal(item.tanggal)}</td>
            <td class="${kelasJenis}">${item.jenis}</td>
            <td>${item.kategori}</td>
            <td style="white-space: normal; min-width: 150px;">${item.keterangan}</td>
            <td class="${kelasJenis}">${prefixNominal} ${formatRupiah(item.nominal)}</td>
            <td>
                <button class="btn-delete" onclick="hapusTransaksi('${item.id}')" title="Hapus Transaksi">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>
        `;
        listTransaksi.appendChild(tr);
    });
}


// 5. EVENT LISTENERS (Handling Input Form & Hapus)

/**
 * Menangkap event submit dari form input transaksi
 */
formKas.addEventListener('submit', function(e) {
    e.preventDefault(); // Mencegah page refresh bawaan browser

    // Ambil data langsung dari element form
    const tanggal = document.getElementById('tanggal').value;
    const jenis = document.getElementById('jenis').value;
    const kategori = document.getElementById('kategori').value;
    const nominal = parseInt(document.getElementById('nominal').value, 10);
    const keterangan = document.getElementById('keterangan').value;

    // Validasi dasar nominal (PWA Safe Guard)
    if (isNaN(nominal) || nominal <= 0) {
        alert("Harap masukkan nominal angka yang valid, bro.");
        return;
    }

    // Generate ID unik sementara menggunakan timestamp milidetik saat ini
    const id = Date.now().toString();

    // Bungkus jadi object transaksi baru
    const transaksiBaru = { id, tanggal, jenis, kategori, keterangan, nominal };

    // Push ke array data kas lokal
    dataKas.push(transaksiBaru);

    // Perbarui UI tabel dan card dashboard
    renderTable();
    updateSummary();

    // Reset isi form input agar siap dipakai untuk input selanjutnya
    formKas.reset();
    
    // Set ulang tanggal ke hari ini setelah form di-reset
    setDefaultDate();
    
    // Feedback soft di mobile jika dibutuhkan (bisa diganti toast notification nanti)
    console.log("Data berhasil disimpan sementara di local engine.");
});

/**
 * Menghapus transaksi berdasarkan ID uniknya (Simulasi Lokal)
 */
function hapusTransaksi(id) {
    // Alert konfirmasi native yang responsif di mobile browser
    if (confirm("Apakah lo yakin mau menghapus riwayat transaksi kas TUNTAS ini?")) {
        // Filter array, sisakan data yang ID-nya TIDAK cocok dengan yang dihapus
        dataKas = dataKas.filter(item => item.id !== id);
        
        // Segarkan visual halaman
        renderTable();
        updateSummary();
    }
}


// 6. INITIALIZATION RUNNER

/**
 * Mengunci default date input picker agar otomatis mendeteksi tanggal hari ini (Waktu Lokal)
 */
function setDefaultDate() {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000; // Offset zona waktu lokal
    const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().split('T')[0];
    document.getElementById('tanggal').value = localISOTime;
}

/**
 * Fungsi yang pertama kali di-fire saat aplikasi PWA dimuat di browser / HP
 */
function initAplikasi() {
    setDefaultDate(); // Set tanggal otomatis hari ini
    renderTable();    // Cetak tabel kas awal
    updateSummary();  // Hitung total saldo awal
}

// Jalankan sistem kas
initAplikasi();
