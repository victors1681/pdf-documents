const { createInvoice } = require("./createInvoice.js");

const invoice = {
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
    name: "COMERCIO, SRL",
    rnc: "130000001",
    phone: "829-223-2338",
    address: "Calle segunda #01, Gascue, Distrito Nacioonal, Rep,Dom",
    seller: "231-Victor Santos",
    email: "client023-22@gmail.com",
  },
  ncf: "E310000000001",
  ncfDescription: "Factura de Crédito Fiscal Electiónica",
  invoice: "8877392",
  dueDay: "09-09-2023",
  issueDay: "08-09-2023",
  documentType: "invoice",
  footerMsg:
    "Nota: No aplica descuentos por pronto pago. Si paga con transferencia, incluir código del cliente o No. Factura",
  items: [
    {
      quantity: 1.0,
      item: "IPA-2444",
      description: "iPad 13 mini wifi and cellular",
      unit: "UN",
      amount: 400.0,
      discount: 0,
      tax: 20.0,
      subtotal: 420.0,
    },
    {
      item: "IPA-2323",
      description: "iPad 12 mini wifi and cellular",
      quantity: 1.0,
      unit: "UN",
      amount: 300.0,
      discount: 0,
      tax: 20.0,
      subtotal: 320.0,
    },
  ],
  subtotal: 700.0,
  discount: 0.0,
  tax: 40.0,
  total: 740.0,
};

const test = createInvoice(invoice, "invoice.pdf");
test.then((result) => {
  console.log(result)
})
