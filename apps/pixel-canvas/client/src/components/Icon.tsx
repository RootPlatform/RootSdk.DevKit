import React from "react";
import iconsData from "../generated/icons.json";

// ============================================================================
// Icon — name-based lookup into the DevKit icon library (144 icons, 12
// categories). The icons.json snapshot under src/generated/ is the same
// set the rest of DevKit ships; copy it into client/src/generated/ when
// porting this component to a new app.
//
// The SDK icon set uses fill="currentColor" so icons inherit text color.
//
// Accessibility: icons are DECORATIVE by default (aria-hidden). This is the
// right default for icons alongside a text label — otherwise screen readers
// announce the icon's internal name ("AddUser") plus the meaningful label
// ("Add"), creating redundant noise. Callers that use the icon as the ONLY
// indicator (no accompanying text) should pass `title` to make it informative:
//
//   <Icon name="AddUser" />              // decorative; aria-hidden
//   <Icon name="AddUser" title="Add" />  // informative; role=img, aria-label="Add"
// ============================================================================

interface IconEntry {
  name: string;
  category: string;
  description: string;
  svg: string;
  viewBox: string;
}

const svgByName: Record<string, IconEntry> = Object.fromEntries(
  (iconsData.icons as IconEntry[]).map((i) => [i.name, i]),
);

export type IconName = keyof typeof svgByName;

interface Props {
  name: string;
  size?: number;
  color?: string;
  className?: string;
  // Provide a title to make the icon informative (role=img, aria-label=title).
  // Omit for decorative icons — the default — which are hidden from AT.
  title?: string;
}

export const Icon: React.FC<Props> = ({ name, size = 16, color, className, title }) => {
  const entry = svgByName[name];
  if (!entry) {
    if (import.meta.env.DEV) {
      console.warn(`[Icon] Unknown icon: "${name}"`);
    }
    return null;
  }

  // Extract inner SVG content so we can control the outer <svg> attributes.
  const innerMatch = entry.svg.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
  const innerContent = innerMatch ? innerMatch[1] : "";

  const isInformative = title !== undefined;

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        color,
        flexShrink: 0,
      }}
      aria-hidden={isInformative ? undefined : true}
      aria-label={isInformative ? title : undefined}
      role={isInformative ? "img" : undefined}
    >
      <svg
        width={size}
        height={size}
        viewBox={entry.viewBox}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        dangerouslySetInnerHTML={{ __html: innerContent }}
      />
    </span>
  );
};
