// services/apiService.js
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your backend API is at https://gestionmicrodons.com/api/
const API_BASE_URL = 'https://gestionmicrodons.com/api';

class GestionMicroDonsApiService {
  // Authentication token management
  authToken = null;
  userProfile = null;

  // ==================== BASE REQUEST METHOD ====================
  
  async request(endpoint, options = {}) {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      
      if (__DEV__) {
        console.log('📡 [GestionMicroDons API] Request:', {
          url,
          method: options.method || 'GET',
          endpoint,
          hasAuth: !!this.authToken,
          body: options.body
        });
      }

      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      };

      if (this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      const config = {
        method: options.method || 'GET',
        headers,
      };

      if (options.body && (options.method === 'POST' || options.method === 'PUT')) {
        config.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      }

      console.log('🌐 Making fetch request to:', url);
      console.log('🌐 With config:', JSON.stringify(config, null, 2));
      
      const response = await fetch(url, config);
      
      console.log('📥 Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      const responseText = await response.text();
      console.log('📥 Raw response text (first 500 chars):', responseText.substring(0, 500));
      
      if (!response.ok) {
        console.error('❌ HTTP Error:', response.status, response.statusText);
        console.error('❌ Error response body:', responseText);
        
        let errorData;
        try {
          errorData = JSON.parse(responseText);
          console.error('❌ Parsed error data:', errorData);
        } catch (e) {
          console.error('❌ Could not parse error as JSON:', e.message);
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('❌ Failed to parse JSON response:', responseText);
        throw new Error('Invalid JSON response from server');
      }
      
      if (__DEV__) {
        console.log('✅ [GestionMicroDons API] Response:', {
          endpoint,
          status: response.status,
          success: data.success,
          data: data
        });
      }
      
      return data;

    } catch (error) {
      console.error('❌ [GestionMicroDons API] Request failed:', {
        endpoint,
        error: error.message,
        stack: error.stack,
        name: error.name
      });
      
      console.error('❌ Full error object:', error);
      
      return {
        success: false,
        error: error.message,
        offline: true,
        timestamp: new Date().toISOString()
      };
    }
  }

  // ==================== CONFIGURATION METHODS ====================
  
  /**
   * Get donation system configuration from backend
   * @param {string} stationId - Optional module ID for module-specific config
   * @param {string} province - Optional province code for tax rates (default: ON)
   * @returns {Promise<Object>} Configuration object
   */
  async getDonationConfig(stationId = null, province = 'ON') {
    try {
      console.log('⚙️ Fetching donation config from backend', { stationId, province });
      
      // Build query parameters
      const params = new URLSearchParams();
      params.append('action', 'get');
      if (stationId) {
        params.append('station_id', stationId);
      }
      params.append('province', province);
      
      // Get app version from package.json or AsyncStorage
      const appVersion = await this.getAppVersion();
      if (appVersion) {
        params.append('client_version', appVersion);
      }
      
      const url = `/config.php?${params.toString()}`;
      
      const response = await this.request(url, {
        method: 'GET',
        headers: {
          'Cache-Control': 'max-age=300' // Respect backend cache
        }
      });
      
      if (response.success && response.config) {
        // Add timestamp and version info
        const configWithMeta = {
          ...response.config,
          _meta: {
            fetchedAt: new Date().toISOString(),
            timestamp: response.timestamp,
            stationId: stationId,
            province: province,
            cacheHint: response.cache_hint || 300
          }
        };
        
        // Cache the config
        await this.cacheDonationConfig(configWithMeta, stationId);
        
        // Check if update is available
        if (response.update_available) {
          console.log('📱 App update available:', response.update_message);
          // You could trigger an update notification here
        }
        
        return {
          success: true,
          config: configWithMeta,
          fromCache: false
        };
      }
      
      // Fallback to cached config
      console.log('⚠️ Falling back to cached config');
      return this.getCachedDonationConfig(stationId);
      
    } catch (error) {
      console.error('❌ Error fetching donation config:', error);
      return this.getCachedDonationConfig(stationId);
    }
  }

  /**
   * Get cached donation configuration
   * @param {string} stationId - Optional module ID
   * @returns {Promise<Object>} Cached or default config
   */
  async getCachedDonationConfig(stationId = null) {
    try {
      // Try module-specific cache first
      if (stationId) {
        const moduleCacheKey = `donation_config_${stationId}`;
        const cached = await AsyncStorage.getItem(moduleCacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          const cacheAge = Date.now() - new Date(parsed._meta?.fetchedAt).getTime();
          const maxAge = (parsed._meta?.cacheHint || 300) * 1000;
          
          if (cacheAge < maxAge) {
            console.log('✅ Using module-specific cached config');
            return {
              success: true,
              config: parsed,
              fromCache: true,
              cacheAge
            };
          }
        }
      }
      
      // Try global cache
      const globalCache = await AsyncStorage.getItem('donation_config_global');
      if (globalCache) {
        const parsed = JSON.parse(globalCache);
        const cacheAge = Date.now() - new Date(parsed._meta?.fetchedAt).getTime();
        const maxAge = (parsed._meta?.cacheHint || 300) * 1000;
        
        if (cacheAge < maxAge) {
          console.log('✅ Using global cached config');
          return {
            success: true,
            config: parsed,
            fromCache: true,
            cacheAge
          };
        }
      }
      
      // Ultimate fallback to hardcoded defaults
      console.log('⚠️ Using hardcoded default config');
      return this.getDefaultDonationConfig(stationId);
      
    } catch (error) {
      console.error('❌ Error loading cached config:', error);
      return this.getDefaultDonationConfig(stationId);
    }
  }

  /**
   * Cache donation configuration
   * @param {Object} config - Configuration object
   * @param {string} stationId - Optional module ID
   */
  async cacheDonationConfig(config, stationId = null) {
    try {
      const cacheKey = stationId 
        ? `donation_config_${stationId}`
        : 'donation_config_global';
      
      await AsyncStorage.setItem(cacheKey, JSON.stringify(config));
      
      // Also update last config timestamp
      await AsyncStorage.setItem('last_config_update', new Date().toISOString());
      
      console.log('💾 Config cached:', cacheKey);
    } catch (error) {
      console.error('❌ Error caching config:', error);
    }
  }

  /**
   * Get default hardcoded configuration (fallback)
   * @param {string} stationId - Optional module ID
   * @returns {Object} Default config
   */
  getDefaultDonationConfig(stationId = null) {
    const defaultConfig = {
      session_timeout_seconds: 90,
      warning_threshold_seconds: 30,
      warning_trigger: 60, // session_timeout - warning_threshold
      heartbeat_interval_seconds: 30,
      max_session_amount: 100.00,
      
      coin_values: {
        nickel: 0.05,
        dime: 0.10,
        quarter: 0.25,
        loonie: 1.00,
        toonie: 2.00
      },
      
      tax_credit: {
        federal: {
          first_tier: {
            threshold: 200,
            rate: 0.15
          },
          second_tier_rate: 0.29
        },
        provincial: {
          code: 'ON',
          first_tier: {
            threshold: 200,
            rate: 0.0505
          },
          second_tier_rate: 0.1116
        }
      },
      
      features: {
        offline_mode_enabled: true,
        real_time_updates: true,
        push_notifications: true
      },
      
      _meta: {
        fetchedAt: new Date().toISOString(),
        isDefault: true,
        stationId: stationId
      }
    };
    
    return {
      success: true,
      config: defaultConfig,
      fromCache: false,
      isDefault: true
    };
  }

  /**
   * Clear cached configuration
   * @param {string} stationId - Optional module ID
   */
  async clearConfigCache(stationId = null) {
    try {
      if (stationId) {
        await AsyncStorage.removeItem(`donation_config_${stationId}`);
      } else {
        await AsyncStorage.removeItem('donation_config_global');
      }
      console.log('🧹 Config cache cleared');
    } catch (error) {
      console.error('❌ Error clearing config cache:', error);
    }
  }

  /**
   * Get app version from package.json or AsyncStorage
   * @returns {Promise<string|null>} App version
   */
  async getAppVersion() {
    try {
      // Try to get from AsyncStorage first (set during app initialization)
      let version = await AsyncStorage.getItem('app_version');
      
      if (!version) {
        // Fallback: try to require package.json (may not work in all environments)
        try {
          const pkg = require('../../package.json');
          version = pkg.version;
          await AsyncStorage.setItem('app_version', version);
        } catch (e) {
          console.log('Could not load package.json');
        }
      }
      
      return version || null;
    } catch (error) {
      console.error('Error getting app version:', error);
      return null;
    }
  }

  // ==================== AUTHENTICATION METHODS ====================
  
  async login(email, password) {
    try {
      const response = await this.request('/auth.php', {
        method: 'POST',
        body: {
          action: 'login',
          email: email,
          password: password
        }
      });
      
      if (response.success && response.user_id) {
        const token = `${response.user_id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.authToken = token;
        await this.saveAuthToken(token);
        
        await this.loadUserData();
        
        return {
          success: true,
          user_id: response.user_id,
          user_type: response.user_type,
          token: token,
          language_preference: response.language_preference || 'en'
        };
      } else {
        return {
          success: false,
          message: response.error || 'Invalid credentials'
        };
      }
      
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Login failed',
        offline: true
      };
    }
  }

  async register(userData) {
    try {
      const registrationData = {
        action: 'register',
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: userData.password,
        address: userData.address,
        city: userData.city,
        province: userData.province,
        postalCode: userData.postalCode,
        phone: userData.phone || '',
        language_preference: userData.language_preference || 'en',
        optInCharityComms: userData.optInCharityComms || false
      };

      const response = await this.request('/auth.php', {
        method: 'POST',
        body: registrationData
      });
      
      if (response.success && response.user_id) {
        this.authToken = response.token;
        await this.saveAuthToken(response.token);
        
        const userProfile = {
          id: response.user_id,
          user_type: response.user_type || 'donor',
          email: userData.email,
          legal_first_name: userData.firstName,
          legal_last_name: userData.lastName,
          legal_name: response.legal_name || `${userData.firstName} ${userData.lastName}`,
          address_street: userData.address,
          address_city: userData.city,
          address_province: userData.province,
          address_postal_code: userData.postalCode.toUpperCase().replace(/\s/g, ''),
          phone: userData.phone || '',
          language_preference: userData.language_preference || 'en',
          is_verified: response.is_verified || false,
          phone_verified: false,
          opt_in_charity_comms: userData.optInCharityComms || false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        await this.saveUserData(userProfile);
        
        return {
          success: true,
          message: response.message || 'Registration successful',
          user_id: response.user_id,
          user_type: response.user_type || 'donor',
          token: response.token,
          profile: userProfile
        };
      } else {
        return {
          success: false,
          message: response.error || 'Registration failed'
        };
      }
      
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Registration failed',
        offline: true
      };
    }
  }

  async logout() {
    this.authToken = null;
    this.userProfile = null;
    await AsyncStorage.multiRemove(['gmd_token', 'gmd_user', 'user_profile', 'cached_charities']);
  }

  // ==================== USER MANAGEMENT ====================
  
  async getUserProfile() {
    try {
      if (this.authToken) {
        try {
          const response = await fetch(`${API_BASE_URL}/profile.php`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${this.authToken}`,
              'Content-Type': 'application/json',
            },
          });
          
          const data = await response.json();
          
          if (data.success && data.user) {
            this.userProfile = data.user;
            await this.saveUserData(data.user);
            
            return {
              success: true,
              profile: data.user,
              synced: true
            };
          }
        } catch (apiError) {
          console.log('API profile fetch failed, using local data:', apiError.message);
        }
      }
      
      const userData = await this.loadUserData();
      
      if (userData) {
        this.userProfile = userData;
        return {
          success: true,
          profile: userData,
          offline: !this.authToken
        };
      }
      
      return {
        success: false,
        error: 'No user data found'
      };
      
    } catch (error) {
      console.error('Get user profile error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async updateProfile(updates) {
    try {
      const currentData = await this.loadUserData();
      if (currentData) {
        const updatedData = { 
          ...currentData, 
          ...updates,
          updated_at: new Date().toISOString()
        };
        await this.saveUserData(updatedData);
        this.userProfile = updatedData;
      }
      
      return { 
        success: true, 
        message: 'Profile updated locally',
        profile: this.userProfile
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ==================== LANGUAGE MANAGEMENT ====================
  
  async getUserLanguage() {
    try {
      const userData = await this.loadUserData();
      return userData?.language_preference || 'en';
    } catch (error) {
      console.error('Error getting user language:', error);
      return 'en';
    }
  }

  async setUserLanguage(language) {
    try {
      const userData = await this.loadUserData();
      if (userData) {
        const updatedUser = {
          ...userData,
          language_preference: language,
          updated_at: new Date().toISOString()
        };
        
        await this.saveUserData(updatedUser);
        this.userProfile = updatedUser;
        
        if (this.authToken) {
          try {
            await this.request('/profile.php', {
              method: 'POST',
              body: {
                action: 'update_language',
                language: language
              }
            });
          } catch (error) {
            console.log('Failed to sync language preference to server:', error.message);
          }
        }
        
        await AsyncStorage.removeItem('cached_charities');
        console.log('🧹 Cleared cached_charities due to language change to:', language);
        
        return {
          success: true,
          message: 'Language preference updated',
          language: language
        };
      }
      
      return {
        success: false,
        error: 'No user data found'
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ==================== CHARITY METHODS ====================
  
  async getCharities(filters = {}) {
    try {
      const userData = await this.loadUserData();
      
      if (!userData || !userData.id) {
        console.warn('⚠️ No authenticated user found for getCharities');
        return {
          success: false,
          error: 'User not authenticated',
          charities: []
        };
      }
      
      let userLanguage = userData.language_preference || 'en';
      userLanguage = (userLanguage === 'fr' || userLanguage === 'en') ? userLanguage : 'en';
      
      console.log('🌐 [API] Getting charities for user:', {
        user_id: userData.id,
        preferred_language: userLanguage,
        email: userData.email
      });
      
      const params = new URLSearchParams();
      params.append('language', userLanguage);
      params.append('user_id', userData.id);
      
      if (filters.category) {
        params.append('category', filters.category);
      }
      
      if (filters.search) {
        params.append('search', filters.search);
      }
      
      if (filters.force_refresh) {
        params.append('force_refresh', '1');
      }
      
      const queryString = params.toString();
      const url = `/charities.php${queryString ? '?' + queryString : ''}`;
      
      console.log('📡 Fetching charities with URL:', url);
      
      const response = await this.request(url);
      
      if (response.success && response.charities) {
        if (response.language !== userLanguage) {
          console.warn(`⚠️ Backend language mismatch: Sent ${userLanguage}, got ${response.language}`);
        } else {
          console.log(`✅ Backend confirmed language: ${response.language}`);
        }
        
        if (__DEV__ && response.charities.length > 0) {
          console.log('📋 Sample charity in ' + response.language + ':', {
            id: response.charities[0].id,
            name: response.charities[0].display_name,
            description: response.charities[0].description?.substring(0, 50) + '...'
          });
        }
        
        const cacheData = {
          charities: response.charities,
          language: response.language,
          user_language: userLanguage,
          user_id: userData.id,
          timestamp: new Date().toISOString(),
          message: response.message
        };
        
        await AsyncStorage.setItem('cached_charities', JSON.stringify(cacheData));
        console.log('💾 Cached', response.charities.length, 'charities in', response.language);
        
        return {
          success: true,
          charities: response.charities,
          count: response.charities.length,
          language: response.language,
          user_language: userLanguage,
          message: response.message
        };
      }
      
      return response;
      
    } catch (error) {
      console.error('❌ Error in getCharities:', error);
      
      try {
        const cached = await AsyncStorage.getItem('cached_charities');
        const userData = await this.loadUserData();
        
        if (cached && userData) {
          const cacheData = JSON.parse(cached);
          const currentUserLanguage = userData.language_preference || 'en';
          
          if (cacheData.language === currentUserLanguage) {
            console.log('📂 Using cached charities in', cacheData.language);
            return {
              success: true,
              charities: cacheData.charities || [],
              count: cacheData.charities?.length || 0,
              language: cacheData.language,
              offline: true,
              cached: true
            };
          } else {
            console.warn(`🚫 Cache language mismatch: Cache=${cacheData.language}, User=${currentUserLanguage}`);
            return {
              success: false,
              error: `Please connect to the internet to view content in ${currentUserLanguage === 'fr' ? 'French' : 'English'}`,
              charities: [],
              offline: true,
              language_mismatch: true,
              required_language: currentUserLanguage
            };
          }
        }
      } catch (cacheError) {
        console.error('Cache error:', cacheError);
      }
      
      return {
        success: false,
        error: error.message,
        offline: true,
        charities: []
      };
    }
  }

  async getCharityDetails(charityId) {
    try {
      const userData = await this.loadUserData();
      const userLanguage = userData?.language_preference || 'en';
      
      const params = new URLSearchParams();
      params.append('language', userLanguage);
      
      if (userData?.id) {
        params.append('user_id', userData.id);
      }
      
      const url = `/charities.php${params.toString() ? '?' + params.toString() : ''}`;
      const response = await this.request(url);
      
      if (response.success && response.charities) {
        const charity = response.charities.find(c => c.id === parseInt(charityId));
        
        if (charity) {
          return {
            success: true,
            charity: {
              ...charity,
              language_used: response.language || userLanguage
            },
            language: response.language || userLanguage
          };
        }
      }
      
      return {
        success: false,
        error: 'Charity not found'
      };
      
    } catch (error) {
      try {
        const cached = await AsyncStorage.getItem('cached_charities');
        if (cached) {
          const cacheData = JSON.parse(cached);
          const charity = cacheData.charities.find(c => c.id === parseInt(charityId));
          
          if (charity) {
            return {
              success: true,
              charity: charity,
              language: cacheData.language || 'en',
              offline: true
            };
          }
        }
      } catch (cacheError) {
        console.error('Error loading cached charity:', cacheError);
      }
      
      return {
        success: false,
        error: error.message,
        offline: true
      };
    }
  }

  async searchCharities(query) {
    try {
      const userData = await this.loadUserData();
      const userLanguage = userData?.language_preference || 'en';
      
      const params = new URLSearchParams();
      params.append('language', userLanguage);
      params.append('search', query);
      
      if (userData?.id) {
        params.append('user_id', userData.id);
      }
      
      const url = `/charities.php${params.toString() ? '?' + params.toString() : ''}`;
      const response = await this.request(url);
      
      if (response.success && response.charities) {
        const charitiesWithLanguage = response.charities.map(charity => ({
          ...charity,
          language_used: response.language || userLanguage
        }));
        
        return {
          success: true,
          charities: charitiesWithLanguage,
          count: charitiesWithLanguage.length,
          language: response.language || userLanguage
        };
      }
      
      return response;
      
    } catch (error) {
      try {
        const cached = await AsyncStorage.getItem('cached_charities');
        if (cached) {
          const cacheData = JSON.parse(cached);
          const searchLower = query.toLowerCase();
          const filtered = cacheData.charities.filter(charity => 
            charity.display_name.toLowerCase().includes(searchLower) ||
            charity.description?.toLowerCase().includes(searchLower)
          );
          
          return {
            success: true,
            charities: filtered,
            count: filtered.length,
            language: cacheData.language || 'en',
            offline: true
          };
        }
      } catch (cacheError) {
        console.error('Error in offline search:', cacheError);
      }
      
      return {
        success: false,
        error: error.message,
        offline: true,
        charities: []
      };
    }
  }

  // ==================== SESSION METHODS ====================
  
  async startDonationSession(donorId, charityId, moduleId) {
    console.log('🚀 Starting donation session:', { donorId, charityId, moduleId });
    
    return this.authenticatedRequest('/sessions.php?action=create', {
      method: 'POST',
      body: {
        user_id: donorId,
        charity_id: charityId,
        station_id: moduleId
      },
    });
  }

  async getActiveSession(donorId, moduleId = null) {
    let url = `/sessions.php?action=active&donor_id=${donorId}`;
    if (moduleId) {
      url += `&station_id=${moduleId}`;
    }
    return this.authenticatedRequest(url);
  }

  async verifySession(sessionId) {
    return this.authenticatedRequest('/sessions.php?action=get', {
      method: 'POST',
      body: { session_id: sessionId },
    });
  }

  async endSession(sessionId) {
    return this.authenticatedRequest('/sessions.php?action=end', {
      method: 'POST',
      body: { session_id: sessionId },
    });
  }

  async getSessionDonations(sessionId, donorId) {
    return this.authenticatedRequest(`/donations.php?action=session_transactions&session_id=${sessionId}`);
  }

  // ==================== DONATION STATS METHODS ====================
  
  async getDonationStats(donorId) {
    return this.authenticatedRequest(`/donations.php?action=user_ledger`);
  }

  async getDonationHistory(donorId) {
    return this.authenticatedRequest(`/donations.php?action=user_ledger`);
  }

  async getTaxReceipts(donorId, year) {
    return this.authenticatedRequest(`/donations.php?action=charity_buckets&year=${year}`);
  }

  // ==================== VOUCHER LEDGER METHODS ====================
  
  /**
   * Get voucher ledger data for dashboard
   * @param {number} year - The tax year to fetch (defaults to current year)
   * @returns {Promise<Object>} Response with vouchers array
   */
  async getVoucherLedger(year = new Date().getFullYear()) {
    try {
      console.log('📋 Fetching voucher ledger for dashboard, year:', year);
      
      const response = await this.authenticatedRequest(`/vouchers.php?action=history&year=${year}`);
      
      if (response.success && response.vouchers) {
        const recentVouchers = response.vouchers.slice(0, 5);
        
        return {
          success: true,
          vouchers: recentVouchers,
          total: response.vouchers.length
        };
      }
      
      const cached = await this.getCachedVouchers(year);
      if (cached.success && cached.vouchers) {
        return {
          success: true,
          vouchers: cached.vouchers.slice(0, 5),
          total: cached.vouchers.length,
          offline: true
        };
      }
      
      return {
        success: false,
        vouchers: [],
        total: 0
      };
      
    } catch (error) {
      console.error('Error in getVoucherLedger:', error);
      
      const cached = await this.getCachedVouchers(year);
      if (cached.success && cached.vouchers) {
        return {
          success: true,
          vouchers: cached.vouchers.slice(0, 5),
          total: cached.vouchers.length,
          offline: true
        };
      }
      
      return {
        success: false,
        vouchers: [],
        total: 0,
        error: error.message
      };
    }
  }
  
  /**
   * Get user's voucher history for a specific year
   * @param {number} year - The tax year to fetch (defaults to current year)
   * @returns {Promise<Object>} Response with vouchers array
   */
  async getVoucherHistory(year = new Date().getFullYear()) {
    try {
      console.log('📋 Fetching voucher history for year:', year);
      
      const response = await this.authenticatedRequest(`/vouchers.php?action=history&year=${year}`);
      
      if (response.success && response.vouchers) {
        const localVouchers = await this.getLocalVouchers();
        const yearLocalVouchers = localVouchers.filter(v => {
          const voucherYear = new Date(v.timestamp || v.created_at).getFullYear();
          return voucherYear === year && !v.synced;
        });
        
        const allVouchers = [...response.vouchers, ...yearLocalVouchers];
        const uniqueVouchers = this.removeDuplicateVouchers(allVouchers);
        
        await AsyncStorage.setItem(`vouchers_${year}`, JSON.stringify(uniqueVouchers));
        
        return {
          success: true,
          vouchers: uniqueVouchers,
          count: uniqueVouchers.length,
          synced: true
        };
      }
      
      return this.getCachedVouchers(year);
      
    } catch (error) {
      console.error('Error fetching voucher history:', error);
      return this.getCachedVouchers(year);
    }
  }

  /**
   * Get cached vouchers for offline use
   * @param {number} year 
   * @returns {Promise<Object>}
   */
  async getCachedVouchers(year) {
    try {
      const cached = await AsyncStorage.getItem(`vouchers_${year}`);
      if (cached) {
        const vouchers = JSON.parse(cached);
        return {
          success: true,
          vouchers: vouchers,
          count: vouchers.length,
          offline: true,
          cached: true
        };
      }
    } catch (cacheError) {
      console.error('Error loading cached vouchers:', cacheError);
    }
    
    const localVouchers = await this.getLocalVouchers();
    const yearVouchers = localVouchers.filter(v => {
      const voucherYear = new Date(v.timestamp || v.created_at).getFullYear();
      return voucherYear === year;
    });
    
    return {
      success: true,
      vouchers: yearVouchers,
      count: yearVouchers.length,
      offline: true
    };
  }

  /**
   * Get charity buckets for a specific year
   * @param {number} year - The tax year to fetch (defaults to current year)
   * @returns {Promise<Object>} Response with buckets array and summary
   */
  async getCharityBuckets(year = new Date().getFullYear()) {
    try {
      console.log('📊 Fetching charity buckets for year:', year);
      
      const response = await this.authenticatedRequest(`/vouchers.php?action=buckets&year=${year}`);
      
      if (response.success && response.buckets) {
        await AsyncStorage.setItem(`charity_buckets_${year}`, JSON.stringify({
          buckets: response.buckets,
          summary: response.summary
        }));
        
        return {
          success: true,
          buckets: response.buckets,
          summary: response.summary,
          count: response.buckets.length,
          synced: true
        };
      }
      
      return this.getCachedCharityBuckets(year);
      
    } catch (error) {
      console.error('Error fetching charity buckets:', error);
      return this.getCachedCharityBuckets(year);
    }
  }

  /**
   * Get cached charity buckets for offline use
   * @param {number} year 
   * @returns {Promise<Object>}
   */
  async getCachedCharityBuckets(year) {
    try {
      const cached = await AsyncStorage.getItem(`charity_buckets_${year}`);
      if (cached) {
        const data = JSON.parse(cached);
        return {
          success: true,
          buckets: data.buckets || [],
          summary: data.summary || {
            total_donated: 0,
            total_transactions: 0,
            unique_charities: 0,
            estimated_tax_credit: 0
          },
          count: data.buckets?.length || 0,
          offline: true,
          cached: true
        };
      }
    } catch (cacheError) {
      console.error('Error loading cached charity buckets:', cacheError);
    }
    
    const localVouchers = await this.getLocalVouchers();
    const buckets = this.calculateCharityBuckets(localVouchers, year);
    const totalDonated = buckets.reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0);
    const totalTransactions = buckets.reduce((sum, b) => sum + (b.transaction_count || 0), 0);
    
    let estimatedTaxCredit = 0;
    if (totalDonated > 0) {
      const firstTier = Math.min(totalDonated, 200) * 0.15;
      const secondTier = Math.max(0, totalDonated - 200) * 0.29;
      estimatedTaxCredit = Math.round((firstTier + secondTier) * 100) / 100;
    }
    
    return {
      success: true,
      buckets: buckets,
      summary: {
        total_donated: Math.round(totalDonated * 100) / 100,
        total_transactions: totalTransactions,
        unique_charities: buckets.length,
        estimated_tax_credit: estimatedTaxCredit
      },
      count: buckets.length,
      offline: true
    };
  }

  /**
   * NEW: Get unclaimed donations available for carryforward
   * Returns donations from previous years that haven't been claimed on any tax return yet
   * @returns {Promise<Object>} Response with unclaimed array and summary
   */
  async getUnclaimedDonations() {
    try {
      console.log('📦 Fetching unclaimed donations for carryforward');
      
      const response = await this.authenticatedRequest('/vouchers.php?action=unclaimed');
      
      if (response.success) {
        // Cache the unclaimed data for offline use
        await AsyncStorage.setItem('unclaimed_donations_cache', JSON.stringify({
          unclaimed: response.unclaimed,
          summary: response.summary,
          timestamp: new Date().toISOString()
        }));
        
        return {
          success: true,
          unclaimed: response.unclaimed || [],
          summary: response.summary || {
            total_unclaimed: 0,
            years_count: 0,
            earliest_expiry: null
          }
        };
      }
      
      // Fallback to cached data
      return this.getCachedUnclaimedDonations();
      
    } catch (error) {
      console.error('Error fetching unclaimed donations:', error);
      return this.getCachedUnclaimedDonations();
    }
  }

  /**
   * Get cached unclaimed donations for offline use
   * @returns {Promise<Object>} Cached unclaimed data
   */
  async getCachedUnclaimedDonations() {
    try {
      const cached = await AsyncStorage.getItem('unclaimed_donations_cache');
      if (cached) {
        const data = JSON.parse(cached);
        const cacheAge = Date.now() - new Date(data.timestamp).getTime();
        const maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (cacheAge < maxCacheAge) {
          console.log('📂 Using cached unclaimed donations');
          return {
            success: true,
            unclaimed: data.unclaimed || [],
            summary: data.summary || {
              total_unclaimed: 0,
              years_count: 0,
              earliest_expiry: null
            },
            offline: true,
            cached: true
          };
        }
      }
    } catch (cacheError) {
      console.error('Error loading cached unclaimed donations:', cacheError);
    }
    
    // Return empty result if no cache
    return {
      success: true,
      unclaimed: [],
      summary: {
        total_unclaimed: 0,
        years_count: 0,
        earliest_expiry: null
      },
      offline: true
    };
  }

  /**
   * NEW: Claim unclaimed donations for a specific tax year
   * Allows donors to carry forward donations and claim them in a future year
   * @param {number} claimYear - The tax year in which to claim the donations (e.g., 2026)
   * @param {array} donationYears - Array of years to claim (e.g., [2022, 2023, 2024])
   * @returns {Promise<Object>} Response with claimed_count
   */
  async claimDonations(claimYear, donationYears) {
    try {
      if (!claimYear || !donationYears || donationYears.length === 0) {
        return {
          success: false,
          error: 'Missing required parameters: claimYear and donationYears'
        };
      }
      
      console.log('📝 Claiming donations:', { claimYear, donationYears });
      
      const response = await this.authenticatedRequest('/vouchers.php?action=claim', {
        method: 'POST',
        body: {
          claim_year: claimYear,
          donation_years: donationYears
        }
      });
      
      if (response.success) {
        // Clear the unclaimed cache since data has changed
        await AsyncStorage.removeItem('unclaimed_donations_cache');
        
        return {
          success: true,
          claimed_count: response.claimed_count || 0,
          message: response.message || `Successfully claimed ${response.claimed_count || 0} donations`
        };
      }
      
      return response;
      
    } catch (error) {
      console.error('Error claiming donations:', error);
      return {
        success: false,
        error: error.message,
        offline: true
      };
    }
  }

  // ==================== TAX RECEIPT METHODS ====================
  
  /**
   * Get all tax receipts for a user, optionally filtered by year
   * @param {number} year - Optional year to filter receipts
   * @returns {Promise<Object>} Response with receipts array
   */
  async getReceipts(year = null) {
    try {
      console.log('🧾 Fetching tax receipts', year ? `for year: ${year}` : 'for all years');
      
      let url = '/receipts.php?action=list';
      if (year) {
        url += `&year=${year}`;
      }
      
      const response = await this.authenticatedRequest(url);
      
      if (response.success && response.receipts) {
        // Cache receipts by year
        if (year) {
          await AsyncStorage.setItem(`receipts_${year}`, JSON.stringify(response.receipts));
        } else {
          await AsyncStorage.setItem('receipts_all', JSON.stringify(response.receipts));
          
          // Also cache by year for quick access
          const receiptsByYear = {};
          response.receipts.forEach(receipt => {
            if (!receiptsByYear[receipt.year]) {
              receiptsByYear[receipt.year] = [];
            }
            receiptsByYear[receipt.year].push(receipt);
          });
          
          for (const [yr, receipts] of Object.entries(receiptsByYear)) {
            await AsyncStorage.setItem(`receipts_${yr}`, JSON.stringify(receipts));
          }
        }
        
        return {
          success: true,
          receipts: response.receipts,
          count: response.receipts.length,
          synced: true
        };
      }
      
      // Fallback to cached receipts
      return this.getCachedReceipts(year);
      
    } catch (error) {
      console.error('Error fetching receipts:', error);
      return this.getCachedReceipts(year);
    }
  }

  /**
   * Get cached receipts for offline use
   * @param {number} year - Optional year
   * @returns {Promise<Object>} Cached receipts
   */
  async getCachedReceipts(year = null) {
    try {
      const cacheKey = year ? `receipts_${year}` : 'receipts_all';
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (cached) {
        const receipts = JSON.parse(cached);
        return {
          success: true,
          receipts: receipts,
          count: receipts.length,
          offline: true,
          cached: true
        };
      }
    } catch (cacheError) {
      console.error('Error loading cached receipts:', cacheError);
    }
    
    return {
      success: true,
      receipts: [],
      count: 0,
      offline: true
    };
  }

  /**
   * Generate a tax receipt for a specific charity and year
   * @param {number} charityId - The charity ID
   * @param {number} year - The tax year
   * @returns {Promise<Object>} Response with receipt data
   */
  async generateReceipt(charityId, year) {
    try {
      console.log('🧾 Generating receipt for charity:', charityId, 'year:', year);
      
      const response = await this.authenticatedRequest('/receipts.php', {
        method: 'POST',
        body: {
          action: 'generate',
          charity_id: charityId,
          year: year
        }
      });
      
      if (response.success && response.receipt) {
        // Invalidate cached receipts for this year
        await AsyncStorage.removeItem(`receipts_${year}`);
        await AsyncStorage.removeItem('receipts_all');
        
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
        offline: true
      };
    }
  }

  /**
   * Get receipt summary with tax credit estimates
   * @param {number} year - The tax year
   * @returns {Promise<Object>} Summary with totals and tax credits
   */
  async getReceiptSummary(year = new Date().getFullYear()) {
    try {
      // First try to get receipts for the year
      const receiptsResponse = await this.getReceipts(year);
      
      if (receiptsResponse.success && receiptsResponse.receipts.length > 0) {
        const receipts = receiptsResponse.receipts;
        
        // Calculate totals
        const totalDonated = receipts.reduce((sum, r) => sum + r.total_amount, 0);
        
        // Group by charity
        const charities = {};
        receipts.forEach(receipt => {
          if (!charities[receipt.charity_id]) {
            charities[receipt.charity_id] = {
              charity_id: receipt.charity_id,
              charity_name: receipt.charity_name,
              business_number: receipt.business_number,
              total_amount: 0
            };
          }
          charities[receipt.charity_id].total_amount += receipt.total_amount;
        });
        
        // Calculate tax credits (using Ontario rates as default - can be enhanced with user's province)
        let federalCredit = 0;
        let provincialCredit = 0;
        
        if (totalDonated > 0) {
          const firstTier = Math.min(totalDonated, 200);
          const secondTier = Math.max(0, totalDonated - 200);
          
          federalCredit = (firstTier * 0.15) + (secondTier * 0.29);
          provincialCredit = (firstTier * 0.0505) + (secondTier * 0.1116); // Ontario rates
        }
        
        return {
          success: true,
          summary: {
            year,
            total_donated: totalDonated,
            receipt_count: receipts.length,
            charity_count: Object.keys(charities).length,
            charities: Object.values(charities),
            tax_credits: {
              federal: Math.round(federalCredit * 100) / 100,
              provincial: Math.round(provincialCredit * 100) / 100,
              total: Math.round((federalCredit + provincialCredit) * 100) / 100
            }
          },
          synced: true
        };
      }
      
      // Fallback to cached summary
      return this.getCachedReceiptSummary(year);
      
    } catch (error) {
      console.error('Error getting receipt summary:', error);
      return this.getCachedReceiptSummary(year);
    }
  }

  /**
   * Get cached receipt summary
   * @param {number} year 
   * @returns {Promise<Object>}
   */
  async getCachedReceiptSummary(year) {
    try {
      const cached = await AsyncStorage.getItem(`receipt_summary_${year}`);
      if (cached) {
        return {
          success: true,
          summary: JSON.parse(cached),
          offline: true,
          cached: true
        };
      }
    } catch (error) {
      console.error('Error loading cached receipt summary:', error);
    }
    
    return {
      success: true,
      summary: {
        year,
        total_donated: 0,
        receipt_count: 0,
        charity_count: 0,
        charities: [],
        tax_credits: {
          federal: 0,
          provincial: 0,
          total: 0
        }
      },
      offline: true
    };
  }

  // ==================== VOUCHER TRANSACTION METHODS ====================
  
  async createVoucherTransaction(voucherData) {
    try {
      const previousHash = voucherData.previous_hash || null;
      const transactionHash = this.generateTransactionHash(voucherData, previousHash);
      
      const completeVoucherData = {
        ...voucherData,
        transaction_hash: transactionHash,
        previous_hash: previousHash,
        timestamp: new Date().toISOString(),
        synced: false
      };
      
      const voucherId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      completeVoucherData.id = voucherId;
      
      await this.saveVoucherLocally(completeVoucherData);
      
      if (this.authToken) {
        const response = await this.request('/vouchers.php', {
          method: 'POST',
          body: {
            action: 'create',
            charity_id: voucherData.charity_id,
            amount: parseFloat(voucherData.amount).toFixed(2),
            transaction_hash: transactionHash,
            previous_hash: previousHash,
            module_id: voucherData.module_id || 'MOD-001'
          }
        });
        
        if (response.success) {
          completeVoucherData.backend_id = response.voucher_id;
          completeVoucherData.synced = true;
          completeVoucherData.synced_at = new Date().toISOString();
          
          await this.saveVoucherLocally(completeVoucherData);
          
          return {
            success: true,
            voucher: completeVoucherData,
            synced: true,
            voucher_id: response.voucher_id
          };
        } else {
          return {
            success: true,
            voucher: completeVoucherData,
            synced: false,
            voucher_id: voucherId,
            offline: true,
            error: response.error
          };
        }
      } else {
        return {
          success: true,
          voucher: completeVoucherData,
          synced: false,
          voucher_id: voucherId,
          offline: true
        };
      }
      
    } catch (error) {
      const voucherId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const voucherWithId = {
        ...voucherData,
        id: voucherId,
        transaction_hash: voucherData.transaction_hash || `hash_${voucherId}`,
        timestamp: new Date().toISOString(),
        synced: false
      };
      
      await this.saveVoucherLocally(voucherWithId);
      
      return {
        success: true,
        voucher: voucherWithId,
        synced: false,
        voucher_id: voucherId,
        offline: true
      };
    }
  }

  // ==================== TAX RECEIPT METHODS (Legacy - kept for compatibility) ====================
  
  async generateTaxReceipt(charityId, year = new Date().getFullYear()) {
    // Redirect to new method
    return this.generateReceipt(charityId, year);
  }

  async getTaxReceipt(year = new Date().getFullYear()) {
    // Redirect to new method
    const response = await this.getReceipts(year);
    return {
      success: response.success,
      receipt: response.receipts?.[0] || null,
      receipts: response.receipts
    };
  }

  async getReceiptHistory() {
    // Redirect to new method
    return this.getReceipts();
  }

  // ==================== MODULE METHODS ====================
  
  async verifyModule(moduleId) {
    try {
      const response = await this.request(`/modules.php?action=verify&id=${moduleId}`);
      return response;
    } catch (error) {
      return {
        success: false,
        error: error.message,
        offline: true,
        is_online: false
      };
    }
  }

  async getModuleStatus(moduleId) {
    try {
      const response = await this.request(`/modules.php?action=status&id=${moduleId}`);
      return response;
    } catch (error) {
      return {
        success: false,
        error: error.message,
        offline: true
      };
    }
  }

  // ==================== AUTHENTICATED REQUEST METHOD ====================
  
  async authenticatedRequest(endpoint, options = {}) {
    try {
      const token = await AsyncStorage.getItem('gmd_token');
      
      if (!token) {
        return {
          success: false,
          message: 'Authentication required. Please log in again.'
        };
      }

      const config = {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${token}`
        }
      };

      return await this.request(endpoint, config);

    } catch (error) {
      console.error('Authenticated request failed:', error);
      return {
        success: false,
        message: 'Authentication failed. Please log in again.'
      };
    }
  }

  // ==================== SYNC METHODS ====================
  
  async syncPendingVouchers() {
    try {
      const pendingVouchers = await this.getLocalVouchers();
      const unsynced = pendingVouchers.filter(v => !v.synced);
      
      if (unsynced.length === 0) {
        return { 
          success: true, 
          synced_count: 0, 
          message: 'No pending vouchers' 
        };
      }
      
      const response = await this.request('/vouchers.php', {
        method: 'POST',
        body: {
          action: 'sync',
          vouchers: unsynced.map(v => ({
            id: v.id,
            charity_id: v.charity_id,
            amount: v.amount,
            transaction_hash: v.transaction_hash,
            previous_hash: v.previous_hash,
            module_id: v.module_id,
            timestamp: v.timestamp
          }))
        }
      });
      
      if (response.success && response.synced_vouchers) {
        await this.markVouchersAsSynced(response.synced_vouchers);
      }
      
      return {
        success: response.success || false,
        synced_count: response.synced_count || 0,
        message: response.message || 'Sync completed'
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        offline: true
      };
    }
  }

  // ==================== LOCAL STORAGE METHODS ====================
  
  async saveAuthToken(token) {
    try {
      await AsyncStorage.setItem('gmd_token', token);
      this.authToken = token;
      if (__DEV__) {
        console.log('🔐 Auth token saved:', token.substring(0, 20) + '...');
      }
    } catch (error) {
      console.error('Error saving auth token:', error);
    }
  }

  async loadAuthToken() {
    try {
      const token = await AsyncStorage.getItem('gmd_token');
      this.authToken = token;
      if (__DEV__) {
        console.log('🔐 Auth token loaded:', token ? token.substring(0, 20) + '...' : 'None');
      }
      return token;
    } catch (error) {
      console.error('Error loading auth token:', error);
      return null;
    }
  }

  async saveUserData(user) {
    try {
      const userData = {
        ...user,
        updated_at: new Date().toISOString()
      };
      await AsyncStorage.setItem('gmd_user', JSON.stringify(userData));
      this.userProfile = userData;
      if (__DEV__) {
        console.log('👤 User data saved for ID:', user.id);
      }
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  }

  async loadUserData() {
    try {
      const userData = await AsyncStorage.getItem('gmd_user');
      const parsed = userData ? JSON.parse(userData) : null;
      this.userProfile = parsed;
      if (__DEV__) {
        console.log('👤 User data loaded:', parsed ? `ID ${parsed.id}` : 'None');
      }
      return parsed;
    } catch (error) {
      console.error('Error loading user data:', error);
      return null;
    }
  }

  async saveVoucherLocally(voucherData) {
    try {
      const localVouchers = await this.getLocalVouchers();
      
      const existingIndex = localVouchers.findIndex(v => v.id === voucherData.id);
      
      if (existingIndex >= 0) {
        localVouchers[existingIndex] = {
          ...localVouchers[existingIndex],
          ...voucherData,
          updated_at: new Date().toISOString()
        };
      } else {
        localVouchers.push({
          ...voucherData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
      
      await AsyncStorage.setItem('local_vouchers', JSON.stringify(localVouchers));
      
      if (voucherData.charity_id && voucherData.amount) {
        await this.updateLocalCharityBucket(voucherData);
      }
      
      if (__DEV__) {
        console.log('💾 Voucher saved locally:', voucherData.id);
      }
      return true;
    } catch (error) {
      console.error('Error saving voucher locally:', error);
      return false;
    }
  }

  async getLocalVouchers() {
    try {
      const vouchers = await AsyncStorage.getItem('local_vouchers');
      const parsed = vouchers ? JSON.parse(vouchers) : [];
      return parsed;
    } catch (error) {
      console.error('Error getting local vouchers:', error);
      return [];
    }
  }

  async markVouchersAsSynced(voucherIds) {
    try {
      const vouchers = await this.getLocalVouchers();
      const updatedVouchers = vouchers.map(voucher => 
        voucherIds.includes(voucher.id) ? { 
          ...voucher, 
          synced: true,
          synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } : voucher
      );
      
      await AsyncStorage.setItem('local_vouchers', JSON.stringify(updatedVouchers));
      if (__DEV__) {
        console.log('✅ Vouchers marked as synced:', voucherIds.length);
      }
      return true;
    } catch (error) {
      console.error('Error marking vouchers as synced:', error);
      return false;
    }
  }

  async updateLocalCharityBucket(voucherData) {
    try {
      const year = new Date(voucherData.timestamp).getFullYear();
      const bucketKey = `charity_bucket_${voucherData.charity_id}_${year}`;
      
      let bucket = await AsyncStorage.getItem(bucketKey);
      
      if (bucket) {
        bucket = JSON.parse(bucket);
        const currentAmount = parseFloat(bucket.total_amount) || 0;
        const newAmount = parseFloat(voucherData.amount) || 0;
        
        bucket.total_amount = (currentAmount + newAmount).toFixed(2);
        bucket.transaction_count = (bucket.transaction_count || 0) + 1;
        bucket.last_updated = new Date().toISOString();
        
        if (voucherData.charity_name && !bucket.charity_name) {
          bucket.charity_name = voucherData.charity_name;
        }
      } else {
        bucket = {
          charity_id: voucherData.charity_id,
          charity_name: voucherData.charity_name || 'Unknown Charity',
          tax_year: year,
          total_amount: parseFloat(voucherData.amount || 0).toFixed(2),
          transaction_count: 1,
          status: 'active',
          created_at: new Date().toISOString(),
          last_updated: new Date().toISOString()
        };
      }
      
      await AsyncStorage.setItem(bucketKey, JSON.stringify(bucket));
      if (__DEV__) {
        console.log('💰 Local charity bucket updated:', bucket.charity_name);
      }
      return true;
    } catch (error) {
      console.error('Error updating local charity bucket:', error);
      return false;
    }
  }

  async getLocalCharityBuckets(year = new Date().getFullYear()) {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const bucketKeys = keys.filter(key => key.startsWith('charity_bucket_'));
      const buckets = [];
      
      for (const key of bucketKeys) {
        const bucket = await AsyncStorage.getItem(key);
        if (bucket) {
          const parsedBucket = JSON.parse(bucket);
          if (parsedBucket.tax_year === year) {
            buckets.push(parsedBucket);
          }
        }
      }
      
      if (__DEV__) {
        console.log('💰 Local charity buckets loaded:', buckets.length);
      }
      return buckets;
    } catch (error) {
      console.error('Error getting local charity buckets:', error);
      return [];
    }
  }

  // ==================== UTILITY METHODS ====================
  
  calculateCharityBuckets(vouchers, year) {
    const buckets = {};
    
    vouchers.forEach(voucher => {
      const voucherDate = new Date(voucher.timestamp || voucher.created_at || new Date());
      if (voucherDate.getFullYear() === year) {
        const key = voucher.charity_id;
        
        if (!buckets[key]) {
          buckets[key] = {
            charity_id: voucher.charity_id,
            charity_name: voucher.charity_name || `Charity ${voucher.charity_id}`,
            tax_year: year,
            total_amount: 0,
            transaction_count: 0,
            status: 'active',
            created_at: voucher.timestamp || new Date().toISOString()
          };
        }
        
        const currentAmount = parseFloat(buckets[key].total_amount) || 0;
        const voucherAmount = parseFloat(voucher.amount) || 0;
        
        buckets[key].total_amount = (currentAmount + voucherAmount).toFixed(2);
        buckets[key].transaction_count += 1;
        
        const voucherDate = new Date(voucher.timestamp || voucher.created_at || new Date());
        if (!buckets[key].last_donation || voucherDate > new Date(buckets[key].last_donation)) {
          buckets[key].last_donation = voucherDate.toISOString();
        }
      }
    });
    
    return Object.values(buckets);
  }

  mergeBuckets(backendBuckets, localBuckets) {
    const merged = [...backendBuckets];
    
    localBuckets.forEach(localBucket => {
      const existingIndex = merged.findIndex(b => b.charity_id === localBucket.charity_id);
      
      if (existingIndex >= 0) {
        const backendAmount = parseFloat(merged[existingIndex].total_amount) || 0;
        const localAmount = parseFloat(localBucket.total_amount) || 0;
        
        merged[existingIndex].total_amount = (backendAmount + localAmount).toFixed(2);
        merged[existingIndex].transaction_count += localBucket.transaction_count || 0;
        
        if (localBucket.last_donation && (
          !merged[existingIndex].last_donation || 
          new Date(localBucket.last_donation) > new Date(merged[existingIndex].last_donation)
        )) {
          merged[existingIndex].last_donation = localBucket.last_donation;
        }
      } else {
        merged.push(localBucket);
      }
    });
    
    return merged;
  }

  removeDuplicateVouchers(vouchers) {
    const unique = new Map();
    
    vouchers.forEach(voucher => {
      let key = voucher.transaction_hash;
      
      if (!key && voucher.backend_id) {
        key = `backend_${voucher.backend_id}`;
      } else if (!key) {
        key = `local_${voucher.id}`;
      }
      
      if (key) {
        const existing = unique.get(key);
        if (!existing || 
            (voucher.synced && !existing.synced) ||
            new Date(voucher.timestamp || voucher.created_at) > new Date(existing.timestamp || existing.created_at)) {
          unique.set(key, voucher);
        }
      }
    });
    
    return Array.from(unique.values());
  }

  generateTransactionHash(transactionData, previousHash) {
    const dataToHash = JSON.stringify({
      charity_id: transactionData.charity_id,
      amount: transactionData.amount,
      timestamp: new Date().toISOString(),
      previous_hash: previousHash,
      random: Math.random().toString(36).substr(2, 9)
    });
    
    const hash = btoa(unescape(encodeURIComponent(dataToHash))).substr(0, 64);
    
    if (__DEV__) {
      console.log('🔑 Generated transaction hash:', hash.substring(0, 16) + '...');
    }
    return hash;
  }

  // ==================== SERVER STATUS METHOD ====================
  
  async checkServerStatus() {
    try {
      const response = await fetch(`${API_BASE_URL}/status.php`);
      return response.ok;
    } catch (error) {
      console.error('Server status check failed:', error);
      return false;
    }
  }

  // ==================== INITIALIZATION ====================
  
  async initialize() {
    try {
      await this.loadAuthToken();
      await this.loadUserData();
      
      const pendingVouchers = await this.getLocalVouchers();
      const unsyncedCount = pendingVouchers.filter(v => !v.synced).length;
      
      // Pre-load config on startup (optional but recommended)
      this.getDonationConfig().catch(err => 
        console.log('Pre-load config failed (will load on demand):', err)
      );
      
      if (__DEV__) {
        console.log('🚀 [GestionMicroDons API] Initialized:', {
          hasToken: !!this.authToken,
          userProfile: this.userProfile ? `ID ${this.userProfile.id}` : 'None',
          userLanguage: this.userProfile?.language_preference || 'en',
          unsyncedVouchers: unsyncedCount,
          baseUrl: API_BASE_URL
        });
      }
      
      return {
        authenticated: !!this.authToken,
        userProfile: this.userProfile,
        userLanguage: this.userProfile?.language_preference || 'en',
        pendingSync: unsyncedCount > 0
      };
    } catch (error) {
      console.error('Error initializing API service:', error);
      return {
        authenticated: false,
        userProfile: null,
        userLanguage: 'en',
        pendingSync: false
      };
    }
  }

  // ==================== CLEANUP METHODS ====================
  
  async clearLocalData() {
    try {
      await AsyncStorage.multiRemove([
        'gmd_token',
        'gmd_user',
        'local_vouchers',
        'cached_charities',
        'donation_config_global',
        'receipts_all',
        'unclaimed_donations_cache'
      ]);
      
      const keys = await AsyncStorage.getAllKeys();
      const bucketKeys = keys.filter(key => 
        key.startsWith('charity_bucket_') || 
        key.startsWith('donation_config_') ||
        key.startsWith('receipts_')
      );
      if (bucketKeys.length > 0) {
        await AsyncStorage.multiRemove(bucketKeys);
      }
      
      this.authToken = null;
      this.userProfile = null;
      
      console.log('🧹 Local data cleared');
      return true;
    } catch (error) {
      console.error('Error clearing local data:', error);
      return false;
    }
  }

  // ==================== STATISTICS METHODS ====================
  
  async getUserStats() {
    try {
      const vouchers = await this.getLocalVouchers();
      const totalAmount = vouchers.reduce((sum, v) => sum + (parseFloat(v.amount) || 0), 0);
      
      return {
        totalVouchers: vouchers.length,
        totalAmount: totalAmount,
        lastDonation: vouchers.length > 0 
          ? vouchers.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0].timestamp
          : null
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      return {
        totalVouchers: 0,
        totalAmount: 0,
        lastDonation: null
      };
    }
  }

  // ==================== LANGUAGE UTILITIES ====================
  
  getCharityInPreferredLanguage(charity, preferredLanguage = null) {
    if (!preferredLanguage) {
      preferredLanguage = this.userProfile?.language_preference || 'en';
    }
    
    if (charity.language_used) {
      return charity;
    }
    
    return charity;
  }

  shouldRefreshCharitiesForLanguageChange(oldLanguage, newLanguage) {
    return oldLanguage !== newLanguage;
  }
}

export default new GestionMicroDonsApiService();