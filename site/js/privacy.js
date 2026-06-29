/* ==========================================================================
   irbags — политика
   ========================================================================== */

(function () {

  var backBtn = document.getElementById('privacyBackBtn');

  if (backBtn) {
    backBtn.addEventListener('click', function () {
      window.close();
      /* если вкладка не закрылась (открыта напрямую) — идём на checkout */
      setTimeout(function () {
        window.location.href = 'checkout.html';
      }, 200);
    });
  }

})();
