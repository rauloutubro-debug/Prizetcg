import React, {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { colors, common } from '../theme';

type Content = {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
};
type Entry = Content & { order: number };
type Manager = {
  put: (id: string, content: Content) => void;
  remove: (id: string) => void;
};
const Context = createContext<Manager | null>(null);

/** One UIKit presentation, even for logical dialogs opened from another dialog. */
export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState(new Map<string, Entry>());
  const sequence = useRef(0);
  const manager = useMemo<Manager>(
    () => ({
      put(id, content) {
        setEntries((previous) => {
          const current = previous.get(id);
          if (
            current &&
            current.children === content.children &&
            current.title === content.title &&
            current.onClose === content.onClose
          )
            return previous;
          const next = new Map(previous);
          next.set(id, {
            ...content,
            order: current?.order ?? ++sequence.current,
          });
          return next;
        });
      },
      remove(id) {
        setEntries((previous) => {
          if (!previous.has(id)) return previous;
          const next = new Map(previous);
          next.delete(id);
          return next;
        });
      },
    }),
    [],
  );
  const ordered = [...entries.entries()].sort(
    (a, b) => a[1].order - b[1].order,
  );
  const active = ordered.at(-1);
  return (
    <Context.Provider value={manager}>
      {children}
      <Modal
        visible={!!active}
        transparent
        animationType="fade"
        onRequestClose={() => active?.[1].onClose()}
      >
        <SafeAreaView
          style={{ flex: 1 }}
          edges={['top', 'bottom', 'left', 'right']}
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={s.backdrop}>
              {ordered.map(([id, entry]) => {
                const top = id === active?.[0];
                // Keep nested dialog owners mounted, while hiding inactive panels from
                // touch and accessibility. This is a logical stack inside one Modal.
                return (
                  <View
                    key={id}
                    role="dialog"
                    aria-label={entry.title}
                    aria-modal={top}
                    aria-hidden={!top}
                    accessibilityViewIsModal={top}
                    accessibilityElementsHidden={!top}
                    importantForAccessibility={
                      top ? 'yes' : 'no-hide-descendants'
                    }
                    pointerEvents={top ? 'auto' : 'none'}
                    style={[s.panel, !top && { display: 'none' }]}
                  >
                    <View
                      style={[
                        common.row,
                        { justifyContent: 'space-between', marginBottom: 14 },
                      ]}
                    >
                      <Text
                        accessibilityRole="header"
                        style={[common.title, { fontSize: 23, flex: 1 }]}
                      >
                        {entry.title}
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Fechar"
                        onPress={entry.onClose}
                        style={s.close}
                      >
                        <X size={20} color={colors.muted} />
                      </Pressable>
                    </View>
                    <View style={{ flexShrink: 1 }}>{entry.children}</View>
                  </View>
                );
              })}
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </Context.Provider>
  );
}
export function useDialogHost() {
  const manager = useContext(Context);
  if (!manager) throw Error('DialogProvider ausente.');
  return manager;
}
const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#000B',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  panel: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    padding: 24,
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  close: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
