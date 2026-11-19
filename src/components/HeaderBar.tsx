import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

interface HeaderBarProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  onOpenMenu?: () => void;
  rightElement?: React.ReactNode;
  isOnline?: boolean;
  customRightIcon?: any;
  onCustomRightPress?: () => void;
  secondaryRightIcon?: any;
  onSecondaryRightPress?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  title,
  showBack = false,
  onBack,
  onOpenMenu,
  rightElement,
  isOnline = false,
  customRightIcon,
  onCustomRightPress,
  secondaryRightIcon,
  onSecondaryRightPress,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Left Action: Back Arrow or Hamburger Menu Icon */}
        <View style={styles.left}>
          {showBack ? (
            <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={onOpenMenu} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="menu" size={28} color="#fff" />
            </TouchableOpacity>
          )}
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>

        {/* Right Action: Accurate Online/Offline Badge and contextual icons */}
        <View style={styles.right}>
          {/* Accurate Network Status Badge (Not a button, strictly reflects true device state) */}
          <View
            style={[
              styles.networkBadge,
              isOnline ? styles.networkBadgeOnline : styles.networkBadgeOffline,
            ]}
          >
            <Ionicons
              name={isOnline ? 'wifi' : 'cloud-offline'}
              size={13}
              color="#ffffff"
            />
            <Text style={styles.networkBadgeText}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>

          {secondaryRightIcon && (
            <TouchableOpacity onPress={onSecondaryRightPress} style={styles.iconBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name={secondaryRightIcon} size={22} color="#fff" />
            </TouchableOpacity>
          )}

          {customRightIcon && (
            <TouchableOpacity onPress={onCustomRightPress} style={styles.iconBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name={customRightIcon} size={22} color="#fff" />
            </TouchableOpacity>
          )}

          {rightElement}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.primaryDark,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 8 : 48,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 16,
  },
  networkBadgeOffline: {
    backgroundColor: '#dc2626',
  },
  networkBadgeOnline: {
    backgroundColor: '#16a34a',
  },
  networkBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  iconBtn: {
    padding: 4,
  },
});
