(function () {

  var backBtn = document.getElementById('privacyBackBtn');

  function fromSameSite() {
    return !!document.referrer && document.referrer.indexOf(location.origin) === 0;
  }

  if (backBtn) {
    backBtn.addEventListener('click', function () {
      // новая вкладка из оформления заказа (target="_blank") — закрываем её;
      // если браузер не дал закрыть, возвращаемся на страницу, откуда открыли
      if (fromSameSite() && history.length <= 1) {
        window.close();
        setTimeout(function () { window.location.href = document.referrer; }, 200);
        return;
      }
      // перешли со своей страницы (футер и т.п.) — назад туда же
      if (fromSameSite()) {
        history.back();
        return;
      }
      window.location.href = 'index.html';
    });
  }

})();
