/* ========================================
   SUNROOM — Отправка в Google Sheets
   ======================================== */

const Sheets = (() => {
    // ========================================
    // ВАЖНО: Вставьте сюда URL вашего Google Apps Script
    // Инструкция ниже в комментариях
    // ========================================
    const APPS_SCRIPT_URL = '';

    /**
     * Инструкция по настройке Google Sheets:
     *
     * 1. Создайте новую Google таблицу: https://sheets.new
     *
     * 2. Назовите первый лист "Лиды" (или любое имя)
     *
     * 3. В первую строку добавьте заголовки:
     *    A1: Дата | B1: Имя | C1: Телефон | D1: Очки | E1: Приз | F1: Промокод
     *
     * 4. Откройте: Расширения → Apps Script
     *
     * 5. Замените содержимое на:
     *
     *    function doPost(e) {
     *      var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
     *      var data = JSON.parse(e.postData.contents);
     *      sheet.appendRow([
     *        data.date,
     *        data.name,
     *        data.phone,
     *        data.score,
     *        data.prize,
     *        data.promoCode
     *      ]);
     *      return ContentService.createTextOutput(
     *        JSON.stringify({status: 'ok'})
     *      ).setMimeType(ContentService.MimeType.JSON);
     *    }
     *
     * 6. Нажмите "Развернуть" → "Новое развертывание"
     *    - Тип: Веб-приложение
     *    - Выполнять как: Я
     *    - Доступ: Все
     *
     * 7. Скопируйте URL развертывания и вставьте в APPS_SCRIPT_URL выше
     */

    async function submit(data) {
        if (!APPS_SCRIPT_URL) {
            console.warn('[Sheets] APPS_SCRIPT_URL не настроен. Данные не отправлены:', data);
            return { success: false, reason: 'URL не настроен' };
        }

        try {
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors', // Apps Script не поддерживает CORS для POST
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            console.log('[Sheets] Данные отправлены:', data);
            return { success: true };
        } catch (err) {
            console.error('[Sheets] Ошибка отправки:', err);
            return { success: false, reason: err.message };
        }
    }

    return { submit };
})();
