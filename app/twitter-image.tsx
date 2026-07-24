import {
  OG_ALT,
  OG_CONTENT_TYPE,
  OG_SIZE,
  renderBrandCard,
} from "@/lib/brand/ogCard";

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function TwitterImage() {
  return renderBrandCard();
}
