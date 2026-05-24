// screens/main/DonationScreen.js
import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  AppState,
  Animated,
  Dimensions,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Text,
  Chip,
  Divider,
  ProgressBar,
  IconButton,
  Surface,
} from 'react-native-paper';
import { useTheme } from 'react-native-paper';
import { LanguageContext } from '../../contexts/LanguageContext';
import { AuthContext } from '../../contexts/AuthContext';
import VoucherContext from '../../contexts/VoucherContext';
import apiService from '../../services/apiService';
import pusherService from '../../services/pusherService';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import i18n from '../../i18n';
import ConfettiCannon from 'react-native-confetti-cannon';

const { width } = Dimensions.get('window');

// ==================== UTILITIES ====================

// Format currency based on language
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return i18n.locale === 'fr' ? '0,00 $' : '$0.00';
  }
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (i18n.locale === 'fr') {
    return `${num.toFixed(2).replace('.', ',')} $`;
  }
  return `$${num.toFixed(2)}`;
};

// Get progress color based on percentage
const getProgressColor = (percentage) => {
  if (percentage < 50) return '#1e3a8a';      // Primary Blue (0-49%)
  if (percentage < 80) return '#0d9488';      // Secondary Teal (50-79%)
  if (percentage < 100) return '#f59e0b';     // Warning Orange (80-99%)
  return '#10b981';                            // Accent Green (100%+)
};

// Impact conversion rates by category
const IMPACT_RATES = {
  health: 1,        // $1 = 1 vaccine
  education: 0.5,   // $2 = 1 book
  environment: 0.05, // $20 = 1 tree
  animals: 1,       // $1 = 1 shelter day
  community: 2,     // $1 = 2 meals
  international: 1, // $1 = 1 unit of aid
  other: 1,
};

// Coin display names
const getCoinDisplayName = (coinType, amount) => {
  if (coinType && coinType !== 'UNKNOWN') {
    return i18n.t(`donation.${coinType.toLowerCase()}`) || coinType;
  }
  // Fallback to amount detection
  if (amount === 0.05) return i18n.t('donation.nickel');
  if (amount === 0.10) return i18n.t('donation.dime');
  if (amount === 0.25) return i18n.t('donation.quarter');
  if (amount === 1.00) return i18n.t('donation.loonie');
  if (amount === 2.00) return i18n.t('donation.toonie');
  return formatCurrency(amount);
};

export default function DonationScreen({ navigation, route }) {
  const theme = useTheme();
  const { t } = useContext(LanguageContext);
  const { isAuthenticated, user } = useContext(AuthContext);
  const { createVoucher, refreshVoucherStats } = useContext(VoucherContext);
  
  const [loading, setLoading] = useState(true);
  const [configLoading, setConfigLoading] = useState(true);
  const [donating, setDonating] = useState(false);
  const [selectedCharity, setSelectedCharity] = useState(null);
  const [donationAmount, setDonationAmount] = useState(0);
  const [moduleInfo, setModuleInfo] = useState(null);
  const [countdown, setCountdown] = useState(90);
  const [sessionId, setSessionId] = useState(null);
  const [sessionStatus, setSessionStatus] = useState('active');
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [timeoutWarningShown, setTimeoutWarningShown] = useState(false);
  const [config, setConfig] = useState(null);
  
  // NEW: State for impact messaging
  const [totalImpact, setTotalImpact] = useState(0);
  const [lastCoinDetected, setLastCoinDetected] = useState(null);
  const [showCoinToast, setShowCoinToast] = useState(false);
  const [toastFadeAnim] = useState(new Animated.Value(0));
  const [confettiVisible, setConfettiVisible] = useState(false);
  const [milestoneReached, setMilestoneReached] = useState(null);
  
  const timerRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const listenersSetupRef = useRef(false);
  const confettiRef = useRef(null);

  // Color scheme from web portal CSS
  const colors = {
    primaryBlue: '#1e3a8a',
    primaryDark: '#1e40af',
    primaryLight: '#3b82f6',
    secondaryTeal: '#0d9488',
    accentGreen: '#10b981',
    warningOrange: '#f59e0b',
    dangerRed: '#ef4444',
    gray50: '#f9fafb',
    gray100: '#f3f4f6',
    gray200: '#e5e7eb',
    gray300: '#d1d5db',
    gray400: '#9ca3af',
    gray500: '#6b7280',
    gray600: '#4b5563',
    gray700: '#374151',
    gray800: '#1f2937',
    gray900: '#111827',
  };

  // Load configuration on mount
  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      setConfigLoading(true);
      const stationId = route.params?.moduleData?.station_id;
      const userProvince = user?.address_province || 'ON';
      const response = await apiService.getDonationConfig(stationId, userProvince);
      
      if (response.success && response.config) {
        setConfig(response.config);
        setCountdown(response.config.session_timeout_seconds);
        console.log('✅ Donation config loaded');
      }
    } catch (error) {
      console.error('❌ Error loading config:', error);
    } finally {
      setConfigLoading(false);
    }
  };

  // Set up Pusher listeners for donation events
  useEffect(() => {
    if (!user?.id || !sessionId) return;
    if (listenersSetupRef.current) return;
    listenersSetupRef.current = true;
    
    console.log('🎧 Setting up donation event listeners for user:', user.id);
    
    const handleDonationReceived = (data) => {
      console.log('💰 Donation received event:', data);
      
      if (data.amount) {
        const newAmount = donationAmount + data.amount;
        setDonationAmount(newAmount);
        setLastUpdateTime(new Date());
        
        // NEW: Show coin detection toast
        const coinName = getCoinDisplayName(data.coin_type, data.amount);
        setLastCoinDetected({ name: coinName, amount: data.amount });
        setShowCoinToast(true);
        Animated.sequence([
          Animated.timing(toastFadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.delay(2000),
          Animated.timing(toastFadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => setShowCoinToast(false));
        
        // NEW: Update impact calculation
        if (selectedCharity?.category) {
          const rate = IMPACT_RATES[selectedCharity.category] || 1;
          const impactGain = Math.floor(data.amount * rate);
          setTotalImpact(prev => prev + impactGain);
        }
        
        // NEW: Check for milestone during session
        checkSessionMilestone(newAmount);
        
        if (data.coin_type) {
          console.log(`🪙 ${data.coin_type} detected: $${data.amount}`);
        }
      }
      
      if (config) {
        setCountdown(config.session_timeout_seconds);
      } else {
        setCountdown(90);
      }
      setTimeoutWarningShown(false);
    };
    
    const handleSessionExpired = (data) => {
      console.log('⏰ Session expired event received');
      handleSessionExpiry('expired');
    };
    
    const privateChannel = `private-user_${user.id}`;
    const publicChannel = `user_${user.id}`;
    
    pusherService.bindEvent(privateChannel, 'user_donation', handleDonationReceived);
    pusherService.bindEvent(publicChannel, 'user_donation', handleDonationReceived);
    pusherService.bindEvent(privateChannel, 'session_expired', handleSessionExpired);
    
    return () => {
      pusherService.unbindEvent(privateChannel, 'user_donation');
      pusherService.unbindEvent(publicChannel, 'user_donation');
      pusherService.unbindEvent(privateChannel, 'session_expired');
      listenersSetupRef.current = false;
    };
  }, [user?.id, sessionId, config, donationAmount]);

  // NEW: Check for milestone during session
  const checkSessionMilestone = (newAmount) => {
    const milestones = [25, 50, 100, 200];
    const previousAmount = donationAmount;
    
    for (const milestone of milestones) {
      if (previousAmount < milestone && newAmount >= milestone) {
        setMilestoneReached(milestone);
        setConfettiVisible(true);
        if (confettiRef.current) {
          confettiRef.current.start();
        }
        setTimeout(() => {
          setConfettiVisible(false);
          setMilestoneReached(null);
        }, 3000);
        break;
      }
    }
  };

  // Initialize donation session with data from QRScanner
  useEffect(() => {
    initializeDonationSession();
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [config]);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      } else if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        if (sessionStatus === 'active' && countdown > 0) {
          startCountdownTimer();
        }
      }
      appStateRef.current = nextAppState;
    });

    return () => subscription.remove();
  }, [sessionStatus, countdown]);

  const initializeDonationSession = async () => {
    try {
      setLoading(true);
      
      const charity = route.params?.charityData;
      const module = route.params?.moduleData;
      const sessionData = route.params?.sessionData;
      const offlineMode = route.params?.offlineMode || false;
      const timeoutFromSession = sessionData?.timeout_seconds;
      
      if (!charity) {
        Alert.alert('Error', 'No charity selected. Please select a charity first.', [
          { text: 'OK', onPress: () => navigation.navigate('CharitySelection') }
        ]);
        return;
      }
      
      setSelectedCharity(charity);
      
      if (module) {
        setModuleInfo({
          station_id: module.station_id,
          location_name: module.location_name,
          location_address: module.location_address,
          business_partner: module.business_partner,
          status: 'active'
        });
        
        if (sessionData?.session_id) {
          setSessionId(sessionData.session_id);
          if (timeoutFromSession) {
            setCountdown(timeoutFromSession);
          }
        } else {
          setSessionId(`session_${Date.now()}`);
        }
      } else if (!offlineMode) {
        Alert.alert(
          'No Module Selected',
          'Please scan a QR code from a donation module first.',
          [{ text: 'OK', onPress: () => navigation.navigate('QRScanner') }]
        );
        return;
      }
      
      setSessionStatus('active');
      startCountdownTimer();
      
    } catch (error) {
      console.error('Error initializing donation session:', error);
      Alert.alert('Error', 'Failed to initialize donation session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startCountdownTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          handleSessionExpiry('timeout');
          return 0;
        }
        
        const warningTrigger = config 
          ? config.session_timeout_seconds - config.warning_threshold_seconds
          : 60;
        
        if (prev === warningTrigger && !timeoutWarningShown) {
          setTimeoutWarningShown(true);
        }
        
        return prev - 1;
      });
    }, 1000);
  };

  const handleSessionExpiry = (reason) => {
    setSessionStatus('expired');
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    const timeoutSeconds = config?.session_timeout_seconds || 90;
    
    const message = reason === 'timeout' 
      ? `Your donation session has expired after ${timeoutSeconds} seconds of inactivity. Please scan the QR code again to start a new session.`
      : 'Your donation session has ended. Please scan the QR code again to start a new session.';
    
    Alert.alert(
      'Session Expired',
      message,
      [
        { 
          text: 'Scan Again', 
          onPress: () => navigation.navigate('QRScanner', {
            charityData: selectedCharity
          })
        },
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => navigation.navigate('Dashboard')
        }
      ]
    );
  };

  const handleResetSession = () => {
    Alert.alert(
      'Reset Session',
      'Are you sure you want to reset this donation session? Any pending donation amount will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setDonationAmount(0);
            setTotalImpact(0);
            setCountdown(config?.session_timeout_seconds || 90);
            setTimeoutWarningShown(false);
            setSessionStatus('active');
            setLastUpdateTime(null);
            setMilestoneReached(null);
            
            if (timerRef.current) {
              clearInterval(timerRef.current);
            }
            startCountdownTimer();
          }
        }
      ]
    );
  };

  const handleCompleteDonation = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Authentication Required',
        'Please log in to complete your donation and receive tax receipts.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Login',
            onPress: () => navigation.navigate('Login', {
              redirectTo: 'Donation',
              donationData: {
                charity: selectedCharity,
                amount: donationAmount,
                module: moduleInfo
              }
            })
          }
        ]
      );
      return;
    }

    if (donationAmount <= 0) {
      Alert.alert('No Donation', 'Please insert coins into the donation module.');
      return;
    }

    if (!selectedCharity) {
      Alert.alert('No Charity Selected', 'Please select a charity first.');
      return;
    }

    if (sessionStatus !== 'active') {
      Alert.alert('Session Expired', 'Your donation session has expired. Please start a new session.');
      return;
    }

    setDonating(true);
    try {
      const voucherData = {
        charity_id: selectedCharity.id,
        charity_name: selectedCharity.display_name || selectedCharity.name,
        amount: donationAmount,
        module_id: moduleInfo?.station_id || 'unknown',
        location: moduleInfo?.location_name || 'Unknown Location',
        transaction_hash: `hash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      const result = await createVoucher(voucherData);
      
      if (result.success) {
        await refreshVoucherStats();
        
        const taxCredit = calculateTaxCredit(donationAmount);
        
        // NEW: Show impact summary in completion alert
        const impactMessage = getImpactMessage(donationAmount, selectedCharity.category);
        
        Alert.alert(
          'Donation Successful! 🎉',
          `Thank you for your donation of ${formatCurrency(donationAmount)} to ${selectedCharity.display_name || selectedCharity.name}.\n\n` +
          `${impactMessage}\n\n` +
          `Estimated tax credit: ${formatCurrency(taxCredit)}\n` +
          `Voucher ID: ${result.voucher_id?.substring(0, 12)}...`,
          [
            { 
              text: 'View Voucher', 
              onPress: () => navigation.navigate('Ledger')
            },
            { 
              text: 'Make Another Donation', 
              onPress: () => {
                setDonationAmount(0);
                setTotalImpact(0);
                setDonating(false);
                setCountdown(config?.session_timeout_seconds || 90);
                setTimeoutWarningShown(false);
                setLastUpdateTime(null);
                
                if (timerRef.current) {
                  clearInterval(timerRef.current);
                }
                startCountdownTimer();
              }
            },
            { 
              text: 'Return to Dashboard', 
              onPress: () => navigation.navigate('Dashboard')
            }
          ]
        );
      } else {
        Alert.alert(
          'Donation Recorded Locally',
          `Your donation of ${formatCurrency(donationAmount)} has been saved locally and will sync when you're back online.\n\n` +
          `Voucher ID: ${result.voucher_id?.substring(0, 12)}...`,
          [{ text: 'OK' }]
        );
        setDonationAmount(0);
        setTotalImpact(0);
        setCountdown(config?.session_timeout_seconds || 90);
        setTimeoutWarningShown(false);
        setLastUpdateTime(null);
      }
    } catch (error) {
      console.error('Donation error:', error);
      Alert.alert(
        'Processing Error',
        'Failed to process donation. Please try again.\n\n' + error.message
      );
    } finally {
      setDonating(false);
    }
  };

  // NEW: Get impact message based on charity category
  const getImpactMessage = (amount, category) => {
    const rate = IMPACT_RATES[category] || 1;
    const count = Math.floor(amount * rate);
    const totalCount = Math.floor(totalImpact + count);
    
    const messageKey = `impact.${category}.${count === 1 ? 'singular' : 'plural'}`;
    const totalKey = `impact.${category}.total`;
    
    try {
      const message = i18n.t(messageKey, { amount: formatCurrency(amount), count });
      const totalMessage = i18n.t(totalKey, { count: totalCount });
      return `${message}\n\n${totalMessage}`;
    } catch (e) {
      // Fallback for missing translations
      return `This donation will make a difference in the ${category} sector.`;
    }
  };

  const calculateTaxCredit = (amount) => {
    if (!amount || amount <= 0) return 0;
    
    const federalFirstTierThreshold = config?.tax_credit?.federal?.first_tier?.threshold || 200;
    const federalFirstTierRate = config?.tax_credit?.federal?.first_tier?.rate || 0.15;
    const federalSecondTierRate = config?.tax_credit?.federal?.second_tier_rate || 0.29;
    
    const federalFirstTier = Math.min(amount, federalFirstTierThreshold) * federalFirstTierRate;
    const federalSecondTier = Math.max(0, amount - federalFirstTierThreshold) * federalSecondTierRate;
    const federalCredit = federalFirstTier + federalSecondTier;
    
    return federalCredit;
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatLastUpdate = () => {
    if (!lastUpdateTime) return 'Waiting for donation...';
    const now = new Date();
    const updateTime = new Date(lastUpdateTime);
    const diffSeconds = Math.floor((now - updateTime) / 1000);
    
    if (diffSeconds < 60) return 'Just now';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} minutes ago`;
    return `${Math.floor(diffSeconds / 3600)} hours ago`;
  };

  // NEW: Render threshold proximity meter
  const renderThresholdMeter = () => {
    const threshold = 200;
    const currentYearTotal = donationAmount; // This is session total, would need user's year total from context
    // For now, show session progress - ideally would use user's year-to-date total from context
    const percentage = Math.min(100, (donationAmount / threshold) * 100);
    const progressColor = getProgressColor(percentage);
    const remaining = Math.max(0, threshold - donationAmount);
    
    if (donationAmount === 0) return null;
    
    return (
      <View style={styles.thresholdMeterContainer}>
        <View style={styles.thresholdHeader}>
          <MaterialCommunityIcons name="chart-line" size={18} color={colors.secondaryTeal} />
          <Text style={[styles.thresholdTitle, { color: colors.secondaryTeal }]}>
            {i18n.t('threshold.title')}
          </Text>
        </View>
        <View style={styles.thresholdBarContainer}>
          <View style={[styles.thresholdBarFill, { width: `${percentage}%`, backgroundColor: progressColor }]} />
        </View>
        <View style={styles.thresholdStats}>
          <Text style={[styles.thresholdCurrent, { color: colors.gray700 }]}>
            {formatCurrency(donationAmount)} of {formatCurrency(threshold)}
          </Text>
          {remaining > 0 ? (
            <Text style={[styles.thresholdRemaining, { color: colors.warningOrange }]}>
              {i18n.t('threshold.remaining_singular', { remaining: formatCurrency(remaining) })}
            </Text>
          ) : (
            <Text style={[styles.thresholdReached, { color: colors.accentGreen }]}>
              {i18n.t('threshold.already_reached')}
            </Text>
          )}
        </View>
      </View>
    );
  };

  // NEW: Render impact card
  const renderImpactCard = () => {
    if (!selectedCharity?.category || donationAmount === 0) return null;
    
    const rate = IMPACT_RATES[selectedCharity.category] || 1;
    const count = Math.floor(donationAmount * rate);
    const messageKey = `impact.${selectedCharity.category}.${count === 1 ? 'singular' : 'plural'}`;
    
    let impactColor = colors.accentGreen;
    let impactIcon = 'leaf';
    
    switch (selectedCharity.category) {
      case 'health':
        impactColor = '#ef4444';
        impactIcon = 'heart-pulse';
        break;
      case 'education':
        impactColor = '#3b82f6';
        impactIcon = 'book-open-variant';
        break;
      case 'environment':
        impactColor = '#22c55e';
        impactIcon = 'tree';
        break;
      case 'animals':
        impactColor = '#eab308';
        impactIcon = 'paw';
        break;
      case 'community':
        impactColor = '#f97316';
        impactIcon = 'hand-heart';
        break;
      default:
        impactColor = colors.accentGreen;
        impactIcon = 'hand-heart';
    }
    
    return (
      <Card style={[styles.impactCard, { backgroundColor: '#ffffff', borderLeftWidth: 4, borderLeftColor: impactColor }]}>
        <Card.Content>
          <View style={styles.impactHeader}>
            <MaterialCommunityIcons name={impactIcon} size={24} color={impactColor} />
            <Text style={[styles.impactTitle, { color: impactColor }]}>
              Your Impact
            </Text>
          </View>
          <Text style={[styles.impactMessage, { color: colors.gray700 }]}>
            {i18n.t(messageKey, { amount: formatCurrency(donationAmount), count })}
          </Text>
          {totalImpact > 0 && (
            <Text style={[styles.impactTotal, { color: colors.gray500 }]}>
              {i18n.t(`impact.${selectedCharity.category}.total`, { count: totalImpact })}
            </Text>
          )}
        </Card.Content>
      </Card>
    );
  };

  // NEW: Render milestone celebration banner
  const renderMilestoneBanner = () => {
    if (!milestoneReached) return null;
    
    let milestoneColor = colors.accentGreen;
    let milestoneIcon = 'trophy';
    if (milestoneReached >= 200) {
      milestoneColor = '#fbbf24';
      milestoneIcon = 'crown';
    } else if (milestoneReached >= 100) {
      milestoneColor = '#f59e0b';
      milestoneIcon = 'star';
    }
    
    return (
      <Animated.View style={[styles.milestoneBanner, { backgroundColor: milestoneColor }]}>
        <MaterialCommunityIcons name={milestoneIcon} size={24} color="#ffffff" />
        <Text style={styles.milestoneBannerText}>
          🎉 {i18n.t('milestone.reached', { amount: formatCurrency(milestoneReached) })} 🎉
        </Text>
      </Animated.View>
    );
  };

  if (loading || configLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.gray50 }]}>
        <ActivityIndicator size="large" color={colors.primaryBlue} />
        <Text style={[styles.loadingText, { color: colors.gray600 }]}>
          {configLoading ? 'Loading configuration...' : 'Initializing donation session...'}
        </Text>
      </View>
    );
  }

  if (!selectedCharity || !moduleInfo) {
    return (
      <View style={[styles.center, { backgroundColor: colors.gray50 }]}>
        <Text style={[styles.errorText, { color: colors.gray600 }]}>
          Invalid donation session
        </Text>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('CharitySelection')}
          style={[styles.retryButton, { backgroundColor: colors.primaryBlue }]}
          icon="refresh"
        >
          Start New Session
        </Button>
      </View>
    );
  }

  const warningThreshold = config 
    ? config.session_timeout_seconds - config.warning_threshold_seconds
    : 60;
  
  const isNearExpiry = countdown <= (config?.warning_threshold_seconds || 30);
  const isWarning = countdown <= warningThreshold && countdown > (config?.warning_threshold_seconds || 30);
  
  // Calculate tax credit preview
  const estimatedTaxCredit = calculateTaxCredit(donationAmount);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.gray50 }]}>
      {/* Confetti Component */}
      <ConfettiCannon
        ref={confettiRef}
        count={200}
        origin={{ x: width / 2, y: -10 }}
        autoStart={false}
        fadeOut={true}
        explosionSpeed={350}
        fallSpeed={300}
      />
      
      {/* Milestone Celebration Banner */}
      {renderMilestoneBanner()}
      
      {/* Coin Detection Toast */}
      {showCoinToast && (
        <Animated.View style={[styles.coinToast, { opacity: toastFadeAnim, backgroundColor: colors.accentGreen }]}>
          <MaterialCommunityIcons name="cash" size={24} color="#ffffff" />
          <Text style={styles.coinToastText}>
            {lastCoinDetected?.name} detected! +{formatCurrency(lastCoinDetected?.amount)}
          </Text>
        </Animated.View>
      )}

      {/* Session Header */}
      <View style={[styles.sessionHeader, { backgroundColor: colors.primaryBlue }]}>
        <View style={styles.sessionHeaderContent}>
          <View style={styles.sessionTitleRow}>
            <Text style={styles.sessionTitle}>
              {i18n.t('donation.session_active')}
            </Text>
            <Chip 
              style={[styles.sessionStatusChip, styles.sessionActive]}
              textStyle={styles.sessionStatusText}
              icon="check-circle"
            >
              {i18n.t('donation.session_active')}
            </Chip>
          </View>
          
          <Text style={[
            styles.sessionTimer,
            isNearExpiry ? { color: '#ff4444' } : 
            isWarning ? { color: '#ffaa00' } : 
            { color: '#ffffff' }
          ]}>
            ⏱️ {i18n.t('donation.time_remaining', { time: formatTime(countdown) })}
            {isNearExpiry && ` ${i18n.t('donation.expiring_soon')}`}
          </Text>
          
          {sessionId && (
            <Text style={styles.sessionId}>
              Session ID: {sessionId.substring(0, 16)}...
            </Text>
          )}
        </View>
      </View>

      {/* Module Information Card */}
      <Card style={[styles.infoCard, { backgroundColor: '#ffffff' }]}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <IconButton icon="cash-register" size={24} iconColor={colors.primaryBlue} />
            <Text style={[styles.cardTitle, { color: colors.primaryBlue }]}>
              Donation Module
            </Text>
          </View>

          <View style={styles.moduleDetails}>
            <View style={styles.moduleRow}>
              <Text style={[styles.moduleLabel, { color: colors.gray600 }]}>Location:</Text>
              <Text style={[styles.moduleValue, { color: colors.gray800 }]}>
                {moduleInfo.location_name || moduleInfo.location}
              </Text>
            </View>
            <View style={styles.moduleRow}>
              <Text style={[styles.moduleLabel, { color: colors.gray600 }]}>Address:</Text>
              <Text style={[styles.moduleValue, { color: colors.gray800 }]}>
                {moduleInfo.location_address || 'N/A'}
              </Text>
            </View>
            <View style={styles.moduleRow}>
              <Text style={[styles.moduleLabel, { color: colors.gray600 }]}>Status:</Text>
              <Chip 
                style={[styles.moduleStatusChip, styles.moduleActive]}
                textStyle={styles.moduleStatusText}
              >
                {moduleInfo.status || 'Unknown'}
              </Chip>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Selected Charity Card */}
      <Card style={[styles.infoCard, { backgroundColor: '#ffffff' }]}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <IconButton icon="charity" size={24} iconColor={colors.primaryBlue} />
            <Text style={[styles.cardTitle, { color: colors.primaryBlue }]}>
              Selected Charity
            </Text>
            <Button
              mode="text"
              onPress={() => navigation.navigate('CharitySelection')}
              labelStyle={{ color: colors.primaryBlue, fontSize: 12 }}
              compact
              icon="swap-horizontal"
            >
              Change
            </Button>
          </View>

          <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />

          <Text style={[styles.charityName, { color: colors.gray800 }]}>
            {selectedCharity.display_name || selectedCharity.name}
          </Text>
          
          {selectedCharity.description && (
            <Text style={[styles.charityDescription, { color: colors.gray600 }]}>
              {selectedCharity.description}
            </Text>
          )}
          
          <View style={styles.charityFooter}>
            <Chip 
              style={[styles.charityCategory, { backgroundColor: colors.gray100 }]}
              textStyle={{ color: colors.gray700 }}
            >
              {i18n.t(`categories.${selectedCharity.category}`) || selectedCharity.category || 'General'}
            </Chip>
            <Text style={[styles.businessNumber, { color: colors.gray500 }]}>
              CRA BN: {selectedCharity.business_number || 'N/A'}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Live Donation Amount Card - Enhanced */}
      <Card style={[styles.amountCard, { backgroundColor: '#ffffff' }]}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <IconButton icon="cash-multiple" size={24} iconColor={colors.primaryBlue} />
            <Text style={[styles.cardTitle, { color: colors.primaryBlue }]}>
              Live Donation Amount
            </Text>
          </View>

          <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />

          <View style={styles.amountDisplay}>
            <Text style={[styles.amountLabel, { color: colors.gray600 }]}>
              Current Amount:
            </Text>
            <Text style={[styles.amountValue, { color: donationAmount > 0 ? colors.accentGreen : colors.primaryBlue }]}>
              {formatCurrency(donationAmount)}
            </Text>
            <Text style={[styles.lastUpdate, { color: colors.gray500 }]}>
              {formatLastUpdate()}
            </Text>
          </View>

          {/* NEW: Estimated Tax Credit Preview */}
          {donationAmount > 0 && (
            <View style={styles.taxPreview}>
              <View style={styles.taxPreviewRow}>
                <Text style={[styles.taxPreviewLabel, { color: colors.gray600 }]}>
                  Estimated Tax Credit:
                </Text>
                <Text style={[styles.taxPreviewValue, { color: colors.accentGreen, fontWeight: '700' }]}>
                  {formatCurrency(estimatedTaxCredit)}
                </Text>
              </View>
              <Text style={[styles.taxPreviewNote, { color: colors.gray500 }]}>
                *Federal credit only. Your net cost: {formatCurrency(donationAmount - estimatedTaxCredit)}
              </Text>
            </View>
          )}

          {/* NEW: Threshold Proximity Meter */}
          {renderThresholdMeter()}

          {/* NEW: Impact Card */}
          {renderImpactCard()}

          <View style={styles.instructionsCard}>
            <View style={styles.instructionStep}>
              <Chip style={[styles.stepNumber, { backgroundColor: colors.primaryBlue }]}>
                <Text style={styles.stepNumberText}>1</Text>
              </Chip>
              <Text style={[styles.stepText, { color: colors.gray700 }]}>
                Insert coins or bills into the physical donation module
              </Text>
            </View>
            
            <View style={styles.instructionStep}>
              <Chip style={[styles.stepNumber, { backgroundColor: colors.primaryBlue }]}>
                <Text style={styles.stepNumberText}>2</Text>
              </Chip>
              <Text style={[styles.stepText, { color: colors.gray700 }]}>
                The module will automatically detect and tally your donation
              </Text>
            </View>
            
            <View style={styles.instructionStep}>
              <Chip style={[styles.stepNumber, { backgroundColor: colors.primaryBlue }]}>
                <Text style={styles.stepNumberText}>3</Text>
              </Chip>
              <Text style={[styles.stepText, { color: colors.gray700 }]}>
                The amount will update here in real-time
              </Text>
            </View>
            
            <View style={styles.instructionStep}>
              <Chip style={[styles.stepNumber, { backgroundColor: colors.primaryBlue }]}>
                <Text style={styles.stepNumberText}>4</Text>
              </Chip>
              <Text style={[styles.stepText, { color: colors.gray700 }]}>
                Click "Complete Donation" when finished inserting coins
              </Text>
            </View>
          </View>

          <Button
            mode="outlined"
            onPress={handleResetSession}
            disabled={donationAmount === 0 || donating}
            style={[styles.resetButton, { borderColor: colors.dangerRed }]}
            labelStyle={{ color: colors.dangerRed }}
            icon="refresh"
          >
            {i18n.t('donation.reset_session')}
          </Button>
        </Card.Content>
      </Card>

      {/* Complete Donation Button */}
      <Card style={[styles.infoCard, { backgroundColor: '#ffffff' }]}>
        <Card.Content>
          <Button
            mode="contained"
            onPress={handleCompleteDonation}
            loading={donating}
            disabled={donating || donationAmount === 0 || sessionStatus !== 'active'}
            style={[styles.donateButton, { 
              backgroundColor: donationAmount > 0 ? colors.accentGreen : colors.gray400 
            }]}
            contentStyle={styles.donateButtonContent}
            icon="check-circle"
          >
            {donating ? i18n.t('donation.processing') : `${i18n.t('donation.complete_donation')} (${formatCurrency(donationAmount)})`}
          </Button>
          
          <View style={[styles.securityBadge, { 
            borderColor: colors.accentGreen,
            backgroundColor: 'rgba(16, 185, 129, 0.05)'
          }]}>
            <IconButton icon="shield-lock" size={20} iconColor={colors.accentGreen} />
            <View style={styles.securityContent}>
              <Text style={[styles.securityTitle, { color: colors.gray800 }]}>
                Secure & Verified Donation
              </Text>
              <Text style={[styles.securityText, { color: colors.gray600 }]}>
                Each donation is cryptographically secured and recorded in your personal ledger for CRA-compliant tax receipts.
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

// ===== STYLES =====
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 10,
  },
  
  // Coin Toast
  coinToast: {
    position: 'absolute',
    top: 80,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 30,
    zIndex: 1000,
    elevation: 5,
  },
  coinToastText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Milestone Banner
  milestoneBanner: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 30,
    zIndex: 1000,
    elevation: 5,
  },
  milestoneBannerText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  
  sessionHeader: {
    padding: 24,
    marginBottom: 16,
  },
  sessionHeaderContent: {
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  sessionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  sessionStatusChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  sessionActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  sessionStatusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  sessionTimer: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 8,
    fontWeight: '500',
  },
  sessionId: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'monospace',
  },
  
  infoCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#eef0f2',
  },
  amountCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#eef0f2',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginLeft: 8,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  
  moduleDetails: {
    marginTop: 8,
  },
  moduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  moduleLabel: {
    fontSize: 14,
    fontWeight: '600',
    width: 80,
  },
  moduleValue: {
    fontSize: 14,
    flex: 1,
  },
  moduleStatusChip: {
    alignSelf: 'flex-start',
  },
  moduleActive: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  moduleStatusText: {
    fontSize: 12,
  },
  
  charityName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  charityDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  charityFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  charityCategory: {
    alignSelf: 'flex-start',
  },
  businessNumber: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  
  amountDisplay: {
    alignItems: 'center',
    marginVertical: 24,
  },
  amountLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 48,
    fontWeight: '700',
    marginBottom: 4,
  },
  lastUpdate: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  
  // NEW: Tax Preview
  taxPreview: {
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  taxPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taxPreviewLabel: {
    fontSize: 13,
  },
  taxPreviewValue: {
    fontSize: 16,
  },
  taxPreviewNote: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
  
  // NEW: Threshold Meter
  thresholdMeterContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  thresholdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  thresholdTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  thresholdBarContainer: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  thresholdBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  thresholdStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  thresholdCurrent: {
    fontSize: 12,
  },
  thresholdRemaining: {
    fontSize: 12,
    fontWeight: '600',
  },
  thresholdReached: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // NEW: Impact Card
  impactCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#eef0f2',
  },
  impactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  impactTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  impactMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  impactTotal: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  
  instructionsCard: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  stepText: {
    fontSize: 14,
    flex: 1,
  },
  resetButton: {
    marginTop: 8,
    borderWidth: 1,
  },
  donateButton: {
    borderRadius: 8,
    marginBottom: 16,
  },
  donateButtonContent: {
    paddingVertical: 10,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  securityContent: {
    flex: 1,
    marginLeft: 12,
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  securityText: {
    fontSize: 12,
    lineHeight: 16,
  },
});