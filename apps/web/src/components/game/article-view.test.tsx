import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ArticleView } from './article-view';

const HTML =
  '<p>' +
  '<a href="#wiki/en/Physics" data-wiki-slug="Physics" data-wiki-lang="en">physics</a> ' +
  '<a data-wiki-skip="namespace">file</a> ' +
  '<a data-external-href="https://example.com">external</a> ' +
  '<a href="#Notes">notes</a>' +
  '</p>';

function renderArticle(onNavigate: (slug: string) => void): void {
  render(
    <ArticleView
      title="Albert Einstein"
      html={HTML}
      lang="en"
      busy={false}
      onNavigate={onNavigate}
    />,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ArticleView', () => {
  it('reports the slug of an internal article link instead of navigating', () => {
    const onNavigate = vi.fn();
    renderArticle(onNavigate);

    const link = screen.getByText('physics');
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(event);

    expect(onNavigate).toHaveBeenCalledExactlyOnceWith('Physics');
    expect(event.defaultPrevented).toBe(true);
  });

  it('intercepts middle-click so a new tab cannot bypass the race', () => {
    const onNavigate = vi.fn();
    renderArticle(onNavigate);

    const event = new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 });
    screen.getByText('physics').dispatchEvent(event);

    expect(onNavigate).toHaveBeenCalledExactlyOnceWith('Physics');
    expect(event.defaultPrevented).toBe(true);
  });

  it('swallows clicks on links the game cannot follow', () => {
    const onNavigate = vi.fn();
    renderArticle(onNavigate);

    for (const label of ['file', 'external', 'notes']) {
      const event = new MouseEvent('click', { bubbles: true, cancelable: true });
      screen.getByText(label).dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    }

    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('keeps working when the callback identity changes between renders', () => {
    const first = vi.fn();
    const { rerender } = render(
      <ArticleView title="A" html={HTML} lang="en" busy={false} onNavigate={first} />,
    );

    const second = vi.fn();
    rerender(<ArticleView title="A" html={HTML} lang="en" busy={false} onNavigate={second} />);
    fireEvent.click(screen.getByText('physics'));

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledExactlyOnceWith('Physics');
  });

  it('marks the article busy while the next one is loading', () => {
    render(<ArticleView title="A" html={HTML} lang="en" busy onNavigate={vi.fn()} />);
    expect(screen.getByRole('article')).toHaveAttribute('aria-busy', 'true');
  });
});
