/**
 * ===================================================================
 * KONFIGURASI FIREBASE REALTIME DATABASE - GARDU DISTRIBUSI DK-186
 * ===================================================================
 * Anda dapat memasukkan URL Firebase Realtime Database Anda di bawah ini.
 * Jika dibiarkan kosong, dashboard otomatis berjalan dalam MODE SIMULASI (DEMO),
 * sehingga tampilan dapat langsung dicoba dan dipresentasikan di Laptop & HP!
 */

window.FIREBASE_CONFIG = {
    // Masukkan URL Firebase Realtime Database Anda, contoh:
    // databaseURL: "https://monitoring-gardu-dk186-default-rtdb.firebaseio.com"
    databaseURL: "https://monitoring-gardu-dk-186-default-rtdb.asia-southeast1.firebasedatabase.app/",

    // Node path di Realtime Database untuk Gardu DK-186
    basePath: "gardu_dk186",

    // Interval update simulasi (ms) jika mode simulasi aktif (Zero Delay)
    simulationInterval: 400
};
