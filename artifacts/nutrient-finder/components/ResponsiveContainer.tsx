import React from "react";
import { StyleSheet, View, ViewStyle, useWindowDimensions } from "react-native";

// Max content width applied on large screens (iPad, iPad landscape) so single-column
// content doesn't stretch edge-to-edge. Below this, content fills the screen as before.
const MAX_CONTENT_WIDTH = 700;

interface Props {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
}

/**
 * Wraps content so it never exceeds MAX_CONTENT_WIDTH and stays centered on
 * wide screens (iPad portrait/landscape), while remaining full-width on phones.
 * Purely a width/centering compatibility shim — no layout redesign.
 */
export default function ResponsiveContainer({ children, style }: Props) {
  const { width } = useWindowDimensions();
  const isWide = width > MAX_CONTENT_WIDTH;

  return (
    <View style={[styles.outer, isWide && styles.outerWide]}>
      <View style={[styles.inner, isWide && styles.innerWide, style]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { width: "100%" },
  outerWide: { alignItems: "center" },
  inner: { width: "100%" },
  innerWide: { maxWidth: MAX_CONTENT_WIDTH },
});
