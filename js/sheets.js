/* ========================================
   SUNROOM — Отправка в Google Sheets
   Через Google Apps Script (безопасно)
   ======================================== */

const Sheets = (() => {
    // ========================================
    // ВАЖНО: Вставьте URL вашего Google Apps Script
    // ========================================
    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxqVGvM2WSaMpaxQ9-jkbArYdoqehrNHbg7JS_Q7ryUsWcu1xFBOeIdDrllxTRBx4gvLA/exec';

    /**
     * ======================================
     * ИНСТРУКЦИЯ ПО НАСТРОЙКЕ
     * ======================================
     *
     * Ваша таблица: https://docs.google.com/spreadsheets/d/1owsjWks5KAsiGUwCpCqWe39rJkuoUWHXqYBTldQaWy0/
     * Лист: "Игры"
     *
     * ШАГ 1: Откройте таблицу, затем: Расширения → Apps Script
     *
     * ШАГ 2: Удалите весь код и вставьте:
     *
     *   function doPost(e) {
     *     var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Игры');
     *     var data = JSON.parse(e.postData.contents);
     *     sheet.appendRow([
     *       data.date,
     *       data.name,
     *       data.phone,
     *       data.score,
     *       data.prize,
     *       data.promoCode
     *     ]);
     *     return ContentService.createTextOutput(
     *       JSON.stringify({status: 'ok'})
     *     ).setMimeType(ContentService.MimeType.JSON);
     *   }
     *
     * ШАГ 3: Нажмите "Развернуть" → "Новое развертывание"
     *   - Тип: Веб-приложение
     *   - Выполнять как: Я
     *   - Доступ: Все
     *
     * ШАГ 4: Скопируйте URL и вставьте в APPS_SCRIPT_URL выше
     *
     * ШАГ 5: Убедитесь, что в таблице на листе "Игры" есть заголовки:
     *   A1: Дата | B1: Имя | C1: Телефон | D1: Очки | E1: Приз | F1: Промокод
     *
     * ======================================
     */

    async function submit(data) {
        if (!APPS_SCRIPT_URL) {
            console.warn('[Sheets] APPS_SCRIPT_URL не настроен. Данные:', data);
            return { success: false, reason: 'URL не настроен' };
        }

        try {
            await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            console.log('[Sheets] Данные отправлены:', data);
            return { success: true };
        } catch (err) {
            console.error('[Sheets] Ошибка:', err);
            return { success: false, reason: err.message };
        }
    }

    return { submit };
})();
