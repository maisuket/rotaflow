/**
 * 0=domingo..6=sabado, igual `Date.getDay()`. `null`/vazio significa "roda
 * todo dia" — e o default, entao rotas antigas (sem recorrencia configurada)
 * continuam funcionando exatamente como antes, sem precisar de migracao de dados.
 */
export function isRouteActiveOnWeekday(
  route: { activeWeekdays: number[] | null },
  weekday: number
): boolean {
  return !route.activeWeekdays || route.activeWeekdays.length === 0 || route.activeWeekdays.includes(weekday);
}
