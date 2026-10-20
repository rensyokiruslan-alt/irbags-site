// Наличие: цвета с остатком 0 на сайте не показываются, товар без доступных цветов скрыт.
// Остаток не задан (старые товары) — считаем, что в наличии.
(function () {

  function inStock(variant) {
    var s = variant && variant.stock;
    if (s === undefined || s === null || s === '') return true;
    var n = parseInt(s, 10);
    return !isNaN(n) && n > 0;
  }

  function allVariants(product) {
    if (product.variants && product.variants.length > 0) return product.variants;
    return [{
      color:    (product.colors || [])[0] || '',
      price:    product.price    || '',
      discount: product.discount || '',
      photos:   product.photos   || []
    }];
  }

  // Копии товаров только с доступными цветами; товары без них отбрасываются
  function onlyAvailable(products) {
    return (products || []).reduce(function (list, p) {
      var variants = allVariants(p).filter(inStock);
      if (variants.length) {
        var copy = {};
        for (var k in p) copy[k] = p[k];
        copy.variants = variants;
        list.push(copy);
      }
      return list;
    }, []);
  }

  window.IrbagsStock = { inStock: inStock, onlyAvailable: onlyAvailable };

})();
