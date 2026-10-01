// Thin wrapper over next/image used for every content image on the site.
// - Local /assets/*.webp: real intrinsic size from app/data/image-dims.json
//   (regenerate with `node scripts/gen-image-dims.mjs`) so next/image emits a
//   correct srcset (AVIF/WebP, sized for the slot) instead of the full file.
// - WooCommerce media (allow-listed in next.config images.remotePatterns): size
//   unknown, so a square hint is used; the existing CSS (width/height/object-fit)
//   still decides the rendered box, exactly as with the previous <img>.
// - Anything else (unknown host) is passed through unoptimized rather than
//   crashing next/image.
import Image from 'next/image';
import DIMS from '../data/image-dims.json';

const FALLBACK = { w: 1200, h: 1200 };
const OPTIMIZABLE_REMOTE = /^https:\/\/([a-z0-9-]+\.)*(calligraphyjoud\.com|hostingersite\.com)\/wp-content\//i;

export function Img({ src, alt = '', sizes = '100vw', priority = false, ...rest }) {
  if (!src) return null;
  const d = DIMS[src] || FALLBACK;
  const remote = /^https?:\/\//i.test(src);
  return (
    <Image
      src={src}
      alt={alt}
      width={d.w}
      height={d.h}
      sizes={sizes}
      priority={priority}
      placeholder={d.b ? 'blur' : 'empty'}
      blurDataURL={d.b}
      unoptimized={remote && !OPTIMIZABLE_REMOTE.test(src)}
      {...rest}
    />
  );
}
