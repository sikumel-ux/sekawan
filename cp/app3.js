// =========================================================================
// PASTE KODE DI BAWAH INI UNTUK MENGGANTI FUNGSI GANTI PASSWORD & FOTO PRIBADI
// =========================================================================

// 1. PROSES GANTI PASSWORD (FIXED POST METHOD)
async function prosesGantiPassword() {
    const passBaru = document.getElementById('newPass').value.trim();
    if(!passBaru) {
        tampilAlert("Gagal", "Kolom kata sandi baru tidak boleh kosong!", false);
        return;
    }

    showLoading();
    try {
        // Data dibungkus dalam objek JSON sesuai kebutuhan backend Apps Script
        let dataPaketSandi = {
            action: "gantiPassword",
            hp: sessionWarga.hp.toString().trim(),
            passwordBaru: passBaru
        };

        let res = await fetch(SCRIPT_URL, { 
            method: "POST",
            mode: "cors",
            redirect: "follow",
            body: JSON.stringify(dataPaketSandi) // Dikirim via body, bukan URL parameter
        });
        
        let json = await res.json();
        if(json.status === "success") {
            localStorage.setItem('tuntas_warga_pw', passBaru);
            sessionWarga.password = passBaru; // Update session lokal
            document.getElementById('newPass').value = "";
            closeModal('mKeamanan');
            tampilAlert("Sandi Diperbarui", "Kata sandi akun Anda sukses diubah, bro!", true);
        } else {
            tampilAlert("Gagal", json.message || "Gagal memperbarui password di server.", false);
        }
    } catch(e) {
        console.error(e);
        tampilAlert("Error", "Gagal melakukan koneksi untuk ganti password.", false);
    } finally {
        hideLoading();
    }
}

// 2. PROSES UNGGAH FOTO PROFIL (NEW FUNCTION)
async function uploadFotoProfil(input) {
    if (!input.files || !input.files[0]) return;
    
    const file = input.files[0];
    const reader = new FileReader();
    
    showLoading();
    
    reader.onload = async function(e) {
        const base64Data = e.target.result.split(',')[1];
        try {
            let dataPaketFoto = {
                action: "updateFoto",
                hp: sessionWarga.hp.toString().trim(),
                filename: file.name,
                mimeType: file.type,
                fileData: base64Data
            };

            let res = await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'cors',
                redirect: 'follow',
                body: JSON.stringify(dataPaketFoto)
            });
            
            let json = await res.json();
            
            if(json.status === "success" || json.url) {
                let linkBaru = json.url;
                
                // Setel link foto baru ke session lokal agar langsung tersinkron
                sessionWarga.foto = linkBaru;
                if(sessionWarga.Foto) sessionWarga.Foto = linkBaru;

                // Ganti tampilan avatar secara real-time di UI
                document.getElementById('avatarWarga').src = e.target.result; 
                tampilAlert("Sukses", "Foto profil berhasil diperbarui, bro!", true);
            } else {
                tampilAlert("Gagal", json.message || "Server gagal menyimpan berkas gambar.", false);
            }
        } catch(err) {
            console.error(err);
            tampilAlert("Error", "Gagal mengunggah foto profil.", false);
        } finally {
            hideLoading();
        }
    };
    reader.readAsDataURL(file);
}

// 3. LOGOUT WARGA
function logoutWarga() {
    localStorage.removeItem('tuntas_warga_hp');
    localStorage.removeItem('tuntas_warga_pw');
    sessionWarga = null;
    document.getElementById('screen-dashboard').classList.add('hidden');
    document.getElementById('screen-login').classList.remove('hidden');
    document.getElementById('lHp').value = "";
}

// CEK AUTO LOGIN SAAT HALAMAN DIBUKA (FIRST INITIALIZATION)
window.onload = async function() {
    const savedHp = localStorage.getItem('tuntas_warga_hp');
    const savedPw = localStorage.getItem('tuntas_warga_pw');

    if(savedHp && savedPw) {
        let suksesLoad = await ambilDataZSheets();
        if(suksesLoad) {
            const cocok = dbGlobal.anggota.find(u => 
                (u.hp || '').toString().trim() === savedHp && 
                (u.password || '').toString().trim() === savedPw
            );
            if(cocok) {
                sessionWarga = cocok;
                bukaDashboardWarga();
                return;
            }
        }
        localStorage.clear();
    }
    hideLoading();
};
