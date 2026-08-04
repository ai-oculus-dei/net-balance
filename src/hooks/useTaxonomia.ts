import { useEffect, useState } from 'react';
import { fetchCategorias, fetchSubcategorias } from '../lib/supabase/queries/taxonomia';
import type { Categoria, Subcategoria } from '../lib/supabase/database.types';

export function useTaxonomia() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    Promise.all([fetchCategorias(), fetchSubcategorias()])
      .then(([c, s]) => {
        if (cancelado) return;
        setCategorias(c);
        setSubcategorias(s);
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  function subcategoriasDe(categoriaId: number): Subcategoria[] {
    return subcategorias.filter((s) => s.categoria_id === categoriaId);
  }

  return { categorias, subcategorias, subcategoriasDe, loading };
}
