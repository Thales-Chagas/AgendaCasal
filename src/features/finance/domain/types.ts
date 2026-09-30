export const BILL_CATEGORIES = [
  'housing',
  'utilities',
  'internet',
  'card',
  'subscription',
  'health',
  'education',
  'transport',
  'insurance',
  'other',
] as const;
export type BillCategory = (typeof BILL_CATEGORIES)[number];

export type BillFrequency = 'monthly' | 'yearly';
export type BillScope = 'person' | 'couple';

/** Lembretes permitidos: no dia, 1, 2, 3, 5 ou 7 dias antes do vencimento. */
export const BILL_REMINDER_OPTIONS = [0, 1, 2, 3, 5, 7] as const;

/** Guardamos no máximo 60 vencimentos pagos (5 anos de uma conta mensal). */
export const MAX_PAID_PERIODS = 60;

export type Bill = {
  id: string;
  coupleId: string;
  /** "couple": os dois veem. "person": privada, só `ownerUserId` vê (garantido no servidor). */
  ownerScope: BillScope;
  ownerUserId: string | null;
  title: string;
  category: BillCategory;
  /** Valor em centavos (opcional: contas como luz variam). */
  amountCents: number | null;
  frequency: BillFrequency;
  /** YYYY-MM-DD do primeiro vencimento. O dia (e o mês, se anual) se repete a partir dele. */
  firstDueDate: string;
  reminderDays: number[];
  /** Vencimentos já pagos (YYYY-MM-DD de cada vencimento). */
  paidPeriods: string[];
  notes: string | null;
  version: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type BillFields = Pick<
  Bill,
  | 'ownerScope'
  | 'ownerUserId'
  | 'title'
  | 'category'
  | 'amountCents'
  | 'frequency'
  | 'firstDueDate'
  | 'reminderDays'
  | 'paidPeriods'
  | 'notes'
>;

/** Tipo (casal/pessoal) e dono não mudam depois de criados (regra do servidor). */
export const EDITABLE_BILL_FIELDS: readonly (keyof BillFields)[] = [
  'title',
  'category',
  'amountCents',
  'frequency',
  'firstDueDate',
  'reminderDays',
  'paidPeriods',
  'notes',
];
