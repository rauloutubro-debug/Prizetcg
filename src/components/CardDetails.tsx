import React, { useState } from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Card } from '../domain/types';
import { Dialog, Button } from './UI';
import { CardArt } from './CardArt';
import { useWorkspace } from '../workspace/Workspace';
import { cacheImage } from '../catalog/cache';
import { downloadCardImage } from '../catalog/tcgdex';
import { common, colors } from '../theme';
export function CardDetails({
  card,
  onClose,
}: {
  card: Card | null;
  onClose: () => void;
}) {
  const { data, dispatch } = useWorkspace();
  const { width } = useWindowDimensions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [override, setOverride] = useState('');
  async function download() {
    if (!card) return;
    setBusy(true);
    setError('');
    try {
      const asset = await downloadCardImage(card, override);
      dispatch({ type: 'asset', id: card.id, asset });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download falhou.');
    } finally {
      setBusy(false);
    }
  }
  async function pick() {
    if (!card) return;
    setError('');
    setBusy(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0]!;
      if (file.size && file.size > 15 * 1024 * 1024)
        throw Error('Escolha uma imagem de até 15 MB.');
      const asset = await cacheImage(file.uri, 'user', {}, file.mimeType);
      dispatch({ type: 'asset', id: card.id, asset });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível importar.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={!!card} title={card?.name ?? 'Carta'} onClose={onClose}>
      <ScrollView contentContainerStyle={{ gap: 16, alignItems: 'center' }}>
        {card && (
          <>
            <CardArt
              card={card}
              width={Math.max(160, Math.min(260, width - 112))}
            />
            <Text style={common.body}>
              {card.set ?? 'Sem coleção'} · {card.number ?? 'Sem número'} ·{' '}
              {card.category}
            </Text>
            <Text style={[common.body, { fontSize: 12 }]}>
              {data.assets[card.id]
                ? `Imagem local · ${data.assets[card.id]!.source === 'user' ? 'Importada pelo usuário' : `TCGdex ${data.assets[card.id]!.apiId ?? ''} / arte dos titulares Pokémon`}`
                : 'Baixe a imagem agora para usá-la offline, ou importe um arquivo que você pode utilizar.'}
            </Text>
            <TextInput
              accessibilityLabel="ID TCGdex opcional"
              placeholder="ID TCGdex opcional, ex.: sv06-128"
              placeholderTextColor={colors.muted}
              value={override}
              onChangeText={setOverride}
              autoCapitalize="none"
              style={[common.input, { alignSelf: 'stretch' }]}
            />
            <Button disabled={busy || data.settings.offline} onPress={download}>
              {busy ? 'Preparando imagem…' : 'Baixar imagem · requer internet'}
            </Button>
            <Button disabled={busy} variant="secondary" onPress={pick}>
              Importar imagem do aparelho
            </Button>
            {data.settings.offline && (
              <Text style={common.body}>
                Modo offline ativo. Importação de arquivos locais permanece
                disponível.
              </Text>
            )}
            {!!error && (
              <Text
                accessibilityRole="alert"
                style={{ color: colors.red, lineHeight: 20 }}
              >
                {error}
              </Text>
            )}
          </>
        )}
      </ScrollView>
    </Dialog>
  );
}
