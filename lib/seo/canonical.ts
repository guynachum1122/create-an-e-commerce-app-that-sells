import { SITE_URL } from './constants';

type SearchParams = Record<string, string | string[] | undefined>;

export function resolveCanonical(
  pathname: string,
  searchParams: SearchParams
): { canonical: string; index: boolean } {
  const base = `${SITE_URL}${pathname}`;

  if (pathname.startsWith('/category/')) {
    const keys = Object.keys(searchParams).filter((k) => searchParams[k] !== undefined);
    const tagOnly =
      keys.length === 1 &&
      keys[0] === 'tags' &&
      typeof searchParams.tags === 'string' &&
      !searchParams.tags.includes(',');

    if (keys.length === 0) return { canonical: base, index: true };
    if (tagOnly) return { canonical: `${base}?tags=${searchParams.tags}`, index: true };
    return { canonical: base, index: false };
  }

  if (pathname === '/search') {
    const hasQuery = typeof searchParams.q === 'string' && searchParams.q.length > 0;
    const tagOnly =
      !hasQuery &&
      typeof searchParams.tags === 'string' &&
      searchParams.tags.length > 0 &&
      !searchParams.tags.includes(',');

    if (tagOnly) return { canonical: `${base}?tags=${searchParams.tags}`, index: true };
    return { canonical: base, index: false };
  }

  return { canonical: base, index: true };
}
