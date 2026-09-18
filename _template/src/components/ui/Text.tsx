import React from 'react';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/theme';
import type { typography } from '@/theme/tokens';

type Variant = keyof typeof typography;
type Tone = 'default' | 'muted' | 'faint' | 'accent' | 'danger' | 'inverse';

export interface TextProps extends RNTextProps {
  variant?: Variant;
  tone?: Tone;
  /** Overrides `tone` when a habit's own accent should be used. */
  color?: string;
  align?: TextStyle['textAlign'];
}

/**
 * The only text component in the app. Going through one component is what keeps
 * the type scale honest — no ad-hoc `fontSize: 15` appears anywhere else.
 */
export function Text({
  variant = 'body',
  tone = 'default',
  color,
  align,
  style,
  ...rest
}: TextProps) {
  const { colors, typography: scale } = useTheme();

  // Tablet scaling happens exactly once, in ThemeProvider's `scaleTypography`.
  //
  // This component used to apply its own separate ×1.25 on top of whatever
  // `theme.typography` already was -- fine the day it was written, when
  // ThemeProvider handed out the flat phone scale unconditionally. The next
  // day's commit taught ThemeProvider to scale typography itself (×1.15, tuned
  // together with the ×1.25 space scale so type doesn't grow as fast as its
  // gutters), and nothing here noticed the two now compound: a 16/24 body
  // became 18/27 in the theme, then 23/34 here -- ×1.4375 overall, not the
  // ×1.15 either commit intended. `theme.typography` has no other consumer, so
  // there is nothing this component needs to reconcile with; it can simply
  // trust the value it is handed.
  const sized = scale[variant] as TextStyle;

  const toneColor: Record<Tone, string> = {
    default: colors.text,
    muted: colors.textMuted,
    faint: colors.textFaint,
    accent: colors.accent,
    danger: colors.danger,
    inverse: colors.onInverse,
  };

  return (
    <RNText
      style={[
        sized,
        { color: color ?? toneColor[tone] },
        align ? { textAlign: align } : null,
        style,
      ]}
      // Respect the user's text-size setting, but stop runaway scaling from
      // breaking the grid layout.
      maxFontSizeMultiplier={1.6}
      {...rest}
    />
  );
}
