const fs = require("fs");
const PDFDocument = require("pdfkit");
const fetch = require("node-fetch");

// Constants
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

/**
 * Create a PDF document with common setup
 * @param {Object} document - The document data
 * @param {String|Object} file - File path or file object
 * @returns {Promise} - Promise that resolves when PDF is created
 */
async function createPDF(document, file, generateContent) {
  let doc = new PDFDocument({ size: "A4", margin: 20 });

  await generateContent(doc, document);

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

/**
 * Render QR code on the document
 */
async function renderQrCode(doc, document, pos) {
  if (!document.qrCodeUrl) {
    return;
  }

  try {
    const data = await fetch(document.qrCodeUrl);
    const contentType = data.headers.get("content-type");

    if (!contentType || !contentType.startsWith("image/")) {
      console.warn("QR Code URL did not return a valid image format");
      return;
    }

    // eslint-disable-next-line no-undef
    const img = Buffer.from(await data.arrayBuffer());

    doc
      .image(img, pos.x, pos.y, { width: 49, height: 49 })
      .fillColor("#444444")
      .fontSize(7)
      .font("Helvetica")
      .text(
        `Código de Seguridad: ${document.securityCode}`,
        pos.x,
        pos.y + 50,
        {
          align: "left",
        }
      )
      .font("Helvetica")
      .fontSize(7)
      .text(
        `Fecha de Firma Digital: ${document.digitalSignatureDate}`,
        pos.x,
        pos.y + 60,
        { align: "left" }
      );
  } catch (error) {
    console.warn("Error rendering QR code:", error.message);
  }
}

/**
 * Generate customer information section
 */
function generateCustomerInformation(doc, document) {
  const { name, address, seller, phone, rnc, email } = document.customer;

  generateHr(doc, 140);
  const customerInformationTop = 160;

  doc
    .fontSize(10)
    .text(`Cliente:`, MARGIN_LEFT, customerInformationTop)
    .font("Helvetica-Bold")
    .text(name, 70, customerInformationTop, {
      width: 700,
    })
    .font("Helvetica")
    .text("RNC:", MARGIN_LEFT, customerInformationTop + 15)
    .text(rnc, 70, customerInformationTop + 15)
    .text("Teléfono:", MARGIN_LEFT, customerInformationTop + 30)
    .text(phone, 70, customerInformationTop + 30)
    .text("Dirección:", MARGIN_LEFT, customerInformationTop + 45)
    .text(address, 70, customerInformationTop + 45)

    .font("Helvetica")
    .text("Vendedor:", 330, customerInformationTop + 15)
    .font("Helvetica-Bold")
    .text(seller, 380, customerInformationTop + 15)

    .font("Helvetica")
    .text("Email:", 330, customerInformationTop + 30)
    .text(email, 380, customerInformationTop + 30)

    .moveDown();

  generateHr(doc, 230);
}

/**
 * Generate footer
 */
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

/**
 * Generate horizontal rule
 */
function generateHr(doc, y) {
  doc
    .strokeColor("#aaaaaa")
    .lineWidth(1)
    .moveTo(MARGIN_LEFT, y)
    .lineTo(570, y)
    .stroke();
}

/**
 * Format date string
 */
function formatDate(str) {
  const date = new Date(str);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  return year + "/" + month + "/" + day;
}

/**
 * Load and render an image with error handling
 */
async function loadAndRenderImage(doc, imageUrl, x, y, options = {}) {
  try {
    const data = await fetch(imageUrl);
    const contentType = data.headers.get("content-type");

    if (contentType && contentType.startsWith("image/")) {
      // eslint-disable-next-line no-undef
      const img = Buffer.from(await data.arrayBuffer());
      doc.image(img, x, y, options);
      return true;
    } else {
      console.warn("Image URL did not return a valid image format");
      return false;
    }
  } catch (error) {
    console.warn("Error loading image:", error.message);
    return false;
  }
}

/**
 * Generate common header parts
 */
async function generateCommonHeader(doc, document) {
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

  // Handle logo image with error checking
  const logoLoaded = await loadAndRenderImage(doc, logo, MARGIN_LEFT, 15, {
    height: 30,
  });

  doc
    .fillColor("#444444")
    .fontSize(12)
    .font("Helvetica-Bold")
    .text(companyName, MARGIN_LEFT, logoLoaded ? 55 : 15, { align: "left" })
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

  return { topDelta, margin };
}

module.exports = {
  MARGIN_LEFT,
  MARGIN_RIGHT,
  spacingTop,
  createPDF,
  renderQrCode,
  generateCustomerInformation,
  generateFooter,
  generateHr,
  formatDate,
  loadAndRenderImage,
  generateCommonHeader,
};
