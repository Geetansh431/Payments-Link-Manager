import { useEffect, useState } from 'react';
import { copyText } from './copyText.ts';

type CopyButtonProps = {
  /** The text to copy, e.g. a payment URL. */
  text: string;
  /** What is being copied, read out by screen readers, e.g. "Website design". */
  itemName: string;
};

type CopyResult = 'idle' | 'copied' | 'failed';

/** How long "Copied" stays on the button, in milliseconds. */
const RESET_AFTER_MS = 2000;

/**
 * A "Copy link" button. It shows "Copied" (or "Couldn't copy") for two seconds and
 * announces the result to screen readers.
 */
export function CopyButton({ text, itemName }: CopyButtonProps) {
  const [result, setResult] = useState<CopyResult>('idle');

  useEffect(() => {
    if (result === 'idle') return;
    const timer = setTimeout(() => setResult('idle'), RESET_AFTER_MS);
    return () => clearTimeout(timer);
  }, [result]);

  /** Copies the text and shows whether it worked. */
  async function handleClick() {
    setResult((await copyText(text)) ? 'copied' : 'failed');
  }

  const labels: Record<CopyResult, string> = {
    idle: 'Copy link',
    copied: 'Copied',
    failed: "Couldn't copy",
  };

  return (
    <>
      <button
        type="button"
        className="button button--secondary"
        aria-label={`${labels[result]}: ${itemName}`}
        onClick={handleClick}
      >
        {labels[result]}
      </button>
      <span role="status" className="visually-hidden">
        {result === 'copied' ? `Link copied for ${itemName}` : ''}
        {result === 'failed' ? `Couldn't copy the link for ${itemName}` : ''}
      </span>
    </>
  );
}
