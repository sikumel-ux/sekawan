const API_URL =
'https://script.google.com/macros/s/AKfycbxv9xeWPqNdqrl7yiY-8mN9IZV9bVTNwk78k-klWiG330wjzvuhIb78JRGtJvm7Yep9Pg/exec';

let chart;

/* =========================
   LOGIN CHECK
========================= */

const user =
JSON.parse(
  localStorage.getItem('user')
);

if(
  !user ||
  user.role !== 'admin'
){

  window.location.href =
  'login.html';

}

/* =========================
   LOGOUT
========================= */

function logout(){

  localStorage.clear();

  window.location.href =
  'login.html';

}

/* =========================
   FORMAT RUPIAH
========================= */

function rupiah(angka){

  return new Intl.NumberFormat(
    'id-ID',
    {
      style:'currency',
      currency:'IDR'
    }
  ).format(angka);

}

/* =========================
   LOAD DATA
========================= */

async function loadData(){

  try{

    const response =
    await fetch(API_URL);

    const data =
    await response.json();

    renderData(data);

  }catch(error){

    console.log(error);

    alert(
      'Gagal mengambil data'
    );

  }

}

/* =========================
   RENDER DATA
========================= */

function renderData(data){

  let totalMasuk = 0;
  let totalKeluar = 0;

  const list =
  document.getElementById(
    'listTransaksi'
  );

  list.innerHTML = '';

  data.reverse().forEach(item => {

    const nominal =
    Number(item.nominal);

    const isMasuk =
    item.jenis === 'Masuk';

    if(isMasuk){

      totalMasuk += nominal;

    }else{

      totalKeluar += nominal;

    }

    list.innerHTML += `

      <div class="transaksi-item">

        <div class="transaksi-left">

          <div class="icon ${
            isMasuk ? 'in' : 'out'
          }">

            ${
              isMasuk ? '⬇️' : '⬆️'
            }

          </div>

          <div class="transaksi-info">

            <h3>
              ${item.kategori}
            </h3>

            <p>
              ${item.keterangan}
            </p>

            <small>
              ${item.tanggal}
            </small>

          </div>

        </div>

        <div class="right-area">

          <div class="nominal ${
            isMasuk ? 'in' : 'out'
          }">

            ${rupiah(nominal)}

          </div>

          <button
            class="delete-btn"
            onclick="hapus('${item.id}')">

            Hapus

          </button>

        </div>

      </div>

    `;

  });

  /* HOME */

  document.getElementById(
    'masuk'
  ).innerText =
  rupiah(totalMasuk);

  document.getElementById(
    'keluar'
  ).innerText =
  rupiah(totalKeluar);

  document.getElementById(
    'saldo'
  ).innerText =
  rupiah(
    totalMasuk - totalKeluar
  );

  /* LAPORAN */

  document.getElementById(
    'lapMasuk'
  ).innerText =
  rupiah(totalMasuk);

  document.getElementById(
    'lapKeluar'
  ).innerText =
  rupiah(totalKeluar);

  document.getElementById(
    'lapSaldo'
  ).innerText =
  rupiah(
    totalMasuk - totalKeluar
  );

  /* CHART */

  renderChart(
    totalMasuk,
    totalKeluar
  );

}

/* =========================
   CHART
========================= */

function renderChart(
  masuk,
  keluar
){

  const ctx =
  document.getElementById(
    'chart'
  );

  if(chart){

    chart.destroy();

  }

  chart = new Chart(ctx, {

    type:'doughnut',

    data:{

      labels:[
        'Masuk',
        'Keluar'
      ],

      datasets:[{

        data:[
          masuk,
          keluar
        ],

        borderRadius:12

      }]

    },

    options:{

      responsive:true,

      plugins:{

        legend:{
          position:'bottom'
        }

      }

    }

  });

}

/* =========================
   FILTER TANGGAL
========================= */

async function filterTanggal(){

  const start =
  document.getElementById(
    'startDate'
  ).value;

  const end =
  document.getElementById(
    'endDate'
  ).value;

  try{

    const response =
    await fetch(API_URL);

    const data =
    await response.json();

    const filtered =
    data.filter(item => {

      const tanggal =
      new Date(item.tanggal);

      return (

        (!start ||
          tanggal >= new Date(start))

        &&

        (!end ||
          tanggal <= new Date(end))

      );

    });

    renderData(filtered);

  }catch(error){

    console.log(error);

    alert(
      'Filter gagal'
    );

  }

}

/* =========================
   TOGGLE MODAL
========================= */

function toggleModal(){

  document
  .getElementById('modal')
  .classList
  .toggle('hidden');

}

/* =========================
   SIMPAN DATA
========================= */

async function simpan(){

  const tanggal =
  document.getElementById(
    'tanggal'
  ).value;

  const jenis =
  document.getElementById(
    'jenis'
  ).value;

  const kategori =
  document.getElementById(
    'kategori'
  ).value;

  const keterangan =
  document.getElementById(
    'keterangan'
  ).value;

  const nominal =
  document.getElementById(
    'nominal'
  ).value;

  if(
    !tanggal ||
    !kategori ||
    !keterangan ||
    !nominal
  ){

    alert(
      'Lengkapi form dulu'
    );

    return;

  }

  const payload = {

    action:'simpan',

    tanggal,
    jenis,
    kategori,
    keterangan,
    nominal

  };

  try{

    await fetch(API_URL, {

      method:'POST',

      headers:{
        'Content-Type':
        'application/json'
      },

      body:JSON.stringify(payload)

    });

    alert(
      'Data berhasil disimpan'
    );

    toggleModal();

    document.getElementById(
      'tanggal'
    ).value = '';

    document.getElementById(
      'kategori'
    ).value = '';

    document.getElementById(
      'keterangan'
    ).value = '';

    document.getElementById(
      'nominal'
    ).value = '';

    loadData();

  }catch(error){

    console.log(error);

    alert(
      'Gagal menyimpan data'
    );

  }

}

/* =========================
   HAPUS DATA
========================= */

async function hapus(id){

  const yakin =
  confirm(
    'Hapus transaksi ini?'
  );

  if(!yakin) return;

  try{

    await fetch(API_URL, {

      method:'POST',

      headers:{
        'Content-Type':
        'application/json'
      },

      body:JSON.stringify({

        action:'hapus',

        id:id

      })

    });

    loadData();

  }catch(error){

    console.log(error);

    alert(
      'Gagal menghapus data'
    );

  }

}

/* =========================
   NAVIGATION
========================= */

function showPage(
  page,
  element
){

  document
  .querySelectorAll('.page')
  .forEach(el => {

    el.classList.remove(
      'active-page'
    );

  });

  document
  .querySelectorAll('.nav-item')
  .forEach(el => {

    el.classList.remove(
      'active'
    );

  });

  document
  .getElementById(
    page + 'Page'
  )
  .classList.add(
    'active-page'
  );

  element.classList.add(
    'active'
  );

}

/* =========================
   INIT
========================= */

loadData();
