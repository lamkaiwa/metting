// Location math is kept separate so boundary and distance behavior can be tested.
export function validPoint(p) {
  return Array.isArray(p) && p.length === 2 && p.every(Number.isFinite)
    && Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 180;
}
export function coarsePoint(p) {
  if (!validPoint(p)) throw new RangeError('Invalid coordinates');
  return p.map(n => Math.round(n * 100) / 100);
}
export function distanceKm(a, b) {
  if (!validPoint(a) || !validPoint(b)) throw new RangeError('Invalid coordinates');
  const rad = n => n * Math.PI / 180;
  const h = Math.sin(rad(b[0] - a[0]) / 2) ** 2
    + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(rad(b[1] - a[1]) / 2) ** 2;
  return 6371.0088 * 2 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, h))));
}
export function distanceLabel(km) {
  if (!Number.isFinite(km) || km < 0) return '距離未知';
  return km < 1 ? '約 1 公里內' : `約 ${Math.round(km)} 公里`;
}
export function nearbyItems(people, center, radius) {
  return people.filter(p => validPoint(p.point)).map(p => ({...p, km:distanceKm(center,p.point)}))
    .filter(p => p.km <= radius).sort((a,b) => a.km-b.km || a.id-b.id);
}
