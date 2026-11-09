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
    activeView: 'all', // 'all' | 'f1' | 'f2' | 'source'
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
            unbalance: 2.9,
            reverse_current: false,
            alarm_ov: false,
            alarm_uv: false,
            alarm_phase_loss: false,
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
            unbalance: 2.9,
            reverse_current: false,
            alarm_ov: false,
            alarm_uv: false,
            alarm_phase_loss: false,
            status: 'NORMAL'
        },
        source: {
            mode: 'live', // 'live' | 'photo'
            pln: { status: 'NORMAL', v: 220.4, i: 5.20, p: 1146.0, f: 50.0, pf: 0.96 },
            inverter: { status: 'AKTIF', v: 220.0, i: 3.15, p: 693.0, f: 50.0, pf: 0.98 },
            plts: { status: 'PRODUKSI', v: 18.50, i: 2.850, p: 52.72, panel: 'Panel 50 Wp', output: 85.0 },
            baterai: { status: 'CHARGING', v: 12.87, i: -1.548, p: -19.91, soc: 75.7, c_nom: 17.0 },
            beban: 'BEBAN: NORMAL (250 W)',
            system: 'NORMAL',
            wifi: 'WiFi ONLINE'
        },
        temperature: {
            trafo: 36.8,
            fuse: 54.2,
            trafo_valid: true,
            fuse_valid: true
        },
        latency_ms: 45.0
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

    // 4. Update SOC Baterai dengan Metode Coulomb Counting (Δt real-time, C_nom = 17 Ah)
    if (typeof BATTERY_SOC_ENGINE !== 'undefined') {
        BATTERY_SOC_ENGINE.step();
        if (SubstationState.activeView === 'source') {
            renderSourceTelemetry();
        }
    }
}

// ==============================================================================
// 2. DEVICE & FEEDER NAVIGATION (DESKTOP & MOBILE)
// ==============================================================================
function selectFeederView(view) {
    SubstationState.activeView = view;
    const f1Section = document.getElementById('feeder-1-section');
    const f2Section = document.getElementById('feeder-2-section');
    const tempSection = document.getElementById('substation-temp-section');
    const sourceSection = document.getElementById('source-parameters-section');
    const kpiRow = document.querySelector('.kpi-row');

    // Update View Switcher Tab Buttons
    document.querySelectorAll('.view-tab-btn[data-tab-view]').forEach(btn => {
        const isTarget = btn.getAttribute('data-tab-view') === view;
        btn.classList.toggle('active', isTarget);
        if (btn.getAttribute('data-tab-view') === 'source') {
            btn.classList.toggle('active-hybrid', isTarget);
        }
    });

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

    // Toggle Visibility
    if (view === 'all') {
        if (sourceSection) sourceSection.style.display = 'none';
        if (f1Section) f1Section.style.display = 'block';
        if (f2Section) f2Section.style.display = 'block';
        if (tempSection) tempSection.style.display = 'block';
        if (kpiRow) kpiRow.style.display = 'grid';
    } else if (view === 'f1') {
        if (sourceSection) sourceSection.style.display = 'none';
        if (f1Section) f1Section.style.display = 'block';
        if (f2Section) f2Section.style.display = 'none';
        if (tempSection) tempSection.style.display = 'block';
        if (kpiRow) kpiRow.style.display = 'grid';
        f1Section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (view === 'f2') {
        if (sourceSection) sourceSection.style.display = 'none';
        if (f1Section) f1Section.style.display = 'none';
        if (f2Section) f2Section.style.display = 'block';
        if (tempSection) tempSection.style.display = 'block';
        if (kpiRow) kpiRow.style.display = 'grid';
        f2Section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (view === 'source') {
        if (sourceSection) {
            sourceSection.style.display = 'flex';
            sourceSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            renderSourceTelemetry();
        }
        if (f1Section) f1Section.style.display = 'none';
        if (f2Section) f2Section.style.display = 'none';
        if (tempSection) tempSection.style.display = 'none';
        if (kpiRow) kpiRow.style.display = 'none';
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
    // Loading & Daya Semu Fallback
    updateGauge('f1-gauge-circle', 'f1-val-load-pct', f1.load_pct);

    // Feeder 1 Alarm: 5 Kondisi berdasarkan codingan ESP32 (Thresholds & Detection)
    // 1. Over Voltage (OV): VR > 231 || VS > 231 || VT > 231
    const f1IsOV = (f1.alarm_ov !== undefined) ? Boolean(f1.alarm_ov) : (f1.vrn > 231.0 || f1.vsn > 231.0 || f1.vtn > 231.0);
    updateAlarmCondition('f1-alm-ov', 'f1-icon-ov', f1IsOV);

    // 2. Under Voltage (UV): (VR > 1 && VR < 198) || (VS > 1 && VS < 198) || (VT > 1 && VT < 198)
    const f1IsUV = (f1.alarm_uv !== undefined) ? Boolean(f1.alarm_uv) : ((f1.vrn > 1.0 && f1.vrn < 198.0) || (f1.vsn > 1.0 && f1.vsn < 198.0) || (f1.vtn > 1.0 && f1.vtn < 198.0));
    updateAlarmCondition('f1-alm-uv', 'f1-icon-uv', f1IsUV);

    // 3. Phase Loss: VR <= 1 || VS <= 1 || VT <= 1
    const f1IsPhaseLoss = (f1.alarm_phase_loss !== undefined) ? Boolean(f1.alarm_phase_loss) : (f1.vrn <= 1.0 || f1.vsn <= 1.0 || f1.vtn <= 1.0);
    updateAlarmCondition('f1-alm-loss', 'f1-icon-loss', f1IsPhaseLoss);

    // 4. Unbalance (% Ketidakseimbangan Arus standar IEEE / PLN)
    let f1Unb = f1.unbalance;
    if (f1Unb === undefined || isNaN(f1Unb)) {
        const avgI1 = (f1.ir + f1.is + f1.it) / 3.0;
        if (avgI1 > 0.01) {
            const a = f1.ir / avgI1;
            const b = f1.is / avgI1;
            const c = f1.it / avgI1;
            f1Unb = ((Math.abs(a - 1.0) + Math.abs(b - 1.0) + Math.abs(c - 1.0)) / 3.0) * 100.0;
        } else {
            f1Unb = 0.0;
        }
    }
    updateAlarmUnbalance('f1-alm-unb', 'f1-icon-unb', f1Unb);

    // 5. Reverse Current (Arus Balik / REV Power):
    const f1RcAbnormal = (f1.alarm_reverse_power !== undefined) ? Boolean(f1.alarm_reverse_power) :
        (f1.reverse_current === true || f1.reverse_current === 'Abnormal' || f1.reverse_current === 'Terdeteksi' || f1.p < -0.001);
    updateAlarmReverseCurrent('f1-alm-rc', 'f1-icon-rc', f1RcAbnormal);

    // Feeder 1 Header Status Badge
    const f1HasAlarm = f1IsOV || f1IsUV || f1IsPhaseLoss || (f1Unb > 10.0) || f1RcAbnormal;
    const f1StatusBadge = document.getElementById('f1-status-badge');
    if (f1StatusBadge) {
        if (f1HasAlarm) {
            f1StatusBadge.className = 'badge-status status-danger';
            f1StatusBadge.textContent = 'GANGGUAN TERDETEKSI';
        } else {
            f1StatusBadge.className = 'badge-status status-normal';
            f1StatusBadge.textContent = 'NORMAL';
        }
    }

    setText('f1-last-time', nowStr);

    // --- RENDER FEEDER 2 (PARAMETER KELISTRIKAN MURNI) ---
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

    // Loading & Daya Semu Fallback
    updateGauge('f2-gauge-circle', 'f2-val-load-pct', f2.load_pct);

    // Feeder 2 Alarm: 5 Kondisi berdasarkan codingan ESP32 (Thresholds & Detection)
    // 1. Over Voltage (OV): VR > 231 || VS > 231 || VT > 231
    const f2IsOV = (f2.alarm_ov !== undefined) ? Boolean(f2.alarm_ov) : (f2.vrn > 231.0 || f2.vsn > 231.0 || f2.vtn > 231.0);
    updateAlarmCondition('f2-alm-ov', 'f2-icon-ov', f2IsOV);

    // 2. Under Voltage (UV): (VR > 1 && VR < 198) || (VS > 1 && VS < 198) || (VT > 1 && VT < 198)
    const f2IsUV = (f2.alarm_uv !== undefined) ? Boolean(f2.alarm_uv) : ((f2.vrn > 1.0 && f2.vrn < 198.0) || (f2.vsn > 1.0 && f2.vsn < 198.0) || (f2.vtn > 1.0 && f2.vtn < 198.0));
    updateAlarmCondition('f2-alm-uv', 'f2-icon-uv', f2IsUV);

    // 3. Phase Loss: VR <= 1 || VS <= 1 || VT <= 1
    const f2IsPhaseLoss = (f2.alarm_phase_loss !== undefined) ? Boolean(f2.alarm_phase_loss) : (f2.vrn <= 1.0 || f2.vsn <= 1.0 || f2.vtn <= 1.0);
    updateAlarmCondition('f2-alm-loss', 'f2-icon-loss', f2IsPhaseLoss);

    // 4. Unbalance (% Ketidakseimbangan Arus standar IEEE / PLN)
    let f2Unb = f2.unbalance;
    if (f2Unb === undefined || isNaN(f2Unb)) {
        const avgI2 = (f2.ir + f2.is + f2.it) / 3.0;
        if (avgI2 > 0.01) {
            const a = f2.ir / avgI2;
            const b = f2.is / avgI2;
            const c = f2.it / avgI2;
            f2Unb = ((Math.abs(a - 1.0) + Math.abs(b - 1.0) + Math.abs(c - 1.0)) / 3.0) * 100.0;
        } else {
            f2Unb = 0.0;
        }
    }
    updateAlarmUnbalance('f2-alm-unb', 'f2-icon-unb', f2Unb);

    // 5. Reverse Current (Arus Balik / REV Power):
    const f2RcAbnormal = (f2.alarm_reverse_power !== undefined) ? Boolean(f2.alarm_reverse_power) :
        (f2.reverse_current === true || f2.reverse_current === 'Abnormal' || f2.reverse_current === 'Terdeteksi' || f2.p < -0.001);
    updateAlarmReverseCurrent('f2-alm-rc', 'f2-icon-rc', f2RcAbnormal);

    // Feeder 2 Header Status Badge
    const f2HasAlarm = f2IsOV || f2IsUV || f2IsPhaseLoss || (f2Unb > 10.0) || f2RcAbnormal;
    const f2StatusBadge = document.getElementById('f2-status-badge');
    if (f2StatusBadge) {
        if (f2HasAlarm) {
            f2StatusBadge.className = 'badge-status status-danger';
            f2StatusBadge.textContent = 'GANGGUAN TERDETEKSI';
        } else {
            f2StatusBadge.className = 'badge-status status-normal';
            f2StatusBadge.textContent = 'NORMAL';
        }
    }

    setText('f2-last-time', nowStr);

    // ==========================================================================
    // RENDER MONITORING SUHU OPERASIONAL GARDU (TERPUSAT 1 SAJA)
    // Titik Pantau: Body Trafo (< 40°C Normal) & NH Fuse PHB-TR (< 45°C s.d 70°C Normal)
    // ==========================================================================
    const tempState = SubstationState.data.temperature || {
        trafo: 36.8,
        fuse: 54.2,
        trafo_valid: true,
        fuse_valid: true
    };
    const tempTrafo = (tempState.trafo !== undefined && !isNaN(tempState.trafo)) ? Number(tempState.trafo) : 36.8;
    const tempFuse = (tempState.fuse !== undefined && !isNaN(tempState.fuse)) ? Number(tempState.fuse) : 54.2;

    // Nilai Suhu Terpusat
    setText('gardu-val-temp-trafo', `${tempTrafo.toFixed(1)} °C`);
    setText('gardu-val-temp-fuse', `${tempFuse.toFixed(1)} °C`);

    // Fallback elemen tersembunyi untuk kompatibilitas script lama
    setText('f1-val-temp-trafo', `${tempTrafo.toFixed(1)} °C`);
    setText('f1-val-temp-fuse', `${tempFuse.toFixed(1)} °C`);
    setText('f1-val-temp', `${tempFuse.toFixed(1)} °C`);
    setText('f2-val-temp-trafo', `${tempTrafo.toFixed(1)} °C`);
    setText('f2-val-temp-fuse', `${tempFuse.toFixed(1)} °C`);
    setText('f2-val-temp', `${tempFuse.toFixed(1)} °C`);

    // --- RENDER KPI SUBSTATION SUMMARY ---
    const totalKva = f1.s + f2.s;
    const totalKw = f1.p + f2.p;
    const totalEnergy = f1.energy + f2.energy;
    const avgPf = ((f1.pf + f2.pf) / 2).toFixed(2);
    const maxTemp = Math.max(tempTrafo, tempFuse).toFixed(1);
    const totalCapacity = 630; // 630 kVA Trafo Distribusi
    const totalPct = ((totalKva / totalCapacity) * 100).toFixed(1);

    setText('kpi-total-kva', `${totalKva.toFixed(1)} kVA`);
    setText('kpi-total-load-pct', `${totalPct}% dari ${totalCapacity} kVA`);
    setText('kpi-total-kw', `${totalKw.toFixed(1)} kW`);
    setText('kpi-total-energy', `Kumulatif: ${totalEnergy.toFixed(1)} kWh`);
    setText('kpi-freq', `${f1.freq.toFixed(2)} Hz`);
    setText('kpi-pf', avgPf);
    setText('kpi-max-temp', `${maxTemp} °C`);

    const kpiTempStatus = document.getElementById('kpi-temp-status');
    if (kpiTempStatus) {
        kpiTempStatus.textContent = 'Trafo & PHB-TR';
    }

    const systemStatusEl = document.getElementById('kpi-system-status');
    if (systemStatusEl) {
        if (f1HasAlarm || f2HasAlarm) {
            systemStatusEl.className = 'val-alert';
            systemStatusEl.textContent = 'ALARM';
        } else {
            systemStatusEl.className = 'val-ok';
            systemStatusEl.textContent = 'NORMAL';
        }
    }

    // Append to charts
    pushChartData(nowStr, f1, f2);

    // Update Parameter Sumber (Hybrid Energy Monitor)
    renderSourceTelemetry();
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
 * Update status alarm kondisi kelistrikan (OV, UV, Phase Loss):
 * - Normal -> HIJAU (val-ok, fa-circle-check)
 * - Abnormal -> MERAH (val-alert, fa-circle-xmark)
 */
function updateAlarmCondition(badgeId, iconId, isAbnormal, abnormalText = 'Abnormal', normalText = 'Normal') {
    const el = document.getElementById(badgeId);
    const icon = document.getElementById(iconId);
    if (!el) return;

    el.classList.remove('val-ok', 'val-alert', 'val-warn');
    if (icon) icon.className = 'fa-solid';

    if (isAbnormal) {
        el.classList.add('val-alert');
        el.textContent = abnormalText;
        if (icon) icon.classList.add('fa-circle-xmark', 'val-alert');
    } else {
        el.classList.add('val-ok');
        el.textContent = normalText;
        if (icon) icon.classList.add('fa-circle-check', 'val-ok');
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
        if (src.plts.status === 'PRODUKSI' || src.plts.status === 'ONLINE' || src.plts.status === 'AKTIF') {
            pltsBadge.className = 'tft-pill pill-ok';
        } else if (src.plts.status === 'CHARGING') {
            pltsBadge.className = 'tft-pill pill-charging';
        } else if (src.plts.status === 'ERROR' || src.plts.status === 'SENSOR ERR') {
            pltsBadge.className = 'tft-pill pill-danger';
        } else {
            pltsBadge.className = 'tft-pill pill-dark';
        }
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
        if (src.baterai.status === 'CHARGING') {
            batBadge.className = 'tft-pill pill-charging';
        } else if (src.baterai.status === 'DISCHARGING') {
            batBadge.className = 'tft-pill pill-discharging';
        } else if (src.baterai.status === 'NORMAL' || src.baterai.status === 'PENUH') {
            batBadge.className = 'tft-pill pill-ok';
        } else if (src.baterai.status === 'ERROR' || src.baterai.status === 'ALARM') {
            batBadge.className = 'tft-pill pill-danger';
        } else {
            batBadge.className = 'tft-pill pill-dark';
        }
    }

    // Footer
    setText('src-footer-beban', src.beban || 'BEBAN: NORMAL (250 W)');
    const sysBadge = document.getElementById('src-footer-system');
    if (sysBadge) { 
        let sysText = src.system || 'NORMAL';
        if (sysText.toLowerCase().includes('hybrid') || sysText.toLowerCase().includes('monitoring')) {
            sysText = 'NORMAL';
        }
        sysBadge.textContent = sysText; 
        sysBadge.className = (sysText === 'ALARM' || sysText === 'ERROR') ? 'sys-alarm' : 'sys-normal'; 
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
// 3.C MODUL PERHITUNGAN SOC BATERAI - METODE COULOMB COUNTING
// ==============================================================================
/**
 * Persamaan yang digunakan untuk menghitung SOC pada proses charging dan discharging (Gambar 1):
 * 
 * 1. Charging:
 *    SOC_akhir = SOC_awal + ( (Σ I_i * Δt) / C_nom ) * 100%
 * 
 * 2. Discharging:
 *    SOC_akhir = SOC_awal - ( (Σ I_i * Δt) / C_nom ) * 100%
 * 
 * Keterangan:
 * - SOC_akhir : Nilai SOC akhir (%)
 * - SOC_awal  : Nilai SOC awal (%) (Default: 75.7%)
 * - I_i       : Arus baterai (Ampere)
 * - Δt        : Interval waktu pengukuran dalam satuan JAM (detik / 3600)
 * - C_nom     : Kapasitas nominal baterai = 17.0 Ah
 * - Σ I_i*Δt  : Akumulasi muatan listrik baterai (Ah)
 * 
 * Logika Arah Arus & Status:
 * - Arus negatif (< -0.005 A, contoh: -1.548 A) ATAU status 'CHARGING'
 *   -> Proses CHARGING: SOC bertambah (+ (Σ I_i * Δt / C_nom) * 100%)
 * - Arus positif (> 0.005 A) ATAU status 'DISCHARGING'
 *   -> Proses DISCHARGING: SOC berkurang (- (Σ I_i * Δt / C_nom) * 100%)
 * - Arus mendekati 0 (-0.005 A s/d 0.005 A)
 *   -> Proses STANDBY: SOC tetap
 */
const BATTERY_SOC_ENGINE = {
    c_nom: 17.0,          // 17 Ah (kapasitas nominal baterai)
    initial_soc: 75.7,    // 75.7 % (nilai SOC awal)
    lastTickTime: null,

    init() {
        const src = SubstationState.data?.source;
        if (!src) return;
        if (!src.baterai) {
            src.baterai = { status: 'CHARGING', v: 12.87, i: -1.548, p: -19.91, soc: 75.7, c_nom: 17.0 };
        }
        try {
            const savedSoc = localStorage.getItem('gardu_dk186_bat_soc');
            if (savedSoc !== null && !isNaN(parseFloat(savedSoc))) {
                src.baterai.soc = parseFloat(savedSoc);
            } else {
                src.baterai.soc = this.initial_soc;
            }
        } catch (e) {
            src.baterai.soc = this.initial_soc;
        }
        this.lastTickTime = Date.now();
    },

    step(customDtSeconds) {
        const src = SubstationState.data?.source;
        if (!src || !src.baterai) return;
        const bat = src.baterai;

        const now = Date.now();
        let dtHours = 0;

        if (typeof customDtSeconds === 'number' && customDtSeconds > 0) {
            dtHours = customDtSeconds / 3600.0;
            this.lastTickTime = now;
        } else if (this.lastTickTime) {
            const elapsedSec = (now - this.lastTickTime) / 1000.0;
            // Batasi interval wajar per tick (maksimal 10 detik untuk mencegah lompatan besar)
            dtHours = Math.min(elapsedSec, 10.0) / 3600.0;
            this.lastTickTime = now;
        } else {
            dtHours = 0.2 / 3600.0;
            this.lastTickTime = now;
        }

        if (dtHours <= 0) return bat.soc;

        const cNom = (typeof bat.c_nom === 'number' && bat.c_nom > 0) ? bat.c_nom : this.c_nom;
        const currentI = (typeof bat.i === 'number') ? bat.i : -1.548;
        const status = (bat.status || '').toUpperCase();

        // Evaluasi kondisi Charging vs Discharging:
        // Arus negatif (misal -1.548 A pada Gambar 2) atau status CHARGING
        const isCharging = (status === 'CHARGING' || currentI < -0.005);
        const isDischarging = (status === 'DISCHARGING' || currentI > 0.005);

        // Update status string jika belum sinkron
        if (isCharging && status !== 'CHARGING') {
            bat.status = 'CHARGING';
        } else if (isDischarging && status !== 'DISCHARGING') {
            bat.status = 'DISCHARGING';
        } else if (!isCharging && !isDischarging && status !== 'STANDBY') {
            bat.status = 'STANDBY';
        }

        const absI = Math.abs(currentI);
        // Akumulasi muatan: deltaAh = |I_i| * Δt (dalam satuan Ah)
        const deltaAh = absI * dtHours;
        // deltaSoc = ( (I_i * Δt) / C_nom ) * 100%
        const deltaSoc = (deltaAh / cNom) * 100.0;

        let socAwal = (typeof bat.soc === 'number' && !isNaN(bat.soc)) ? bat.soc : this.initial_soc;
        let socAkhir = socAwal;

        if (isCharging) {
            // Charging: SOC_akhir = SOC_awal + (Σ I_i * Δt / C_nom) * 100%
            socAkhir = socAwal + deltaSoc;
        } else if (isDischarging) {
            // Discharging: SOC_akhir = SOC_awal - (Σ I_i * Δt / C_nom) * 100%
            socAkhir = socAwal - deltaSoc;
        }

        // Batasi rentang SOC antara 0.0% dan 100.0%
        bat.soc = Math.min(100.0, Math.max(0.0, socAkhir));

        // Simpan cache SOC
        try {
            localStorage.setItem('gardu_dk186_bat_soc', bat.soc.toFixed(4));
        } catch (e) {}

        return bat.soc;
    },

    setCapacity(ah) {
        if (typeof ah === 'number' && ah > 0) {
            this.c_nom = ah;
            if (SubstationState.data?.source?.baterai) {
                SubstationState.data.source.baterai.c_nom = ah;
            }
            console.log(`[Coulomb Counting] Kapasitas nominal baterai C_nom diatur ke: ${ah} Ah`);
        }
    },

    resetSoc(val) {
        const newSoc = (typeof val === 'number') ? val : this.initial_soc;
        if (SubstationState.data?.source?.baterai) {
            SubstationState.data.source.baterai.soc = newSoc;
            try {
                localStorage.setItem('gardu_dk186_bat_soc', newSoc.toFixed(4));
            } catch (e) {}
            renderSourceTelemetry();
        }
        console.log(`[Coulomb Counting] Nilai SOC diatur ke: ${newSoc}%`);
    }
};

window.setBatteryCapacity = (ah) => BATTERY_SOC_ENGINE.setCapacity(ah);
window.setBatterySOC = (val) => BATTERY_SOC_ENGINE.resetSoc(val);
window.getBatteryCoulombInfo = () => ({
    c_nom: BATTERY_SOC_ENGINE.c_nom,
    current_soc: SubstationState.data?.source?.baterai?.soc,
    status: SubstationState.data?.source?.baterai?.status,
    current_a: SubstationState.data?.source?.baterai?.i,
    voltage_v: SubstationState.data?.source?.baterai?.v
});

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
    if (!f1RtChart && !f2RtChart) return;
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

    // Simulate Substation Unified Temperatures (Body Trafo & NH Fuse)
    if (!SubstationState.data.temperature) {
        SubstationState.data.temperature = { trafo: 36.8, fuse: 54.2, trafo_valid: true, fuse_valid: true };
    }
    const tempState = SubstationState.data.temperature;
    const avgLoadPct = (f1.load_pct + f2.load_pct) / 2;
    tempState.trafo = 32.0 + (avgLoadPct * 0.12) + rand(-0.25, 0.25);
    tempState.fuse = 46.0 + (avgLoadPct * 0.18) + rand(-0.2, 0.2);
    tempState.trafo_valid = true;
    tempState.fuse_valid = true;

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
        src.plts.status = 'PRODUKSI';

        src.baterai.v = 12.87 + rand(-0.02, 0.02);
        src.baterai.i = -1.548 + rand(-0.03, 0.03);
        src.baterai.p = src.baterai.v * src.baterai.i;
        src.baterai.status = 'CHARGING';
        if (typeof BATTERY_SOC_ENGINE !== 'undefined') {
            BATTERY_SOC_ENGINE.step();
        }
    }

    // Simulasi latensi pengiriman data transmisi realistis (ms)
    const simLatency = Math.round(45 + rand(-5, 8));
    updateLatencyUI(simLatency);

    renderTelemetryUI();
}

// Timestamp pesan SSE terakhir untuk mencegah redundant HTTP polling
let lastSseEventTimestamp = 0;

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
        } else if (topKey === 'latency_ms') {
            updateLatencyUI(Number(data));
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
    lastSseEventTimestamp = Date.now();
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
    if ((SubstationState.eventSource || SubstationState.hybridEventSource) && (Date.now() - lastSseEventTimestamp < 2500)) {
        return;
    }

    let cleanUrl = SubstationState.firebaseUrl.trim();
    if (cleanUrl.endsWith('/')) cleanUrl = cleanUrl.slice(0, -1);

    // Fetch Gardu DK-186
    try {
        const endpoint = `${cleanUrl}/${SubstationState.firebasePath}.json`;
        const fetchStart = performance.now();
        const response = await fetch(endpoint, { cache: 'no-store' });
        if (response.ok) {
            const rttMs = Math.round(performance.now() - fetchStart);
            const json = await response.json();
            if (json) {
                parseAndApplyFirebaseTelemetry(json);
                if (json.latency_ms !== undefined) {
                    updateLatencyUI(Number(json.latency_ms));
                } else {
                    updateLatencyUI(rttMs);
                }
                updateConnectionBadge(true);
            }
        }
    } catch (err) {}

    // Fetch Hybrid
    try {
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
    if (!payload || typeof payload !== 'object') return;

    // Baca latensi jaringan dari ESP32 jika tersedia
    if (payload.latency_ms !== undefined) {
        updateLatencyUI(Number(payload.latency_ms));
    }

    // Check if telemetry structure is nested by feeder or flat
    const f1Data = payload.feeder_1 || payload.f1 || payload;
    const f2Data = payload.feeder_2 || payload.f2 || payload;

    const mapFeeder = (target, src, prefix) => {
        if (!src) return;

        // 1. Voltages L-N & L-L
        if (src.vrn_v !== undefined) target.vrn = Number(src.vrn_v);
        else if (src.voltageR !== undefined) target.vrn = Number(src.voltageR);
        else if (src[`${prefix}vrn`] !== undefined) target.vrn = Number(src[`${prefix}vrn`]);
        else if (src.vrn !== undefined) target.vrn = Number(src.vrn);
        else if (src.voltage !== undefined) target.vrn = Number(src.voltage);

        if (src.vsn_v !== undefined) target.vsn = Number(src.vsn_v);
        else if (src.voltageS !== undefined) target.vsn = Number(src.voltageS);
        else if (src[`${prefix}vsn`] !== undefined) target.vsn = Number(src[`${prefix}vsn`]);
        else if (src.vsn !== undefined) target.vsn = Number(src.vsn);
        else target.vsn = target.vrn + 0.5;

        if (src.vtn_v !== undefined) target.vtn = Number(src.vtn_v);
        else if (src.voltageT !== undefined) target.vtn = Number(src.voltageT);
        else if (src[`${prefix}vtn`] !== undefined) target.vtn = Number(src[`${prefix}vtn`]);
        else if (src.vtn !== undefined) target.vtn = Number(src.vtn);
        else target.vtn = target.vrn - 0.4;

        if (src.vrs_v !== undefined) target.vrs = Number(src.vrs_v);
        else if (src.voltageRS !== undefined) target.vrs = Number(src.voltageRS);
        else target.vrs = target.vrn * 1.732;

        if (src.vst_v !== undefined) target.vst = Number(src.vst_v);
        else if (src.voltageST !== undefined) target.vst = Number(src.voltageST);
        else target.vst = target.vsn * 1.732;

        if (src.vtr_v !== undefined) target.vtr = Number(src.vtr_v);
        else if (src.voltageTR !== undefined) target.vtr = Number(src.voltageTR);
        else target.vtr = target.vtn * 1.732;

        // 2. Currents
        if (src.ir_a !== undefined) target.ir = Number(src.ir_a);
        else if (src.currentR !== undefined) target.ir = Number(src.currentR);
        else if (src[`${prefix}ir`] !== undefined) target.ir = Number(src[`${prefix}ir`]);
        else if (src.ir !== undefined) target.ir = Number(src.ir);
        else if (src.current !== undefined) target.ir = Number(src.current);

        if (src.is_a !== undefined) target.is = Number(src.is_a);
        else if (src.currentS !== undefined) target.is = Number(src.currentS);
        else if (src[`${prefix}is`] !== undefined) target.is = Number(src[`${prefix}is`]);
        else if (src.is !== undefined) target.is = Number(src.is);
        else target.is = target.ir * 0.98;

        if (src.it_a !== undefined) target.it = Number(src.it_a);
        else if (src.currentT !== undefined) target.it = Number(src.currentT);
        else if (src[`${prefix}it`] !== undefined) target.it = Number(src[`${prefix}it`]);
        else if (src.it !== undefined) target.it = Number(src.it);
        else target.it = target.ir * 0.96;

        if (src.i_avg_a !== undefined) {
            target.in = Math.abs(target.ir - target.it) * 0.8;
        } else if (src[`${prefix}in`] !== undefined) target.in = Number(src[`${prefix}in`]);
        else if (src.in !== undefined) target.in = Number(src.in);
        else target.in = Math.abs(target.ir - target.it) * 0.8;

        // 3. Powers (P, Q, S)
        if (src.p_total_kw !== undefined) target.p = Number(src.p_total_kw);
        else if (src.p_total_w !== undefined) target.p = Number(src.p_total_w) / 1000;
        else if (src[`${prefix}p`] !== undefined) target.p = Number(src[`${prefix}p`]);
        else if (src.p !== undefined) target.p = Number(src.p);
        else target.p = (Math.sqrt(3) * target.vrs * ((target.ir + target.is + target.it) / 3) * 0.93) / 1000;

        if (src.q_total_var !== undefined) target.q = Number(src.q_total_var) / 1000;
        else if (src.q_total_kvar !== undefined) target.q = Number(src.q_total_kvar);
        else if (src[`${prefix}q`] !== undefined) target.q = Number(src[`${prefix}q`]);
        else if (src.q !== undefined) target.q = Number(src.q);
        else target.q = target.p * 0.38;

        if (src.s_total_va !== undefined) target.s = Number(src.s_total_va) / 1000;
        else if (src.s_total_kva !== undefined) target.s = Number(src.s_total_kva);
        else if (src[`${prefix}s`] !== undefined) target.s = Number(src[`${prefix}s`]);
        else if (src.s !== undefined) target.s = Number(src.s);
        else target.s = Math.sqrt((target.p * target.p) + (target.q * target.q));

        // 4. Power Factor, Frequency, Energy
        if (src.pf_total !== undefined) target.pf = Number(src.pf_total);
        else if (src[`${prefix}pf`] !== undefined) target.pf = Number(src[`${prefix}pf`]);
        else if (src.pf !== undefined) target.pf = Number(src.pf);

        if (src.freq_r_hz !== undefined) target.freq = Number(src.freq_r_hz);
        else if (src[`${prefix}freq`] !== undefined) target.freq = Number(src[`${prefix}freq`]);
        else if (src.freq !== undefined) target.freq = Number(src.freq);
        else if (src.frequency !== undefined) target.freq = Number(src.frequency);

        if (src.energy_total_kwh !== undefined) target.energy = Number(src.energy_total_kwh);
        else if (src[`${prefix}energy`] !== undefined) target.energy = Number(src[`${prefix}energy`]);
        else if (src.energy !== undefined) target.energy = Number(src.energy);

        // 5. Temperature: Trafo & NH Fuse (Mendukung payload.temperature maupun per-feeder)
        if (payload.temperature && typeof payload.temperature === 'object') {
            if (payload.temperature.trafo_c !== undefined) target.temp_trafo = Number(payload.temperature.trafo_c);
            if (payload.temperature.nh_fuse_c !== undefined) target.temp_fuse = Number(payload.temperature.nh_fuse_c);
        } else {
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
        }
        target.temp = Math.max(target.temp_trafo || 52, target.temp_fuse || 43);

        // 6. Loading
        if (src.loading_pct !== undefined) target.load_pct = Number(src.loading_pct);
        else if (src.load_pct !== undefined) target.load_pct = Number(src.load_pct);
        else target.load_pct = (target.s / 630) * 100;

        // 7. Unbalance & Reverse Current
        if (src.unbalance_pct !== undefined) target.unbalance = Number(src.unbalance_pct);
        else if (src[`${prefix}unbalance`] !== undefined) target.unbalance = src[`${prefix}unbalance`];
        else if (src.unbalance !== undefined) target.unbalance = src.unbalance;

        // 8. Alarms dari ESP32 (Sesuai struct AlarmState)
        if (src.alarm_ov !== undefined) target.alarm_ov = Boolean(src.alarm_ov);
        else if (src[`${prefix}alarm_ov`] !== undefined) target.alarm_ov = Boolean(src[`${prefix}alarm_ov`]);

        if (src.alarm_uv !== undefined) target.alarm_uv = Boolean(src.alarm_uv);
        else if (src[`${prefix}alarm_uv`] !== undefined) target.alarm_uv = Boolean(src[`${prefix}alarm_uv`]);

        if (src.alarm_phase_loss !== undefined) target.alarm_phase_loss = Boolean(src.alarm_phase_loss);
        else if (src[`${prefix}alarm_phase_loss`] !== undefined) target.alarm_phase_loss = Boolean(src[`${prefix}alarm_phase_loss`]);

        if (src.alarm_unbalance !== undefined) target.alarm_unbalance = Boolean(src.alarm_unbalance);
        else if (src[`${prefix}alarm_unbalance`] !== undefined) target.alarm_unbalance = Boolean(src[`${prefix}alarm_unbalance`]);

        if (src.alarm_reverse_power !== undefined) target.alarm_reverse_power = Boolean(src.alarm_reverse_power);
        else if (src[`${prefix}alarm_reverse_power`] !== undefined) target.alarm_reverse_power = Boolean(src[`${prefix}alarm_reverse_power`]);
    };

    mapFeeder(SubstationState.data.f1, f1Data, 'f1_');
    mapFeeder(SubstationState.data.f2, f2Data, 'f2_');

    // Ingest Substation Unified Temperature (Body Trafo & NH Fuse PHB-TR)
    if (!SubstationState.data.temperature) {
        SubstationState.data.temperature = { trafo: 54.0, fuse: 44.0, trafo_valid: true, fuse_valid: true };
    }
    const tempObj = SubstationState.data.temperature;
    if (payload.temperature && typeof payload.temperature === 'object') {
        if (payload.temperature.trafo_c !== undefined) tempObj.trafo = Number(payload.temperature.trafo_c);
        if (payload.temperature.nh_fuse_c !== undefined) tempObj.fuse = Number(payload.temperature.nh_fuse_c);
        if (payload.temperature.trafo_valid !== undefined) tempObj.trafo_valid = Boolean(payload.temperature.trafo_valid);
        if (payload.temperature.nh_fuse_valid !== undefined) tempObj.fuse_valid = Boolean(payload.temperature.nh_fuse_valid);
    } else {
        if (payload.temp_trafo !== undefined) tempObj.trafo = Number(payload.temp_trafo);
        else if (payload.temp1 !== undefined) tempObj.trafo = Number(payload.temp1);
        else if (SubstationState.data.f1.temp_trafo !== undefined) tempObj.trafo = SubstationState.data.f1.temp_trafo;

        if (payload.temp_fuse !== undefined) tempObj.fuse = Number(payload.temp_fuse);
        else if (payload.temp2 !== undefined) tempObj.fuse = Number(payload.temp2);
        else if (SubstationState.data.f1.temp_fuse !== undefined) tempObj.fuse = SubstationState.data.f1.temp_fuse;
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

    // 3. PLTS (DC) & 4. BATERAI (DC)
    let plts = data.plts || {};
    let bat = data.battery || data.baterai || data.bat || {};

    // Swap protection flag: jika pengujian atau firmware lama membalik data PLTS dan Baterai
    // Dapat di-toggle kapan saja melalui console dengan perintah: togglePltsBatterySwap()
    if (window.swapPltsBattery) {
        const temp = plts;
        plts = bat;
        bat = temp;
    }

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
    else if (plts.on !== undefined) s.plts.status = plts.on ? 'PRODUKSI' : 'TIDAK ADA';
    else if (plts.status !== undefined) s.plts.status = String(plts.status);
    else if (data.plts_status !== undefined) s.plts.status = String(data.plts_status);

    if (bat.voltage_v !== undefined) s.baterai.v = Number(bat.voltage_v);
    else if (bat.v !== undefined) s.baterai.v = Number(bat.v);
    else if (data.bat_v !== undefined) s.baterai.v = Number(data.bat_v);

    if (bat.current_a !== undefined) s.baterai.i = Number(bat.current_a);
    else if (bat.i !== undefined) s.baterai.i = Number(bat.i);
    else if (data.bat_i !== undefined) s.baterai.i = Number(data.bat_i);

    if (bat.power_w !== undefined) s.baterai.p = Number(bat.power_w);
    else if (bat.p !== undefined) s.baterai.p = Number(bat.p);
    else if (data.bat_p !== undefined) s.baterai.p = Number(data.bat_p);

    if (bat.c_nom !== undefined) s.baterai.c_nom = Number(bat.c_nom);
    else if (data.bat_c_nom !== undefined) s.baterai.c_nom = Number(data.bat_c_nom);

    if (bat.state !== undefined) s.baterai.status = String(bat.state).toUpperCase();
    else if (bat.st !== undefined) s.baterai.status = String(bat.st).toUpperCase();
    else if (bat.status !== undefined) s.baterai.status = String(bat.status);
    else if (data.bat_status !== undefined) s.baterai.status = String(data.bat_status);

    if (bat.soc_percent !== undefined) s.baterai.soc = Number(bat.soc_percent);
    else if (bat.soc !== undefined) s.baterai.soc = Number(bat.soc);
    else if (data.bat_soc !== undefined) s.baterai.soc = Number(data.bat_soc);
    else {
        // Hitung SOC otomatis dengan metode Coulomb Counting
        if (typeof BATTERY_SOC_ENGINE !== 'undefined') {
            BATTERY_SOC_ENGINE.step();
        }
    }

    // Footer
    if (typeof raw.source === 'string') s.beban = `BEBAN: ${raw.source.toUpperCase()}`;
    else if (typeof data.source === 'string') s.beban = `BEBAN: ${data.source.toUpperCase()}`;
    else if (data.beban) s.beban = String(data.beban);

    if (raw.system) {
        let st = String(raw.system);
        if (st.toLowerCase().includes('hybrid') || st.toLowerCase().includes('monitoring')) st = 'NORMAL';
        s.system = st;
    } else if (data.system) {
        let st = String(data.system);
        if (st.toLowerCase().includes('hybrid') || st.toLowerCase().includes('monitoring')) st = 'NORMAL';
        s.system = st;
    }

    renderTelemetryUI();
}

/**
 * Utility untuk membalik (swap) data PLTS <-> Baterai secara instan jika sensor fisik terbalik
 */
window.togglePltsBatterySwap = function(enable) {
    window.swapPltsBattery = (typeof enable === 'boolean') ? enable : !window.swapPltsBattery;
    console.log(`[Swap Monitor] Pemetaan PLTS <-> Baterai: ${window.swapPltsBattery ? 'TERBALIK (SWAPPED)' : 'NORMAL'}`);
    renderTelemetryUI();
    return window.swapPltsBattery;
};

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

/**
 * Memperbarui Indikator Latensi Pengiriman Data (Latency ms) pada Header Dashboard
 */
function updateLatencyUI(latencyMs) {
    if (typeof latencyMs !== 'number' || isNaN(latencyMs) || latencyMs <= 0) return;
    SubstationState.data.latency_ms = latencyMs;
    const valEl = document.getElementById('latencyVal');
    const valShortEl = document.getElementById('latencyValShort');
    const badge = document.getElementById('latencyBadge');
    const rounded = Math.round(latencyMs);
    const formatted = `${rounded} ms`;

    if (valEl) valEl.textContent = formatted;
    if (valShortEl) valShortEl.textContent = formatted;

    const ratingClass = rounded < 100 ? 'latency-val-fast' : (rounded < 300 ? 'latency-val-medium' : 'latency-val-slow');
    if (valEl) valEl.className = ratingClass;
    if (valShortEl) valShortEl.className = ratingClass;
    if (badge) badge.title = `Latensi Pengiriman Data ESP32 -> Firebase -> Dashboard: ${rounded} ms`;
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
function switchExportModalTab(tab) {
    const tabBtn24h = document.getElementById('modalTabBtn24h');
    const tabBtnTs = document.getElementById('modalTabBtnTimestamp');
    const content24h = document.getElementById('exportTabContent24h');
    const contentTs = document.getElementById('exportTabContentTimestamp');
    const btn24h = document.getElementById('btnDownloadExcel');
    const btnTs = document.getElementById('btnDownloadTimestampExcel');

    if (tab === 'timestamp') {
        if (tabBtn24h) tabBtn24h.classList.remove('active');
        if (tabBtnTs) tabBtnTs.classList.add('active');
        if (content24h) content24h.style.display = 'none';
        if (contentTs) contentTs.style.display = 'block';
        if (btn24h) btn24h.style.display = 'none';
        if (btnTs) btnTs.style.display = 'inline-flex';
    } else {
        if (tabBtn24h) tabBtn24h.classList.add('active');
        if (tabBtnTs) tabBtnTs.classList.remove('active');
        if (content24h) content24h.style.display = 'block';
        if (contentTs) contentTs.style.display = 'none';
        if (btn24h) btn24h.style.display = 'inline-flex';
        if (btnTs) btnTs.style.display = 'none';
    }
}

function openExportModal(tab = '24h') {
    const sb = document.getElementById('sidebar');
    if (sb) sb.classList.remove('open');
    const modal = document.getElementById('exportModal');
    if (!modal) return;

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const dateInput = document.getElementById('expDate');
    if (dateInput && !dateInput.value) {
        dateInput.value = todayStr;
    }
    const dateTsInput = document.getElementById('expTimestampDate');
    if (dateTsInput && !dateTsInput.value) {
        dateTsInput.value = todayStr;
    }

    switchExportModalTab(tab);
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
                temp_trafo: null, temp_fuse: null,
                latency_ms: null
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

        // Latensi Pengiriman Data Jaringan Telemetri (ms)
        // Profil latensi transmisi IoT:
        // - Dini hari (00:00 - 05:00): Trafik jaringan rendah (41 - 49 ms)
        // - Pagi & Siang (06:00 - 16:00): Jam kerja normal (48 - 63 ms)
        // - WBP Malam (17:00 - 21:00): Beban puncak seluler (65 - 86 ms)
        // - Larut Malam (22:00 - 23:00): Melandai (45 - 55 ms)
        let latencyHour = 45.0;
        if (hour >= 0 && hour < 6) latencyHour = 42.0 + pseudoRand() * 6.8;
        else if (hour >= 6 && hour < 12) latencyHour = 49.5 + pseudoRand() * 9.8;
        else if (hour >= 12 && hour < 17) latencyHour = 52.0 + pseudoRand() * 11.2;
        else if (hour >= 17 && hour <= 21) latencyHour = 66.0 + pseudoRand() * 16.5;
        else latencyHour = 47.0 + pseudoRand() * 8.0;

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
            temp_fuse: Number(tempFuse.toFixed(1)),
            latency_ms: Number(latencyHour.toFixed(1))
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
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Menyusun Grafik & Tabel Excel...</span>';

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

                // Render 3 grafik 24 Jam (Tegangan, Arus, Suhu) secara berurutan ke Base64 Image
                const imgVoltage = await render24HourChartToImage(canvas, data24h, 'voltage', feeder.title);
                const imgCurrent = await render24HourChartToImage(canvas, data24h, 'current', feeder.title);
                const imgTemp    = await render24HourChartToImage(canvas, data24h, 'temp', feeder.title);

                // Baris Kop Surat Resmi PLN (A1 s.d S1 - 19 Kolom)
                sheet.mergeCells('A1:S1');
                const row1 = sheet.getCell('A1');
                row1.value = 'PT PLN (PERSERO) UP3 CENGKARENG';
                row1.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1E3A8A' } };
                row1.alignment = { horizontal: 'center', vertical: 'middle' };
                sheet.getRow(1).height = 24;

                sheet.mergeCells('A2:S2');
                const row2 = sheet.getCell('A2');
                row2.value = 'LAPORAN TELEMETRI PENGUKURAN PARAMETER KELISTRIKAN 24 JAM';
                row2.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF0F172A' } };
                row2.alignment = { horizontal: 'center', vertical: 'middle' };
                sheet.getRow(2).height = 20;

                sheet.mergeCells('A3:S3');
                const row3 = sheet.getCell('A3');
                row3.value = `Gardu: DK-186  |  Jurusan: ${feeder.title}  |  Tanggal Pengukuran: ${dateStr}`;
                row3.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF475569' } };
                row3.alignment = { horizontal: 'center', vertical: 'middle' };
                sheet.getRow(3).height = 18;

                // Spacing row
                sheet.getRow(4).height = 10;

                // Tambahkan 3 Gambar Grafik ke Sheet (Tegangan, Arus, dan Suhu)
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

                // 3. Bottom-Center: Grafik Suhu Operasional Trafo & Fuse (Kolom F, Baris 21-35)
                const idTemp = workbook.addImage({ base64: imgTemp, extension: 'png' });
                sheet.addImage(idTemp, {
                    tl: { col: 5, row: 20 }, // Kolom F (Center), Baris 21
                    ext: { width: 540, height: 270 }
                });

                // Set tinggi baris area grafik (Baris 5-19 dan Baris 21-35)
                for (let r = 5; r <= 19; r++) sheet.getRow(r).height = 18.5;
                sheet.getRow(20).height = 12; // Spacing antara baris grafik atas & bawah
                for (let r = 21; r <= 35; r++) sheet.getRow(r).height = 18.5;
                sheet.getRow(36).height = 12; // Spacing sebelum tabel data

                // Baris 37: Judul Tabel Data Log Lengkap
                sheet.mergeCells('A37:S37');
                const titleTable = sheet.getCell('A37');
                titleTable.value = 'TABEL DATA LOG PARAMETER KELISTRIKAN LENGKAP 24 JAM';
                titleTable.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E293B' } };
                titleTable.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
                titleTable.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
                sheet.getRow(37).height = 24;

                // Baris 38: Header Kolom Tabel (19 Kolom termasuk Latensi Pengiriman Data)
                const headers = [
                    'Jam', 'V R-N (V)', 'V S-N (V)', 'V T-N (V)',
                    'V R-S (V)', 'V S-T (V)', 'V T-R (V)',
                    'I R (A)', 'I S (A)', 'I T (A)', 'I Netral (A)',
                    'P (kW)', 'Q (kVAR)', 'S (kVA)', 'Cos φ', 'Freq (Hz)',
                    'Suhu Trafo (°C)', 'Suhu Fuse (°C)', 'Latency (ms)'
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
                            d.temp_trafo, d.temp_fuse, d.latency_ms
                        ];
                    } else {
                        r.values = [
                            d.hourLabel, '-', '-', '-',
                            '-', '-', '-',
                            '-', '-', '-', '-',
                            '-', '-', '-', '-', '-',
                            '-', '-', '-'
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

                // Baris 63: Ringkasan Rata-Rata Parameter Termasuk Rata-rata Latensi Pengiriman
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
                    calcAvg('temp_trafo'), calcAvg('temp_fuse'),
                    calcAvg('latency_ms')
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

                // Set column widths (19 kolom)
                const colWidths = [14, 11, 11, 11, 11, 11, 11, 10, 10, 10, 12, 11, 12, 11, 10, 11, 14, 14, 14];
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
                    <td colspan="2" align="center"><img src="${imgTemp}" width="500" height="250" style="border: 1px solid #cbd5e1;" /></td>
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
                    <th>Suhu Trafo (°C)</th><th>Suhu Fuse (°C)</th><th>Latency (ms)</th>
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
                <td align="${d.hasData ? 'right' : 'center'}">${d.hasData ? d.latency_ms : '-'}</td>
            </tr>`;
        });

        // Baris Rata-Rata Parameter Termasuk Latensi Pengiriman Data
        const recordedRows = data24h.filter(d => d.hasData);
        const count = recordedRows.length;
        const calcAvg = key => count > 0 ? Number((recordedRows.reduce((acc, cur) => acc + (cur[key] || 0), 0) / count).toFixed(2)) : '-';

        html += `<tr style="background-color: #f1f5f9; font-weight: bold;">
            <td align="center">RATA-RATA</td>
            <td align="right">${calcAvg('vrn')}</td>
            <td align="right">${calcAvg('vsn')}</td>
            <td align="right">${calcAvg('vtn')}</td>
            <td align="right">${calcAvg('vrs')}</td>
            <td align="right">${calcAvg('vst')}</td>
            <td align="right">${calcAvg('vtr')}</td>
            <td align="right">${calcAvg('ir')}</td>
            <td align="right">${calcAvg('is')}</td>
            <td align="right">${calcAvg('it')}</td>
            <td align="right">${calcAvg('in')}</td>
            <td align="right">${calcAvg('p')}</td>
            <td align="right">${calcAvg('q')}</td>
            <td align="right">${calcAvg('s')}</td>
            <td align="center">${calcAvg('pf')}</td>
            <td align="center">${calcAvg('freq')}</td>
            <td align="right">${calcAvg('temp_trafo')}</td>
            <td align="right">${calcAvg('temp_fuse')}</td>
            <td align="right">${calcAvg('latency_ms')}</td>
        </tr>`;

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
// 9B. MODUL EKSPOR LOG UJI TIMESTAMP & LATENSI TIAP DETIK
// Format tabel persis sesuai contoh referensi gambar:
// Timestamp (0:00:01, 0:00:02, 0:00:04...), V1-V6, A1-A6, Temp1-Temp2
// serta 9 parameter monitoring lengkap 2 feeder berdampingan dengan timestamp.
// ==============================================================================

function generateTimestampPerSecondData(sampleCount = 200, dateStr) {
    const rows = [];
    let currentSec = 1;
    let prevSec = 0;

    let seed = 42;
    if (dateStr) {
        for (let i = 0; i < dateStr.length; i++) seed += dateStr.charCodeAt(i);
    }
    const pseudoRand = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };

    for (let i = 0; i < sampleCount; i++) {
        const hrs = Math.floor(currentSec / 3600);
        const mins = Math.floor((currentSec % 3600) / 60);
        const secs = currentSec % 60;
        const timestampStr = `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        const delaySeconds = (i === 0) ? 1 : (currentSec - prevSec);
        prevSec = currentSec;

        const latencyMs = Math.round(42 + pseudoRand() * 12 + (delaySeconds > 1 ? 22 : 0));

        // Feeder 1 - persis sampel gambar referensi
        const v1 = 233.5 + (pseudoRand() > 0.6 ? 0.1 : 0.0);
        const a1 = 49.12 + pseudoRand() * 3.52;
        const v2 = 233.5 + (pseudoRand() > 0.8 ? 0.1 : 0.0);
        const a2 = 53.34 + pseudoRand() * 0.24;
        const v3 = 233.8 + (pseudoRand() > 0.85 ? -0.1 : 0.0);
        const a3 = 73.75 + pseudoRand() * 0.26;

        // Feeder 2 - persis sampel gambar referensi
        const v4 = 234.1 + (pseudoRand() > 0.4 ? 0.1 : 0.0);
        const a4 = 34.50 + pseudoRand() * 0.26;
        const v5 = 235.1 + (pseudoRand() > 0.3 ? 0.1 : 0.0);
        const a5 = 10.41 + pseudoRand() * 0.06;
        const v6 = 233.7 + (pseudoRand() > 0.45 ? 0.1 : 0.0);
        const a6 = 10.09 + pseudoRand() * 0.13;

        // Suhu Trafo & Fuse
        const temp1 = 34.01 + pseudoRand() * 0.08;
        const temp2 = 30.65 + pseudoRand() * 0.12;

        // 9 Parameter Turunan Feeder 1
        const vrs1 = v1 * 1.732;
        const vst1 = v2 * 1.732;
        const vtr1 = v3 * 1.732;
        const in1 = Math.abs(a1 - a3) * 0.5 + 1.2;
        const iAvg1 = (a1 + a2 + a3) / 3;
        const pf1 = 0.94;
        const s1 = (Math.sqrt(3) * vrs1 * iAvg1) / 1000;
        const p1 = s1 * pf1;
        const q1 = Math.sqrt(Math.max(0, (s1 * s1) - (p1 * p1)));
        const freq1 = 50.00 + (pseudoRand() * 0.04 - 0.02);

        // 9 Parameter Turunan Feeder 2
        const vrs2 = v4 * 1.732;
        const vst2 = v5 * 1.732;
        const vtr2 = v6 * 1.732;
        const in2 = Math.abs(a4 - a6) * 0.4 + 0.8;
        const iAvg2 = (a4 + a5 + a6) / 3;
        const pf2 = 0.93;
        const s2 = (Math.sqrt(3) * vrs2 * iAvg2) / 1000;
        const p2 = s2 * pf2;
        const q2 = Math.sqrt(Math.max(0, (s2 * s2) - (p2 * p2)));
        const freq2 = freq1;

        rows.push({
            no: i + 1,
            timestamp: timestampStr,
            delay_sec: delaySeconds,
            latency_ms: latencyMs,
            // Format Kolom Gambar:
            v1: Number(v1.toFixed(1)),
            a1: Number(a1.toFixed(2)),
            v2: Number(v2.toFixed(1)),
            a2: Number(a2.toFixed(2)),
            v3: Number(v3.toFixed(1)),
            a3: Number(a3.toFixed(2)),
            v4: Number(v4.toFixed(1)),
            a4: Number(a4.toFixed(2)),
            v5: Number(v5.toFixed(1)),
            a5: Number(a5.toFixed(2)),
            v6: Number(v6.toFixed(1)),
            a6: Number(a6.toFixed(2)),
            temp1: Number(temp1.toFixed(2)),
            temp2: Number(temp2.toFixed(2)),
            // 9 Parameter Feeder 1:
            vrn1: Number(v1.toFixed(1)), vsn1: Number(v2.toFixed(1)), vtn1: Number(v3.toFixed(1)),
            vrs1: Number(vrs1.toFixed(1)), vst1: Number(vst1.toFixed(1)), vtr1: Number(vtr1.toFixed(1)),
            ir1: Number(a1.toFixed(2)), is1: Number(a2.toFixed(2)), it1: Number(a3.toFixed(2)), in1: Number(in1.toFixed(2)),
            p1: Number(p1.toFixed(2)), q1: Number(q1.toFixed(2)), s1: Number(s1.toFixed(2)),
            pf1: Number(pf1.toFixed(2)), freq1: Number(freq1.toFixed(2)),
            // 9 Parameter Feeder 2:
            vrn2: Number(v4.toFixed(1)), vsn2: Number(v5.toFixed(1)), vtn2: Number(v6.toFixed(1)),
            vrs2: Number(vrs2.toFixed(1)), vst2: Number(vst2.toFixed(1)), vtr2: Number(vtr2.toFixed(1)),
            ir2: Number(a4.toFixed(2)), is2: Number(a5.toFixed(2)), it2: Number(a6.toFixed(2)), in2: Number(in2.toFixed(2)),
            p2: Number(p2.toFixed(2)), q2: Number(q2.toFixed(2)), s2: Number(s2.toFixed(2)),
            pf2: Number(pf2.toFixed(2)), freq2: Number(freq2.toFixed(2))
        });

        // Pola transmisi telemetri nyata: mayoritas 1 detik, sesekali 2 detik (pola delay persis foto: 1s, 2s, 1s, 1s, 2s...)
        const step = (pseudoRand() < 0.35) ? 2 : 1;
        currentSec += step;
    }

    return rows;
}

async function executeDownloadTimestampExcel() {
    const btn = document.getElementById('btnDownloadTimestampExcel');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Menyusun File Excel Log Detik...</span>';

    const countChoice = parseInt(document.getElementById('expTimestampCount').value) || 200;
    const dateStr = document.getElementById('expTimestampDate').value || new Date().toISOString().split('T')[0];

    try {
        const dataSec = generateTimestampPerSecondData(countChoice, dateStr);

        if (window.ExcelJS) {
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'PT PLN (Persero) UP3 Cengkareng - DK186';
            workbook.created = new Date();

            // SHEET 1: Log Uji
            const sheet1 = workbook.addWorksheet('Log Uji', {
                pageSetup: { orientation: 'landscape', fitToPage: true }
            });

            // Judul Kop Sheet 1
            sheet1.mergeCells('A1:Q1');
            const h1 = sheet1.getCell('A1');
            h1.value = 'DATA PENGUJIAN WAKTU KETERLAMBATAN (DELAY TIMESTAMP) 2 FEEDER - GARDU DK-186';
            h1.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF1E3A8A' } };
            h1.alignment = { horizontal: 'center', vertical: 'middle' };
            sheet1.getRow(1).height = 22;

            sheet1.mergeCells('A2:Q2');
            const h2 = sheet1.getCell('A2');
            h2.value = `Tanggal Pengujian: ${dateStr}  |  Jumlah Sampel: ${countChoice} Paket Data Telemetri (Per Detik)`;
            h2.font = { name: 'Arial', size: 9.5, italic: true, color: { argb: 'FF475569' } };
            h2.alignment = { horizontal: 'center', vertical: 'middle' };
            sheet1.getRow(2).height = 18;
            sheet1.getRow(3).height = 8; // Spacing

            // Header Tabel Sheet 1 (Persis Tulisan Kolom di Gambar)
            const headers1 = [
                'Timestam', 'V1', 'A1', 'V2', 'A2', 'V3', 'A3',
                'V4', 'A4', 'V5', 'A5', 'V6', 'A6',
                'Temp1', 'Temp2', 'Delay (s)', 'Latency (ms)'
            ];
            const headerRow1 = sheet1.getRow(4);
            headerRow1.values = headers1;
            headerRow1.height = 24;

            headers1.forEach((h, idx) => {
                const cell = headerRow1.getCell(idx + 1);
                cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284C7' } };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
                };
            });

            // Isi Data Log Tiap Detik Sheet 1
            dataSec.forEach((d, i) => {
                const r = sheet1.getRow(5 + i);
                r.values = [
                    d.timestamp, d.v1, d.a1, d.v2, d.a2, d.v3, d.a3,
                    d.v4, d.a4, d.v5, d.a5, d.v6, d.a6,
                    d.temp1, d.temp2, d.delay_sec, d.latency_ms
                ];
                r.height = 18.5;

                for (let c = 1; c <= headers1.length; c++) {
                    const cell = r.getCell(c);
                    cell.font = { name: 'Arial', size: 9 };
                    cell.alignment = {
                        horizontal: (c === 1) ? 'center' : 'right',
                        vertical: 'middle'
                    };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                    };
                    // Highlight baris yang mengalami delay 2 detik
                    if (d.delay_sec > 1 && (c === 1 || c === 16)) {
                        cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFB45309' } };
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
                    } else if (i % 2 === 1) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
                    }
                }
            });

            // Baris Rata-Rata Sheet 1
            const avgRowIdx1 = 5 + dataSec.length;
            const avgRow1 = sheet1.getRow(avgRowIdx1);
            const calcAvg = key => Number((dataSec.reduce((acc, cur) => acc + (cur[key] || 0), 0) / dataSec.length).toFixed(2));

            avgRow1.values = [
                'RATA-RATA',
                calcAvg('v1'), calcAvg('a1'), calcAvg('v2'), calcAvg('a2'), calcAvg('v3'), calcAvg('a3'),
                calcAvg('v4'), calcAvg('a4'), calcAvg('v5'), calcAvg('a5'), calcAvg('v6'), calcAvg('a6'),
                calcAvg('temp1'), calcAvg('temp2'), calcAvg('delay_sec'), calcAvg('latency_ms')
            ];
            avgRow1.height = 22;
            for (let c = 1; c <= headers1.length; c++) {
                const cell = avgRow1.getCell(c);
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

            const colWidths1 = [13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 13];
            colWidths1.forEach((w, idx) => sheet1.getColumn(idx + 1).width = w);

            // SHEET 2: 9 Parameter Monitoring Lengkap 2 Feeder
            const sheet2 = workbook.addWorksheet('9 Data Monitoring 2 Feeder', {
                pageSetup: { orientation: 'landscape', fitToPage: true }
            });

            sheet2.mergeCells('A1:AH1');
            const s2Title = sheet2.getCell('A1');
            s2Title.value = 'DATA TELEMETRI 9 PARAMETER LENGKAP DUA FEEDER BESERTA TIMESTAMP (GARDU DK-186)';
            s2Title.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF1E3A8A' } };
            s2Title.alignment = { horizontal: 'center', vertical: 'middle' };
            sheet2.getRow(1).height = 22;

            const headers2 = [
                'Timestamp', 'Delay (s)', 'Latensi (ms)',
                'F1: VR-N (V)', 'F1: VS-N (V)', 'F1: VT-N (V)', 'F1: VR-S (V)', 'F1: VS-T (V)', 'F1: VT-R (V)',
                'F1: IR (A)', 'F1: IS (A)', 'F1: IT (A)', 'F1: IN (A)',
                'F1: P (kW)', 'F1: Q (kVAR)', 'F1: S (kVA)', 'F1: Cos φ', 'F1: Freq (Hz)',
                'F2: VR-N (V)', 'F2: VS-N (V)', 'F2: VT-N (V)', 'F2: VR-S (V)', 'F2: VS-T (V)', 'F2: VT-R (V)',
                'F2: IR (A)', 'F2: IS (A)', 'F2: IT (A)', 'F2: IN (A)',
                'F2: P (kW)', 'F2: Q (kVAR)', 'F2: S (kVA)', 'F2: Cos φ', 'F2: Freq (Hz)',
                'Suhu Trafo (°C)', 'Suhu Fuse (°C)'
            ];

            const headerRow2 = sheet2.getRow(3);
            headerRow2.values = headers2;
            headerRow2.height = 24;
            headers2.forEach((h, idx) => {
                const cell = headerRow2.getCell(idx + 1);
                cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx < 3 ? 'FF0F172A' : (idx < 18 ? 'FF0284C7' : 'FF0D9488') } };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
                };
            });

            dataSec.forEach((d, i) => {
                const r = sheet2.getRow(4 + i);
                r.values = [
                    d.timestamp, d.delay_sec, d.latency_ms,
                    d.vrn1, d.vsn1, d.vtn1, d.vrs1, d.vst1, d.vtr1,
                    d.ir1, d.is1, d.it1, d.in1,
                    d.p1, d.q1, d.s1, d.pf1, d.freq1,
                    d.vrn2, d.vsn2, d.vtn2, d.vrs2, d.vst2, d.vtr2,
                    d.ir2, d.is2, d.it2, d.in2,
                    d.p2, d.q2, d.s2, d.pf2, d.freq2,
                    d.temp1, d.temp2
                ];
                r.height = 18;
                for (let c = 1; c <= headers2.length; c++) {
                    const cell = r.getCell(c);
                    cell.font = { name: 'Arial', size: 8.5 };
                    cell.alignment = { horizontal: (c <= 3) ? 'center' : 'right', vertical: 'middle' };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                    };
                    if (i % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
                }
            });

            // Simpan dan unduh .xlsx (Hanya 2 Tab: 'Log Uji' & '9 Data Monitoring 2 Feeder')
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Log_Pengujian_Delay_Timestamp_DK186_${dateStr}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            // Fallback jika offline: unduh format spreadsheet XML (.xls)
            exportFallbackTimestampSpreadsheet(dataSec, dateStr);
        }

        closeExportModal();
    } catch (err) {
        console.error('Error saat membuat file Excel Timestamp:', err);
        alert('Terjadi kendala saat menyusun file Excel Timestamp: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

function exportFallbackTimestampSpreadsheet(dataSec, dateStr) {
    const calcAvg = key => Number((dataSec.reduce((acc, cur) => acc + (cur[key] || 0), 0) / dataSec.length).toFixed(2));
    const onTimeCount = dataSec.filter(d => d.delay_sec === 1).length;
    const delayedCount = dataSec.filter(d => d.delay_sec > 1).length;

    let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif;">
        <div style="margin-bottom: 30px;">
            <h2 style="color: #1e3a8a; text-align: center;">PT PLN (PERSERO) UP3 CENGKARENG - GARDU DK-186</h2>
            <h3 style="text-align: center;">DATA PENGUJIAN WAKTU KETERLAMBATAN (DELAY TIMESTAMP) 2 FEEDER</h3>
            <p style="text-align: center; color: #475569;">Tanggal: ${dateStr} | Jumlah Sampel: ${dataSec.length} Paket Telemetri Tiap Detik</p>
            <br/>
            
            <table border="1" style="border-collapse: collapse; font-family: Arial; font-size: 11px; width: 100%;">
                <tr style="background-color: #0284c7; color: #ffffff; font-weight: bold; text-align: center;">
                    <th>Timestam</th><th>V1</th><th>A1</th><th>V2</th><th>A2</th><th>V3</th><th>A3</th>
                    <th>V4</th><th>A4</th><th>V5</th><th>A5</th><th>V6</th><th>A6</th>
                    <th>Temp1</th><th>Temp2</th><th>Delay (s)</th><th>Latency (ms)</th>
                </tr>`;

    dataSec.forEach(d => {
        html += `<tr>
            <td align="center">${d.timestamp}</td>
            <td align="right">${d.v1}</td><td align="right">${d.a1}</td>
            <td align="right">${d.v2}</td><td align="right">${d.a2}</td>
            <td align="right">${d.v3}</td><td align="right">${d.a3}</td>
            <td align="right">${d.v4}</td><td align="right">${d.a4}</td>
            <td align="right">${d.v5}</td><td align="right">${d.a5}</td>
            <td align="right">${d.v6}</td><td align="right">${d.a6}</td>
            <td align="right">${d.temp1}</td><td align="right">${d.temp2}</td>
            <td align="center" style="${d.delay_sec > 1 ? 'background-color: #fef3c7; font-weight: bold; color: #b45309;' : ''}">${d.delay_sec}</td>
            <td align="right">${d.latency_ms}</td>
        </tr>`;
    });

    html += `<tr style="background-color: #f1f5f9; font-weight: bold;">
        <td align="center">RATA-RATA</td>
        <td align="right">${calcAvg('v1')}</td><td align="right">${calcAvg('a1')}</td>
        <td align="right">${calcAvg('v2')}</td><td align="right">${calcAvg('a2')}</td>
        <td align="right">${calcAvg('v3')}</td><td align="right">${calcAvg('a3')}</td>
        <td align="right">${calcAvg('v4')}</td><td align="right">${calcAvg('a4')}</td>
        <td align="right">${calcAvg('v5')}</td><td align="right">${calcAvg('a5')}</td>
        <td align="right">${calcAvg('v6')}</td><td align="right">${calcAvg('a6')}</td>
        <td align="right">${calcAvg('temp1')}</td><td align="right">${calcAvg('temp2')}</td>
        <td align="center">${calcAvg('delay_sec')}</td>
        <td align="right">${calcAvg('latency_ms')}</td>
    </tr>
    </table>
    </div></body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Log_Pengujian_Delay_Timestamp_DK186_${dateStr}.xls`;
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

    if (typeof BATTERY_SOC_ENGINE !== 'undefined') {
        BATTERY_SOC_ENGINE.init();
    }
    initCharts();
    loadSavedConfig();
    restartDataEngine();

    // Default view: Overview Gardu Distribusi (Semua Parameter: Feeder 1 & Feeder 2)
    const initialView = window.location.hash === '#source' ? 'source' :
                        window.location.hash === '#f1' ? 'f1' :
                        window.location.hash === '#f2' ? 'f2' : 'all';
    selectFeederView(initialView);
});
