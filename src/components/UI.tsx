import React, { useState, useId, useLayoutEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { colors, common } from '../theme';
import { useDialogHost } from './DialogHost';
export function Button({
  children,
  onPress,
  variant = 'primary',
  disabled = false,
  icon,
  checked,
  accessibilityLabel,
}: {
  children: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  icon?: React.ReactNode;
  checked?: boolean;
  accessibilityLabel?: string;
}) {
  const fg =
    variant === 'primary'
      ? colors.bg
      : variant === 'danger'
        ? colors.red
        : colors.text;
  return (
    <Pressable
      accessibilityRole={checked === undefined ? 'button' : 'checkbox'}
      accessibilityLabel={accessibilityLabel ?? children}
      accessibilityState={{ disabled, checked }}
      aria-checked={checked}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        {
          backgroundColor:
            variant === 'primary'
              ? colors.orange
              : variant === 'ghost'
                ? 'transparent'
                : colors.raised,
          opacity: disabled ? 0.35 : pressed ? 0.7 : 1,
        },
      ]}
    >
      {icon}
      <Text
        style={{
          color: fg,
          fontSize: 13,
          fontWeight: '700',
          flexShrink: 1,
          textAlign: 'center',
        }}
      >
        {children}
      </Text>
    </Pressable>
  );
}
export function Badge({
  children,
  tone = 'green',
}: {
  children: string;
  tone?: 'green' | 'orange' | 'muted';
}) {
  return (
    <View
      style={[
        s.badge,
        {
          backgroundColor:
            tone === 'green'
              ? colors.greenBg
              : tone === 'orange'
                ? colors.orangeBg
                : colors.raised,
        },
      ]}
    >
      <Text
        style={{
          color:
            tone === 'green'
              ? colors.green
              : tone === 'orange'
                ? colors.orange
                : colors.muted,
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.6,
        }}
      >
        {children}
      </Text>
    </View>
  );
}
export function Counter({
  value,
  max,
  min = 0,
  onChange,
  label,
}: {
  value: number;
  max: number;
  min?: number;
  onChange: (delta: number) => void;
  label: string;
}) {
  return (
    <View style={s.counter}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Diminuir ${label}`}
        disabled={value <= min}
        onPress={() => onChange(-1)}
        style={[s.step, value <= min && { opacity: 0.25 }]}
      >
        <Minus size={16} color={colors.muted} />
      </Pressable>
      <Text accessibilityLabel={`${label}: ${value}`} style={s.counterText}>
        {value}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Aumentar ${label}`}
        disabled={value >= max}
        onPress={() => onChange(1)}
        style={[s.step, value >= max && { opacity: 0.25 }]}
      >
        <Plus size={16} color={colors.text} />
      </Pressable>
    </View>
  );
}
export function Dialog({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const host = useDialogHost();
  const id = useId();
  useLayoutEffect(() => {
    if (open) host.put(id, { title, children, onClose });
    else host.remove(id);
  }, [open, title, children, onClose, host, id]);
  useLayoutEffect(() => () => host.remove(id), [host, id]);
  return null;
}
export function ConfirmButton({
  label,
  title,
  message,
  onConfirm,
}: {
  label: string;
  title: string;
  message: string;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" onPress={() => setOpen(true)}>
        {label}
      </Button>
      <Dialog title={title} open={open} onClose={() => setOpen(false)}>
        <Text style={common.body}>{message}</Text>
        <View
          style={[common.row, { justifyContent: 'flex-end', marginTop: 24 }]}
        >
          <Button variant="secondary" onPress={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onPress={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            Confirmar
          </Button>
        </View>
      </Dialog>
    </>
  );
}
const s = StyleSheet.create({
  button: {
    minHeight: 46,
    paddingHorizontal: 17,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
  },
  step: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    minWidth: 20,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  backdrop: {
    flex: 1,
    backgroundColor: '#000B',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  dialog: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    padding: 24,
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
});
