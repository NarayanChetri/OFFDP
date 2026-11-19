import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const ConflictResolutionScreen: React.FC<any> = () => {
  return (
    <View style={styles.container}>
      <Text>Conflict Resolution has been replaced by All Master Census Data.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
