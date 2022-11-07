const fs = require("fs");
const PDFDocument = require("pdfkit");
const fetch = require("node-fetch");

async function createInvoice(invoice, path) {
  let doc = new PDFDocument({ size: "A4", margin: 20 });

  await generateHeader(doc, invoice);
  generateCustomerInformation(doc, invoice);
  generateInvoiceTable(doc, invoice);
  generateFooter(doc, invoice);

  doc.end();
  doc.pipe(fs.createWriteStream(path));
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
async function generateHeader(doc, invoice) {
  const {
    name: companyName,
    address,
    logo,
    rnc,
    phone,
    branch,
  } = invoice.company;
  const { ncf, ncfDescription, dueDay, invoiceNo, issueDay } = invoice;

  const topDelta = 13; //top space between line
  const margin = spacingTop(65);
  const topRight = spacingTop(50);

  const data = await fetch(logo);
  // eslint-disable-next-line no-undef
  const img = Buffer.from(await data.arrayBuffer());

  doc
    .image(img, MARGIN_LEFT, 15, { width: 100 })
    .fillColor("#444444")
    .fontSize(12)
    .text(companyName, MARGIN_LEFT, 50, { align: "left" })
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
    })
    .fontSize(10)
    .font("Helvetica-Bold")
    .text(ncfDescription, MARGIN_RIGHT, topRight.add(0), { align: "right" })
    .font("Helvetica")
    .text(`e-NCF: ${ncf}`, 100, topRight.add(topDelta), { align: "right" })
    .text(`No.Factura: ${invoiceNo}`, 100, topRight.add(topDelta), {
      align: "right",
    })
    .text(
      `Fecha Vencimiento: ${formatDate(dueDay)}`,
      MARGIN_RIGHT,
      topRight.add(topDelta),
      { align: "right" }
    )
    .moveDown();
}

function generateCustomerInformation(doc, invoice) {
  const { name, address, seller, phone, rnc, email } = invoice.customer;

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

function generateInvoiceTable(doc, invoice) {
  let i;
  const invoiceTableTop = 250;

  doc.font("Helvetica-Bold");
  generateTableRow(
    doc,
    invoiceTableTop,
    "Cantidad",
    "Código",
    "Descripción",
    "Unidad",
    "Precio",
    "Descuento",
    "Impuesto",
    "SubTotal"
  ); 

  generateHr(doc, invoiceTableTop + 13);
  doc.font("Helvetica");

  for (i = 0; i < invoice.items.length; i++) {
    const item = invoice.items[i];
    const position = invoiceTableTop + (i + 1) * 19;
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
  }

  const subtotalPosition = invoiceTableTop + (i + 1) * 20;
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
    formatCurrency(invoice.subtotal)
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
    formatCurrency(invoice.discount)
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
    formatCurrency(invoice.tax)
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
    formatCurrency(invoice.total)
  );
  doc.font("Helvetica");
}

function generateFooter(doc, invoice) {
  doc
    .fontSize(8)
    .text(invoice.footerMsg, 50, 780, { align: "center", width: 500 })
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
  createInvoice,
};
