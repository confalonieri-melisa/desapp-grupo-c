import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import PlayerNameSearch from '@/frontend/features/catalog/components/PlayerNameSearch/PlayerNameSearch';

describe('PlayerNameSearch', () => {
  it('renders a named search form with the current query and submit control', () => {
    const html = renderToStaticMarkup(createElement(PlayerNameSearch, {
      initialValue: 'Mbappé', onSearch: () => {},
    }));
    expect(html).toContain('role="search"');
    expect(html).toContain('Buscar jugador por nombre');
    expect(html).toContain('value="Mbappé"');
    expect(html).toContain('Limpiar búsqueda');
    expect(html).toContain('>Buscar</button>');
  });
});
