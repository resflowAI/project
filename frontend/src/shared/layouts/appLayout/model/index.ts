import { NAV_MAP } from '../data';

export function pathToKey(pathname: string): string {
  if (pathname === '/' || pathname === '') return 'home';
  const seg = pathname.split('/').filter(Boolean)[0] ?? 'home';
  return (NAV_MAP as Record<string, string>)[seg] ?? 'home';
}
