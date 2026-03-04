/* ========================================
   SUNROOM — Отправка в Google Sheets
   Через Google Apps Script (безопасно)

   Метод: скрытая форма + iframe
   (обходит CORS и 302-редирект Apps Script)
   ======================================== */

const Sheets = (() => {
    // ========================================
    // ВАЖНО: Вставьте URL вашего Google Apps Script
    // ========================================
    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzJBNkAduNhtmmtYf2Si7LGWB_QE_PAuv7um5Ye0rQt0a0fwQY2X-_XePbonrDxV-Onkg/exec';

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
     *     var p = e.parameter;
     *     sheet.appendRow([
     *       p.date,
     *       p.name,
     *       p.phone,
     *       Number(p.score),
     *       p.prize,
     *       p.promoCode
     *     ]);
     *     return ContentService.createTextOutput('ok');
     *   }
     *
     *   // Для тестирования через браузер
     *   function doGet(e) {
     *     return ContentService.createTextOutput('Sunroom Games API is running');
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
     * ВАЖНО: После изменения кода нужно создать НОВОЕ развертывание
     *        (не обновлять старое), чтобы изменения вступили в силу.
     *
     * ======================================
     */

    /**
     * Отправка данных через скрытую HTML-форму + iframe.
     *
     * Почему не fetch?
     *   Apps Script возвращает 302 редирект на script.googleusercontent.com.
     *   fetch с mode:'no-cors' не может следовать кросс-доменным редиректам —
     *   тело POST теряется, запрос превращается в GET → 405.
     *
     * HTML-форма с target=iframe нативно следует редиректам,
     * отправляет тело и не блокируется CORS.
     */
    function submit(data) {
        return new Promise((resolve) => {
            if (!APPS_SCRIPT_URL) {
                console.warn('[Sheets] APPS_SCRIPT_URL не настроен. Данные:', data);
                resolve({ success: false, reason: 'URL не настроен' });
                return;
            }

            try {
                // 1. Создаём скрытый iframe (приёмник ответа)
                const iframeName = 'sheets_iframe_' + Date.now();
                const iframe = document.createElement('iframe');
                iframe.name = iframeName;
                iframe.style.display = 'none';
                document.body.appendChild(iframe);

                // 2. Создаём скрытую форму
                const form = document.createElement('form');
                form.method = 'POST';
                form.action = APPS_SCRIPT_URL;
                form.target = iframeName;
                form.style.display = 'none';

                // 3. Добавляем поля формы из data
                const fields = ['date', 'name', 'phone', 'score', 'prize', 'promoCode'];
                fields.forEach(key => {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = key;
                    input.value = data[key] != null ? String(data[key]) : '';
                    form.appendChild(input);
                });

                document.body.appendChild(form);

                // 4. Таймаут — считаем успехом через 3 сек
                //    (iframe с cross-origin не даёт читать содержимое,
                //     но если форма отправилась без ошибок — данные дошли)
                let resolved = false;

                const cleanup = () => {
                    if (!resolved) {
                        resolved = true;
                        // Убираем мусор из DOM
                        setTimeout(() => {
                            if (form.parentNode) form.parentNode.removeChild(form);
                            if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
                        }, 1000);
                    }
                };

                // Если iframe загрузился — форма дошла
                iframe.addEventListener('load', () => {
                    if (!resolved) {
                        console.log('[Sheets] Данные отправлены (iframe load):', data);
                        cleanup();
                        resolve({ success: true });
                    }
                });

                // Таймаут на случай, если load не сработает
                setTimeout(() => {
                    if (!resolved) {
                        console.log('[Sheets] Данные отправлены (timeout, предполагаем успех):', data);
                        cleanup();
                        resolve({ success: true });
                    }
                }, 5000);

                // 5. Отправляем форму
                form.submit();
                console.log('[Sheets] Форма отправлена:', data);

            } catch (err) {
                console.error('[Sheets] Ошибка отправки:', err);
                resolve({ success: false, reason: err.message });
            }
        });
    }

    return { submit };
})();
