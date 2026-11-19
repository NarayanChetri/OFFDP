import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

const { width } = Dimensions.get('window');

interface SplashScreenProps {
  onContinue: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onContinue }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onContinue();
    }, 2800);
    return () => clearTimeout(timer);
  }, [onContinue]);

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={onContinue}
      style={styles.container}
    >
      <LinearGradient
        colors={['#27124f', '#441f7a', '#542699', '#3b166d', '#1f0d38']}
        locations={[0, 0.35, 0.6, 0.8, 1]}
        style={styles.gradient}
      >
        {/* Main Brand Section */}
        <View style={styles.centerContent}>
          {/* App Icon Container */}
          <View style={styles.iconOutline}>
            <View style={styles.phoneFrame}>
              <View style={styles.phoneSpeaker} />
              <View style={styles.phoneScreen}>
                <Ionicons name="cloud-offline" size={38} color="#ffffff" />
              </View>
              <View style={styles.phoneButton} />
            </View>
          </View>

          {/* Titles */}
          <Text style={styles.brandTitle}>OFFDP</Text>
          <Text style={styles.brandSubtitleBold}>Offline-First</Text>
          <Text style={styles.brandSubtitle}>Field Data Platform</Text>

          {/* Tagline */}
          <Text style={styles.tagline}>
            Collect • Store Offline • Sync Later
          </Text>

          {/* Spinner */}
          <View style={styles.spinnerContainer}>
            <ActivityIndicator size="small" color="#ffffff" />
          </View>
        </View>

        {/* Mountain Silhouettes and Hiker Silhouette at Bottom */}
        <View style={styles.mountainSection}>
          {/* Back Mountain Ridge */}
          <View style={styles.mountainBack} />
          {/* Middle Mountain Ridge */}
          <View style={styles.mountainMid} />
          {/* Foreground Mountain Ridge */}
          <View style={styles.mountainFront}>
            {/* Hiker Silhouette Graphic */}
            <View style={styles.hikerContainer}>
              {/* Head / Cap */}
              <View style={styles.hikerHead} />
              {/* Torso & Backpack */}
              <View style={styles.hikerBackpack} />
              <View style={styles.hikerBody} />
              {/* Arm holding phone */}
              <View style={styles.hikerArm} />
              {/* Legs on cliff */}
              <View style={styles.hikerLegs} />
            </View>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 120,
  },
  centerContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  iconOutline: {
    width: 90,
    height: 110,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 6,
  },
  phoneFrame: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  phoneSpeaker: {
    width: 22,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  phoneScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneButton: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  brandTitle: {
    fontSize: 38,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 3,
    marginBottom: 4,
  },
  brandSubtitleBold: {
    fontSize: 19,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
    marginBottom: 18,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.8,
    marginBottom: 36,
  },
  spinnerContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mountainSection: {
    width: width,
    height: 220,
    position: 'relative',
    overflow: 'hidden',
  },
  mountainBack: {
    position: 'absolute',
    bottom: 20,
    left: -40,
    width: width + 80,
    height: 160,
    backgroundColor: '#35165f',
    transform: [{ rotate: '-8deg' }, { scaleX: 1.3 }],
    borderTopLeftRadius: 180,
    borderTopRightRadius: 140,
  },
  mountainMid: {
    position: 'absolute',
    bottom: 0,
    right: -60,
    width: width + 100,
    height: 140,
    backgroundColor: '#270e48',
    transform: [{ rotate: '9deg' }],
    borderTopLeftRadius: 160,
    borderTopRightRadius: 200,
  },
  mountainFront: {
    position: 'absolute',
    bottom: -10,
    left: 0,
    width: width,
    height: 110,
    backgroundColor: '#16072b',
    borderTopRightRadius: 90,
  },
  hikerContainer: {
    position: 'absolute',
    top: -45,
    left: 55,
    width: 45,
    height: 65,
  },
  hikerHead: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#16072b',
    position: 'absolute',
    top: 0,
    left: 12,
  },
  hikerBackpack: {
    width: 15,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#16072b',
    position: 'absolute',
    top: 12,
    left: 4,
  },
  hikerBody: {
    width: 16,
    height: 24,
    backgroundColor: '#16072b',
    position: 'absolute',
    top: 12,
    left: 14,
    borderRadius: 4,
  },
  hikerArm: {
    width: 16,
    height: 5,
    backgroundColor: '#16072b',
    position: 'absolute',
    top: 18,
    left: 24,
    transform: [{ rotate: '-25deg' }],
    borderRadius: 2,
  },
  hikerLegs: {
    width: 18,
    height: 28,
    backgroundColor: '#16072b',
    position: 'absolute',
    top: 34,
    left: 12,
    borderTopLeftRadius: 4,
  },
});

