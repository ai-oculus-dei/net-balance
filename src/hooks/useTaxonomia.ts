import { useCallback, useEffect, useRef, useState } from 'react';
import { actualizarClaseGasto, fetchCategorias, fetchSubcategorias } from '../lib/supabase/queries/taxonomia';
import { emitTaxonomiaChanged, onTaxonomiaChanged } from '../lib/events/taxonomiaBus';
import type { Categoria, Subcategoria } from '../lib/supabase/database.types';

export function useTaxonomia() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);
  const [loading, setLoading] = useState(true);
  const montado = useRef(true);

  // `loading` solo en la primera carga: al recargar se siguen mostrando los datos anteriores.
  const recargar = useCallback(() => {
    return Promise.all([fetchCategorias(), fetchSubcategorias()])
      .then(([c, s]) => {
        if (!montado.current) return;
        setCategorias(c);
        setSubcategorias(s);
      })
      .finally(() => {
        if (montado.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    montado.current = true;
    recargar();
    const quitar = onTaxonomiaChanged(recargar);
    return () => {
      montado.current = false;
      quitar();
    };
  }, [recargar]);

  function subcategoriasDe(categoriaId: number): Subcategoria[] {
    return subcategorias.filter((s) => s.categoria_id === categoriaId);
  }

  async function clasificar(subcategoriaId: number, clase: 'fijo' | 'variable') {
    await actualizarClaseGasto(subcategoriaId, clase);
    emitTaxonomiaChanged();
  }

  return { categorias, subcategorias, subcategoriasDe, loading, clasificar };
}
