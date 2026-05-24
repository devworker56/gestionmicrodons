// screens/main/TaxReceiptScreen.js
import React, { useContext, useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Share, Alert, Dimensions } from 'react-native';
import { Text, Card, List, Divider, Button, Chip, useTheme, Dialog, Portal, ActivityIndicator, ProgressBar } from 'react-native-paper';
import { LanguageContext } from '../../contexts/LanguageContext';
import { AuthContext } from '../../contexts/AuthContext';
import { useVoucher } from '../../contexts/VoucherContext';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import apiService from '../../services/apiService';
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

// Calculate tax credits based on Canadian two-tier system
const calculateTaxCredits = (amount, province = 'ON') => {
  if (!amount || amount <= 0) {
    return { federal: 0, provincial: 0, total: 0 };
  }
  
  // Federal rates
  const federalFirstTier = Math.min(amount, 200) * 0.15;
  const federalSecondTier = Math.max(0, amount - 200) * 0.29;
  const federal = federalFirstTier + federalSecondTier;
  
  // Provincial rates (using Ontario as default, can be enhanced with user's province)
  let provincial = 0;
  if (province === 'ON') {
    const provFirstTier = Math.min(amount, 200) * 0.0505;
    const provSecondTier = Math.max(0, amount - 200) * 0.1116;
    provincial = provFirstTier + provSecondTier;
  } else if (province === 'QC') {
    const provFirstTier = Math.min(amount, 200) * 0.1500;
    const provSecondTier = Math.max(0, amount - 200) * 0.2000;
    provincial = provFirstTier + provSecondTier;
  } else {
    // Default to Ontario rates
    const provFirstTier = Math.min(amount, 200) * 0.0505;
    const provSecondTier = Math.max(0, amount - 200) * 0.1116;
    provincial = provFirstTier + provSecondTier;
  }
  
  return {
    federal: Math.round(federal * 100) / 100,
    provincial: Math.round(provincial * 100) / 100,
    total: Math.round((federal + provincial) * 100) / 100
  };
};

export default function TaxReceiptScreen() {
  const theme = useTheme();
  const { t } = useContext(LanguageContext);
  const { user } = useContext(AuthContext);
  const { 
    receipts,
    receiptSummary,
    receiptsLoading,
    loadReceipts,
    loadReceiptSummary,
    generateReceipt,
    getReceiptsByYear,
    currentYear,
    changeTaxYear,
    charityBuckets
  } = useVoucher();
  
  const [refreshing, setRefreshing] = useState(false);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [receiptDetails, setReceiptDetails] = useState(null);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [displayReceipts, setDisplayReceipts] = useState([]);
  const [displaySummary, setDisplaySummary] = useState({
    year: currentYear,
    total_donated: 0,
    receipt_count: 0,
    charity_count: 0,
    charities: [],
    tax_credits: {
      federal: 0,
      provincial: 0,
      total: 0
    }
  });
  const [generatingForCharity, setGeneratingForCharity] = useState(null);
  
  // NEW: State for unclaimed donations summary
  const [unclaimedSummary, setUnclaimedSummary] = useState(null);
  const [unclaimedLoading, setUnclaimedLoading] = useState(false);
  
  // NEW: State for year-over-year comparison
  const [previousYearTotal, setPreviousYearTotal] = useState(0);
  const [yearlyComparison, setYearlyComparison] = useState(null);
  
  // NEW: State for shareable certificate
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);

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
    if (receipts && receipts.length > 0) {
      setDisplayReceipts(receipts);
    } else {
      setDisplayReceipts([]);
    }
    
    if (receiptSummary) {
      setDisplaySummary(receiptSummary);
    }
  }, [receipts, receiptSummary]);

  // NEW: Load previous year data for comparison
  useEffect(() => {
    if (selectedYear) {
      loadPreviousYearData();
    }
  }, [selectedYear]);

  // Generate available years from 2020 to current year + 1
  const getAvailableYears = () => {
    const currentYearNum = new Date().getFullYear();
    const years = [];
    for (let year = 2020; year <= currentYearNum + 1; year++) {
      years.push(year);
    }
    return years;
  };

  const years = getAvailableYears();

  // NEW: Load previous year data for comparison
  const loadPreviousYearData = async () => {
    try {
      const prevYear = selectedYear - 1;
      if (prevYear >= 2020) {
        const response = await apiService.getCharityBuckets(prevYear);
        if (response.success && response.summary) {
          setPreviousYearTotal(response.summary.total_donated || 0);
          
          // Calculate year-over-year change
          const currentTotal = displaySummary.total_donated || 0;
          const prevTotal = response.summary.total_donated || 0;
          
          let comparison = null;
          if (prevTotal > 0) {
            const percentChange = ((currentTotal - prevTotal) / prevTotal) * 100;
            comparison = {
              percent: Math.abs(Math.round(percentChange)),
              isIncrease: percentChange > 0,
              isDecrease: percentChange < 0,
              isSame: percentChange === 0
            };
          }
          setYearlyComparison(comparison);
        }
      }
    } catch (error) {
      console.error('Error loading previous year data:', error);
    }
  };

  // NEW: Load unclaimed data for carryforward summary
  const loadUnclaimedData = async () => {
    try {
      setUnclaimedLoading(true);
      const response = await apiService.getUnclaimedDonations();
      
      if (response.success && response.unclaimed) {
        const totalUnclaimed = response.summary?.total_unclaimed || 0;
        const yearsUnclaimed = response.unclaimed.map(y => y.donation_year);
        
        setUnclaimedSummary({
          total: totalUnclaimed,
          years: yearsUnclaimed,
          yearsCount: response.unclaimed.length
        });
      } else {
        setUnclaimedSummary(null);
      }
    } catch (error) {
      console.error('Error loading unclaimed data:', error);
    } finally {
      setUnclaimedLoading(false);
    }
  };

  // Refresh function
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadReceipts(selectedYear);
    await loadReceiptSummary(selectedYear);
    await loadUnclaimedData();
    await loadPreviousYearData();
    setRefreshing(false);
  }, [selectedYear, loadReceipts, loadReceiptSummary]);

  // Handle year change
  const handleYearChange = async (year) => {
    setSelectedYear(year);
    await changeTaxYear(year);
    await loadReceipts(year);
    await loadReceiptSummary(year);
    await loadUnclaimedData();
    await loadPreviousYearData();
  };

  // View receipt details
  const viewReceiptDetails = (receipt) => {
    setReceiptDetails(receipt);
    setShowReceiptDialog(true);
  };

  // Share receipt function
  const shareReceipt = async (receipt) => {
    try {
      const shareContent = {
        message: `Tax Receipt ${receipt.receipt_number}\n` +
                 `Charity: ${receipt.charity_name}\n` +
                 `Amount: ${formatCurrency(receipt.total_amount)}\n` +
                 `Year: ${receipt.year}\n` +
                 `Business Number: ${receipt.business_number || 'N/A'}\n` +
                 `Issued: ${formatDate(receipt.receipt_date || receipt.issued_at)}`,
        title: `Tax Receipt - ${receipt.charity_name}`
      };
      await Share.share(shareContent);
    } catch (error) {
      console.error('Error sharing receipt:', error);
      Alert.alert('Error', 'Failed to share receipt. Please try again.');
    }
  };

  // NEW: Share impact certificate
  const shareImpactCertificate = async () => {
    try {
      setShareLoading(true);
      const totalDonated = displaySummary.total_donated || 0;
      const taxCredits = calculateTaxCredits(totalDonated, user?.address_province || 'ON');
      const netCost = totalDonated - taxCredits.total;
      
      const certificateText = i18n.locale === 'fr' 
        ? `📊 CERTIFICAT D'IMPACT - GestionMicroDons\n\n` +
          `Donateur: ${user?.legal_name || user?.email || 'Cher donateur'}\n` +
          `Année: ${selectedYear}\n\n` +
          `💰 Total des dons: ${formatCurrency(totalDonated)}\n` +
          `🏛️ Crédit d'impôt fédéral: ${formatCurrency(taxCredits.federal)}\n` +
          `🏛️ Crédit d'impôt provincial: ${formatCurrency(taxCredits.provincial)}\n` +
          `✅ Crédit d'impôt total: ${formatCurrency(taxCredits.total)}\n` +
          `💚 Coût net après crédits: ${formatCurrency(netCost)}\n\n` +
          `Organismes soutenus: ${displaySummary.charity_count || 0}\n` +
          `Reçus générés: ${displaySummary.receipt_count || 0}\n\n` +
          `Merci pour votre générosité! Chaque don compte.\n` +
          `GestionMicroDons - ${new Date().getFullYear()}`
        : `📊 IMPACT CERTIFICATE - GestionMicroDons\n\n` +
          `Donor: ${user?.legal_name || user?.email || 'Dear donor'}\n` +
          `Year: ${selectedYear}\n\n` +
          `💰 Total Donations: ${formatCurrency(totalDonated)}\n` +
          `🏛️ Federal Tax Credit: ${formatCurrency(taxCredits.federal)}\n` +
          `🏛️ Provincial Tax Credit: ${formatCurrency(taxCredits.provincial)}\n` +
          `✅ Total Tax Credit: ${formatCurrency(taxCredits.total)}\n` +
          `💚 Net Cost After Credits: ${formatCurrency(netCost)}\n\n` +
          `Charities Supported: ${displaySummary.charity_count || 0}\n` +
          `Receipts Generated: ${displaySummary.receipt_count || 0}\n\n` +
          `Thank you for your generosity! Every donation counts.\n` +
          `GestionMicroDons - ${new Date().getFullYear()}`;
      
      await Share.share({
        message: certificateText,
        title: i18n.locale === 'fr' ? 'Certificat d\'impact' : 'Impact Certificate'
      });
    } catch (error) {
      console.error('Error sharing certificate:', error);
      Alert.alert('Error', 'Failed to share impact certificate.');
    } finally {
      setShareLoading(false);
      setShowShareDialog(false);
    }
  };

  // Generate receipt function
  const handleGenerateReceipt = async (charityId, charityName) => {
    try {
      setGeneratingForCharity(charityId);
      
      const bucket = charityBuckets?.find(b => b.charity_id === charityId && b.tax_year === selectedYear);
      
      if (!bucket || bucket.total_amount <= 0) {
        Alert.alert(
          i18n.t('common.error'),
          `No donations found for ${charityName} in ${selectedYear}. Cannot generate receipt.`,
          [{ text: i18n.t('common.ok') }]
        );
        return;
      }
      
      Alert.alert(
        i18n.t('receipts.generate'),
        `Generate tax receipt for ${charityName} for tax year ${selectedYear}?`,
        [
          { text: i18n.t('common.cancel'), style: 'cancel' },
          {
            text: i18n.t('receipts.generate'),
            onPress: async () => {
              const response = await generateReceipt(charityId, selectedYear);
              setGeneratingForCharity(null);
              
              if (response.success) {
                Alert.alert(
                  '✅ Success',
                  `Tax receipt for ${charityName} (${selectedYear}) has been generated successfully.`,
                  [{ text: i18n.t('common.ok') }]
                );
                await loadReceipts(selectedYear);
                await loadReceiptSummary(selectedYear);
              } else {
                Alert.alert(
                  i18n.t('common.error'),
                  response.message || 'Failed to generate receipt. Please try again.',
                  [{ text: i18n.t('common.ok') }]
                );
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in generate receipt:', error);
      Alert.alert(i18n.t('common.error'), 'Failed to generate receipt. Please try again.');
      setGeneratingForCharity(null);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.locale === 'fr' ? 'fr-CA' : 'en-CA', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Get receipts filtered by selected year
  const filteredReceipts = displayReceipts.filter(
    receipt => receipt.year === selectedYear
  );

  // Get yearly total for selected year
  const yearlyTotal = displaySummary.total_donated || 0;
  
  // Calculate tax credits for display
  const taxCredits = calculateTaxCredits(yearlyTotal, user?.address_province || 'ON');
  const netCost = yearlyTotal - taxCredits.total;
  const savingsRate = yearlyTotal > 0 ? (taxCredits.total / yearlyTotal) * 100 : 0;

  // Get threshold progress
  const thresholdProgress = Math.min(100, (yearlyTotal / 200) * 100);

  if (receiptsLoading && !refreshing && displayReceipts.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.gray50 }]}>
        <ActivityIndicator size="large" color={colors.primaryBlue} />
        <Text style={[styles.loadingText, { color: colors.gray600 }]}>
          Loading tax receipts...
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
      {/* Header matching web portal banner */}
      <View style={[styles.header, { 
        backgroundColor: colors.primaryBlue,
      }]}>
        <Text style={styles.headerTitle}>{i18n.t('tax_receipt.title')}</Text>
        <Text style={styles.headerSubtitle}>
          {i18n.t('tax_receipt.subtitle')}
        </Text>
      </View>

      <View style={styles.content}>
        {/* Year Selection */}
        <View style={styles.yearSection}>
          <Text style={[styles.sectionTitle, { color: colors.gray800 }]}>
            {i18n.t('tax_receipt.select_year')}
          </Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.yearScroll}
          >
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
                icon={selectedYear === year ? "check" : null}
              >
                {year}
              </Chip>
            ))}
          </ScrollView>
        </View>

        {/* NEW: Tax Savings Highlight Card */}
        {yearlyTotal > 0 && (
          <Card style={[styles.savingsCard, { backgroundColor: '#ffffff' }]}>
            <Card.Content>
              <View style={styles.savingsHeader}>
                <MaterialCommunityIcons name="cash-refund" size={28} color={colors.accentGreen} />
                <Text style={[styles.savingsTitle, { color: colors.accentGreen }]}>
                  Tax Savings Summary
                </Text>
              </View>
              
              <Divider style={[styles.divider, { backgroundColor: colors.gray200, marginVertical: 12 }]} />
              
              <View style={styles.savingsGrid}>
                <View style={styles.savingsRow}>
                  <Text style={[styles.savingsLabel, { color: colors.gray600 }]}>
                    Total Donated:
                  </Text>
                  <Text style={[styles.savingsValue, { color: colors.primaryDark, fontWeight: '700' }]}>
                    {formatCurrency(yearlyTotal)}
                  </Text>
                </View>
                <View style={styles.savingsRow}>
                  <Text style={[styles.savingsLabel, { color: colors.gray600 }]}>
                    Federal Credit:
                  </Text>
                  <Text style={[styles.savingsValue, { color: colors.primaryBlue }]}>
                    {formatCurrency(taxCredits.federal)}
                  </Text>
                </View>
                <View style={styles.savingsRow}>
                  <Text style={[styles.savingsLabel, { color: colors.gray600 }]}>
                    Provincial Credit:
                  </Text>
                  <Text style={[styles.savingsValue, { color: colors.secondaryTeal }]}>
                    {formatCurrency(taxCredits.provincial)}
                  </Text>
                </View>
                <View style={[styles.savingsRow, styles.savingsTotalRow]}>
                  <Text style={[styles.savingsLabel, { color: colors.gray800, fontWeight: '600' }]}>
                    Total Tax Savings:
                  </Text>
                  <Text style={[styles.savingsValue, { color: colors.accentGreen, fontWeight: '700', fontSize: 20 }]}>
                    {formatCurrency(taxCredits.total)}
                  </Text>
                </View>
                <View style={styles.savingsRow}>
                  <Text style={[styles.savingsLabel, { color: colors.gray600 }]}>
                    Your Net Cost:
                  </Text>
                  <Text style={[styles.savingsValue, { color: netCost > 0 ? colors.primaryDark : colors.accentGreen }]}>
                    {formatCurrency(netCost)}
                  </Text>
                </View>
                <View style={styles.savingsProgress}>
                  <Text style={[styles.savingsRate, { color: colors.accentGreen }]}>
                    Government financed {savingsRate.toFixed(0)}% of your generosity!
                  </Text>
                  <ProgressBar
                    progress={savingsRate / 100}
                    color={colors.accentGreen}
                    style={[styles.savingsProgressBar, { backgroundColor: colors.gray200 }]}
                  />
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* NEW: Year-over-Year Comparison Card */}
        {yearlyComparison && previousYearTotal > 0 && (
          <Card style={[styles.comparisonCard, { backgroundColor: '#ffffff' }]}>
            <Card.Content>
              <View style={styles.comparisonHeader}>
                <MaterialCommunityIcons name="chart-timeline-variant" size={24} color={colors.secondaryTeal} />
                <Text style={[styles.comparisonTitle, { color: colors.secondaryTeal }]}>
                  Year-over-Year Comparison
                </Text>
              </View>
              
              <View style={styles.comparisonContent}>
                <View style={styles.comparisonRow}>
                  <Text style={[styles.comparisonYear, { color: colors.gray600 }]}>
                    {selectedYear - 1}:
                  </Text>
                  <Text style={[styles.comparisonAmount, { color: colors.gray700 }]}>
                    {formatCurrency(previousYearTotal)}
                  </Text>
                </View>
                <View style={styles.comparisonRow}>
                  <Text style={[styles.comparisonYear, { color: colors.primaryBlue, fontWeight: '600' }]}>
                    {selectedYear}:
                  </Text>
                  <Text style={[styles.comparisonAmount, { color: colors.primaryBlue, fontWeight: '700' }]}>
                    {formatCurrency(yearlyTotal)}
                  </Text>
                </View>
                <View style={styles.comparisonChange}>
                  {yearlyComparison.isIncrease && (
                    <>
                      <MaterialCommunityIcons name="trending-up" size={20} color={colors.accentGreen} />
                      <Text style={[styles.comparisonChangeText, { color: colors.accentGreen }]}>
                        ↑ {yearlyComparison.percent}% increase from last year!
                      </Text>
                    </>
                  )}
                  {yearlyComparison.isDecrease && (
                    <>
                      <MaterialCommunityIcons name="trending-down" size={20} color={colors.warningOrange} />
                      <Text style={[styles.comparisonChangeText, { color: colors.warningOrange }]}>
                        ↓ {yearlyComparison.percent}% decrease from last year
                      </Text>
                    </>
                  )}
                  {yearlyComparison.isSame && (
                    <>
                      <MaterialCommunityIcons name="minus" size={20} color={colors.gray500} />
                      <Text style={[styles.comparisonChangeText, { color: colors.gray500 }]}>
                        Same as last year. Keep going!
                      </Text>
                    </>
                  )}
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Yearly Summary Card - Enhanced */}
        <Card style={[styles.summaryCard, { backgroundColor: '#ffffff' }]}>
          <Card.Content>
            <View style={styles.summaryHeader}>
              <Text style={[styles.summaryTitle, { color: colors.primaryBlue }]}>
                {i18n.t('tax_receipt.summary', { year: selectedYear })}
              </Text>
              <Text style={[styles.summaryTotal, { color: colors.primaryDark }]}>
                {formatCurrency(yearlyTotal)}
              </Text>
            </View>
            
            <Divider style={[styles.divider, { backgroundColor: colors.gray200, marginVertical: 12 }]} />
            
            {/* Threshold Progress */}
            <View style={styles.thresholdContainer}>
              <View style={styles.thresholdHeader}>
                <Text style={[styles.thresholdLabel, { color: colors.gray600 }]}>
                  Progress to higher tax tier:
                </Text>
                <Text style={[styles.thresholdValue, { color: yearlyTotal >= 200 ? colors.accentGreen : colors.warningOrange }]}>
                  {formatCurrency(yearlyTotal)} of {formatCurrency(200)}
                </Text>
              </View>
              <View style={styles.thresholdBar}>
                <View style={[styles.thresholdFill, { width: `${thresholdProgress}%`, backgroundColor: yearlyTotal >= 200 ? colors.accentGreen : colors.primaryBlue }]} />
              </View>
              {yearlyTotal < 200 && (
                <Text style={[styles.thresholdHint, { color: colors.warningOrange }]}>
                  💡 {formatCurrency(200 - yearlyTotal)} more to reach 29% federal credit rate!
                </Text>
              )}
              {yearlyTotal >= 200 && (
                <Text style={[styles.thresholdHint, { color: colors.accentGreen }]}>
                  ✓ You've reached the higher tax credit tier! Amounts over $200 qualify for 29% federal credit.
                </Text>
              )}
            </View>

            <Divider style={[styles.divider, { backgroundColor: colors.gray200, marginVertical: 12 }]} />

            <View style={styles.taxCreditSection}>
              <Text style={[styles.taxCreditTitle, { color: colors.gray700 }]}>
                {i18n.t('tax_receipt.estimated_credits')}
              </Text>
              <View style={styles.taxCreditRow}>
                <Text style={[styles.taxCreditLabel, { color: colors.gray600 }]}>
                  {i18n.t('tax_receipt.federal_credit')}
                </Text>
                <Text style={[styles.taxCreditValue, { color: colors.primaryBlue }]}>
                  {formatCurrency(taxCredits.federal)}
                </Text>
              </View>
              <View style={styles.taxCreditRow}>
                <Text style={[styles.taxCreditLabel, { color: colors.gray600 }]}>
                  {i18n.t('tax_receipt.provincial_credit')}
                </Text>
                <Text style={[styles.taxCreditValue, { color: colors.secondaryTeal }]}>
                  {formatCurrency(taxCredits.provincial)}
                </Text>
              </View>
              <View style={[styles.taxCreditTotal, { borderTopColor: colors.gray200 }]}>
                <Text style={[styles.taxCreditLabel, { color: colors.gray800, fontWeight: '600' }]}>
                  {i18n.t('tax_receipt.total_credit')}
                </Text>
                <Text style={[styles.taxCreditValue, { color: colors.accentGreen, fontWeight: '700' }]}>
                  {formatCurrency(taxCredits.total)}
                </Text>
              </View>
              <Text style={[styles.taxCreditNote, { color: colors.gray500 }]}>
                {i18n.t('tax_receipt.rate_note')}
              </Text>
            </View>

            {/* Share Impact Button */}
            {yearlyTotal > 0 && (
              <Button
                mode="outlined"
                onPress={() => setShowShareDialog(true)}
                style={[styles.shareButton, { borderColor: colors.secondaryTeal, marginTop: 16 }]}
                labelStyle={{ color: colors.secondaryTeal }}
                icon="share-variant"
                loading={shareLoading}
              >
                Share Impact Certificate
              </Button>
            )}
          </Card.Content>
        </Card>

        {/* Carryforward Information Card */}
        <Card style={[styles.carryforwardCard, { backgroundColor: '#ffffff', marginTop: 16 }]}>
          <Card.Content>
            <View style={styles.infoHeader}>
              <MaterialCommunityIcons name="bank-transfer" size={24} color={colors.primaryBlue} />
              <Text style={[styles.infoTitle, { color: colors.primaryBlue }]}>
                {i18n.t('carryforward.title')}
              </Text>
            </View>
            
            <Divider style={[styles.divider, { backgroundColor: colors.gray200, marginVertical: 12 }]} />
            
            {/* Claimed vs Unclaimed Summary */}
            {unclaimedSummary && unclaimedSummary.total > 0 && (
              <View style={styles.carryforwardSummary}>
                <View style={styles.carryforwardRow}>
                  <Text style={[styles.carryforwardLabel, { color: colors.gray600 }]}>
                    {i18n.t('carryforward.claimed', { year: selectedYear })}:
                  </Text>
                  <Text style={[styles.carryforwardValue, { color: colors.accentGreen }]}>
                    {formatCurrency(yearlyTotal)}
                  </Text>
                </View>
                <View style={styles.carryforwardRow}>
                  <Text style={[styles.carryforwardLabel, { color: colors.gray600 }]}>
                    {i18n.t('carryforward.unclaimed')}:
                  </Text>
                  <Text style={[styles.carryforwardValue, { color: colors.warningOrange }]}>
                    {formatCurrency(unclaimedSummary.total)}
                  </Text>
                </View>
                {unclaimedSummary.years.length > 0 && (
                  <Text style={[styles.carryforwardYears, { color: colors.gray500 }]}>
                    {i18n.t('carryforward.from_years', { years: unclaimedSummary.years.join(', ') })}
                  </Text>
                )}
                
                {/* Progress bar for unclaimed */}
                <View style={styles.carryforwardProgress}>
                  <View style={styles.carryforwardBarContainer}>
                    <View style={[styles.carryforwardBar, { width: `${Math.min(100, (unclaimedSummary.total / 200) * 100)}%`, backgroundColor: colors.warningOrange }]} />
                  </View>
                  <Text style={[styles.carryforwardHint, { color: colors.gray500 }]}>
                    💡 Combining unclaimed donations could help you reach the $200 threshold
                  </Text>
                </View>
              </View>
            )}
            
            <Text style={[styles.carryforwardText, { color: colors.gray600, marginTop: unclaimedSummary ? 0 : 12 }]}>
              {i18n.t('carryforward.description')}
            </Text>
            
            <Button
              mode="outlined"
              onPress={() => navigation.navigate('Ledger')}
              style={[styles.carryforwardButton, { borderColor: colors.primaryBlue, marginTop: 12 }]}
              labelStyle={{ color: colors.primaryBlue }}
              icon="bank"
              compact
            >
              {i18n.t('carryforward.button')}
            </Button>
          </Card.Content>
        </Card>

        {/* Educational Tax Tier Card */}
        <Card style={[styles.educationCard, { backgroundColor: `${colors.primaryBlue}08`, marginTop: 16 }]}>
          <Card.Content>
            <View style={styles.educationHeader}>
              <MaterialCommunityIcons name="school" size={24} color={colors.primaryBlue} />
              <Text style={[styles.educationTitle, { color: colors.primaryBlue }]}>
                How Tax Credits Work
              </Text>
            </View>
            
            <View style={styles.tierTable}>
              <View style={styles.tierRow}>
                <View style={[styles.tierCell, styles.tierHeaderCell]}>
                  <Text style={[styles.tierHeaderText, { color: '#ffffff' }]}>Tier</Text>
                </View>
                <View style={[styles.tierCell, styles.tierHeaderCell]}>
                  <Text style={[styles.tierHeaderText, { color: '#ffffff' }]}>Amount</Text>
                </View>
                <View style={[styles.tierCell, styles.tierHeaderCell]}>
                  <Text style={[styles.tierHeaderText, { color: '#ffffff' }]}>Federal Rate</Text>
                </View>
              </View>
              <View style={styles.tierRow}>
                <View style={[styles.tierCell, styles.tierBodyCell]}>
                  <Text style={[styles.tierBodyText, { color: colors.gray700 }]}>First Tier</Text>
                </View>
                <View style={[styles.tierCell, styles.tierBodyCell]}>
                  <Text style={[styles.tierBodyText, { color: colors.gray700 }]}>First $200</Text>
                </View>
                <View style={[styles.tierCell, styles.tierBodyCell]}>
                  <Text style={[styles.tierBodyText, { color: colors.primaryBlue, fontWeight: '600' }]}>15%</Text>
                </View>
              </View>
              <View style={styles.tierRow}>
                <View style={[styles.tierCell, styles.tierBodyCell]}>
                  <Text style={[styles.tierBodyText, { color: colors.gray700 }]}>Second Tier</Text>
                </View>
                <View style={[styles.tierCell, styles.tierBodyCell]}>
                  <Text style={[styles.tierBodyText, { color: colors.gray700 }]}>Over $200</Text>
                </View>
                <View style={[styles.tierCell, styles.tierBodyCell]}>
                  <Text style={[styles.tierBodyText, { color: colors.accentGreen, fontWeight: '600' }]}>29%</Text>
                </View>
              </View>
            </View>
            
            <Text style={[styles.educationText, { color: colors.gray600, marginTop: 12 }]}>
              💡 {yearlyTotal < 200 
                ? `You're only ${formatCurrency(200 - yearlyTotal)} away from the higher 29% rate on additional donations!`
                : `Great job! You've reached the higher 29% rate tier. Every extra dollar you donate now saves you more in taxes.`
              }
            </Text>
          </Card.Content>
        </Card>

        {/* Receipts List */}
        <Text style={[styles.sectionTitle, { color: colors.gray800, marginTop: 20 }]}>
          {i18n.t('tax_receipt.your_receipts', { year: selectedYear })}
        </Text>
        
        {filteredReceipts.length > 0 ? (
          filteredReceipts.map((receipt) => (
            <Card 
              key={receipt.id} 
              style={[styles.receiptCard, { 
                backgroundColor: '#ffffff',
                borderLeftWidth: 4,
                borderLeftColor: receipt.is_issued ? colors.accentGreen : colors.warningOrange
              }]}
            >
              <Card.Content>
                <View style={styles.receiptHeader}>
                  <View style={styles.receiptInfo}>
                    <Text style={[styles.receiptCharityName, { color: colors.primaryBlue }]}>
                      {receipt.charity_name}
                    </Text>
                    <Text style={[styles.receiptNumber, { color: colors.gray500 }]}>
                      {i18n.t('tax_receipt.receipt_number')} {receipt.receipt_number}
                    </Text>
                    {receipt.business_number && (
                      <Text style={[styles.businessNumber, { color: colors.gray500 }]}>
                        BN: {receipt.business_number}
                      </Text>
                    )}
                  </View>
                  <View style={styles.receiptAmount}>
                    <Text style={[styles.receiptTotal, { color: colors.primaryDark }]}>
                      {formatCurrency(receipt.total_amount)}
                    </Text>
                    <Chip 
                      style={[
                        styles.statusChip, 
                        { backgroundColor: receipt.is_issued ? colors.accentGreen + '20' : colors.warningOrange + '20' }
                      ]}
                      textStyle={{
                        color: receipt.is_issued ? colors.accentGreen : colors.warningOrange,
                        fontSize: 10,
                        fontWeight: '600'
                      }}
                    >
                      {receipt.is_issued ? i18n.t('tax_receipt.issued') : i18n.t('tax_receipt.pending')}
                    </Chip>
                  </View>
                </View>
                
                <Divider style={[styles.divider, { backgroundColor: colors.gray200, marginVertical: 12 }]} />
                
                <View style={styles.receiptFooter}>
                  <Text style={[styles.issueDate, { color: colors.gray600 }]}>
                    {i18n.t('tax_receipt.issued_on', { date: formatDate(receipt.receipt_date || receipt.issued_at) })}
                  </Text>
                  <View style={styles.receiptActions}>
                    <Button 
                      mode="text"
                      onPress={() => viewReceiptDetails(receipt)}
                      labelStyle={{ color: colors.primaryBlue, fontSize: 12 }}
                      compact
                      icon="eye"
                    >
                      {i18n.t('tax_receipt.view')}
                    </Button>
                    <Button 
                      mode="text"
                      onPress={() => shareReceipt(receipt)}
                      labelStyle={{ color: colors.secondaryTeal, fontSize: 12 }}
                      compact
                      icon="share-variant"
                    >
                      {i18n.t('tax_receipt.share')}
                    </Button>
                    <Button 
                      mode="text"
                      onPress={() => {}}
                      labelStyle={{ color: colors.gray500, fontSize: 12 }}
                      compact
                      icon="download"
                    >
                      PDF
                    </Button>
                  </View>
                </View>
              </Card.Content>
            </Card>
          ))
        ) : (
          <Card style={[styles.emptyCard, { backgroundColor: '#ffffff' }]}>
            <Card.Content style={styles.emptyContent}>
              <MaterialCommunityIcons 
                name="file-document-outline" 
                size={64} 
                color={colors.gray400} 
              />
              <Text style={[styles.emptyTitle, { color: colors.gray800 }]}>
                {i18n.t('tax_receipt.no_receipts_title', { year: selectedYear })}
              </Text>
              <Text style={[styles.emptyText, { color: colors.gray600 }]}>
                {i18n.t('tax_receipt.no_receipts_message')}
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.gray500, marginTop: 8 }]}>
                You have {charityBuckets?.filter(b => b.tax_year === selectedYear).length || 0} charity bucket(s) available for this year.
              </Text>
              {charityBuckets?.filter(b => b.tax_year === selectedYear).length > 0 && (
                <Button 
                  mode="contained"
                  onPress={() => {
                    const firstBucket = charityBuckets.find(b => b.tax_year === selectedYear);
                    if (firstBucket) {
                      handleGenerateReceipt(firstBucket.charity_id, firstBucket.charity_name);
                    }
                  }}
                  style={[styles.generateButton, { backgroundColor: colors.primaryBlue, marginTop: 16 }]}
                  labelStyle={{ color: '#ffffff' }}
                  icon="file-document-edit"
                  loading={generatingForCharity === charityBuckets.find(b => b.tax_year === selectedYear)?.charity_id}
                  disabled={generatingForCharity !== null}
                >
                  {i18n.t('tax_receipt.generate')} First Receipt
                </Button>
              )}
            </Card.Content>
          </Card>
        )}

        {/* All Time Summary */}
        {displaySummary.charities && displaySummary.charities.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.gray800, marginTop: 24 }]}>
              {i18n.t('tax_receipt.all_time_summary')}
            </Text>
            
            <View style={styles.allTimeSummary}>
              {displaySummary.charities.map((charity) => (
                <Card 
                  key={charity.charity_id} 
                  style={[styles.charitySummaryCard, { backgroundColor: '#ffffff' }]}
                >
                  <Card.Content style={styles.charitySummaryContent}>
                    <MaterialCommunityIcons name="charity" size={24} color={colors.primaryBlue} />
                    <Text style={[styles.charitySummaryName, { color: colors.primaryBlue }]} numberOfLines={1}>
                      {charity.charity_name}
                    </Text>
                    <Text style={[styles.charitySummaryTotal, { color: colors.primaryDark }]}>
                      {formatCurrency(charity.total_amount)}
                    </Text>
                    <Button 
                      mode="text"
                      onPress={() => handleGenerateReceipt(charity.charity_id, charity.charity_name)}
                      labelStyle={{ color: colors.primaryBlue, fontSize: 11 }}
                      compact
                      loading={generatingForCharity === charity.charity_id}
                      disabled={generatingForCharity !== null}
                    >
                      {i18n.t('tax_receipt.generate')}
                    </Button>
                  </Card.Content>
                </Card>
              ))}
            </View>
          </>
        )}

        {/* Information Card */}
        <Card style={[styles.infoCard, { backgroundColor: '#ffffff' }]}>
          <Card.Content>
            <View style={styles.infoHeader}>
              <MaterialCommunityIcons 
                name="information" 
                size={24} 
                color={colors.primaryBlue} 
              />
              <Text style={[styles.infoTitle, { color: colors.primaryBlue }]}>
                {i18n.t('tax_receipt.about_receipts')}
              </Text>
            </View>
            <Text style={[styles.infoText, { color: colors.gray600 }]}>
              {i18n.t('tax_receipt.receipt_info_1')}{'\n'}
              {i18n.t('tax_receipt.receipt_info_2')}{'\n'}
              {i18n.t('tax_receipt.receipt_info_3')}{'\n'}
              {i18n.t('tax_receipt.receipt_info_4')}{'\n'}
              {i18n.t('tax_receipt.receipt_info_5')}
            </Text>
          </Card.Content>
        </Card>

        {/* Receipt Details Dialog */}
        <Portal>
          <Dialog 
            visible={showReceiptDialog} 
            onDismiss={() => setShowReceiptDialog(false)}
            style={styles.dialog}
          >
            {receiptDetails && (
              <>
                <Dialog.Title style={{ color: colors.primaryBlue }}>
                  {i18n.t('tax_receipt.receipt_details')}
                </Dialog.Title>
                <Dialog.Content>
                  <View style={styles.dialogContent}>
                    <Text style={[styles.dialogLabel, { color: colors.gray600 }]}>
                      {i18n.t('tax_receipt.receipt_number')}
                    </Text>
                    <Text style={[styles.dialogValue, { color: colors.gray800 }]}>
                      {receiptDetails.receipt_number}
                    </Text>
                    
                    <Text style={[styles.dialogLabel, { color: colors.gray600 }]}>
                      {i18n.t('tax_receipt.charity')}
                    </Text>
                    <Text style={[styles.dialogValue, { color: colors.gray800 }]}>
                      {receiptDetails.charity_name}
                    </Text>
                    
                    {receiptDetails.business_number && (
                      <>
                        <Text style={[styles.dialogLabel, { color: colors.gray600 }]}>
                          {i18n.t('tax_receipt.business_number')}
                        </Text>
                        <Text style={[styles.dialogValue, { color: colors.gray800 }]}>
                          {receiptDetails.business_number}
                        </Text>
                      </>
                    )}
                    
                    <Text style={[styles.dialogLabel, { color: colors.gray600 }]}>
                      {i18n.t('tax_receipt.amount')}
                    </Text>
                    <Text style={[styles.dialogValue, { color: colors.primaryDark, fontWeight: '700' }]}>
                      {formatCurrency(receiptDetails.total_amount)}
                    </Text>
                    
                    <Text style={[styles.dialogLabel, { color: colors.gray600 }]}>
                      {i18n.t('tax_receipt.issue_date')}
                    </Text>
                    <Text style={[styles.dialogValue, { color: colors.gray800 }]}>
                      {formatDate(receiptDetails.receipt_date || receiptDetails.issued_at)}
                    </Text>
                    
                    <Text style={[styles.dialogLabel, { color: colors.gray600 }]}>
                      {i18n.t('tax_receipt.tax_year')}
                    </Text>
                    <Text style={[styles.dialogValue, { color: colors.gray800 }]}>
                      {receiptDetails.year}
                    </Text>
                  </View>
                </Dialog.Content>
                <Dialog.Actions>
                  <Button 
                    onPress={() => setShowReceiptDialog(false)}
                    textColor={colors.gray500}
                  >
                    {i18n.t('tax_receipt.close')}
                  </Button>
                  <Button 
                    onPress={() => shareReceipt(receiptDetails)}
                    textColor={colors.primaryBlue}
                  >
                    {i18n.t('tax_receipt.share')}
                  </Button>
                </Dialog.Actions>
              </>
            )}
          </Dialog>
        </Portal>

        {/* Share Impact Certificate Dialog */}
        <Portal>
          <Dialog
            visible={showShareDialog}
            onDismiss={() => setShowShareDialog(false)}
            style={styles.dialog}
          >
            <Dialog.Title style={{ color: colors.secondaryTeal }}>
              Share Your Impact
            </Dialog.Title>
            <Dialog.Content>
              <View style={styles.shareDialogContent}>
                <MaterialCommunityIcons name="certificate" size={48} color={colors.secondaryTeal} style={{ alignSelf: 'center', marginBottom: 16 }} />
                <Text style={{ color: colors.gray700, textAlign: 'center', marginBottom: 16 }}>
                  Share a summary of your charitable impact for {selectedYear}.
                </Text>
                <View style={styles.shareStats}>
                  <Text style={[styles.shareStat, { color: colors.gray600 }]}>
                    Total Donated: {formatCurrency(yearlyTotal)}
                  </Text>
                  <Text style={[styles.shareStat, { color: colors.gray600 }]}>
                    Tax Savings: {formatCurrency(taxCredits.total)}
                  </Text>
                  <Text style={[styles.shareStat, { color: colors.gray600 }]}>
                    Charities Supported: {displaySummary.charity_count || 0}
                  </Text>
                </View>
              </View>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setShowShareDialog(false)} textColor={colors.gray500}>
                Cancel
              </Button>
              <Button onPress={shareImpactCertificate} textColor={colors.secondaryTeal} loading={shareLoading}>
                Share
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  content: {
    padding: 16,
  },
  yearSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  yearScroll: {
    marginBottom: 8,
  },
  yearChip: {
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  yearChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  
  // NEW: Savings Card Styles
  savingsCard: {
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#eef0f2',
  },
  savingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  savingsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  savingsGrid: {
    marginTop: 4,
  },
  savingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  savingsTotalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  savingsLabel: {
    fontSize: 14,
  },
  savingsValue: {
    fontSize: 16,
  },
  savingsProgress: {
    marginTop: 12,
  },
  savingsRate: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
  },
  savingsProgressBar: {
    height: 6,
    borderRadius: 3,
  },
  
  // NEW: Comparison Card Styles
  comparisonCard: {
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#eef0f2',
  },
  comparisonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  comparisonTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  comparisonContent: {
    marginTop: 4,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  comparisonYear: {
    fontSize: 14,
  },
  comparisonAmount: {
    fontSize: 16,
  },
  comparisonChange: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  comparisonChangeText: {
    fontSize: 13,
    marginLeft: 6,
  },
  
  summaryCard: {
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#eef0f2',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  summaryTotal: {
    fontSize: 24,
    fontWeight: '700',
  },
  
  // Threshold Styles
  thresholdContainer: {
    marginBottom: 8,
  },
  thresholdHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  thresholdLabel: {
    fontSize: 12,
  },
  thresholdValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  thresholdBar: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  thresholdFill: {
    height: '100%',
    borderRadius: 3,
  },
  thresholdHint: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
  },
  
  taxCreditSection: {
    marginTop: 8,
  },
  taxCreditTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  taxCreditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taxCreditLabel: {
    fontSize: 14,
  },
  taxCreditValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  taxCreditTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  taxCreditNote: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 12,
  },
  
  shareButton: {
    borderRadius: 8,
  },
  
  // Carryforward Card Styles
  carryforwardCard: {
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#eef0f2',
  },
  carryforwardSummary: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  carryforwardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  carryforwardLabel: {
    fontSize: 13,
  },
  carryforwardValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  carryforwardYears: {
    fontSize: 11,
    marginTop: 4,
  },
  carryforwardProgress: {
    marginTop: 8,
  },
  carryforwardBarContainer: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  carryforwardBar: {
    height: '100%',
    borderRadius: 2,
  },
  carryforwardHint: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  carryforwardText: {
    fontSize: 13,
    lineHeight: 18,
  },
  carryforwardButton: {
    borderRadius: 8,
  },
  
  // Education Card Styles
  educationCard: {
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eef0f2',
  },
  educationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  educationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  tierTable: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tierRow: {
    flexDirection: 'row',
  },
  tierCell: {
    flex: 1,
    padding: 10,
  },
  tierHeaderCell: {
    backgroundColor: '#1e3a8a',
  },
  tierBodyCell: {
    backgroundColor: '#ffffff',
  },
  tierHeaderText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  tierBodyText: {
    fontSize: 12,
    textAlign: 'center',
  },
  educationText: {
    fontSize: 12,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  
  receiptCard: {
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#eef0f2',
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  receiptInfo: {
    flex: 1,
  },
  receiptCharityName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  receiptNumber: {
    fontSize: 12,
    marginBottom: 2,
  },
  businessNumber: {
    fontSize: 11,
  },
  receiptAmount: {
    alignItems: 'flex-end',
  },
  receiptTotal: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
  },
  statusChip: {
    height: 22,
    paddingHorizontal: 6,
  },
  receiptFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  issueDate: {
    fontSize: 12,
  },
  receiptActions: {
    flexDirection: 'row',
  },
  emptyCard: {
    borderRadius: 12,
    marginTop: 20,
    elevation: 2,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  generateButton: {
    borderRadius: 8,
  },
  allTimeSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  charitySummaryCard: {
    width: '48%',
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
  },
  charitySummaryContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  charitySummaryName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  charitySummaryTotal: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  infoCard: {
    borderRadius: 12,
    marginTop: 24,
    elevation: 2,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
  },
  dialog: {
    borderRadius: 12,
  },
  dialogContent: {
    minHeight: 200,
  },
  dialogLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  dialogValue: {
    fontSize: 15,
    marginBottom: 4,
  },
  shareDialogContent: {
    alignItems: 'center',
  },
  shareStats: {
    marginTop: 8,
    alignItems: 'center',
  },
  shareStat: {
    fontSize: 14,
    marginBottom: 4,
  },
  divider: {
    height: 1,
  },
});