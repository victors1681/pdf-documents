const { createReceipt } = require("./createReceipt");

const data = {
  whatsapp: {
    recipient: "19292861173",
    template: "quote",
    fileName: "Cotización.pdf",
  },
  locale: {
    code: "es-DO",
    currency: "DOP",
  },
  company: {
    name: "Mobile Seller",
    address: "Washington Street",
    city: "West New York",
    logo: "https://www.mobile-seller.com/mbs/wp-content/uploads/2015/09/mseller-logo-dark.png",
    rnc: "101000001",
    phone: "809-288-2222",
    branch: "West New York",
  },
  customer: {
    name: "ALMACEN FERRETERIA DEL DETALLISTA CXA Y MAXIMO, SRL",
    rnc: "130000001",
    phone: "829-223-2338",
    address: "Calle segunda #01, Gascue, Distrito Nacioonal, Rep,Dom",
    seller: "231-Victor Santos",
    email: "client023-22@gmail.com",
    sellerPhone: "809-222-2222",
  },

  documentNo: "8877392",
  dueDay: "09-09-2023",
  issueDay: "08-09-2023",
  documentType: "receipt",
  paymentType: "Cheque",
  isFutureCheck: true,
  futureDate: "2/02/22",
  bankName: "Bank of America",
  referenceNo: "929292",
  footerMsg:
    "Nota: No aplica descuentos por pronto pago. Si paga con transferencia, incluir código del cliente o No. Factura",
  items: [
    {
      document: "34778787",
      node: "this is a test",
      discount: 0,
      tax: 20,
      subtotal: 50,
      total: 70,
      date: "23-01-2022",
      collected: 70,
    },
    {
      document: "34778787",
      node: "",
      discount: 0,
      tax: 20,
      subtotal: 50,
      total: 70,
      date: "23-01-2022",
      collected: 70,
    },
  ],
  note: "cliente pago parcialmente",
  documentTotal: 140.0,
  discountTotal: 0.0,
  totalCollected: 140.0,
};

const test = createReceipt(data, "createReceipt.pdf");
test.then((result) => {
  console.log(result);
});
