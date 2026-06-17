export type PaymentPlanCode =
  | "one"
  | "common2"
  | "mipyme3"
  | "common4"
  | "common5"
  | "mipyme6"
  | "common7"
  | "common8"
  | "common9"
  | "common10"
  | "common11"
  | "common12"
  | "common13"
  | "common14"
  | "common15"
  | "common16"
  | "common17"
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
const CASHFLOW_COEFFICIENT = CASHFLOW_RATE / 100;

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
  commonPlan(4, 1.2722),
  commonPlan(5, 1.3348),
  {
    code: "mipyme6",
    label: "6 cuotas MiPyME",
    installments: 6,
    planGobierno: true,
    coefficientWithVat: 1.187,
    cashflowRate: CASHFLOW_RATE,
    note: "Regimen MiPyME"
  },
  commonPlan(7, 1.4945),
  commonPlan(8, 1.5702),
  commonPlan(9, 1.6494),
  commonPlan(10, 1.7322),
  commonPlan(11, 1.8188),
  commonPlan(12, 1.9093),
  commonPlan(13, 2.004),
  commonPlan(14, 2.103),
  commonPlan(15, 2.2066),
  commonPlan(16, 2.315),
  commonPlan(17, 2.4284),
  commonPlan(18, 2.5472)
];

export function getPaymentPlan(code?: string) {
  return PAYMENT_PLANS.find((plan) => plan.code === code) || PAYMENT_PLANS[0];
}

export function effectiveCoefficient(plan: PaymentPlan) {
  if (plan.installments === 1) {
    return 1;
  }

  return plan.coefficientWithVat + CASHFLOW_COEFFICIENT;
}

export function effectiveInterestRate(plan: PaymentPlan) {
  return Number(((effectiveCoefficient(plan) - 1) * 100).toFixed(2));
}

export function financedTotal(amount: number, plan: PaymentPlan) {
  return Math.round(amount * effectiveCoefficient(plan));
}

export function installmentAmount(amount: number, plan: PaymentPlan) {
  return Math.round(financedTotal(amount, plan) / plan.installments);
}
