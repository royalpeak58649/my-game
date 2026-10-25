// Step 7 — government: treasury income and expenses, austerity when in debt.

import { safe } from '../context';
import type { TickContext } from '../context';

export function governmentStep(ctx: TickContext): void {
  const countries = ctx.eco.countries;
  const tags = Object.keys(countries).sort();
  const income = new Map<string, number>();
  const expenses = new Map<string, number>();
  const points = new Map<string, number>();

  for (let s = 0; s < ctx.states.length; s++) {
    const tag = ctx.states[s].owner;
    income.set(tag, (income.get(tag) ?? 0) + ctx.taxes[s]);
    expenses.set(tag, (expenses.get(tag) ?? 0) + ctx.govCosts[s]);
    points.set(tag, (points.get(tag) ?? 0) + ctx.construction[s]);
  }

  for (let t = 0; t < tags.length; t++) {
    const tag = tags[t];
    const country = countries[tag];
    if (!country) continue;
    const lastIncome = safe(income.get(tag) ?? 0);
    const lastExpenses = safe(expenses.get(tag) ?? 0);
    country.lastIncome = lastIncome;
    country.lastExpenses = lastExpenses;
    country.constructionPoints = safe(points.get(tag) ?? 0);
    country.treasury = safe(country.treasury) + lastIncome - lastExpenses;
  }

  // Austerity applies to the next week's employment step: a country in debt runs its
  // government buildings at half staffing until the treasury is positive again.
  for (let s = 0; s < ctx.states.length; s++) {
    const country = ctx.states[s].country;
    ctx.austerity[s] = safe(country.treasury) < 0;
  }
}
