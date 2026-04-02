// CONFIG (Sama dengan app-warga.js)
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

// 1. SAVE KAS UMUM
async function saveKas() {
    const ket = document.getElementById('kasKet').value;
    const nom = document.getElementById('kasNom').value;
    const kat = document.getElementById('kasKat').value;
    const tglRaw = document.getElementById('kasTgl').value;

    if(!ket || !nom || !tglRaw) return alert('Isi semua field, bro!');

    try {
        await db.collection("kas").add({
            ket: ket.toUpperCase(),
            nom: Number(nom),
            kat: kat,
            tgl: firebase.firestore.Timestamp.fromDate(new Date(tglRaw)),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert('Data Kas Berhasil Disimpan!');
        location.reload();
    } catch (e) { console.error(e); }
}

// 2. SAVE BERITA (BLOG)
async function saveNews() {
    const judul = document.getElementById('newsJudul').value;
    const img = document.getElementById('newsImg').value;
    const isi = document.getElementById('newsIsi').value;
    const tglRaw = document.getElementById('newsTgl').value;

    if(!judul || !img || !isi || !tglRaw) return alert('Lengkapi berita dulu, bro!');

    // Format tanggal untuk tampilan UI Warga (DD - MM - YYYY)
    const d = new Date(tglRaw);
    const formattedDate = `${d.getDate().toString().padStart(2, '0')} - ${(d.getMonth()+1).toString().padStart(2, '0')} - ${d.getFullYear()}`;

    try {
        await db.collection("berita").add({
            judul: judul.toUpperCase(),
            img: img,
            isi: isi,
            tgl: formattedDate,
            createdAt: firebase.firestore.Timestamp.fromDate(new Date(tglRaw))
        });
        alert('Berita Giat Warga Berhasil Publish!');
        location.reload();
    } catch (e) { console.error(e); }
}

// 3. SAVE IURAN WARGA
async function saveIuran() {
    const nama = document.getElementById('iurNama').value;
    const nom = document.getElementById('iurNom').value;
    const bulan = document.getElementById('iurBulan').value;

    if(!nama || !nom || !bulan) return alert('Data iuran belum lengkap!');

    try {
        await db.collection("pembayaran").add({
            nama: nama.toUpperCase(),
            nom: Number(nom),
            bulan: bulan, // Simpan format 2026-04
            tgl: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert('Iuran Warga Tercatat!');
        location.reload();
    } catch (e) { console.error(e); }
}
