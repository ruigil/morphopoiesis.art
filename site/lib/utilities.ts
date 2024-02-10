// utilities.ts
export const html = (str: TemplateStringsArray, ...val: unknown[]): string => String.raw({ raw: str }, ...val);
