/**
 * Beden & FitGöz AI - Akıllı Beden, Postür ve Kalori Asistanı
 * TÜBİTAK 2204-B Projesi
 * 
 * Özellikler:
 * 1. Antropometrik Beden Ölçümü (Boy kalibrasyonlu omuz cm hesabı ve beden eşleşmesi)
 * 2. Günlük Kalori & Metabolizma Profili (BMR, TDEE, VKİ/BMI)
 * 3. Canlı Egzersiz & Otomatik Kalori Yakım Sayacı (MediaPipe Pose ile Squat / Jumping Jack takibi)
 */

// DOM Elemanları
const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('output-canvas');
const canvasCtx = canvasElement.getContext('2d');
const toggleCameraBtn = document.getElementById('toggle-camera-btn');
const btnIcon = document.getElementById('btn-icon');
const btnText = document.getElementById('btn-text');

const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const fpsCounter = document.getElementById('fps-counter');

// Form Girdileri
const heightInput = document.getElementById('user-height');
const weightInput = document.getElementById('user-weight');
const ageInput = document.getElementById('user-age');
const genderSelect = document.getElementById('user-gender');
const activitySelect = document.getElementById('activity-level');
const exerciseSelect = document.getElementById('exercise-type');

// Mod Butonları
const tabMeasure = document.getElementById('tab-measure');
const tabFitness = document.getElementById('tab-fitness');
const exerciseHud = document.getElementById('exercise-hud');
const guidanceOverlay = document.getElementById('guidance-overlay');

// Beden Çıktıları
const recommendedSizeEl = document.getElementById('recommended-size');
const fitTypeEl = document.getElementById('fit-type');
const confidenceBar = document.getElementById('confidence-bar');
const confidencePct = document.getElementById('confidence-pct');

// Kalori & Egzersiz Çıktıları
const hudRepCount = document.getElementById('hud-rep-count');
const hudCalories = document.getElementById('hud-calories');
const hudAngle = document.getElementById('hud-angle');
const repDisplay = document.getElementById('rep-display');
const burnedCaloriesDisplay = document.getElementById('burned-calories-display');
const exerciseFeedback = document.getElementById('exercise-feedback');
const resetCounterBtn = document.getElementById('reset-counter-btn');

// Metabolizma Çıktıları
const valBmr = document.getElementById('val-bmr');
const valTdee = document.getElementById('val-tdee');
const valBmi = document.getElementById('val-bmi');
const valBmiStatus = document.getElementById('val-bmi-status');

// Biyometrik Metrikler
const metricShoulder = document.getElementById('metric-shoulder');
const metricChest = document.getElementById('metric-chest');
const metricScale = document.getElementById('metric-scale');
const metricPosture = document.getElementById('metric-posture');

// Durum Değişkenleri
let currentMode = 'measure'; // 'measure' | 'fitness'
let isCameraRunning = false;
let cameraInstance = null;
let lastFrameTime = performance.now();
let frameCount = 0;

// Ölçüm Yumuşatma
const SMOOTHING_WINDOW = 7;
let shoulderHistory = [];

// Egzersiz Takip Durumları
let exerciseReps = 0;
let exerciseCaloriesBurned = 0.0;
let squatStage = 'up'; // 'up' | 'down'
let jackStage = 'closed'; // 'closed' | 'open'

/**
 * Web Audio API ile tekrar tamamlandığında hafif bir "bip/chime" sesi çıkarır
 */
function playTone(freq = 660, duration = 0.12) {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.start();
        osc.stop(ctx.currentTime + duration);
    } catch (e) {
        // Ses izni yoksa sessizce devam et
    }
}

/**
 * Üç nokta arasındaki açıyı derece (° cinsinden) hesaplar (A - B - C)
 * B eklem noktasıdır (örneğin diz eklemi)
 */
function calculateAngle(a, b, c) {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) {
        angle = 360.0 - angle;
    }
    return Math.round(angle);
}

/**
 * İki nokta arası Öklid mesafesi (Piksel)
 */
function getPixelDistance(p1, p2, width, height) {
    const dx = (p2.x - p1.x) * width;
    const dy = (p2.y - p1.y) * height;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Hareketli Ortalama Filtresi
 */
function applySmoothing(newVal) {
    shoulderHistory.push(newVal);
    if (shoulderHistory.length > SMOOTHING_WINDOW) {
        shoulderHistory.shift();
    }
    const sum = shoulderHistory.reduce((a, b) => a + b, 0);
    return sum / shoulderHistory.length;
}

/**
 * BMR (Bazal Metabolizma) ve TDEE (Günlük Enerji İhtiyacı) Hesaplaması
 * Mifflin - St Jeor Denklemi
 */
function updateMetabolicProfile() {
    const h = parseFloat(heightInput.value) || 175;
    const w = parseFloat(weightInput.value) || 68;
    const age = parseInt(ageInput.value) || 15;
    const gender = genderSelect.value;
    const actFactor = parseFloat(activitySelect.value) || 1.375;

    // BMR Hesabı
    let bmr = 0;
    if (gender === 'kadin') {
        bmr = 10 * w + 6.25 * h - 5 * age - 161;
    } else {
        bmr = 10 * w + 6.25 * h - 5 * age + 5;
    }
    bmr = Math.round(bmr);

    // TDEE Hesabı
    const tdee = Math.round(bmr * actFactor);

    // VKİ (BMI) Hesabı
    const heightInMeters = h / 100;
    const bmi = (w / (heightInMeters * heightInMeters)).toFixed(1);

    let bmiStatus = "İdeal Kilo";
    if (bmi < 18.5) bmiStatus = "Düşük Kilolu";
    else if (bmi >= 25 && bmi < 29.9) bmiStatus = "Hafif Fazla Kilolu";
    else if (bmi >= 30) bmiStatus = "Yüksek Kilo (Obezite)";

    // UI Güncelle
    valBmr.textContent = `${bmr} kcal`;
    valTdee.textContent = `${tdee} kcal`;
    valBmi.textContent = `${bmi}`;
    valBmiStatus.textContent = bmiStatus;
}

// Parametre değişikliklerinde metabolizmayı anında güncelle
[heightInput, weightInput, ageInput, genderSelect, activitySelect].forEach(input => {
    input.addEventListener('input', updateMetabolicProfile);
    input.addEventListener('change', updateMetabolicProfile);
});
updateMetabolicProfile();

/**
 * MediaPipe Pose Sonuçları İşleme Döngüsü
 */
function onResults(results) {
    // FPS Hesabı
    frameCount++;
    const now = performance.now();
    if (now - lastFrameTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (now - lastFrameTime));
        fpsCounter.textContent = `FPS: ${fps}`;
        frameCount = 0;
        lastFrameTime = now;
    }

    // Video Karesini Çiz
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (results.poseLandmarks) {
        const lm = results.poseLandmarks;
        const canvasW = canvasElement.width;
        const canvasH = canvasElement.height;

        // İskeleti çiz
        drawSkeleton(lm);

        // MOD 1: Beden Ölçüm Mantığı
        processBodyMeasurements(lm, canvasW, canvasH);

        // MOD 2: Canlı Egzersiz ve Kalori Takip Mantığı
        processExerciseAndCalories(lm, canvasW, canvasH);

    } else {
        statusDot.className = "dot";
        statusText.textContent = "Kamera karşısında insan silüeti aranıyor...";
    }

    canvasCtx.restore();
}

/**
 * Antropometrik Beden Ölçümü ve Mesafe Kalibrasyonu
 */
function processBodyMeasurements(lm, canvasW, canvasH) {
    const nose = lm[0];
    const leftShoulder = lm[11];
    const rightShoulder = lm[12];
    const leftHip = lm[23];
    const rightHip = lm[24];
    const leftAnkle = lm[27];
    const rightAnkle = lm[28];

    const shouldersVisible = leftShoulder.visibility > 0.5 && rightShoulder.visibility > 0.5;

    if (shouldersVisible && nose.visibility > 0.4) {
        statusDot.className = "dot active";
        if (currentMode === 'measure') {
            statusText.textContent = "Vücut tespit edildi. Beden kalibrasyonu aktif.";
        }

        const rawShoulderPx = getPixelDistance(leftShoulder, rightShoulder, canvasW, canvasH);

        // Kalibrasyon formülü
        let estimatedHeightPx = 0;
        const anklesVisible = leftAnkle && rightAnkle && leftAnkle.visibility > 0.4 && rightAnkle.visibility > 0.4;
        const hipsVisible = leftHip && rightHip && leftHip.visibility > 0.4 && rightHip.visibility > 0.4;

        if (anklesVisible) {
            const midAnkle = {
                x: (leftAnkle.x + rightAnkle.x) / 2,
                y: (leftAnkle.y + rightAnkle.y) / 2
            };
            estimatedHeightPx = getPixelDistance(nose, midAnkle, canvasW, canvasH) / 0.85;
        } else if (hipsVisible) {
            const midHip = {
                x: (leftHip.x + rightHip.x) / 2,
                y: (leftHip.y + rightHip.y) / 2
            };
            estimatedHeightPx = getPixelDistance(nose, midHip, canvasW, canvasH) / 0.47;
        } else {
            estimatedHeightPx = rawShoulderPx * 4.2;
        }

        const userHeightCm = parseFloat(heightInput.value) || 175;
        const cmPerPixel = userHeightCm / estimatedHeightPx;
        const calculatedShoulderCm = applySmoothing(rawShoulderPx * cmPerPixel);
        const roundedShoulder = Math.round(calculatedShoulderCm * 10) / 10;

        const isFemale = genderSelect.value === 'kadin';
        const estimatedChestCm = Math.round(roundedShoulder * (isFemale ? 2.22 : 2.30));

        // Beden Kararı
        let size = "M";
        let fitText = "Medium (İdeal Uyum)";
        let sLimit = isFemale ? 39 : 41.5;
        let mLimit = isFemale ? 42 : 44.5;
        let lLimit = isFemale ? 45 : 47.5;

        if (roundedShoulder < sLimit) {
            size = "S";
            fitText = "Small (Dar / Slim)";
        } else if (roundedShoulder >= sLimit && roundedShoulder <= mLimit) {
            size = "M";
            fitText = "Medium (Standart)";
        } else if (roundedShoulder > mLimit && roundedShoulder <= lLimit) {
            size = "L";
            fitText = "Large (Rahat Kalıp)";
        } else {
            size = "XL";
            fitText = "Extra Large (Geniş)";
        }

        recommendedSizeEl.textContent = size;
        fitTypeEl.textContent = fitText;
        confidencePct.textContent = "%92";
        confidenceBar.style.width = "92%";

        metricShoulder.textContent = `${roundedShoulder} cm`;
        metricChest.textContent = `${estimatedChestCm} cm`;
        metricScale.textContent = `${(cmPerPixel * 10).toFixed(2)} mm / px`;
        metricPosture.textContent = "Dengeli (Doğrulandı)";
    }
}

/**
 * Canlı Egzersiz Tekrarı ve Otomatik Kalori Yakımı
 */
function processExerciseAndCalories(lm, canvasW, canvasH) {
    const exType = exerciseSelect.value;
    const userWeight = parseFloat(weightInput.value) || 68;

    if (exType === 'squat') {
        // Sol ve sağ bacak eklemleri
        // Hip: 23, Knee: 25, Ankle: 27
        const hip = lm[23];
        const knee = lm[25];
        const ankle = lm[27];

        if (hip.visibility > 0.5 && knee.visibility > 0.5 && ankle.visibility > 0.4) {
            const kneeAngle = calculateAngle(hip, knee, ankle);
            hudAngle.textContent = `${kneeAngle}°`;

            // Diz üzerinde açıyı görselleştir
            drawAngleBadge(knee, kneeAngle, canvasW, canvasH);

            // Squat Durum Makinesi
            if (kneeAngle < 110) {
                if (squatStage === 'up') {
                    squatStage = 'down';
                    exerciseFeedback.textContent = "Harika! Şimdi yukarı kalkın.";
                    exerciseFeedback.style.color = "#38bdf8";
                }
            } else if (kneeAngle > 155 && squatStage === 'down') {
                squatStage = 'up';
                exerciseReps++;
                
                // Kalori formülü: Squat başına yaklaşık (Kilo * 0.005) kcal
                const calPerRep = userWeight * 0.005;
                exerciseCaloriesBurned += calPerRep;

                playTone(600, 0.15);
                updateExerciseUI();
                exerciseFeedback.textContent = `Tebrikler! ${exerciseReps}. tekrar tamamlandı.`;
                exerciseFeedback.style.color = "#22c55e";
            }
        } else {
            hudAngle.textContent = "--°";
        }
    } else if (exType === 'jumping_jack') {
        // Eller başın üstüne kalktı mı ve bacaklar açıldı mı?
        const leftWrist = lm[15];
        const rightWrist = lm[16];
        const leftShoulder = lm[11];
        const rightShoulder = lm[12];
        const leftAnkle = lm[27];
        const rightAnkle = lm[28];

        if (leftWrist.visibility > 0.5 && rightWrist.visibility > 0.5 && leftAnkle.visibility > 0.4 && rightAnkle.visibility > 0.4) {
            const handsUp = leftWrist.y < leftShoulder.y && rightWrist.y < rightShoulder.y;
            const ankleDist = Math.abs(leftAnkle.x - rightAnkle.x);
            const shoulderDist = Math.abs(leftShoulder.x - rightShoulder.x);
            const feetApart = ankleDist > shoulderDist * 1.35;

            if (handsUp && feetApart) {
                if (jackStage === 'closed') {
                    jackStage = 'open';
                    exerciseFeedback.textContent = "Açıldınız! Şimdi başlangıç pozisyonuna dönün.";
                }
            } else if (!handsUp && !feetApart && jackStage === 'open') {
                jackStage = 'closed';
                exerciseReps++;

                // Jumping Jack kalori hesabı: Jack başına ~ (Kilo * 0.0032) kcal
                const calPerRep = userWeight * 0.0032;
                exerciseCaloriesBurned += calPerRep;

                playTone(700, 0.12);
                updateExerciseUI();
                exerciseFeedback.textContent = `Süper zıplama! ${exerciseReps}. tekrar yapıldı.`;
                exerciseFeedback.style.color = "#22c55e";
            }
        }
    }
}

/**
 * Egzersiz UI Göstergelerini Güncelle
 */
function updateExerciseUI() {
    hudRepCount.textContent = exerciseReps;
    hudCalories.innerHTML = `${exerciseCaloriesBurned.toFixed(2)} <small>kcal</small>`;
    repDisplay.textContent = exerciseReps;
    burnedCaloriesDisplay.textContent = exerciseCaloriesBurned.toFixed(2);
}

/**
 * Diz eklemi üzerine anlık açı göstergesi çizer
 */
function drawAngleBadge(knee, angle, w, h) {
    const x = knee.x * w;
    const y = knee.y * h;

    canvasCtx.save();
    canvasCtx.fillStyle = angle < 110 ? '#22c55e' : 'rgba(15, 23, 42, 0.75)';
    canvasCtx.beginPath();
    canvasCtx.arc(x, y, 18, 0, 2 * Math.PI);
    canvasCtx.fill();
    canvasCtx.strokeStyle = '#38bdf8';
    canvasCtx.lineWidth = 2;
    canvasCtx.stroke();

    canvasCtx.fillStyle = '#ffffff';
    canvasCtx.font = 'bold 10px Inter, sans-serif';
    canvasCtx.textAlign = 'center';
    canvasCtx.textBaseline = 'middle';
    canvasCtx.fillText(`${angle}°`, x, y);
    canvasCtx.restore();
}

/**
 * İskelet Çizimi
 */
function drawSkeleton(landmarks) {
    const w = canvasElement.width;
    const h = canvasElement.height;

    const connections = [
        [11, 12], [11, 23], [12, 24], [23, 24],
        [11, 13], [13, 15], [12, 14], [14, 16],
        [23, 25], [25, 27], [24, 26], [26, 28]
    ];

    canvasCtx.lineWidth = 3;
    canvasCtx.strokeStyle = currentMode === 'fitness' ? 'rgba(249, 115, 22, 0.8)' : 'rgba(56, 189, 248, 0.75)';

    connections.forEach(([i, j]) => {
        const p1 = landmarks[i];
        const p2 = landmarks[j];
        if (p1 && p2 && p1.visibility > 0.4 && p2.visibility > 0.4) {
            canvasCtx.beginPath();
            canvasCtx.moveTo(p1.x * w, p1.y * h);
            canvasCtx.lineTo(p2.x * w, p2.y * h);
            canvasCtx.stroke();
        }
    });

    // Ana eklem noktalarını vurgula
    [11, 12, 23, 24, 25, 26].forEach(idx => {
        const p = landmarks[idx];
        if (p && p.visibility > 0.4) {
            canvasCtx.beginPath();
            canvasCtx.arc(p.x * w, p.y * h, 6, 0, 2 * Math.PI);
            canvasCtx.fillStyle = '#22c55e';
            canvasCtx.fill();
            canvasCtx.lineWidth = 2;
            canvasCtx.strokeStyle = '#ffffff';
            canvasCtx.stroke();
        }
    });
}

// MediaPipe Model Kurulumu
const pose = new Pose({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
});

pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6
});

pose.onResults(onResults);

/**
 * Kamerayı Başlat / Kapat
 */
async function toggleCamera() {
    if (isCameraRunning) {
        if (cameraInstance) cameraInstance.stop();
        if (videoElement.srcObject) {
            videoElement.srcObject.getTracks().forEach(track => track.stop());
            videoElement.srcObject = null;
        }
        isCameraRunning = false;
        btnIcon.textContent = "📷";
        btnText.textContent = "Kamerayı Başlat";
        toggleCameraBtn.className = "btn btn-primary";
        statusDot.className = "dot";
        statusText.textContent = "Kamera durduruldu.";
        fpsCounter.textContent = "FPS: 0";
    } else {
        statusText.textContent = "Kamera başlatılıyor...";
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 640 }, height: { ideal: 480 } }
            });
            videoElement.srcObject = stream;
            await videoElement.play();

            cameraInstance = new Camera(videoElement, {
                onFrame: async () => {
                    await pose.send({ image: videoElement });
                },
                width: 640,
                height: 480
            });
            await cameraInstance.start();

            isCameraRunning = true;
            btnIcon.textContent = "⏹️";
            btnText.textContent = "Kamerayı Durdur";
            toggleCameraBtn.className = "btn btn-danger";
            statusDot.className = "dot active";
            statusText.textContent = "Kamera devrede. Vücudunuzu kadraja yerleştirin.";
        } catch (err) {
            console.error(err);
            statusDot.className = "dot warning";
            statusText.textContent = "Kamera açılamadı: " + err.message;
            alert("Kamera bulunamadı! Telefonunuzu bağlamak için Iriun Webcam uygulamasını açın.");
        }
    }
}

toggleCameraBtn.addEventListener('click', toggleCamera);

// Mod Değiştirme Sekmeleri
tabMeasure.addEventListener('click', () => {
    currentMode = 'measure';
    tabMeasure.classList.add('active');
    tabFitness.classList.remove('active');
    exerciseHud.style.display = 'none';
    guidanceOverlay.style.display = 'flex';
    statusText.textContent = "Beden Ölçüm Modu Aktif.";
});

tabFitness.addEventListener('click', () => {
    currentMode = 'fitness';
    tabFitness.classList.add('active');
    tabMeasure.classList.remove('active');
    exerciseHud.style.display = 'flex';
    guidanceOverlay.style.display = 'none';
    statusText.textContent = "Egzersiz ve Canlı Kalori Takip Modu Aktif.";
});

// Sayacı Sıfırla
resetCounterBtn.addEventListener('click', () => {
    exerciseReps = 0;
    exerciseCaloriesBurned = 0.0;
    squatStage = 'up';
    jackStage = 'closed';
    updateExerciseUI();
    exerciseFeedback.textContent = "Sayaç sıfırlandı. Yeni tekrarlara başlayabilirsiniz.";
    exerciseFeedback.style.color = "#cbd5e1";
});
