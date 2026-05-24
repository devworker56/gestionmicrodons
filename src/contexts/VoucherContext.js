// contexts/VoucherContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../services/apiService';
import { AuthContext } from './AuthContext';

// Create Voucher Context
const VoucherContext = createContext();

export const VoucherProvider = ({ children }) => {
  const { isAuthenticated, user } = useContext(AuthContext);
  
  // State from original VoucherContext
  const [vouchers, setVouchers] = useState([]);
  const [charityBuckets, setCharityBuckets] = useState([]);
  const [voucherStats, setVoucherStats] = useState({
    totalVouchers: 0,
    totalAmount: 0,
    charityCount: 0,
    lastTransaction: null
  });
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  // Additional state from VoucherLedgerContext
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [bucketMap, setBucketMap] = useState({});
  
  // Receipt state
  const [receipts, setReceipts] = useState([]);
  const [receiptSummary, setReceiptSummary] = useState({
    year: new Date().getFullYear(),
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
  const [receiptsLoading, setReceiptsLoading] = useState(false);

  // ==================== CARRYFORWARD STATE (NEW) ====================
  const [unclaimedDonations, setUnclaimedDonations] = useState([]);
  const [unclaimedSummary, setUnclaimedSummary] = useState({
    total_unclaimed: 0,
    years_count: 0,
    earliest_expiry: null
  });
  const [unclaimedLoading, setUnclaimedLoading] = useState(false);

  // Initialize voucher context
  useEffect(() => {
    if (isAuthenticated) {
      initializeVoucherContext();
    } else {
      resetVoucherContext();
    }
  }, [isAuthenticated]);

  // Initialize voucher data
  const initializeVoucherContext = async () => {
    try {
      setLoading(true);
      setIsLoading(true);
      
      // Load local vouchers
      await loadLocalVouchers();
      
      // Load charity buckets
      await loadCharityBuckets();
      
      // Calculate statistics
      calculateVoucherStats();
      
      // Check for pending sync
      await checkPendingSync();
      
      // Update transactions list (for VoucherLedger compatibility)
      updateTransactionsList();
      
      // Load receipts (non-blocking)
      loadReceipts().catch(err => 
        console.log('Receipts pre-load failed (will load on demand):', err)
      );
      
      // ==================== NEW: Load unclaimed donations for carryforward ====================
      loadUnclaimedDonations().catch(err =>
        console.log('Unclaimed donations pre-load failed (will load on demand):', err)
      );
      
    } catch (error) {
      console.error('Error initializing voucher context:', error);
    } finally {
      setLoading(false);
      setIsLoading(false);
    }
  };

  // Reset context on logout
  const resetVoucherContext = () => {
    setVouchers([]);
    setCharityBuckets([]);
    setTransactions([]);
    setBucketMap({});
    setReceipts([]);
    setReceiptSummary({
      year: new Date().getFullYear(),
      total_donated: 0,
      receipt_count: 0,
      charity_count: 0,
      charities: [],
      tax_credits: { federal: 0, provincial: 0, total: 0 }
    });
    setVoucherStats({
      totalVouchers: 0,
      totalAmount: 0,
      charityCount: 0,
      lastTransaction: null
    });
    setPendingSyncCount(0);
    
    // ==================== NEW: Reset carryforward state ====================
    setUnclaimedDonations([]);
    setUnclaimedSummary({
      total_unclaimed: 0,
      years_count: 0,
      earliest_expiry: null
    });
    setUnclaimedLoading(false);
  };

  // Load vouchers from local storage
  const loadLocalVouchers = async () => {
    try {
      const localVouchers = await apiService.getLocalVouchers();
      
      // Filter by current year
      const currentYearVouchers = localVouchers.filter(voucher => {
        const voucherYear = new Date(voucher.timestamp).getFullYear();
        return voucherYear === currentYear;
      });
      
      setVouchers(currentYearVouchers);
      setTransactions(currentYearVouchers); // Update transactions list
      
    } catch (error) {
      console.error('Error loading local vouchers:', error);
    }
  };

  // Load charity buckets
  const loadCharityBuckets = async () => {
    try {
      // Try to load from backend first
      const response = await apiService.getCharityBuckets(currentYear);
      
      if (response.success) {
        setCharityBuckets(response.buckets || []);
        
        // Update bucketMap for VoucherLedger compatibility
        updateBucketMap(response.buckets || []);
      } else if (response.offline) {
        // Load from local storage if offline
        const localBuckets = await apiService.getLocalCharityBuckets(currentYear);
        setCharityBuckets(localBuckets);
        updateBucketMap(localBuckets);
      }
      
    } catch (error) {
      console.error('Error loading charity buckets:', error);
      
      // Fallback to local storage
      try {
        const localBuckets = await apiService.getLocalCharityBuckets(currentYear);
        setCharityBuckets(localBuckets);
        updateBucketMap(localBuckets);
      } catch (localError) {
        console.error('Error loading local charity buckets:', localError);
      }
    }
  };

  // Load receipts
  const loadReceipts = async (year = null) => {
    try {
      setReceiptsLoading(true);
      const targetYear = year || currentYear;
      
      const response = await apiService.getReceipts(targetYear);
      
      if (response.success) {
        setReceipts(response.receipts);
        
        // Also load summary
        await loadReceiptSummary(targetYear);
      }
      
    } catch (error) {
      console.error('Error loading receipts:', error);
    } finally {
      setReceiptsLoading(false);
    }
  };

  // Load receipt summary
  const loadReceiptSummary = async (year = null) => {
    try {
      const targetYear = year || currentYear;
      
      const response = await apiService.getReceiptSummary(targetYear);
      
      if (response.success) {
        setReceiptSummary(response.summary);
      }
      
    } catch (error) {
      console.error('Error loading receipt summary:', error);
    }
  };

  // Generate a receipt
  const generateReceipt = async (charityId, year = null) => {
    try {
      const targetYear = year || currentYear;
      
      const response = await apiService.generateReceipt(charityId, targetYear);
      
      if (response.success) {
        // Refresh receipts after generation
        await loadReceipts(targetYear);
        
        return {
          success: true,
          receipt: response.receipt,
          message: response.message || 'Receipt generated successfully'
        };
      }
      
      return response;
      
    } catch (error) {
      console.error('Error generating receipt:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to generate receipt'
      };
    }
  };

  // Get receipts for a specific year
  const getReceiptsByYear = async (year) => {
    if (year === currentYear && receipts.length > 0) {
      return {
        success: true,
        receipts: receipts,
        summary: receiptSummary
      };
    }
    
    // Load from API
    await loadReceipts(year);
    return {
      success: true,
      receipts: receipts,
      summary: receiptSummary
    };
  };

  // ==================== CARRYFORWARD METHODS (NEW) ====================
  
  /**
   * Load unclaimed donations available for carryforward
   * Fetches from API and updates state
   */
  const loadUnclaimedDonations = async () => {
    if (!isAuthenticated) {
      console.log('loadUnclaimedDonations: User not authenticated');
      return;
    }
    
    try {
      setUnclaimedLoading(true);
      console.log('📦 Loading unclaimed donations for carryforward...');
      
      const response = await apiService.getUnclaimedDonations();
      
      if (response.success) {
        setUnclaimedDonations(response.unclaimed || []);
        setUnclaimedSummary(response.summary || {
          total_unclaimed: 0,
          years_count: 0,
          earliest_expiry: null
        });
        
        console.log(`✅ Loaded ${response.unclaimed?.length || 0} unclaimed years, total: $${response.summary?.total_unclaimed || 0}`);
      } else {
        console.error('Failed to load unclaimed donations:', response.error);
        setUnclaimedDonations([]);
        setUnclaimedSummary({
          total_unclaimed: 0,
          years_count: 0,
          earliest_expiry: null
        });
      }
      
    } catch (error) {
      console.error('Error in loadUnclaimedDonations:', error);
      setUnclaimedDonations([]);
      setUnclaimedSummary({
        total_unclaimed: 0,
        years_count: 0,
        earliest_expiry: null
      });
    } finally {
      setUnclaimedLoading(false);
    }
  };

  /**
   * Claim unclaimed donations for a specific tax year
   * @param {number} claimYear - The tax year in which to claim the donations (e.g., 2026)
   * @param {array} donationYears - Array of years to claim (e.g., [2022, 2023, 2024])
   * @returns {Promise<Object>} Result of the claim operation
   */
  const claimDonations = async (claimYear, donationYears) => {
    if (!isAuthenticated) {
      return {
        success: false,
        error: 'User not authenticated',
        message: 'Please log in to claim donations'
      };
    }
    
    if (!claimYear || !donationYears || donationYears.length === 0) {
      return {
        success: false,
        error: 'Missing required parameters',
        message: 'Please select at least one year to claim'
      };
    }
    
    try {
      setUnclaimedLoading(true);
      console.log('📝 Claiming donations:', { claimYear, donationYears });
      
      const response = await apiService.claimDonations(claimYear, donationYears);
      
      if (response.success) {
        // Refresh unclaimed data after successful claim
        await loadUnclaimedDonations();
        
        return {
          success: true,
          claimed_count: response.claimed_count || 0,
          message: response.message || `Successfully claimed ${response.claimed_count || 0} donations for tax year ${claimYear}`
        };
      }
      
      return response;
      
    } catch (error) {
      console.error('Error in claimDonations:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to claim donations. Please try again.'
      };
    } finally {
      setUnclaimedLoading(false);
    }
  };

  // Update bucketMap (for VoucherLedger compatibility)
  const updateBucketMap = (buckets) => {
    const map = {};
    buckets.forEach(bucket => {
      if (!map[bucket.charity_id]) {
        map[bucket.charity_id] = {};
      }
      map[bucket.charity_id][bucket.tax_year] = parseFloat(bucket.total_amount);
    });
    setBucketMap(map);
  };

  // Update transactions list
  const updateTransactionsList = () => {
    setTransactions(vouchers);
  };

  // Calculate voucher statistics
  const calculateVoucherStats = () => {
    if (vouchers.length === 0) {
      setVoucherStats({
        totalVouchers: 0,
        totalAmount: 0,
        charityCount: 0,
        lastTransaction: null
      });
      return;
    }

    // Calculate total amount
    const totalAmount = vouchers.reduce((sum, voucher) => {
      return sum + parseFloat(voucher.amount || 0);
    }, 0);

    // Count unique charities
    const uniqueCharities = new Set(vouchers.map(v => v.charity_id));
    
    // Get last transaction
    const sortedVouchers = [...vouchers].sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
    const lastTransaction = sortedVouchers[0] || null;

    setVoucherStats({
      totalVouchers: vouchers.length,
      totalAmount,
      charityCount: uniqueCharities.size,
      lastTransaction
    });
  };

  // Check for pending sync
  const checkPendingSync = async () => {
    try {
      const localVouchers = await apiService.getLocalVouchers();
      const unsyncedCount = localVouchers.filter(v => !v.synced).length;
      setPendingSyncCount(unsyncedCount);
    } catch (error) {
      console.error('Error checking pending sync:', error);
    }
  };

  // Create a new voucher transaction
  const createVoucher = async (voucherData) => {
    try {
      // Generate transaction hash
      const previousHash = vouchers.length > 0 
        ? vouchers[vouchers.length - 1].transaction_hash 
        : null;
      
      const transactionHash = apiService.generateTransactionHash(
        voucherData,
        previousHash
      );

      const completeVoucherData = {
        ...voucherData,
        transaction_hash: transactionHash,
        previous_hash: previousHash,
        timestamp: new Date().toISOString()
      };

      // Save voucher locally immediately (offline-first)
      await apiService.saveVoucherLocally(completeVoucherData);

      // Update local state
      const newVouchers = [...vouchers, completeVoucherData];
      setVouchers(newVouchers);
      setTransactions(newVouchers); // Update transactions list
      
      // Add to VoucherLedger format
      addTransaction({
        id: completeVoucherData.id || `local_${Date.now()}`,
        charityId: completeVoucherData.charity_id,
        charityName: completeVoucherData.charity_name,
        amount: completeVoucherData.amount,
        timestamp: completeVoucherData.timestamp,
        transactionHash: transactionHash
      });
      
      // Update charity bucket
      await updateCharityBucket(completeVoucherData);
      
      // Recalculate stats
      calculateVoucherStats();
      
      // Try to sync with backend
      await syncVoucherToBackend(completeVoucherData);
      
      return {
        success: true,
        voucher: completeVoucherData,
        message: 'Voucher created successfully'
      };
      
    } catch (error) {
      console.error('Error creating voucher:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to create voucher'
      };
    }
  };

  // Add transaction (VoucherLedger method)
  const addTransaction = (transaction) => {
    setTransactions(prev => [...prev, transaction]);
    
    // Update charity bucket in map format
    const charityId = transaction.charityId;
    const amount = parseFloat(transaction.amount);
    const year = new Date(transaction.timestamp || new Date()).getFullYear();
    
    setBucketMap(prev => ({
      ...prev,
      [charityId]: {
        ...prev[charityId],
        [year]: (prev[charityId]?.[year] || 0) + amount
      }
    }));
  };

  // Update charity bucket
  const updateCharityBucket = async (voucherData) => {
    try {
      const charityId = voucherData.charity_id;
      const amount = parseFloat(voucherData.amount);
      
      // Find existing bucket
      const existingBucketIndex = charityBuckets.findIndex(
        bucket => bucket.charity_id === charityId && bucket.tax_year === currentYear
      );
      
      let updatedBuckets;
      
      if (existingBucketIndex >= 0) {
        // Update existing bucket
        updatedBuckets = [...charityBuckets];
        const existingBucket = updatedBuckets[existingBucketIndex];
        
        updatedBuckets[existingBucketIndex] = {
          ...existingBucket,
          total_amount: (parseFloat(existingBucket.total_amount) + amount).toFixed(2),
          transaction_count: existingBucket.transaction_count + 1,
          last_updated: new Date().toISOString()
        };
      } else {
        // Create new bucket
        const newBucket = {
          charity_id: charityId,
          charity_name: voucherData.charity_name,
          tax_year: currentYear,
          total_amount: amount.toFixed(2),
          transaction_count: 1,
          status: 'active',
          created_at: new Date().toISOString(),
          last_updated: new Date().toISOString()
        };
        
        updatedBuckets = [...charityBuckets, newBucket];
      }
      
      setCharityBuckets(updatedBuckets);
      
      // Update bucketMap
      updateBucketMap(updatedBuckets);
      
    } catch (error) {
      console.error('Error updating charity bucket:', error);
    }
  };

  // Sync voucher to backend
  const syncVoucherToBackend = async (voucherData) => {
    try {
      const response = await apiService.createVoucherTransaction(voucherData);
      
      if (response.synced) {
        // Mark as synced in local storage
        await apiService.markVouchersAsSynced([response.voucher_id]);
        
        // Update pending sync count
        setPendingSyncCount(prev => Math.max(0, prev - 1));
        
        return {
          success: true,
          synced: true,
          voucher_id: response.voucher_id
        };
      } else {
        // Voucher saved locally but not synced
        setPendingSyncCount(prev => prev + 1);
        
        return {
          success: true,
          synced: false,
          offline: true,
          voucher_id: voucherData.id || `local_${Date.now()}`
        };
      }
      
    } catch (error) {
      console.error('Error syncing voucher to backend:', error);
      
      // Still count as pending sync
      setPendingSyncCount(prev => prev + 1);
      
      return {
        success: true,
        synced: false,
        offline: true,
        error: error.message
      };
    }
  };

  // Sync all pending vouchers
  const syncPendingVouchers = async () => {
    if (!isAuthenticated || pendingSyncCount === 0) {
      return { success: true, synced: 0, message: 'No pending vouchers' };
    }

    try {
      setSyncing(true);
      
      const response = await apiService.syncPendingVouchers();
      
      if (response.success) {
        // Reload vouchers to get updated sync status
        await loadLocalVouchers();
        await checkPendingSync();
        
        return {
          success: true,
          synced: response.synced_count || 0,
          message: `Synced ${response.synced_count || 0} vouchers`
        };
      } else {
        return {
          success: false,
          error: response.error,
          message: 'Sync failed'
        };
      }
      
    } catch (error) {
      console.error('Error syncing pending vouchers:', error);
      return {
        success: false,
        error: error.message,
        message: 'Sync failed'
      };
    } finally {
      setSyncing(false);
    }
  };

  // Seal a charity bucket (mark as ready for receipt)
  const sealCharityBucket = async (charityId) => {
    try {
      const bucketIndex = charityBuckets.findIndex(
        bucket => bucket.charity_id === charityId && bucket.tax_year === currentYear
      );
      
      if (bucketIndex < 0) {
        return {
          success: false,
          error: 'Charity bucket not found'
        };
      }
      
      const updatedBuckets = [...charityBuckets];
      updatedBuckets[bucketIndex] = {
        ...updatedBuckets[bucketIndex],
        status: 'sealed',
        sealed_at: new Date().toISOString()
      };
      
      setCharityBuckets(updatedBuckets);
      
      // Update in local storage
      const bucketKey = `charity_bucket_${charityId}_${currentYear}`;
      await AsyncStorage.setItem(bucketKey, JSON.stringify(updatedBuckets[bucketIndex]));
      
      return {
        success: true,
        bucket: updatedBuckets[bucketIndex],
        message: 'Charity bucket sealed successfully'
      };
      
    } catch (error) {
      console.error('Error sealing charity bucket:', error);
      return {
        success: false,
        error: error.message
      };
    }
  };

  // ========== VoucherLedger Compatibility Methods ==========

  // Get charity bucket total (VoucherLedger method)
  const getCharityBucketTotal = (charityId, year) => {
    return bucketMap[charityId]?.[year] || 0;
  };

  // Get total donations for a year (VoucherLedger method)
  const getTotalDonations = (year) => {
    return Object.values(bucketMap)
      .map(charity => charity[year] || 0)
      .reduce((sum, amount) => sum + amount, 0);
  };

  // Get charity bucket by ID (original method)
  const getCharityBucket = (charityId) => {
    return charityBuckets.find(
      bucket => bucket.charity_id === charityId && bucket.tax_year === currentYear
    );
  };

  // Get vouchers for a specific charity
  const getVouchersByCharity = (charityId) => {
    return vouchers.filter(voucher => voucher.charity_id === charityId);
  };

  // Get recent vouchers
  const getRecentVouchers = (limit = 5) => {
    return [...vouchers]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  };

  // Refresh voucher data
  const refreshVoucherStats = async () => {
    await loadLocalVouchers();
    await loadCharityBuckets();
    calculateVoucherStats();
    await checkPendingSync();
  };

  // Change tax year
  const changeTaxYear = async (year) => {
    setCurrentYear(year);
    setLoading(true);
    setIsLoading(true);
    
    try {
      await loadLocalVouchers();
      await loadCharityBuckets();
      calculateVoucherStats();
      
      // Also load receipts for the new year
      await loadReceipts(year);
      
    } catch (error) {
      console.error('Error changing tax year:', error);
    } finally {
      setLoading(false);
      setIsLoading(false);
    }
  };

  // Clear all local voucher data (for debugging)
  const clearLocalVoucherData = async () => {
    try {
      await AsyncStorage.removeItem('local_vouchers');
      
      // Clear all charity bucket keys
      const keys = await AsyncStorage.getAllKeys();
      const bucketKeys = keys.filter(key => key.startsWith('charity_bucket_'));
      await AsyncStorage.multiRemove(bucketKeys);
      
      // Reset state
      resetVoucherContext();
      
      return { success: true, message: 'Local voucher data cleared' };
    } catch (error) {
      console.error('Error clearing local voucher data:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    // State (merged)
    vouchers,
    charityBuckets,
    voucherStats,
    loading,
    syncing,
    pendingSyncCount,
    currentYear,
    
    // VoucherLedger state
    transactions,
    bucketMap,
    isLoading,
    
    // Receipt state
    receipts,
    receiptSummary,
    receiptsLoading,
    
    // ==================== CARRYFORWARD STATE (NEW) ====================
    unclaimedDonations,
    unclaimedSummary,
    unclaimedLoading,
    
    // Original actions
    createVoucher,
    syncPendingVouchers,
    sealCharityBucket,
    getCharityBucket,
    getVouchersByCharity,
    getRecentVouchers,
    refreshVoucherStats,
    changeTaxYear,
    clearLocalVoucherData,
    
    // VoucherLedger actions
    addTransaction,
    getCharityBucketTotal,
    getTotalDonations,
    setIsLoading,
    
    // Receipt actions
    loadReceipts,
    loadReceiptSummary,
    generateReceipt,
    getReceiptsByYear,
    
    // ==================== CARRYFORWARD ACTIONS (NEW) ====================
    loadUnclaimedDonations,
    claimDonations,
    
    // Helper functions
    initializeVoucherContext,
    resetVoucherContext
  };

  return (
    <VoucherContext.Provider value={value}>
      {children}
    </VoucherContext.Provider>
  );
};

// Custom hook to use voucher context
export const useVoucher = () => {
  const context = useContext(VoucherContext);
  
  if (!context) {
    throw new Error('useVoucher must be used within a VoucherProvider');
  }
  
  return context;
};

export default VoucherContext;