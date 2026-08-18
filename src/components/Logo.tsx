import Image from 'next/image';

/** The Scalar mark next to the wordmark. Sizes are in pixels for the mark. */
export function Logo({ size = 18 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2">
      <Image src="/scalar-mark.png" alt="" width={size} height={size} priority />
      <span className="text-sm font-semibold tracking-tight">Scalar</span>
    </span>
  );
}
