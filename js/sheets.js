/* ========================================
   SUNROOM — Отправка в Google Sheets
   Через Google Apps Script

   Метод: GET-запрос с параметрами в URL
   Самый надёжный способ — без CORS, без редиректов
   ======================================== */

const Sheets = (() => {
    // ========================================
    // URL вашего Google Apps Script
    // ========================================
    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxF5ZTcQA_7-iKcKVQU59y1keYDNrkbXS8E5QFyeufthA6MapXlmfTlJfWHNbGq-HNuxw/exec';

    /**
     * ======================================
     * ИНСТРУКЦИЯ ПО НАСТРОЙКЕ APPS SCRIPT
     * ======================================
     *
     * Таблица: https://docs.google.com/spreadsheets/d/1owsjWks5KAsiGUwCpCqWe39rJkuoUWHXqYBTldQaWy0/
     * Лист: "Игры"
     *
     * ШАГ 1: Откройте таблицу → Расширения → Apps Script
     *
     * ШАГ 2: Удалите ВСЁ и вставьте:
     *
     *   function doGet(e) {
     *     try {
     *       var p = e.parameter;
     *       if (p.name) {
     *         var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Игры');
     *         sheet.appendRow([
     *           p.date || new Date().toISOString(),
     *           p.name || '',
     *           p.phone || '',
     *           Number(p.score) || 0,
     *           p.prize || '',
     *           p.promoCode || ''
     *         ]);
     *         return ContentService.createTextOutput('ok');
     *       }
     *       return ContentService.createTextOutput('Sunroom API running');
     *     } catch(err) {
     *       return ContentService.createTextOutput('error: ' + err.message);
     *     }
     *   }
     *
     * ШАГ 3: Развернуть → Новое развертывание
     *   - Тип: Веб-приложение
     *   - Выполнять как: Я
     *   - Доступ: Все
     *
     * ШАГ 4: Скопируйте URL и вставьте выше
     *
     * ШАГ 5: В таблице на листе "Игры" добавьте заголовки:
     *   A1: Дата | B1: Имя | C1: Телефон | D1: Очки | E1: Приз | F1: Промокод
     *
     * ВАЖНО: Каждый раз при изменении кода — НОВОЕ развертывание!
     * ======================================
     */

    function buildUrl(data) {
        const params = new URLSearchParams();
        const fields = ['date', 'name', 'phone', 'score', 'prize', 'promoCode'];
        fields.forEach(key => {
            params.set(key, data[key] != null ? String(data[key]) : '');
        });
        return APPS_SCRIPT_URL + '?' + params.toString();
    }

    function submit(data) {
        if (!APPS_SCRIPT_URL) {
            console.warn('[Sheets] URL не настроен. Данные:', data);
            return Promise.resolve({ success: false });
        }

        const url = buildUrl(data);
        console.log('[Sheets] Отправка:', url);

        // Image GET — самый надёжный метод, без CORS
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                console.log('[Sheets] OK');
                resolve({ success: true });
            };
            img.onerror = () => {
                // onerror срабатывает т.к. ответ — текст, не картинка
                // но запрос всё равно дошёл до сервера
                console.log('[Sheets] Отправлено (ответ не картинка — это нормально)');
                resolve({ success: true });
            };
            img.src = url;
        });
    }

    return { submit };
})();
