const formatter = new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' });
export const money = (minor: number) => formatter.format(minor / 100);
