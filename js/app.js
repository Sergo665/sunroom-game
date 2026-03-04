/* ========================================
   SUNROOM — Контроллер приложения
   Управление экранами, форма, результаты
   ======================================== */

const App = (() => {
    // --- Экраны ---
    const screens = {
        landing: document.getElementById('screen-landing'),
        form: document.getElementById('screen-form'),
        rules: document.getElementById('screen-rules'),
        game: document.getElementById('screen-game'),
        result: document.getElementById('screen-result'),
    };

    function showScreen(name) {
        for (const [key, el] of Object.entries(screens)) {
            el.classList.toggle('active', key === name);
        }
    }

    // --- Маска телефона ---
    function setupPhoneMask() {
        const phoneInput = document.getElementById('user-phone');
        phoneInput.addEventListener('input', (e) => {
            let val = e.target.value.replace(/\D/g, '');

            // Убираем ведущую 8 или 7, нормализуем к 7
            if (val.startsWith('8')) val = '7' + val.slice(1);
            if (!val.startsWith('7') && val.length > 0) val = '7' + val;

            let formatted = '';
            if (val.length > 0) formatted += '+' + val[0];
            if (val.length > 1) formatted += ' (' + val.substring(1, 4);
            if (val.length >= 4) formatted += ')';
            if (val.length > 4) formatted += ' ' + val.substring(4, 7);
            if (val.length > 7) formatted += '-' + val.substring(7, 9);
            if (val.length > 9) formatted += '-' + val.substring(9, 11);

            e.target.value = formatted;
        });

        // Начальное значение
        phoneInput.addEventListener('focus', (e) => {
            if (!e.target.value) e.target.value = '+7 (';
        });
    }

    // --- Валидация формы ---
    function validateForm() {
        const nameInput = document.getElementById('user-name');
        const phoneInput = document.getElementById('user-phone');
        const errorName = document.getElementById('error-name');
        const errorPhone = document.getElementById('error-phone');
        let valid = true;

        // Имя
        const name = nameInput.value.trim();
        if (!name || name.length < 2) {
            nameInput.classList.add('invalid');
            errorName.textContent = 'Введите ваше имя';
            valid = false;
        } else {
            nameInput.classList.remove('invalid');
            errorName.textContent = '';
        }

        // Телефон
        const phone = phoneInput.value.replace(/\D/g, '');
        if (phone.length < 11) {
            phoneInput.classList.add('invalid');
            errorPhone.textContent = 'Введите полный номер телефона';
            valid = false;
        } else {
            phoneInput.classList.remove('invalid');
            errorPhone.textContent = '';
        }

        return valid ? { name, phone: phoneInput.value } : null;
    }

    // --- Обновление попыток на экране правил ---
    function updateAttemptsDisplay() {
        const container = document.getElementById('attempts-display');
        if (!container) return;
        const left = Prizes.getAttemptsLeft();
        const used = Prizes.getAttemptsUsed();
        container.innerHTML = '';

        for (let i = 0; i < Prizes.MAX_ATTEMPTS; i++) {
            const dot = document.createElement('span');
            dot.className = 'attempt-dot ' + (i < used ? 'used' : 'full');
            container.appendChild(dot);
        }
    }

    // --- Показ результата ---
    function showResult(result, braceletStonesData) {
        showScreen('result');

        // Заголовок
        const titles = {
            diamond: 'Невероятно!',
            gold: 'Потрясающе!',
            silver: 'Отличный результат!',
            bronze: 'Хорошая попытка!',
        };
        document.getElementById('result-title').textContent = titles[result.tier] || 'Результат';
        document.getElementById('result-score-value').textContent = result.score;
        document.getElementById('result-prize-name').textContent = result.prize;
        document.getElementById('result-promo').textContent = result.promoCode;

        // Стиль карточки приза
        const card = document.getElementById('result-prize-card');
        card.className = 'result-prize-card tier-' + result.tier;

        // Браслет из камней (анимация)
        const braceletEl = document.getElementById('result-bracelet');
        braceletEl.innerHTML = '';
        if (braceletStonesData && braceletStonesData.length > 0) {
            braceletStonesData.forEach((type, i) => {
                const stone = document.createElement('span');
                stone.className = 'result-stone';
                stone.style.background = `linear-gradient(135deg, ${type.colors[0]}, ${type.colors[1]})`;
                stone.style.animationDelay = (i * 0.05) + 's';
                braceletEl.appendChild(stone);
            });
        }

        // Попытки
        const attemptsSection = document.getElementById('result-attempts');
        const attemptsLeftEl = document.getElementById('result-attempts-left');
        if (result.attemptsLeft > 0) {
            attemptsSection.classList.remove('hidden');
            attemptsLeftEl.textContent = result.attemptsLeft;
        } else {
            attemptsSection.classList.add('hidden');
        }

        // Отправляем данные в Google Sheets (только если все попытки использованы или ещё не отправляли)
        if (Prizes.isGameOver() && !Prizes.isDataSent()) {
            const data = Prizes.getSubmitData();
            Sheets.submit(data).then(() => {
                Prizes.markDataSent();
            });
        }
    }

    // --- Копирование промокода ---
    function setupCopyButton() {
        document.getElementById('btn-copy-promo').addEventListener('click', () => {
            const code = document.getElementById('result-promo').textContent;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(code).then(() => {
                    const btn = document.getElementById('btn-copy-promo');
                    btn.classList.add('copied');
                    setTimeout(() => btn.classList.remove('copied'), 1500);
                });
            } else {
                // Fallback
                const textarea = document.createElement('textarea');
                textarea.value = code;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }
        });
    }

    // --- Запуск игры ---
    function startGame() {
        showScreen('game');
        // Небольшая задержка, чтобы экран отрисовался
        setTimeout(() => {
            Game.start((result, braceletStonesData) => {
                showResult(result, braceletStonesData);
            });
        }, 100);
    }

    // --- Инициализация ---
    function init() {
        // Инициализация Canvas
        Game.init(document.getElementById('game-canvas'));

        // Маска телефона
        setupPhoneMask();

        // Копирование промокода
        setupCopyButton();

        // --- Кнопки ---

        // Лендинг → Форма
        document.getElementById('btn-start').addEventListener('click', () => {
            showScreen('form');
        });

        // Форма → Назад
        document.getElementById('btn-back-form').addEventListener('click', () => {
            showScreen('landing');
        });

        // Форма → Правила (с валидацией)
        document.getElementById('user-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const data = validateForm();
            if (data) {
                Prizes.setUserData(data.name, data.phone);
                updateAttemptsDisplay();
                showScreen('rules');
            }
        });

        // Правила → Игра
        document.getElementById('btn-play').addEventListener('click', () => {
            startGame();
        });

        // Результат → Повторная игра
        document.getElementById('btn-retry').addEventListener('click', () => {
            updateAttemptsDisplay();
            showScreen('rules');
        });

        // Проверяем, если пользователь уже играл ранее
        if (Prizes.isGameOver()) {
            // Все попытки использованы — показываем результат
            const result = Prizes.getResult();
            showResult(result, []);
        } else if (Prizes.getAttemptsUsed() > 0) {
            // Есть незавершённые попытки — показываем правила
            updateAttemptsDisplay();
            // Но нужны данные пользователя
            const userData = Prizes.getUserData();
            if (userData.name && userData.phone) {
                showScreen('rules');
            }
        }

        console.log('[Sunroom] Game initialized');
        console.log('[Sunroom] Для сброса: Prizes.reset() в консоли');
    }

    // Запускаем после загрузки DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return { showScreen };
})();
