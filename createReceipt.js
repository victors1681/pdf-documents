const fs = require("fs");
const PDFDocument = require("pdfkit");
const fetch = require("node-fetch");
const { formatCurrency } = require("./utils");

async function createReceipt(document, file) {
  let doc = new PDFDocument({ size: "A4", margin: 20 });

  await generateHeader(doc, document);
  generateCustomerInformation(doc, document);
  generateInvoiceTable(doc, document);
  generateFooter(doc, document);

  doc.end();

  // will create a file in the current directory
  if (typeof file === "string") {
    doc.pipe(fs.createWriteStream(file));
    return;
  }

  //file object it will create an write stream

  const promise = new Promise((resolve, rejected) => {
    const writeStream = file.createWriteStream({
      resumable: false,
      contentType: "application/pdf",
    });
    writeStream.on("finish", () => resolve("PDF created successfully"));
    writeStream.on("error", (e) => rejected("Error Invoice: ", e));

    doc.pipe(writeStream);
  });

  return promise;
}

const MARGIN_LEFT = 20;
const MARGIN_RIGHT = 20;
/**
 * Save the default value and increase base on some delta
 * @param {*} defaultValue
 * @returns
 */
const spacingTop = (defaultValue) => {
  let defaultTop = defaultValue;
  return {
    add: (add) => {
      defaultTop = defaultTop + add;
      return defaultTop;
    },
  };
};
async function generateHeader(doc, document) {
  const {
    name: companyName,
    address,
    logo,
    rnc,
    phone,
    branch,
  } = document.company;
  const { issueDay } = document;

  const topDelta = 13; //top space between line
  const margin = spacingTop(65);

  const data = await fetch(logo);
  // eslint-disable-next-line no-undef
  const img = Buffer.from(await data.arrayBuffer());

  doc
    .image(img, MARGIN_LEFT, 15, { width: 100 })
    .fillColor("#444444")
    .fontSize(12)
    .font("Helvetica-Bold")
    .text(companyName, MARGIN_LEFT, 50, { align: "left" })
    .font("Helvetica")
    .fontSize(10)
    .text(branch, MARGIN_LEFT, margin.add(0), { align: "left" })
    .text(`RNC ${rnc}`, MARGIN_LEFT, margin.add(topDelta), { align: "left" })
    .text(`Teléfono: ${phone}`, MARGIN_LEFT, margin.add(topDelta), {
      align: "left",
    })
    .text(`Dirección: ${address}`, MARGIN_LEFT, margin.add(topDelta), {
      align: "left",
    })
    .text(`Fecha Emisión: ${issueDay}`, MARGIN_LEFT, margin.add(topDelta), {
      align: "left",
    });

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

function generateCustomerInformation(doc, document) {
  const { name, address, seller, phone, rnc, email } = document.customer;

  generateHr(doc, 140);
  const customerInformationTop = 160;

  doc
    .fontSize(10)
    .text(`Cliente:`, MARGIN_LEFT, customerInformationTop)
    .font("Helvetica-Bold")
    .text(name, 100, customerInformationTop)
    .font("Helvetica")
    .text("RNC:", MARGIN_LEFT, customerInformationTop + 15)
    .text(rnc, 100, customerInformationTop + 15)
    .text("Teléfono:", MARGIN_LEFT, customerInformationTop + 30)
    .text(phone, 100, customerInformationTop + 30)
    .text("Dirección:", MARGIN_LEFT, customerInformationTop + 45)
    .text(address, 100, customerInformationTop + 45)

    .font("Helvetica")
    .text("Vendedor:", 300, customerInformationTop)
    .font("Helvetica-Bold")
    .text(seller, 380, customerInformationTop)

    .font("Helvetica")
    .text("Email:", 300, customerInformationTop + 15)
    .text(email, 380, customerInformationTop + 15)

    .moveDown();

  generateHr(doc, 230);
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
      .text(`Cheque Futurista: ${document.futureDate}`, 20, futuristPosition, {
        align: "left",
      })
      .fontSize(10)
      .font("Helvetica");
  }

  const notePosition = futuristPosition + 50;
  if (document.note) {
    doc
      .text(`Observación: ${document.note}`, 20, notePosition, {
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
    "Sub Total:",
    "",
    formatCurrency(subtotal, document)
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
    "Total Descuentos:",
    "",
    formatCurrency(document.discountTotal, document)
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
    "Total Cobrado:",
    "",
    formatCurrency(document.totalCollected, document)
  );
  doc.font("Helvetica");
}

function generateFooter(doc, document) {
  doc
    .fontSize(8)
    .text(document.footerMsg, 50, 765, { align: "center", width: 500 })
    .fontSize(8)
    .text("developed by www.mseller.app", 50, 775, {
      align: "center",
      width: 500,
    });
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
  collected
) {
  doc
    .fontSize(8)
    .text(document, 20, y, { width: 90 })
    .text(note, 80, y, { width: 90 })
    .text(discount, 220, y, { width: 90 })
    .text(tax, 270, y)
    .text(subtotal, 320, y, { width: 90, align: "left" })
    .text(total, 380, y, { width: 90, align: "left" })
    .text(date, 440, y, { width: 90, align: "left" })
    .text(collected, 510, y, { width: 90, align: "left" });
}

function generateHr(doc, y) {
  doc
    .strokeColor("#aaaaaa")
    .lineWidth(1)
    .moveTo(MARGIN_LEFT, y)
    .lineTo(570, y)
    .stroke();
}

module.exports = {
  createReceipt,
};
