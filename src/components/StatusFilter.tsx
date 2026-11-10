import { STATUS_FILTERS } from '../domain/types.ts';
import type { StatusFilter as Filter } from '../domain/types.ts';

type StatusFilterProps = {
  /** The selected filter. */
  value: Filter;
  /** How many links each filter would show. */
  counts: Record<Filter, number>;
  onChange: (filter: Filter) => void;
};

/**
 * Filter buttons (All / Active / Paid / Expired) with a count on each. The selected
 * one is marked with `aria-pressed`, so screen readers announce it as "pressed".
 */
export function StatusFilter({ value, counts, onChange }: StatusFilterProps) {
  return (
    <div role="group" aria-label="Filter by status" className="filter">
      {STATUS_FILTERS.map((filter) => (
        <button
          key={filter}
          type="button"
          className="filter__button"
          aria-pressed={filter === value}
          onClick={() => onChange(filter)}
        >
          {filter} <span className="filter__count">({counts[filter]})</span>
        </button>
      ))}
    </div>
  );
}
