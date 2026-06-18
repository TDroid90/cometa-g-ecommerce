export type PaymentPlanCode =
  | "one"
  | "common2"
  | "mipyme3"
  | "mipyme6"
  | "common9"
  | "common12"
  | "common18";

export type PaymentPlan = {
  code: PaymentPlanCode;
  label: string;
  installments: number;
  planGobierno: boolean;
  coefficientWithVat: number;
  cashflowRate: number;
  note: string;
};

export const CASHFLOW_RATE = 2.5;
const DISPLAY_INTEREST_RATES: Record<PaymentPlanCode, number> = {
  one: 0,
  common2: 20,
  mipyme3: 15,
  mipyme6: 25,
  common9: 70,
  common12: 95,
  common18: 160
};

function commonPlan(installments: number, coefficientWithVat: number): PaymentPlan {
  return {
    code: `common${installments}` as PaymentPlanCode,
    label: `${installments} cuotas`,
    installments,
    planGobierno: false,
    coefficientWithVat,
    cashflowRate: CASHFLOW_RATE,
    note: "Cuotas comunes"
  };
}

export const PAYMENT_PLANS: PaymentPlan[] = [
  {
    code: "one",
    label: "1 pago",
    installments: 1,
    planGobierno: false,
    coefficientWithVat: 1,
    cashflowRate: CASHFLOW_RATE,
    note: "Pago comun"
  },
  commonPlan(2, 1.1549),
  {
    code: "mipyme3",
    label: "3 cuotas MiPyME",
    installments: 3,
    planGobierno: true,
    coefficientWithVat: 1.0912,
    cashflowRate: CASHFLOW_RATE,
    note: "Regimen MiPyME"
  },
  {
    code: "mipyme6",
    label: "6 cuotas MiPyME",
    installments: 6,
    planGobierno: true,
    coefficientWithVat: 1.187,
    cashflowRate: CASHFLOW_RATE,
    note: "Regimen MiPyME"
  },
  commonPlan(9, 1.6494),
  commonPlan(12, 1.9093),
  commonPlan(18, 2.5472)
];

export function getPaymentPlan(code?: string) {
  return PAYMENT_PLANS.find((plan) => plan.code === code) || PAYMENT_PLANS[0];
}

export function effectiveCoefficient(plan: PaymentPlan) {
  return 1 + effectiveInterestRate(plan) / 100;
}

export function effectiveInterestRate(plan: PaymentPlan) {
  return DISPLAY_INTEREST_RATES[plan.code];
}

export function financedTotal(amount: number, plan: PaymentPlan) {
  return Math.round(amount * effectiveCoefficient(plan));
}

export function installmentAmount(amount: number, plan: PaymentPlan) {
  return Math.round(financedTotal(amount, plan) / plan.installments);
}
