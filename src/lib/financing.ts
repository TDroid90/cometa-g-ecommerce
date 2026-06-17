export type PaymentPlanCode = "one" | "mipyme3" | "mipyme6" | "common9" | "common12";

export type PaymentPlan = {
  code: PaymentPlanCode;
  label: string;
  installments: number;
  planGobierno: boolean;
  interestRate: number;
  cashflowRate: number;
  note: string;
};

export const CASHFLOW_RATE = 2.5;

export const PAYMENT_PLANS: PaymentPlan[] = [
  {
    code: "one",
    label: "1 pago",
    installments: 1,
    planGobierno: false,
    interestRate: 0,
    cashflowRate: CASHFLOW_RATE,
    note: "Pago comun"
  },
  {
    code: "mipyme3",
    label: "3 cuotas MiPyME",
    installments: 3,
    planGobierno: true,
    interestRate: 0,
    cashflowRate: CASHFLOW_RATE,
    note: "Regimen MiPyME"
  },
  {
    code: "mipyme6",
    label: "6 cuotas MiPyME",
    installments: 6,
    planGobierno: true,
    interestRate: 0,
    cashflowRate: CASHFLOW_RATE,
    note: "Regimen MiPyME"
  },
  {
    code: "common9",
    label: "9 cuotas MiPyME",
    installments: 9,
    planGobierno: true,
    interestRate: 35,
    cashflowRate: CASHFLOW_RATE,
    note: "Regimen MiPyME"
  },
  {
    code: "common12",
    label: "12 cuotas MiPyME",
    installments: 12,
    planGobierno: true,
    interestRate: 55,
    cashflowRate: CASHFLOW_RATE,
    note: "Regimen MiPyME"
  }
];

export function getPaymentPlan(code?: string) {
  return PAYMENT_PLANS.find((plan) => plan.code === code) || PAYMENT_PLANS[0];
}

export function effectiveInterestRate(plan: PaymentPlan) {
  return plan.interestRate + plan.cashflowRate;
}

export function financedTotal(amount: number, plan: PaymentPlan) {
  return Math.round(amount * (1 + effectiveInterestRate(plan) / 100));
}

export function installmentAmount(amount: number, plan: PaymentPlan) {
  return Math.round(financedTotal(amount, plan) / plan.installments);
}
