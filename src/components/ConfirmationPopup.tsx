
import React from 'react';
import { Modal, View, Text, Button, StyleSheet, Platform } from 'react-native';

interface ConfirmationPopupProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
}

export default function ConfirmationPopup({ visible, onConfirm, onCancel, title, message }: ConfirmationPopupProps) {
  if (Platform.OS !== 'web' && !visible) {
    return null;
  }

  const renderContent = () => (
    <View style={styles.popupContainer}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <View style={styles.buttonContainer}>
        <Button title="Cancel" onPress={onCancel} color="#7f8c8d" />
        <View style={styles.buttonSpacer} />
        <Button title="Confirm" onPress={onConfirm} color="#e74c3c" />
      </View>
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={onCancel}
      >
        <View style={styles.webOverlay}>
          {renderContent()}
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.nativeOverlay}>
        {renderContent()}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  webOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  nativeOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  popupContainer: {
    width: Platform.OS === 'web' ? 400 : '100%',
    backgroundColor: 'white',
    borderRadius: Platform.OS === 'web' ? 16 : 0,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  buttonSpacer: {
    width: 10,
  },
});
