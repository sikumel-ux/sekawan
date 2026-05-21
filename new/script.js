const API_URL =
  'YOUR_GOOGLE_APPS_SCRIPT_WEBAPP_URL';

let chart;

async function getData() {

  const res =
    await fetch(API_URL);

  const data =
    await res.json();

  renderData(data);

}

function renderData(data) {

  let totalMasuk = 0;
  let totalKeluar = 0;

  const list =
    document.getElementById('listTransaksi');

  list.innerHTML = '';

  data.reverse().forEach(item => {

    if (item.jenis === 'Masuk') {
      totalMasuk += item.nominal;
    } else {
      totalKeluar += item.nominal;
    }

    list.innerHTML += `

      <div class="transaksi-item">

        <h3>${item.kategori}</h3>

        <p>${item.keterangan}</p>

        <strong>
          Rp${item.nominal.toLocaleString('id-ID')}
        </strong>

      </div>

    `;

  });

  document.getElementById('masuk').innerText =
    `Rp${totalMasuk.toLocaleString('id-ID')}`;

  document.getElementById('keluar').innerText =
    `Rp${totalKeluar.toLocaleString('id-ID')}`;

  document.getElementById('saldo').innerText =
    `Rp${(totalMasuk-totalKeluar).toLocaleString('id-ID')}`;

}

function toggleModal() {

  document
    .getElementById('modal')
    .classList
    .toggle('hidden');

}

function toggleDarkMode() {

  document.body
    .classList
    .toggle('dark');

}

getData();
