// ==========================================
// KONFIGURASI WEB APP URL GOOGLE APPS SCRIPT
// ==========================================
// GANTI DENGAN URL WEB APP GOOGLE APPS SCRIPT ANDA!
const API_URL = "https://script.google.com/macros/s/AKfycb.../exec";

// ==========================================

// DOM Elements - Top Cards
const valVoltage = document.getElementById('val-voltage');
const valCurrent = document.getElementById('val-current');
const valPf = document.getElementById('val-pf');
const timestampEl = document.getElementById('timestamp');
const statusIndicator = document.querySelector('.status-indicator');
const runTimerEl = document.getElementById('run-timer');

// Start time for RUN timer
const startTime = new Date();

function padZero(num) {
    return num.toString().padStart(2, '0');
}

function updateTimer() {
    const now = new Date();
    const diff = Math.floor((now - startTime) / 1000);
    const hours = Math.floor(diff / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    const secs = diff % 60;
    runTimerEl.textContent = `${padZero(hours)}:${padZero(mins)}:${padZero(secs)}`;
}

// Update the DOM elements with data
function updateFeederUI(feederPrefix, baseVoltage, baseCurrent, basePf) {
    // Generate realistic multi-phase data from single base values
    const vNoise = () => (Math.random() * 4 - 2); // +/- 2V
    const iNoise = () => (Math.random() * 1 - 0.5); // +/- 0.5A
    
    // 1 Phase (R-N, S-N, T-N)
    const vrn = (baseVoltage + vNoise());
    const vsn = (baseVoltage + vNoise());
    const vtn = (baseVoltage + vNoise());
    
    // 3 Phase (R-S, S-T, T-R) ~ 1.732 * Phase voltage
    const root3 = 1.732;
    const vrs = vrn * root3 + vNoise();
    const vst = vsn * root3 + vNoise();
    const vtr = vtn * root3 + vNoise();
    
    // Current
    const ir = Math.max(0, baseCurrent + iNoise());
    const is = Math.max(0, baseCurrent + iNoise());
    const it = Math.max(0, baseCurrent + iNoise());
    const iavg = (ir + is + it) / 3;
    const in_ = Math.abs((ir + is * Math.cos(2.094) + it * Math.cos(4.188))); // Simplified neutral current
    
    // Power & Hz
    const freq = 50.0 + (Math.random() * 0.2 - 0.1);
    const totalPower = (vrn * ir + vsn * is + vtn * it) * basePf; // Watts
    
    // Load % (Assuming max capacity is e.g. 50A per phase)
    const loadPercent = Math.min(100, (iavg / 50) * 100);

    // Update DOM
    document.getElementById(`${feederPrefix}-rn`).textContent = vrn.toFixed(0);
    document.getElementById(`${feederPrefix}-sn`).textContent = vsn.toFixed(0);
    document.getElementById(`${feederPrefix}-tn`).textContent = vtn.toFixed(0);
    
    document.getElementById(`${feederPrefix}-rs`).textContent = vrs.toFixed(0);
    document.getElementById(`${feederPrefix}-st`).textContent = vst.toFixed(0);
    document.getElementById(`${feederPrefix}-tr`).textContent = vtr.toFixed(0);
    
    document.getElementById(`${feederPrefix}-ir`).textContent = ir.toFixed(1);
    document.getElementById(`${feederPrefix}-is`).textContent = is.toFixed(1);
    document.getElementById(`${feederPrefix}-it`).textContent = it.toFixed(1);
    document.getElementById(`${feederPrefix}-iavg`).textContent = iavg.toFixed(1) + "A";
    document.getElementById(`${feederPrefix}-in`).textContent = in_.toFixed(1) + "A";
    
    // Format Power (W or kW)
    let powerStr = totalPower > 1000 ? (totalPower/1000).toFixed(1) + "kW" : totalPower.toFixed(0) + "W";
    document.getElementById(`${feederPrefix}-p`).textContent = powerStr;
    document.getElementById(`${feederPrefix}-pf-panel`).textContent = parseFloat(basePf).toFixed(2);
    document.getElementById(`${feederPrefix}-hz`).textContent = freq.toFixed(1) + "Hz";
    
    document.getElementById(`${feederPrefix}-load`).textContent = loadPercent.toFixed(1) + "%";
    document.getElementById(`${feederPrefix}-load-bar`).style.width = `${loadPercent}%`;
}

function updateUI(data) {
    const v = parseFloat(data.voltage);
    const c = parseFloat(data.current);
    const pf = parseFloat(data.power_factor);

    // Update Top Summary Cards
    valVoltage.textContent = v.toFixed(1);
    valCurrent.textContent = c.toFixed(1);
    valPf.textContent = pf.toFixed(2);
    
    // Format timestamp
    const date = new Date(data.timestamp);
    const timeString = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    timestampEl.textContent = timeString;

    // Update Feeder 1 with actual API data
    updateFeederUI('f1', v, c, pf);
    
    // Update Feeder 2 with simulated slightly different data
    updateFeederUI('f2', v * 0.98, c * 0.8, pf * 0.99);
}

function setStatus(status) {
    if (status === 'connected') {
        statusIndicator.style.backgroundColor = 'var(--lcd-green)';
        statusIndicator.style.boxShadow = '0 0 10px var(--lcd-green)';
    } else {
        statusIndicator.style.backgroundColor = 'var(--lcd-red)';
        statusIndicator.style.boxShadow = '0 0 10px var(--lcd-red)';
    }
}

async function fetchLatestData() {
    if (API_URL.includes("AKfycb.../exec")) {
        console.warn("Harap ganti API_URL di script.js dengan URL Web App Anda.");
        setStatus('error');
        return;
    }

    try {
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'success') {
            updateUI(data);
            setStatus('connected');
        } else {
            console.error("API returned error:", data.message);
            if(data.message !== "No data found") setStatus('error');
        }
    } catch (error) {
        console.error("Fetch error:", error);
        setStatus('error');
        
        // MOCK DATA DEMO
        if (API_URL.includes("AKfycb")) {
             const mockData = {
                status: "success",
                timestamp: new Date().toISOString(),
                voltage: 220 + (Math.random() * 4 - 2),
                current: 15 + (Math.random() * 2 - 1),
                power_factor: 0.95 + (Math.random() * 0.04 - 0.02)
            };
            updateUI(mockData);
            setStatus('connected');
            timestampEl.textContent = "Demo Mode";
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Run timer loop
    setInterval(updateTimer, 1000);
    
    // Fetch immediately
    fetchLatestData();
    
    // Data fetch loop (5 seconds)
    setInterval(fetchLatestData, 5000); 
});
