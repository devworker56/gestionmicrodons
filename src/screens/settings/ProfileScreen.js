// screens/settings/ProfileScreen.js
import React, { useContext, useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
  TextInput as RNTextInput,
} from 'react-native';
import {
  Text,
  Card,
  List,
  Divider,
  Button,
  TextInput,
  useTheme,
  Avatar,
  Dialog,
  Portal,
  ProgressBar,
  Chip,
  Snackbar,
} from 'react-native-paper';
import { LanguageContext } from '../../contexts/LanguageContext';
import { AuthContext } from '../../contexts/AuthContext';
import VoucherContext from '../../contexts/VoucherContext';
import apiService from '../../services/apiService';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../../i18n';

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

// Format number with thousand separators
const formatNumber = (num) => {
  if (num === null || num === undefined) return '0';
  if (i18n.locale === 'fr') {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// Impact conversion rates by category
const IMPACT_RATES = {
  health: 1,
  education: 0.5,
  environment: 0.05,
  animals: 1,
  community: 2,
  international: 1,
  other: 1,
};

const ProfileScreen = ({ navigation }) => {
  const theme = useTheme();
  
  const languageContext = useContext(LanguageContext);
  const language = languageContext?.language || 'en';
  const currentLanguage = languageContext?.currentLanguage || languageContext?.language || 'en';
  const changeLanguage = languageContext?.changeLanguage;
  const setLanguage = languageContext?.setLanguage || languageContext?.changeLanguage;
  const t = languageContext?.t || ((key) => key);
  
  const { user, logout, updateProfile } = useContext(AuthContext);
  const { voucherStats, charityBuckets } = useContext(VoucherContext);
  
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showLanguageDialog, setShowLanguageDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [donationStats, setDonationStats] = useState(null);
  
  // NEW: Carryforward-related state
  const [claimPreference, setClaimPreference] = useState('current');
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const [unclaimedTotal, setUnclaimedTotal] = useState(0);
  const [unclaimedLoading, setUnclaimedLoading] = useState(false);
  
  // NEW: Giving streak state
  const [givingStreak, setGivingStreak] = useState(0);
  const [streakLoading, setStreakLoading] = useState(false);
  const [showStreakCelebration, setShowStreakCelebration] = useState(false);
  const [streakFadeAnim] = useState(new Animated.Value(0));
  
  // NEW: Donation goal state
  const [donationGoal, setDonationGoal] = useState(200);
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [goalCelebration, setGoalCelebration] = useState(false);
  const goalFadeAnim = useRef(new Animated.Value(0)).current;
  
  // NEW: Impact summary
  const [impactSummary, setImpactSummary] = useState({
    meals: 0,
    trees: 0,
    vaccines: 0,
    books: 0,
    shelterDays: 0,
  });

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

  useEffect(() => {
    loadUserProfile();
    loadDonationStats();
    loadUnclaimedForProfile();
    loadClaimPreference();
    loadGivingStreak();
    loadDonationGoal();
    calculateImpactSummary();
  }, []);

  // NEW: Load giving streak from storage/API
  const loadGivingStreak = async () => {
    try {
      setStreakLoading(true);
      // Try to get from AsyncStorage first
      let streak = await AsyncStorage.getItem('giving_streak');
      if (streak) {
        setGivingStreak(parseInt(streak, 10));
      } else {
        // Calculate from voucher history
        const response = await apiService.getVoucherHistory();
        if (response.success && response.vouchers) {
          const months = new Set();
          response.vouchers.forEach(v => {
            const date = new Date(v.transaction_time || v.timestamp);
            months.add(`${date.getFullYear()}-${date.getMonth()}`);
          });
          const calculatedStreak = months.size;
          setGivingStreak(calculatedStreak);
          await AsyncStorage.setItem('giving_streak', calculatedStreak.toString());
          
          // Check if streak increased
          const oldStreak = await AsyncStorage.getItem('previous_giving_streak');
          if (oldStreak && parseInt(oldStreak, 10) < calculatedStreak) {
            setShowStreakCelebration(true);
            Animated.sequence([
              Animated.timing(streakFadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
              Animated.delay(3000),
              Animated.timing(streakFadeAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
            ]).start(() => setShowStreakCelebration(false));
          }
          await AsyncStorage.setItem('previous_giving_streak', calculatedStreak.toString());
        }
      }
    } catch (error) {
      console.error('Error loading giving streak:', error);
    } finally {
      setStreakLoading(false);
    }
  };

  // NEW: Load donation goal from storage
  const loadDonationGoal = async () => {
    try {
      const savedGoal = await AsyncStorage.getItem('donation_goal');
      if (savedGoal) {
        setDonationGoal(parseFloat(savedGoal));
      }
    } catch (error) {
      console.error('Error loading donation goal:', error);
    }
  };

  // NEW: Save donation goal
  const saveDonationGoal = async () => {
    const newGoal = parseFloat(goalInput);
    if (isNaN(newGoal) || newGoal <= 0) {
      Alert.alert('Invalid Goal', 'Please enter a valid donation goal amount.');
      return;
    }
    
    try {
      await AsyncStorage.setItem('donation_goal', newGoal.toString());
      setDonationGoal(newGoal);
      setShowGoalDialog(false);
      setGoalInput('');
      
      // Check if goal was reached
      const totalDonated = donationStats?.total_donations || 0;
      if (totalDonated >= newGoal && !goalCelebration) {
        setGoalCelebration(true);
        Animated.sequence([
          Animated.timing(goalFadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.delay(4000),
          Animated.timing(goalFadeAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]).start(() => setGoalCelebration(false));
      }
      
      Alert.alert('Goal Set', `Your donation goal is now ${formatCurrency(newGoal)}`);
    } catch (error) {
      console.error('Error saving donation goal:', error);
    }
  };

  // NEW: Calculate impact summary from charity buckets
  const calculateImpactSummary = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const response = await apiService.getCharityBuckets(currentYear);
      
      if (response.success && response.buckets) {
        let meals = 0, trees = 0, vaccines = 0, books = 0, shelterDays = 0;
        
        response.buckets.forEach(bucket => {
          const amount = bucket.total_amount;
          const category = bucket.category || 'other';
          const rate = IMPACT_RATES[category] || 1;
          const impact = Math.floor(amount * rate);
          
          switch (category) {
            case 'community':
              meals += impact;
              break;
            case 'environment':
              trees += impact;
              break;
            case 'health':
              vaccines += impact;
              break;
            case 'education':
              books += impact;
              break;
            case 'animals':
              shelterDays += impact;
              break;
            default:
              break;
          }
        });
        
        setImpactSummary({ meals, trees, vaccines, books, shelterDays });
      }
    } catch (error) {
      console.error('Error calculating impact:', error);
    }
  };

  const loadUnclaimedForProfile = async () => {
    try {
      setUnclaimedLoading(true);
      const response = await apiService.getUnclaimedDonations();
      if (response.success) {
        setUnclaimedTotal(response.summary?.total_unclaimed || 0);
      }
    } catch (error) {
      console.error('Error loading unclaimed for profile:', error);
    } finally {
      setUnclaimedLoading(false);
    }
  };

  const loadClaimPreference = async () => {
    try {
      const savedPref = await AsyncStorage.getItem('default_claim_year');
      if (savedPref === 'current' || savedPref === 'next') {
        setClaimPreference(savedPref);
      }
    } catch (error) {
      console.error('Error loading claim preference:', error);
    }
  };

  const saveClaimPreference = async (preference) => {
    try {
      await AsyncStorage.setItem('default_claim_year', preference);
      setClaimPreference(preference);
      await apiService.updateProfile({ default_claim_year: preference }).catch(console.error);
    } catch (error) {
      console.error('Error saving claim preference:', error);
    }
  };

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      
      const apiResponse = await apiService.getUserProfile();
      if (apiResponse.success && apiResponse.profile) {
        setUserProfile(apiResponse.profile);
      } else {
        if (user) {
          const localUserData = await apiService.loadUserData();
          setUserProfile(localUserData || user);
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      if (user) {
        setUserProfile(user);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadDonationStats = async () => {
    try {
      if (voucherStats) {
        const stats = {
          total_donations: voucherStats.totalAmount || 0,
          total_transactions: voucherStats.totalVouchers || 0,
          favorite_charity: 'Calculate from charity buckets',
          years_active: 1,
          last_donation: new Date().toISOString()
        };
        setDonationStats(stats);
      } else {
        const ledgerResponse = await apiService.getVoucherLedger();
        if (ledgerResponse.success && ledgerResponse.vouchers) {
          const vouchers = ledgerResponse.vouchers;
          const totalAmount = vouchers.reduce((sum, v) => sum + (parseFloat(v.amount) || 0), 0);
          const lastVoucher = vouchers.length > 0 ? vouchers[0] : null;
          
          const stats = {
            total_donations: totalAmount,
            total_transactions: vouchers.length,
            favorite_charity: 'Calculate from charity buckets',
            years_active: 1,
            last_donation: lastVoucher?.timestamp || new Date().toISOString()
          };
          setDonationStats(stats);
        }
      }
    } catch (error) {
      console.error('Error loading donation stats:', error);
    }
  };

  const handleLanguageChange = async (newLanguage) => {
    try {
      setShowLanguageDialog(false);
      setLoading(true);
      
      console.log('🌐 Changing language to:', newLanguage);
      console.log('🧹 Clearing charity cache...');
      
      setUserProfile(prev => ({
        ...prev,
        language_preference: newLanguage,
        updated_at: new Date().toISOString()
      }));
      
      await apiService.saveUserData({
        ...userProfile,
        language_preference: newLanguage
      });
      
      let result;
      if (typeof changeLanguage === 'function') {
        result = await changeLanguage(newLanguage);
        console.log('✅ Language updated via changeLanguage');
      } else if (typeof setLanguage === 'function') {
        result = await setLanguage(newLanguage);
        console.log('✅ Language updated via setLanguage');
      } else {
        console.log('⚠️ No language function found, updating directly');
        await AsyncStorage.setItem('gmd_language', newLanguage);
        result = { success: true };
      }
      
      await AsyncStorage.removeItem('cached_charities');
      await AsyncStorage.removeItem('charities_cache');
      console.log('✅ Charity cache cleared');
      
      Alert.alert(
        newLanguage === 'en' ? '✅ Success' : '✅ Succès',
        newLanguage === 'en' 
          ? 'Language changed to English. Charities will now display in English.'
          : 'Langue changée pour le français. Les organismes s\'afficheront maintenant en français.',
        [
          { 
            text: newLanguage === 'en' ? 'OK' : 'D\'accord',
            onPress: () => {
              navigation.popToTop();
              navigation.replace('Dashboard');
              setTimeout(() => {
                Alert.alert(
                  newLanguage === 'en' ? 'View Charities' : 'Voir les organismes',
                  newLanguage === 'en'
                    ? 'Would you like to view charities in your new language?'
                    : 'Voulez-vous voir les organismes dans votre nouvelle langue?',
                  [
                    { text: newLanguage === 'en' ? 'Later' : 'Plus tard', style: 'cancel' },
                    { text: newLanguage === 'en' ? 'View Now' : 'Voir maintenant', onPress: () => navigation.navigate('CharitySelection') }
                  ]
                );
              }, 500);
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('Error changing language:', error);
      Alert.alert('Error', 'Failed to update language preference. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (field, value) => {
    setEditingField(field);
    setEditValue(value || '');
  };

  const saveEdit = async () => {
    if (!editingField || !editValue.trim() || !userProfile) return;
    
    try {
      const updatedProfile = {
        ...userProfile,
        [editingField]: editValue
      };
      setUserProfile(updatedProfile);
      
      await apiService.saveUserData(updatedProfile);
      
      const result = await apiService.updateProfile({ [editingField]: editValue });
      
      if (result.success) {
        Alert.alert('Success', 'Profile updated successfully');
      } else {
        Alert.alert('Warning', 'Profile saved locally but could not sync with server');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setEditingField(null);
      setEditValue('');
    }
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const handleLogout = async () => {
    setShowLogoutDialog(false);
    try {
      await logout();
      navigation.replace('Login');
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(i18n.locale === 'fr' ? 'fr-CA' : 'en-CA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return 'Invalid date';
    }
  };

  const formatPostalCode = (postalCode) => {
    if (!postalCode) return '';
    const clean = postalCode.toUpperCase().replace(/\s/g, '');
    if (clean.length >= 3) {
      return `${clean.substring(0, 3)} ${clean.substring(3, 6)}`;
    }
    return clean;
  };

  const getUserInitials = () => {
    if (!userProfile) return '??';
    const firstName = userProfile.legal_first_name || userProfile.firstName || '';
    const lastName = userProfile.legal_last_name || userProfile.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || '??';
  };

  const getDisplayName = () => {
    if (!userProfile) return 'Loading...';
    
    if (userProfile.legal_name) {
      return userProfile.legal_name;
    }
    
    const firstName = userProfile.legal_first_name || userProfile.firstName || '';
    const lastName = userProfile.legal_last_name || userProfile.lastName || '';
    
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    
    return userProfile.email || 'User';
  };

  const getEmail = () => {
    return userProfile?.email || user?.email || 'No email';
  };

  const getFormattedAddress = () => {
    if (!userProfile) return '';
    
    const parts = [];
    if (userProfile.address_street) parts.push(userProfile.address_street);
    if (userProfile.address_city) parts.push(userProfile.address_city);
    if (userProfile.address_province) parts.push(userProfile.address_province);
    if (userProfile.address_postal_code) parts.push(formatPostalCode(userProfile.address_postal_code));
    
    return parts.join(', ') || 'Address not set';
  };

  // NEW: Render giving streak card
  const renderStreakCard = () => {
    const totalDonated = donationStats?.total_donations || 0;
    const goalProgress = Math.min(100, (totalDonated / donationGoal) * 100);
    
    return (
      <Card style={[styles.infoCard, { backgroundColor: '#ffffff' }]}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="fire" size={24} color={colors.warningOrange} />
            <Text style={[styles.cardTitle, { color: colors.warningOrange }]}>
              {i18n.t('streak.title')}
            </Text>
          </View>

          <Divider style={[styles.divider, { backgroundColor: colors.gray200, marginVertical: 12 }]} />

          <View style={styles.streakContainer}>
            <View style={styles.streakNumberContainer}>
              <Text style={[styles.streakNumber, { color: colors.warningOrange }]}>
                {givingStreak}
              </Text>
              <Text style={[styles.streakLabel, { color: colors.gray600 }]}>
                {i18n.t('streak.months_' + (givingStreak === 1 ? 'singular' : 'plural'), { count: givingStreak })}
              </Text>
            </View>
            <MaterialCommunityIcons name="fire" size={48} color={colors.warningOrange} />
          </View>
          
          <Text style={[styles.streakMessage, { color: colors.gray600 }]}>
            {givingStreak > 0 ? i18n.t('streak.keep_going') : i18n.t('streak.new_streak')}
          </Text>
          
          {/* Donation Goal Progress */}
          <View style={styles.goalContainer}>
            <View style={styles.goalHeader}>
              <Text style={[styles.goalLabel, { color: colors.gray600 }]}>
                Annual Donation Goal
              </Text>
              <Button
                mode="text"
                compact
                onPress={() => {
                  setGoalInput(donationGoal.toString());
                  setShowGoalDialog(true);
                }}
                labelStyle={{ color: colors.primaryBlue, fontSize: 12 }}
                icon="pencil"
              >
                Set Goal
              </Button>
            </View>
            <View style={styles.goalProgressContainer}>
              <View style={[styles.goalProgressFill, { width: `${goalProgress}%`, backgroundColor: goalProgress >= 100 ? colors.accentGreen : colors.primaryBlue }]} />
            </View>
            <View style={styles.goalStats}>
              <Text style={[styles.goalCurrent, { color: colors.gray700 }]}>
                {formatCurrency(totalDonated)} of {formatCurrency(donationGoal)}
              </Text>
              {goalProgress < 100 && (
                <Text style={[styles.goalRemaining, { color: colors.warningOrange }]}>
                  {formatCurrency(donationGoal - totalDonated)} to go!
                </Text>
              )}
              {goalProgress >= 100 && (
                <Text style={[styles.goalAchieved, { color: colors.accentGreen }]}>
                  🎉 Goal Achieved! 🎉
                </Text>
              )}
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  // NEW: Render impact summary card
  const renderImpactCard = () => {
    const hasImpact = impactSummary.meals > 0 || impactSummary.trees > 0 || impactSummary.vaccines > 0 || impactSummary.books > 0 || impactSummary.shelterDays > 0;
    
    if (!hasImpact) return null;
    
    return (
      <Card style={[styles.infoCard, { backgroundColor: '#ffffff' }]}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="hand-heart" size={24} color={colors.secondaryTeal} />
            <Text style={[styles.cardTitle, { color: colors.secondaryTeal }]}>
              Your Impact
            </Text>
          </View>

          <Divider style={[styles.divider, { backgroundColor: colors.gray200, marginVertical: 12 }]} />

          <View style={styles.impactGrid}>
            {impactSummary.meals > 0 && (
              <View style={styles.impactItem}>
                <MaterialCommunityIcons name="food" size={28} color="#f97316" />
                <Text style={[styles.impactNumber, { color: colors.gray800 }]}>
                  {formatNumber(impactSummary.meals)}
                </Text>
                <Text style={[styles.impactLabel, { color: colors.gray500 }]}>Meals</Text>
              </View>
            )}
            {impactSummary.trees > 0 && (
              <View style={styles.impactItem}>
                <MaterialCommunityIcons name="tree" size={28} color="#22c55e" />
                <Text style={[styles.impactNumber, { color: colors.gray800 }]}>
                  {formatNumber(impactSummary.trees)}
                </Text>
                <Text style={[styles.impactLabel, { color: colors.gray500 }]}>Trees</Text>
              </View>
            )}
            {impactSummary.vaccines > 0 && (
              <View style={styles.impactItem}>
                <MaterialCommunityIcons name="needle" size={28} color="#ef4444" />
                <Text style={[styles.impactNumber, { color: colors.gray800 }]}>
                  {formatNumber(impactSummary.vaccines)}
                </Text>
                <Text style={[styles.impactLabel, { color: colors.gray500 }]}>Vaccines</Text>
              </View>
            )}
            {impactSummary.books > 0 && (
              <View style={styles.impactItem}>
                <MaterialCommunityIcons name="book-open-variant" size={28} color="#3b82f6" />
                <Text style={[styles.impactNumber, { color: colors.gray800 }]}>
                  {formatNumber(impactSummary.books)}
                </Text>
                <Text style={[styles.impactLabel, { color: colors.gray500 }]}>Books</Text>
              </View>
            )}
            {impactSummary.shelterDays > 0 && (
              <View style={styles.impactItem}>
                <MaterialCommunityIcons name="home" size={28} color="#eab308" />
                <Text style={[styles.impactNumber, { color: colors.gray800 }]}>
                  {formatNumber(impactSummary.shelterDays)}
                </Text>
                <Text style={[styles.impactLabel, { color: colors.gray500 }]}>Shelter Days</Text>
              </View>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

  // NEW: Render goal celebration banner
  const renderGoalCelebration = () => {
    if (!goalCelebration) return null;
    
    return (
      <Animated.View style={[styles.celebrationBanner, { opacity: goalFadeAnim, backgroundColor: colors.accentGreen }]}>
        <MaterialCommunityIcons name="trophy" size={24} color="#ffffff" />
        <Text style={styles.celebrationText}>
          🎉 Congratulations! You've reached your donation goal! 🎉
        </Text>
      </Animated.View>
    );
  };

  // NEW: Render streak celebration banner
  const renderStreakCelebration = () => {
    if (!showStreakCelebration) return null;
    
    return (
      <Animated.View style={[styles.celebrationBanner, { opacity: streakFadeAnim, backgroundColor: colors.warningOrange }]}>
        <MaterialCommunityIcons name="fire" size={24} color="#ffffff" />
        <Text style={styles.celebrationText}>
          🔥 {givingStreak} month streak! Keep it going! 🔥
        </Text>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.gray50 }]}>
        <ActivityIndicator size="large" color={colors.primaryBlue} />
        <Text style={[styles.loadingText, { color: colors.gray600 }]}>
          {t('common.loading') || 'Loading profile...'}
        </Text>
      </View>
    );
  }

  if (!userProfile) {
    return (
      <View style={[styles.center, { backgroundColor: colors.gray50 }]}>
        <MaterialCommunityIcons name="account-off" size={64} color={colors.gray400} />
        <Text style={[styles.errorText, { color: colors.gray600 }]}>
          {t('profile.not_found') || 'User profile not found'}
        </Text>
        <Button 
          mode="contained" 
          onPress={loadUserProfile}
          style={[styles.retryButton, { backgroundColor: colors.primaryBlue }]}
          icon="refresh"
        >
          {t('common.retry') || 'Retry'}
        </Button>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.gray50 }]}
      showsVerticalScrollIndicator={false}
    >
      {renderGoalCelebration()}
      {renderStreakCelebration()}
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primaryBlue }]}>
        <Avatar.Text 
          size={80}
          label={getUserInitials()}
          style={styles.avatar}
          color="#ffffff"
          backgroundColor={colors.primaryLight}
        />
        <Text style={styles.headerTitle}>{getDisplayName()}</Text>
        <Text style={styles.headerSubtitle}>{getEmail()}</Text>
        <View style={styles.verificationBadge}>
          <MaterialCommunityIcons 
            name="shield-check" 
            size={16} 
            color={userProfile.is_verified ? colors.accentGreen : colors.warningOrange} 
          />
          <Text style={[
            styles.verifiedText, 
            { color: userProfile.is_verified ? colors.accentGreen : colors.warningOrange }
          ]}>
            {userProfile.is_verified ? 'Verified Account' : 'Unverified Account'}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Account Information Card */}
        <Card style={[styles.infoCard, { backgroundColor: '#ffffff' }]}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="account-details" size={24} color={colors.primaryBlue} />
              <Text style={[styles.cardTitle, { color: colors.primaryBlue }]}>
                Account Information
              </Text>
              <Button 
                mode="text"
                onPress={() => setIsEditing(!isEditing)}
                labelStyle={{ color: colors.primaryBlue, fontSize: 12 }}
                compact
                icon={isEditing ? "check" : "pencil"}
              >
                {isEditing ? 'Done' : 'Edit'}
              </Button>
            </View>

            <Divider style={[styles.divider, { backgroundColor: colors.gray200, marginVertical: 12 }]} />

            <Text style={[styles.sectionLabel, { color: colors.gray700 }]}>
              Legal Name (CRA Requirement)
            </Text>
            
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.gray600 }]}>First Name:</Text>
              {editingField === 'legal_first_name' ? (
                <TextInput
                  value={editValue}
                  onChangeText={setEditValue}
                  style={[styles.editInput, { backgroundColor: colors.gray100 }]}
                  mode="outlined"
                  dense
                  autoFocus
                  right={<TextInput.Icon icon="check" onPress={saveEdit} />}
                />
              ) : (
                <Text style={[styles.infoValue, { color: colors.gray800 }]}>
                  {userProfile.legal_first_name || userProfile.firstName || 'Not set'}
                </Text>
              )}
              {isEditing && !editingField && (
                <Button 
                  mode="text"
                  onPress={() => startEditing('legal_first_name', userProfile.legal_first_name)}
                  icon="pencil"
                  compact
                  labelStyle={{ color: colors.gray500 }}
                />
              )}
            </View>

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.gray600 }]}>Last Name:</Text>
              {editingField === 'legal_last_name' ? (
                <TextInput
                  value={editValue}
                  onChangeText={setEditValue}
                  style={[styles.editInput, { backgroundColor: colors.gray100 }]}
                  mode="outlined"
                  dense
                  right={<TextInput.Icon icon="check" onPress={saveEdit} />}
                />
              ) : (
                <Text style={[styles.infoValue, { color: colors.gray800 }]}>
                  {userProfile.legal_last_name || userProfile.lastName || 'Not set'}
                </Text>
              )}
              {isEditing && !editingField && (
                <Button 
                  mode="text"
                  onPress={() => startEditing('legal_last_name', userProfile.legal_last_name)}
                  icon="pencil"
                  compact
                  labelStyle={{ color: colors.gray500 }}
                />
              )}
            </View>

            {/* Contact Information */}
            <Text style={[styles.sectionLabel, { color: colors.gray700, marginTop: 16 }]}>
              Contact Information
            </Text>
            
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.gray600 }]}>Email:</Text>
              <Text style={[styles.infoValue, { color: colors.gray800 }]}>
                {getEmail()}
              </Text>
              <MaterialCommunityIcons 
                name={userProfile.is_verified ? "check-circle" : "alert-circle"} 
                size={20} 
                color={userProfile.is_verified ? colors.accentGreen : colors.warningOrange} 
              />
            </View>

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.gray600 }]}>Phone:</Text>
              {editingField === 'phone' ? (
                <TextInput
                  value={editValue}
                  onChangeText={setEditValue}
                  style={[styles.editInput, { backgroundColor: colors.gray100 }]}
                  mode="outlined"
                  dense
                  keyboardType="phone-pad"
                  right={<TextInput.Icon icon="check" onPress={saveEdit} />}
                />
              ) : (
                <Text style={[styles.infoValue, { color: colors.gray800 }]}>
                  {userProfile.phone || 'Not set'}
                </Text>
              )}
              <MaterialCommunityIcons 
                name={userProfile.phone_verified ? "check-circle" : "alert-circle"} 
                size={20} 
                color={userProfile.phone_verified ? colors.accentGreen : colors.warningOrange} 
              />
              {isEditing && !editingField && (
                <Button 
                  mode="text"
                  onPress={() => startEditing('phone', userProfile.phone)}
                  icon="pencil"
                  compact
                  labelStyle={{ color: colors.gray500 }}
                />
              )}
            </View>
          </Card.Content>
        </Card>

        {/* Address Information Card */}
        <Card style={[styles.infoCard, { backgroundColor: '#ffffff' }]}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="map-marker" size={24} color={colors.primaryBlue} />
              <Text style={[styles.cardTitle, { color: colors.primaryBlue }]}>
                Tax Address (CRA Requirement)
              </Text>
            </View>

            <Divider style={[styles.divider, { backgroundColor: colors.gray200, marginVertical: 12 }]} />

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.gray600 }]}>Street:</Text>
              {editingField === 'address_street' ? (
                <TextInput
                  value={editValue}
                  onChangeText={setEditValue}
                  style={[styles.editInput, { backgroundColor: colors.gray100 }]}
                  mode="outlined"
                  dense
                  autoFocus
                  right={<TextInput.Icon icon="check" onPress={saveEdit} />}
                />
              ) : (
                <Text style={[styles.infoValue, { color: colors.gray800 }]}>
                  {userProfile.address_street || 'Not set'}
                </Text>
              )}
              {isEditing && !editingField && (
                <Button 
                  mode="text"
                  onPress={() => startEditing('address_street', userProfile.address_street)}
                  icon="pencil"
                  compact
                  labelStyle={{ color: colors.gray500 }}
                />
              )}
            </View>

            <View style={styles.cityProvinceRow}>
              <View style={styles.cityInput}>
                <Text style={[styles.infoLabel, { color: colors.gray600 }]}>City:</Text>
                {editingField === 'address_city' ? (
                  <TextInput
                    value={editValue}
                    onChangeText={setEditValue}
                    style={[styles.editInput, { backgroundColor: colors.gray100 }]}
                    mode="outlined"
                    dense
                    right={<TextInput.Icon icon="check" onPress={saveEdit} />}
                  />
                ) : (
                  <Text style={[styles.infoValue, { color: colors.gray800 }]}>
                    {userProfile.address_city || 'Not set'}
                  </Text>
                )}
              </View>
              <View style={styles.provinceInput}>
                <Text style={[styles.infoLabel, { color: colors.gray600 }]}>Province:</Text>
                {editingField === 'address_province' ? (
                  <TextInput
                    value={editValue}
                    onChangeText={setEditValue}
                    style={[styles.editInput, { backgroundColor: colors.gray100 }]}
                    mode="outlined"
                    dense
                    right={<TextInput.Icon icon="check" onPress={saveEdit} />}
                  />
                ) : (
                  <Text style={[styles.infoValue, { color: colors.gray800 }]}>
                    {userProfile.address_province || 'Not set'}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.gray600 }]}>Postal Code:</Text>
              {editingField === 'address_postal_code' ? (
                <TextInput
                  value={editValue}
                  onChangeText={(text) => {
                    const formatted = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    if (formatted.length > 3) {
                      const part1 = formatted.substring(0, 3);
                      const part2 = formatted.substring(3, 6);
                      setEditValue(`${part1} ${part2}`);
                    } else {
                      setEditValue(formatted);
                    }
                  }}
                  style={[styles.editInput, { backgroundColor: colors.gray100 }]}
                  mode="outlined"
                  dense
                  maxLength={7}
                  right={<TextInput.Icon icon="check" onPress={saveEdit} />}
                />
              ) : (
                <Text style={[styles.infoValue, { color: colors.gray800 }]}>
                  {formatPostalCode(userProfile.address_postal_code) || 'Not set'}
                </Text>
              )}
              {isEditing && !editingField && (
                <Button 
                  mode="text"
                  onPress={() => startEditing('address_postal_code', userProfile.address_postal_code)}
                  icon="pencil"
                  compact
                  labelStyle={{ color: colors.gray500 }}
                />
              )}
            </View>

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.gray600 }]}>Tax Province:</Text>
              <Text style={[styles.infoValue, { color: colors.gray800 }]}>
                {userProfile.tax_province || userProfile.address_province || 'Not set'}
              </Text>
              <MaterialCommunityIcons 
                name="cash-refund" 
                size={20} 
                color={colors.secondaryTeal} 
              />
            </View>
          </Card.Content>
        </Card>

        {/* NEW: Giving Streak & Goal Card */}
        {renderStreakCard()}

        {/* NEW: Impact Summary Card */}
        {renderImpactCard()}

        {/* Donation Statistics Card */}
        {donationStats && (
          <Card style={[styles.infoCard, { backgroundColor: '#ffffff' }]}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons name="charity" size={24} color={colors.primaryBlue} />
                <Text style={[styles.cardTitle, { color: colors.primaryBlue }]}>
                  Donation Statistics
                </Text>
              </View>

              <Divider style={[styles.divider, { backgroundColor: colors.gray200, marginVertical: 12 }]} />

              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: colors.primaryBlue }]}>
                    {formatCurrency(donationStats.total_donations)}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.gray600 }]}>
                    Total Donated
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: colors.secondaryTeal }]}>
                    {formatNumber(donationStats.total_transactions)}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.gray600 }]}>
                    Transactions
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: colors.accentGreen }]}>
                    {donationStats.years_active}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.gray600 }]}>
                    Years Active
                  </Text>
                </View>
              </View>

              <View style={styles.additionalStats}>
                <View style={styles.additionalStat}>
                  <Text style={[styles.additionalLabel, { color: colors.gray600 }]}>
                    Last Donation:
                  </Text>
                  <Text style={[styles.additionalValue, { color: colors.gray800 }]}>
                    {formatDate(donationStats.last_donation)}
                  </Text>
                </View>
                <View style={styles.additionalStat}>
                  <Text style={[styles.additionalLabel, { color: colors.gray600 }]}>
                    Member Since:
                  </Text>
                  <Text style={[styles.additionalValue, { color: colors.gray800 }]}>
                    {formatDate(userProfile.created_at)}
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Tax Claiming Preferences Card */}
        <Card style={[styles.infoCard, { backgroundColor: '#ffffff' }]}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="cash-refund" size={24} color={colors.secondaryTeal} />
              <Text style={[styles.cardTitle, { color: colors.secondaryTeal }]}>
                {i18n.t('claim_preferences.title')}
              </Text>
            </View>

            <Divider style={[styles.divider, { backgroundColor: colors.gray200, marginVertical: 12 }]} />

            {/* Unclaimed Summary */}
            {unclaimedTotal > 0 && !unclaimedLoading && (
              <View style={[styles.unclaimedSummaryBox, { backgroundColor: `${colors.warningOrange}10`, padding: 12, borderRadius: 8, marginBottom: 16 }]}>
                <View style={styles.unclaimedSummaryRow}>
                  <MaterialCommunityIcons name="bank" size={20} color={colors.warningOrange} />
                  <Text style={[styles.unclaimedSummaryText, { color: colors.gray700 }]}>
                    {i18n.t('claim_preferences.unclaimed_summary', { amount: formatCurrency(unclaimedTotal) })}
                  </Text>
                </View>
                <Text style={[styles.unclaimedSummarySubtext, { color: colors.gray500, fontSize: 11, marginTop: 4 }]}>
                  {i18n.t('claim_preferences.unclaimed_subtext')}
                </Text>
              </View>
            )}

            {/* Default Claim Year Preference */}
            <List.Item
              title={i18n.t('claim_preferences.default_claim_year')}
              description={i18n.t('claim_preferences.default_claim_year_desc')}
              left={props => <List.Icon {...props} icon="calendar" color={colors.secondaryTeal} />}
              right={() => (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: colors.gray600, marginRight: 8 }}>
                    {claimPreference === 'current' ? i18n.t('claim_preferences.current_year') : i18n.t('claim_preferences.next_year')}
                  </Text>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={colors.gray400} />
                </View>
              )}
              onPress={() => setShowClaimDialog(true)}
            />
            
            <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />
            
            {/* Carryforward Explanation */}
            <List.Item
              title={i18n.t('claim_preferences.about_carryforward')}
              description={i18n.t('claim_preferences.about_carryforward_desc')}
              left={props => <List.Icon {...props} icon="information" color={colors.primaryBlue} />}
              onPress={() => {
                Alert.alert(
                  i18n.t('claim_preferences.carryforward_info_title'),
                  i18n.t('claim_preferences.carryforward_info_message'),
                  [{ text: i18n.t('common.ok') }]
                );
              }}
            />
          </Card.Content>
        </Card>

        {/* Account Settings Card */}
        <Card style={[styles.infoCard, { backgroundColor: '#ffffff' }]}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="cog" size={24} color={colors.primaryBlue} />
              <Text style={[styles.cardTitle, { color: colors.primaryBlue }]}>
                Account Settings
              </Text>
            </View>

            <Divider style={[styles.divider, { backgroundColor: colors.gray200, marginVertical: 12 }]} />

            <List.Item
              title="Language Preference"
              description="App interface language"
              left={props => <List.Icon {...props} icon="translate" color={colors.primaryBlue} />}
              right={() => (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: colors.gray600, marginRight: 8 }}>
                    {userProfile.language_preference === 'en' ? 'English' : 'Français'}
                  </Text>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={colors.gray400} />
                </View>
              )}
              onPress={() => setShowLanguageDialog(true)}
            />
            <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />
            
            <List.Item
              title="Charity Communications"
              description="Receive updates from charities"
              left={props => <List.Icon {...props} icon="email" color={colors.primaryBlue} />}
              right={() => (
                <MaterialCommunityIcons 
                  name={userProfile.opt_in_charity_comms ? "toggle-switch" : "toggle-switch-off"} 
                  size={24} 
                  color={userProfile.opt_in_charity_comms ? colors.accentGreen : colors.gray400} 
                />
              )}
              onPress={() => {
                const newValue = !userProfile.opt_in_charity_comms;
                setUserProfile(prev => ({
                  ...prev,
                  opt_in_charity_comms: newValue
                }));
                apiService.updateProfile({ opt_in_charity_comms: newValue });
              }}
            />
            <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />
            
            <List.Item
              title="Change Password"
              description="Update your security credentials"
              left={props => <List.Icon {...props} icon="key" color={colors.primaryBlue} />}
              onPress={() => navigation.navigate('ChangePassword')}
            />
            <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />
            
            <List.Item
              title="Spousal Account Linking"
              description="Link accounts for family donations"
              left={props => <List.Icon {...props} icon="account-group" color={colors.primaryBlue} />}
              right={() => (
                <Text style={{ color: colors.gray500, alignSelf: 'center' }}>
                  {userProfile.spouse_user_id ? 'Linked' : 'Not Linked'}
                </Text>
              )}
              onPress={() => {
                Alert.alert(
                  'Feature Coming Soon',
                  'Spousal account linking will be available in a future update.',
                  [{ text: 'OK' }]
                );
              }}
            />
          </Card.Content>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button 
            mode="outlined"
            onPress={() => setShowLogoutDialog(true)}
            style={[styles.logoutButton, { borderColor: colors.dangerRed }]}
            labelStyle={{ color: colors.dangerRed }}
            icon="logout"
          >
            Logout
          </Button>
          
          <Button 
            mode="contained"
            onPress={() => navigation.navigate('Dashboard')}
            style={[styles.dashboardButton, { backgroundColor: colors.primaryBlue }]}
            labelStyle={{ color: '#ffffff' }}
            icon="home"
          >
            Back to Dashboard
          </Button>
        </View>

        {/* Security Trust Badge */}
        <View style={[styles.trustBadge, { 
          borderColor: colors.accentGreen,
          backgroundColor: 'rgba(16, 185, 129, 0.05)'
        }]}>
          <MaterialCommunityIcons name="shield-lock" size={24} color={colors.accentGreen} />
          <View style={styles.trustContent}>
            <Text style={[styles.trustTitle, { color: colors.gray800 }]}>
              CRA-Compliant Profile
            </Text>
            <Text style={[styles.trustText, { color: colors.gray600 }]}>
              Your information is stored securely and used exclusively for generating official tax receipts as required by the Canada Revenue Agency.
            </Text>
          </View>
        </View>
      </View>

      {/* Language Change Dialog */}
      <Portal>
        <Dialog 
          visible={showLanguageDialog} 
          onDismiss={() => setShowLanguageDialog(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={{ color: colors.primaryBlue }}>
            {userProfile?.language_preference === 'en' ? 'Change Language' : 'Changer la langue'}
          </Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: colors.gray600, marginBottom: 16 }}>
              {userProfile?.language_preference === 'en'
                ? 'Select your preferred language for the app interface and charity information:'
                : 'Sélectionnez votre langue préférée pour l\'interface et les informations des organismes:'}
            </Text>
            <View style={styles.languageOptions}>
              <Button
                mode="outlined"
                onPress={() => handleLanguageChange('en')}
                style={[
                  styles.languageButton,
                  { 
                    borderColor: userProfile.language_preference === 'en' ? colors.primaryBlue : colors.gray300,
                    backgroundColor: userProfile.language_preference === 'en' ? 'rgba(30, 58, 138, 0.1)' : 'transparent'
                  }
                ]}
                icon="flag"
                contentStyle={styles.languageButtonContent}
              >
                English
              </Button>
              <Button
                mode="outlined"
                onPress={() => handleLanguageChange('fr')}
                style={[
                  styles.languageButton,
                  { 
                    borderColor: userProfile.language_preference === 'fr' ? colors.primaryBlue : colors.gray300,
                    backgroundColor: userProfile.language_preference === 'fr' ? 'rgba(30, 58, 138, 0.1)' : 'transparent'
                  }
                ]}
                icon="flag"
                contentStyle={styles.languageButtonContent}
              >
                Français
              </Button>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button 
              onPress={() => setShowLanguageDialog(false)}
              textColor={colors.gray500}
            >
              {userProfile?.language_preference === 'en' ? 'Cancel' : 'Annuler'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Logout Confirmation Dialog */}
      <Portal>
        <Dialog 
          visible={showLogoutDialog} 
          onDismiss={() => setShowLogoutDialog(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={{ color: colors.primaryBlue }}>
            {userProfile?.language_preference === 'en' ? 'Confirm Logout' : 'Confirmer la déconnexion'}
          </Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: colors.gray600 }}>
              {userProfile?.language_preference === 'en'
                ? "Are you sure you want to logout? You'll need to sign in again to access your donation history and tax receipts."
                : 'Êtes-vous sûr de vouloir vous déconnecter? Vous devrez vous reconnecter pour accéder à votre historique de dons et vos reçus fiscaux.'}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button 
              onPress={() => setShowLogoutDialog(false)}
              textColor={colors.gray500}
            >
              {userProfile?.language_preference === 'en' ? 'Cancel' : 'Annuler'}
            </Button>
            <Button 
              onPress={handleLogout}
              textColor={colors.dangerRed}
            >
              {userProfile?.language_preference === 'en' ? 'Logout' : 'Déconnexion'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Claim Year Preference Dialog */}
      <Portal>
        <Dialog
          visible={showClaimDialog}
          onDismiss={() => setShowClaimDialog(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={{ color: colors.secondaryTeal }}>
            {i18n.t('claim_preferences.dialog_title')}
          </Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: colors.gray600, marginBottom: 16 }}>
              {i18n.t('claim_preferences.dialog_message')}
            </Text>
            
            <Button
              mode={claimPreference === 'current' ? 'contained' : 'outlined'}
              onPress={() => {
                saveClaimPreference('current');
                setShowClaimDialog(false);
                Alert.alert('Preference Saved', i18n.t('claim_preferences.preference_saved_current'));
              }}
              style={[styles.claimPreferenceButton, claimPreference === 'current' && { backgroundColor: colors.secondaryTeal }]}
              contentStyle={styles.claimPreferenceContent}
            >
              {i18n.t('claim_preferences.current_year_option', { year: new Date().getFullYear() })}
            </Button>
            
            <Button
              mode={claimPreference === 'next' ? 'contained' : 'outlined'}
              onPress={() => {
                saveClaimPreference('next');
                setShowClaimDialog(false);
                Alert.alert('Preference Saved', i18n.t('claim_preferences.preference_saved_next'));
              }}
              style={[styles.claimPreferenceButton, claimPreference === 'next' && { backgroundColor: colors.secondaryTeal }, { marginTop: 12 }]}
              contentStyle={styles.claimPreferenceContent}
            >
              {i18n.t('claim_preferences.next_year_option', { year: new Date().getFullYear() + 1 })}
            </Button>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowClaimDialog(false)} textColor={colors.gray500}>
              {i18n.t('common.cancel')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Donation Goal Dialog */}
      <Portal>
        <Dialog
          visible={showGoalDialog}
          onDismiss={() => setShowGoalDialog(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={{ color: colors.primaryBlue }}>
            Set Donation Goal
          </Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: colors.gray600, marginBottom: 16 }}>
              Set an annual donation goal to track your progress throughout the year.
            </Text>
            <TextInput
              value={goalInput}
              onChangeText={setGoalInput}
              mode="outlined"
              label="Goal Amount (CAD)"
              keyboardType="numeric"
              style={{ backgroundColor: colors.gray50 }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowGoalDialog(false)} textColor={colors.gray500}>
              Cancel
            </Button>
            <Button onPress={saveDonationGoal} textColor={colors.primaryBlue}>
              Save Goal
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Edit Mode Dialog */}
      {editingField && (
        <Portal>
          <Dialog 
            visible={!!editingField} 
            onDismiss={cancelEdit}
            style={styles.dialog}
          >
            <Dialog.Title style={{ color: colors.primaryBlue }}>
              Edit {editingField?.replace(/_/g, ' ')}
            </Dialog.Title>
            <Dialog.Content>
              <TextInput
                value={editValue}
                onChangeText={setEditValue}
                mode="outlined"
                style={{ backgroundColor: colors.gray50 }}
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button 
                onPress={cancelEdit}
                textColor={colors.gray500}
              >
                Cancel
              </Button>
              <Button 
                onPress={saveEdit}
                textColor={colors.primaryBlue}
              >
                Save
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      )}
    </ScrollView>
  );
};

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
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    marginTop: 10,
  },
  header: {
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  avatar: {
    marginBottom: 16,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 12,
    textAlign: 'center',
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  content: {
    padding: 16,
  },
  infoCard: {
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#eef0f2',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginLeft: 8,
  },
  divider: {
    height: 1,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    width: 100,
  },
  infoValue: {
    fontSize: 14,
    flex: 1,
    marginLeft: 8,
  },
  editInput: {
    flex: 1,
    marginLeft: 8,
    height: 40,
  },
  cityProvinceRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  cityInput: {
    flex: 2,
    marginRight: 12,
  },
  provinceInput: {
    flex: 1,
  },
  
  // Streak Styles
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  streakNumberContainer: {
    alignItems: 'center',
  },
  streakNumber: {
    fontSize: 48,
    fontWeight: '700',
  },
  streakLabel: {
    fontSize: 14,
  },
  streakMessage: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  
  // Goal Styles
  goalContainer: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  goalProgressContainer: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  goalProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  goalStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalCurrent: {
    fontSize: 12,
  },
  goalRemaining: {
    fontSize: 12,
    fontWeight: '500',
  },
  goalAchieved: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Impact Styles
  impactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  impactItem: {
    alignItems: 'center',
    width: '30%',
    marginVertical: 8,
  },
  impactNumber: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
  impactLabel: {
    fontSize: 11,
  },
  
  // Celebration Banner
  celebrationBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    zIndex: 1000,
  },
  celebrationText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e5e7eb',
  },
  additionalStats: {
    marginTop: 8,
  },
  additionalStat: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  additionalLabel: {
    fontSize: 13,
    fontWeight: '600',
    width: 120,
  },
  additionalValue: {
    fontSize: 13,
    flex: 1,
  },
  
  // Tax Claiming Preferences Styles
  unclaimedSummaryBox: {
    marginBottom: 12,
  },
  unclaimedSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unclaimedSummaryText: {
    fontSize: 13,
    marginLeft: 8,
  },
  unclaimedSummarySubtext: {
    marginLeft: 28,
  },
  claimPreferenceButton: {
    borderRadius: 8,
    marginBottom: 8,
  },
  claimPreferenceContent: {
    paddingVertical: 8,
  },
  
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 24,
  },
  logoutButton: {
    flex: 1,
    marginRight: 8,
    borderWidth: 1,
  },
  dashboardButton: {
    flex: 1,
    marginLeft: 8,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 30,
  },
  trustContent: {
    flex: 1,
    marginLeft: 12,
  },
  trustTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  trustText: {
    fontSize: 13,
    lineHeight: 18,
  },
  dialog: {
    borderRadius: 12,
  },
  languageOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  languageButton: {
    flex: 1,
    marginHorizontal: 8,
    borderWidth: 2,
  },
  languageButtonContent: {
    paddingVertical: 8,
  },
});

export default ProfileScreen;