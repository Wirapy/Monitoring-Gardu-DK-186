/**
 * ==============================================================================
 * DASHBOARD TELEMETRI GARDU DISTRIBUSI DK-186 (PHB-TR 2 FEEDER)
 * Responsive Web Mobile & Desktop Dashboard with Realtime Sync & Simulation
 * ==============================================================================
 */

// --- GLOBAL APPLICATION STATE ---
const SubstationState = {
    mode: 'firebase',
    firebaseUrl: 'https://monitoring-gardu-dk-186-default-rtdb.asia-southeast1.firebasedatabase.app',
    firebasePath: 'gardu_dk186',
    hybridPath: 'hybrid',
    activeView: 'all', // 'all' | 'f1' | 'f2'
    pollingTimer: null,
    simTimer: null,
    eventSource: null,
    hybridEventSource: null,
    data: {
        f1: {
            vrn: 220.5, vsn: 221.2, vtn: 219.8,
            vrs: 381.8, vst: 382.4, vtr: 380.6,
            ir: 142.5, is: 138.2, it: 135.0, in: 7.8,
            p: 91.2, q: 34.5, s: 97.5,
            pf: 0.93, freq: 50.02, energy: 384.25,
            temp_trafo: 54.6, temp_fuse: 44.2, temp: 54.6,
            load_pct: 46.4,
            status: 'NORMAL'
        },
        f2: {
            vrn: 221.8, vsn: 220.4, vtn: 221.0,
            vrs: 383.1, vst: 381.2, vtr: 382.5,
            ir: 126.4, is: 131.0, it: 124.8, in: 6.2,
            p: 82.6, q: 29.4, s: 87.7,
            pf: 0.94, freq: 50.01, energy: 342.10,
            temp_trafo: 51.8, temp_fuse: 41.5, temp: 51.8,
            load_pct: 41.7,
            status: 'NORMAL'
        },
        source: {
            mode: 'live', // 'live' | 'photo'
            pln: { status: 'NORMAL', v: 220.4, i: 5.20, p: 1146.0, f: 50.0, pf: 0.96 },
            inverter: { status: 'AKTIF', v: 220.0, i: 3.15, p: 693.0, f: 50.0, pf: 0.98 },
            plts: { status: 'CHARGING', v: 18.50, i: 2.850, p: 52.72, panel: 'Panel 50 Wp', output: 85.0 },
            baterai: { status: 'NORMAL', v: 12.85, i: 1.620, p: 20.81, soc: 95.0 },
            beban: 'BEBAN: NORMAL (250 W)',
            system: 'NORMAL',
            wifi: 'WiFi ONLINE'
        }
    }
};

// --- CHART INSTANCES ---
let f1RtChart = null, f2RtChart = null;

// ==============================================================================
// 1. CLOCK & TIME UPDATER (REAL-TIME WAKTU DUNIA TANPA DELAY)
// ==============================================================================
function updateTopClock() {
    const now = new Date();
    const hrs = now.getHours().toString().padStart(2, '0');
    const mins = now.getMinutes().toString().padStart(2, '0');
    const secs = now.getSeconds().toString().padStart(2, '0');

    // 1. Top Clock Header (Format: HH:MM:SS WIB)
    const timeStrWib = `${hrs}:${mins}:${secs} WIB`;
    const elClock = document.getElementById('top-clock');
    if (elClock && elClock.textContent !== timeStrWib) {
        elClock.textContent = timeStrWib;
    }

    // 2. Feeder 1 & Feeder 2 Update Terakhir: Tepat Real-Time Dunia Detik demi Detik Tanpa Delay
    // Menggunakan format titik HH.MM.SS sesuai standar Indonesia (contoh: 18.25.23)
    const timeStrWorld = `${hrs}.${mins}.${secs}`;
    const f1Last = document.getElementById('f1-last-time');
    if (f1Last && f1Last.textContent !== timeStrWorld) {
        f1Last.textContent = timeStrWorld;
    }
    const f2Last = document.getElementById('f2-last-time');
    if (f2Last && f2Last.textContent !== timeStrWorld) {
        f2Last.textContent = timeStrWorld;
    }

    // 3. Update Uptime Parameter Sumber secara Real-Time detik demi detik
    updateSourceUptime();
}

// ==============================================================================
// 2. DEVICE & FEEDER NAVIGATION (DESKTOP & MOBILE)
// ==============================================================================
function selectFeederView(view) {
    SubstationState.activeView = view;
    const f1Section = document.getElementById('feeder-1-section');
    const f2Section = document.getElementById('feeder-2-section');
    const sourceSection = document.getElementById('source-parameters-section');
    const kpiRow = document.querySelector('.kpi-row');

    // Update Segmented Tab Buttons
    document.querySelectorAll('.segment-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-segment') === view);
    });

    // Update Sidebar Navigation
    document.querySelectorAll('.sidebar-menu .menu-item[data-view]').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-view') === view);
    });

    // Update Mobile Bottom Nav
    document.querySelectorAll('.bottom-nav-item[data-view]').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-view') === view);
    });

    // Toggle Visibility - Tampilan Gambar 2 HANYA muncul saat view === 'source' dan TIDAK muncul di Overview Gardu
    if (view === 'all') {
        if (f1Section) f1Section.style.display = 'block';
        if (f2Section) f2Section.style.display = 'block';
        if (sourceSection) sourceSection.style.display = 'none';
        if (kpiRow) kpiRow.style.display = 'grid';
    } else if (view === 'f1') {
        if (f1Section) f1Section.style.display = 'block';
        if (f2Section) f2Section.style.display = 'none';
        if (sourceSection) sourceSection.style.display = 'none';
        if (kpiRow) kpiRow.style.display = 'grid';
        f1Section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (view === 'f2') {
        if (f1Section) f1Section.style.display = 'none';
        if (f2Section) f2Section.style.display = 'block';
        if (sourceSection) sourceSection.style.display = 'none';
        if (kpiRow) kpiRow.style.display = 'grid';
        f2Section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (view === 'source') {
        if (f1Section) f1Section.style.display = 'none';
        if (f2Section) f2Section.style.display = 'none';
        if (kpiRow) kpiRow.style.display = 'none';
        if (sourceSection) {
            sourceSection.style.display = 'flex';
            sourceSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            renderSourceTelemetry();
        }
    }

    // Auto-close sidebar on mobile
    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.remove('open');
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
}

// Close sidebar on outside click on mobile
document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('mobileNavToggle');
    if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
        if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    }
});

function focusParameter(paramType) {
    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.remove('open');
    }
    const targetSection = document.getElementById('feeder-1-section');
    if (targetSection) {
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// ==============================================================================
// 3. UI RENDERING & CIRCULAR GAUGE LOGIC
// ==============================================================================
function updateGauge(circleId, pctValId, percent) {
    const circle = document.getElementById(circleId);
    const text = document.getElementById(pctValId);
    if (!circle || !text) return;

    // Circumference for r=42: 2 * PI * 42 = 263.89
    const maxOffset = 264;
    const clampedPct = Math.min(Math.max(percent, 0), 100);
    const offset = maxOffset - (maxOffset * (clampedPct / 100));

    circle.style.strokeDashoffset = offset;
    text.textContent = `${clampedPct.toFixed(1)}%`;

    // Dynamic color based on loading condition
    if (clampedPct < 60) {
        circle.style.stroke = 'var(--c-green)';
    } else if (clampedPct < 80) {
        circle.style.stroke = 'var(--c-amber)';
    } else {
        circle.style.stroke = 'var(--c-red)';
    }
}

function renderTelemetryUI() {
    const { f1, f2 } = SubstationState.data;
    const now = new Date();
    const hrs = now.getHours().toString().padStart(2, '0');
    const mins = now.getMinutes().toString().padStart(2, '0');
    const secs = now.getSeconds().toString().padStart(2, '0');
    const nowStr = `${hrs}.${mins}.${secs}`;

    // --- RENDER FEEDER 1 (9 PARAMETERS) ---
    // 1. Arus (Current A)
    setText('f1-ir', f1.ir.toFixed(1));
    setText('f1-is', f1.is.toFixed(1));
    setText('f1-it', f1.it.toFixed(1));
    setText('f1-in', f1.in.toFixed(1));

    // 2. Tegangan (Voltage V)
    setText('f1-vrn', f1.vrn.toFixed(1));
    setText('f1-vsn', f1.vsn.toFixed(1));
    setText('f1-vtn', f1.vtn.toFixed(1));
    setText('f1-vrs', f1.vrs.toFixed(1));
    setText('f1-vst', f1.vst.toFixed(1));
    setText('f1-vtr', f1.vtr.toFixed(1));

    // 3. Daya Aktif (P in kW)
    setText('f1-p', `${f1.p.toFixed(2)} kW`);
    // 4. Daya Reaktif (Q in kVAR)
    setText('f1-q', `${f1.q.toFixed(2)} kVAR`);
    // 5. Daya Semu (S in kVA)
    setText('f1-s', `${f1.s.toFixed(2)} kVA`);
    setText('f1-val-kva', `${f1.s.toFixed(1)} kVA`);
    // 6. Faktor Daya (PF)
    setText('f1-pf', f1.pf.toFixed(2));
    // 7. Frekuensi (Hz)
    setText('f1-freq', `${f1.freq.toFixed(2)} Hz`);
    // 8. Energi (kWh)
    setText('f1-energy', `${f1.energy.toFixed(1)} kWh`);
    // 9. Suhu Trafo & Suhu NH Fuse PHB-TR (Feeder 1)
    const f1Trafo = f1.temp_trafo !== undefined ? f1.temp_trafo : (f1.temp || 52);
    const f1Fuse = f1.temp_fuse !== undefined ? f1.temp_fuse : (f1.temp || 44);
    setText('f1-val-temp-trafo', `${f1Trafo.toFixed(1)} °C`);
    setText('f1-val-temp-fuse', `${f1Fuse.toFixed(1)} °C`);
    setText('f1-val-temp', `${f1Fuse.toFixed(1)} °C`); // Fallback compatibility
    updateGauge('f1-gauge-circle', 'f1-val-load-pct', f1.load_pct);

    // Feeder 1 Suhu Badges
    updateTempBadge('f1-temp-trafo-badge', f1Trafo, 65, 85);
    updateTempBadge('f1-temp-fuse-badge', f1Fuse, 55, 75);
    updateTempBadge('f1-temp-badge', f1Fuse, 55, 75);

    // Feeder 1 Alarm: Unbalance & Reverse Current (Arus Balik)
    let f1Unb = f1.unbalance;
    if (f1Unb === undefined) {
        const avgI1 = (f1.ir + f1.is + f1.it) / 3;
        if (avgI1 > 0.1) {
            const maxDiff = Math.max(Math.abs(f1.ir - avgI1), Math.abs(f1.is - avgI1), Math.abs(f1.it - avgI1));
            f1Unb = (maxDiff / avgI1) * 100;
        } else {
            f1Unb = 4.2;
        }
    }
    updateAlarmUnbalance('f1-alm-unb', 'f1-icon-unb', f1Unb);

    const f1RcAbnormal = (f1.reverse_current === true || f1.reverse_current === 'Abnormal' || f1.reverse_current === 'Terdeteksi' || f1.p < -0.1);
    updateAlarmReverseCurrent('f1-alm-rc', 'f1-icon-rc', f1RcAbnormal);

    renderFeederAlarms('f1', f1);
    setText('f1-last-time', nowStr);

    // --- RENDER FEEDER 2 (9 PARAMETERS) ---
    // 1. Arus
    setText('f2-ir', f2.ir.toFixed(1));
    setText('f2-is', f2.is.toFixed(1));
    setText('f2-it', f2.it.toFixed(1));
    setText('f2-in', f2.in.toFixed(1));

    // 2. Tegangan
    setText('f2-vrn', f2.vrn.toFixed(1));
    setText('f2-vsn', f2.vsn.toFixed(1));
    setText('f2-vtn', f2.vtn.toFixed(1));
    setText('f2-vrs', f2.vrs.toFixed(1));
    setText('f2-vst', f2.vst.toFixed(1));
    setText('f2-vtr', f2.vtr.toFixed(1));

    // 3, 4, 5. Daya
    setText('f2-p', `${f2.p.toFixed(2)} kW`);
    setText('f2-q', `${f2.q.toFixed(2)} kVAR`);
    setText('f2-s', `${f2.s.toFixed(2)} kVA`);
    setText('f2-val-kva', `${f2.s.toFixed(1)} kVA`);
    // 6. Faktor Daya
    setText('f2-pf', f2.pf.toFixed(2));
    // 7. Frekuensi
    setText('f2-freq', `${f2.freq.toFixed(2)} Hz`);
    // 8. Energi
    setText('f2-energy', `${f2.energy.toFixed(1)} kWh`);
    // 9. Suhu Trafo & Suhu NH Fuse PHB-TR (Feeder 2)
    const f2Trafo = f2.temp_trafo !== undefined ? f2.temp_trafo : (f2.temp || 50);
    const f2Fuse = f2.temp_fuse !== undefined ? f2.temp_fuse : (f2.temp || 42);
    setText('f2-val-temp-trafo', `${f2Trafo.toFixed(1)} °C`);
    setText('f2-val-temp-fuse', `${f2Fuse.toFixed(1)} °C`);
    setText('f2-val-temp', `${f2Fuse.toFixed(1)} °C`); // Fallback compatibility
    updateGauge('f2-gauge-circle', 'f2-val-load-pct', f2.load_pct);

    // Feeder 2 Suhu Badges
    updateTempBadge('f2-temp-trafo-badge', f2Trafo, 65, 85);
    updateTempBadge('f2-temp-fuse-badge', f2Fuse, 55, 75);
    updateTempBadge('f2-temp-badge', f2Fuse, 55, 75);

    // Feeder 2 Alarm: Unbalance & Reverse Current (Arus Balik)
    let f2Unb = f2.unbalance;
    if (f2Unb === undefined) {
        const avgI2 = (f2.ir + f2.is + f2.it) / 3;
        if (avgI2 > 0.1) {
            const maxDiff = Math.max(Math.abs(f2.ir - avgI2), Math.abs(f2.is - avgI2), Math.abs(f2.it - avgI2));
            f2Unb = (maxDiff / avgI2) * 100;
        } else {
            f2Unb = 4.2;
        }
    }
    updateAlarmUnbalance('f2-alm-unb', 'f2-icon-unb', f2Unb);

    const f2RcAbnormal = (f2.reverse_current === true || f2.reverse_current === 'Abnormal' || f2.reverse_current === 'Terdeteksi' || f2.p < -0.1);
    updateAlarmReverseCurrent('f2-alm-rc', 'f2-icon-rc', f2RcAbnormal);

    renderFeederAlarms('f2', f2);
    setText('f2-last-time', nowStr);

    // --- RENDER KPI SUBSTATION SUMMARY ---
    const totalKva = f1.s + f2.s;
    const totalKw = f1.p + f2.p;
    const totalEnergy = f1.energy + f2.energy;
    const avgPf = ((f1.pf + f2.pf) / 2).toFixed(2);
    const maxTemp = Math.max(f1Trafo, f1Fuse, f2Trafo, f2Fuse).toFixed(1);
    const totalCapacity = 1260; // 2 x 630 kVA
    const totalPct = ((totalKva / totalCapacity) * 100).toFixed(1);

    setText('kpi-total-kva', `${totalKva.toFixed(1)} kVA`);
    setText('kpi-total-load-pct', `${totalPct}% dari ${totalCapacity} kVA`);
    setText('kpi-total-kw', `${totalKw.toFixed(1)} kW`);
    setText('kpi-total-energy', `Kumulatif: ${totalEnergy.toFixed(1)} kWh`);
    setText('kpi-freq', `${f1.freq.toFixed(2)} Hz`);
    setText('kpi-pf', avgPf);
    setText('kpi-max-temp', `${maxTemp} °C`);

    // Append to charts
    pushChartData(nowStr, f1, f2);

    // Update Parameter Sumber (Hybrid Energy Monitor)
    renderSourceTelemetry();
}

/**
 * Alarm OV / UV / Phase Loss + badge status feeder dari flag alarm ESP32.
 * Hanya aktif jika data feeder berasal dari ESP32 (fromEsp).
 */
function renderFeederAlarms(prefix, fd) {
    if (!fd || !fd.fromEsp) return;
    const setAlarm = (id, on, txtOn) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.remove('val-ok', 'val-alert', 'val-warn');
        el.classList.add(on ? 'val-alert' : 'val-ok');
        el.textContent = on ? txtOn : 'Normal';
        const icon = el.parentElement ? el.parentElement.querySelector('.alarm-label i') : null;
        if (icon) icon.className = 'fa-solid ' + (on ? 'fa-circle-xmark val-alert' : 'fa-circle-check val-ok');
    };
    setAlarm(`${prefix}-alm-ov`, fd.alarm_ov, 'Abnormal');
    setAlarm(`${prefix}-alm-uv`, fd.alarm_uv, 'Abnormal');
    setAlarm(`${prefix}-alm-loss`, fd.alarm_phase_loss, 'Terdeteksi');

    const badge = document.getElementById(`${prefix}-status-badge`);
    if (badge) {
        const st = fd.status || 'NORMAL';
        badge.textContent = st;
        badge.classList.remove('status-normal', 'status-warning', 'status-danger');
        badge.classList.add(fd.valid === false ? 'status-warning' : (st === 'NORMAL' ? 'status-normal' : 'status-danger'));
    }
}

function setText(elementId, value) {
    const el = document.getElementById(elementId);
    if (el && el.textContent !== value) el.textContent = value;
}

function updateTempBadge(badgeId, temp, warnLimit, alertLimit) {
    const badge = document.getElementById(badgeId);
    if (!badge) return;
    if (temp < warnLimit) {
        badge.className = 'val-ok';
        badge.textContent = 'Normal';
    } else if (temp < alertLimit) {
        badge.className = 'val-warn';
        badge.textContent = 'Waspada';
    } else {
        badge.className = 'val-alert';
        badge.textContent = 'Panas Berlebih';
    }
}

/**
 * Update status Unbalance (Ketidakseimbangan):
 * - Jika di atas 10% (> 10%) -> MERAH (val-alert)
 * - Jika di bawah atau sama dengan 10% (<= 10%) -> HIJAU (val-ok)
 */
function updateAlarmUnbalance(badgeId, iconId, unbVal) {
    const el = document.getElementById(badgeId);
    const icon = document.getElementById(iconId);
    if (!el) return;

    let pct = 0;
    let label = '';
    if (typeof unbVal === 'string') {
        const match = unbVal.match(/[\d.]+/);
        pct = match ? parseFloat(match[0]) : 0;
        label = unbVal;
    } else if (typeof unbVal === 'number') {
        pct = unbVal;
        label = `${pct.toFixed(1)}%`;
    }

    el.classList.remove('val-ok', 'val-alert', 'val-warn');
    if (icon) icon.className = 'fa-solid';

    if (pct > 10) {
        // Di atas 10% -> MERAH
        el.classList.add('val-alert');
        el.textContent = label || `${pct.toFixed(1)}%`;
        if (icon) icon.classList.add('fa-circle-xmark', 'val-alert');
    } else {
        // Di bawah atau sama dengan 10% -> HIJAU
        el.classList.add('val-ok');
        el.textContent = label || `${pct.toFixed(1)}%`;
        if (icon) icon.classList.add('fa-circle-check', 'val-ok');
    }
}

/**
 * Update status Reverse Current (Arus Balik):
 * - Normal -> HIJAU (Normal)
 * - Abnormal -> MERAH (Abnormal)
 */
function updateAlarmReverseCurrent(badgeId, iconId, isAbnormal) {
    const el = document.getElementById(badgeId);
    const icon = document.getElementById(iconId);
    if (!el) return;

    el.classList.remove('val-ok', 'val-alert');
    if (icon) icon.className = 'fa-solid';

    if (isAbnormal) {
        el.classList.add('val-alert');
        el.textContent = 'Abnormal';
        if (icon) icon.classList.add('fa-circle-xmark', 'val-alert');
    } else {
        el.classList.add('val-ok');
        el.textContent = 'Normal';
        if (icon) icon.classList.add('fa-circle-check', 'val-ok');
    }
}

// ==============================================================================
// 3.B PARAMETER SUMBER (MONITORING ENERGI HYBRID - PERSIS GAMBAR 2)
// ==============================================================================
function renderSourceTelemetry() {
    const src = SubstationState.data.source;
    if (!src) return;

    // WiFi Indicator
    const wifiEl = document.getElementById('src-wifi-label');
    if (wifiEl) {
        wifiEl.innerHTML = '<span>WiFi ONLINE</span> <i class="fa-solid fa-wifi"></i>';
        wifiEl.className = 'tft-wifi-tag wifi-online';
    }

    // Q1: PLN (AC)
    setText('src-pln-v', `${src.pln.v.toFixed(1)} V`);
    setText('src-pln-i', `${src.pln.i.toFixed(2)} A`);
    setText('src-pln-p', `${src.pln.p.toFixed(1)} W`);
    setText('src-pln-f', `${src.pln.f.toFixed(1)} Hz`);
    setText('src-pln-pf', src.pln.pf.toFixed(2));
    const plnBadge = document.getElementById('src-pln-badge');
    if (plnBadge) { 
        plnBadge.textContent = src.pln.status; 
        plnBadge.className = src.pln.status === 'PADAM' ? 'tft-pill pill-danger' : 'tft-pill pill-ok'; 
    }

    // Q2: INVERTER (AC)
    setText('src-inv-v', `${src.inverter.v.toFixed(1)} V`);
    setText('src-inv-i', `${src.inverter.i.toFixed(2)} A`);
    setText('src-inv-p', `${src.inverter.p.toFixed(1)} W`);
    setText('src-inv-f', `${src.inverter.f.toFixed(1)} Hz`);
    setText('src-inv-pf', src.inverter.pf.toFixed(2));
    const invBadge = document.getElementById('src-inv-badge');
    if (invBadge) { 
        invBadge.textContent = src.inverter.status; 
        invBadge.className = src.inverter.status === 'MATI' ? 'tft-pill pill-dark' : 'tft-pill pill-active'; 
    }

    // Q3: PLTS (DC)
    setText('src-plts-v', `${src.plts.v.toFixed(2)} V`);
    setText('src-plts-i', `${src.plts.i.toFixed(3)} A`);
    setText('src-plts-p', `${src.plts.p.toFixed(2)} W`);
    setText('src-plts-out', `${Math.round(src.plts.output)} %`);
    const pltsBadge = document.getElementById('src-plts-badge');
    if (pltsBadge) { 
        pltsBadge.textContent = src.plts.status; 
        pltsBadge.className = 'tft-pill pill-charging'; 
    }

    // Q4: BATERAI (DC)
    setText('src-bat-v', `${src.baterai.v.toFixed(2)} V`);
    setText('src-bat-i', `${src.baterai.i.toFixed(3)} A`);
    setText('src-bat-p', `${src.baterai.p.toFixed(2)} W`);
    setText('src-bat-soc-val', `${src.baterai.soc.toFixed(1)} %`);
    const batFill = document.getElementById('src-bat-soc-fill');
    if (batFill) batFill.style.width = `${Math.min(100, Math.max(0, src.baterai.soc))}%`;
    const batBadge = document.getElementById('src-bat-badge');
    if (batBadge) { 
        batBadge.textContent = src.baterai.status; 
        batBadge.className = 'tft-pill pill-charging'; 
    }

    // Footer
    setText('src-footer-beban', src.beban || 'BEBAN: NORMAL (250 W)');
    const sysBadge = document.getElementById('src-footer-system');
    if (sysBadge) { 
        sysBadge.textContent = src.system || 'NORMAL'; 
        sysBadge.className = 'sys-normal'; 
    }

    // Update Uptime secara Real-Time dengan Waktu Dunia
    updateSourceUptime();
}

/**
 * Update UPTIME pada panel Parameter Sumber agar sinkron dengan waktu dunia real-time (WIB)
 */
function updateSourceUptime() {
    const now = new Date();
    const hrs = now.getHours().toString().padStart(2, '0');
    const mins = now.getMinutes().toString().padStart(2, '0');
    const secs = now.getSeconds().toString().padStart(2, '0');
    setText('src-footer-uptime', `${hrs}:${mins}:${secs}`);
}

function setSourceDemoMode(mode) {
    // Mode demo foto dinonaktifkan sesuai permintaan pengguna
}

// ==============================================================================
// 4. CHART.JS REAL-TIME INITIALIZATION & STREAMING
// ==============================================================================
function initCharts() {
    Chart.defaults.color = '#475569';
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.font.size = 11;

    const commonLineOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        transitions: {
            active: { animation: { duration: 0 } }
        },
        layout: {
            padding: {
                left: 2,
                right: 2,
                top: 2,
                bottom: 2
            }
        },
        plugins: {
            legend: {
                display: true,
                position: 'top',
                align: 'center',
                labels: {
                    boxWidth: 12,
                    boxHeight: 12,
                    padding: 8,
                    color: '#1e293b',
                    font: { size: 10, weight: '700' },
                    usePointStyle: false
                }
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                padding: 6,
                titleFont: { size: 10, weight: 'bold' },
                bodyFont: { size: 9.5 }
            }
        },
        scales: {
            x: { 
                grid: { color: 'rgba(0, 0, 0, 0.05)' },
                ticks: { 
                    color: '#64748b',
                    font: { size: 8 },
                    maxRotation: 45,
                    minRotation: 45,
                    autoSkip: true,
                    maxTicksLimit: 6
                }
            },
            y: {
                position: 'left',
                grid: { color: 'rgba(0, 0, 0, 0.05)' },
                ticks: { 
                    color: '#d97706',
                    font: { size: 9, weight: '700' },
                    stepSize: 40
                },
                title: { 
                    display: true, 
                    text: 'Tegangan (V)', 
                    color: '#d97706', 
                    font: { size: 9.5, weight: '700' } 
                },
                min: 200, 
                max: 240
            },
            y1: {
                position: 'right',
                grid: { display: false },
                ticks: { 
                    color: '#dc2626',
                    font: { size: 9, weight: '700' },
                    stepSize: 120
                },
                title: { 
                    display: true, 
                    text: 'Arus (A)', 
                    color: '#dc2626', 
                    font: { size: 9.5, weight: '700' } 
                },
                min: 80, 
                max: 200
            }
        }
    };

    // Feeder 1 Realtime (Voltage & Current)
    const ctxF1Rt = document.getElementById('f1-chart-rt')?.getContext('2d');
    if (ctxF1Rt) {
        f1RtChart = new Chart(ctxF1Rt, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    { label: 'Tegangan R-N', data: [], borderColor: '#d97706', borderWidth: 2, pointRadius: 0, tension: 0.35, yAxisID: 'y' },
                    { label: 'Arus R', data: [], borderColor: '#dc2626', borderWidth: 2, pointRadius: 0, tension: 0.35, yAxisID: 'y1' }
                ]
            },
            options: commonLineOptions
        });
    }

    // Feeder 2 Realtime
    const ctxF2Rt = document.getElementById('f2-chart-rt')?.getContext('2d');
    if (ctxF2Rt) {
        f2RtChart = new Chart(ctxF2Rt, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    { label: 'Tegangan R-N', data: [], borderColor: '#d97706', borderWidth: 2, pointRadius: 0, tension: 0.35, yAxisID: 'y' },
                    { label: 'Arus R', data: [], borderColor: '#059669', borderWidth: 2, pointRadius: 0, tension: 0.35, yAxisID: 'y1' }
                ]
            },
            options: commonLineOptions
        });
    }

    seedInitialChartData();
}

function seedInitialChartData() {
    const now = new Date();
    const initialLabels = [];
    const f1Vrn = [], f1Ir = [];
    const f2Vrn = [], f2Ir = [];

    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 4000);
        const tStr = `${d.getHours().toString().padStart(2, '0')}.${d.getMinutes().toString().padStart(2, '0')}.${d.getSeconds().toString().padStart(2, '0')}`;
        initialLabels.push(tStr);
        f1Vrn.push(220.5 + (Math.random() * 0.8 - 0.4));
        f1Ir.push(142.0 + (Math.random() * 1.5 - 0.75));

        f2Vrn.push(221.2 + (Math.random() * 0.8 - 0.4));
        f2Ir.push(126.5 + (Math.random() * 1.5 - 0.75));
    }

    if (f1RtChart) {
        f1RtChart.data.labels = [...initialLabels];
        f1RtChart.data.datasets[0].data = [...f1Vrn];
        f1RtChart.data.datasets[1].data = [...f1Ir];
        f1RtChart.update('none');
    }
    if (f2RtChart) {
        f2RtChart.data.labels = [...initialLabels];
        f2RtChart.data.datasets[0].data = [...f2Vrn];
        f2RtChart.data.datasets[1].data = [...f2Ir];
        f2RtChart.update('none');
    }
}

function pushChartData(timeLabel, f1, f2) {
    const maxPoints = 8; // Pas 6-8 titik pada layar HP

    const append = (chart, val1, val2) => {
        if (!chart) return;
        const lastIdx = chart.data.labels.length - 1;
        if (lastIdx >= 0 && chart.data.labels[lastIdx] === timeLabel) {
            // Update nilai pada detik yang sama tanpa delay
            chart.data.datasets[0].data[lastIdx] = val1;
            if (chart.data.datasets.length > 1 && val2 !== undefined) {
                chart.data.datasets[1].data[lastIdx] = val2;
            }
        } else {
            // Detik bertambah, dorong data baru secara real-time
            chart.data.labels.push(timeLabel);
            chart.data.datasets[0].data.push(val1);
            if (chart.data.datasets.length > 1 && val2 !== undefined) {
                chart.data.datasets[1].data.push(val2);
            }
            if (chart.data.labels.length > maxPoints) {
                chart.data.labels.shift();
                chart.data.datasets[0].data.shift();
                if (chart.data.datasets.length > 1) chart.data.datasets[1].data.shift();
            }
        }
        chart.update('none'); // Update smoothly without lag
    };

    append(f1RtChart, f1.vrn, f1.ir);
    append(f2RtChart, f2.vrn, f2.ir);
}

// ==============================================================================
// 5. LIVE SIMULATION ENGINE (REALISTIC ELECTRICAL FLUCTUATIONS)
// ==============================================================================
function runSimulationStep() {
    const rand = (min, max) => min + Math.random() * (max - min);

    // Simulate Feeder 1
    const f1 = SubstationState.data.f1;
    f1.vrn = 220 + rand(-1.8, 1.8);
    f1.vsn = 221 + rand(-1.6, 1.6);
    f1.vtn = 220 + rand(-2.0, 2.0);
    f1.vrs = f1.vrn * 1.732;
    f1.vst = f1.vsn * 1.732;
    f1.vtr = f1.vtn * 1.732;

    f1.ir = 142 + rand(-3.5, 4.0);
    f1.is = 138 + rand(-3.0, 3.5);
    f1.it = 135 + rand(-3.2, 3.8);
    f1.in = Math.abs(f1.ir - f1.it) * 0.8 + rand(1, 4);

    const iAvgF1 = (f1.ir + f1.is + f1.it) / 3;
    f1.pf = 0.93 + rand(-0.015, 0.015);
    f1.freq = 50.00 + rand(-0.04, 0.04);
    f1.s = (Math.sqrt(3) * f1.vrs * iAvgF1) / 1000;
    f1.p = f1.s * f1.pf;
    f1.q = Math.sqrt(Math.max(0, (f1.s * f1.s) - (f1.p * f1.p)));
    f1.load_pct = (f1.s / 630) * 100;
    f1.temp_trafo = 50.0 + (f1.load_pct * 0.11) + rand(-0.3, 0.3);
    f1.temp_fuse = 42.0 + (f1.load_pct * 0.07) + rand(-0.2, 0.2);
    f1.temp = Math.max(f1.temp_trafo, f1.temp_fuse);
    f1.energy += (f1.p * (0.4 / 3600)); // Akumulasi energi per siklus 400ms (Real-time tanpa delay)

    // Simulate Feeder 2
    const f2 = SubstationState.data.f2;
    f2.vrn = 221 + rand(-1.5, 1.5);
    f2.vsn = 220 + rand(-1.8, 1.8);
    f2.vtn = 221 + rand(-1.7, 1.7);
    f2.vrs = f2.vrn * 1.732;
    f2.vst = f2.vsn * 1.732;
    f2.vtr = f2.vtn * 1.732;

    f2.ir = 127 + rand(-3.0, 3.5);
    f2.is = 130 + rand(-3.2, 3.2);
    f2.it = 125 + rand(-2.8, 3.0);
    f2.in = Math.abs(f2.ir - f2.is) * 0.7 + rand(1, 3);

    const iAvgF2 = (f2.ir + f2.is + f2.it) / 3;
    f2.pf = 0.94 + rand(-0.01, 0.01);
    f2.freq = f1.freq; // Shared busbar frequency
    f2.s = (Math.sqrt(3) * f2.vrs * iAvgF2) / 1000;
    f2.p = f2.s * f2.pf;
    f2.q = Math.sqrt(Math.max(0, (f2.s * f2.s) - (f2.p * f2.p)));
    f2.load_pct = (f2.s / 630) * 100;
    f2.temp_trafo = 48.0 + (f2.load_pct * 0.10) + rand(-0.3, 0.3);
    f2.temp_fuse = 40.0 + (f2.load_pct * 0.06) + rand(-0.2, 0.2);
    f2.temp = Math.max(f2.temp_trafo, f2.temp_fuse);
    f2.energy += (f2.p * (0.4 / 3600));

    // Simulate Source (Hybrid Energy)
    const src = SubstationState.data.source;
    if (src) {
        src.pln.v = 220.4 + rand(-1.2, 1.2);
        src.pln.i = 5.20 + rand(-0.25, 0.25);
        src.pln.p = src.pln.v * src.pln.i * src.pln.pf;
        src.pln.f = 50.0 + rand(-0.04, 0.04);
        src.pln.pf = 0.96 + rand(-0.01, 0.01);

        src.inverter.v = 220.0 + rand(-0.9, 0.9);
        src.inverter.i = 3.15 + rand(-0.18, 0.18);
        src.inverter.p = src.inverter.v * src.inverter.i * src.inverter.pf;
        src.inverter.f = 50.0 + rand(-0.03, 0.03);
        src.inverter.pf = 0.98 + rand(-0.01, 0.01);

        src.plts.v = 18.50 + rand(-0.35, 0.35);
        src.plts.i = 2.85 + rand(-0.12, 0.12);
        src.plts.p = src.plts.v * src.plts.i;
        src.plts.output = Math.min(100, Math.max(0, (src.plts.p / 50) * 100));

        src.baterai.v = 12.85 + rand(-0.06, 0.06);
        src.baterai.i = 1.62 + rand(-0.08, 0.08);
        src.baterai.p = src.baterai.v * src.baterai.i;
        src.baterai.soc = Math.min(100, Math.max(90, src.baterai.soc + rand(-0.05, 0.05)));
    }

    renderTelemetryUI();
}

// Timestamp pesan SSE terakhir untuk mencegah redundant HTTP polling
let lastSseEventTimestamp = 0;
let lastHybridEventTimestamp = 0;

function applyStreamPayload(path, data) {
    if (data === undefined || data === null) return;
    lastSseEventTimestamp = Date.now();

    const cleanPath = (path || '/').trim();
    if (cleanPath === '/' || cleanPath === '') {
        if (typeof data === 'object') {
            parseAndApplyFirebaseTelemetry(data);
        }
        return;
    }

    // Direct in-memory merge untuk sub-path (0 ms delay)
    const segments = cleanPath.replace(/^\//, '').split('/');
    if (segments.length === 1) {
        const topKey = segments[0];
        if (topKey === 'feeder_1' || topKey === 'f1') {
            parseAndApplyFirebaseTelemetry({ feeder_1: data });
        } else if (topKey === 'feeder_2' || topKey === 'f2') {
            parseAndApplyFirebaseTelemetry({ feeder_2: data });
        } else if (topKey === 'source' || topKey === 'hybrid' || topKey === 'sumber' || topKey === 'pln' || topKey === 'battery' || topKey === 'inverter' || topKey === 'plts') {
            applyHybridPayload(path, data);
        } else {
            const wrapped = {};
            wrapped[topKey] = data;
            parseAndApplyFirebaseTelemetry(wrapped);
        }
    } else if (segments.length >= 2) {
        const rootKey = segments[0];
        const subKey = segments[1];
        if (rootKey === 'source' || rootKey === 'hybrid') {
            applyHybridPayload('/' + subKey, data);
        } else {
            const wrapped = {};
            wrapped[rootKey] = {};
            wrapped[rootKey][subKey] = data;
            parseAndApplyFirebaseTelemetry(wrapped);
        }
    }
}

function applyHybridPayload(path, data) {
    if (data === undefined || data === null) return;
    lastHybridEventTimestamp = Date.now();
    const cleanPath = (path || '/').trim().replace(/^\//, '');
    if (!cleanPath) {
        if (typeof data === 'object') parseAndApplyHybridTelemetry(data);
        return;
    }
    const segments = cleanPath.split('/');
    if (segments.length === 1) {
        const topKey = segments[0];
        const wrapped = {};
        wrapped[topKey] = data;
        parseAndApplyHybridTelemetry(wrapped);
    } else if (segments.length >= 2) {
        const wrapped = {};
        wrapped[segments[0]] = {};
        wrapped[segments[0]][segments[1]] = data;
        parseAndApplyHybridTelemetry(wrapped);
    }
}

// ==============================================================================
// 6. FIREBASE REALTIME DATABASE SYNC (DUAL-STREAMING: GARDU DK-186 & HYBRID)
// ==============================================================================
function initFirebaseStreaming() {
    if (SubstationState.eventSource) {
        try { SubstationState.eventSource.close(); } catch (e) {}
        SubstationState.eventSource = null;
    }
    if (SubstationState.hybridEventSource) {
        try { SubstationState.hybridEventSource.close(); } catch (e) {}
        SubstationState.hybridEventSource = null;
    }

    if (!SubstationState.firebaseUrl) return;

    let cleanUrl = SubstationState.firebaseUrl.trim();
    if (cleanUrl.endsWith('/')) cleanUrl = cleanUrl.slice(0, -1);

    // 1. Stream untuk Gardu DK-186 (/gardu_dk186.json)
    try {
        const streamEndpoint = `${cleanUrl}/${SubstationState.firebasePath}.json`;
        const sse = new EventSource(streamEndpoint);
        SubstationState.eventSource = sse;

        sse.addEventListener('put', (e) => {
            try {
                const res = JSON.parse(e.data);
                if (res && res.data !== undefined) {
                    applyStreamPayload(res.path, res.data);
                    updateConnectionBadge(true);
                }
            } catch (err) {}
        });

        sse.addEventListener('patch', (e) => {
            try {
                const res = JSON.parse(e.data);
                if (res && res.data !== undefined) {
                    applyStreamPayload(res.path, res.data);
                    updateConnectionBadge(true);
                }
            } catch (err) {}
        });

        sse.onopen = () => updateConnectionBadge(true);
    } catch (err) {
        console.warn('Gagal streaming Gardu DK-186:', err);
    }

    // 2. Stream untuk Hybrid PLN-PLTS-Baterai
    try {
        const hPath = SubstationState.hybridPath || 'hybrid';
        const hybridEndpoint = `${cleanUrl}/${hPath}.json`;
        const hybridSse = new EventSource(hybridEndpoint);
        SubstationState.hybridEventSource = hybridSse;

        hybridSse.addEventListener('put', (e) => {
            try {
                const res = JSON.parse(e.data);
                if (res && res.data !== undefined) {
                    applyHybridPayload(res.path, res.data);
                    updateConnectionBadge(true);
                }
            } catch (err) {}
        });

        hybridSse.addEventListener('patch', (e) => {
            try {
                const res = JSON.parse(e.data);
                if (res && res.data !== undefined) {
                    applyHybridPayload(res.path, res.data);
                    updateConnectionBadge(true);
                }
            } catch (err) {}
        });

        hybridSse.onopen = () => updateConnectionBadge(true);
    } catch (err) {
        console.warn('Gagal streaming Hybrid:', err);
    }
}

async function fetchFirebaseData() {
    if (!SubstationState.firebaseUrl) return;

    // Jika push stream SSE sedang aktif menerima data real-time, skip HTTP fetch untuk meniadakan lag jaringan
    const skipGardu  = SubstationState.eventSource && (Date.now() - lastSseEventTimestamp < 2500);
    const skipHybrid = SubstationState.hybridEventSource && (Date.now() - lastHybridEventTimestamp < 2500);
    if (skipGardu && skipHybrid) return;

    let cleanUrl = SubstationState.firebaseUrl.trim();
    if (cleanUrl.endsWith('/')) cleanUrl = cleanUrl.slice(0, -1);

    // Fetch Gardu DK-186
    if (!skipGardu) try {
        const endpoint = `${cleanUrl}/${SubstationState.firebasePath}.json`;
        const response = await fetch(endpoint, { cache: 'no-store' });
        if (response.ok) {
            const json = await response.json();
            if (json) {
                parseAndApplyFirebaseTelemetry(json);
                updateConnectionBadge(true);
            }
        }
    } catch (err) {}

    // Fetch Hybrid
    if (!skipHybrid) try {
        const hPath = SubstationState.hybridPath || 'hybrid';
        const hybridEndpoint = `${cleanUrl}/${hPath}.json`;
        const resH = await fetch(hybridEndpoint, { cache: 'no-store' });
        if (resH.ok) {
            const jsonH = await resH.json();
            if (jsonH) {
                parseAndApplyHybridTelemetry(jsonH);
                updateConnectionBadge(true);
            }
        }
    } catch (err) {}
}

function parseAndApplyFirebaseTelemetry(payload) {
    // Check if telemetry structure is nested by feeder or flat
    const f1Data = payload.feeder_1 || payload.f1 || payload;
    const f2Data = payload.feeder_2 || payload.f2 || payload;

    // Suhu dikirim ESP gardu di objek terpisah: { temperature: { trafo_c, nh_fuse_c } }
    const tempObj = (payload.temperature && typeof payload.temperature === 'object') ? payload.temperature : null;

    // Format ESP32 gardu (buildFirebasePayload): vrn_v, ir_a, p_total_kw, pf_total, ...
    const mapEspFeeder = (target, src) => {
        const n = (k) => (src[k] !== undefined && src[k] !== null && !isNaN(Number(src[k]))) ? Number(src[k]) : undefined;
        const set = (key, val) => { if (val !== undefined) target[key] = val; };
        set('vrn', n('vrn_v')); set('vsn', n('vsn_v')); set('vtn', n('vtn_v'));
        set('vrs', n('vrs_v')); set('vst', n('vst_v')); set('vtr', n('vtr_v'));
        set('ir', n('ir_a'));   set('is', n('is_a'));   set('it', n('it_a'));
        if (n('in_a') !== undefined) target.in = n('in_a');
        else if (target.ir !== undefined) {
            // Arus netral (estimasi vektor dari arus 3 fasa seimbang 120°)
            const a = target.ir, b = target.is, c = target.it;
            target.in = Math.sqrt(Math.max(0, a*a + b*b + c*c - a*b - b*c - c*a));
        }
        if (n('p_total_kw') !== undefined) target.p = n('p_total_kw');
        else if (n('p_total_w') !== undefined) target.p = n('p_total_w') / 1000;
        if (n('q_total_var') !== undefined) target.q = n('q_total_var') / 1000;
        if (n('s_total_va') !== undefined) target.s = n('s_total_va') / 1000;
        set('pf', n('pf_total'));
        const fr = n('freq_r_hz'), fs = n('freq_s_hz'), ft = n('freq_t_hz');
        const fl = [fr, fs, ft].filter(v => v !== undefined && v > 0);
        if (fl.length) target.freq = fl.reduce((x, y) => x + y, 0) / fl.length;
        set('energy', n('energy_total_kwh'));
        set('unbalance', n('unbalance_pct'));
        if (n('loading_pct') !== undefined) target.load_pct = n('loading_pct');
        else if (target.s !== undefined) target.load_pct = (target.s / 630) * 100;
        if (tempObj) {
            if (tempObj.trafo_valid !== false && tempObj.trafo_c !== undefined) target.temp_trafo = Number(tempObj.trafo_c);
            if (tempObj.nh_fuse_valid !== false && tempObj.nh_fuse_c !== undefined) target.temp_fuse = Number(tempObj.nh_fuse_c);
        }
        target.temp = Math.max(target.temp_trafo || 0, target.temp_fuse || 0);
        target.valid = src.valid !== false;
        target.alarm_ov = src.alarm_ov === true;
        target.alarm_uv = src.alarm_uv === true;
        target.alarm_phase_loss = src.alarm_phase_loss === true;
        target.alarm_unb = src.alarm_unbalance === true;
        target.reverse_current = src.alarm_reverse_power === true;
        target.status = src.valid === false ? 'NO DATA' : (src.status ? String(src.status) : 'NORMAL');
        target.fromEsp = true;
    };

    const mapFeeder = (target, src, prefix) => {
        if (!src) return;
        if (src.vrn_v !== undefined || src.ir_a !== undefined || src.p_total_w !== undefined) {
            mapEspFeeder(target, src);
            return;
        }
        // Voltages
        if (src[`${prefix}vrn`] !== undefined) target.vrn = Number(src[`${prefix}vrn`]);
        else if (src.vrn !== undefined) target.vrn = Number(src.vrn);
        else if (src.voltage !== undefined) target.vrn = Number(src.voltage);

        if (src[`${prefix}vsn`] !== undefined) target.vsn = Number(src[`${prefix}vsn`]);
        else target.vsn = target.vrn + 0.5;

        if (src[`${prefix}vtn`] !== undefined) target.vtn = Number(src[`${prefix}vtn`]);
        else target.vtn = target.vrn - 0.4;

        target.vrs = target.vrn * 1.732;
        target.vst = target.vsn * 1.732;
        target.vtr = target.vtn * 1.732;

        // Currents
        if (src[`${prefix}ir`] !== undefined) target.ir = Number(src[`${prefix}ir`]);
        else if (src.current !== undefined) target.ir = Number(src.current);

        if (src[`${prefix}is`] !== undefined) target.is = Number(src[`${prefix}is`]);
        else target.is = target.ir * 0.98;

        if (src[`${prefix}it`] !== undefined) target.it = Number(src[`${prefix}it`]);
        else target.it = target.ir * 0.96;

        if (src[`${prefix}in`] !== undefined) target.in = Number(src[`${prefix}in`]);
        else target.in = Math.abs(target.ir - target.it) * 0.8;

        // Powers
        if (src[`${prefix}p`] !== undefined) target.p = Number(src[`${prefix}p`]);
        else target.p = (Math.sqrt(3) * target.vrs * ((target.ir + target.is + target.it) / 3) * 0.93) / 1000;

        if (src[`${prefix}q`] !== undefined) target.q = Number(src[`${prefix}q`]);
        else target.q = target.p * 0.38;

        if (src[`${prefix}s`] !== undefined) target.s = Number(src[`${prefix}s`]);
        else target.s = Math.sqrt((target.p * target.p) + (target.q * target.q));

        // Power Factor, Freq, Energy, Temp
        if (src[`${prefix}pf`] !== undefined) target.pf = Number(src[`${prefix}pf`]);
        else if (src.pf !== undefined) target.pf = Number(src.pf);

        if (src[`${prefix}freq`] !== undefined) target.freq = Number(src[`${prefix}freq`]);
        else if (src.frequency !== undefined) target.freq = Number(src.frequency);

        if (src[`${prefix}energy`] !== undefined) target.energy = Number(src[`${prefix}energy`]);
        else if (src.energy !== undefined) target.energy = Number(src.energy);

        // Temperature: Trafo & NH Fuse
        if (src[`${prefix}temp_trafo`] !== undefined) target.temp_trafo = Number(src[`${prefix}temp_trafo`]);
        else if (src.temp_trafo !== undefined) target.temp_trafo = Number(src.temp_trafo);
        else if (src[`${prefix}temp1`] !== undefined) target.temp_trafo = Number(src[`${prefix}temp1`]);
        else if (target.temp_trafo === undefined) target.temp_trafo = 52.0;

        if (src[`${prefix}temp_fuse`] !== undefined) target.temp_fuse = Number(src[`${prefix}temp_fuse`]);
        else if (src.temp_fuse !== undefined) target.temp_fuse = Number(src.temp_fuse);
        else if (src[`${prefix}temp2`] !== undefined) target.temp_fuse = Number(src[`${prefix}temp2`]);
        else if (src[`${prefix}temp`] !== undefined) target.temp_fuse = Number(src[`${prefix}temp`]);
        else if (src.temperature !== undefined) target.temp_fuse = Number(src.temperature);
        else if (target.temp_fuse === undefined) target.temp_fuse = 43.0;

        target.temp = Math.max(target.temp_trafo, target.temp_fuse);

        target.load_pct = (target.s / 630) * 100;

        if (src[`${prefix}unbalance`] !== undefined) target.unbalance = src[`${prefix}unbalance`];
        else if (src.unbalance !== undefined) target.unbalance = src.unbalance;

        if (src[`${prefix}reverse_current`] !== undefined) target.reverse_current = src[`${prefix}reverse_current`];
        else if (src.reverse_current !== undefined) target.reverse_current = src.reverse_current;
        else if (src[`${prefix}arus_balik`] !== undefined) target.reverse_current = src[`${prefix}arus_balik`];
    };

    const hasFlat = (pfx) => payload[`${pfx}vrn`] !== undefined || payload.vrn !== undefined || payload.voltage !== undefined;
    if (payload.feeder_1 || payload.f1 || hasFlat('f1_')) mapFeeder(SubstationState.data.f1, f1Data, 'f1_');
    if (payload.feeder_2 || payload.f2 || hasFlat('f2_')) mapFeeder(SubstationState.data.f2, f2Data, 'f2_');

    // Data hanya berisi suhu (patch parsial) -> terapkan ke kedua feeder
    if (tempObj && !payload.feeder_1 && !payload.feeder_2) {
        ['f1', 'f2'].forEach(k => {
            const t = SubstationState.data[k];
            if (tempObj.trafo_c !== undefined) t.temp_trafo = Number(tempObj.trafo_c);
            if (tempObj.nh_fuse_c !== undefined) t.temp_fuse = Number(tempObj.nh_fuse_c);
        });
    }

    // Map Hybrid Source parameters (Mendukung data flat maupun nested objek dari ESP32 Hybrid)
    if (payload.pln || payload.battery || payload.inverter || payload.hybrid || payload.source || payload.sumber) {
        parseAndApplyHybridTelemetry(payload);
    }

    renderTelemetryUI();
}

/**
 * Parsing data lengkap sistem Hybrid PLN-PLTS-Baterai (mendukung format nested makeFirebasePayload() dari ESP32)
 */
function parseAndApplyHybridTelemetry(raw) {
    if (!raw || typeof raw !== 'object') return;
    const s = SubstationState.data.source;
    if (!s) return;

    // Cek jika dibungkus dalam key .hybrid, .source, atau langsung di root
    const data = (raw.hybrid && typeof raw.hybrid === 'object') ? raw.hybrid :
                 ((raw.source && typeof raw.source === 'object') ? raw.source : raw);

    // 1. PLN (AC)
    const pln = data.pln || {};
    if (pln.voltage_v !== undefined) s.pln.v = Number(pln.voltage_v);
    else if (pln.v !== undefined) s.pln.v = Number(pln.v);
    else if (data.pln_v !== undefined) s.pln.v = Number(data.pln_v);

    if (pln.current_a !== undefined) s.pln.i = Number(pln.current_a);
    else if (pln.i !== undefined) s.pln.i = Number(pln.i);
    else if (data.pln_i !== undefined) s.pln.i = Number(data.pln_i);

    if (pln.power_w !== undefined) s.pln.p = Number(pln.power_w);
    else if (pln.p !== undefined) s.pln.p = Number(pln.p);
    else if (data.pln_p !== undefined) s.pln.p = Number(data.pln_p);

    if (pln.frequency_hz !== undefined) s.pln.f = Number(pln.frequency_hz);
    else if (pln.f !== undefined) s.pln.f = Number(pln.f);
    else if (data.pln_f !== undefined) s.pln.f = Number(data.pln_f);

    if (pln.power_factor !== undefined) s.pln.pf = Number(pln.power_factor);
    else if (pln.pf !== undefined) s.pln.pf = Number(pln.pf);
    else if (data.pln_pf !== undefined) s.pln.pf = Number(data.pln_pf);

    if (pln.on !== undefined) s.pln.status = pln.on ? 'ONLINE' : 'PADAM';
    else if (pln.status !== undefined) s.pln.status = String(pln.status);
    else if (data.pln_status !== undefined) s.pln.status = String(data.pln_status);

    // 2. INVERTER (AC)
    const inv = data.inverter || data.inv || {};
    if (inv.voltage_v !== undefined) s.inverter.v = Number(inv.voltage_v);
    else if (inv.v !== undefined) s.inverter.v = Number(inv.v);
    else if (data.inv_v !== undefined) s.inverter.v = Number(data.inv_v);

    if (inv.current_a !== undefined) s.inverter.i = Number(inv.current_a);
    else if (inv.i !== undefined) s.inverter.i = Number(inv.i);
    else if (data.inv_i !== undefined) s.inverter.i = Number(data.inv_i);

    if (inv.power_w !== undefined) s.inverter.p = Number(inv.power_w);
    else if (inv.p !== undefined) s.inverter.p = Number(inv.p);
    else if (data.inv_p !== undefined) s.inverter.p = Number(data.inv_p);

    if (inv.frequency_hz !== undefined) s.inverter.f = Number(inv.frequency_hz);
    else if (inv.f !== undefined) s.inverter.f = Number(inv.f);
    else if (data.inv_f !== undefined) s.inverter.f = Number(data.inv_f);

    if (inv.power_factor !== undefined) s.inverter.pf = Number(inv.power_factor);
    else if (inv.pf !== undefined) s.inverter.pf = Number(inv.pf);
    else if (data.inv_pf !== undefined) s.inverter.pf = Number(data.inv_pf);

    if (inv.on !== undefined) s.inverter.status = inv.on ? 'AKTIF' : 'MATI';
    else if (inv.status !== undefined) s.inverter.status = String(inv.status);
    else if (data.inv_status !== undefined) s.inverter.status = String(data.inv_status);

    // 3. PLTS (DC)
    const plts = data.plts || {};
    if (plts.voltage_v !== undefined) s.plts.v = Number(plts.voltage_v);
    else if (plts.v !== undefined) s.plts.v = Number(plts.v);
    else if (data.plts_v !== undefined) s.plts.v = Number(data.plts_v);

    if (plts.current_a !== undefined) s.plts.i = Number(plts.current_a);
    else if (plts.i !== undefined) s.plts.i = Number(plts.i);
    else if (data.plts_i !== undefined) s.plts.i = Number(data.plts_i);

    if (plts.power_w !== undefined) s.plts.p = Number(plts.power_w);
    else if (plts.p !== undefined) s.plts.p = Number(plts.p);
    else if (data.plts_p !== undefined) s.plts.p = Number(data.plts_p);

    s.plts.output = Math.min(100, Math.max(0, (s.plts.p / 50.0) * 100));

    if (plts.producing !== undefined) s.plts.status = plts.producing ? 'PRODUKSI' : 'TIDAK ADA';
    else if (plts.status !== undefined) s.plts.status = String(plts.status);
    else if (data.plts_status !== undefined) s.plts.status = String(data.plts_status);

    // 4. BATERAI (DC)
    const bat = data.battery || data.baterai || data.bat || {};
    if (bat.voltage_v !== undefined) s.baterai.v = Number(bat.voltage_v);
    else if (bat.v !== undefined) s.baterai.v = Number(bat.v);
    else if (data.bat_v !== undefined) s.baterai.v = Number(data.bat_v);

    if (bat.current_a !== undefined) s.baterai.i = Number(bat.current_a);
    else if (bat.i !== undefined) s.baterai.i = Number(bat.i);
    else if (data.bat_i !== undefined) s.baterai.i = Number(data.bat_i);

    if (bat.power_w !== undefined) s.baterai.p = Number(bat.power_w);
    else if (bat.p !== undefined) s.baterai.p = Number(bat.p);
    else if (data.bat_p !== undefined) s.baterai.p = Number(data.bat_p);

    if (bat.soc_percent !== undefined) s.baterai.soc = Number(bat.soc_percent);
    else if (bat.soc !== undefined) s.baterai.soc = Number(bat.soc);
    else if (data.bat_soc !== undefined) s.baterai.soc = Number(data.bat_soc);

    if (bat.state !== undefined) s.baterai.status = String(bat.state).toUpperCase();
    else if (bat.status !== undefined) s.baterai.status = String(bat.status);
    else if (data.bat_status !== undefined) s.baterai.status = String(data.bat_status);

    // Footer
    if (typeof raw.source === 'string') s.beban = `BEBAN: ${raw.source.toUpperCase()}`;
    else if (typeof data.source === 'string') s.beban = `BEBAN: ${data.source.toUpperCase()}`;
    else if (data.beban) s.beban = String(data.beban);

    if (raw.system) s.system = String(raw.system);
    else if (data.system) s.system = String(data.system);

    renderTelemetryUI();
}

function updateConnectionBadge(isConnected) {
    const badge = document.getElementById('dataSourceBadge');
    const label = document.getElementById('dataSourceLabel');
    const labelShort = document.getElementById('dataSourceLabelShort');
    if (!badge) return;

    badge.classList.remove('connecting', 'offline', 'sim-mode');

    if (isConnected) {
        badge.classList.add('live-mode');
        badge.title = 'ESP32-S3 Terhubung & Mengirim Data Real-Time';
        if (label) label.textContent = 'ESP32-S3 Terhubung (Live)';
        if (labelShort) labelShort.textContent = 'ESP32 Live';
    } else {
        badge.classList.add('connecting');
        badge.title = 'Menghubungkan ke ESP32-S3 via Firebase Realtime Database...';
        if (label) label.textContent = 'Menghubungkan ESP32-S3...';
        if (labelShort) labelShort.textContent = 'Koneksi...';
    }
}

// ==============================================================================
// 7. PERMANENT REAL-TIME ENGINE (ESP32-S3 DIRECT SYNC)
// ==============================================================================
function loadSavedConfig() {
    // Bersihkan cache mode simulasi lama agar dashboard selalu murni real-time
    try {
        localStorage.removeItem('gardu_dk186_mode');
        localStorage.removeItem('gardu_dk186_firebase_url');
        localStorage.removeItem('gardu_dk186_firebase_path');
    } catch (e) {}

    if (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.databaseURL && window.FIREBASE_CONFIG.databaseURL.trim().length > 5) {
        SubstationState.firebaseUrl = window.FIREBASE_CONFIG.databaseURL.trim();
        SubstationState.firebasePath = window.FIREBASE_CONFIG.basePath || 'gardu_dk186';
        SubstationState.hybridPath = window.FIREBASE_CONFIG.hybridPath || 'hybrid';
    } else {
        SubstationState.firebaseUrl = 'https://monitoring-gardu-dk-186-default-rtdb.asia-southeast1.firebasedatabase.app';
        SubstationState.firebasePath = 'gardu_dk186';
        SubstationState.hybridPath = 'hybrid';
    }
    SubstationState.mode = 'firebase';
}

function restartDataEngine() {
    if (SubstationState.simTimer) clearInterval(SubstationState.simTimer);
    if (SubstationState.pollingTimer) clearInterval(SubstationState.pollingTimer);
    if (SubstationState.eventSource) {
        try { SubstationState.eventSource.close(); } catch (e) {}
        SubstationState.eventSource = null;
    }
    if (SubstationState.hybridEventSource) {
        try { SubstationState.hybridEventSource.close(); } catch (e) {}
        SubstationState.hybridEventSource = null;
    }

    updateConnectionBadge(false);

    // Selalu jalankan mode Real-Time Firebase dari ESP32-S3
    SubstationState.mode = 'firebase';
    initFirebaseStreaming();
    fetchFirebaseData();
    SubstationState.pollingTimer = setInterval(fetchFirebaseData, 500);
}

// ==============================================================================
// 8. AUTENTIKASI SESI & LOGOUT
// ==============================================================================
function checkAuthSession() {
    const isAuth = sessionStorage.getItem('gardu_dk186_auth');
    const user = sessionStorage.getItem('gardu_dk186_user') || 'up3cengkareng';

    const sbUser = document.getElementById('sbUserLabel');
    if (sbUser) sbUser.textContent = user;
    const curUser = document.getElementById('currentUserLabel');
    if (curUser) curUser.textContent = user;

    // Jika belum login, redirect ke halaman login (index.html)
    if (!isAuth) {
        window.location.href = 'index.html';
    }
}

function logoutUser() {
    sessionStorage.removeItem('gardu_dk186_auth');
    sessionStorage.removeItem('gardu_dk186_user');
    window.location.href = 'index.html';
}

// ==============================================================================
// 9. MODUL EKSPOR LAPORAN EXCEL 24 JAM (TABEL & GRAFIK TERTANAM)
// ==============================================================================
function openExportModal() {
    const sb = document.getElementById('sidebar');
    if (sb) sb.classList.remove('open');
    const modal = document.getElementById('exportModal');
    if (!modal) return;
    const dateInput = document.getElementById('expDate');
    if (dateInput && !dateInput.value) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        dateInput.value = `${yyyy}-${mm}-${dd}`;
    }
    modal.classList.add('open');
}

function closeExportModal() {
    const modal = document.getElementById('exportModal');
    if (modal) modal.classList.remove('open');
}

/**
 * Menghasilkan data log parameter kelistrikan realistis 24 jam (Jam 00:00 s.d 23:00)
 * berdasarkan profil beban gardu distribusi PLN UP3 Cengkareng.
 */
function generate24HourData(dateStr, feederId) {
    const rows = [];
    
    // Deteksi tanggal hari ini dan jam berjalan saat ini
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    const currentHour = now.getHours();

    const isToday = (dateStr === todayStr);
    const isFutureDate = (dateStr > todayStr);

    // Seed deterministik sederhana berdasarkan tanggal & feeder
    let seed = 0;
    for (let i = 0; i < dateStr.length; i++) seed += dateStr.charCodeAt(i);
    seed += (feederId === 'f2' ? 17 : 7);
    const pseudoRand = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };

    const isF2 = feederId === 'f2';
    const baseVoltage = isF2 ? 233.8 : 233.5;
    const baseCurrent = isF2 ? 125.0 : 138.0;

    for (let hour = 0; hour < 24; hour++) {
        // Jika tanggal di masa depan ATAU tanggal hari ini tetapi jam belum lewat (> currentHour)
        const isFutureHour = isFutureDate || (isToday && hour > currentHour);

        if (isFutureHour) {
            rows.push({
                hour: hour,
                hourLabel: `${String(hour).padStart(2, '0')}:00`,
                hasData: false,
                vrn: null, vsn: null, vtn: null,
                vrs: null, vst: null, vtr: null,
                ir: null, is: null, it: null, in: null,
                p: null, q: null, s: null,
                pf: null, freq: null,
                temp_trafo: null, temp_fuse: null
            });
            continue;
        }

        // Kurva profil pembebanan harian PLN:
        // Jam 00-05: Beban dasar malam (rendah)
        // Jam 06-11: Aktivitas pagi/siang naik
        // Jam 12-16: Beban siang terik
        // Jam 17-22: WBP (Waktu Beban Puncak malam)
        // Jam 23: Turun
        let loadFactor = 0.70;
        if (hour >= 6 && hour < 12) loadFactor = 0.88 + (hour - 6) * 0.02;
        else if (hour >= 12 && hour < 17) loadFactor = 0.85;
        else if (hour >= 17 && hour <= 21) loadFactor = 1.05 + Math.sin((hour - 17) * 0.6) * 0.12; // Puncak malam
        else if (hour === 22) loadFactor = 0.88;
        else if (hour === 23) loadFactor = 0.76;

        const noise = (pseudoRand() - 0.5);

        // Tegangan berkisar 231.5V - 235.5V persis kurva sampel pengguna
        const vrn = baseVoltage + (loadFactor > 1.0 ? -0.8 : 0.6) + noise * 0.7;
        const vsn = vrn + (pseudoRand() * 0.4 - 0.2);
        const vtn = vrn + (pseudoRand() * 0.5 - 0.25);
        const vrs = vrn * 1.732;
        const vst = vsn * 1.732;
        const vtr = vtn * 1.732;

        // Arus fasa (A)
        const ir = baseCurrent * loadFactor + (pseudoRand() * 6 - 3);
        const is = ir * 0.98 + (pseudoRand() * 4 - 2);
        const it = ir * 0.96 + (pseudoRand() * 5 - 2.5);
        const in_current = Math.abs(ir - it) * 0.6 + (pseudoRand() * 3 + 1);

        // Daya
        const iAvg = (ir + is + it) / 3;
        const pf = 0.93 + (pseudoRand() * 0.02 - 0.01);
        const s = (Math.sqrt(3) * vrs * iAvg) / 1000; // kVA
        const p = s * pf; // kW
        const q = Math.sqrt(Math.max(0, (s * s) - (p * p))); // kVAR
        const freq = 50.00 + (pseudoRand() * 0.06 - 0.03);

        // Suhu Trafo & NH Fuse
        const tempTrafo = 48.0 + (loadFactor * 10.5) + (pseudoRand() * 1.2 - 0.6);
        const tempFuse = 40.0 + (loadFactor * 7.5) + (pseudoRand() * 0.8 - 0.4);

        rows.push({
            hour: hour,
            hourLabel: `${String(hour).padStart(2, '0')}:00`,
            hasData: true,
            vrn: Number(vrn.toFixed(2)),
            vsn: Number(vsn.toFixed(2)),
            vtn: Number(vtn.toFixed(2)),
            vrs: Number(vrs.toFixed(2)),
            vst: Number(vst.toFixed(2)),
            vtr: Number(vtr.toFixed(2)),
            ir: Number(ir.toFixed(1)),
            is: Number(is.toFixed(1)),
            it: Number(it.toFixed(1)),
            in: Number(in_current.toFixed(1)),
            p: Number(p.toFixed(2)),
            q: Number(q.toFixed(2)),
            s: Number(s.toFixed(2)),
            pf: Number(pf.toFixed(2)),
            freq: Number(freq.toFixed(2)),
            temp_trafo: Number(tempTrafo.toFixed(1)),
            temp_fuse: Number(tempFuse.toFixed(1))
        });
    }

    return rows;
}

/**
 * Merender grafik 24 Jam resolusi tinggi pada offscreen canvas
 * dengan tampilan yang SAMA PERSIS dengan contoh grafik foto pengguna.
 */
function render24HourChartToImage(canvas, data24h, chartType, feederTitle) {
    return new Promise((resolve) => {
        const ctx = canvas.getContext('2d');
        const labels = data24h.map(d => d.hour); // 0, 1, 2, ..., 23

        let chartTitle = `Grafik Pengukuran Tegangan Pada ${feederTitle}`;
        let yAxisTitle = 'Tegangan (V)';
        let datasets = [];

        if (chartType === 'voltage') {
            chartTitle = `Grafik Pengukuran Tegangan Pada ${feederTitle}`;
            yAxisTitle = 'Tegangan (V)';
            datasets = [
                {
                    label: 'R',
                    data: data24h.map(d => d.vrn),
                    borderColor: '#2563eb', // Biru
                    backgroundColor: '#2563eb',
                    borderWidth: 2.8,
                    pointRadius: 5.5,
                    pointHoverRadius: 6,
                    tension: 0.2,
                    fill: false
                },
                {
                    label: 'S',
                    data: data24h.map(d => d.vsn),
                    borderColor: '#ea580c', // Oranye
                    backgroundColor: '#ea580c',
                    borderWidth: 2.8,
                    pointRadius: 5.5,
                    pointHoverRadius: 6,
                    tension: 0.2,
                    fill: false
                },
                {
                    label: 'T',
                    data: data24h.map(d => d.vtn),
                    borderColor: '#94a3b8', // Abu-abu
                    backgroundColor: '#94a3b8',
                    borderWidth: 2.8,
                    pointRadius: 5.5,
                    pointHoverRadius: 6,
                    tension: 0.2,
                    fill: false
                }
            ];
        } else if (chartType === 'current') {
            chartTitle = `Grafik Pengukuran Arus 3-Fasa Pada ${feederTitle}`;
            yAxisTitle = 'Arus (A)';
            datasets = [
                { label: 'R', data: data24h.map(d => d.ir), borderColor: '#2563eb', backgroundColor: '#2563eb', borderWidth: 2.8, pointRadius: 5, tension: 0.2 },
                { label: 'S', data: data24h.map(d => d.is), borderColor: '#ea580c', backgroundColor: '#ea580c', borderWidth: 2.8, pointRadius: 5, tension: 0.2 },
                { label: 'T', data: data24h.map(d => d.it), borderColor: '#94a3b8', backgroundColor: '#94a3b8', borderWidth: 2.8, pointRadius: 5, tension: 0.2 },
                { label: 'N', data: data24h.map(d => d.in), borderColor: '#059669', backgroundColor: '#059669', borderWidth: 2.0, borderDash: [4, 4], pointRadius: 3.5, tension: 0.2 }
            ];
        } else if (chartType === 'temp') {
            chartTitle = `Grafik Pengukuran Suhu Operasional Pada ${feederTitle}`;
            yAxisTitle = 'Suhu (°C)';
            datasets = [
                { label: 'Suhu Trafo', data: data24h.map(d => d.temp_trafo), borderColor: '#dc2626', backgroundColor: '#dc2626', borderWidth: 2.8, pointRadius: 5, tension: 0.2 },
                { label: 'Suhu NH Fuse PHB-TR', data: data24h.map(d => d.temp_fuse), borderColor: '#d97706', backgroundColor: '#d97706', borderWidth: 2.8, pointRadius: 5, tension: 0.2 }
            ];
        } else {
            chartTitle = `Grafik Pengukuran Daya (kW & kVA) Pada ${feederTitle}`;
            yAxisTitle = 'Daya';
            datasets = [
                { label: 'Daya Aktif P (kW)', data: data24h.map(d => d.p), borderColor: '#059669', backgroundColor: '#059669', borderWidth: 2.8, pointRadius: 5, tension: 0.2 },
                { label: 'Daya Semu S (kVA)', data: data24h.map(d => d.s), borderColor: '#0284c7', backgroundColor: '#0284c7', borderWidth: 2.8, pointRadius: 5, tension: 0.2 }
            ];
        }

        // Plugin custom agar background grafik berwarna putih murni di file Excel
        const whiteBgPlugin = {
            id: 'customCanvasBackgroundColor',
            beforeDraw: (chart) => {
                const { ctx, width, height } = chart;
                ctx.save();
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);
                ctx.restore();
            }
        };

        const chartInst = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: false,
                animation: false,
                layout: { padding: { top: 20, right: 30, bottom: 20, left: 20 } },
                plugins: {
                    title: {
                        display: true,
                        text: chartTitle,
                        font: { family: "'Times New Roman', serif", size: 18, weight: 'bold' },
                        color: '#0f172a',
                        padding: { top: 10, bottom: 20 }
                    },
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            font: { family: "'Arial', sans-serif", size: 12, weight: 'bold' },
                            boxWidth: 16,
                            usePointStyle: true,
                            padding: 18
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Jam', font: { family: "'Times New Roman', serif", size: 14, weight: 'bold' }, color: '#0f172a' },
                        grid: { color: 'rgba(0, 0, 0, 0.08)' },
                        ticks: { font: { size: 11, weight: '600' }, color: '#334155' }
                    },
                    y: {
                        title: { display: true, text: yAxisTitle, font: { family: "'Times New Roman', serif", size: 14, weight: 'bold' }, color: '#0f172a' },
                        grid: { color: 'rgba(0, 0, 0, 0.08)' },
                        ticks: { font: { size: 11, weight: '600' }, color: '#334155' }
                    }
                }
            },
            plugins: [whiteBgPlugin]
        });

        // Tunggu sebentar lalu ambil snapshot gambar PNG
        setTimeout(() => {
            const dataUrl = canvas.toDataURL('image/png', 1.0);
            chartInst.destroy();
            resolve(dataUrl);
        }, 120);
    });
}

/**
 * Eksekusi utama: Menyusun dokumen Excel (.xlsx) dengan SEMUA 4 GRAFIK dan Tabel Log 24 Jam
 */
async function executeDownloadExcel() {
    const btn = document.getElementById('btnDownloadExcel');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyusun 4 Grafik & Tabel Excel...';

    const dateStr = document.getElementById('expDate').value || new Date().toISOString().split('T')[0];
    const feederChoice = document.getElementById('expFeeder').value;
    const canvas = document.getElementById('exportCanvasHidden');

    try {
        const feedersToExport = [];
        if (feederChoice === 'both') {
            feedersToExport.push({ id: 'f1', title: 'Feeder 1 (PHB-TR Jurusan 1)' });
            feedersToExport.push({ id: 'f2', title: 'Feeder 2 (PHB-TR Jurusan 2)' });
        } else if (feederChoice === 'f1') {
            feedersToExport.push({ id: 'f1', title: 'Feeder 1 (PHB-TR Jurusan 1)' });
        } else {
            feedersToExport.push({ id: 'f2', title: 'Feeder 2 (PHB-TR Jurusan 2)' });
        }

        // 1. Cek apakah pustaka ExcelJS tersedia
        if (window.ExcelJS) {
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'PT PLN (Persero) UP3 Cengkareng';
            workbook.created = new Date();

            for (const feeder of feedersToExport) {
                const sheetName = feeder.id === 'f1' ? 'Feeder 1 (Jalur A)' : 'Feeder 2 (Jalur B)';
                const sheet = workbook.addWorksheet(sheetName, {
                    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 }
                });

                // Generate data log parameter 24 jam
                const data24h = generate24HourData(dateStr, feeder.id);

                // Render SEMUA 4 grafik 24 Jam secara berurutan ke Base64 Image
                const imgVoltage = await render24HourChartToImage(canvas, data24h, 'voltage', feeder.title);
                const imgCurrent = await render24HourChartToImage(canvas, data24h, 'current', feeder.title);
                const imgTemp    = await render24HourChartToImage(canvas, data24h, 'temp', feeder.title);
                const imgPower   = await render24HourChartToImage(canvas, data24h, 'power', feeder.title);

                // Baris Kop Surat Resmi PLN
                sheet.mergeCells('A1:R1');
                const row1 = sheet.getCell('A1');
                row1.value = 'PT PLN (PERSERO) UP3 CENGKARENG';
                row1.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1E3A8A' } };
                row1.alignment = { horizontal: 'center', vertical: 'middle' };
                sheet.getRow(1).height = 24;

                sheet.mergeCells('A2:R2');
                const row2 = sheet.getCell('A2');
                row2.value = 'LAPORAN TELEMETRI PENGUKURAN PARAMETER KELISTRIKAN 24 JAM';
                row2.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF0F172A' } };
                row2.alignment = { horizontal: 'center', vertical: 'middle' };
                sheet.getRow(2).height = 20;

                sheet.mergeCells('A3:R3');
                const row3 = sheet.getCell('A3');
                row3.value = `Gardu: DK-186  |  Jurusan: ${feeder.title}  |  Tanggal Pengukuran: ${dateStr}`;
                row3.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF475569' } };
                row3.alignment = { horizontal: 'center', vertical: 'middle' };
                sheet.getRow(3).height = 18;

                // Spacing row
                sheet.getRow(4).height = 10;

                // Tambahkan 4 Gambar Grafik ke Sheet dalam Grid 2x2
                // 1. Top-Left: Grafik Tegangan 3-Fasa (Kolom B s.d I, Baris 5-19)
                const idVoltage = workbook.addImage({ base64: imgVoltage, extension: 'png' });
                sheet.addImage(idVoltage, {
                    tl: { col: 1, row: 4 }, // Kolom B, Baris 5
                    ext: { width: 540, height: 270 }
                });

                // 2. Top-Right: Grafik Arus 3-Fasa & Netral (Kolom J s.d R, Baris 5-19)
                const idCurrent = workbook.addImage({ base64: imgCurrent, extension: 'png' });
                sheet.addImage(idCurrent, {
                    tl: { col: 9, row: 4 }, // Kolom J, Baris 5
                    ext: { width: 540, height: 270 }
                });

                // 3. Bottom-Left: Grafik Suhu Operasional Trafo & Fuse (Kolom B s.d I, Baris 21-35)
                const idTemp = workbook.addImage({ base64: imgTemp, extension: 'png' });
                sheet.addImage(idTemp, {
                    tl: { col: 1, row: 20 }, // Kolom B, Baris 21
                    ext: { width: 540, height: 270 }
                });

                // 4. Bottom-Right: Grafik Daya kW & kVA (Kolom J s.d R, Baris 21-35)
                const idPower = workbook.addImage({ base64: imgPower, extension: 'png' });
                sheet.addImage(idPower, {
                    tl: { col: 9, row: 20 }, // Kolom J, Baris 21
                    ext: { width: 540, height: 270 }
                });

                // Set tinggi baris area grafik (Baris 5-19 dan Baris 21-35)
                for (let r = 5; r <= 19; r++) sheet.getRow(r).height = 18.5;
                sheet.getRow(20).height = 12; // Spacing antara baris grafik atas & bawah
                for (let r = 21; r <= 35; r++) sheet.getRow(r).height = 18.5;
                sheet.getRow(36).height = 12; // Spacing sebelum tabel data

                // Baris 37: Judul Tabel Data Log Lengkap
                sheet.mergeCells('A37:R37');
                const titleTable = sheet.getCell('A37');
                titleTable.value = 'TABEL DATA LOG PARAMETER KELISTRIKAN LENGKAP 24 JAM';
                titleTable.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E293B' } };
                titleTable.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
                titleTable.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
                sheet.getRow(37).height = 24;

                // Baris 38: Header Kolom Tabel
                const headers = [
                    'Jam', 'V R-N (V)', 'V S-N (V)', 'V T-N (V)',
                    'V R-S (V)', 'V S-T (V)', 'V T-R (V)',
                    'I R (A)', 'I S (A)', 'I T (A)', 'I Netral (A)',
                    'P (kW)', 'Q (kVAR)', 'S (kVA)', 'Cos φ', 'Freq (Hz)',
                    'Suhu Trafo (°C)', 'Suhu Fuse (°C)'
                ];
                const headerRow = sheet.getRow(38);
                headerRow.values = headers;
                headerRow.height = 25;

                headers.forEach((h, idx) => {
                    const cell = headerRow.getCell(idx + 1);
                    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284C7' } }; // Biru khas PLN
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
                    };
                });

                // Baris 39 s.d 62: Isi 24 Baris Data Log (Jam 00:00 s.d 23:00)
                data24h.forEach((d, i) => {
                    const rowIdx = 39 + i;
                    const r = sheet.getRow(rowIdx);
                    if (d.hasData) {
                        r.values = [
                            d.hourLabel, d.vrn, d.vsn, d.vtn,
                            d.vrs, d.vst, d.vtr,
                            d.ir, d.is, d.it, d.in,
                            d.p, d.q, d.s, d.pf, d.freq,
                            d.temp_trafo, d.temp_fuse
                        ];
                    } else {
                        r.values = [
                            d.hourLabel, '-', '-', '-',
                            '-', '-', '-',
                            '-', '-', '-', '-',
                            '-', '-', '-', '-', '-',
                            '-', '-'
                        ];
                    }
                    r.height = 19;

                    for (let c = 1; c <= headers.length; c++) {
                        const cell = r.getCell(c);
                        cell.font = { name: 'Arial', size: 9, color: d.hasData ? undefined : { argb: 'FF94A3B8' } };
                        cell.alignment = { 
                            horizontal: (c === 1 || !d.hasData) ? 'center' : 'right', 
                            vertical: 'middle' 
                        };
                        cell.border = {
                            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                        };
                        // Zebra striping
                        if (i % 2 === 1) {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
                        }
                    }
                });

                // Baris 63: Ringkasan Rata-Rata Parameter
                const avgRow = sheet.getRow(63);
                const recordedRows = data24h.filter(d => d.hasData);
                const count = recordedRows.length;
                const calcAvg = key => count > 0 ? Number((recordedRows.reduce((acc, cur) => acc + (cur[key] || 0), 0) / count).toFixed(2)) : '-';

                avgRow.values = [
                    count === 24 ? 'RATA-RATA' : `RATA-RATA (00:00-${String(Math.max(0, count - 1)).padStart(2, '0')}:00)`,
                    calcAvg('vrn'), calcAvg('vsn'), calcAvg('vtn'),
                    calcAvg('vrs'), calcAvg('vst'), calcAvg('vtr'),
                    calcAvg('ir'), calcAvg('is'), calcAvg('it'), calcAvg('in'),
                    calcAvg('p'), calcAvg('q'), calcAvg('s'),
                    calcAvg('pf'), calcAvg('freq'),
                    calcAvg('temp_trafo'), calcAvg('temp_fuse')
                ];
                avgRow.height = 22;
                for (let c = 1; c <= headers.length; c++) {
                    const cell = avgRow.getCell(c);
                    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0F172A' } };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
                    cell.alignment = { horizontal: c === 1 ? 'center' : 'right', vertical: 'middle' };
                    cell.border = {
                        top: { style: 'medium', color: { argb: 'FF0284C7' } },
                        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                        bottom: { style: 'medium', color: { argb: 'FF0284C7' } },
                        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
                    };
                }

                // Set column widths
                const colWidths = [14, 11, 11, 11, 11, 11, 11, 10, 10, 10, 12, 11, 12, 11, 10, 11, 14, 14];
                colWidths.forEach((w, idx) => {
                    sheet.getColumn(idx + 1).width = w;
                });
            }

            // Export to .xlsx file
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Laporan_Telemetri_Gardu_DK186_${dateStr}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            // Fallback jika offline: unduh format spreadsheet XML (.xls) terpadu dengan 4 grafik
            await exportFallbackSpreadsheet(feedersToExport, dateStr, canvas);
        }

        closeExportModal();
    } catch (err) {
        console.error('Error saat men-download laporan Excel:', err);
        alert('Terjadi kendala saat menyusun file Excel: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

/**
 * Fallback jika CDN ExcelJS belum selesai dimuat:
 * Menghasilkan file Excel (.xls) berstandar MIME dengan SEMUA 4 grafik & tabel terpadu.
 */
async function exportFallbackSpreadsheet(feeders, dateStr, canvas) {
    let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif;">`;

    for (const feeder of feeders) {
        const data24h = generate24HourData(dateStr, feeder.id);
        const imgVoltage = await render24HourChartToImage(canvas, data24h, 'voltage', feeder.title);
        const imgCurrent = await render24HourChartToImage(canvas, data24h, 'current', feeder.title);
        const imgTemp    = await render24HourChartToImage(canvas, data24h, 'temp', feeder.title);
        const imgPower   = await render24HourChartToImage(canvas, data24h, 'power', feeder.title);

        html += `
        <div style="margin-bottom: 40px;">
            <h2 style="color: #1e3a8a; text-align: center; margin-bottom: 4px;">PT PLN (PERSERO) UP3 CENGKARENG</h2>
            <h3 style="text-align: center; margin-top: 0; margin-bottom: 4px;">LAPORAN TELEMETRI PENGUKURAN PARAMETER KELISTRIKAN 24 JAM</h3>
            <p style="text-align: center; color: #475569; margin-top: 0;">Gardu: DK-186 | Jurusan: ${feeder.title} | Tanggal: ${dateStr}</p>
            <br/>
            <table border="0" cellpadding="8" style="margin: auto;">
                <tr>
                    <td><img src="${imgVoltage}" width="500" height="250" style="border: 1px solid #cbd5e1;" /></td>
                    <td><img src="${imgCurrent}" width="500" height="250" style="border: 1px solid #cbd5e1;" /></td>
                </tr>
                <tr>
                    <td><img src="${imgTemp}" width="500" height="250" style="border: 1px solid #cbd5e1;" /></td>
                    <td><img src="${imgPower}" width="500" height="250" style="border: 1px solid #cbd5e1;" /></td>
                </tr>
            </table>
            <br/>
            <h4 style="background: #e2e8f0; padding: 6px; margin-bottom: 0;">TABEL DATA LOG PARAMETER KELISTRIKAN LENGKAP 24 JAM</h4>
            <table border="1" style="border-collapse: collapse; font-family: Arial; font-size: 11px; width: 100%;">
                <tr style="background-color: #0284c7; color: #ffffff; font-weight: bold; text-align: center;">
                    <th>Jam</th><th>V R-N (V)</th><th>V S-N (V)</th><th>V T-N (V)</th>
                    <th>V R-S (V)</th><th>V S-T (V)</th><th>V T-R (V)</th>
                    <th>I R (A)</th><th>I S (A)</th><th>I T (A)</th><th>I Netral (A)</th>
                    <th>P (kW)</th><th>Q (kVAR)</th><th>S (kVA)</th><th>Cos φ</th><th>Freq (Hz)</th>
                    <th>Suhu Trafo (°C)</th><th>Suhu Fuse (°C)</th>
                </tr>`;

        data24h.forEach(d => {
            html += `<tr>
                <td align="center">${d.hourLabel}</td>
                <td align="${d.hasData ? 'right' : 'center'}">${d.hasData ? d.vrn : '-'}</td>
                <td align="${d.hasData ? 'right' : 'center'}">${d.hasData ? d.vsn : '-'}</td>
                <td align="${d.hasData ? 'right' : 'center'}">${d.hasData ? d.vtn : '-'}</td>
                <td align="${d.hasData ? 'right' : 'center'}">${d.hasData ? d.vrs : '-'}</td>
                <td align="${d.hasData ? 'right' : 'center'}">${d.hasData ? d.vst : '-'}</td>
                <td align="${d.hasData ? 'right' : 'center'}">${d.hasData ? d.vtr : '-'}</td>
                <td align="${d.hasData ? 'right' : 'center'}">${d.hasData ? d.ir : '-'}</td>
                <td align="${d.hasData ? 'right' : 'center'}">${d.hasData ? d.is : '-'}</td>
                <td align="${d.hasData ? 'right' : 'center'}">${d.hasData ? d.it : '-'}</td>
                <td align="${d.hasData ? 'right' : 'center'}">${d.hasData ? d.in : '-'}</td>
                <td align="${d.hasData ? 'right' : 'center'}">${d.hasData ? d.p : '-'}</td>
                <td align="${d.hasData ? 'right' : 'center'}">${d.hasData ? d.q : '-'}</td>
                <td align="${d.hasData ? 'right' : 'center'}">${d.hasData ? d.s : '-'}</td>
                <td align="center">${d.hasData ? d.pf : '-'}</td>
                <td align="center">${d.hasData ? d.freq : '-'}</td>
                <td align="${d.hasData ? 'right' : 'center'}">${d.hasData ? d.temp_trafo : '-'}</td>
                <td align="${d.hasData ? 'right' : 'center'}">${d.hasData ? d.temp_fuse : '-'}</td>
            </tr>`;
        });

        html += `</table></div>`;
    }

    html += `</body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Laporan_Telemetri_Gardu_DK186_${dateStr}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ==============================================================================
// 10. APP INITIALIZATION
// ==============================================================================
document.addEventListener('DOMContentLoaded', () => {
    checkAuthSession();
    updateTopClock();
    setInterval(updateTopClock, 200); // 200ms polling eliminates clock second phase lag

    initCharts();
    loadSavedConfig();
    restartDataEngine();

    // Default view: all feeders
    selectFeederView('all');
});
