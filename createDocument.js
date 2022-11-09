const fs = require("fs");
const PDFDocument = require("pdfkit");
const fetch = require("node-fetch");

async function createDocument(document, file) {
  let doc = new PDFDocument({ size: "A4", margin: 20 });

  await generateHeader(doc, document);
  generateCustomerInformation(doc, document);
  await generateInvoiceTable(doc, document);
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

async function renderQrCode(doc, document, pos) {
  if (!document.qrCodeUrl) {
    return;
  }

  const data = await fetch(document.qrCodeUrl);
  // eslint-disable-next-line no-undef
  const img = Buffer.from(await data.arrayBuffer());

  doc
    .image(img, pos.x, pos.y, { width: 49, height: 49 })
    .fillColor("#444444")
    .fontSize(7)
    .font("Helvetica")
    .text(`Código de Seguridad: ${document.securityCode}`, pos.x, pos.y + 50, {
      align: "left",
    })
    .font("Helvetica")
    .fontSize(7)
    .text(
      `Fecha de Firma Digital: ${document.digitalSignatureDate}`,
      pos.x,
      pos.y + 60,
      { align: "left" }
    );
}
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
    "Descuento",
    "Impuesto",
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
    .fontSize(10)
}

function renderContinue(doc, documentTableTop, i) {
  const subtotalPosition = documentTableTop + (i + 1) * 20;
  doc
    .fontSize(7)
    .text(`============== CONTINUA ==============`, 0, subtotalPosition, { align: "center" })
    .font("Helvetica")
    .fontSize(10)
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
      formatCurrency(item.amount),
      formatCurrency(item.discount),
      formatCurrency(item.tax),
      formatCurrency(item.subtotal)
    );
    generateHr(doc, position + 12);
    if(yPos > 20) {
      renderPage(doc,page ++);
      renderTotals(doc,document, documentTableTop, i);
      renderContinue(doc, documentTableTop, i);
      generateFooter(doc,document);
      await renderQrCode(doc, document, {
        x: 20,
        y: documentTableTop + (i + 1) * 20,
      });
      /**
       * Render new page
       */
      doc.addPage();
      renderPage(doc,page ++);
      await generateHeader(doc, document);
      generateCustomerInformation(doc, document);
      renderTableHeader(doc, documentTableTop);
      
      yPos = 0 
    }
    yPos++
  }

  renderTotals(doc,document, documentTableTop, yPos)

  await renderQrCode(doc, document, {
    x: 20,
    y: documentTableTop + (yPos + 1) * 20,
  });

}

function renderTotals(doc,document, documentTableTop, i) {

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
    formatCurrency(document.subtotal)
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
    formatCurrency(document.discount)
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
    formatCurrency(document.tax)
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
    formatCurrency(document.total)
  );
  doc.font("Helvetica");
}

function generateFooter(doc, document) {
  doc
    .fontSize(8)
    .text(document.footerMsg, 50, 780, { align: "center", width: 500 })
    .fontSize(8)
    .text("developed by www.mseller.app", 50, 790, {
      align: "center",
      width: 500,
    });
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
  lineTotal
) {
  doc
    .fontSize(8)
    .text(quantity, 20, y, { width: 90 })
    .text(item, 65, y, { width: 90 })
    .text(description, 115, y)
    .text(unit, 360, y, { width: 28, align: "left" })
    .text(unitCost, 400, y, { width: 90, align: "left" })
    .text(discount, 440, y, { width: 90, align: "left" })
    .text(tax, 490, y, { width: 90, align: "left" })
    .text(lineTotal, 530, y, { align: "left" });
}

function generateHr(doc, y) {
  doc
    .strokeColor("#aaaaaa")
    .lineWidth(1)
    .moveTo(MARGIN_LEFT, y)
    .lineTo(570, y)
    .stroke();
}

function formatCurrency(cents) {
  return "$" + cents.toFixed(2);
}

function formatDate(str) {
  const date = new Date(str);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  return year + "/" + month + "/" + day;
}

module.exports = {
  createDocument,
};
