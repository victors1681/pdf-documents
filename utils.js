function formatCurrency(number, document, withSymbol = true) {
  const code = (document.locale && document.locale.code) || "en-US";
  const currency = (document.locale && document.locale.currency) || "USD";
  try {
    if (typeof number === "number") {
      if (withSymbol) {
        return number.toLocaleString(code, { style: "currency", currency });
      }
      return number.toLocaleString(code, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
  } catch (err) {
    console.error(code, currency, err);
  }
  return number;
}

exports.formatCurrency = formatCurrency;
