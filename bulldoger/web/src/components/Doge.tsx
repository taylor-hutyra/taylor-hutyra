import { Fragment } from "react";

/**
 * Brand styling: underline the "doge" inside Bulldoger / bulldoge / bulldoged.
 * ("Bulldoging" drops the e, so "dog" is underlined there.)
 * Screen readers still read the plain word.
 */
export function Doge({ children }: { children: string }) {
  const parts = children.split(/(doge?)/i);
  if (parts.length === 1) return <>{children}</>;
  return (
    <>
      {parts.map((part, i) =>
        /^doge?$/i.test(part) ? (
          <u key={i} className="doge">
            {part}
          </u>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
