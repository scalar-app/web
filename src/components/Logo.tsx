import Image from 'next/image';

/**
 * The Scalar mark next to the wordmark. Sizes are in pixels for the mark.
 *
 * Without the wordmark the mark has to carry the name itself, so it stops being decorative and
 * takes alternative text.
 */
export function Logo({ size = 18, wordmark = true }: { size?: number; wordmark?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <Image
        src="/scalar-mark.png"
        alt={wordmark ? '' : 'Scalar'}
        width={size}
        height={size}
        priority
      />
      {wordmark ? <span className="text-sm font-semibold tracking-tight">Scalar</span> : null}
    </span>
  );
}
