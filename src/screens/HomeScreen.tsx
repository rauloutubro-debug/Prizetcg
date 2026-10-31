import React from 'react';
import { Text, View } from 'react-native';
import {
  ArrowUpRight,
  Layers3,
  Swords,
  ShieldCheck,
  WifiOff,
  Target,
} from 'lucide-react-native';
import { colors, common } from '../theme';
import { Button, Badge } from '../components/UI';
import { CardArt } from '../components/CardArt';
import { useWorkspace } from '../workspace/Workspace';
import { Route } from '../navigation';
export function HomeScreen({ navigate }: { navigate: (r: Route) => void }) {
  const { data } = useWorkspace();
  const deck = data.decks[0];
  return (
    <View style={{ gap: 24 }}>
      <View
        style={[
          common.row,
          { justifyContent: 'space-between', flexWrap: 'wrap' },
        ]}
      >
        <Text style={common.label}>SEU ESPAÇO DE TREINO</Text>
        <Badge>
          {data.settings.offline ? 'MODO OFFLINE' : 'LOCAL · SEM CONTA'}
        </Badge>
      </View>
      <View
        style={[
          common.panel,
          {
            backgroundColor: '#18343A',
            borderColor: '#33585C',
            padding: 26,
            gap: 20,
          },
        ]}
      >
        <View
          style={[
            common.row,
            { gap: 24, flexWrap: 'wrap', alignItems: 'center' },
          ]}
        >
          <View style={{ flex: 1, minWidth: 210, gap: 18 }}>
            <Text
              accessibilityRole="header"
              style={[common.title, { fontSize: 37, lineHeight: 43 }]}
            >
              Conheça o deck.{'\n'}Encontre sua linha.
            </Text>
            <Text style={[common.body, { color: '#BCD2D6', maxWidth: 440 }]}>
              Teste mãos, explore sequências e estude os dois lados de uma
              partida. No seu ritmo, no seu aparelho.
            </Text>
            <View style={[common.row, { flexWrap: 'wrap' }]}>
              <Button
                icon={<Swords size={18} color={colors.bg} />}
                onPress={() => navigate('train')}
              >
                {data.session ? 'Retomar treino' : 'Abrir mesa de treino'}
              </Button>
              <Button variant="secondary" onPress={() => navigate('decks')}>
                Meus decks
              </Button>
            </View>
          </View>
          {deck && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingVertical: 10,
              }}
            >
              {deck.cards.slice(0, 2).map((c, i) => (
                <View
                  key={c.id}
                  style={{
                    transform: [{ rotate: i ? '7deg' : '-7deg' }],
                    marginTop: i ? 15 : 0,
                  }}
                >
                  <CardArt
                    card={c}
                    width={108}
                    onPress={() => navigate('decks')}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
      <View style={[common.row, { alignItems: 'stretch', flexWrap: 'wrap' }]}>
        {[
          {
            title: 'Biblioteca',
            value: `${data.decks.length} deck${data.decks.length === 1 ? '' : 's'}`,
            detail: 'Listas e impressões preservadas',
            Icon: Layers3,
          },
          {
            title: 'Imagens locais',
            value: String(Object.keys(data.assets).length),
            detail: 'Prepare as imagens antes de ficar offline',
            Icon: WifiOff,
          },
          {
            title: 'Treino atual',
            value: data.session
              ? `Turno ${data.session.state.turn}`
              : 'Mesa livre',
            detail: data.session
              ? `${data.session.mode === 'solo' ? 'Solo' : 'Dois lados'} · ${data.session.history.length} ações no histórico`
              : 'Solo ou dois lados no mesmo dispositivo',
            Icon: Swords,
          },
        ].map((item) => (
          <View
            key={item.title}
            style={[common.panel, { flexGrow: 1, flexBasis: 210, gap: 12 }]}
          >
            <item.Icon size={21} color={colors.green} />
            <Text style={common.body}>{item.title}</Text>
            <Text
              style={{ color: colors.text, fontSize: 25, fontWeight: '700' }}
            >
              {item.value}
            </Text>
            <Text style={[common.body, { fontSize: 12 }]}>{item.detail}</Text>
          </View>
        ))}
      </View>
      <Text style={[common.title, { fontSize: 21 }]}>Também na sua mesa</Text>
      <View style={[common.panel, { gap: 16 }]}>
        <View style={common.row}>
          <Target color={colors.orange} size={21} />
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
            Rastreador de Prêmios e utilitários
          </Text>
        </View>
        <Text style={common.body}>
          As ferramentas anteriores e seus dados foram mantidos. A mesa de
          treino usa uma sessão própria, sem substituir seus marcadores de
          torneio.
        </Text>
        <View style={[common.row, { flexWrap: 'wrap' }]}>
          <Button variant="secondary" onPress={() => navigate('tracker')}>
            Rastrear Prêmios
          </Button>
          <Button variant="secondary" onPress={() => navigate('tools')}>
            Dano, condições e moeda
          </Button>
        </View>
      </View>
      <View style={[common.row, { alignItems: 'flex-start' }]}>
        <ShieldCheck color={colors.muted} size={18} />
        <Text style={[common.body, { flex: 1, fontSize: 12 }]}>
          Mesa manual de estudo. O app organiza cartas e marcadores; você
          resolve os efeitos e aplica as regras. Não há adversário automático,
          matchmaking ou validação completa de regras.
        </Text>
      </View>
    </View>
  );
}
