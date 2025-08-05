const { formatCurrency } = require("./utils");
const {
  MARGIN_LEFT,
  MARGIN_RIGHT,
  spacingTop,
  createPDF,
  generateCustomerInformation,
  generateFooter,
  generateHr,
  generateCommonHeader,
} = require("./pdfUtils");

async function createReceipt(document, file) {
  return await createPDF(document, file, async (doc, document) => {
    await generateHeader(doc, document);
    generateCustomerInformation(doc, document);
    generateInvoiceTable(doc, document);
    generateFooter(doc, document);
  });
}

async function generateHeader(doc, document) {
  const { topDelta } = await generateCommonHeader(doc, document);
  renderReceiptData(doc, document, topDelta);
  doc.moveDown();
}
/**
 * Render invoice data
 * @param {*} doc
 * @param {*} document
 * @param {*} topDelta
 */
function renderReceiptData(doc, document, topDelta) {
  const {
    paymentType,
    documentNo,
    isFutureCheck,
    futureDate,
    referenceNo,
    bankName,
  } = document;
  const topRight = spacingTop(50);

  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("RECIBO DE PAGO", MARGIN_RIGHT, topRight.add(0), { align: "right" })
    .font("Helvetica")
    .text(`No.Recibo: ${documentNo}`, 100, topRight.add(topDelta + 5), {
      align: "right",
    })
    .text(`Tipo Pago: ${paymentType}`, 100, topRight.add(topDelta), {
      align: "right",
    });

  if (bankName) {
    doc.text(`Banco: ${bankName}`, 100, topRight.add(topDelta), {
      align: "right",
    });
  }

  if (isFutureCheck) {
    doc
      .font("Helvetica-Bold")
      .text(`Cheque Futurista: ${futureDate}`, 100, topRight.add(topDelta), {
        align: "right",
      })
      .font("Helvetica");
  }

  doc.text(`No. Referencia: ${referenceNo}`, 100, topRight.add(topDelta), {
    align: "right",
  });
}

function generateInvoiceTable(doc, document) {
  let i;
  const documentTableTop = 250;

  doc.font("Helvetica-Bold");
  generateTableRow(
    doc,
    documentTableTop,
    "Factura",
    "Observación",
    "Descuento",
    "Impuesto",
    "SubTotal",
    "Total",
    "Fecha",
    "Total Recibido"
  );

  generateHr(doc, documentTableTop + 13);
  doc.font("Helvetica");

  for (i = 0; i < document.items.length; i++) {
    const item = document.items[i];
    const position = documentTableTop + (i + 1) * 19;
    generateTableRow(
      doc,
      position,
      item.document,
      item.note,
      formatCurrency(item.discount, document, false),
      formatCurrency(item.tax, document, false),
      formatCurrency(item.subtotal, document, false),
      formatCurrency(item.total, document, false),
      item.date,
      formatCurrency(item.collected, document, false)
    );

    generateHr(doc, position + 12);
  }

  /**
   * Print big label
   */
  const futuristPosition = documentTableTop + (i + 1) * 20;
  if (document.isFutureCheck) {
    doc
      .font("Helvetica-Bold")
      .fontSize(17)
      .text(
        `Cheque Futurista: ${document.futureDate}`,
        MARGIN_LEFT,
        futuristPosition,
        {
          align: "left",
        }
      )
      .fontSize(10)
      .font("Helvetica");
  }

  const notePosition = futuristPosition + 50;
  if (document.note) {
    doc
      .text(`Observación: ${document.note}`, MARGIN_LEFT, notePosition, {
        align: "left",
      })
      .fontSize(10)
      .font("Helvetica");
  }

  const subtotalPosition = documentTableTop + (i + 1) * 20;
  const subtotal = document.totalCollected - document.discountTotal;
  generateTableRow(
    doc,
    subtotalPosition,
    "",
    "",
    "",
    "",
    "",
    "",
    "Sub Total:",
    formatCurrency(subtotal, document),
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
    "",
    "Total Desc.:",
    `-${formatCurrency(document.discountTotal, document)}`,
    "left"
  );
  doc.font("Helvetica-Bold");
  const taxToPosition = discountPosition + 15;
  generateTableRow(
    doc,
    taxToPosition,
    "",
    "",
    "",
    "",
    "",
    "",
    "Total Cobrado:",
    formatCurrency(document.totalCollected, document),
    "left"
  );
  doc.font("Helvetica");
}

function generateTableRow(
  doc,
  y,
  document,
  note,
  discount,
  tax,
  subtotal,
  total,
  date,
  collected,
  align = "right"
) {
  doc
    .fontSize(8)
    .text(document, MARGIN_LEFT, y, { width: 60 })
    .text(note, 85, y, { width: 70 })
    .text(discount, 160, y, { width: 50, align: align })
    .text(tax, 215, y, { width: 50, align: align })
    .text(subtotal, 270, y, { width: 60, align: align })
    .text(total, 335, y, { width: 60, align: align })
    .text(date, 400, y, { width: 70, align: align })
    .text(collected, 475, y, { width: 75, align: align });
}

module.exports = {
  createReceipt,
};
