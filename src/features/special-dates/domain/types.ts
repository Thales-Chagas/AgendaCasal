export const SPECIAL_DATE_KINDS = [
  'birthday',
  'dating_anniversary',
  'wedding_anniversary',
  'first_trip',
  'important',
  'custom',
] as const;
export type SpecialDateKind = (typeof SPECIAL_DATE_KINDS)[number];

/** Lembretes permitidos: no dia, 1, 3 ou 7 dias antes. */
export const REMINDER_DAY_OPTIONS = [0, 1, 3, 7] as const;

export type SpecialDate = {
  id: string;
  coupleId: string;
  title: string;
  kind: SpecialDateKind;
  /** YYYY-MM-DD (data original, ex.: dia do casamento). */
  date: string;
  repeatsYearly: boolean;
  reminderDays: number[];
  version: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type SpecialDateFields = Pick<
  SpecialDate,
  'title' | 'kind' | 'date' | 'repeatsYearly' | 'reminderDays'
>;

export const EDITABLE_SPECIAL_DATE_FIELDS: readonly (keyof SpecialDateFields)[] = [
  'title',
  'kind',
  'date',
  'repeatsYearly',
  'reminderDays',
];
