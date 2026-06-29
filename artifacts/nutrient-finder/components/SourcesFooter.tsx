import * as Linking from "expo-linking";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export interface SourceLink {
  label: string;
  url: string;
}

interface Props {
  sources: SourceLink[];
}

export default function SourcesFooter({ sources }: Props) {
  const colors = useColors();
  const styles = makeStyles(colors);

  if (!sources.length) return null;

  return (
    <View style={styles.row}>
      <Text style={styles.label}>Source: </Text>
      <View style={styles.links}>
        {sources.map((s, i) => (
          <React.Fragment key={s.url}>
            <Pressable onPress={() => Linking.openURL(s.url)}>
              <Text style={styles.link}>{s.label}</Text>
            </Pressable>
            {i < sources.length - 1 && (
              <Text style={styles.sep}> · </Text>
            )}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      paddingTop: 6,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: 2,
    },
    label: {
      fontSize: 11,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    links: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      flex: 1,
    },
    link: {
      fontSize: 11,
      color: colors.primary,
      fontFamily: "Inter_400Regular",
      textDecorationLine: "underline",
    },
    sep: {
      fontSize: 11,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
  });
}
