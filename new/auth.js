const API_LOGIN =
  'YOUR_APPS_SCRIPT_WEBAPP_URL';

async function login() {

  const email =
    document.getElementById('email').value;

  const password =
    document.getElementById('password').value;

  const res =
    await fetch(API_LOGIN, {

      method: 'POST',

      body: JSON.stringify({
        action: 'login',
        email,
        password
      })

    });

  const data =
    await res.json();

  if (data.success) {

    localStorage.setItem(
      'user',
      JSON.stringify(data.user)
    );

    if (data.user.role === 'admin') {

      window.location.href =
        'admin.html';

    } else {

      window.location.href =
        'anggota.html';

    }

  } else {

    alert('Email atau password salah');

  }

}

function logout() {

  localStorage.clear();

  window.location.href =
    'login.html';

}

function checkAdmin() {

  const user =
    JSON.parse(localStorage.getItem('user'));

  if (!user || user.role !== 'admin') {

    window.location.href =
      'login.html';

  }

}

function checkAnggota() {

  const user =
    JSON.parse(localStorage.getItem('user'));

  if (!user) {

    window.location.href =
      'login.html';

  }

}
