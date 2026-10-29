/**
 * ==============================================================================
 * LOGIKA LOGIN PORTAL GARDU DISTRIBUSI DK-186
 * Username: up3cengkareng
 * Password: pdkb123
 * ==============================================================================
 */

// Kredensial Resmi
const VALID_USER = "up3cengkareng";
const VALID_PASS = "pdkb123";

// --- LIVE CLOCK UPDATER ---
function updateLoginClock() {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')} WIB`;
    const elClock = document.getElementById('loginClock');
    if (elClock) elClock.textContent = timeStr;
}

// --- TOGGLE PASSWORD VISIBILITY ---
function togglePasswordVisibility() {
    const pwdInput = document.getElementById('password');
    const toggleIcon = document.getElementById('togglePwdIcon');
    
    if (pwdInput.type === 'password') {
        pwdInput.type = 'text';
        toggleIcon.className = 'fa-regular fa-eye-slash';
        toggleIcon.title = 'Sembunyikan Password';
    } else {
        pwdInput.type = 'password';
        toggleIcon.className = 'fa-regular fa-eye';
        toggleIcon.title = 'Lihat Password';
    }
}

// --- HELPER UNTUK MENGISI KREDENSIAL DENGAN CEPAT ---
function fillDemoCredentials() {
    document.getElementById('username').value = VALID_USER;
    document.getElementById('password').value = VALID_PASS;
    hideAlert();
}

function fillUsername(val) {
    document.getElementById('username').value = val;
    hideAlert();
}

function fillPassword(val) {
    document.getElementById('password').value = val;
    hideAlert();
}

// --- ALERT NOTIFIKASI ---
function showAlert(message) {
    const alertBox = document.getElementById('alertBox');
    const alertMsg = document.getElementById('alertMessage');
    if (alertBox && alertMsg) {
        alertMsg.textContent = message;
        alertBox.style.display = 'flex';
        // Trigger shake re-animation
        alertBox.style.animation = 'none';
        void alertBox.offsetWidth; // reflow
        alertBox.style.animation = 'shakeError 0.4s ease-in-out';
    }
}

function hideAlert() {
    const alertBox = document.getElementById('alertBox');
    if (alertBox) alertBox.style.display = 'none';
}

// --- LOGIN HANDLER ---
function handleLogin(event) {
    event.preventDefault();
    hideAlert();

    const usernameInput = document.getElementById('username').value.trim().toLowerCase();
    const passwordInput = document.getElementById('password').value.trim();

    const btn = document.getElementById('btnLogin');
    const btnText = document.getElementById('btnText');
    const btnIcon = document.getElementById('btnIcon');
    const btnSpinner = document.getElementById('btnSpinner');

    // Validasi input
    if (usernameInput === VALID_USER && passwordInput === VALID_PASS) {
        // Tampilkan animasi verifikasi sukses
        btn.disabled = true;
        btnText.textContent = "MEMVERIFIKASI AKSES...";
        btnIcon.style.display = "none";
        btnSpinner.style.display = "inline-block";

        // Simpan sesi autentikasi ke sessionStorage
        sessionStorage.setItem('gardu_dk186_auth', 'true');
        sessionStorage.setItem('gardu_dk186_user', usernameInput);

        // Jika opsi "Ingat saya" dicentang, simpan di localStorage
        const rememberMe = document.getElementById('rememberMe');
        if (rememberMe && rememberMe.checked) {
            localStorage.setItem('gardu_dk186_remembered_user', usernameInput);
        }

        setTimeout(() => {
            btn.style.background = "linear-gradient(135deg, #10b981 0%, #059669 100%)";
            btnText.textContent = "AKSES DIIZINKAN!";
            btnSpinner.style.display = "none";
            btnIcon.className = "fa-solid fa-check";
            btnIcon.style.display = "inline-block";

            // Redirect ke Dashboard Utama
            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 600);
        }, 500);

    } else {
        // Kredensial Salah
        showAlert("Username atau Password salah! Periksa kembali kredensial Anda.");
        const pwdField = document.getElementById('password');
        pwdField.value = "";
        pwdField.focus();
    }
}

// Inisialisasi saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
    updateLoginClock();
    setInterval(updateLoginClock, 1000);

    // Cek jika ada remembered user sebelumnya
    const rememberedUser = localStorage.getItem('gardu_dk186_remembered_user');
    if (rememberedUser) {
        const usernameEl = document.getElementById('username');
        if (usernameEl && !usernameEl.value) {
            usernameEl.value = rememberedUser;
        }
    }
});
