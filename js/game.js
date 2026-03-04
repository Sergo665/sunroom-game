/* ========================================
   SUNROOM — Игровой движок Canvas
   Падающие камни, нарастающая сложность,
   визуализация браслета
   ======================================== */

const Game = (() => {
    // --- Настройки ---
    const GAME_DURATION = 30; // секунд
    const BRACELET_HEIGHT = 70; // зона браслета внизу (px)
    const HUD_HEIGHT = 60;     // зона HUD сверху (px)

    // Типы камней (натуральные камни)
    const STONE_TYPES = [
        { name: 'Аметист',       colors: ['#9b59b6', '#6c3483'] },
        { name: 'Тигровый глаз', colors: ['#c8956c', '#8b6914'] },
        { name: 'Лазурит',       colors: ['#2e86c1', '#1a5276'] },
        { name: 'Агат',          colors: ['#a04030', '#6b2c20'] },
        { name: 'Нефрит',        colors: ['#27ae60', '#1a7540'] },
        { name: 'Розовый кварц', colors: ['#e8a0b4', '#c07090'] },
        { name: 'Оникс',         colors: ['#555555', '#2c2c2c'] },
        { name: 'Сердолик',      colors: ['#e07040', '#b85530'] },
        { name: 'Бирюза',        colors: ['#48c9b0', '#1abc9c'] },
    ];

    // Фазы сложности
    const PHASES = [
        { // 0-10 сек: легко
            startTime: 0,
            spawnInterval: 900,  // мс между камнями
            speed: 1.5,           // px/frame
            stoneSize: 32,
            maxActive: 3,
            crackChance: 0,       // вероятность треснутого камня
        },
        { // 10-20 сек: средне
            startTime: 10,
            spawnInterval: 650,
            speed: 2.5,
            stoneSize: 26,
            maxActive: 5,
            crackChance: 0.15,
        },
        { // 20-30 сек: тяжело
            startTime: 20,
            spawnInterval: 420,
            speed: 3.5,
            stoneSize: 22,
            maxActive: 8,
            crackChance: 0.3,
        },
    ];

    // --- Состояние ---
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
    let effects = [];
    let animFrameId = null;
    let timerInterval = null;
    let onGameEnd = null;
    let currentPhase = PHASES[0];

    // --- Инициализация Canvas ---
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

    // --- Камень ---
    function createStone() {
        const isCracked = Math.random() < currentPhase.crackChance;
        const type = STONE_TYPES[Math.floor(Math.random() * STONE_TYPES.length)];
        const size = currentPhase.stoneSize + (Math.random() * 8 - 4);
        const margin = size + 40; // Keep away from progress bar on right
        return {
            x: margin / 2 + Math.random() * (width - margin),
            y: -size,
            size,
            speed: currentPhase.speed + Math.random() * 0.8,
            type,
            isCracked,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.04,
            opacity: 1,
            caught: false,
        };
    }

    // --- Рисование камня ---
    function drawStone(s) {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rotation);
        ctx.globalAlpha = s.opacity;

        const r = s.size / 2;

        // Тень
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 3;

        // Камень (градиент)
        const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
        grad.addColorStop(0, s.type.colors[0]);
        grad.addColorStop(1, s.type.colors[1]);

        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Блик
        ctx.shadowColor = 'transparent';
        const bgrad = ctx.createRadialGradient(-r * 0.25, -r * 0.35, 0, -r * 0.25, -r * 0.35, r * 0.5);
        bgrad.addColorStop(0, 'rgba(255,255,255,0.35)');
        bgrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = bgrad;
        ctx.fill();

        // Трещина
        if (s.isCracked) {
            ctx.strokeStyle = 'rgba(0,0,0,0.6)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-r * 0.3, -r * 0.6);
            ctx.lineTo(r * 0.1, -r * 0.1);
            ctx.lineTo(-r * 0.15, r * 0.2);
            ctx.lineTo(r * 0.25, r * 0.6);
            ctx.stroke();

            // Красноватый оттенок
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(180, 50, 50, 0.15)';
            ctx.fill();
        }

        ctx.restore();
    }

    // --- Рисование браслета ---
    function drawBracelet() {
        const braceletY = height - BRACELET_HEIGHT / 2;
        const centerX = width / 2;
        const braceletWidth = Math.min(width - 60, 300);

        // Резинка (эластичная нить)
        ctx.save();
        ctx.strokeStyle = '#8B7355';
        ctx.lineWidth = 3;
        ctx.setLineDash([]);

        if (braceletStones.length === 0) {
            // Пустая резинка
            ctx.beginPath();
            ctx.moveTo(centerX - braceletWidth / 2, braceletY);
            ctx.quadraticCurveTo(centerX, braceletY + 10, centerX + braceletWidth / 2, braceletY);
            ctx.stroke();
        } else {
            // Резинка с камнями
            const stoneSpacing = Math.min(24, braceletWidth / braceletStones.length);
            const startX = centerX - (braceletStones.length - 1) * stoneSpacing / 2;

            // Рисуем нить через камни
            ctx.beginPath();
            ctx.moveTo(startX - 15, braceletY);
            for (let i = 0; i < braceletStones.length; i++) {
                const sx = startX + i * stoneSpacing;
                ctx.lineTo(sx, braceletY);
            }
            ctx.lineTo(startX + (braceletStones.length - 1) * stoneSpacing + 15, braceletY);
            ctx.stroke();

            // Рисуем камни на резинке
            for (let i = 0; i < braceletStones.length; i++) {
                const bs = braceletStones[i];
                const sx = startX + i * stoneSpacing;
                const stoneR = 10;

                const grad = ctx.createRadialGradient(sx - 2, braceletY - 2, 1, sx, braceletY, stoneR);
                grad.addColorStop(0, bs.colors[0]);
                grad.addColorStop(1, bs.colors[1]);

                ctx.beginPath();
                ctx.arc(sx, braceletY, stoneR, 0, Math.PI * 2);
                ctx.fillStyle = grad;
                ctx.fill();

                // Блик
                const bgrad = ctx.createRadialGradient(sx - 2, braceletY - 3, 0, sx - 2, braceletY - 3, stoneR * 0.6);
                bgrad.addColorStop(0, 'rgba(255,255,255,0.3)');
                bgrad.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.fillStyle = bgrad;
                ctx.fill();
            }
        }
        ctx.restore();

        // Подпись зоны
        ctx.fillStyle = 'rgba(196, 168, 130, 0.3)';
        ctx.font = '11px Comfortaa, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('— ваш браслет —', centerX, braceletY + 25);
    }

    // --- Эффекты ---
    function spawnEffect(x, y, color, text, isPositive) {
        effects.push({
            type: 'burst',
            x, y,
            color,
            radius: 10,
            maxRadius: 40,
            opacity: 0.7,
        });
        effects.push({
            type: 'text',
            x, y: y - 10,
            text,
            isPositive,
            opacity: 1,
            vy: -1.5,
        });
    }

    function updateEffects() {
        for (let i = effects.length - 1; i >= 0; i--) {
            const e = effects[i];
            if (e.type === 'burst') {
                e.radius += 2;
                e.opacity -= 0.04;
            } else if (e.type === 'text') {
                e.y += e.vy;
                e.opacity -= 0.025;
            }
            if (e.opacity <= 0) {
                effects.splice(i, 1);
            }
        }
    }

    function drawEffects() {
        for (const e of effects) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, e.opacity);
            if (e.type === 'burst') {
                ctx.beginPath();
                ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
                ctx.strokeStyle = e.color;
                ctx.lineWidth = 2;
                ctx.stroke();
            } else if (e.type === 'text') {
                ctx.font = 'bold 18px Comfortaa, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = e.isPositive ? '#6abf69' : '#c75050';
                ctx.fillText(e.text, e.x, e.y);
            }
            ctx.restore();
        }
    }

    // --- Обновление фазы ---
    function updatePhase() {
        const gameTime = GAME_DURATION - timeLeft;
        for (let i = PHASES.length - 1; i >= 0; i--) {
            if (gameTime >= PHASES[i].startTime) {
                currentPhase = PHASES[i];
                break;
            }
        }
    }

    // --- Игровой цикл ---
    function gameLoop(timestamp) {
        if (!running) return;

        if (!lastTime) lastTime = timestamp;
        const delta = timestamp - lastTime;
        lastTime = timestamp;
        elapsed += delta;

        // Обновляем фазу
        updatePhase();

        // Спавн камней
        if (elapsed - lastSpawn > currentPhase.spawnInterval) {
            if (stones.filter(s => !s.caught).length < currentPhase.maxActive) {
                stones.push(createStone());
            }
            lastSpawn = elapsed;
        }

        // Обновляем камни
        for (let i = stones.length - 1; i >= 0; i--) {
            const s = stones[i];
            if (s.caught) {
                // Анимация полёта к браслету
                s.opacity -= 0.08;
                s.size *= 0.95;
                if (s.opacity <= 0) {
                    stones.splice(i, 1);
                }
                continue;
            }
            s.y += s.speed;
            s.rotation += s.rotationSpeed;

            // За пределами экрана
            if (s.y > height + s.size) {
                stones.splice(i, 1);
            }
        }

        // Обновляем эффекты
        updateEffects();

        // Рендер
        render();

        animFrameId = requestAnimationFrame(gameLoop);
    }

    function render() {
        ctx.clearRect(0, 0, width, height);

        // Фон
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, '#2c2416');
        bgGrad.addColorStop(0.5, '#352d20');
        bgGrad.addColorStop(1, '#2a2015');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // Декоративные частицы фона (пылинки)
        drawBackgroundParticles();

        // Браслет
        drawBracelet();

        // Камни
        for (const s of stones) {
            drawStone(s);
        }

        // Эффекты
        drawEffects();
    }

    // Декоративные пылинки
    let bgParticles = [];
    function initBgParticles() {
        bgParticles = [];
        for (let i = 0; i < 20; i++) {
            bgParticles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 2 + 0.5,
                speed: Math.random() * 0.3 + 0.1,
                opacity: Math.random() * 0.2 + 0.05,
            });
        }
    }

    function drawBackgroundParticles() {
        for (const p of bgParticles) {
            p.y += p.speed;
            if (p.y > height) {
                p.y = -5;
                p.x = Math.random() * width;
            }
            ctx.save();
            ctx.globalAlpha = p.opacity;
            ctx.fillStyle = '#c4a882';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // --- Обработка нажатий ---
    function handleInput(clientX, clientY) {
        if (!running) return;

        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        // Проверяем попадание по камню (сверху вниз — приоритет верхним)
        for (let i = stones.length - 1; i >= 0; i--) {
            const s = stones[i];
            if (s.caught) continue;

            const dx = x - s.x;
            const dy = y - s.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            // Увеличенная зона нажатия для мобилок
            const hitRadius = s.size / 2 + 12;

            if (dist <= hitRadius) {
                s.caught = true;

                if (s.isCracked) {
                    // Треснутый — минус очко
                    score = Math.max(0, score - 1);
                    spawnEffect(s.x, s.y, '#c75050', '-1', false);
                } else {
                    // Хороший камень — плюс
                    score++;
                    braceletStones.push(s.type);
                    spawnEffect(s.x, s.y, s.type.colors[0], '+1', true);
                }

                // Обновляем HUD
                updateHUD();
                break; // Ловим только один камень за нажатие
            }
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

    // --- HUD ---
    function updateHUD() {
        const scoreEl = document.getElementById('hud-score');
        const timerEl = document.getElementById('hud-timer');
        const bestEl = document.getElementById('hud-best');
        const fillEl = document.getElementById('progress-fill');

        if (scoreEl) scoreEl.textContent = score;
        if (timerEl) {
            timerEl.textContent = Math.ceil(timeLeft);
            if (timeLeft <= 10) {
                timerEl.classList.add('warning');
            } else {
                timerEl.classList.remove('warning');
            }
        }
        if (bestEl) bestEl.textContent = Prizes.getBestScore();

        // Прогресс-бар (max 20 камней = 100%)
        if (fillEl) {
            const pct = Math.min(100, (score / 20) * 100);
            fillEl.style.height = pct + '%';
        }

        // Подсветка порогов
        updateProgressMarks();
    }

    function updateProgressMarks() {
        const marks = {
            'mark-silver': 8,
            'mark-gold': 13,
            'mark-diamond': 18,
        };
        for (const [id, threshold] of Object.entries(marks)) {
            const el = document.getElementById(id);
            if (el) {
                if (score >= threshold) {
                    el.classList.add('reached');
                } else {
                    el.classList.remove('reached');
                }
            }
        }
    }

    // Позиционирование маркеров прогресса
    function positionProgressMarks() {
        const container = document.querySelector('.game-progress');
        if (!container) return;

        const progressBar = container.querySelector('.progress-bar-vertical');
        if (!progressBar) return;

        const barRect = progressBar.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const barHeight = barRect.height;
        const barTop = barRect.top - containerRect.top;

        const marks = {
            'mark-silver': 8,
            'mark-gold': 13,
            'mark-diamond': 18,
        };

        for (const [id, threshold] of Object.entries(marks)) {
            const el = document.getElementById(id);
            if (el) {
                const pct = Math.min(1, threshold / 20);
                const top = barTop + barHeight * (1 - pct);
                el.style.top = top + 'px';
            }
        }
    }

    // --- Таймер ---
    function startTimer() {
        timerInterval = setInterval(() => {
            timeLeft -= 0.1;
            if (timeLeft <= 0) {
                timeLeft = 0;
                endGame();
            }
            updateHUD();
        }, 100);
    }

    // --- Старт / Стоп ---
    function start(callback) {
        onGameEnd = callback;
        score = 0;
        timeLeft = GAME_DURATION;
        lastTime = 0;
        elapsed = 0;
        lastSpawn = 0;
        stones = [];
        braceletStones = [];
        effects = [];
        currentPhase = PHASES[0];
        running = false;

        resize();
        initBgParticles();
        updateHUD();
        positionProgressMarks();

        // Привязка событий
        canvas.addEventListener('touchstart', onTouchStart, { passive: false });
        canvas.addEventListener('click', onClick);

        // Обратный отсчёт 3-2-1
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
            overlay.innerHTML = `<span class="countdown-number">${count}</span>`;
            if (count === 0) {
                overlay.innerHTML = `<span class="countdown-number">Лови!</span>`;
                setTimeout(() => {
                    overlay.remove();
                    onDone();
                }, 600);
                return;
            }
            count--;
            setTimeout(tick, 800);
        }
        tick();
    }

    function endGame() {
        running = false;

        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        if (animFrameId) {
            cancelAnimationFrame(animFrameId);
            animFrameId = null;
        }

        // Убираем обработчики
        canvas.removeEventListener('touchstart', onTouchStart);
        canvas.removeEventListener('click', onClick);

        // Записываем результат
        const result = Prizes.recordAttempt(score);

        // Задержка перед показом результата
        setTimeout(() => {
            if (onGameEnd) onGameEnd(result, braceletStones);
        }, 500);
    }

    function destroy() {
        running = false;
        if (timerInterval) clearInterval(timerInterval);
        if (animFrameId) cancelAnimationFrame(animFrameId);
        canvas.removeEventListener('touchstart', onTouchStart);
        canvas.removeEventListener('click', onClick);
        window.removeEventListener('resize', resize);
    }

    // --- Публичный API ---
    return {
        init,
        start,
        destroy,
        getScore() { return score; },
        getBraceletStones() { return [...braceletStones]; },
        STONE_TYPES,
    };
})();
