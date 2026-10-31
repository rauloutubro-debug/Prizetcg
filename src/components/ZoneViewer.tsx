import React, { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { Session, Side, Zone, zoneNames } from '../battle/types';
import { visible } from '../battle/engine';
import { Dialog, Button } from './UI';
import { useWorkspace } from '../workspace/Workspace';
import { CardArt } from './CardArt';
import { colors, common } from '../theme';
export function ZoneViewer({
  session,
  side,
  zone,
  perspective,
  onClose,
  select,
}: {
  session: Session;
  side: Side;
  zone: Zone;
  perspective: Side;
  onClose: () => void;
  select: (id: string, inspect: boolean) => void;
}) {
  const [search, setSearch] = useState('');
  const { error, dispatch } = useWorkspace();
  const inspect = zone === 'deck' && side === perspective;
  const privateZone =
    ['hand', 'deck', 'prizes'].includes(zone) &&
    side !== perspective &&
    !session.state.study;
  const list = session.state.players[side].zones[zone];
  const filtered = list.filter(
    (id) =>
      !visible(session, id, perspective, inspect) ||
      session.definitions[
        session.instances[id]!.cardId
      ]!.name.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <Dialog
      open
      title={`${zoneNames[zone]} · lado ${side === 0 ? 'A' : 'B'} · ${list.length}`}
      onClose={onClose}
    >
      {error && (
        <View
          style={{
            padding: 12,
            marginBottom: 12,
            borderColor: colors.red,
            borderWidth: 1,
            borderRadius: 10,
          }}
        >
          <Text
            accessibilityRole="alert"
            style={{ color: colors.red, lineHeight: 20 }}
          >
            {error}
          </Text>
          <Button
            variant="ghost"
            onPress={() => dispatch({ type: 'error', error: null })}
          >
            Entendi
          </Button>
        </View>
      )}
      {privateZone ? (
        <Text style={common.body}>
          Zona oculta. Troque o lado controlado para entregar o aparelho ao
          outro jogador ou ative explicitamente o modo de estudo.
        </Text>
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: 16 }}
        >
          {(inspect || zone !== 'prizes' || session.state.study) && (
            <TextInput
              accessibilityLabel="Buscar carta nesta zona"
              placeholder={
                zone === 'deck'
                  ? 'Buscar no baralho · busca manual'
                  : 'Filtrar cartas visíveis'
              }
              placeholderTextColor={colors.muted}
              value={search}
              onChangeText={setSearch}
              style={common.input}
            />
          )}
          {zone === 'deck' && (
            <Text style={[common.body, { fontSize: 12 }]}>
              A busca mostra a ordem atual do seu baralho. Mover uma carta não
              embaralha automaticamente: use “Embaralhar” após resolver a busca.
            </Text>
          )}
          <View
            style={[
              common.row,
              { flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
            ]}
          >
            {filtered.map((id, i) => {
              const known = visible(session, id, perspective, inspect);
              const card = session.definitions[session.instances[id]!.cardId]!;
              return (
                <View key={id} style={{ gap: 6, alignItems: 'center' }}>
                  <CardArt
                    card={known ? card : undefined}
                    hidden={!known}
                    width={88}
                    onPress={() => select(id, inspect)}
                  />
                  <Text style={{ color: colors.muted, fontSize: 10 }}>
                    Posição {list.indexOf(id) + 1}
                  </Text>
                </View>
              );
            })}
          </View>
          {!filtered.length && (
            <Text style={common.body}>
              {list.length
                ? 'Nenhuma carta visível corresponde à busca.'
                : 'Esta zona está vazia.'}
            </Text>
          )}
        </ScrollView>
      )}
    </Dialog>
  );
}
