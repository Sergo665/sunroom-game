/* ========================================
   SUNROOM — Система призов и промокодов
   ======================================== */

const Prizes = (() => {
    // --- Настраиваемые пороги ---
    const THRESHOLDS = [
        { min: 18, max: 999, prize: 'Бесплатный браслет!',       tier: 'diamond', codePrefix: 'FREE'  },
        { min: 13, max: 17,  prize: 'Браслет в подарок к заказу', tier: 'gold',    codePrefix: 'GIFT'  },
        { min: 8,  max: 12,  prize: 'Скидка 50%',                tier: 'silver',   codePrefix: 'STONE50' },
        { min: 0,  max: 7,   prize: 'Скидка 20%',                tier: 'bronze',   codePrefix: 'STONE20' },
    ];

    const MAX_ATTEMPTS = 3;
    const STORAGE_KEY = 'sunroom_game';

    // --- Состояние ---
    let state = loadState();

    function loadState() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) { /* ignore */ }
        return {
            attemptsUsed: 0,
            bestScore: 0,
            promoCode: null,
            userName: '',
            userPhone: '',
            dataSent: false,
        };
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) { /* ignore */ }
    }

    // --- Генерация промокода ---
    function generateCode(prefix) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 5; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return `${prefix}-${code}`;
    }

    // --- Определение приза ---
    function getPrize(score) {
        for (const t of THRESHOLDS) {
            if (score >= t.min && score <= t.max) {
                return { ...t };
            }
        }
        return { ...THRESHOLDS[THRESHOLDS.length - 1] };
    }

    // --- Публичный API ---
    return {
        get MAX_ATTEMPTS() { return MAX_ATTEMPTS; },
        get THRESHOLDS() { return THRESHOLDS; },

        getAttemptsUsed() {
            return state.attemptsUsed;
        },

        getAttemptsLeft() {
            return MAX_ATTEMPTS - state.attemptsUsed;
        },

        getBestScore() {
            return state.bestScore;
        },

        getPromoCode() {
            return state.promoCode;
        },

        getUserData() {
            return {
                name: state.userName,
                phone: state.userPhone,
            };
        },

        setUserData(name, phone) {
            state.userName = name;
            state.userPhone = phone;
            saveState();
        },

        // Вызывается после каждого раунда
        recordAttempt(score) {
            state.attemptsUsed++;
            if (score > state.bestScore) {
                state.bestScore = score;
                const prize = getPrize(score);
                state.promoCode = generateCode(prize.codePrefix);
            }
            saveState();
            return this.getResult();
        },

        // Текущий лучший результат
        getResult() {
            const prize = getPrize(state.bestScore);
            return {
                score: state.bestScore,
                prize: prize.prize,
                tier: prize.tier,
                promoCode: state.promoCode || generateCode(prize.codePrefix),
                attemptsLeft: MAX_ATTEMPTS - state.attemptsUsed,
            };
        },

        // Для Google Sheets
        getSubmitData() {
            const result = this.getResult();
            return {
                name: state.userName,
                phone: state.userPhone.replace(/^\+/, ''),
                score: result.score,
                prize: result.prize,
                promoCode: result.promoCode,
                date: new Date().toISOString(),
            };
        },

        markDataSent() {
            state.dataSent = true;
            saveState();
        },

        isDataSent() {
            return state.dataSent;
        },

        isGameOver() {
            return state.attemptsUsed >= MAX_ATTEMPTS;
        },

        // Полный сброс (для тестирования)
        reset() {
            state = {
                attemptsUsed: 0,
                bestScore: 0,
                promoCode: null,
                userName: '',
                userPhone: '',
                dataSent: false,
            };
            saveState();
        },
    };
})();
