/**
 * La forma en que REST Countries devuelve cada país.
 *
 * Estos tipos son deliberadamente permisivos: la fuente no siempre envía todos
 * los campos (hay países sin capital, sin área o sin población) y preferimos
 * tratar esos datos como desconocidos antes que inventarles un valor.
 */

export interface PaisCrudo {
  codes: { alpha_3: string };
  names: { common: string };
  region?: string | null;
  capital?: string | null;
  capitals?: { name: string }[] | null;
  area?: { kilometers?: number | null } | null;
  population?: number | null;
  borders?: string[] | null;
  currencies?: { code?: string | null }[] | null;
  languages?: { name?: string | null }[] | null;
}

export interface PaginaCruda {
  data: {
    objects: PaisCrudo[];
    meta: {
      total: number;
      count: number;
      limit: number;
      offset: number;
      more: boolean;
    };
  };
}

export interface ErrorCrudo {
  errors: { message: string }[];
}
