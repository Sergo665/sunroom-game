/* ========================================
   SUNROOM — Игровой движок Canvas v2
   Текстуры камней, эффекты частиц,
   комбо-система, бонусные камни,
   атмосферный фон, красивый браслет
   ======================================== */

const Game = (() => {
    // =====================
    //  НАСТРОЙКИ
    // =====================
    const GAME_DURATION = 30;
    const BRACELET_HEIGHT = 80;
    const MAX_SCORE_BAR = 25; // для прогресс-бара

    // Типы камней — расширенная палитра с 3-4 цветами и прожилками
    const STONE_TYPES = [
        { name: 'Аметист',       colors: ['#c39bd3', '#9b59b6', '#6c3483', '#4a235a'], veinColor: 'rgba(255,255,255,0.12)', glow: '#9b59b6' },
        { name: 'Тигровый глаз', colors: ['#e0c080', '#c8956c', '#8b6914', '#5a4500'], veinColor: 'rgba(60,40,0,0.15)',     glow: '#c8956c' },
        { name: 'Лазурит',       colors: ['#5dade2', '#2e86c1', '#1a5276', '#0d3450'], veinColor: 'rgba(255,220,100,0.1)',  glow: '#2e86c1' },
        { name: 'Агат',          colors: ['#d4736a', '#a04030', '#6b2c20', '#451810'], veinColor: 'rgba(255,255,255,0.08)', glow: '#a04030' },
        { name: 'Нефрит',        colors: ['#58d68d', '#27ae60', '#1a7540', '#0d4020'], veinColor: 'rgba(255,255,255,0.1)',  glow: '#27ae60' },
        { name: 'Розовый кварц', colors: ['#f5c6d0', '#e8a0b4', '#c07090', '#904060'], veinColor: 'rgba(255,255,255,0.15)', glow: '#e8a0b4' },
        { name: 'Оникс',         colors: ['#808080', '#555555', '#2c2c2c', '#151515'], veinColor: 'rgba(255,255,255,0.06)', glow: '#666666' },
        { name: 'Сердолик',      colors: ['#f09060', '#e07040', '#b85530', '#802a10'], veinColor: 'rgba(255,200,100,0.1)', glow: '#e07040' },
        { name: 'Бирюза',        colors: ['#76d7c4', '#48c9b0', '#1abc9c', '#0e6655'], veinColor: 'rgba(0,50,40,0.1)',     glow: '#48c9b0' },
    ];

    // Золотой камень
    const GOLDEN_TYPE = {
        name: 'Золотой', colors: ['#fff5cc', '#ffd700', '#daa520', '#b8860b'],
        veinColor: 'rgba(255,255,255,0.2)', glow: '#ffd700', isGolden: true,
    };
    // Алмаз
    const DIAMOND_TYPE = {
        name: 'Алмаз', colors: ['#ffffff', '#e0f0ff', '#a0d0ff', '#70b0e0'],
        veinColor: 'rgba(200,230,255,0.3)', glow: '#a0d0ff', isDiamond: true,
    };
    // Бомба — тёмный камень с красным свечением
    const BOMB_TYPE = {
        name: 'Бомба', colors: ['#4a2020', '#301010', '#1a0808', '#0d0404'],
        veinColor: 'rgba(255,50,50,0.2)', glow: '#ff3333', isBomb: true,
    };

    // Фазы сложности — логическая, не рефлексная
    // Скорость комфортная, но:
    // - Штраф за промах (-1) — нельзя тапать бездумно
    // - Много ловушек — нужно выбирать камни
    // - Камни исчезают — нужно быстро решать
    // - Без комбо-множителей — каждый камень = 1 очко
    const PHASES = [
        { startTime: 0,  spawnInterval: 1000, speed: 1.6, speedRamp: 0.03, stoneSize: 30, maxActive: 3, crackChance: 0.15, bombChance: 0,    goldenChance: 0.01,  diamondChance: 0,     fadeTime: 0   },
        { startTime: 10, spawnInterval: 850,  speed: 2.0, speedRamp: 0.05, stoneSize: 26, maxActive: 4, crackChance: 0.32, bombChance: 0.10, goldenChance: 0.008, diamondChance: 0,     fadeTime: 3.0 },
        { startTime: 20, spawnInterval: 700,  speed: 2.4, speedRamp: 0.07, stoneSize: 22, maxActive: 5, crackChance: 0.40, bombChance: 0.18, goldenChance: 0.005, diamondChance: 0.003, fadeTime: 2.2 },
    ];

    // Фазы атмосферы (цвета фона) — 3 фазы
    const ATMOSPHERES = [
        { bg: ['#2c2416', '#352d20', '#2a2015'], particleColor: '#c4a882', particleCount: 40, lightRays: 2 },
        { bg: ['#2a1f2d', '#352535', '#2a2025'], particleColor: '#c0a0d0', particleCount: 55, lightRays: 3 },
        { bg: ['#301a1a', '#3a2020', '#2e1515'], particleColor: '#d0a0a0', particleCount: 70, lightRays: 3 },
    ];

    // =====================
    //  СОСТОЯНИЕ
    // =====================
    let canvas, ctx;
    let width, height, dpr;
    let running = false;
    let score = 0;
    let timeLeft = GAME_DURATION;
    let lastTime = 0;
    let elapsed = 0;
    let lastSpawn = 0;
    let stones = [];
    let braceletStones = [];
    let particles = [];   // мелкие частицы от эффектов
    let flyingStones = []; // камни, летящие к браслету
    let effects = [];
    let animFrameId = null;
    let timerInterval = null;
    let onGameEnd = null;
    let currentPhaseIdx = 0;
    let currentPhase = PHASES[0];
    let atmosphere = ATMOSPHERES[0];
    let shakeAmount = 0;
    let slowmoTimer = 0;
    let slowmoFactor = 1;

    let lastThresholdReached = 0; // для звука порога

    // Фон
    let bgStars = [];
    let bgParticles = [];
    let lightRays = [];

    // Offscreen canvas cache для текстур камней
    let stoneTextureCache = new Map();

    // =====================
    //  ИНИЦИАЛИЗАЦИЯ
    // =====================
    function init(canvasEl) {
        canvas = canvasEl;
        ctx = canvas.getContext('2d');
        resize();
        window.addEventListener('resize', resize);
    }

    function resize() {
        dpr = window.devicePixelRatio || 1;
        width = canvas.parentElement.clientWidth;
        height = canvas.parentElement.clientHeight;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // =====================
    //  ТЕКСТУРА КАМНЯ (offscreen)
    // =====================
    function generateStoneTexture(type, size, isCracked, seed) {
        const key = `${type.name}_${Math.round(size)}_${isCracked ? 1 : 0}_${seed}`;
        if (stoneTextureCache.has(key)) return stoneTextureCache.get(key);

        const pad = 12; // glow padding
        const texSize = (size + pad * 2) * 2; // 2x for quality
        const offscreen = document.createElement('canvas');
        offscreen.width = texSize;
        offscreen.height = texSize;
        const oc = offscreen.getContext('2d');
        oc.scale(2, 2);

        const cx = size / 2 + pad;
        const cy = size / 2 + pad;
        const r = size / 2;
        const rng = mulberry32(seed);

        // --- Glow ---
        oc.save();
        const glowGrad = oc.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 1.6);
        glowGrad.addColorStop(0, type.glow + '40');
        glowGrad.addColorStop(0.5, type.glow + '15');
        glowGrad.addColorStop(1, 'transparent');
        oc.fillStyle = glowGrad;
        oc.beginPath();
        oc.arc(cx, cy, r * 1.6, 0, Math.PI * 2);
        oc.fill();
        oc.restore();

        // --- Неправильная форма (галька) ---
        const points = [];
        const numPoints = 10;
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            const variation = 0.82 + rng() * 0.36; // 0.82-1.18
            points.push({
                x: cx + Math.cos(angle) * r * variation,
                y: cy + Math.sin(angle) * r * variation,
            });
        }

        // Тень
        oc.save();
        oc.shadowColor = 'rgba(0,0,0,0.4)';
        oc.shadowBlur = 8;
        oc.shadowOffsetY = 3;
        drawPebblePath(oc, points);
        oc.fillStyle = type.colors[2];
        oc.fill();
        oc.restore();

        // Основной градиент (3-4 цвета)
        oc.save();
        drawPebblePath(oc, points);
        oc.clip();

        const mainGrad = oc.createRadialGradient(cx - r * 0.25, cy - r * 0.25, r * 0.1, cx + r * 0.1, cy + r * 0.1, r * 1.1);
        mainGrad.addColorStop(0, type.colors[0]);
        mainGrad.addColorStop(0.35, type.colors[1]);
        mainGrad.addColorStop(0.7, type.colors[2]);
        mainGrad.addColorStop(1, type.colors[3]);
        oc.fillStyle = mainGrad;
        oc.fillRect(cx - r - 2, cy - r - 2, r * 2 + 4, r * 2 + 4);

        // --- Прожилки ---
        oc.strokeStyle = type.veinColor;
        oc.lineWidth = 1.2;
        const veinCount = 2 + Math.floor(rng() * 3);
        for (let v = 0; v < veinCount; v++) {
            oc.beginPath();
            let vx = cx + (rng() - 0.5) * r * 1.2;
            let vy = cy + (rng() - 0.5) * r * 1.2;
            oc.moveTo(vx, vy);
            const segments = 3 + Math.floor(rng() * 3);
            for (let s = 0; s < segments; s++) {
                vx += (rng() - 0.5) * r * 0.6;
                vy += (rng() - 0.5) * r * 0.6;
                oc.lineTo(vx, vy);
            }
            oc.stroke();
        }

        // --- Вкрапления ---
        const specks = 4 + Math.floor(rng() * 6);
        for (let s = 0; s < specks; s++) {
            const sx = cx + (rng() - 0.5) * r * 1.4;
            const sy = cy + (rng() - 0.5) * r * 1.4;
            const sr = rng() * 2 + 0.5;
            oc.beginPath();
            oc.arc(sx, sy, sr, 0, Math.PI * 2);
            oc.fillStyle = type.veinColor;
            oc.fill();
        }

        // --- Блик (вытянутый) ---
        oc.save();
        oc.translate(cx - r * 0.2, cy - r * 0.3);
        oc.rotate(-0.3);
        const bGrad = oc.createRadialGradient(0, 0, 0, 0, 0, r * 0.5);
        bGrad.addColorStop(0, 'rgba(255,255,255,0.4)');
        bGrad.addColorStop(0.5, 'rgba(255,255,255,0.1)');
        bGrad.addColorStop(1, 'rgba(255,255,255,0)');
        oc.fillStyle = bGrad;
        oc.scale(1, 0.6);
        oc.beginPath();
        oc.arc(0, 0, r * 0.5, 0, Math.PI * 2);
        oc.fill();
        oc.restore();

        // --- Треснутый камень ---
        if (isCracked) {
            // Трещины
            oc.strokeStyle = 'rgba(0,0,0,0.7)';
            oc.lineWidth = 2;
            const cracks = 2 + Math.floor(rng() * 2);
            for (let c = 0; c < cracks; c++) {
                oc.beginPath();
                let crx = cx + (rng() - 0.5) * r * 0.4;
                let cry = cy - r * 0.5;
                oc.moveTo(crx, cry);
                const segs = 3 + Math.floor(rng() * 3);
                for (let s = 0; s < segs; s++) {
                    crx += (rng() - 0.5) * r * 0.5;
                    cry += r * 0.3 + rng() * r * 0.15;
                    oc.lineTo(crx, cry);
                }
                oc.stroke();
            }
            // Красноватый оттенок
            oc.fillStyle = 'rgba(180, 50, 50, 0.18)';
            oc.fillRect(cx - r - 2, cy - r - 2, r * 2 + 4, r * 2 + 4);
        }

        // Золотой/алмазный/бомба свечение
        if (type.isGolden) {
            const gg = oc.createRadialGradient(cx, cy, r * 0.3, cx, cy, r);
            gg.addColorStop(0, 'rgba(255,215,0,0.2)');
            gg.addColorStop(1, 'rgba(255,215,0,0)');
            oc.fillStyle = gg;
            oc.fillRect(cx - r - 2, cy - r - 2, r * 2 + 4, r * 2 + 4);
        }
        if (type.isDiamond) {
            const dg = oc.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
            dg.addColorStop(0, 'rgba(200,230,255,0.3)');
            dg.addColorStop(1, 'rgba(200,230,255,0)');
            oc.fillStyle = dg;
            oc.fillRect(cx - r - 2, cy - r - 2, r * 2 + 4, r * 2 + 4);
        }
        if (type.isBomb) {
            // Красное свечение
            const bg = oc.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
            bg.addColorStop(0, 'rgba(255,30,30,0.35)');
            bg.addColorStop(1, 'rgba(255,30,30,0)');
            oc.fillStyle = bg;
            oc.fillRect(cx - r - 2, cy - r - 2, r * 2 + 4, r * 2 + 4);
            // Символ X на бомбе
            oc.strokeStyle = 'rgba(255,80,80,0.6)';
            oc.lineWidth = 2.5;
            oc.lineCap = 'round';
            const xr = r * 0.35;
            oc.beginPath();
            oc.moveTo(cx - xr, cy - xr);
            oc.lineTo(cx + xr, cy + xr);
            oc.moveTo(cx + xr, cy - xr);
            oc.lineTo(cx - xr, cy + xr);
            oc.stroke();
        }

        oc.restore(); // clip

        const result = { canvas: offscreen, pad, size };
        stoneTextureCache.set(key, result);
        return result;
    }

    // Рисует путь гальки из точек (сглаженные кривые)
    function drawPebblePath(c, points) {
        c.beginPath();
        const len = points.length;
        c.moveTo(
            (points[len - 1].x + points[0].x) / 2,
            (points[len - 1].y + points[0].y) / 2
        );
        for (let i = 0; i < len; i++) {
            const next = points[(i + 1) % len];
            const midX = (points[i].x + next.x) / 2;
            const midY = (points[i].y + next.y) / 2;
            c.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
        }
        c.closePath();
    }

    // PRNG для стабильных текстур
    function mulberry32(a) {
        return function() {
            let t = a += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    // =====================
    //  СОЗДАНИЕ КАМНЯ
    // =====================
    function createStone() {
        let type, isCracked = false, isBomb = false, pointValue = 1;
        const roll = Math.random();

        // Прогрессивное ускорение внутри фазы
        const gameTime = GAME_DURATION - timeLeft;
        const phaseTime = gameTime - currentPhase.startTime;
        const speedBonus = phaseTime * (currentPhase.speedRamp || 0);

        if (roll < currentPhase.diamondChance) {
            type = DIAMOND_TYPE;
            pointValue = 3;
        } else if (roll < currentPhase.diamondChance + currentPhase.goldenChance) {
            type = GOLDEN_TYPE;
            pointValue = 2;
        } else if (roll < currentPhase.diamondChance + currentPhase.goldenChance + (currentPhase.bombChance || 0)) {
            type = BOMB_TYPE;
            isBomb = true;
            pointValue = -3;
        } else {
            isCracked = Math.random() < currentPhase.crackChance;
            type = STONE_TYPES[Math.floor(Math.random() * STONE_TYPES.length)];
        }

        const size = currentPhase.stoneSize + (Math.random() * 8 - 4);
        const margin = size + 50;
        const seed = Math.floor(Math.random() * 100000);
        const texture = generateStoneTexture(type, size, isCracked, seed);

        // fadeTime: камень исчезает через N секунд (мерцает перед исчезновением)
        const fadeTime = currentPhase.fadeTime || 0;

        return {
            x: margin / 2 + Math.random() * (width - margin),
            y: -size,
            size,
            speed: currentPhase.speed + speedBonus + Math.random() * 0.8,
            type,
            isCracked,
            isBomb,
            pointValue,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.05,
            opacity: 1,
            caught: false,
            texture,
            seed,
            pulsePhase: Math.random() * Math.PI * 2,
            spawnTime: Date.now(),
            fadeTime: fadeTime, // 0 = не исчезает
        };
    }

    // =====================
    //  РИСОВАНИЕ КАМНЯ
    // =====================
    function drawStone(s) {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rotation);
        ctx.globalAlpha = s.opacity;

        // Пульсация для золотых/алмазных/бомб
        let scale = 1;
        if (s.type.isGolden || s.type.isDiamond) {
            scale = 1 + Math.sin(elapsed * 0.005 + s.pulsePhase) * 0.06;
        } else if (s.type.isBomb) {
            scale = 1 + Math.sin(elapsed * 0.008 + s.pulsePhase) * 0.08;
        }

        const tex = s.texture;
        const drawSize = (tex.size + tex.pad * 2) * scale;
        ctx.drawImage(tex.canvas,
            -drawSize / 2, -drawSize / 2,
            drawSize, drawSize
        );

        ctx.restore();
    }

    // =====================
    //  ЭФФЕКТ-ЧАСТИЦЫ
    // =====================
    function spawnCatchParticles(x, y, color, count, isNegative) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
            const speed = 2 + Math.random() * 4;
            particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1,
                size: 2 + Math.random() * 3,
                color: isNegative ? '#ff4444' : color,
                life: 1,
                decay: 0.02 + Math.random() * 0.02,
                gravity: 0.08,
            });
        }
    }

    function spawnFlash(x, y, color) {
        effects.push({
            type: 'flash',
            x, y,
            radius: 5,
            maxRadius: 45,
            opacity: 0.6,
            color: color || '#ffffff',
        });
    }

    function spawnScoreText(x, y, text, isPositive) {
        effects.push({
            type: 'text',
            x, y: y - 15,
            text,
            isPositive,
            opacity: 1,
            vy: -2,
            scale: 1,
        });
    }

    function spawnComboText(multiplier) {
        effects.push({
            type: 'combo',
            x: width / 2,
            y: height / 3,
            text: multiplier >= 3 ? `COMBO x${multiplier}!` : `COMBO x${multiplier}`,
            opacity: 1,
            scale: 0,
            targetScale: 1.5,
        });
    }

    // Камень летит к браслету
    function spawnFlyingStone(x, y, type) {
        const targetX = width / 2 + (Math.random() - 0.5) * 60;
        const targetY = height - BRACELET_HEIGHT / 2;
        flyingStones.push({
            x, y,
            startX: x, startY: y,
            targetX, targetY,
            type,
            progress: 0,
            speed: 0.05 + Math.random() * 0.02,
            size: 10,
        });
    }

    // =====================
    //  ОБНОВЛЕНИЕ ЧАСТИЦ И ЭФФЕКТОВ
    // =====================
    function updateParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx * slowmoFactor;
            p.y += p.vy * slowmoFactor;
            p.vy += p.gravity;
            p.vx *= 0.98;
            p.life -= p.decay;
            p.size *= 0.98;
            if (p.life <= 0 || p.size < 0.3) {
                particles.splice(i, 1);
            }
        }
    }

    function updateEffects() {
        for (let i = effects.length - 1; i >= 0; i--) {
            const e = effects[i];
            if (e.type === 'flash') {
                e.radius += 4;
                e.opacity -= 0.06;
            } else if (e.type === 'text') {
                e.y += e.vy;
                e.opacity -= 0.025;
                e.scale = Math.min(1.2, e.scale + 0.05);
            } else if (e.type === 'combo') {
                e.scale += (e.targetScale - e.scale) * 0.15;
                e.opacity -= 0.015;
            }
            if (e.opacity <= 0) {
                effects.splice(i, 1);
            }
        }
    }

    function updateFlyingStones() {
        for (let i = flyingStones.length - 1; i >= 0; i--) {
            const f = flyingStones[i];
            f.progress += f.speed;
            if (f.progress >= 1) {
                // Прибыл на браслет
                braceletStones.push(f.type);
                flyingStones.splice(i, 1);
                continue;
            }
            // Bezier curve flight
            const t = f.progress;
            const cpX = (f.startX + f.targetX) / 2 + (f.startX > width / 2 ? -60 : 60);
            const cpY = f.startY - 80;
            f.x = (1 - t) * (1 - t) * f.startX + 2 * (1 - t) * t * cpX + t * t * f.targetX;
            f.y = (1 - t) * (1 - t) * f.startY + 2 * (1 - t) * t * cpY + t * t * f.targetY;
            f.size = 10 * (1 - t * 0.3);
        }
    }

    // =====================
    //  РИСОВАНИЕ ЧАСТИЦ И ЭФФЕКТОВ
    // =====================
    function drawParticles() {
        for (const p of particles) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    function drawEffects() {
        for (const e of effects) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, e.opacity);
            if (e.type === 'flash') {
                const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.radius);
                g.addColorStop(0, e.color);
                g.addColorStop(0.5, e.color + '60');
                g.addColorStop(1, 'transparent');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
                ctx.fill();
            } else if (e.type === 'text') {
                ctx.font = `bold ${16 * e.scale}px Comfortaa, sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillStyle = e.isPositive ? '#6abf69' : '#ff5555';
                ctx.strokeStyle = 'rgba(0,0,0,0.5)';
                ctx.lineWidth = 2;
                ctx.strokeText(e.text, e.x, e.y);
                ctx.fillText(e.text, e.x, e.y);
            } else if (e.type === 'combo') {
                ctx.font = `bold ${28 * e.scale}px Comfortaa, sans-serif`;
                ctx.textAlign = 'center';
                const grad = ctx.createLinearGradient(e.x - 80, e.y, e.x + 80, e.y);
                grad.addColorStop(0, '#ffd700');
                grad.addColorStop(0.5, '#fff5cc');
                grad.addColorStop(1, '#ffd700');
                ctx.fillStyle = grad;
                ctx.strokeStyle = 'rgba(0,0,0,0.6)';
                ctx.lineWidth = 3;
                ctx.strokeText(e.text, e.x, e.y);
                ctx.fillText(e.text, e.x, e.y);
            }
            ctx.restore();
        }
    }

    function drawFlyingStones() {
        for (const f of flyingStones) {
            ctx.save();
            ctx.globalAlpha = 0.8;
            const g = ctx.createRadialGradient(f.x - 1, f.y - 1, 0, f.x, f.y, f.size);
            g.addColorStop(0, f.type.colors[0]);
            g.addColorStop(1, f.type.colors[2]);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
            ctx.fill();
            // Trail
            ctx.globalAlpha = 0.2;
            ctx.beginPath();
            ctx.arc(f.x - f.size * 0.5, f.y + f.size * 0.5, f.size * 0.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // =====================
    //  КРАСИВЫЙ БРАСЛЕТ (дуга)
    // =====================
    function drawBracelet() {
        const braceletY = height - BRACELET_HEIGHT / 2;
        const centerX = width / 2;
        const braceletRadius = Math.min(width * 0.35, 140);
        const swingAngle = Math.sin(elapsed * 0.001) * 0.02; // покачивание

        ctx.save();
        ctx.translate(centerX, braceletY);
        ctx.rotate(swingAngle);

        // Зона браслета — мягкое свечение под
        const zoneGrad = ctx.createRadialGradient(0, 0, braceletRadius * 0.3, 0, 0, braceletRadius * 1.5);
        zoneGrad.addColorStop(0, 'rgba(200,160,120,0.06)');
        zoneGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = zoneGrad;
        ctx.beginPath();
        ctx.arc(0, 0, braceletRadius * 1.5, 0, Math.PI * 2);
        ctx.fill();

        const count = braceletStones.length;

        if (count === 0) {
            // Пустая резинка — дуга
            ctx.strokeStyle = 'rgba(139,115,85,0.5)';
            ctx.lineWidth = 2.5;
            ctx.setLineDash([6, 4]);
            ctx.beginPath();
            ctx.arc(0, 0, braceletRadius, Math.PI * 0.15, Math.PI * 0.85);
            ctx.stroke();
            ctx.setLineDash([]);
        } else {
            // Резинка с камнями
            const arcStart = Math.PI * 0.1;
            const arcEnd = Math.PI * 0.9;
            const arcRange = arcEnd - arcStart;

            // Нить
            ctx.strokeStyle = '#8B7355';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, 0, braceletRadius, arcStart, arcStart + arcRange * Math.min(1, count / 18));
            ctx.stroke();

            // Камни на дуге
            for (let i = 0; i < count; i++) {
                const bs = braceletStones[i];
                const angle = arcStart + (arcRange / Math.max(count, 1)) * (i + 0.5);
                const bx = Math.cos(angle) * braceletRadius;
                const by = Math.sin(angle) * braceletRadius;
                const stoneR = 8;

                // Мини-камень с градиентом
                const sg = ctx.createRadialGradient(bx - 1, by - 1, 0, bx, by, stoneR);
                sg.addColorStop(0, bs.colors[0]);
                sg.addColorStop(0.5, bs.colors[1]);
                sg.addColorStop(1, bs.colors[2]);
                ctx.beginPath();
                ctx.arc(bx, by, stoneR, 0, Math.PI * 2);
                ctx.fillStyle = sg;
                ctx.fill();

                // Мини-блик
                ctx.beginPath();
                ctx.arc(bx - 1.5, by - 2, stoneR * 0.4, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.fill();
            }
        }

        // Подпись
        ctx.fillStyle = 'rgba(196, 168, 130, 0.25)';
        ctx.font = '10px Comfortaa, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('~ ваш браслет ~', 0, braceletRadius + 22);

        ctx.restore();

        // Свечение при пороге
        const currentTier = score >= 20 ? 4 : score >= 15 ? 3 : score >= 8 ? 2 : 1;
        if (currentTier > lastThresholdReached && lastThresholdReached > 0) {
            const tierColors = { 2: '#a8b5c0', 3: '#d4a04a', 4: '#7ecdc0' };
            const color = tierColors[currentTier] || '#c8956c';
            spawnFlash(centerX, braceletY, color);
            for (let i = 0; i < 15; i++) {
                const angle = Math.random() * Math.PI * 2;
                particles.push({
                    x: centerX + Math.cos(angle) * braceletRadius,
                    y: braceletY + Math.sin(angle) * braceletRadius * 0.4,
                    vx: Math.cos(angle) * 2,
                    vy: Math.sin(angle) * 2 - 1,
                    size: 2 + Math.random() * 2,
                    color,
                    life: 1,
                    decay: 0.02,
                    gravity: 0.02,
                });
            }
            Sounds.threshold();
        }
        lastThresholdReached = currentTier;
    }

    // =====================
    //  ФОН / АТМОСФЕРА
    // =====================
    function initBackground() {
        bgStars = [];
        for (let i = 0; i < 60; i++) {
            bgStars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 2 + 0.3,
                twinkleSpeed: 0.5 + Math.random() * 2,
                twinklePhase: Math.random() * Math.PI * 2,
                brightness: 0.1 + Math.random() * 0.3,
            });
        }

        bgParticles = [];
        for (let i = 0; i < atmosphere.particleCount; i++) {
            bgParticles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 2.5 + 0.5,
                speed: Math.random() * 0.4 + 0.1,
                drift: (Math.random() - 0.5) * 0.2,
                opacity: Math.random() * 0.15 + 0.03,
            });
        }

        lightRays = [];
        for (let i = 0; i < atmosphere.lightRays; i++) {
            lightRays.push({
                x: width * (0.2 + Math.random() * 0.6),
                width: 40 + Math.random() * 80,
                opacity: 0.03 + Math.random() * 0.04,
                swaySpeed: 0.2 + Math.random() * 0.3,
                swayPhase: Math.random() * Math.PI * 2,
            });
        }
    }

    function drawBackground() {
        const atm = atmosphere;

        // Многослойный градиент
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, atm.bg[0]);
        bgGrad.addColorStop(0.5, atm.bg[1]);
        bgGrad.addColorStop(1, atm.bg[2]);
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // Лучи света
        const t = elapsed * 0.001;
        for (const ray of lightRays) {
            const sway = Math.sin(t * ray.swaySpeed + ray.swayPhase) * 30;
            const rx = ray.x + sway;
            ctx.save();
            ctx.globalAlpha = ray.opacity;
            const rg = ctx.createLinearGradient(rx - ray.width / 2, 0, rx + ray.width / 2, 0);
            rg.addColorStop(0, 'transparent');
            rg.addColorStop(0.5, atm.particleColor);
            rg.addColorStop(1, 'transparent');
            ctx.fillStyle = rg;
            ctx.fillRect(rx - ray.width / 2, 0, ray.width, height);
            ctx.restore();
        }

        // Звёзды (мерцающие)
        for (const s of bgStars) {
            const twinkle = s.brightness + Math.sin(t * s.twinkleSpeed + s.twinklePhase) * s.brightness * 0.5;
            ctx.save();
            ctx.globalAlpha = twinkle;
            ctx.fillStyle = '#e8e0d0';
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Плавающие частицы (пыль в луче)
        for (const p of bgParticles) {
            p.y -= p.speed * slowmoFactor;
            p.x += p.drift * slowmoFactor;
            if (p.y < -10) {
                p.y = height + 10;
                p.x = Math.random() * width;
            }
            if (p.x < -10) p.x = width + 10;
            if (p.x > width + 10) p.x = -10;
            ctx.save();
            ctx.globalAlpha = p.opacity;
            ctx.fillStyle = atm.particleColor;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // =====================
    //  ОБНОВЛЕНИЕ ФАЗЫ
    // =====================
    function updatePhase() {
        const gameTime = GAME_DURATION - timeLeft;
        let newIdx = 0;
        for (let i = PHASES.length - 1; i >= 0; i--) {
            if (gameTime >= PHASES[i].startTime) {
                newIdx = i;
                break;
            }
        }
        if (newIdx !== currentPhaseIdx) {
            currentPhaseIdx = newIdx;
            currentPhase = PHASES[newIdx];
            atmosphere = ATMOSPHERES[newIdx];
        }
    }

    // =====================
    //  ОБРАБОТКА НАЖАТИЙ
    // =====================
    function handleInput(clientX, clientY) {
        if (!running) return;

        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        let hit = false;

        for (let i = stones.length - 1; i >= 0; i--) {
            const s = stones[i];
            if (s.caught) continue;

            const dx = x - s.x;
            const dy = y - s.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const hitRadius = s.size / 2 + 6;

            if (dist <= hitRadius) {
                s.caught = true;
                hit = true;

                if (s.isBomb) {
                    // БОМБА — сильный штраф!
                    score = Math.max(0, score - 3);
                    spawnCatchParticles(s.x, s.y, '#ff2222', 20, true);
                    spawnFlash(s.x, s.y, '#ff0000');
                    spawnScoreText(s.x, s.y, '-3', false);
                    Sounds.bomb();
                    Sounds.vibrate(200);
                    shakeAmount = 14;
                } else if (s.isCracked) {
                    // Треснутый камень
                    score = Math.max(0, score - 1);
                    spawnCatchParticles(s.x, s.y, '#ff4444', 8, true);
                    spawnFlash(s.x, s.y, '#ff4444');
                    spawnScoreText(s.x, s.y, '-1', false);
                    Sounds.crack();
                    Sounds.vibrate(80);
                    shakeAmount = 6;
                } else {
                    // Хороший камень — всегда +1 (без комбо-множителей)
                    const points = s.pointValue;
                    score += points;

                    spawnScoreText(s.x, s.y, '+' + points, true);

                    // Эффекты
                    const particleCount = s.type.isGolden ? 16 : s.type.isDiamond ? 24 : 10;
                    spawnCatchParticles(s.x, s.y, s.type.glow, particleCount, false);
                    spawnFlash(s.x, s.y, s.type.glow);
                    spawnFlyingStone(s.x, s.y, s.type);

                    // Звук
                    if (s.type.isDiamond) { Sounds.diamond(); Sounds.vibrate(100); }
                    else if (s.type.isGolden) { Sounds.golden(); Sounds.vibrate(60); }
                    else { Sounds.catch(); Sounds.vibrate(30); }
                }

                updateHUD();
                break;
            }
        }

        // ШТРАФ ЗА ПРОМАХ — тап мимо всех камней
        if (!hit) {
            score = Math.max(0, score - 1);
            spawnScoreText(x, y, '-1', false);
            spawnFlash(x, y, '#ff6666');
            Sounds.miss();
            Sounds.vibrate(40);
            shakeAmount = 3;
            updateHUD();
        }
    }

    function onTouchStart(e) {
        e.preventDefault();
        for (const touch of e.changedTouches) {
            handleInput(touch.clientX, touch.clientY);
        }
    }

    function onClick(e) {
        handleInput(e.clientX, e.clientY);
    }

    // =====================
    //  GAME LOOP
    // =====================
    function gameLoop(timestamp) {
        if (!running) return;

        if (!lastTime) lastTime = timestamp;
        const delta = timestamp - lastTime;
        lastTime = timestamp;

        // Slowmo
        if (slowmoTimer > 0) {
            slowmoTimer -= delta;
            slowmoFactor = 0.4;
        } else {
            slowmoFactor = 1;
        }

        elapsed += delta * slowmoFactor;

        updatePhase();

        // Спавн камней
        if (elapsed - lastSpawn > currentPhase.spawnInterval / slowmoFactor) {
            if (stones.filter(s => !s.caught).length < currentPhase.maxActive) {
                stones.push(createStone());
            }
            lastSpawn = elapsed;
        }

        // Обновление камней
        const now = Date.now();
        for (let i = stones.length - 1; i >= 0; i--) {
            const s = stones[i];
            if (s.caught) {
                s.opacity -= 0.12;
                s.size *= 0.92;
                if (s.opacity <= 0) stones.splice(i, 1);
                continue;
            }
            s.y += s.speed * slowmoFactor;
            s.rotation += s.rotationSpeed * slowmoFactor;

            // Исчезновение по времени (fadeTime)
            if (s.fadeTime > 0) {
                const age = (now - s.spawnTime) / 1000;
                const fadeStart = s.fadeTime * 0.6; // начинаем мерцать на 60% времени
                if (age >= s.fadeTime) {
                    // Камень исчез — пропущен
                    stones.splice(i, 1);
                    continue;
                } else if (age >= fadeStart) {
                    // Мерцание — камень пульсирует, показывая что скоро исчезнет
                    const fadeProgress = (age - fadeStart) / (s.fadeTime - fadeStart);
                    s.opacity = 1 - fadeProgress * 0.7 + Math.sin(age * 12) * 0.15;
                }
            }

            if (s.y > height + s.size) {
                stones.splice(i, 1);
            }
        }

        // Screen shake decay
        if (shakeAmount > 0) shakeAmount *= 0.85;
        if (shakeAmount < 0.1) shakeAmount = 0;

        updateParticles();
        updateEffects();
        updateFlyingStones();

        render();

        animFrameId = requestAnimationFrame(gameLoop);
    }

    function render() {
        ctx.save();

        // Screen shake
        if (shakeAmount > 0) {
            const sx = (Math.random() - 0.5) * shakeAmount * 2;
            const sy = (Math.random() - 0.5) * shakeAmount * 2;
            ctx.translate(sx, sy);
        }

        ctx.clearRect(-10, -10, width + 20, height + 20);

        // Фон
        drawBackground();

        // Браслет
        drawBracelet();

        // Летящие камни (к браслету)
        drawFlyingStones();

        // Камни
        for (const s of stones) {
            drawStone(s);
        }

        // Частицы
        drawParticles();

        // Эффекты (текст, flash, combo)
        drawEffects();

        ctx.restore();
    }

    // =====================
    //  HUD
    // =====================
    function updateHUD() {
        const scoreEl = document.getElementById('hud-score');
        const timerEl = document.getElementById('hud-timer');
        const bestEl = document.getElementById('hud-best');
        const fillEl = document.getElementById('progress-fill');
        if (scoreEl) scoreEl.textContent = score;
        if (timerEl) {
            timerEl.textContent = Math.ceil(timeLeft);
            if (timeLeft <= 10) timerEl.classList.add('warning');
            else timerEl.classList.remove('warning');
        }
        if (bestEl) bestEl.textContent = Prizes.getBestScore();
        if (fillEl) {
            const pct = Math.min(100, (score / MAX_SCORE_BAR) * 100);
            fillEl.style.height = pct + '%';
        }

        const comboEl = document.getElementById('hud-combo');
        if (comboEl) {
            comboEl.textContent = '';
            comboEl.classList.remove('active');
        }
        updateProgressMarks();
    }

    function updateProgressMarks() {
        const marks = { 'mark-silver': 8, 'mark-gold': 15, 'mark-diamond': 20 };
        for (const [id, threshold] of Object.entries(marks)) {
            const el = document.getElementById(id);
            if (el) el.classList.toggle('reached', score >= threshold);
        }
    }

    function positionProgressMarks() {
        const container = document.querySelector('.game-progress');
        if (!container) return;
        const progressBar = container.querySelector('.progress-bar-vertical');
        if (!progressBar) return;
        const barRect = progressBar.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const barHeight = barRect.height;
        const barTop = barRect.top - containerRect.top;
        const marks = { 'mark-silver': 8, 'mark-gold': 15, 'mark-diamond': 20 };
        for (const [id, threshold] of Object.entries(marks)) {
            const el = document.getElementById(id);
            if (el) {
                const pct = Math.min(1, threshold / MAX_SCORE_BAR);
                el.style.top = (barTop + barHeight * (1 - pct)) + 'px';
            }
        }
    }

    // =====================
    //  ТАЙМЕР
    // =====================
    function startTimer() {
        timerInterval = setInterval(() => {
            timeLeft -= 0.1 * slowmoFactor;
            if (timeLeft <= 0) {
                timeLeft = 0;
                endGame();
            }
            // Тик последние 5 секунд
            if (timeLeft <= 5 && timeLeft > 0) {
                const ceil = Math.ceil(timeLeft);
                const prev = Math.ceil(timeLeft + 0.1);
                if (ceil !== prev) {
                    Sounds.tick();
                }
            }
            updateHUD();
        }, 100);
    }

    // =====================
    //  СТАРТ / СТОП
    // =====================
    function start(callback) {
        onGameEnd = callback;
        score = 0;
        timeLeft = GAME_DURATION;
        lastTime = 0;
        elapsed = 0;
        lastSpawn = 0;
        stones = [];
        braceletStones = [];
        particles = [];
        flyingStones = [];
        effects = [];
        currentPhaseIdx = 0;
        currentPhase = PHASES[0];
        atmosphere = ATMOSPHERES[0];
        shakeAmount = 0;
        slowmoTimer = 0;
        slowmoFactor = 1;
        lastThresholdReached = 0;
        running = false;

        // Clear texture cache (free memory)
        stoneTextureCache.clear();

        resize();
        initBackground();
        updateHUD();
        positionProgressMarks();

        canvas.addEventListener('touchstart', onTouchStart, { passive: false });
        canvas.addEventListener('click', onClick);

        Sounds.init();

        countdown(() => {
            running = true;
            startTimer();
            animFrameId = requestAnimationFrame(gameLoop);
        });
    }

    function countdown(onDone) {
        const overlay = document.createElement('div');
        overlay.className = 'countdown-overlay';
        document.getElementById('screen-game').appendChild(overlay);

        let count = 3;
        function tick() {
            if (count === 0) {
                overlay.innerHTML = '<span class="countdown-number go">Лови!</span>';
                Sounds.countdownGo();
                setTimeout(() => { overlay.remove(); onDone(); }, 600);
                return;
            }
            overlay.innerHTML = `<span class="countdown-number">${count}</span>`;
            Sounds.countdownTick();
            count--;
            setTimeout(tick, 800);
        }
        tick();
    }

    function endGame() {
        running = false;
        if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
        if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
        canvas.removeEventListener('touchstart', onTouchStart);
        canvas.removeEventListener('click', onClick);

        Sounds.gameOver();

        const result = Prizes.recordAttempt(score);

        setTimeout(() => {
            if (onGameEnd) onGameEnd(result, braceletStones);
        }, 600);
    }

    function destroy() {
        running = false;
        if (timerInterval) clearInterval(timerInterval);
        if (animFrameId) cancelAnimationFrame(animFrameId);
        canvas.removeEventListener('touchstart', onTouchStart);
        canvas.removeEventListener('click', onClick);
        window.removeEventListener('resize', resize);
        stoneTextureCache.clear();
    }

    return {
        init,
        start,
        destroy,
        getScore() { return score; },
        getBraceletStones() { return [...braceletStones]; },
        STONE_TYPES,
    };
})();
