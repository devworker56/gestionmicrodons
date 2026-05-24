// CharitySelectionScreen.js - GestionMicroDons Ecosystem Implementation
// Bilingual (EN/FR) - Complete with navigation to QRScanner
import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
} from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  Button, 
  ActivityIndicator, 
  Searchbar,
  Text,
  Chip,
  Badge,
  Surface,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../../services/apiService';
import { AuthContext } from '../../contexts/AuthContext';
import { LanguageContext } from '../../contexts/LanguageContext';

const CharitySelectionScreen = ({ navigation, route }) => {
  const { isAuthenticated, user } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  
  const [charities, setCharities] = useState([]);
  const [filteredCharities, setFilteredCharities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCharity, setSelectedCharity] = useState(null);
  const [languageLoaded, setLanguageLoaded] = useState(false);

  // Load charities on component mount
  useEffect(() => {
    console.log('========== CHARITY SELECTION ==========');
    console.log('User authenticated:', isAuthenticated);
    console.log('User ID:', user?.id);
    console.log('=======================================');
    
    loadCharities();
  }, []);

  // Filter charities when search query or charities list changes
  useEffect(() => {
    filterCharities();
  }, [searchQuery, charities]);

  const filterCharities = () => {
    if (!searchQuery.trim()) {
      setFilteredCharities(charities);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = charities.filter(charity => 
      charity.display_name?.toLowerCase().includes(query) ||
      charity.legal_name?.toLowerCase().includes(query) ||
      (charity.description && charity.description.toLowerCase().includes(query)) ||
      (charity.business_number && charity.business_number.includes(query))
    );
    
    setFilteredCharities(filtered);
  };

  const loadCharities = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      
      console.log('📡 [GestionMicroDons] Loading approved charities from API...');
      
      // Get user's language preference for bilingual content
      const userData = await apiService.loadUserData();
      const language = userData?.language_preference || 'en';
      
      // Call API with language parameter for bilingual content
      const response = await apiService.getCharities({
        language: language
      });
      
      console.log('📦 [GestionMicroDons] API Response:', {
        success: response.success,
        count: response.charities?.length,
        language: response.language,
        user_language: language
      });
      
      let charitiesArray = [];
      
      // Handle different API response formats
      if (response && response.success && Array.isArray(response.charities)) {
        charitiesArray = response.charities;
        console.log(`✅ [GestionMicroDons] ${charitiesArray.length} charities loaded in ${response.language || language}`);
      } else if (response && Array.isArray(response)) {
        charitiesArray = response;
        console.log(`✅ [GestionMicroDons] ${charitiesArray.length} charities loaded (array format)`);
      } else {
        console.log('⚠️ [GestionMicroDons] No valid charities data received from API');
        
        // Try to load from cache
        const cachedCharities = await AsyncStorage.getItem('cached_charities');
        if (cachedCharities) {
          console.log('📂 [GestionMicroDons] Loading charities from cache');
          const cacheData = JSON.parse(cachedCharities);
          // Handle both old and new cache formats
          const charitiesList = cacheData.charities || cacheData;
          setCharities(charitiesList);
          return;
        } else {
          Alert.alert(
            t('charities.unavailable') || 'No Charities',
            t('charities.no_charities_message') || 'No charities available at the moment.',
            [{ text: t('common.ok') || 'OK' }]
          );
          return;
        }
      }
      
      // Process charities - ensure they're approved
      const processedCharities = charitiesArray
        .filter(charity => charity.is_approved === true || charity.is_approved === 1 || charity.is_approved === '1')
        .map(charity => ({
          ...charity,
          id: Number(charity.id) || 0,
          is_approved: true // Normalize to boolean
        }))
        .filter(charity => charity.id > 0); // Ensure valid IDs
      
      console.log(`✅ [GestionMicroDons] ${processedCharities.length} approved charities after filtering`);
      
      // Sort by display name with locale-aware sorting for bilingual support
      const sortedCharities = processedCharities.sort((a, b) => {
        const nameA = a.display_name || a.legal_name || '';
        const nameB = b.display_name || b.legal_name || '';
        return nameA.localeCompare(nameB, language);
      });
      
      setCharities(sortedCharities);
      
      // Cache charities locally for offline access - include language info
      await AsyncStorage.setItem('cached_charities', JSON.stringify({
        charities: sortedCharities,
        language: response.language || language,
        timestamp: new Date().toISOString(),
        user_language: language
      }));
      
    } catch (error) {
      console.error('❌ [GestionMicroDons] Error loading charities:', error);
      
      // Try to load from cache
      try {
        const cachedCharities = await AsyncStorage.getItem('cached_charities');
        if (cachedCharities) {
          console.log('📂 [GestionMicroDons] Loading charities from cache (offline mode)');
          const cacheData = JSON.parse(cachedCharities);
          const charitiesList = cacheData.charities || cacheData;
          setCharities(charitiesList);
          
          Alert.alert(
            t('charities.connection_error') || 'Connection Error',
            t('charities.offline_message') || 'Unable to load charities. Please check your internet connection.',
            [{ text: t('common.ok') || 'OK' }]
          );
        }
      } catch (cacheError) {
        console.error('Cache error:', cacheError);
      }
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  };

  // ========== CHARITY SELECTION & NAVIGATION TO QR SCANNER ==========
  const handleCharitySelect = async (charity) => {
    try {
      console.log('========== CHARITY SELECTION ==========');
      console.log('Charity selected:', charity.display_name || charity.legal_name);
      console.log('Charity ID:', charity.id, 'Type:', typeof charity.id);
      console.log('Business Number:', charity.business_number);
      console.log('User ID:', user?.id);
      console.log('=======================================');
      
      // Validate charity data
      if (!charity.id || charity.id <= 0) {
        Alert.alert(
          t('charities.invalid_error') || 'Invalid Charity',
          t('charities.invalid_message') || 'Invalid charity data. Please try again.',
          [{ text: t('common.ok') || 'OK' }]
        );
        return;
      }
      
      // Check if user is authenticated
      if (!isAuthenticated || !user) {
        Alert.alert(
          t('auth.required_title') || 'Login Required',
          t('auth.required_message') || 'Please sign in to select a charity and make donations.',
          [
            { text: t('common.cancel') || 'Cancel', style: 'cancel' },
            { 
              text: t('auth.login') || 'Login', 
              onPress: () => navigation.navigate('Login', { 
                redirectTo: 'CharitySelection',
                charityData: charity
              })
            }
          ]
        );
        return;
      }
      
      // Store charity selection temporarily (for this session only)
      const charitySelection = {
        charity_id: charity.id,
        charity_name: charity.display_name || charity.legal_name,
        charity_bn: charity.business_number || 'N/A',
        charity_category: charity.category || 'other',
        selected_at: new Date().toISOString(),
        // Store in AsyncStorage for session creation later
        session_data: {
          user_id: user.id,
          user_legal_name: user.legal_name,
          user_email: user.email,
          charity_id: charity.id,
          charity_name: charity.display_name || charity.legal_name,
          // module_id will be added when QR is scanned
          // session_uuid will be generated when session is created
        }
      };
      
      // Store in AsyncStorage for QRScanner to use
      await AsyncStorage.setItem('current_charity_selection', JSON.stringify(charitySelection));
      
      // Also store in recent selections
      const historyKey = `recent_charity_selections_${user.id}`;
      const existingHistory = await AsyncStorage.getItem(historyKey);
      const history = existingHistory ? JSON.parse(existingHistory) : [];
      
      // Add to history if not already in recent
      const isAlreadyInHistory = history.some(item => item.charity_id === charity.id);
      if (!isAlreadyInHistory) {
        history.unshift({
          charity_id: charity.id,
          charity_name: charity.display_name || charity.legal_name,
          selected_at: new Date().toISOString()
        });
        
        // Keep only last 5 selections
        await AsyncStorage.setItem(historyKey, JSON.stringify(history.slice(0, 5)));
      }
      
      // ========== NAVIGATION TO QRSCANNER - EXACT FORMAT EXPECTED ==========
      // QRScannerScreen expects this EXACT data structure
      navigation.navigate('QRScanner', {
        charityData: {
          id: charity.id,
          name: charity.display_name || charity.legal_name,
          business_number: charity.business_number,
          category: charity.category
        },
        userData: {
          id: user.id,
          legal_name: user.legal_name,
          email: user.email
        }
        // NO moduleData here - that comes from QR scan
      });
      // ====================================================================
      
    } catch (error) {
      console.error('Error selecting charity:', error);
      Alert.alert(
        t('common.error') || 'Error',
        t('charities.selection_error') || 'Failed to select charity. Please try again.',
        [{ text: t('common.ok') || 'OK' }]
      );
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCharities(false);
  };

  const handleSearchChange = (query) => {
    setSearchQuery(query);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const renderCharityItem = ({ item }) => {
    return (
      <Card style={styles.charityCard} mode="elevated">
        <Card.Content>
          <View style={styles.charityHeader}>
            <View style={styles.charityTitleContainer}>
              <Title style={styles.charityName}>
                {item.display_name || item.legal_name || 'Unknown Charity'}
              </Title>
              <Badge size={16} style={styles.verifiedBadge}>
                ✓
              </Badge>
            </View>
            
            {item.category && (
              <Chip 
                style={styles.categoryChip}
                textStyle={styles.categoryChipText}
                mode="outlined"
              >
                {t(`categories.${item.category}`) || item.category}
              </Chip>
            )}
          </View>
          
          {/* Charity status indicator */}
          <View style={styles.statusContainer}>
            <View style={styles.approvedStatus}>
              <Text style={styles.approvedStatusText}>
                ✅ {t('charities.approved_status') || 'Approved & Verified'}
              </Text>
            </View>
          </View>
          
          <Text style={styles.businessNumber}>
            BN: {item.business_number || 'N/A'}
          </Text>
          
          <Paragraph style={styles.charityDescription} numberOfLines={3}>
            {item.description || (t('charities.no_description') || 'No description available')}
          </Paragraph>
          
          {item.website_url && (
            <Text style={styles.website} numberOfLines={1}>
              🌐 {item.website_url}
            </Text>
          )}
          
          {/* Session info - this charity selection is for THIS SESSION ONLY */}
          <Surface style={styles.sessionInfo} elevation={0}>
            <Text style={styles.sessionInfoText}>
              ⏱️ {t('charities.session_only') || 'Selected charity will be used for this donation session only'}
            </Text>
          </Surface>
        </Card.Content>
        
        {/* SELECT BUTTON - Fully bilingual, highly visible */}
        <Card.Actions>
          <Button
            mode="contained"
            onPress={() => handleCharitySelect(item)}
            style={styles.selectButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
            icon="qrcode-scan"
          >
            {t('charities.select_for_session') || 'Select for This Session'}
          </Button>
        </Card.Actions>
      </Card>
    );
  };

  const renderEmptyState = () => (
    <Card style={styles.emptyStateCard} mode="elevated">
      <Card.Content style={styles.emptyStateContent}>
        <Title style={styles.emptyTitle}>
          {searchQuery 
            ? (t('charities.no_results') || 'No Results')
            : (t('charities.empty_list') || 'Empty List')}
        </Title>
        <Paragraph style={styles.emptyText}>
          {searchQuery 
            ? (t('charities.no_results_message') || 'No charities match your search. Try different keywords.')
            : (t('charities.empty_list_message') || 'No charities available at the moment. Charities will appear here once added by the administration.')
          }
        </Paragraph>
        <Button 
          mode="outlined" 
          onPress={onRefresh}
          style={styles.refreshButton}
          icon="refresh"
        >
          {t('common.refresh') || 'Refresh'}
        </Button>
      </Card.Content>
    </Card>
  );

  const renderHeader = () => {
    const approvedCount = charities.filter(charity => charity.is_approved === true).length;
    const totalCount = charities.length;
    
    return (
      <>
        {/* Information Header */}
        <Card style={styles.infoHeaderCard} mode="elevated">
          <Card.Content>
            <Title style={styles.infoHeaderTitle}>
              {t('charities.select_title') || 'Select a Charity for This Session'}
            </Title>
            <Paragraph style={styles.infoHeaderSubtitle}>
              {t('charities.select_subtitle') || 'Choose a charity to support with your donation. This selection is only for the current donation session.'}
            </Paragraph>
            
            {/* Key flow information */}
            <Surface style={styles.flowInfo} elevation={0}>
              <View style={styles.flowStep}>
                <View style={styles.flowNumber}>
                  <Text style={styles.flowNumberText}>1</Text>
                </View>
                <Text style={styles.flowText}>
                  {t('charities.flow_select') || 'Select charity for this session'}
                </Text>
              </View>
              <View style={styles.flowStep}>
                <View style={styles.flowNumber}>
                  <Text style={styles.flowNumberText}>2</Text>
                </View>
                <Text style={styles.flowText}>
                  {t('charities.flow_scan') || 'Scan module QR code at store'}
                </Text>
              </View>
              <View style={styles.flowStep}>
                <View style={styles.flowNumber}>
                  <Text style={styles.flowNumberText}>3</Text>
                </View>
                <Text style={styles.flowText}>
                  {t('charities.flow_insert') || 'Insert coins into module'}
                </Text>
              </View>
              <View style={styles.flowStep}>
                <View style={styles.flowNumber}>
                  <Text style={styles.flowNumberText}>4</Text>
                </View>
                <Text style={styles.flowText}>
                  {t('charities.flow_receipt') || 'Receive annual tax receipt'}
                </Text>
              </View>
            </Surface>
            
            {/* User authentication status */}
            {!isAuthenticated && (
              <View style={styles.authWarning}>
                <Text style={styles.authWarningText}>
                  ⚠️ {t('charities.auth_warning') || 'You must be logged in to select a charity'}
                </Text>
              </View>
            )}
            
            {isAuthenticated && user && (
              <View style={styles.userInfo}>
                <Text style={styles.userInfoText}>
                  👤 {t('charities.logged_in_as') || 'Logged in as:'} {user.legal_name || user.legal_first_name || user.email || `User ${user.id}`}
                </Text>
              </View>
            )}
            
            {/* Session-based selection reminder */}
            <Surface style={styles.sessionReminder} elevation={0}>
              <Text style={styles.sessionReminderText}>
                ⚡ {t('charities.session_reminder') || 'Important: Charity selection is for this session only. You can choose a different charity for your next donation.'}
              </Text>
            </Surface>
          </Card.Content>
        </Card>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder={t('charities.search_placeholder') || 'Search charities...'}
            onChangeText={handleSearchChange}
            value={searchQuery}
            style={styles.searchBar}
            iconColor="#1e3a8a"
            clearIcon={searchQuery ? "close-circle" : undefined}
            onClearIconPress={clearSearch}
            theme={{ colors: { primary: '#1e3a8a' } }}
          />
          
          {searchQuery.trim() && (
            <View style={styles.searchInfo}>
              <Text style={styles.searchInfoText}>
                {filteredCharities.length} {filteredCharities.length === 1 
                  ? (t('charities.result_singular') || 'result')
                  : (t('charities.result_plural') || 'results')}
              </Text>
            </View>
          )}
        </View>

        {/* Charity Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{totalCount}</Text>
            <Text style={styles.statLabel}>{t('charities.total_charities') || 'Total'}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{approvedCount}</Text>
            <Text style={styles.statLabel}>{t('charities.verified') || 'Verified'}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{filteredCharities.length}</Text>
            <Text style={styles.statLabel}>{t('charities.displayed') || 'Displayed'}</Text>
          </View>
        </View>
      </>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1e3a8a" />
        <Text style={styles.loadingText}>
          {t('charities.loading') || 'Loading charities...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredCharities}
        renderItem={renderCharityItem}
        keyExtractor={(item) => `charity-${item.id}`}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#1e3a8a']}
            tintColor="#1e3a8a"
          />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={21}
      />
    </View>
  );
};

// Styles using GestionMicroDons web portal colors
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  // Header Cards
  infoHeaderCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderLeftWidth: 4,
    borderLeftColor: '#1e3a8a',
  },
  infoHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e3a8a',
    marginBottom: 8,
  },
  infoHeaderSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  // Flow information
  flowInfo: {
    backgroundColor: 'rgba(30, 58, 138, 0.05)',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 12,
  },
  flowStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  flowNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1e3a8a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  flowNumberText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  flowText: {
    fontSize: 12,
    color: '#1f2937',
    flex: 1,
    fontWeight: '500',
  },
  authWarning: {
    padding: 10,
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
    marginTop: 8,
    marginBottom: 8,
  },
  authWarningText: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '500',
  },
  userInfo: {
    padding: 10,
    backgroundColor: '#E3F2FD',
    borderRadius: 6,
    marginTop: 8,
    marginBottom: 8,
  },
  userInfoText: {
    fontSize: 13,
    color: '#1e40af',
    fontWeight: '600',
  },
  sessionReminder: {
    backgroundColor: '#F3E8FF',
    padding: 10,
    borderRadius: 6,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#8B5CF6',
  },
  sessionReminderText: {
    fontSize: 12,
    color: '#6D28D9',
    fontWeight: '500',
    lineHeight: 16,
  },
  // Search
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchBar: {
    elevation: 2,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchInfo: {
    paddingHorizontal: 4,
    paddingTop: 8,
  },
  searchInfoText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  // Stats
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    paddingVertical: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e3a8a',
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
  },
  // List
  listContent: {
    paddingBottom: 24,
    flexGrow: 1,
  },
  // Charity Card
  charityCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  charityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  charityTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  charityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  verifiedBadge: {
    backgroundColor: '#10b981',
    marginLeft: 8,
  },
  // Status Container
  statusContainer: {
    marginBottom: 8,
  },
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
  businessNumber: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  charityDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  website: {
    fontSize: 12,
    color: '#3b82f6',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  sessionInfo: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  sessionInfoText: {
    fontSize: 11,
    color: '#1e40af',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  categoryChip: {
    height: 24,
    backgroundColor: '#E3F2FD',
    borderColor: '#1e3a8a',
  },
  categoryChipText: {
    fontSize: 11,
    color: '#1e3a8a',
  },
  // SELECT BUTTON - Highly visible, bilingual
  selectButton: {
    borderRadius: 6,
    marginLeft: 'auto',
    backgroundColor: '#1e3a8a',
    minWidth: 200, // Ensure enough width for French text
  },
  buttonContent: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'none', // Prevents all-caps
  },
  // Empty State
  emptyStateCard: {
    marginHorizontal: 16,
    marginTop: 32,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  emptyStateContent: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#6b7280',
    lineHeight: 20,
  },
  refreshButton: {
    borderRadius: 6,
    borderColor: '#1e3a8a',
  },
});

export default CharitySelectionScreen;