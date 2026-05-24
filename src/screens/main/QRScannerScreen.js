import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  BackHandler,
  Dimensions,
  StatusBar,
  Vibration,
  AppState,
} from 'react-native';
import {
  Text,
  Button,
  ActivityIndicator,
  Surface,
} from 'react-native-paper';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import apiService from '../../services/apiService';
import { AuthContext } from '../../contexts/AuthContext';
import { LanguageContext } from '../../contexts/LanguageContext';
import pusherService from '../../services/pusherService';

const { width } = Dimensions.get('window');

const QRScannerScreen = ({ navigation, route }) => {
  const { isAuthenticated, user } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const isFocused = useIsFocused();
  
  const [processing, setProcessing] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [waitingForSession, setWaitingForSession] = useState(false);
  const [sessionConfirmed, setSessionConfirmed] = useState(false);
  
  const [isCameraInitialized, setIsCameraInitialized] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);

  const cameraRef = useRef(null);
  const device = useCameraDevice('back');
  const { hasPermission: cameraPermission, requestPermission } = useCameraPermission();
  
  const sessionTimeoutRef = useRef(null);
  const isWaitingForSessionRef = useRef(false);
  const pusherInitializedRef = useRef(false);
  const connectionMonitorRef = useRef(null);

  // Initialize Pusher when user is available
  useEffect(() => {
    const initPusher = async () => {
      try {
        const token = await AsyncStorage.getItem('gmd_token');
        
        if (user?.id && token) {
          console.log('🔧 Initializing Pusher for user:', user.id);
          
          await pusherService.updateUserCredentials(user.id, token);
          
          if (!pusherInitializedRef.current) {
            await pusherService.initForGestionMicroDons();
            pusherInitializedRef.current = true;
            console.log('✅ Pusher initialized successfully');
            console.log('📊 Initial Pusher state:', pusherService.getDebugInfo());
          } else {
            await pusherService.subscribeToUserChannels();
          }
        } else {
          console.log('⏳ Waiting for user data...', { userId: user?.id, hasToken: !!token });
        }
      } catch (error) {
        console.error('❌ Pusher init failed:', error);
      }
    };
    
    initPusher();
  }, [user?.id]);

  // Handle AppState changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      setAppState(nextAppState);
    });
    return () => subscription.remove();
  }, []);

  // Delay camera initialization
  useEffect(() => {
    let timeout;
    if (isFocused) {
      timeout = setTimeout(() => setIsCameraInitialized(true), 400);
    } else {
      setIsCameraInitialized(false);
    }
    return () => clearTimeout(timeout);
  }, [isFocused]);

  // Set up Pusher listener for session confirmation
  useEffect(() => {
    if (!user || !user.id) return;
    
    console.log('🔧 Setting up Pusher session listener for user:', user.id);
    console.log('📊 Current Pusher connection state:', pusherService.getDebugInfo());
    
    // Check if we're already subscribed
    const privateChannel = `private-user_${user.id}`;
    const isSubscribed = pusherService.isPrivateChannelSubscribed(privateChannel);
    console.log(`📡 Channel ${privateChannel} subscribed?`, isSubscribed);
    console.log(`📡 Event listeners:`, pusherService.getDebugInfo().eventListeners);
    
    const handleSessionCreated = (data) => {
      console.log('🎯🎯🎯 SESSION CREATED EVENT RECEIVED IN QRScanner! 🎯🎯🎯');
      console.log('📦 Raw event data:', JSON.stringify(data, null, 2));
      console.log('📡 Current waiting state:', {
        isWaiting: isWaitingForSessionRef.current,
        scannedStationId: scannedData?.station_id,
        eventStationId: data?.station_id
      });
      
      if (isWaitingForSessionRef.current && scannedData) {
        if (data.station_id === scannedData.station_id) {
          console.log('✅ Session matches current module, proceeding...');
          
          if (sessionTimeoutRef.current) {
            clearTimeout(sessionTimeoutRef.current);
            sessionTimeoutRef.current = null;
          }
          
          if (connectionMonitorRef.current) {
            clearInterval(connectionMonitorRef.current);
            connectionMonitorRef.current = null;
          }
          
          setSessionConfirmed(true);
          setWaitingForSession(false);
          isWaitingForSessionRef.current = false;
          
          setTimeout(() => {
            console.log('🚀 Navigating to ActiveDonationSession with data:', {
              moduleData: scannedData,
              charityData: route.params?.charityData,
              sessionData: data
            });
            navigation.navigate('Donation', {  // ← Changed from 'ActiveDonationSession' to 'Donation'
  moduleData: scannedData,
  charityData: route.params?.charityData,
  userData: { 
    id: user.id,
    legal_name: user.legal_name,
    email: user.email 
  },
  sessionData: data
});
            resetScannerState();
          }, 500);
        } else {
          console.log('⚠️ Session received for different module:', {
            expected: scannedData.station_id,
            received: data.station_id
          });
        }
      } else {
        console.log('⚠️ Session event received but not waiting:', {
          isWaiting: isWaitingForSessionRef.current,
          hasScannedData: !!scannedData
        });
      }
    };
    
    const privateChannelName = `private-user_${user.id}`;
    const publicChannelName = `user_${user.id}`;
    
    console.log(`📡 Setting up listeners on channels: private="${privateChannelName}", public="${publicChannelName}"`);
    
    pusherService.bindEvent(privateChannelName, 'session_created', handleSessionCreated);
    pusherService.bindEvent(publicChannelName, 'session_created', handleSessionCreated);
    
    return () => {
      console.log('🧹 Cleaning up Pusher listeners');
      pusherService.unbindEvent(privateChannelName, 'session_created');
      pusherService.unbindEvent(publicChannelName, 'session_created');
      
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
        sessionTimeoutRef.current = null;
      }
      
      if (connectionMonitorRef.current) {
        clearInterval(connectionMonitorRef.current);
        connectionMonitorRef.current = null;
      }
    };
  }, [user, navigation, scannedData, route.params?.charityData]);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes) => {
      if (codes.length > 0 && !scanned && !processing && !creatingSession) {
        setScanned(true);
        const barcode = codes[0];
        console.log('📱 [GestionMicroDons] QR Code scanned:', barcode);
        handleBarCodeScanned({ data: barcode.value });
      }
    },
  });

  useEffect(() => {
    const initializeScanner = async () => {
      try {
        const permission = await requestPermission();
        setHasPermission(permission);
      } catch (error) {
        console.error('Error initializing scanner:', error);
        setHasPermission(false);
      }
    };
    initializeScanner();
  }, [requestPermission]);

  useFocusEffect(
    useCallback(() => {
      resetScannerState();
      
      if (route.params?.charityData) {
        console.log('📦 Received charity data:', route.params.charityData);
      } else {
        console.log('⚠️ No charity data received - may have navigated directly');
      }
      
      if (!isAuthenticated) {
        Alert.alert(
          t('auth.required_title') || 'Authentication Required',
          t('auth.required_message') || 'You must be logged in to scan.',
          [
            { text: t('common.cancel'), style: 'cancel', onPress: () => navigation.goBack() },
            { text: t('auth.login'), onPress: () => navigation.navigate('Login', { redirectTo: 'QRScanner' }) }
          ]
        );
      }
      
      const onBackPress = () => {
        navigation.goBack();
        return true;
      };

      const backHandlerSubscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => {
        backHandlerSubscription.remove();
        setScanned(true);
      };
    }, [navigation, isAuthenticated, t, route.params])
  );

  const parseQRData = (data) => {
    try {
      const parsedData = JSON.parse(data);
      if (!parsedData.system || parsedData.system !== 'GestionMicroDons') {
        throw new Error(t('scanner.invalid_system_message'));
      }
      if (!parsedData.station_id) {
        throw new Error(t('scanner.missing_station_id'));
      }
      return {
        station_id: parsedData.station_id,
        location_name: parsedData.location_name || t('scanner.unknown_location'),
        location_address: parsedData.location_address || '',
        business_partner: parsedData.business_partner || '',
        system: parsedData.system,
        raw_data: data
      };
    } catch (error) {
      throw new Error(t('scanner.invalid_qr_format'));
    }
  };

  const validateModuleData = (moduleData) => {
    if (!moduleData.station_id || moduleData.system !== 'GestionMicroDons') {
      throw new Error(t('scanner.invalid_qr_message'));
    }
    return true;
  };

  const ensurePusherReady = async (userId) => {
    console.log('🔍 Vérification que Pusher est prêt pour utilisateur:', userId);
    console.log('📊 État Pusher avant vérification:', pusherService.getDebugInfo());
    
    if (!pusherService.getConnectionStatus()) {
      console.log('⏳ Pusher non connecté, attente...');
      await pusherService.initForGestionMicroDons();
    }
    
    console.log('📡 Ré-abonnement aux canaux utilisateur...');
    await pusherService.subscribeToUserChannels();
    
    const isReady = await pusherService.waitForUserChannelsReady(userId, 5000);
    
    console.log('📊 État Pusher après vérification:', pusherService.getDebugInfo());
    console.log('📡 Résultat vérification Pusher:', isReady ? 'PRÊT' : 'NON PRÊT');
    
    return isReady;
  };

  const handleBarCodeScanned = async ({ data }) => {
    if (processing || creatingSession) return;
    setProcessing(true);
    Vibration.vibrate(200);

    try {
      const moduleData = parseQRData(data);
      validateModuleData(moduleData);
      setScannedData(moduleData);
      
      const { charityData } = route.params;
      
      if (!charityData || !charityData.id) {
        throw new Error('Missing charity data. Please select a charity first.');
      }
      
      if (!isAuthenticated || !user) {
        throw new Error('You must be logged in to start a donation session.');
      }
      
      if (!pusherService.getConnectionStatus()) {
        console.log('⏳ Waiting for Pusher connection...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      setCreatingSession(true);
      
      console.log('📡 Sending wake-up call to backend for station_id:', moduleData.station_id);
      console.log('📡 Payload:', JSON.stringify({
        user_id: user.id,
        charity_id: charityData.id,
        charity_name: charityData.name,
        qr_data: moduleData
      }, null, 2));
      
      const wakeupResponse = await fetch('https://gestionmicrodons.com/api/wakeup.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          charity_id: charityData.id,
          charity_name: charityData.name,
          qr_data: moduleData
        })
      });
      
      console.log('📥 Response status:', wakeupResponse.status);
      
      const responseText = await wakeupResponse.text();
      console.log('📥 Raw response:', responseText);
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error('❌ Failed to parse JSON response:', responseText);
        throw new Error('Invalid response from server');
      }
      
      console.log('✅ Parsed response:', responseData);
      
      if (responseData.success) {
        await AsyncStorage.setItem('current_module_data', JSON.stringify({
          station_id: moduleData.station_id,
          location_name: moduleData.location_name,
          business_partner: moduleData.business_partner,
          scanned_at: new Date().toISOString()
        }));
        
        console.log('✅ Wake-up successful, checking Pusher subscription status...');
        const subStatus = pusherService.getDebugInfo();
        console.log('📊 Pusher subscription status:', subStatus);
        
        const privateChannel = `private-user_${user.id}`;
        const publicChannel = `user_${user.id}`;
        console.log(`👂 Should be listening on: ${privateChannel} and ${publicChannel}`);
        console.log(`👂 Event listeners:`, Array.from(pusherService.eventListeners.keys()));
        
        setShowSuccess(true);
        setCreatingSession(false);
        
        console.log('🔧 Vérification configuration Pusher avant attente...');
        const pusherReady = await ensurePusherReady(user.id);
        
        console.log('📡 Résultat vérification Pusher:', pusherReady ? 'PRÊT' : 'NON PRÊT');
        
        setWaitingForSession(true);
        isWaitingForSessionRef.current = true;
        
        console.log(`👂 Attente confirmation session sur ${privateChannel} et ${publicChannel}`);
        
        // Start connection monitor
        connectionMonitorRef.current = setInterval(() => {
          if (isWaitingForSessionRef.current) {
            const status = pusherService.getConnectionStatus();
            const debug = pusherService.getDebugInfo();
            console.log('📡 [Pusher Monitor] While waiting:', {
              connected: status,
              channels: debug.subscribedChannels,
              privateStatus: debug.privateChannelStatus,
              waiting: true
            });
          }
        }, 3000);
        
        sessionTimeoutRef.current = setTimeout(() => {
          if (isWaitingForSessionRef.current) {
            console.log('⚠️ Session confirmation timeout after 15 seconds');
            
            if (connectionMonitorRef.current) {
              clearInterval(connectionMonitorRef.current);
              connectionMonitorRef.current = null;
            }
            
            const debugInfo = pusherService.getDebugInfo();
            console.log('📊 État Pusher au timeout:', debugInfo);
            
            isWaitingForSessionRef.current = false;
            setWaitingForSession(false);
            
            Alert.alert(
              'Délai d\'attente dépassé',
              'Le module prend trop de temps à répondre. Voulez-vous réessayer ou passer en mode manuel?',
              [
                { text: 'Annuler', style: 'cancel', onPress: resetScannerState },
                { 
                  text: 'Mode manuel', 
                  onPress: () => {
                    navigation.navigate('ActiveDonationSession', {
                      moduleData: scannedData,
                      charityData: route.params?.charityData,
                      userData: { 
                        id: user.id,
                        legal_name: user.legal_name,
                        email: user.email 
                      },
                      offlineMode: true
                    });
                    resetScannerState();
                  }
                },
                { 
                  text: 'Réessayer', 
                  onPress: () => {
                    resetScannerState();
                  }
                }
              ]
            );
          }
        }, 15000);
        
      } else {
        console.error('❌ Wake-up failed:', responseData.error);
        throw new Error(responseData.error || 'Failed to wake up module');
      }
      
    } catch (error) {
      console.error('❌ Error in QR scan flow:', error);
      
      Alert.alert(
        'Échec du réveil',
        error.message || 'Impossible de réveiller le module de don. Veuillez réessayer.',
        [{ text: 'OK', onPress: resetScannerState }]
      );
      
    } finally {
      setProcessing(false);
      setCreatingSession(false);
    }
  };

  const resetScannerState = () => {
    setScanned(false);
    setProcessing(false);
    setCreatingSession(false);
    setScannedData(null);
    setShowSuccess(false);
    setWaitingForSession(false);
    setSessionConfirmed(false);
    isWaitingForSessionRef.current = false;
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
    }
    if (connectionMonitorRef.current) {
      clearInterval(connectionMonitorRef.current);
      connectionMonitorRef.current = null;
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  const isCameraActive = isFocused && appState === 'active' && isCameraInitialized && !processing && !creatingSession;

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#000" barStyle="light-content" />
      
      {isCameraActive && device && (
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={true}
          codeScanner={codeScanner}
          pixelFormat="yuv"
          audio={false}
          photo={false}
          video={false}
        />
      )}

      <View style={styles.overlay}>
        <Surface style={styles.headerInfo} elevation={2}>
          <Text style={styles.userWelcome}>
            {t('scanner.welcome', { name: user?.legal_first_name || '' })}
          </Text>
          <Text style={styles.headerTitle}>{t('scanner.scan_module_title')}</Text>
          <Text style={styles.headerSubtitle}>{t('scanner.scan_instruction')}</Text>
          
          {route.params?.charityData?.name && (
            <View style={[styles.approvedStatus, { marginTop: 8, backgroundColor: 'rgba(16, 185, 129, 0.3)' }]}>
              <Text style={styles.approvedStatusText}>
                {t('scanner.donating_to') || 'Donating to:'} {route.params.charityData.name}
              </Text>
            </View>
          )}
        </Surface>
        
        <View style={styles.scanFrame}>
          <View style={[styles.corner, styles.cornerTopLeft]} />
          <View style={[styles.corner, styles.cornerTopRight]} />
          <View style={[styles.corner, styles.cornerBottomLeft]} />
          <View style={[styles.corner, styles.cornerBottomRight]} />
        </View>
        
        <Text style={styles.instructions}>{t('scanner.align_qr_in_frame')}</Text>
        
        <Surface style={styles.instructionsCard} elevation={1}>
          <Text style={styles.instructionsTitle}>{t('scanner.physical_donation_title')}</Text>
          {[1, 2, 3, 4].map((step) => (
            <View key={step} style={styles.instructionStep}>
              <Text style={styles.stepNumber}>{step}</Text>
              <Text style={styles.stepText}>{t(`scanner.step_${step}`)}</Text>
            </View>
          ))}
        </Surface>
        
        <Button 
          mode="outlined" 
          onPress={() => navigation.goBack()} 
          style={styles.backButton} 
          textColor="#fff" 
          icon="arrow-left"
        >
          {t('common.back')}
        </Button>
      </View>

      {(processing || creatingSession || waitingForSession) && (
        <View style={styles.processingOverlay}>
          <View style={styles.processingContent}>
            {showSuccess && !waitingForSession ? (
              <>
                <View style={styles.successIcon}><Text style={styles.successIconText}>✓</Text></View>
                <Text style={styles.successTitle}>
                  {t('scanner.module_woken') || 'Module réveillé!'}
                </Text>
                <Text style={[styles.processingText, { fontSize: 14, marginTop: 4 }]}>
                  {t('scanner.waiting_for_module') || 'Attente de la réponse du module...'}
                </Text>
              </>
            ) : waitingForSession ? (
              <>
                <ActivityIndicator size="large" color="#ffffff" />
                <Text style={styles.processingText}>
                  {t('scanner.waiting_for_confirmation') || 'Confirmation du module...'}
                </Text>
                <Text style={[styles.processingText, { fontSize: 14, marginTop: 8 }]}>
                  {t('scanner.this_may_take_a_few_seconds') || 'Cela peut prendre quelques secondes'}
                </Text>
              </>
            ) : (
              <>
                <ActivityIndicator size="large" color="#ffffff" />
                <Text style={styles.processingText}>
                  {t('scanner.waking_module') || 'Réveil du module...'}
                </Text>
              </>
            )}
            {scannedData && (
              <Surface style={styles.scannedDataCard}>
                <View style={styles.scannedDataRow}>
                  <Text style={styles.scannedDataIcon}>📟</Text>
                  <View style={styles.scannedDataInfo}>
                    <Text style={styles.scannedDataLabel}>{t('scanner.station_id')}</Text>
                    <Text style={styles.scannedDataValue}>{scannedData.station_id}</Text>
                  </View>
                </View>
                {scannedData.location_name && (
                  <View style={[styles.scannedDataRow, { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.1)' }]}>
                    <Text style={styles.scannedDataIcon}>📍</Text>
                    <View style={styles.scannedDataInfo}>
                      <Text style={styles.scannedDataLabel}>{t('scanner.location')}</Text>
                      <Text style={styles.scannedDataValue}>{scannedData.location_name}</Text>
                    </View>
                  </View>
                )}
                {route.params?.charityData?.name && (
                  <View style={[styles.scannedDataRow, { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.1)' }]}>
                    <Text style={styles.scannedDataIcon}>❤️</Text>
                    <View style={styles.scannedDataInfo}>
                      <Text style={styles.scannedDataLabel}>{t('scanner.charity')}</Text>
                      <Text style={styles.scannedDataValue}>{route.params.charityData.name}</Text>
                    </View>
                  </View>
                )}
              </Surface>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  headerInfo: { position: 'absolute', top: 20, left: 16, right: 16, padding: 16, borderRadius: 12, backgroundColor: 'rgba(30, 58, 138, 0.9)', alignItems: 'center' },
  userWelcome: { color: 'rgba(255, 255, 255, 0.9)', fontSize: 14, marginBottom: 4 },
  headerTitle: { color: '#ffffff', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  headerSubtitle: { color: 'rgba(255, 255, 255, 0.9)', fontSize: 12, textAlign: 'center' },
  scanFrame: { width: 250, height: 250, borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.3)', borderRadius: 20, position: 'relative', marginBottom: 20, marginTop: 80 },
  corner: { position: 'absolute', width: 30, height: 30, borderColor: '#10b981' },
  cornerTopLeft: { top: -2, left: -2, borderLeftWidth: 4, borderTopWidth: 4, borderTopLeftRadius: 20 },
  cornerTopRight: { top: -2, right: -2, borderRightWidth: 4, borderTopWidth: 4, borderTopRightRadius: 20 },
  cornerBottomLeft: { bottom: -2, left: -2, borderLeftWidth: 4, borderBottomWidth: 4, borderBottomLeftRadius: 20 },
  cornerBottomRight: { bottom: -2, right: -2, borderRightWidth: 4, borderBottomWidth: 4, borderBottomRightRadius: 20 },
  instructions: { color: '#ffffff', fontSize: 16, fontWeight: '600', backgroundColor: 'rgba(0, 0, 0, 0.7)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginBottom: 8 },
  instructionsCard: { backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: 16, borderRadius: 12, marginBottom: 20, width: '85%' },
  instructionsTitle: { color: '#ffffff', fontSize: 14, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  instructionStep: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  stepNumber: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#1e3a8a', color: '#ffffff', textAlign: 'center', lineHeight: 24, fontWeight: '700', marginRight: 12, fontSize: 12 },
  stepText: { color: 'rgba(255, 255, 255, 0.9)', fontSize: 13, flex: 1 },
  backButton: { position: 'absolute', bottom: 30, borderColor: 'rgba(255, 255, 255, 0.5)', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
  processingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.95)', justifyContent: 'center', alignItems: 'center' },
  processingContent: { alignItems: 'center', padding: 20, width: '100%' },
  successIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  successIconText: { fontSize: 40, color: '#ffffff', fontWeight: '700' },
  successTitle: { color: '#ffffff', fontSize: 24, fontWeight: '700', marginBottom: 8 },
  processingText: { color: '#ffffff', fontSize: 18, marginTop: 20, fontWeight: '600' },
  scannedDataCard: { marginTop: 30, backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: 20, borderRadius: 12, width: '90%' },
  scannedDataRow: { flexDirection: 'row', alignItems: 'center' },
  scannedDataIcon: { fontSize: 20, marginRight: 12 },
  scannedDataInfo: { flex: 1 },
  scannedDataLabel: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 12 },
  scannedDataValue: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  approvedStatus: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  approvedStatusText: {
    fontSize: 12,
    color: '#065F46',
    fontWeight: '500',
  },
});

export default QRScannerScreen;