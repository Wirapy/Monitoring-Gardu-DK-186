/**
 * ===================================================================
 * KONFIGURASI FIREBASE REALTIME DATABASE - GARDU DISTRIBUSI DK-186
 * & SISTEM MONITORING SUMBER ENERGI HYBRID (PLN - PLTS - BATERAI)
 * ===================================================================
 * Menggunakan 1 URL link Firebase yang sama untuk seluruh telemetri,
 * dengan 2 node path:
 * 1. basePath   : "gardu_dk186" (Data 9 Parameter Feeder 1 & Feeder 2)
 * 2. hybridPath : "hybrid"      (Data Sumber PLN, Inverter, PLTS, Baterai)
 */

window.FIREBASE_CONFIG = {
    // 1 URL Firebase Realtime Database yang sama:
    databaseURL: "https://monitoring-gardu-dk-186-default-rtdb.asia-southeast1.firebasedatabase.app/",

    // Node path di Realtime Database untuk Gardu Distribusi DK-186 (PHB-TR 2 Feeder)
    basePath: "gardu_dk186",

    // Node path di Realtime Database untuk Sistem Sumber Energi Hybrid (PLN, Inverter, PLTS, Baterai)
    hybridPath: "hybrid",

    // Interval update simulasi (ms) jika mode simulasi aktif (Zero Delay)
    simulationInterval: 400
};
