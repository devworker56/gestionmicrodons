// screens/main/VoucherLedgerScreen.js
import React, { useContext, useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import {
  Text,
  Card,
  List,
  Divider,
  Button,
  Chip,
  useTheme,
  ActivityIndicator,
  Checkbox,
  Portal,
  Dialog,
  IconButton,
  Surface,
} from 'react-native-paper';
import { LanguageContext } from '../../contexts/LanguageContext';
import { AuthContext } from '../../contexts/AuthContext';
import { useVoucher } from '../../contexts/VoucherContext';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import i18n from '../../i18n';

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

// Format number with thousand separators
const formatNumber = (num) => {
  if (num === null || num === undefined) return '0';
  if (i18n.locale === 'fr') {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// Get progress color based on percentage
const getProgressColor = (percentage) => {
  if (percentage < 50) return '#1e3a8a';
  if (percentage < 80) return '#0d9488';
  if (percentage < 100) return '#f59e0b';
  return '#10b981';
};

// Calculate tax credit for a given amount
const calculateTaxCredit = (amount) => {
  if (!amount || amount <= 0) return 0;
  const firstTier = Math.min(amount, 200) * 0.15;
  const secondTier = Math.max(0, amount - 200) * 0.29;
  return firstTier + secondTier;
};

export default function VoucherLedgerScreen({ navigation }) {
  const theme = useTheme();
  const { t } = useContext(LanguageContext);
  const { user } = useContext(AuthContext);
  const {
    vouchers,
    charityBuckets,
    voucherStats,
    loading,
    refreshVoucherStats,
    changeTaxYear,
    currentYear,
    unclaimedDonations,
    unclaimedSummary,
    unclaimedLoading,
    loadUnclaimedDonations,
    claimDonations,
  } = useVoucher();

  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [displayVouchers, setDisplayVouchers] = useState([]);
  const [displayBuckets, setDisplayBuckets] = useState([]);
  const [displayStats, setDisplayStats] = useState({
    totalVouchers: 0,
    totalAmount: 0,
    charityCount: 0,
    lastTransaction: null
  });

  // Carryforward state
  const [selectedDonationYears, setSelectedDonationYears] = useState({});
  const [optimizerVisible, setOptimizerVisible] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [optimizerData, setOptimizerData] = useState(null);
  
  // Tooltip visibility
  const [tooltipVisible, setTooltipVisible] = useState(false);

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

  // Update display data when context data changes
  useEffect(() => {
    if (vouchers && vouchers.length > 0) {
      setDisplayVouchers(vouchers);
    } else {
      setDisplayVouchers([]);
    }

    if (charityBuckets && charityBuckets.length > 0) {
      setDisplayBuckets(charityBuckets);
    } else {
      setDisplayBuckets([]);
    }

    if (voucherStats) {
      setDisplayStats(voucherStats);
    }
  }, [vouchers, charityBuckets, voucherStats]);

  // Refresh unclaimed data on focus
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        loadUnclaimedDonations();
      }
      return () => {};
    }, [user?.id])
  );

  const filterOptions = [
    { id: 'all', label: i18n.t('voucher_ledger.all') },
    { id: 'year', label: i18n.t('voucher_ledger.this_year') },
    { id: 'month', label: i18n.t('voucher_ledger.this_month') },
    { id: 'charity', label: i18n.t('voucher_ledger.by_charity') },
  ];

  const getAvailableYears = () => {
    const currentYearNum = new Date().getFullYear();
    const years = [];
    for (let year = 2020; year <= currentYearNum + 1; year++) {
      years.push(year);
    }
    return years;
  };

  const years = getAvailableYears();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshVoucherStats();
    await loadUnclaimedDonations();
    setRefreshing(false);
  }, [refreshVoucherStats, loadUnclaimedDonations]);

  const handleYearChange = async (year) => {
    setSelectedYear(year);
    await changeTaxYear(year);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.locale === 'fr' ? 'fr-CA' : 'en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateHash = (hash) => {
    if (!hash) return 'N/A';
    if (hash.length <= 16) return hash;
    return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
  };

  // ==================== CARRYFORWARD FUNCTIONS ====================

  const toggleYearSelection = (donationYear) => {
    setSelectedDonationYears(prev => ({
      ...prev,
      [donationYear]: !prev[donationYear]
    }));
  };

  const selectAllYears = () => {
    const allSelected = {};
    unclaimedDonations.forEach(item => {
      allSelected[item.donation_year] = true;
    });
    setSelectedDonationYears(allSelected);
  };

  const clearSelections = () => {
    setSelectedDonationYears({});
  };

  // Enhanced runOptimizer that includes current year
  const runOptimizer = () => {
    const selectedYearsList = unclaimedDonations.filter(
      item => selectedDonationYears[item.donation_year]
    );

    if (selectedYearsList.length === 0) {
      Alert.alert('No Selection', 'Please select at least one year to optimize.');
      return;
    }

    const currentYearTotal = voucherStats?.totalAmount || 0;
    const totalAmount = selectedYearsList.reduce((sum, item) => sum + item.total_amount, 0);
    const combinedTotal = totalAmount + currentYearTotal;

    const separateSavings = selectedYearsList.reduce(
      (sum, item) => sum + calculateTaxCredit(item.total_amount),
      0
    ) + calculateTaxCredit(currentYearTotal);

    const combinedSavings = calculateTaxCredit(combinedTotal);
    const extraSavings = combinedSavings - separateSavings;

    setOptimizerData({
      years: selectedYearsList,
      totalAmount,
      currentYearTotal,
      combinedTotal,
      separateSavings,
      combinedSavings,
      extraSavings,
      isWorthIt: extraSavings > 0
    });

    setOptimizerVisible(true);
  };

  const applyOptimizerStrategy = async () => {
    if (!optimizerData) return;

    const currentYearNum = new Date().getFullYear();
    const claimYear = currentYearNum;
    const donationYears = optimizerData.years.map(item => item.donation_year);

    setClaiming(true);
    setOptimizerVisible(false);

    try {
      const result = await claimDonations(claimYear, donationYears);

      if (result.success) {
        Alert.alert(
          '✅ Claim Successful',
          `Successfully claimed ${result.claimed_count || donationYears.length} donations for tax year ${claimYear}.\n\n` +
          `Total claimed: ${formatCurrency(optimizerData.totalAmount)}\n` +
          `Estimated tax savings: ${formatCurrency(optimizerData.combinedSavings)}\n\n` +
          `These donations will now appear on your tax receipts for ${claimYear}.`,
          [
            {
              text: 'OK',
              onPress: () => {
                setSelectedDonationYears({});
                loadUnclaimedDonations();
                refreshVoucherStats();
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Claim Failed',
          result.message || 'Failed to claim donations. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error applying claim:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  const isExpiringSoon = (expiryYear) => {
    const currentYearNum = new Date().getFullYear();
    return (expiryYear - currentYearNum) <= 1;
  };

  const getExpiryInfo = (expiryYear) => {
    const currentYearNum = new Date().getFullYear();
    const yearsLeft = expiryYear - currentYearNum;

    if (yearsLeft <= 0) {
      return { text: i18n.t('expiry.expired'), color: colors.dangerRed, icon: 'alert-circle' };
    } else if (yearsLeft === 1) {
      return { text: i18n.t('expiry.warning'), color: colors.warningOrange, icon: 'alert' };
    } else {
      return { text: i18n.t('expiry.safe', { year: expiryYear }), color: colors.gray500, icon: 'calendar-clock' };
    }
  };

  const getFilteredVouchers = () => {
    if (!displayVouchers || displayVouchers.length === 0) return [];

    const now = new Date();
    const currentYearNum = now.getFullYear();
    const currentMonth = now.getMonth();

    switch (activeFilter) {
      case 'year':
        return displayVouchers.filter(v => {
          const vDate = new Date(v.transaction_time || v.timestamp);
          return vDate.getFullYear() === currentYearNum;
        });
      case 'month':
        return displayVouchers.filter(v => {
          const vDate = new Date(v.transaction_time || v.timestamp);
          return vDate.getFullYear() === currentYearNum && vDate.getMonth() === currentMonth;
        });
      case 'charity':
        return displayVouchers;
      case 'all':
      default:
        return displayVouchers;
    }
  };

  const getVouchersByCharity = () => {
    if (!displayVouchers || displayVouchers.length === 0) return {};

    const grouped = {};
    displayVouchers.forEach(voucher => {
      const charityId = voucher.charity_id;
      if (!grouped[charityId]) {
        grouped[charityId] = {
          charity_id: charityId,
          charity_name: voucher.charity_name || `Charity ${charityId}`,
          business_number: voucher.business_number,
          vouchers: [],
          total: 0
        };
      }
      grouped[charityId].vouchers.push(voucher);
      grouped[charityId].total += parseFloat(voucher.amount || 0);
    });
    return grouped;
  };

  const filteredVouchers = getFilteredVouchers();
  const vouchersByCharity = getVouchersByCharity();
  const selectedCount = Object.values(selectedDonationYears).filter(v => v === true).length;
  const hasSelections = selectedCount > 0;

  // ==================== Educational Tooltip Dialog ====================
  const renderTooltipDialog = () => {
    return (
      <Portal>
        <Dialog visible={tooltipVisible} onDismiss={() => setTooltipVisible(false)} style={styles.tooltipDialog}>
          <Dialog.Title style={{ color: colors.primaryBlue }}>
            📊 About Your Giving Journey
          </Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: colors.gray700, marginBottom: 12 }}>
              Your unclaimed donations from previous years appear in the Donation Bank below.
            </Text>
            <View style={styles.tooltipSection}>
              <MaterialCommunityIcons name="bank" size={20} color={colors.warningOrange} />
              <Text style={{ color: colors.gray600, marginLeft: 8, flex: 1 }}>
                <Text style={{ fontWeight: '600' }}>Donation Bank:</Text> Unclaimed donations from previous years can be carried forward.
              </Text>
            </View>
            <View style={styles.tooltipSection}>
              <MaterialCommunityIcons name="calculator" size={20} color={colors.secondaryTeal} />
              <Text style={{ color: colors.gray600, marginLeft: 8, flex: 1 }}>
                <Text style={{ fontWeight: '600' }}>Optimizer:</Text> Combine multiple years to reach the $200 threshold for higher tax credits.
              </Text>
            </View>
            <View style={styles.tooltipSection}>
              <MaterialCommunityIcons name="calendar-clock" size={20} color={colors.dangerRed} />
              <Text style={{ color: colors.gray600, marginLeft: 8, flex: 1 }}>
                <Text style={{ fontWeight: '600' }}>Expiry:</Text> Donations expire 5 years after the donation year.
              </Text>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setTooltipVisible(false)} textColor={colors.primaryBlue}>
              Got it
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    );
  };

  // ==================== Donation Bank Card ====================
  const renderDonationBank = () => {
    if (unclaimedLoading) {
      return (
        <Card style={[styles.donationBankCard, { backgroundColor: '#ffffff' }]}>
          <Card.Content style={styles.unclaimedLoadingContainer}>
            <ActivityIndicator size="small" color={colors.primaryBlue} />
            <Text style={[styles.unclaimedLoadingText, { color: colors.gray500 }]}>
              {i18n.t('donation_bank.loading')}
            </Text>
          </Card.Content>
        </Card>
      );
    }

    if (!unclaimedDonations || unclaimedDonations.length === 0) {
      return (
        <Card style={[styles.donationBankCard, { backgroundColor: '#ffffff' }]}>
          <Card.Content style={styles.emptyUnclaimedContainer}>
            <MaterialCommunityIcons name="bank-outline" size={48} color={colors.gray400} />
            <Text style={[styles.emptyUnclaimedTitle, { color: colors.gray700 }]}>
              {i18n.t('donation_bank.no_unclaimed')}
            </Text>
            <Text style={[styles.emptyUnclaimedText, { color: colors.gray500 }]}>
              {i18n.t('donation_bank.no_unclaimed_desc')}
            </Text>
          </Card.Content>
        </Card>
      );
    }

    const currentYearTotal = voucherStats?.totalAmount || 0;
    const thresholdProgress = Math.min(100, (currentYearTotal / 200) * 100);

    return (
      <Card style={[styles.donationBankCard, { backgroundColor: '#ffffff' }]}>
        <Card.Content>
          <View style={styles.donationBankHeader}>
            <View style={styles.donationBankTitleRow}>
              <MaterialCommunityIcons name="bank" size={24} color={colors.primaryBlue} />
              <Text style={[styles.donationBankTitle, { color: colors.primaryBlue }]}>
                {i18n.t('donation_bank.title')}
              </Text>
              <TouchableOpacity onPress={() => setTooltipVisible(true)}>
                <MaterialCommunityIcons name="help-circle" size={18} color={colors.gray400} style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>
            <View style={styles.donationBankSummary}>
              <Text style={[styles.donationBankTotal, { color: colors.primaryDark }]}>
                {formatCurrency(unclaimedSummary.total_unclaimed)}
              </Text>
              <Text style={[styles.donationBankCount, { color: colors.gray500 }]}>
                over {unclaimedSummary.years_count} year{unclaimedSummary.years_count !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          <Divider style={[styles.divider, { backgroundColor: colors.gray200, marginVertical: 12 }]} />

          <Text style={[styles.donationBankDescription, { color: colors.gray600 }]}>
            {i18n.t('donation_bank.description')}
          </Text>

          {/* Current year progress reminder */}
          <Surface style={[styles.currentYearProgress, { backgroundColor: `${colors.primaryBlue}08` }]} elevation={0}>
            <Text style={[styles.currentYearText, { color: colors.gray700 }]}>
              This year's donations: {formatCurrency(currentYearTotal)}
            </Text>
            <View style={styles.miniProgressBar}>
              <View style={[styles.miniProgressFill, { width: `${thresholdProgress}%`, backgroundColor: getProgressColor(thresholdProgress) }]} />
            </View>
            {currentYearTotal < 200 && (
              <Text style={[styles.currentYearHint, { color: colors.warningOrange }]}>
                {i18n.t('progress.remaining_singular', { remaining: formatCurrency(200 - currentYearTotal) })}
              </Text>
            )}
          </Surface>

          {/* Year Cards */}
          <View style={styles.yearsContainer}>
            {unclaimedDonations.map((item) => {
              const expiryInfo = getExpiryInfo(item.expiry_year);
              const isSelected = selectedDonationYears[item.donation_year];
              const expiring = isExpiringSoon(item.expiry_year);
              const yearProgress = Math.min(100, (item.total_amount / 200) * 100);

              return (
                <TouchableOpacity
                  key={item.donation_year}
                  style={[
                    styles.yearCard,
                    {
                      backgroundColor: isSelected ? `${colors.primaryBlue}10` : '#ffffff',
                      borderColor: isSelected ? colors.primaryBlue : colors.gray200,
                      borderWidth: isSelected ? 2 : 1,
                    }
                  ]}
                  onPress={() => toggleYearSelection(item.donation_year)}
                  activeOpacity={0.7}
                >
                  <View style={styles.yearCardHeader}>
                    <View style={styles.yearCardTitleRow}>
                      <Checkbox.Android
                        status={isSelected ? 'checked' : 'unchecked'}
                        onPress={() => toggleYearSelection(item.donation_year)}
                        color={colors.primaryBlue}
                      />
                      <Text style={[styles.yearCardYear, { color: colors.primaryBlue }]}>
                        {item.donation_year}
                      </Text>
                    </View>
                    <View style={styles.yearCardAmount}>
                      <Text style={[styles.yearCardAmountValue, { color: colors.primaryDark }]}>
                        {formatCurrency(item.total_amount)}
                      </Text>
                      <Text style={[styles.yearCardCount, { color: colors.gray500 }]}>
                        {item.transaction_count} donation{item.transaction_count !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>

                  {/* Mini progress bar for each year */}
                  <View style={styles.yearProgressBar}>
                    <View style={[styles.yearProgressFill, { width: `${yearProgress}%`, backgroundColor: getProgressColor(yearProgress) }]} />
                  </View>

                  <View style={styles.yearCardFooter}>
                    <View style={styles.charityChips}>
                      {item.charities && item.charities.slice(0, 2).map((charity, idx) => (
                        <Chip
                          key={idx}
                          style={[styles.charityChip, { backgroundColor: colors.gray100 }]}
                          textStyle={{ fontSize: 10, color: colors.gray600 }}
                          compact
                        >
                          {charity.charity_name.length > 20
                            ? charity.charity_name.substring(0, 18) + '...'
                            : charity.charity_name}
                        </Chip>
                      ))}
                      {item.charities && item.charities.length > 2 && (
                        <Chip
                          style={[styles.charityChip, { backgroundColor: colors.gray100 }]}
                          textStyle={{ fontSize: 10, color: colors.gray600 }}
                          compact
                        >
                          +{item.charities.length - 2} more
                        </Chip>
                      )}
                    </View>

                    <View style={[styles.expiryBadge, { backgroundColor: expiring ? `${expiryInfo.color}20` : `${colors.gray200}` }]}>
                      <MaterialCommunityIcons
                        name={expiryInfo.icon}
                        size={14}
                        color={expiryInfo.color}
                      />
                      <Text style={[styles.expiryText, { color: expiryInfo.color }]}>
                        {expiryInfo.text}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Action Buttons */}
          <View style={styles.donationBankActions}>
            <Button
              mode="outlined"
              onPress={selectAllYears}
              style={[styles.selectAllButton, { borderColor: colors.primaryBlue }]}
              labelStyle={{ color: colors.primaryBlue }}
              compact
              icon="select-all"
            >
              {i18n.t('donation_bank.select_all')}
            </Button>

            <Button
              mode="outlined"
              onPress={clearSelections}
              style={[styles.clearButton, { borderColor: colors.gray400 }]}
              labelStyle={{ color: colors.gray600 }}
              compact
              icon="close"
              disabled={!hasSelections}
            >
              {i18n.t('donation_bank.clear')}
            </Button>

            <Button
              mode="contained"
              onPress={runOptimizer}
              style={[styles.optimizeButton, { backgroundColor: colors.accentGreen }]}
              labelStyle={{ color: '#ffffff' }}
              icon="calculator"
              disabled={!hasSelections || claiming}
              loading={claiming}
            >
              {i18n.t('donation_bank.optimize', { count: selectedCount })}
            </Button>
          </View>

          {/* Tax Tip */}
          <Surface style={[styles.taxTip, { backgroundColor: `${colors.primaryBlue}08` }]} elevation={0}>
            <MaterialCommunityIcons name="lightbulb-on" size={20} color={colors.warningOrange} />
            <Text style={[styles.taxTipText, { color: colors.gray700 }]}>
              {i18n.t('donation_bank.tax_tip')}
            </Text>
          </Surface>
        </Card.Content>
      </Card>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.gray50 }]}>
        <ActivityIndicator size="large" color={colors.primaryBlue} />
        <Text style={[styles.loadingText, { color: colors.gray600 }]}>
          {i18n.t('loading')}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.gray50 }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primaryBlue]}
          tintColor={colors.primaryBlue}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primaryBlue }]}>
        <Text style={styles.headerTitle}>{i18n.t('voucher_ledger.title')}</Text>
        <Text style={styles.headerSubtitle}>
          {i18n.t('voucher_ledger.subtitle')}
        </Text>
      </View>

      <View style={styles.content}>
        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <Card style={[styles.summaryCard, { backgroundColor: '#ffffff' }]}>
            <Card.Content style={styles.summaryCardContent}>
              <MaterialCommunityIcons name="cash-multiple" size={24} color={colors.primaryBlue} />
              <View style={styles.summaryTextContainer}>
                <Text style={[styles.summaryNumber, { color: colors.primaryBlue }]}>
                  {formatCurrency(displayStats.totalAmount)}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.gray600 }]}>
                  {i18n.t('voucher_ledger.total_donated')}
                </Text>
              </View>
            </Card.Content>
          </Card>

          <Card style={[styles.summaryCard, { backgroundColor: '#ffffff' }]}>
            <Card.Content style={styles.summaryCardContent}>
              <MaterialCommunityIcons name="file-document-multiple" size={24} color={colors.secondaryTeal} />
              <View style={styles.summaryTextContainer}>
                <Text style={[styles.summaryNumber, { color: colors.secondaryTeal }]}>
                  {formatNumber(displayStats.totalVouchers)}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.gray600 }]}>
                  {i18n.t('voucher_ledger.transactions')}
                </Text>
              </View>
            </Card.Content>
          </Card>

          <Card style={[styles.summaryCard, { backgroundColor: '#ffffff' }]}>
            <Card.Content style={styles.summaryCardContent}>
              <MaterialCommunityIcons name="charity" size={24} color={colors.accentGreen} />
              <View style={styles.summaryTextContainer}>
                <Text style={[styles.summaryNumber, { color: colors.accentGreen }]}>
                  {formatNumber(displayStats.charityCount)}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.gray600 }]}>
                  {i18n.t('voucher_ledger.charities')}
                </Text>
              </View>
            </Card.Content>
          </Card>
        </View>

        {/* Donation Bank Section */}
        {renderDonationBank()}

        {/* Filter Section */}
        <View style={styles.filterSection}>
          <Text style={[styles.sectionTitle, { color: colors.gray800 }]}>
            {i18n.t('voucher_ledger.filter')}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {filterOptions.map((filter) => (
              <Chip
                key={filter.id}
                selected={activeFilter === filter.id}
                onPress={() => setActiveFilter(filter.id)}
                style={[
                  styles.filterChip,
                  activeFilter === filter.id && {
                    backgroundColor: colors.primaryBlue,
                    borderColor: colors.primaryBlue
                  }
                ]}
                textStyle={[
                  styles.filterChipText,
                  activeFilter === filter.id && { color: '#ffffff' }
                ]}
              >
                {filter.label}
              </Chip>
            ))}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yearScroll}>
            {years.map((year) => (
              <Chip
                key={year}
                selected={selectedYear === year}
                onPress={() => handleYearChange(year)}
                style={[
                  styles.yearChip,
                  selectedYear === year && {
                    backgroundColor: colors.primaryBlue,
                    borderColor: colors.primaryBlue
                  }
                ]}
                textStyle={[
                  styles.yearChipText,
                  selectedYear === year && { color: '#ffffff' }
                ]}
              >
                {year}
              </Chip>
            ))}
          </ScrollView>
        </View>

        {/* Charity Buckets */}
        <Text style={[styles.sectionTitle, { color: colors.gray800 }]}>
          {i18n.t('voucher_ledger.charity_buckets')}
        </Text>
        <Text style={[styles.sectionSubtitle, { color: colors.gray600 }]}>
          {i18n.t('voucher_ledger.bucket_subtitle')}
        </Text>

        {displayBuckets && displayBuckets.length > 0 ? (
          displayBuckets.map((bucket) => (
            <Card
              key={bucket.charity_id}
              style={[styles.bucketCard, {
                backgroundColor: '#ffffff',
                borderTopWidth: 3,
                borderTopColor: colors.primaryBlue
              }]}
            >
              <Card.Content>
                <View style={styles.bucketHeader}>
                  <View style={styles.bucketInfo}>
                    <Text style={[styles.charityName, { color: colors.primaryBlue }]}>
                      {bucket.charity_name || `Charity ${bucket.charity_id}`}
                    </Text>
                    {bucket.business_number && (
                      <Text style={[styles.businessNumber, { color: colors.gray500 }]}>
                        BN: {bucket.business_number}
                      </Text>
                    )}
                  </View>
                  <View style={styles.bucketAmount}>
                    <Text style={[styles.bucketTotal, { color: colors.primaryDark }]}>
                      {formatCurrency(bucket.total_amount)}
                    </Text>
                    <Text style={[styles.bucketCount, { color: colors.gray500 }]}>
                      {bucket.transaction_count || 0} transaction{bucket.transaction_count !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>

                <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />

                <View style={styles.bucketFooter}>
                  <Text style={[styles.lastDonation, { color: colors.gray600 }]}>
                    {i18n.t('voucher_ledger.last_donation', { date: bucket.last_donation ? formatDate(bucket.last_donation) : 'N/A' })}
                  </Text>
                  <Button
                    mode="outlined"
                    onPress={() => {}}
                    style={[styles.receiptButton, { borderColor: colors.primaryBlue }]}
                    labelStyle={{ color: colors.primaryBlue, fontSize: 12 }}
                    compact
                  >
                    {i18n.t('voucher_ledger.generate_receipt')}
                  </Button>
                </View>
              </Card.Content>
            </Card>
          ))
        ) : (
          <Card style={[styles.emptyBucketCard, { backgroundColor: '#ffffff' }]}>
            <Card.Content style={styles.emptyBucketContent}>
              <MaterialCommunityIcons name="folder-outline" size={48} color={colors.gray400} />
              <Text style={[styles.emptyBucketText, { color: colors.gray600 }]}>
                No charity buckets for {selectedYear}
              </Text>
              <Text style={[styles.emptyBucketSubtext, { color: colors.gray500 }]}>
                Start donating to create charity buckets
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* Individual Vouchers */}
        <Text style={[styles.sectionTitle, { color: colors.gray800, marginTop: 24 }]}>
          {i18n.t('voucher_ledger.individual_vouchers')}
        </Text>
        <Text style={[styles.sectionSubtitle, { color: colors.gray600 }]}>
          {i18n.t('voucher_ledger.voucher_subtitle')}
        </Text>

        {activeFilter === 'charity' ? (
          Object.keys(vouchersByCharity).length > 0 ? (
            Object.values(vouchersByCharity).map((charityGroup) => (
              <View key={charityGroup.charity_id} style={styles.charityGroup}>
                <View style={styles.charityGroupHeader}>
                  <Text style={[styles.charityGroupName, { color: colors.primaryBlue }]}>
                    {charityGroup.charity_name}
                  </Text>
                  <Text style={[styles.charityGroupTotal, { color: colors.primaryDark }]}>
                    {formatCurrency(charityGroup.total)}
                  </Text>
                </View>
                {charityGroup.vouchers.map((voucher) => (
                  <Card key={voucher.id} style={[styles.voucherCard, { backgroundColor: '#ffffff' }]}>
                    <Card.Content>
                      <View style={styles.voucherHeader}>
                        <View>
                          <Text style={[styles.voucherDate, { color: colors.gray500 }]}>
                            {formatDate(voucher.transaction_time || voucher.timestamp)}
                          </Text>
                        </View>
                        <Text style={[styles.voucherAmount, { color: colors.primaryDark }]}>
                          {formatCurrency(voucher.amount)}
                        </Text>
                      </View>

                      <Divider style={[styles.divider, { backgroundColor: colors.gray200, marginVertical: 8 }]} />

                      <View style={styles.voucherDetails}>
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: colors.gray600 }]}>
                            {i18n.t('voucher_ledger.module')}
                          </Text>
                          <Text style={[styles.detailValue, { color: colors.gray800 }]}>
                            {voucher.module_id || 'N/A'}
                          </Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: colors.gray600 }]}>
                            {i18n.t('voucher_ledger.transaction_hash')}
                          </Text>
                          <Text style={[styles.detailValue, { color: colors.gray800 }]}>
                            {truncateHash(voucher.transaction_hash)}
                          </Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: colors.gray600 }]}>
                            {i18n.t('voucher_ledger.previous_hash')}
                          </Text>
                          <Text style={[styles.detailValue, { color: colors.gray800 }]}>
                            {voucher.previous_hash ? truncateHash(voucher.previous_hash) : i18n.t('voucher_ledger.genesis')}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.verificationBadge}>
                        <MaterialCommunityIcons name="shield-check" size={16} color={colors.accentGreen} />
                        <Text style={[styles.verifiedText, { color: colors.accentGreen }]}>
                          {i18n.t('voucher_ledger.cryptographically_verified')}
                        </Text>
                      </View>
                    </Card.Content>
                  </Card>
                ))}
              </View>
            ))
          ) : (
            <Card style={[styles.emptyCard, { backgroundColor: '#ffffff' }]}>
              <Card.Content style={styles.emptyContent}>
                <MaterialCommunityIcons name="book-outline" size={64} color={colors.gray400} />
                <Text style={[styles.emptyTitle, { color: colors.gray800 }]}>
                  {i18n.t('voucher_ledger.no_vouchers_title')}
                </Text>
                <Text style={[styles.emptyText, { color: colors.gray600 }]}>
                  {i18n.t('voucher_ledger.no_vouchers_message')}
                </Text>
                <Button
                  mode="contained"
                  onPress={() => navigation.navigate('CharitySelection')}
                  style={[styles.scanButton, { backgroundColor: colors.primaryBlue }]}
                  labelStyle={{ color: '#ffffff' }}
                  icon="qrcode-scan"
                >
                  {i18n.t('voucher_ledger.scan_qr')}
                </Button>
              </Card.Content>
            </Card>
          )
        ) : (
          filteredVouchers && filteredVouchers.length > 0 ? (
            filteredVouchers.map((voucher) => (
              <Card key={voucher.id} style={[styles.voucherCard, { backgroundColor: '#ffffff' }]}>
                <Card.Content>
                  <View style={styles.voucherHeader}>
                    <View>
                      <Text style={[styles.voucherCharity, { color: colors.primaryBlue }]}>
                        {voucher.charity_name || `Charity ${voucher.charity_id}`}
                      </Text>
                      <Text style={[styles.voucherDate, { color: colors.gray500 }]}>
                        {formatDate(voucher.transaction_time || voucher.timestamp)}
                      </Text>
                    </View>
                    <Text style={[styles.voucherAmount, { color: colors.primaryDark }]}>
                      {formatCurrency(voucher.amount)}
                    </Text>
                  </View>

                  <Divider style={[styles.divider, { backgroundColor: colors.gray200, marginVertical: 12 }]} />

                  <View style={styles.voucherDetails}>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.gray600 }]}>
                        {i18n.t('voucher_ledger.module')}
                      </Text>
                      <Text style={[styles.detailValue, { color: colors.gray800 }]}>
                        {voucher.module_id || 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.gray600 }]}>
                        {i18n.t('voucher_ledger.transaction_hash')}
                      </Text>
                      <Text style={[styles.detailValue, { color: colors.gray800 }]}>
                        {truncateHash(voucher.transaction_hash)}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.gray600 }]}>
                        {i18n.t('voucher_ledger.previous_hash')}
                      </Text>
                      <Text style={[styles.detailValue, { color: colors.gray800 }]}>
                        {voucher.previous_hash ? truncateHash(voucher.previous_hash) : i18n.t('voucher_ledger.genesis')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.verificationBadge}>
                    <MaterialCommunityIcons name="shield-check" size={16} color={colors.accentGreen} />
                    <Text style={[styles.verifiedText, { color: colors.accentGreen }]}>
                      {i18n.t('voucher_ledger.cryptographically_verified')}
                    </Text>
                  </View>
                </Card.Content>
              </Card>
            ))
          ) : (
            <Card style={[styles.emptyCard, { backgroundColor: '#ffffff' }]}>
              <Card.Content style={styles.emptyContent}>
                <MaterialCommunityIcons name="book-outline" size={64} color={colors.gray400} />
                <Text style={[styles.emptyTitle, { color: colors.gray800 }]}>
                  {i18n.t('voucher_ledger.no_vouchers_title')}
                </Text>
                <Text style={[styles.emptyText, { color: colors.gray600 }]}>
                  {i18n.t('voucher_ledger.no_vouchers_message')}
                </Text>
                <Button
                  mode="contained"
                  onPress={() => navigation.navigate('CharitySelection')}
                  style={[styles.scanButton, { backgroundColor: colors.primaryBlue }]}
                  labelStyle={{ color: '#ffffff' }}
                  icon="qrcode-scan"
                >
                  {i18n.t('voucher_ledger.scan_qr')}
                </Button>
              </Card.Content>
            </Card>
          )
        )}

        {/* Security Trust Badge */}
        <View style={[styles.trustBadge, {
          borderColor: colors.accentGreen,
          backgroundColor: 'rgba(16, 185, 129, 0.05)'
        }]}>
          <MaterialCommunityIcons name="shield-lock" size={24} color={colors.accentGreen} />
          <View style={styles.trustContent}>
            <Text style={[styles.trustTitle, { color: colors.gray800 }]}>
              {i18n.t('voucher_ledger.immutable_ledger')}
            </Text>
            <Text style={[styles.trustText, { color: colors.gray600 }]}>
              {i18n.t('voucher_ledger.immutable_ledger_desc')}
            </Text>
          </View>
        </View>
      </View>

      {/* Optimizer Dialog */}
      <Portal>
        <Dialog visible={optimizerVisible} onDismiss={() => setOptimizerVisible(false)} style={styles.optimizerDialog}>
          <Dialog.Title style={{ color: colors.primaryBlue }}>
            {i18n.t('optimizer.title')}
          </Dialog.Title>
          <Dialog.Content>
            {optimizerData && (
              <View>
                <View style={styles.optimizerYearsList}>
                  {optimizerData.years.map((item) => (
                    <View key={item.donation_year} style={styles.optimizerYearRow}>
                      <Text style={[styles.optimizerYearText, { color: colors.gray700 }]}>
                        {item.donation_year}
                      </Text>
                      <Text style={[styles.optimizerYearAmount, { color: colors.primaryDark }]}>
                        {formatCurrency(item.total_amount)}
                      </Text>
                    </View>
                  ))}
                  
                  {optimizerData.currentYearTotal > 0 && (
                    <View style={styles.optimizerCurrentYearRow}>
                      <Text style={[styles.optimizerYearText, { color: colors.accentGreen, fontWeight: '600' }]}>
                        {new Date().getFullYear()} (Current Year)
                      </Text>
                      <Text style={[styles.optimizerYearAmount, { color: colors.accentGreen, fontWeight: '600' }]}>
                        {formatCurrency(optimizerData.currentYearTotal)}
                      </Text>
                    </View>
                  )}
                  
                  <Divider style={[styles.optimizerDivider, { backgroundColor: colors.gray200, marginVertical: 12 }]} />
                  
                  <View style={styles.optimizerTotalRow}>
                    <Text style={[styles.optimizerTotalLabel, { color: colors.gray800, fontWeight: '600' }]}>
                      {i18n.t('optimizer.total_combined')}
                    </Text>
                    <Text style={[styles.optimizerTotalAmount, { color: colors.primaryBlue, fontWeight: '700' }]}>
                      {formatCurrency(optimizerData.combinedTotal)}
                    </Text>
                  </View>
                </View>

                <View style={styles.optimizerComparison}>
                  <View style={styles.optimizerComparisonRow}>
                    <Text style={[styles.optimizerComparisonLabel, { color: colors.gray600 }]}>
                      {i18n.t('optimizer.if_claimed_separately')}
                    </Text>
                    <Text style={[styles.optimizerComparisonValue, { color: colors.gray700 }]}>
                      {formatCurrency(optimizerData.separateSavings)}
                    </Text>
                  </View>
                  <View style={styles.optimizerComparisonRow}>
                    <Text style={[styles.optimizerComparisonLabel, { color: colors.gray600 }]}>
                      {i18n.t('optimizer.if_claimed_together')}
                    </Text>
                    <Text style={[styles.optimizerComparisonValue, { color: colors.accentGreen, fontWeight: '600' }]}>
                      {formatCurrency(optimizerData.combinedSavings)}
                    </Text>
                  </View>
                  <View style={[styles.optimizerExtraRow, { backgroundColor: `${colors.accentGreen}10` }]}>
                    <Text style={[styles.optimizerExtraLabel, { color: colors.accentGreen, fontWeight: '600' }]}>
                      {i18n.t('optimizer.extra_savings')}
                    </Text>
                    <Text style={[styles.optimizerExtraValue, { color: colors.accentGreen, fontWeight: '700' }]}>
                      {formatCurrency(optimizerData.extraSavings)}
                    </Text>
                  </View>
                </View>

                {optimizerData.combinedTotal < 200 && (
                  <View style={[styles.optimizerThresholdWarning, { backgroundColor: `${colors.warningOrange}10` }]}>
                    <MaterialCommunityIcons name="alert" size={16} color={colors.warningOrange} />
                    <Text style={[styles.optimizerThresholdText, { color: colors.warningOrange }]}>
                      {i18n.t('optimizer.below_threshold')}
                    </Text>
                  </View>
                )}

                {optimizerData.combinedTotal >= 200 && (
                  <View style={[styles.optimizerThresholdSuccess, { backgroundColor: `${colors.accentGreen}10` }]}>
                    <MaterialCommunityIcons name="check-circle" size={16} color={colors.accentGreen} />
                    <Text style={[styles.optimizerThresholdSuccessText, { color: colors.accentGreen }]}>
                      {i18n.t('optimizer.above_threshold')}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setOptimizerVisible(false)} textColor={colors.gray500}>
              {i18n.t('optimizer.cancel')}
            </Button>
            <Button
              onPress={applyOptimizerStrategy}
              textColor={colors.accentGreen}
              loading={claiming}
              disabled={claiming}
            >
              {i18n.t('optimizer.apply_strategy')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Tooltip Dialog */}
      {renderTooltipDialog()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16 },
  header: { paddingVertical: 30, paddingHorizontal: 20, alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#ffffff', marginBottom: 8 },
  headerSubtitle: { fontSize: 16, color: 'rgba(255, 255, 255, 0.9)', textAlign: 'center' },
  content: { padding: 16 },
  
  summaryContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  summaryCard: { flex: 1, borderRadius: 12, marginHorizontal: 4, elevation: 2 },
  summaryCardContent: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  summaryTextContainer: { marginLeft: 12 },
  summaryNumber: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  summaryLabel: { fontSize: 12, fontWeight: '500' },
  
  // Donation Bank Styles
  donationBankCard: { borderRadius: 12, marginBottom: 20, elevation: 2, borderWidth: 1, borderColor: '#eef0f2' },
  donationBankHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  donationBankTitleRow: { flexDirection: 'row', alignItems: 'center' },
  donationBankTitle: { fontSize: 18, fontWeight: '600', marginLeft: 8 },
  donationBankSummary: { alignItems: 'flex-end' },
  donationBankTotal: { fontSize: 20, fontWeight: '700' },
  donationBankCount: { fontSize: 11 },
  donationBankDescription: { fontSize: 13, lineHeight: 18, marginBottom: 16 },
  
  currentYearProgress: { padding: 12, borderRadius: 8, marginBottom: 16 },
  currentYearText: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  miniProgressBar: { height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  miniProgressFill: { height: '100%', borderRadius: 3 },
  currentYearHint: { fontSize: 11 },
  
  yearsContainer: { marginBottom: 16 },
  yearCard: { borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1 },
  yearCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  yearCardTitleRow: { flexDirection: 'row', alignItems: 'center' },
  yearCardYear: { fontSize: 18, fontWeight: '600', marginLeft: 4 },
  yearCardAmount: { alignItems: 'flex-end' },
  yearCardAmountValue: { fontSize: 18, fontWeight: '700' },
  yearCardCount: { fontSize: 11 },
  yearProgressBar: { height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, overflow: 'hidden', marginVertical: 8 },
  yearProgressFill: { height: '100%', borderRadius: 2 },
  yearCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' },
  charityChips: { flexDirection: 'row', flexWrap: 'wrap', flex: 1 },
  charityChip: { marginRight: 6, marginBottom: 4 },
  expiryBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  expiryText: { fontSize: 11, marginLeft: 4 },
  
  donationBankActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, marginBottom: 16 },
  selectAllButton: { flex: 1, marginRight: 6, borderRadius: 8 },
  clearButton: { flex: 1, marginHorizontal: 6, borderRadius: 8 },
  optimizeButton: { flex: 1, marginLeft: 6, borderRadius: 8 },
  taxTip: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8 },
  taxTipText: { fontSize: 12, marginLeft: 8, flex: 1, lineHeight: 16 },
  
  unclaimedLoadingContainer: { alignItems: 'center', paddingVertical: 32 },
  unclaimedLoadingText: { marginTop: 12, fontSize: 14 },
  emptyUnclaimedContainer: { alignItems: 'center', paddingVertical: 32 },
  emptyUnclaimedTitle: { fontSize: 16, fontWeight: '600', marginTop: 12, marginBottom: 8 },
  emptyUnclaimedText: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  
  // Tooltip Dialog
  tooltipDialog: { borderRadius: 12 },
  tooltipSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  
  // Optimizer Dialog
  optimizerDialog: { borderRadius: 12 },
  optimizerYearsList: { marginBottom: 16 },
  optimizerYearRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  optimizerYearText: { fontSize: 14 },
  optimizerYearAmount: { fontSize: 14, fontWeight: '600' },
  optimizerCurrentYearRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, marginTop: 4 },
  optimizerDivider: { height: 1 },
  optimizerTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 },
  optimizerTotalLabel: { fontSize: 15 },
  optimizerTotalAmount: { fontSize: 16 },
  optimizerComparison: { marginTop: 16, marginBottom: 16, padding: 12, backgroundColor: '#f8fafc', borderRadius: 8 },
  optimizerComparisonRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  optimizerComparisonLabel: { fontSize: 13 },
  optimizerComparisonValue: { fontSize: 13 },
  optimizerExtraRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderRadius: 6 },
  optimizerExtraLabel: { fontSize: 13 },
  optimizerExtraValue: { fontSize: 14 },
  optimizerThresholdWarning: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, marginTop: 8 },
  optimizerThresholdText: { fontSize: 12, marginLeft: 8, flex: 1 },
  optimizerThresholdSuccess: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, marginTop: 8 },
  optimizerThresholdSuccessText: { fontSize: 12, marginLeft: 8, flex: 1 },
  
  // Filter Section
  filterSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  sectionSubtitle: { fontSize: 14, marginBottom: 16 },
  filterScroll: { marginBottom: 12 },
  filterChip: { marginRight: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  filterChipText: { fontSize: 12 },
  yearScroll: { marginBottom: 8 },
  yearChip: { marginRight: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  yearChipText: { fontSize: 12 },
  
  // Charity Buckets
  bucketCard: { borderRadius: 12, marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: '#eef0f2' },
  emptyBucketCard: { borderRadius: 12, marginBottom: 12, elevation: 1 },
  emptyBucketContent: { alignItems: 'center', paddingVertical: 32 },
  emptyBucketText: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  emptyBucketSubtext: { fontSize: 14, marginTop: 4 },
  bucketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  bucketInfo: { flex: 1 },
  charityName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  businessNumber: { fontSize: 11 },
  bucketAmount: { alignItems: 'flex-end' },
  bucketTotal: { fontSize: 22, fontWeight: '700', marginBottom: 2 },
  bucketCount: { fontSize: 12 },
  bucketFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  lastDonation: { fontSize: 12 },
  receiptButton: { borderWidth: 1 },
  
  // Vouchers
  charityGroup: { marginBottom: 16 },
  charityGroupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, paddingVertical: 8 },
  charityGroupName: { fontSize: 18, fontWeight: '600' },
  charityGroupTotal: { fontSize: 18, fontWeight: '700' },
  voucherCard: { borderRadius: 12, marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: '#eef0f2' },
  voucherHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  voucherCharity: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  voucherDate: { fontSize: 12 },
  voucherAmount: { fontSize: 20, fontWeight: '700' },
  voucherDetails: { marginTop: 8 },
  detailRow: { flexDirection: 'row', marginBottom: 6 },
  detailLabel: { fontSize: 12, fontWeight: '600', width: 120 },
  detailValue: { fontSize: 12, flex: 1, fontFamily: 'monospace' },
  verificationBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  verifiedText: { fontSize: 12, fontWeight: '600', marginLeft: 6 },
  divider: { height: 1 },
  
  // Empty States
  emptyCard: { borderRadius: 12, marginTop: 20, elevation: 2 },
  emptyContent: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center', marginBottom: 24, paddingHorizontal: 20 },
  scanButton: { borderRadius: 8 },
  
  // Trust Badge
  trustBadge: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 2, marginTop: 24, marginBottom: 30 },
  trustContent: { flex: 1, marginLeft: 12 },
  trustTitle: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  trustText: { fontSize: 13, lineHeight: 18 },
});