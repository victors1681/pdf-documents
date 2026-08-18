/**
 * Regression tests for the items table pagination.
 *
 * A quote used to be laid out from the global item index instead of the rows
 * drawn on the current page, so the totals block fell below the page and PDFKit
 * appended a page for every text() call that landed there - 100 items rendered
 * as 104 pages. These tests assert the page count, that nothing is drawn below
 * the printable area, that a row stays inside its own columns, and that a
 * document only ever fetches its QR code once.
 *
 * Run with: npm test
 */
const assert = require("assert");

/**
 * Replace node-fetch before the renderer is loaded so the tests never touch the
 * network and can count how often a document asks for a remote image.
 */
const fetchCalls = [];
const fetchPath = require.resolve("node-fetch");
require.cache[fetchPath] = {
  id: fetchPath,
  filename: fetchPath,
  loaded: true,
  exports: (url) => {
    fetchCalls.push(url);
    return Promise.reject(new Error("network disabled in tests"));
  },
};

const PDFDocument = require("pdfkit");
const { createDocument } = require("./createDocument");

const ROWS_PER_PAGE = 22;
const PAGE_BOTTOM = 821.89;
const UNIT_COLUMN_LEFT = 360;

/**
 * Wrap PDFKit so we can see where every string is placed, how far it pushed the
 * cursor, and how many pages the document really ends up with.
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
  PDFDocument.prototype.text = function (text, x, y, options) {
    const result = originalText.apply(this, arguments);

    if (typeof x === "number" && typeof y === "number") {
      drawn.push({
        x,
        y,
        text: String(text),
        width: options && options.width,
        advanced: this.y - y,
      });
    }

    return result;
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

function buildQuote(itemCount, overrides = {}) {
  const description = overrides.description || "iPad 12 mini wifi and cellular";
  const items = Array.from({ length: itemCount }, (_, index) => ({
    quantity: 1,
    item: `IPA-${1000 + index}`,
    description,
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
    qrCodeUrl: overrides.qrCodeUrl || "",
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

async function render(quote) {
  const pdfkit = instrument();

  try {
    await createDocument(quote, "/dev/null");
  } finally {
    pdfkit.restore();
  }

  return pdfkit;
}

/**
 * The page count must follow from the item count alone, and no element may be
 * placed below the printable area - that is what used to make PDFKit append a
 * page per text() call.
 */
async function testPageCounts() {
  for (const itemCount of [0, 1, 22, 23, 44, 45, 100, 500]) {
    const pdfkit = await render(buildQuote(itemCount));

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
      bottom <= PAGE_BOTTOM,
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

/**
 * An oversized description must stay inside its own cell. Unbounded, PDFKit
 * wraps it at the page margin, so it runs across the columns to its right and
 * onto the row below - which breaks the one-item-per-row assumption behind
 * ROWS_PER_PAGE.
 */
async function testOversizedDescription() {
  const description =
    "SILICONA ACRILICA TRANSPARENTE PARA SELLADO DE JUNTAS EN VENTANAS Y PUERTAS DE ALUMINIO PRESENTACION 300ML CAJA X 24 UNIDADES REF SIL-300-TR ".repeat(
      6
    );
  const itemCount = 45;
  const pdfkit = await render(buildQuote(itemCount, { description }));

  const cells = pdfkit.drawn.filter((entry) => entry.text === description);
  const bottom = Math.max(...pdfkit.drawn.map((entry) => entry.y));

  assert.strictEqual(
    cells.length,
    itemCount,
    `every item should render its description once, got ${cells.length}`
  );
  assert.strictEqual(
    pdfkit.pages(),
    Math.ceil(itemCount / ROWS_PER_PAGE),
    "an oversized description must not change the page count"
  );
  assert.ok(
    bottom <= PAGE_BOTTOM,
    `an oversized description placed content at y=${bottom}, below the page bottom`
  );

  for (const cell of cells) {
    assert.strictEqual(
      typeof cell.width,
      "number",
      "the description cell must be given an explicit width"
    );
    assert.ok(
      cell.x + cell.width <= UNIT_COLUMN_LEFT,
      `description cell ends at x=${
        cell.x + cell.width
      }, past the unit column at ${UNIT_COLUMN_LEFT}`
    );
    assert.ok(
      cell.advanced <= 12,
      `description wrapped onto another line (cursor advanced ${cell.advanced})`
    );
  }

  console.log(
    `ok - oversized description stays on one line inside its column (${cells.length} rows)`
  );
}

/**
 * A document that cannot load its QR code must not retry the request on every
 * page - a long quote would otherwise pay the failure once per page.
 */
async function testQrCodeIsFetchedOnce() {
  fetchCalls.length = 0;

  const qrCodeUrl = "https://qr.example.com/unreachable";
  const itemCount = 100; // 5 pages
  await render(buildQuote(itemCount, { qrCodeUrl }));

  const qrFetches = fetchCalls.filter((url) => url === qrCodeUrl);

  assert.strictEqual(
    qrFetches.length,
    1,
    `a failing QR code should be requested once per document, got ${qrFetches.length}`
  );

  console.log(
    `ok - failing QR code requested once across ${Math.ceil(
      itemCount / ROWS_PER_PAGE
    )} pages`
  );
}

async function run() {
  await testPageCounts();
  await testOversizedDescription();
  await testQrCodeIsFetchedOnce();
}

run().catch((error) => {
  console.error(error.message);
  // eslint-disable-next-line no-undef
  process.exit(1);
});
