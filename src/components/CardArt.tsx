import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Layers3, ScanLine } from 'lucide-react-native';
import { Card } from '../domain/types';
import { useWorkspace } from '../workspace/Workspace';
import { localImageURI } from '../catalog/cache';
import { colors } from '../theme';
export function CardArt({
  card,
  hidden = false,
  width = 88,
  onPress,
  testID,
}: {
  card?: Card;
  hidden?: boolean;
  width?: number;
  onPress?: () => void;
  testID?: string;
}) {
  const { data } = useWorkspace();
  const asset = card ? data.assets[card.id] : undefined;
  const [uri, setUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    setUri(null);
    setFailed(false);
    if (hidden || !asset) {
      setLoading(false);
      return;
    }
    setLoading(true);
    localImageURI(asset)
      .then((value) => {
        if (active) setUri(value);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [asset?.uri, hidden]);
  const content = hidden ? (
    <View style={s.back}>
      <View style={s.backRing}>
        <Layers3 size={Math.max(20, width / 4)} color="#A3D9D2" />
      </View>
      <Text
        style={{
          color: '#8EB8B2',
          fontSize: Math.max(8, width / 10),
          fontWeight: '800',
          letterSpacing: 1,
        }}
      >
        PTCGMAP
      </Text>
    </View>
  ) : uri && !failed ? (
    <Image
      accessibilityIgnoresInvertColors
      source={{ uri }}
      resizeMode="contain"
      onError={() => setFailed(true)}
      style={{ width: '100%', height: '100%' }}
    />
  ) : (
    <View style={s.missing}>
      {loading ? (
        <ActivityIndicator color={colors.green} />
      ) : (
        <ScanLine color={colors.muted} size={width > 90 ? 27 : 17} />
      )}
      <Text
        numberOfLines={width < 100 ? 3 : 6}
        style={{
          color: colors.text,
          fontSize: Math.max(9, width / 14),
          textAlign: 'center',
          marginTop: 7,
          fontWeight: '600',
        }}
      >
        {card?.name ?? 'Carta'}
      </Text>
      <Text
        style={{
          color: colors.muted,
          fontSize: Math.max(8, width / 18),
          textAlign: 'center',
          marginTop: 4,
        }}
      >
        {card?.set} {card?.number}
      </Text>
      {width > 130 && (
        <Text
          style={{
            color: colors.muted,
            fontSize: 10,
            textAlign: 'center',
            marginTop: 12,
          }}
        >
          {failed
            ? 'Arquivo indisponível · preparar novamente'
            : 'Imagem não preparada · baixar ou importar'}
        </Text>
      )}
    </View>
  );
  return (
    <Pressable
      testID={testID}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'image'}
      accessibilityLabel={
        hidden
          ? 'Carta oculta'
          : `${card?.name ?? 'Carta'}, ${card?.set ?? 'sem coleção'} ${card?.number ?? ''}, ampliar`
      }
      onPress={onPress}
      style={({ pressed }) => [
        s.card,
        { width, aspectRatio: 63 / 88, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      {content}
    </Pressable>
  );
}
const s = StyleSheet.create({
  card: {
    borderRadius: 7,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#3C4854',
    backgroundColor: '#141D25',
    minHeight: 44,
  },
  back: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#16343B',
    borderWidth: 4,
    borderColor: '#274B50',
    borderRadius: 7,
  },
  backRing: {
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#496B69',
    padding: 10,
    transform: [{ rotate: '-15deg' }],
  },
  missing: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
    backgroundColor: '#1C2631',
  },
});
