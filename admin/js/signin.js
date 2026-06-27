/* ==========================================================================
   admin sign-in — логика
   - Скрытый input ловит текст
   - Каждая буква = один кружок 10×10 с pop-in анимацией
   - Кружки не пересоздаются при backspace — удаляется только последний
   - При неверном пароле: «пароль» краснеет + шейк, поле очищается
   - Пароль: irbagsmd
   ========================================================================== */

(function () {
  const PASSWORD = "irbagsmd";

  const root        = document.querySelector(".signin");
  if (!root) return;

  const input       = root.querySelector(".signin__input");
  const placeholder = root.querySelector(".signin__placeholder");
  const dotsEl      = root.querySelector(".signin__dots");
  const submit      = root.querySelector(".signin__submit");

  let prevLen = 0;

  function syncDots() {
    const len = input.value.length;

    // Снять ошибку при любом вводе после неудачной попытки
    if (root.classList.contains("is-error")) {
      root.classList.remove("is-error");
    }

    // Показать/скрыть placeholder
    placeholder.style.display = len === 0 ? "" : "none";

    if (len > prevLen) {
      // Добавляем только новые точки — сохраняем уже анимированные
      for (let i = prevLen; i < len; i++) {
        const dot = document.createElement("span");
        dot.className = "signin__dot";
        dotsEl.appendChild(dot);
      }
    } else if (len < prevLen) {
      // Удаляем лишние точки с конца
      for (let i = prevLen; i > len; i--) {
        const last = dotsEl.lastElementChild;
        if (last) dotsEl.removeChild(last);
      }
    }

    prevLen = len;
  }

  function attemptLogin() {
    if (input.value === PASSWORD) {
      window.location.href = "dashboard.html";
    } else {
      // Ошибка: очистить, показать красный пароль, снять и заново навесить класс
      // (чтобы анимация shake срабатывала повторно)
      input.value = "";
      dotsEl.innerHTML = "";
      prevLen = 0;
      placeholder.style.display = "";
      root.classList.remove("is-error");
      // force reflow чтобы CSS-анимация перезапустилась
      void root.offsetWidth;
      root.classList.add("is-error");
      input.focus();
    }
  }

  // Клик в любое место → фокус на input
  root.addEventListener("mousedown", (e) => {
    if (e.target === submit) return;
    e.preventDefault();
    input.focus();
  });

  input.addEventListener("input", syncDots);

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      attemptLogin();
    }
  });

  submit.addEventListener("click", attemptLogin);

  // Автофокус
  window.addEventListener("load", () => input.focus());

  // Первичный рендер
  syncDots();
})();
