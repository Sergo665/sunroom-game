/* ========================================
   SUNROOM — Web Audio API Sound Engine
   Все звуки синтезируются, 0 внешних файлов
   ======================================== */

const Sounds = (() => {
    let ctx = null;
    let enabled = true;
    let masterGain = null;

    function getCtx() {
        if (!ctx) {
            try {
                ctx = new (window.AudioContext || window.webkitAudioContext)();
                masterGain = ctx.createGain();
                masterGain.gain.value = 0.3;
                masterGain.connect(ctx.destination);
            } catch (e) {
                enabled = false;
            }
        }
        // Resume if suspended (mobile autoplay policy)
        if (ctx && ctx.state === 'suspended') {
            ctx.resume();
        }
        return ctx;
    }

    function playTone(freq, duration, type, gainVal, attack, decay) {
        if (!enabled) return;
        const c = getCtx();
        if (!c) return;

        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = type || 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, c.currentTime);
        gain.gain.linearRampToValueAtTime(gainVal || 0.2, c.currentTime + (attack || 0.01));
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(c.currentTime);
        osc.stop(c.currentTime + duration + 0.05);
    }

    function playNoise(duration, gainVal) {
        if (!enabled) return;
        const c = getCtx();
        if (!c) return;

        const bufferSize = c.sampleRate * duration;
        const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.5;
        }
        const source = c.createBufferSource();
        source.buffer = buffer;
        const gain = c.createGain();
        gain.gain.setValueAtTime(gainVal || 0.1, c.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);

        const filter = c.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 2000;

        source.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        source.start();
    }

    return {
        // Инициализация (вызвать при первом user gesture)
        init() {
            getCtx();
        },

        // Поймал хороший камень — мягкий приятный клик
        catch() {
            playTone(880, 0.12, 'sine', 0.15, 0.005);
            playTone(1320, 0.08, 'sine', 0.08, 0.01);
        },

        // Поймал треснутый камень — неприятный глухой звук
        crack() {
            playTone(150, 0.2, 'sawtooth', 0.12, 0.01);
            playNoise(0.15, 0.08);
        },

        // Комбо x2
        combo2() {
            playTone(523, 0.15, 'sine', 0.15, 0.01);
            setTimeout(() => playTone(659, 0.15, 'sine', 0.15, 0.01), 80);
            setTimeout(() => playTone(784, 0.2, 'sine', 0.12, 0.01), 160);
        },

        // Комбо x3
        combo3() {
            playTone(523, 0.12, 'triangle', 0.18, 0.01);
            setTimeout(() => playTone(659, 0.12, 'triangle', 0.18, 0.01), 60);
            setTimeout(() => playTone(784, 0.12, 'triangle', 0.18, 0.01), 120);
            setTimeout(() => playTone(1047, 0.3, 'sine', 0.15, 0.01), 180);
        },

        // Золотой камень — мерцающий звук
        golden() {
            playTone(1047, 0.08, 'sine', 0.12, 0.005);
            setTimeout(() => playTone(1319, 0.08, 'sine', 0.12, 0.005), 50);
            setTimeout(() => playTone(1568, 0.08, 'sine', 0.12, 0.005), 100);
            setTimeout(() => playTone(2093, 0.25, 'sine', 0.1, 0.005), 150);
        },

        // Алмаз — радужный звук
        diamond() {
            for (let i = 0; i < 6; i++) {
                setTimeout(() => {
                    playTone(1047 + i * 200, 0.1, 'sine', 0.08, 0.005);
                }, i * 40);
            }
            setTimeout(() => playTone(2637, 0.4, 'sine', 0.12, 0.01), 250);
        },

        // Тик таймера (последние 5 сек)
        tick() {
            playTone(800, 0.05, 'square', 0.06, 0.003);
        },

        // Конец игры
        gameOver() {
            playTone(523, 0.2, 'sine', 0.12, 0.01);
            setTimeout(() => playTone(392, 0.2, 'sine', 0.12, 0.01), 200);
            setTimeout(() => playTone(330, 0.4, 'sine', 0.1, 0.01), 400);
        },

        // Начало обратного отсчёта
        countdownTick() {
            playTone(600, 0.1, 'sine', 0.1, 0.005);
        },

        countdownGo() {
            playTone(800, 0.08, 'sine', 0.15, 0.005);
            setTimeout(() => playTone(1200, 0.15, 'sine', 0.12, 0.005), 60);
        },

        // Достигнут порог приза
        threshold() {
            playTone(784, 0.1, 'sine', 0.15, 0.005);
            setTimeout(() => playTone(988, 0.1, 'sine', 0.15, 0.005), 80);
            setTimeout(() => playTone(1175, 0.2, 'sine', 0.12, 0.005), 160);
        },

        // Вибрация телефона
        vibrate(ms) {
            if (navigator.vibrate) {
                navigator.vibrate(ms || 30);
            }
        },
    };
})();
