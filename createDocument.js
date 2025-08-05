const { formatCurrency } = require("./utils");
const {
  MARGIN_RIGHT,
  spacingTop,
  createPDF,
  renderQrCode,
  generateCustomerInformation,
  generateFooter,
  generateHr,
  formatDate,
  generateCommonHeader,
} = require("./pdfUtils");

async function createDocument(document, file) {
  return await createPDF(document, file, async (doc, document) => {
    await generateHeader(doc, document);
    generateCustomerInformation(doc, document);
    await generateInvoiceTable(doc, document);
    generateFooter(doc, document);
  });
}

async function generateHeader(doc, document) {
  const { topDelta } = await generateCommonHeader(doc, document);

  switch (document.documentType) {
    case "invoice":
      renderInvoiceData(doc, document, topDelta);
      break;
    case "order":
      renderOrderData(doc, document, topDelta);
      break;
    case "quote":
      renderQuoteData(doc, document, topDelta);
      break;
  }

  doc.moveDown();
}
/**
 * Render invoice data
 * @param {*} doc
 * @param {*} document
 * @param {*} topDelta
 */
function renderInvoiceData(doc, document, topDelta) {
  const { ncf, ncfDescription, dueDay, documentNo } = document;
  const topRight = spacingTop(50);

  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .text(ncfDescription, MARGIN_RIGHT, topRight.add(0), { align: "right" })
    .font("Helvetica")
    .text(`e-NCF: ${ncf}`, 100, topRight.add(topDelta), { align: "right" })
    .text(`No.Factura: ${documentNo}`, 100, topRight.add(topDelta), {
      align: "right",
    })
    .text(
      `Fecha Vencimiento: ${formatDate(dueDay)}`,
      MARGIN_RIGHT,
      topRight.add(topDelta),
      { align: "right" }
    );
}

/**
 * Render Order data
 * @param {*} doc
 * @param {*} document
 * @param {*} topDelta
 */
function renderOrderData(doc, document, topDelta) {
  const { documentNo } = document;
  const topRight = spacingTop(50);

  doc
    .fontSize(15)
    .font("Helvetica-Bold")
    .text("Pedido", MARGIN_RIGHT, topRight.add(0), { align: "right" })
    .font("Helvetica")
    .fontSize(10)
    .text(`No. Pedido: ${documentNo}`, 100, topRight.add(topDelta + 5), {
      align: "right",
    });
}

/**
 * Render quote data
 * @param {*} doc
 * @param {*} document
 * @param {*} topDelta
 */
function renderQuoteData(doc, document, topDelta) {
  const { documentNo } = document;
  const topRight = spacingTop(50);

  doc
    .fontSize(15)
    .font("Helvetica-Bold")
    .text("Cotización", MARGIN_RIGHT, topRight.add(0), { align: "right" })
    .font("Helvetica")
    .fontSize(10)
    .text(`No. Cotización: ${documentNo}`, 100, topRight.add(topDelta + 5), {
      align: "right",
    });
}

function renderTableHeader(doc, documentTableTop) {
  doc.font("Helvetica-Bold");
  generateTableRow(
    doc,
    documentTableTop,
    "Cantidad",
    "Código",
    "Descripción",
    "Unidad",
    "Precio",
    "Desc.",
    "Imp.",
    "SubTotal"
  );

  generateHr(doc, documentTableTop + 13);
  doc.font("Helvetica");
}

function renderPage(doc, count) {
  doc
    .fontSize(7)
    .text(`Page: ${count}`, 20, 20, { align: "right" })
    .font("Helvetica")
    .fontSize(10);
}

function renderContinue(doc, documentTableTop, i) {
  const subtotalPosition = documentTableTop + (i + 1) * 20;
  doc
    .fontSize(7)
    .text(`============== CONTINUA ==============`, 0, subtotalPosition, {
      align: "center",
    })
    .font("Helvetica")
    .fontSize(10);
}

async function generateInvoiceTable(doc, document) {
  let i;
  const documentTableTop = 250;

  renderTableHeader(doc, documentTableTop);

  let yPos = 0;
  let page = 1;
  for (i = 0; i < document.items.length; i++) {
    const item = document.items[i];
    const position = documentTableTop + (yPos + 1) * 19;
    generateTableRow(
      doc,
      position,
      item.quantity,
      item.item,
      item.description,
      item.unit,
      formatCurrency(item.amount, document, false),
      formatCurrency(item.discount, document, false),
      formatCurrency(item.tax, document, false),
      formatCurrency(item.subtotal, document, false)
    );
    generateHr(doc, position + 12);
    if (yPos > 20) {
      renderPage(doc, page++);
      renderTotals(doc, document, documentTableTop, i);
      renderContinue(doc, documentTableTop, i);
      generateFooter(doc, document);
      await renderQrCode(doc, document, {
        x: 20,
        y: documentTableTop + (i + 1) * 20,
      });
      /**
       * Render new page
       */
      doc.addPage();
      renderPage(doc, page++);
      await generateHeader(doc, document);
      generateCustomerInformation(doc, document);
      renderTableHeader(doc, documentTableTop);

      yPos = 0;
    }
    yPos++;
  }

  renderTotals(doc, document, documentTableTop, yPos);

  await renderQrCode(doc, document, {
    x: 20,
    y: documentTableTop + (yPos + 1) * 20,
  });
}

function renderTotals(doc, document, documentTableTop, i) {
  const subtotalPosition = documentTableTop + (i + 1) * 20;
  generateTableRow(
    doc,
    subtotalPosition,
    "",
    "",
    "",
    "",
    "",
    "Subtotal",
    "",
    formatCurrency(document.subtotal, document),
    "left"
  );

  const discountPosition = subtotalPosition + 15;
  generateTableRow(
    doc,
    discountPosition,
    "",
    "",
    "",
    "",
    "",
    "Descuento",
    "",
    formatCurrency(document.discount, document),
    "left"
  );

  const taxToPosition = discountPosition + 15;
  generateTableRow(
    doc,
    taxToPosition,
    "",
    "",
    "",
    "",
    "",
    "Impuesto",
    "",
    formatCurrency(document.tax, document),
    "left"
  );

  const duePosition = taxToPosition + 15;
  doc.font("Helvetica-Bold");
  generateTableRow(
    doc,
    duePosition,
    "",
    "",
    "",
    "",
    "",
    "Total",
    "",
    formatCurrency(document.total, document),
    "left"
  );
  doc.font("Helvetica");
}

function generateTableRow(
  doc,
  y,
  quantity,
  item,
  description,
  unit,
  unitCost,
  discount,
  tax,
  lineTotal,
  align = "right"
) {
  doc
    .fontSize(8)
    .text(quantity, 20, y, { width: 90 })
    .text(item, 57, y, { width: 90 })
    .text(description, 110, y)
    .text(unit, 360, y, { width: 28, align: align })
    .text(unitCost, 390, y, { width: 35, align: align })
    .text(discount, 430, y, { width: 40, align: align })
    .text(tax, 470, y, { width: 35, align: align })
    .text(lineTotal, 510, y, { width: 60, align: align });
}

module.exports = {
  createDocument,
};
