// screens/main/DashboardScreen.js
import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
  Dimensions,
  Animated,
} from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  Button, 
  ActivityIndicator, 
  Text,
  Chip,
  IconButton,
  Surface,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import apiService from '../../services/apiService';
import { AuthContext } from '../../contexts/AuthContext';
import { LanguageContext } from '../../contexts/LanguageContext';
import VoucherContext from '../../contexts/VoucherContext';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import i18n from '../../i18n';

const { width } = Dimensions.get('window');

// ==================== UTILITIES ====================

// Progress colors based on percentage
const getProgressColor = (percentage) => {
  if (percentage < 50) return '#1e3a8a';
  if (percentage < 80) return '#0d9488';
  if (percentage < 100) return '#f59e0b';
  return '#10b981';
};

// Milestone levels
const MILESTONES = [25, 50, 100, 200, 500, 1000];

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

// Get bar width percentage for chart
const getBarWidth = (amount, maxAmount) => {
  if (maxAmount === 0) return 0;
  return Math.min(100, (amount / maxAmount) * 100);
};

const DashboardScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const { voucherStats, refreshVoucherStats } = useContext(VoucherContext);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentVouchers, setRecentVouchers] = useState([]);
  const [taxYear, setTaxYear] = useState(new Date().getFullYear());
  const [userProfile, setUserProfile] = useState(null);
  
  // State for expiring unclaimed donations alert
  const [expiringUnclaimed, setExpiringUnclaimed] = useState(null);
  const [expiringLoading, setExpiringLoading] = useState(false);
  
  // State for milestone celebration
  const [showMilestone, setShowMilestone] = useState(false);
  const [milestoneAmount, setMilestoneAmount] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  
  // State for year-over-year chart data
  const [yearlyData, setYearlyData] = useState([]);
  const [yearlyLoading, setYearlyLoading] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      initializeDashboard();
      return () => {};
    }, [])
  );

  useEffect(() => {
    loadUserProfile();
  }, []);

  useEffect(() => {
    if (userProfile || user) {
      loadDashboardData();
    }
  }, [userProfile]);

  // Check for milestone when voucherStats changes
  useEffect(() => {
    if (voucherStats?.totalAmount) {
      checkMilestone(voucherStats.totalAmount);
    }
  }, [voucherStats?.totalAmount]);

  const initializeDashboard = () => {
    loadDashboardData();
    loadExpiringUnclaimed();
    loadYearlyData();
  };

  const loadUserProfile = async () => {
    try {
      const profileData = await apiService.loadUserData();
      setUserProfile(profileData);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      await loadRecentVouchers();
      await refreshVoucherStats();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert(
        i18n.t('common.error'),
        i18n.t('dashboard.load_error'),
        [{ text: i18n.t('common.ok') }]
      );
    } finally {
      setLoading(false);
    }
  };

  // Load year-over-year chart data
  const loadYearlyData = async () => {
    try {
      setYearlyLoading(true);
      const currentYearNum = new Date().getFullYear();
      const years = [currentYearNum - 4, currentYearNum - 3, currentYearNum - 2, currentYearNum - 1, currentYearNum];
      const data = [];
      
      for (const year of years) {
        try {
          const response = await apiService.getCharityBuckets(year);
          if (response.success && response.summary) {
            data.push({
              year,
              amount: response.summary.total_donated || 0,
              transactions: response.summary.total_transactions || 0,
            });
          } else {
            data.push({ year, amount: 0, transactions: 0 });
          }
        } catch (e) {
          data.push({ year, amount: 0, transactions: 0 });
        }
      }
      
      setYearlyData(data);
    } catch (error) {
      console.error('Error loading yearly data:', error);
    } finally {
      setYearlyLoading(false);
    }
  };

  // Load expiring unclaimed donations for alert card
  const loadExpiringUnclaimed = async () => {
    try {
      setExpiringLoading(true);
      const response = await apiService.getUnclaimedDonations();
      
      if (response.success && response.unclaimed) {
        const currentYear = new Date().getFullYear();
        const expiring = response.unclaimed.filter(
          item => (item.expiry_year - currentYear) <= 1 && item.expiry_year >= currentYear
        );
        
        if (expiring.length > 0) {
          const totalExpiring = expiring.reduce((sum, item) => sum + item.total_amount, 0);
          const yearsList = expiring.map(item => item.donation_year);
          
          setExpiringUnclaimed({
            years: yearsList,
            yearsText: yearsList.join(', '),
            total: totalExpiring,
            count: expiring.length
          });
        } else {
          setExpiringUnclaimed(null);
        }
      }
    } catch (error) {
      console.error('Error loading expiring unclaimed:', error);
    } finally {
      setExpiringLoading(false);
    }
  };

  // Check and display milestone celebration
  const checkMilestone = async (currentTotal) => {
    try {
      const lastMilestone = await AsyncStorage.getItem('last_milestone_reached');
      const lastValue = lastMilestone ? parseFloat(lastMilestone) : 0;
      
      const crossedMilestones = MILESTONES.filter(m => m > lastValue && m <= currentTotal);
      
      if (crossedMilestones.length > 0) {
        const newMilestone = Math.max(...crossedMilestones);
        setMilestoneAmount(newMilestone);
        setShowMilestone(true);
        
        await AsyncStorage.setItem('last_milestone_reached', newMilestone.toString());
        
        Animated.sequence([
          Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.delay(4000),
          Animated.timing(fadeAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]).start(() => setShowMilestone(false));
      }
    } catch (error) {
      console.error('Error checking milestone:', error);
    }
  };

  const loadRecentVouchers = async () => {
    try {
      const response = await apiService.getVoucherLedger();
      if (response.success && response.vouchers) {
        const recent = response.vouchers.slice(0, 5);
        setRecentVouchers(recent);
        await AsyncStorage.setItem('recent_vouchers', JSON.stringify(response.vouchers));
      } else {
        const vouchersData = await AsyncStorage.getItem('recent_vouchers');
        if (vouchersData) {
          const vouchers = JSON.parse(vouchersData);
          setRecentVouchers(vouchers.slice(0, 5));
        }
      }
    } catch (error) {
      console.error('Error loading recent vouchers:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    await loadExpiringUnclaimed();
    await loadYearlyData();
    setRefreshing(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.locale === 'fr' ? 'fr-CA' : 'en-CA', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // ==================== RENDER PROGRESS CARD ====================
  const renderProgressCard = () => {
    const totalDonated = voucherStats?.totalAmount || 0;
    const threshold = 200;
    const remaining = Math.max(0, threshold - totalDonated);
    const percentage = Math.min(100, (totalDonated / threshold) * 100);
    const progressColor = getProgressColor(percentage);
    const hasReachedThreshold = totalDonated >= threshold;
    
    return (
      <Card style={[styles.progressCard, { backgroundColor: '#ffffff' }]}>
        <Card.Content>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressTitle, { color: '#1e3a8a' }]}>
              {taxYear} {i18n.t('progress.goal_title_suffix') || 'DONATION GOAL'}
            </Text>
            {hasReachedThreshold && (
              <Chip 
                style={[styles.thresholdChip, { backgroundColor: '#10b981' }]}
                textStyle={{ color: '#ffffff', fontSize: 11 }}
                icon="check-circle"
              >
                {i18n.t('threshold.already_reached')}
              </Chip>
            )}
          </View>
          
          <View style={styles.progressBarContainer}>
            <View 
              style={[
                styles.progressBarFill, 
                { width: `${percentage}%`, backgroundColor: progressColor }
              ]} 
            />
          </View>
          
          <View style={styles.progressStats}>
            <View style={styles.progressStat}>
              <Text style={[styles.progressStatValue, { color: progressColor }]}>
                {formatCurrency(totalDonated)}
              </Text>
              <Text style={[styles.progressStatLabel, { color: '#6b7280' }]}>
                {i18n.t('progress.of_threshold', { threshold: formatCurrency(threshold) })}
              </Text>
            </View>
            <View style={styles.progressStatDivider} />
            <View style={styles.progressStat}>
              <Text style={[styles.progressStatValue, { color: '#f59e0b' }]}>
                {Math.round(percentage)}%
              </Text>
              <Text style={[styles.progressStatLabel, { color: '#6b7280' }]}>
                Complete
              </Text>
            </View>
          </View>
          
          {!hasReachedThreshold && remaining > 0 && (
            <Surface style={[styles.motivationCard, { backgroundColor: '#fef3c7' }]} elevation={0}>
              <MaterialCommunityIcons name="fire" size={20} color="#f59e0b" />
              <Text style={[styles.motivationText, { color: '#92400e' }]}>
                {i18n.t('progress.remaining_singular', { remaining: formatCurrency(remaining) })} {i18n.t('progress.to_reach_29_percent')}
              </Text>
            </Surface>
          )}
          
          {hasReachedThreshold && (
            <Surface style={[styles.motivationCard, { backgroundColor: '#d1fae5' }]} elevation={0}>
              <MaterialCommunityIcons name="star" size={20} color="#10b981" />
              <Text style={[styles.motivationText, { color: '#065f46' }]}>
                {i18n.t('progress.qualified_for_29_percent')}
              </Text>
            </Surface>
          )}
        </Card.Content>
      </Card>
    );
  };

  // ==================== RENDER MILESTONE CELEBRATION ====================
  const renderMilestoneCelebration = () => {
    if (!showMilestone || !milestoneAmount) return null;
    
    let milestoneColor = '#10b981';
    let milestoneIcon = 'trophy';
    if (milestoneAmount >= 500) {
      milestoneColor = '#8b5cf6';
      milestoneIcon = 'crown';
    } else if (milestoneAmount >= 200) {
      milestoneColor = '#fbbf24';
      milestoneIcon = 'star';
    } else if (milestoneAmount >= 100) {
      milestoneColor = '#f59e0b';
      milestoneIcon = 'medal';
    }
    
    return (
      <Animated.View style={[styles.milestoneOverlay, { opacity: fadeAnim }]}>
        <LinearGradient
          colors={[milestoneColor, `${milestoneColor}cc`]}
          style={styles.milestoneCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <MaterialCommunityIcons name={milestoneIcon} size={32} color="#ffffff" />
          <View style={styles.milestoneContent}>
            <Text style={styles.milestoneTitle}>
              {i18n.t('milestone.congrats')}
            </Text>
            <Text style={styles.milestoneMessage}>
              {i18n.t('milestone.reached', { amount: formatCurrency(milestoneAmount) })}
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  // ==================== RENDER YEAR-OVER-YEAR CHART ====================
  const renderYearlyChart = () => {
    if (yearlyLoading) {
      return (
        <Card style={[styles.chartCard, { backgroundColor: '#ffffff' }]}>
          <Card.Content style={styles.chartLoadingContainer}>
            <ActivityIndicator size="small" color="#1e3a8a" />
            <Text style={[styles.chartLoadingText, { color: '#6b7280' }]}>
              Loading donation trends...
            </Text>
          </Card.Content>
        </Card>
      );
    }

    const hasData = yearlyData.some(d => d.amount > 0);
    const maxAmount = Math.max(...yearlyData.map(d => d.amount), 1);
    
    // Calculate growth
    const lastYear = yearlyData[yearlyData.length - 2]?.amount || 0;
    const thisYear = yearlyData[yearlyData.length - 1]?.amount || 0;
    let growthText = '';
    let growthColor = '#6b7280';
    let growthIcon = 'minus';
    
    if (lastYear > 0) {
      const growthPercent = ((thisYear - lastYear) / lastYear) * 100;
      if (growthPercent > 0) {
        growthText = i18n.t('yearly.growth_positive', { percent: Math.round(growthPercent) });
        growthColor = '#10b981';
        growthIcon = 'trending-up';
      } else if (growthPercent < 0) {
        growthText = i18n.t('yearly.growth_negative', { percent: Math.abs(Math.round(growthPercent)) });
        growthColor = '#ef4444';
        growthIcon = 'trending-down';
      } else {
        growthText = i18n.t('yearly.growth_neutral');
        growthColor = '#6b7280';
        growthIcon = 'minus';
      }
    }

    if (!hasData) {
      return (
        <Card style={[styles.chartCard, { backgroundColor: '#ffffff' }]}>
          <Card.Content>
            <View style={styles.chartHeader}>
              <MaterialCommunityIcons name="chart-line" size={20} color="#0d9488" />
              <Text style={[styles.chartTitle, { color: '#0d9488' }]}>
                {i18n.t('yearly.title')}
              </Text>
            </View>
            <View style={styles.chartEmptyContainer}>
              <MaterialCommunityIcons name="chart-line" size={48} color="#9ca3af" />
              <Text style={[styles.chartEmptyText, { color: '#6b7280' }]}>
                {i18n.t('yearly.no_data')}
              </Text>
            </View>
          </Card.Content>
        </Card>
      );
    }

    return (
      <Card style={[styles.chartCard, { backgroundColor: '#ffffff' }]}>
        <Card.Content>
          <View style={styles.chartHeader}>
            <MaterialCommunityIcons name="chart-line" size={20} color="#0d9488" />
            <Text style={[styles.chartTitle, { color: '#0d9488' }]}>
              {i18n.t('yearly.title')}
            </Text>
          </View>
          
          {growthText && (
            <View style={[styles.chartGrowthContainer, { backgroundColor: `${growthColor}10` }]}>
              <MaterialCommunityIcons name={growthIcon} size={16} color={growthColor} />
              <Text style={[styles.chartGrowth, { color: growthColor }]}>
                {growthText}
              </Text>
            </View>
          )}
          
          <View style={styles.chartBarsContainer}>
            {yearlyData.map((item, index) => {
              const barWidth = getBarWidth(item.amount, maxAmount);
              const barColor = getProgressColor((item.amount / maxAmount) * 100);
              const isCurrentYear = index === yearlyData.length - 1;
              
              return (
                <View key={item.year} style={styles.chartBarRow}>
                  <Text style={[styles.chartBarYear, { color: isCurrentYear ? '#1e3a8a' : '#4b5563' }]}>
                    {item.year}
                  </Text>
                  <View style={styles.chartBarBackground}>
                    <View 
                      style={[
                        styles.chartBarFill, 
                        { width: `${barWidth}%`, backgroundColor: barColor }
                      ]} 
                    />
                  </View>
                  <Text style={[styles.chartBarAmount, { color: isCurrentYear ? '#1e3a8a' : '#4b5563' }]}>
                    {formatCurrency(item.amount)}
                  </Text>
                </View>
              );
            })}
          </View>
          
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#1e3a8a' }]} />
              <Text style={[styles.legendText, { color: '#6b7280' }]}>Annual Donations</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#10b981' }]} />
              <Text style={[styles.legendText, { color: '#6b7280' }]}>Current Year</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  // ==================== RENDER EXPIRING ALERT CARD ====================
  const renderExpiringAlert = () => {
    if (!expiringUnclaimed || expiringLoading) return null;
    
    return (
      <Card style={[styles.expiringCard, { backgroundColor: '#ffffff', borderLeftWidth: 4, borderLeftColor: '#f59e0b' }]}>
        <Card.Content>
          <View style={styles.expiringHeader}>
            <MaterialCommunityIcons name="alert-circle" size={28} color="#f59e0b" />
            <Text style={[styles.expiringTitle, { color: '#f59e0b' }]}>
              {i18n.t('expiring_alert.title')}
            </Text>
          </View>
          <Text style={[styles.expiringText, { color: '#374151' }]}>
            {i18n.t('expiring_alert.message', { 
              amount: formatCurrency(expiringUnclaimed.total),
              years: expiringUnclaimed.yearsText
            })}
          </Text>
          <Text style={[styles.expiringSubtext, { color: '#6b7280', marginTop: 8 }]}>
            {i18n.t('expiring_alert.submessage')}
          </Text>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('Ledger')}
            style={[styles.expiringButton, { backgroundColor: '#f59e0b', marginTop: 12 }]}
            labelStyle={{ color: '#ffffff' }}
            icon="bank"
            compact
          >
            {i18n.t('expiring_alert.button')}
          </Button>
        </Card.Content>
      </Card>
    );
  };

  // ==================== RENDER RECENT VOUCHERS CARD ====================
  const renderRecentVouchersCard = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Title style={styles.cardTitle}>📋 {i18n.t('dashboard.recent_vouchers')}</Title>
        {recentVouchers.length > 0 ? (
          recentVouchers.map((voucher, index) => (
            <View key={voucher.id || index} style={styles.voucherItem}>
              <View style={styles.voucherHeader}>
                <Text style={styles.voucherCharity} numberOfLines={1}>
                  {voucher.charity_name || `Charity ${voucher.charity_id}`}
                </Text>
                <Text style={styles.voucherAmount}>{formatCurrency(voucher.amount)}</Text>
              </View>
              <View style={styles.voucherDetails}>
                <Text style={styles.voucherDate}>{formatDate(voucher.timestamp)}</Text>
                <Text style={styles.voucherLocation}>📍 {voucher.location || i18n.t('dashboard.unknown_location')}</Text>
              </View>
              {index < recentVouchers.length - 1 && <View style={styles.voucherDivider} />}
            </View>
          ))
        ) : (
          <View style={styles.emptyBuckets}>
            <Text style={styles.emptyBucketsSubtext}>No recent donations</Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );

  // ==================== RENDER USER GREETING ====================
  const renderUserGreeting = () => {
    const displayUser = userProfile || user;
    
    return (
      <LinearGradient
        colors={['#1e3a8a', '#1e40af']}
        style={styles.heroGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.userGreetingRow}>
          <View style={styles.userInfo}>
            <Text style={styles.welcomeTitle}>
              {i18n.t('dashboard.welcome_user', { 
                name: displayUser?.legal_first_name || displayUser?.email?.split('@')[0] || 'Donor' 
              })}
            </Text>
            <Text style={styles.heroSubtitle}>
              {displayUser?.address_city ? `${displayUser.address_city}, ${displayUser.address_province}` : i18n.t('dashboard.verified')}
            </Text>
          </View>
          <Chip style={styles.userChip} textStyle={styles.userChipText} icon="check-circle">
            {i18n.t('dashboard.verified')}
          </Chip>
        </View>
        
        <View style={styles.userStatsRow}>
          <View style={styles.userStat}>
            <Text style={styles.userStatNumber}>{formatNumber(voucherStats?.totalVouchers || 0)}</Text>
            <Text style={styles.userStatLabel}>{i18n.t('dashboard.total_vouchers')}</Text>
          </View>
          <View style={styles.userStatDivider} />
          <View style={styles.userStat}>
            <Text style={styles.userStatNumber}>{formatNumber(0)}</Text>
            <Text style={styles.userStatLabel}>{i18n.t('dashboard.charities')}</Text>
          </View>
          <View style={styles.userStatDivider} />
          <View style={styles.userStat}>
            <Text style={styles.userStatNumber}>{formatCurrency(voucherStats?.totalAmount || 0)}</Text>
            <Text style={styles.userStatLabel}>{i18n.t('dashboard.total_donated')}</Text>
          </View>
        </View>
      </LinearGradient>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1e3a8a" />
        <Text style={styles.loadingText}>{i18n.t('loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh} 
          colors={['#1e3a8a']} 
          tintColor="#1e3a8a"
        />
      }
    >
      {renderMilestoneCelebration()}
      {renderUserGreeting()}
      {renderProgressCard()}
      {renderYearlyChart()}
      {renderExpiringAlert()}
      {recentVouchers.length > 0 && renderRecentVouchersCard()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f9fafb' 
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#f9fafb' 
  },
  loadingText: { 
    marginTop: 16, 
    fontSize: 16, 
    color: '#6b7280' 
  },
  heroGradient: { 
    padding: 24, 
    marginBottom: 16 
  },
  welcomeTitle: { 
    fontSize: 28, 
    fontWeight: '700', 
    color: '#ffffff', 
    marginBottom: 4 
  },
  heroSubtitle: { 
    fontSize: 16, 
    color: 'rgba(255, 255, 255, 0.9)' 
  },
  userGreetingRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: 20 
  },
  userInfo: { 
    flex: 1 
  },
  userChip: { 
    backgroundColor: 'rgba(255, 255, 255, 0.2)', 
    borderColor: 'rgba(255, 255, 255, 0.3)' 
  },
  userChipText: { 
    color: '#ffffff', 
    fontSize: 12 
  },
  userStatsRow: { 
    flexDirection: 'row', 
    backgroundColor: 'rgba(255, 255, 255, 0.1)', 
    borderRadius: 8, 
    paddingVertical: 12 
  },
  userStat: { 
    flex: 1, 
    alignItems: 'center' 
  },
  userStatNumber: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#ffffff' 
  },
  userStatLabel: { 
    fontSize: 11, 
    color: 'rgba(255, 255, 255, 0.8)', 
    marginTop: 4 
  },
  userStatDivider: { 
    width: 1, 
    backgroundColor: 'rgba(255, 255, 255, 0.2)' 
  },

  // Progress Card Styles
  progressCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#eef0f2',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  thresholdChip: {
    height: 28,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressStat: {
    flex: 1,
    alignItems: 'center',
  },
  progressStatValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  progressStatLabel: {
    fontSize: 12,
  },
  progressStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e5e7eb',
  },
  motivationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 0,
  },
  motivationText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },

  // Milestone Celebration Styles
  milestoneOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: 16,
    paddingTop: 60,
  },
  milestoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    elevation: 5,
  },
  milestoneContent: {
    flex: 1,
    marginLeft: 12,
  },
  milestoneTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  milestoneMessage: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },

  // Chart Styles
  chartCard: { 
    marginHorizontal: 16, 
    marginBottom: 16, 
    borderRadius: 12, 
    elevation: 2, 
    borderWidth: 1, 
    borderColor: '#eef0f2' 
  },
  chartHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  chartTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    marginLeft: 8, 
    flex: 1 
  },
  chartGrowthContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 8, 
    borderRadius: 8, 
    marginBottom: 12 
  },
  chartGrowth: { 
    fontSize: 13, 
    marginLeft: 6 
  },
  chartBarsContainer: { 
    marginTop: 8 
  },
  chartBarRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  chartBarYear: { 
    width: 50, 
    fontSize: 13, 
    fontWeight: '500' 
  },
  chartBarBackground: { 
    flex: 1, 
    height: 24, 
    backgroundColor: '#e5e7eb', 
    borderRadius: 4, 
    overflow: 'hidden', 
    marginHorizontal: 8 
  },
  chartBarFill: { 
    height: '100%', 
    borderRadius: 4 
  },
  chartBarAmount: { 
    width: 65, 
    fontSize: 12, 
    textAlign: 'right' 
  },
  chartLegend: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    marginTop: 12 
  },
  legendItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginHorizontal: 12 
  },
  legendColor: { 
    width: 12, 
    height: 12, 
    borderRadius: 6, 
    marginRight: 6 
  },
  legendText: { 
    fontSize: 11 
  },
  chartLoadingContainer: { 
    alignItems: 'center', 
    paddingVertical: 32 
  },
  chartLoadingText: { 
    marginTop: 12, 
    fontSize: 14 
  },
  chartEmptyContainer: { 
    alignItems: 'center', 
    paddingVertical: 32 
  },
  chartEmptyText: { 
    marginTop: 12, 
    fontSize: 14, 
    textAlign: 'center' 
  },

  // Expiring Card Styles
  expiringCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#eef0f2',
  },
  expiringHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  expiringTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  expiringText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  expiringSubtext: {
    fontSize: 12,
    lineHeight: 16,
  },
  expiringButton: {
    borderRadius: 8,
  },

  // Card Styles
  card: { 
    marginHorizontal: 16, 
    marginBottom: 16, 
    borderRadius: 12, 
    elevation: 2, 
    borderWidth: 1, 
    borderColor: '#e5e7eb', 
    backgroundColor: '#ffffff' 
  },
  cardTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#1f2937' 
  },
  emptyBuckets: { 
    alignItems: 'center', 
    paddingVertical: 32 
  },
  emptyBucketsSubtext: { 
    fontSize: 14, 
    color: '#9ca3af' 
  },
  voucherItem: { 
    paddingVertical: 12 
  },
  voucherHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 4 
  },
  voucherCharity: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#1f2937', 
    flex: 1, 
    marginRight: 8 
  },
  voucherAmount: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#10b981' 
  },
  voucherDetails: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 4 
  },
  voucherDate: { 
    fontSize: 12, 
    color: '#6b7280' 
  },
  voucherLocation: { 
    fontSize: 11, 
    color: '#9ca3af' 
  },
  voucherDivider: { 
    height: 1, 
    backgroundColor: '#e5e7eb', 
    marginTop: 12 
  },
});

export default DashboardScreen;