import { describe, expect, it, vi } from 'vitest';
import { crearCacheTtl } from '../cacheTtl.js';

describe('crearCacheTtl', () => {
  it('carga el valor la primera vez y lo reutiliza mientras no expire', async () => {
    const cargar = vi.fn().mockResolvedValue(['dato']);
    const cache = crearCacheTtl(cargar, 60_000);

    await expect(cache.obtener()).resolves.toEqual(['dato']);
    await expect(cache.obtener()).resolves.toEqual(['dato']);

    expect(cargar).toHaveBeenCalledTimes(1);
  });

  it('vuelve a cargar cuando el valor ya expiró', async () => {
    vi.useFakeTimers();
    const cargar = vi.fn().mockResolvedValueOnce('primero').mockResolvedValueOnce('segundo');
    const cache = crearCacheTtl(cargar, 1_000);

    await expect(cache.obtener()).resolves.toBe('primero');

    vi.advanceTimersByTime(1_001);

    await expect(cache.obtener()).resolves.toBe('segundo');
    expect(cargar).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it('sigue sirviendo el valor viejo si el refresco falla', async () => {
    const cache = crearCacheTtl(vi.fn().mockResolvedValueOnce('viejo').mockRejectedValue(new Error('sin red')), 1_000);

    await expect(cache.obtener()).resolves.toBe('viejo');

    await expect(cache.obtener()).resolves.toBe('viejo');
  });

  it('propaga el error si la caché está vacía y la carga falla', async () => {
    const cache = crearCacheTtl(vi.fn().mockRejectedValue(new Error('sin red')), 1_000);

    await expect(cache.obtener()).rejects.toThrow('sin red');
  });

  it('solo hace una carga si llegan varias peticiones a la vez', async () => {
    const cargar = vi.fn().mockResolvedValue('dato');
    const cache = crearCacheTtl(cargar, 60_000);

    await Promise.all([cache.obtener(), cache.obtener(), cache.obtener()]);

    expect(cargar).toHaveBeenCalledTimes(1);
  });
});