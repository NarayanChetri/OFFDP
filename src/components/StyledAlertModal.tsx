import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../constants/theme';

export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export type AlertType = 'info' | 'error' | 'warning' | 'success';

interface StyledAlertModalProps {
  visible: boolean;
  title: string;
  message: string;
  type?: AlertType;
  buttons?: AlertButton[];
  onDismiss: () => void;
}

const TYPE_CONFIG: Record<
  AlertType,
  { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }
> = {
  info: { icon: 'information-circle', color: COLORS.primary, bg: '#f3e8ff' },
  error: { icon: 'alert-circle', color: '#dc2626', bg: '#fee2e2' },
  warning: { icon: 'cloud-offline', color: '#d97706', bg: '#fef3c7' },
  success: { icon: 'checkmark-circle', color: '#16a34a', bg: '#dcfce7' },
};

export const StyledAlertModal: React.FC<StyledAlertModalProps> = ({
  visible,
  title,
  message,
  type = 'info',
  buttons = [{ text: 'OK', style: 'default' }],
  onDismiss,
}) => {
  if (!visible) return null;

  const cfg = TYPE_CONFIG[type];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={[styles.iconCircle, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon} size={30} color={cfg.color} />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View
            style={[
              styles.buttonRow,
              buttons.length === 1 && styles.buttonRowSingle,
            ]}
          >
            {buttons.map((btn, idx) => {
              const isCancel = btn.style === 'cancel';
              const isDestructive = btn.style === 'destructive';
              return (
                <TouchableOpacity
                  key={`${btn.text}-${idx}`}
                  style={[
                    styles.button,
                    buttons.length > 1 && { flex: 1 },
                    isCancel && styles.buttonCancel,
                    isDestructive && styles.buttonDestructive,
                    !isCancel && !isDestructive && styles.buttonPrimary,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => {
                    onDismiss();
                    btn.onPress?.();
                  }}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      isCancel && styles.buttonTextCancel,
                    ]}
                  >
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.58)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    ...SHADOWS.card,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  buttonRowSingle: {
    justifyContent: 'center',
  },
  button: {
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    minWidth: 120,
  },
  buttonPrimary: {
    backgroundColor: COLORS.primary,
  },
  buttonDestructive: {
    backgroundColor: '#dc2626',
  },
  buttonCancel: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  buttonTextCancel: {
    color: COLORS.textPrimary,
  },
});
