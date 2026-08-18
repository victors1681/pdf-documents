/**
 * Regression test for the items table pagination.
 *
 * A quote used to be laid out from the global item index instead of the rows
 * drawn on the current page, so the totals block fell below the page and PDFKit
 * appended a page for every text() call that landed there - 100 items rendered
 * as 104 pages. This test asserts the page count and that nothing is drawn
 * below the printable area.
 *
 * Run with: npm test
 */
const assert = require("assert");
const PDFDocument = require("pdfkit");
const { createDocument } = require("./createDocument");

const ROWS_PER_PAGE = 22;

/**
 * Wrap PDFKit so we can see where every string is placed and how many pages
 * the document really ends up with.
 */
function instrument() {
  const drawn = [];
  let pages = 0;

  const originalAddPage = PDFDocument.prototype.addPage;
  const originalText = PDFDocument.prototype.text;

  PDFDocument.prototype.addPage = function (...args) {
    pages++;
    return originalAddPage.apply(this, args);
  };
  PDFDocument.prototype.text = function (text, x, y) {
    if (typeof x === "number" && typeof y === "number") {
      drawn.push({ y, text: String(text) });
    }
    return originalText.apply(this, arguments);
  };

  return {
    drawn,
    pages: () => pages,
    restore: () => {
      PDFDocument.prototype.addPage = originalAddPage;
      PDFDocument.prototype.text = originalText;
    },
  };
}

function buildQuote(itemCount) {
  const items = Array.from({ length: itemCount }, (_, index) => ({
    quantity: 1,
    item: `IPA-${1000 + index}`,
    description: "iPad 12 mini wifi and cellular",
    unit: "UN",
    amount: 300,
    discount: 0,
    tax: 20,
    subtotal: 320,
  }));

  return {
    locale: { code: "es-DO", currency: "DOP" },
    company: {
      name: "Mobile Seller",
      address: "Washington Street",
      logo: "",
      rnc: "101000001",
      phone: "809-288-2222",
      branch: "West New York",
    },
    customer: {
      name: "ALMACEN FERRETERIA DEL DETALLISTA CXA Y MAXIMO, SRL",
      rnc: "130000001",
      phone: "829-223-2338",
      address: "Calle segunda #01, Gascue, Distrito Nacional",
      seller: "231-Victor Santos",
      email: "client023-22@gmail.com",
      sellerPhone: "809-222-2222",
    },
    documentNo: "8877392",
    dueDay: "09-09-2023",
    issueDay: "08-09-2023",
    documentType: "quote",
    qrCodeUrl: "",
    securityCode: "C78q+V",
    digitalSignatureDate: "27-01-2020",
    footerMsg: "Nota: No aplica descuentos por pronto pago.",
    subtotal: 300 * itemCount,
    discount: 0,
    tax: 20 * itemCount,
    total: 320 * itemCount,
    items,
  };
}

async function run() {
  for (const itemCount of [0, 1, 22, 23, 44, 45, 100, 500]) {
    const pdfkit = instrument();

    try {
      await createDocument(buildQuote(itemCount), "/dev/null");
    } finally {
      pdfkit.restore();
    }

    const expectedPages = Math.max(1, Math.ceil(itemCount / ROWS_PER_PAGE));
    const bottom = Math.max(...pdfkit.drawn.map((entry) => entry.y));
    const totals = pdfkit.drawn.filter((entry) => entry.text === "Total");
    const continues = pdfkit.drawn.filter((entry) =>
      entry.text.includes("CONTINUA")
    );

    assert.strictEqual(
      pdfkit.pages(),
      expectedPages,
      `${itemCount} items should render ${expectedPages} page(s), got ${pdfkit.pages()}`
    );
    assert.ok(
      bottom <= 821.89,
      `${itemCount} items placed content at y=${bottom}, below the page bottom`
    );
    assert.strictEqual(
      totals.length,
      expectedPages,
      `${itemCount} items should print one totals block per page`
    );
    assert.strictEqual(
      continues.length,
      expectedPages - 1,
      `${itemCount} items should print a CONTINUA mark on every page but the last`
    );

    console.log(`ok - ${itemCount} items -> ${expectedPages} page(s)`);
  }
}

run().catch((error) => {
  console.error(error.message);
  // eslint-disable-next-line no-undef
  process.exit(1);
});
