import type { LinkStatus } from '../domain/types.ts';

type StatusBadgeProps = {
  status: LinkStatus;
};

/** Shows a link's status as a coloured label. The status word is always shown, not just the colour. */
export function StatusBadge({ status }: StatusBadgeProps) {
  return <span className={`badge badge--${status.toLowerCase().replace(' ', '-')}`}>{status}</span>;
}
