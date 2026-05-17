import * as React from "react";

interface SlotProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactElement;
}

export const Slot = React.forwardRef<HTMLElement, SlotProps>(({ children, ...props }, ref) =>
  React.cloneElement(children, {
    ...props,
    ref,
    className: [props.className, children.props.className].filter(Boolean).join(" "),
  }),
);
Slot.displayName = "Slot";
