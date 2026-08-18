const { formatCurrency } = require("./utils");
const {
  MARGIN_LEFT,
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

/**
 * Layout of the items table.
 *
 * Every y coordinate below is absolute on the current page, so the values must
 * always be derived from the rows drawn on *that* page. Deriving them from the
 * global item index makes them grow past the bottom of the page, and PDFKit
 * then silently inserts a page for every single text() call that lands there -
 * which is how a 100 item quote used to render as 104 pages.
 */
const TABLE_TOP = 250; // y where the items table starts
const ROW_HEIGHT = 19; // vertical space taken by one item row
const ROWS_PER_PAGE = 22; // rows that fit above the totals block
const TOTALS_GAP = 22; // space between the last row and the totals block

/**
 * Top of the totals / QR code block for a page holding `rowsOnPage` rows.
 * Clamped so it can never fall below the printable area of the page.
 */
function totalsTop(rowsOnPage) {
  const top = TABLE_TOP + rowsOnPage * ROW_HEIGHT + TOTALS_GAP;
  const maxTop = TABLE_TOP + ROWS_PER_PAGE * ROW_HEIGHT + TOTALS_GAP;

  return Math.min(top, maxTop);
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

function renderContinue(doc, top) {
  doc
    .fontSize(7)
    .text(`============== CONTINUA ==============`, 0, top, {
      align: "center",
    })
    .font("Helvetica")
    .fontSize(10);
}

async function generateInvoiceTable(doc, document) {
  const items = Array.isArray(document.items) ? document.items : [];

  let page = 1;
  let rowsOnPage = 0;

  renderTableHeader(doc, TABLE_TOP);

  for (const item of items) {
    if (rowsOnPage === ROWS_PER_PAGE) {
      /**
       * Close the current page before opening the next one.
       */
      const blockTop = totalsTop(rowsOnPage);

      renderPage(doc, page);
      renderTotals(doc, document, blockTop);
      renderContinue(doc, blockTop);
      generateFooter(doc, document);
      await renderQrCode(doc, document, { x: MARGIN_LEFT, y: blockTop });

      /**
       * Render new page
       */
      doc.addPage();
      page++;
      await generateHeader(doc, document);
      generateCustomerInformation(doc, document);
      renderTableHeader(doc, TABLE_TOP);

      rowsOnPage = 0;
    }

    const position = TABLE_TOP + (rowsOnPage + 1) * ROW_HEIGHT;

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

    rowsOnPage++;
  }

  const blockTop = totalsTop(rowsOnPage);

  if (page > 1) {
    renderPage(doc, page);
  }
  renderTotals(doc, document, blockTop);

  await renderQrCode(doc, document, { x: MARGIN_LEFT, y: blockTop });
}

function renderTotals(doc, document, top) {
  generateTableRow(
    doc,
    top,
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

  const discountPosition = top + 15;
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
