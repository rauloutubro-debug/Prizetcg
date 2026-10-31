import React, { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { Session, Side, zones, zoneNames, LinkKind } from '../battle/types';
import { descendants, rootLocation, visible } from '../battle/engine';
import { Condition, Card } from '../domain/types';
import { colors, common } from '../theme';
import { useWorkspace } from '../workspace/Workspace';
import { Button, Dialog } from './UI';
import { CardArt } from './CardArt';
export function BattleCardActions({
  session,
  id,
  perspective,
  inspect,
  onClose,
  select,
  zoom,
}: {
  session: Session;
  id: string;
  perspective: Side;
  inspect: boolean;
  onClose: () => void;
  select: (id: string) => void;
  zoom: (card: Card) => void;
}) {
  const { dispatch } = useWorkspace();
  const [amount, setAmount] = useState('10');
  const [kind, setKind] = useState<LinkKind | null>(null);
  const instance = session.instances[id]!;
  const mark = session.state.marks[id]!;
  const card = session.definitions[instance.cardId]!;
  const known = visible(session, id, perspective, inspect);
  const control = instance.owner === perspective || session.state.study;
  const location = rootLocation(session.state, id);
  const children = descendants(session.state, id);
  const number = Number(amount);
  const valid = Number.isInteger(number) && number > 0 && number <= 9990;
  function act(action: Parameters<typeof dispatch>[0]) {
    dispatch(action);
  }
  const targets = [
    ...session.state.players[instance.owner].zones.active,
    ...session.state.players[instance.owner].zones.bench,
  ].filter(
    (uid) =>
      uid !== id &&
      session.definitions[session.instances[uid]!.cardId]!.category ===
        'pokemon',
  );
  return (
    <Dialog open title={known ? card.name : 'Carta oculta'} onClose={onClose}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: 16 }}
      >
        <View style={[common.row, { alignItems: 'flex-start' }]}>
          <CardArt
            card={known ? card : undefined}
            hidden={!known}
            width={112}
            onPress={known ? () => zoom(card) : undefined}
          />
          <View style={{ flex: 1, gap: 12 }}>
            <Text style={common.label}>
              LADO {instance.owner === 0 ? 'A' : 'B'} ·{' '}
              {location
                ? zoneNames[location.zone].toUpperCase()
                : 'ANEXO / EVOLUÇÃO'}
            </Text>
            {known && (
              <>
                <Text style={common.body}>
                  {card.set} {card.number}
                </Text>
                <Button variant="secondary" onPress={() => zoom(card)}>
                  Ampliar / imagem
                </Button>
              </>
            )}
            {!known && (
              <Text style={common.body}>
                A identidade permanece oculta até revelar, virar ou mover para
                uma zona visível.
              </Text>
            )}
          </View>
        </View>
        {!control ? (
          <Text style={common.body}>
            Você está controlando o outro lado. Para editar esta carta, troque o
            lado controlado ou ative o estudo dos dois lados.
          </Text>
        ) : (
          <>
            <View style={[common.row, { flexWrap: 'wrap' }]}>
              <Button
                variant="secondary"
                onPress={() =>
                  act({ type: 'battle', action: { type: 'flip', id } })
                }
              >
                {mark.faceUp ? 'Virar para baixo' : 'Virar para cima'}
              </Button>
              <Button
                variant="secondary"
                onPress={() =>
                  act({ type: 'battle', action: { type: 'reveal', id } })
                }
              >
                {mark.revealed
                  ? 'Encerrar revelação'
                  : 'Revelar aos dois lados'}
              </Button>
            </View>
            <Text style={common.label}>
              MOVER CARTA{children.length ? ' E SUA PILHA' : ''}
            </Text>
            <View style={[common.row, { flexWrap: 'wrap', gap: 8 }]}>
              {zones.map((zone) => (
                <Button
                  key={zone}
                  variant="secondary"
                  onPress={() => {
                    act({ type: 'battle', action: { type: 'move', id, zone } });
                    onClose();
                  }}
                >
                  {zoneNames[zone]}
                </Button>
              ))}
            </View>
            <Button
              variant="ghost"
              onPress={() => {
                act({
                  type: 'battle',
                  action: { type: 'move', id, zone: 'deck', position: 'top' },
                });
                onClose();
              }}
            >
              Mover para o topo do baralho
            </Button>
            <Text style={[common.body, { fontSize: 11 }]}>
              A mão do outro lado só mostra esta carta com a opção de revelação
              explícita. Baralho recebe no fundo por padrão. Entre Ativo e
              Banco, a pilha é mantida. Para outras zonas, o conjunto é separado
              em cartas e seus marcadores são limpos. Estádio é um espaço
              compartilhado: descarte o anterior manualmente.
            </Text>
            {known && (
              <>
                <Text style={common.label}>ANEXAR / EMPILHAR MANUALMENTE</Text>
                <View style={[common.row, { flexWrap: 'wrap' }]}>
                  {(
                    [
                      { kind: 'energy', text: 'Como Energia' },
                      { kind: 'tool', text: 'Como Ferramenta' },
                      { kind: 'evolution', text: 'Como evolução' },
                    ] as const
                  )
                    .filter((option) =>
                      option.kind === 'energy'
                        ? card.category === 'energy'
                        : option.kind === 'tool'
                          ? card.category === 'trainer'
                          : card.category === 'pokemon',
                    )
                    .map((option) => (
                      <Button
                        key={option.kind}
                        variant="secondary"
                        onPress={() =>
                          setKind(kind === option.kind ? null : option.kind)
                        }
                      >
                        {option.text}
                      </Button>
                    ))}
                </View>
                {kind && (
                  <View style={{ gap: 8 }}>
                    <Text style={common.body}>
                      Selecione o Pokémon que receberá a carta. Confira
                      manualmente o tipo de Treinador, a cadeia de evolução e as
                      restrições do turno.
                    </Text>
                    {targets.map((parent) => (
                      <Button
                        key={parent}
                        variant="secondary"
                        onPress={() => {
                          act({
                            type: 'battle',
                            action: { type: 'attach', id, parent, kind },
                          });
                          onClose();
                        }}
                      >
                        {
                          session.definitions[
                            session.instances[parent]!.cardId
                          ]!.name
                        }
                      </Button>
                    ))}
                    {!targets.length && (
                      <Text style={common.body}>
                        Coloque um Pokémon do mesmo lado no Ativo ou Banco
                        primeiro.
                      </Text>
                    )}
                  </View>
                )}
              </>
            )}
            {known && card.category === 'pokemon' && (
              <>
                <Text style={common.label}>DANO · {mark.damage}</Text>
                <View style={[common.row, { flexWrap: 'wrap' }]}>
                  {[10, 50, 100].map((delta) => (
                    <Button
                      key={delta}
                      variant="secondary"
                      onPress={() =>
                        act({
                          type: 'battle',
                          action: { type: 'damage', id, delta },
                        })
                      }
                    >{`+${delta}`}</Button>
                  ))}
                </View>
                <View style={common.row}>
                  <TextInput
                    accessibilityLabel="Dano personalizado"
                    keyboardType="number-pad"
                    value={amount}
                    onChangeText={setAmount}
                    maxLength={4}
                    style={[common.input, { flex: 1 }]}
                  />
                  <Button
                    disabled={!valid}
                    variant="secondary"
                    onPress={() =>
                      act({
                        type: 'battle',
                        action: { type: 'damage', id, delta: -number },
                      })
                    }
                  >
                    Remover
                  </Button>
                  <Button
                    disabled={!valid}
                    variant="secondary"
                    onPress={() =>
                      act({
                        type: 'battle',
                        action: { type: 'damage', id, delta: number },
                      })
                    }
                  >
                    Somar
                  </Button>
                </View>
                <Text style={common.label}>CONDIÇÕES</Text>
                <View style={[common.row, { flexWrap: 'wrap' }]}>
                  {(
                    [
                      'Envenenado',
                      'Queimado',
                      'Adormecido',
                      'Paralisado',
                      'Confuso',
                    ] as Condition[]
                  ).map((condition) => (
                    <Button
                      key={condition}
                      checked={mark.conditions.includes(condition)}
                      accessibilityLabel={`${condition}: ${mark.conditions.includes(condition) ? 'ativa' : 'inativa'}`}
                      variant="secondary"
                      onPress={() =>
                        act({
                          type: 'battle',
                          action: { type: 'condition', id, condition },
                        })
                      }
                    >{`${mark.conditions.includes(condition) ? '●' : '○'} ${condition}`}</Button>
                  ))}
                </View>
                <Button
                  variant="secondary"
                  onPress={() =>
                    act({ type: 'battle', action: { type: 'ability', id } })
                  }
                >
                  {mark.ability
                    ? 'Habilidade usada · desfazer'
                    : 'Marcar Habilidade usada'}
                </Button>
              </>
            )}
          </>
        )}
        {!!children.length && (
          <>
            <Text style={common.label}>
              ANEXOS E EVOLUÇÕES · {children.length}
            </Text>
            <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
              {children.map((child) => {
                const childKnown = visible(
                  session,
                  child,
                  perspective,
                  inspect,
                );
                return (
                  <View key={child} style={{ gap: 6, alignItems: 'center' }}>
                    <CardArt
                      hidden={!childKnown}
                      card={
                        childKnown
                          ? session.definitions[
                              session.instances[child]!.cardId
                            ]
                          : undefined
                      }
                      width={65}
                      onPress={() => select(child)}
                    />
                    <Text style={{ color: colors.muted, fontSize: 10 }}>
                      {session.state.links[child]!.kind === 'energy'
                        ? 'Energia'
                        : session.state.links[child]!.kind === 'tool'
                          ? 'Ferramenta'
                          : 'Evolução'}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
            <Text style={[common.body, { fontSize: 12 }]}>
              Toque em uma carta da pilha para movê-la individualmente.
            </Text>
          </>
        )}
      </ScrollView>
    </Dialog>
  );
}
