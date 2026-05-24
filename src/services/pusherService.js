import {
  Pusher,
  PusherMember,
  PusherChannel,
  PusherEvent,
} from '@pusher/pusher-websocket-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuration Pusher with actual credentials
const PUSHER_CONFIG = {
  appId: '2109688',
  key: '407c7099cdf6cb3a04cd',
  secret: '28c2a5774b48b24fd200',
  cluster: 'us2',
  useTLS: true,
};

class GestionMicroDonsPusherService {
  constructor() {
    this.pusher = null;
    this.channels = new Map();
    this.eventListeners = new Map();
    this.isConnected = false;
    this.connectionCallbacks = [];
    this.initializationPromise = null;
    this.currentUserId = null;
    this.authToken = null;
    // Track subscription attempts for retry logic
    this.subscriptionAttempts = new Map();
    this.maxRetries = 3;
    
    // Track subscription status for private channels
    this.privateChannelStatus = new Map();
    // Flag to prevent duplicate user channel subscriptions
    this.userChannelsSubscribed = false;
  }

  // Initialiser la connexion Pusher avec authentification
  async init() {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      try {
        console.log('🔌 [GestionMicroDons] Initialisation de Pusher...');
        
        // Charger l'ID utilisateur et token d'authentification
        await this.loadUserCredentials();
        
        this.pusher = Pusher.getInstance();
        
        // Create a promise that resolves when connected
        const connectionReady = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Connection timeout after 10 seconds'));
          }, 10000);
          
          // Initialize with proper auth configuration
          this.pusher.init({
            apiKey: PUSHER_CONFIG.key,
            cluster: PUSHER_CONFIG.cluster,
            authEndpoint: 'https://gestionmicrodons.com/api/pusher_auth.php',
            auth: {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.authToken}`
              }
            },
            onConnectionStateChange: (currentState, previousState) => {
              console.log('📡 [Pusher] État:', previousState, '→', currentState);
              
              if (currentState === 'CONNECTED') {
                clearTimeout(timeout);
                this.isConnected = true;
                console.log('✅ [Pusher] Connecté avec succès');
                this.triggerConnectionCallbacks(true);
                resolve();
                
                // Réabonner aux canaux après reconnexion
                this.resubscribeToChannels();
              } else if (currentState === 'DISCONNECTED' || currentState === 'FAILED') {
                clearTimeout(timeout);
                this.isConnected = false;
                console.log('❌ [Pusher] Déconnecté');
                this.triggerConnectionCallbacks(false);
                reject(new Error(`Connection failed: ${currentState}`));
                
                // Reconnexion automatique
                if (currentState === 'DISCONNECTED') {
                  setTimeout(() => {
                    this.reconnect();
                  }, 5000);
                }
              }
            },
            onError: (errorMessage, errorCode, error) => {
              console.error('❌ [Pusher] Erreur:', errorMessage, errorCode, error);
            },
            onEvent: (event) => {
              console.log('📨 [Pusher] Événement reçu:', {
                channel: event.channelName,
                event: event.eventName,
                data: event.data ? (typeof event.data === 'string' ? event.data.substring(0, 100) : 'object') : 'null'
              });
              // Trigger listeners for this event
              this.triggerEventListeners(event.channelName, event.eventName, event.data);
            }
          });

          console.log('🚀 [Pusher] Initialisation terminée, connexion en cours...');
          this.pusher.connect();
        });

        await connectionReady;
        console.log('✅ [Pusher] Connexion établie, prêt à s\'abonner aux canaux');
        
        return true;

      } catch (error) {
        console.error('❌ [Pusher] Échec de l\'initialisation:', error);
        this.isConnected = false;
        this.initializationPromise = null;
        throw error;
      }
    })();

    return this.initializationPromise;
  }

  // Charger les identifiants utilisateur
  async loadUserCredentials() {
    try {
      const token = await AsyncStorage.getItem('gmd_token');
      this.authToken = token;
      
      const userData = await AsyncStorage.getItem('gmd_user');
      if (userData) {
        const user = JSON.parse(userData);
        this.currentUserId = user.id;
        console.log('👤 [Pusher] Utilisateur chargé:', user.id, 'Token présent:', !!token);
        
        if (this.pusher && this.authToken) {
          console.log('🔄 [Pusher] Token disponible pour authentification');
        }
      } else {
        console.log('👤 [Pusher] Aucun utilisateur chargé');
      }
    } catch (error) {
      console.error('❌ [Pusher] Erreur chargement credentials:', error);
    }
  }

  // Mettre à jour les identifiants utilisateur
  async updateUserCredentials(userId, token) {
    this.currentUserId = userId;
    this.authToken = token;
    this.userChannelsSubscribed = false; // Reset flag on credential update
    console.log('🔄 [Pusher] Identifiants mis à jour:', userId);
    
    if (this.isConnected) {
      console.log('🔄 [Pusher] Reconnexion pour appliquer nouveau token...');
      await this.reconnect();
    }
  }

  // Déconnecter l'utilisateur
  async logout() {
    const oldUserId = this.currentUserId;
    this.currentUserId = null;
    this.authToken = null;
    this.userChannelsSubscribed = false;
    
    if (oldUserId) {
      const userChannel = `private-user_${oldUserId}`;
      await this.unsubscribe(userChannel);
    }
    
    console.log('👋 [Pusher] Utilisateur déconnecté');
  }

  // Méthode de reconnexion
  async reconnect() {
    try {
      if (this.pusher) {
        console.log('🔄 [Pusher] Tentative de reconnexion...');
        await this.pusher.disconnect();
        await this.pusher.connect();
      }
    } catch (error) {
      console.error('❌ [Pusher] Reconnexion échouée:', error);
    }
  }

  // Réabonner aux canaux après reconnexion
  async resubscribeToChannels() {
    console.log('📡 [Pusher] Réabonnement aux canaux...');
    
    const channelList = Array.from(this.channels.keys());
    this.channels.clear();
    this.privateChannelStatus.clear();
    
    for (const channelName of channelList) {
      await this.subscribe(channelName);
    }
    
    await this.subscribeToUserChannels();
  }

  // S'abonner aux canaux utilisateur
  async subscribeToUserChannels() {
    if (!this.currentUserId) {
      console.log('⚠️ [Pusher] Aucun utilisateur, skip des canaux privés');
      return false;
    }
    
    // Check if already subscribed to prevent duplicates
    if (this.userChannelsSubscribed) {
      console.log('✅ [Pusher] Canaux utilisateur déjà abonnés, skip');
      return true;
    }
    
    try {
      const userChannel = `private-user_${this.currentUserId}`;
      const publicUserChannel = `user_${this.currentUserId}`;
      
      console.log(`📡 [Pusher] Tentative d'abonnement aux canaux utilisateur:`);
      console.log(`   - Privé: ${userChannel}`);
      console.log(`   - Public: ${publicUserChannel}`);
      
      console.log('🔐 [Pusher] Auth status avant abonnement:', {
        hasToken: !!this.authToken,
        isConnected: this.isConnected,
        userId: this.currentUserId
      });

      if (!this.isConnected) {
        console.log('⚠️ [Pusher] Non connecté, tentative de reconnexion...');
        await this.reconnect();
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Subscribe to private channel FIRST
      console.log(`📡 [Pusher] Abonnement au canal PRIVÉ: ${userChannel}`);
      const privateResult = await this.subscribeWithRetry(userChannel, 0);
      
      let privateSuccess = false;
      if (privateResult) {
        console.log(`✅ [Pusher] Abonnement PRIVÉ réussi: ${userChannel}`);
        this.privateChannelStatus.set(userChannel, 'success');
        privateSuccess = true;
        
        this.bindEvent(userChannel, 'voucher_transaction_confirmed', (data) => {
          console.log('✅ [Pusher] Transaction confirmée:', data);
        });
        
        this.bindEvent(userChannel, 'charity_bucket_updated', (data) => {
          console.log('📊 [Pusher] Bucket mis à jour:', data);
        });
        
        this.bindEvent(userChannel, 'tax_receipt_generated', (data) => {
          console.log('🧾 [Pusher] Reçu généré:', data);
        });
        
        this.bindEvent(userChannel, 'session_created', (data) => {
          console.log('🎯🎯🎯 [Pusher] SESSION CRÉÉE REÇUE SUR CANAL PRIVÉ! 🎯🎯🎯', data);
        });
      } else {
        console.error(`❌ [Pusher] Échec abonnement PRIVÉ: ${userChannel}`);
        this.privateChannelStatus.set(userChannel, 'failed');
      }
      
      // Also try public channel
      console.log(`📡 [Pusher] Abonnement au canal PUBLIC: ${publicUserChannel}`);
      const publicResult = await this.subscribe(publicUserChannel);
      
      if (publicResult) {
        console.log(`✅ [Pusher] Abonnement PUBLIC réussi: ${publicUserChannel}`);
        
        this.bindEvent(publicUserChannel, 'session_created', (data) => {
          console.log('🎯🎯🎯 [Pusher] SESSION CRÉÉE REÇUE SUR CANAL PUBLIC! 🎯🎯🎯', data);
          // CRITICAL FIX: Also trigger event listeners for the public channel
          // This ensures the event propagates to QRScannerScreen even if private channel fails
          this.triggerEventListeners(publicUserChannel, 'session_created', data);
        });
      }
      
      console.log('📊 [Pusher] Résumé abonnement utilisateur:', {
        private: privateSuccess ? '✅ Réussi' : '❌ Échec',
        public: publicResult ? '✅ Réussi' : '❌ Échec',
        userId: this.currentUserId
      });
      
      // Set the flag to prevent duplicate subscriptions
      this.userChannelsSubscribed = privateSuccess || publicResult;
      return this.userChannelsSubscribed;
      
    } catch (error) {
      console.error('❌ [Pusher] Erreur abonnement canaux utilisateur:', error);
      this.privateChannelStatus.set(`private-user_${this.currentUserId}`, 'error');
      return false;
    }
  }

  // Retry subscription with exponential backoff
  async subscribeWithRetry(channelName, retryCount = 0) {
    if (retryCount >= this.maxRetries) {
      console.error(`❌ [Pusher] Abonnement échoué après ${this.maxRetries} tentatives: ${channelName}`);
      this.privateChannelStatus.set(channelName, 'max-retries-exceeded');
      return null;
    }

    try {
      return await this.subscribe(channelName);
    } catch (error) {
      console.log(`⚠️ [Pusher] Tentative ${retryCount + 1}/${this.maxRetries} échouée pour ${channelName}`);
      
      const delay = Math.pow(2, retryCount) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return this.subscribeWithRetry(channelName, retryCount + 1);
    }
  }

  // S'abonner à un canal avec authentification
  async subscribe(channelName) {
    if (!this.pusher) {
      console.error('❌ [Pusher] Non initialisé');
      await this.init();
    }

    if (this.channels.has(channelName)) {
      console.log(`⚠️ [Pusher] Déjà abonné: ${channelName}`);
      return this.channels.get(channelName);
    }

    try {
      console.log(`🔔 [Pusher] Abonnement: ${channelName}`);

      console.log(`🔍 [Pusher] État connexion avant abonnement:`, {
        isConnected: this.isConnected,
        hasPusher: !!this.pusher,
        authTokenPresent: !!this.authToken,
        currentUserId: this.currentUserId
      });

      let channelReference = null;

      const channelConfig = {
        channelName: channelName,
        onEvent: (event) => {
          console.log(`📨 [Pusher/${channelName}] ${event.eventName}`, 
            event.data ? (typeof event.data === 'string' ? event.data.substring(0, 100) : 'object') : 'null');
          this.triggerEventListeners(channelName, event.eventName, event.data);
        },
        onSubscriptionSucceeded: (data) => {
          console.log(`✅ [Pusher] Abonnement réussi: ${channelName}`);
          
          if (channelReference) {
            this.channels.set(channelName, channelReference);
            console.log(`📦 [Pusher] Canal ${channelName} stocké dans channels Map`);
          }
          
          this.privateChannelStatus.set(channelName, 'success');
          this.subscriptionAttempts.delete(channelName);
          
          if (channelName.startsWith('private-')) {
            console.log(`🔐 [Pusher] Canal PRIVÉ ${channelName} - Prêt à recevoir des événements`);
          }
        },
        onSubscriptionError: (error) => {
          console.error(`❌ [Pusher] Erreur abonnement ${channelName}:`, error);
          this.privateChannelStatus.set(channelName, 'error');
          if (error.message) console.error(`❌ Détail: ${error.message}`);
          if (error.code) console.error(`❌ Code: ${error.code}`);
        }
      };

      console.log(`📡 [Pusher] Abonnement via subscribe() pour: ${channelName}`);
      channelReference = await this.pusher.subscribe(channelConfig);

      console.log(`📊 [Pusher] Subscription result for ${channelName}:`, {
        success: !!channelReference,
        channelType: typeof channelReference
      });
      
      if (channelReference && !this.channels.has(channelName)) {
        this.channels.set(channelName, channelReference);
        console.log(`📦 [Pusher] Canal ${channelName} stocké immédiatement`);
      }
      
      return channelReference;
      
    } catch (error) {
      console.error(`❌ [Pusher] Erreur abonnement ${channelName}:`, error);
      console.error(`❌ Error name:`, error.name);
      console.error(`❌ Error message:`, error.message);
      
      this.privateChannelStatus.set(channelName, 'exception');
      
      const attempts = this.subscriptionAttempts.get(channelName) || 0;
      this.subscriptionAttempts.set(channelName, attempts + 1);
      
      return null;
    }
  }

  // S'abonner aux canaux publics du système
  async subscribeToSystemChannels() {
    const systemChannels = [
      'charities',
      'modules',
      'system-notifications'
    ];
    
    for (const channelName of systemChannels) {
      await this.subscribe(channelName);
    }
    
    this.bindEvent('charities', 'charity_list_updated', (data) => {
      console.log('🔄 [Pusher] Liste organismes mise à jour');
    });
    
    this.bindEvent('modules', 'module_status_changed', (data) => {
      console.log('🔧 [Pusher] Statut module changé:', data);
    });
    
    console.log('🏢 [Pusher] Abonné aux canaux système');
  }

  // Se désabonner d'un canal
  async unsubscribe(channelName) {
    if (this.pusher && this.channels.has(channelName)) {
      try {
        await this.pusher.unsubscribe({ channelName });
        this.channels.delete(channelName);
        this.privateChannelStatus.delete(channelName);
        this.removeChannelEventListeners(channelName);
        this.subscriptionAttempts.delete(channelName);
        console.log(`👋 [Pusher] Désabonné: ${channelName}`);
      } catch (error) {
        console.error(`❌ [Pusher] Erreur désabonnement ${channelName}:`, error);
      }
    }
  }

  // Écouter les événements
  bindEvent(channelName, eventName, callback) {
    const listenerKey = `${channelName}_${eventName}`;
    this.eventListeners.set(listenerKey, { channelName, eventName, callback });
    
    console.log(`👂 [Pusher] Écoute ajoutée: ${eventName} sur ${channelName}`);
    console.log(`📊 Total écouteurs: ${this.eventListeners.size}`);
  }

  // Supprimer un écouteur
  unbindEvent(channelName, eventName) {
    const listenerKey = `${channelName}_${eventName}`;
    this.eventListeners.delete(listenerKey);
    console.log(`👋 [Pusher] Écouteur retiré: ${eventName} sur ${channelName}`);
  }

  // Déclencher les écouteurs d'événements
  triggerEventListeners(channelName, eventName, data) {
    const specificKey = `${channelName}_${eventName}`;
    const specificListener = this.eventListeners.get(specificKey);
    
    if (specificListener?.callback) {
      try {
        const parsedData = this.parseEventData(data);
        console.log(`📢 [Pusher] Déclenchement ${eventName} sur ${channelName}`);
        specificListener.callback(parsedData);
      } catch (error) {
        console.error(`❌ [Pusher] Erreur écouteur ${eventName}:`, error);
      }
    }
    
    const genericKey = `*_${eventName}`;
    const genericListener = this.eventListeners.get(genericKey);
    
    if (genericListener?.callback) {
      try {
        const parsedData = this.parseEventData(data);
        genericListener.callback(parsedData);
      } catch (error) {
        console.error(`❌ [Pusher] Erreur écouteur générique ${eventName}:`, error);
      }
    }
  }

  // Analyser les données d'événement
  parseEventData(data) {
    if (!data) return null;
    
    try {
      if (typeof data === 'string') {
        return JSON.parse(data);
      }
      return data;
    } catch (error) {
      return data;
    }
  }

  // Supprimer tous les écouteurs d'un canal
  removeChannelEventListeners(channelName) {
    for (const [key, listener] of this.eventListeners.entries()) {
      if (listener.channelName === channelName) {
        this.eventListeners.delete(key);
      }
    }
  }

  // Callbacks de statut de connexion
  onConnectionChange(callback) {
    this.connectionCallbacks.push(callback);
  }

  triggerConnectionCallbacks(connected) {
    this.connectionCallbacks.forEach(callback => {
      try {
        callback(connected);
      } catch (error) {
        console.error('❌ [Pusher] Erreur callback connexion:', error);
      }
    });
  }

  // Obtenir les informations de débogage
  getDebugInfo() {
    return {
      isConnected: this.isConnected,
      currentUserId: this.currentUserId,
      hasAuthToken: !!this.authToken,
      subscribedChannels: Array.from(this.channels.keys()),
      privateChannelStatus: Object.fromEntries(this.privateChannelStatus),
      eventListenersCount: this.eventListeners.size,
      eventListeners: Array.from(this.eventListeners.keys()),
      userChannelsSubscribed: this.userChannelsSubscribed
    };
  }

  // Vérifier si un canal privé est abonné
  isPrivateChannelSubscribed(channelName) {
    const status = this.privateChannelStatus.get(channelName);
    const hasChannel = this.channels.has(channelName);
    
    console.log(`🔍 [Pusher] Vérification canal ${channelName}:`, {
      status: status,
      hasChannel: hasChannel,
      result: status === 'success' && hasChannel
    });
    
    return status === 'success' && hasChannel;
  }

  // Attendre que les canaux utilisateur soient prêts
  async waitForUserChannelsReady(userId, timeoutMs = 8000) {
    console.log(`⏳ [Pusher] Attente que les canaux utilisateur soient prêts (${timeoutMs}ms max)`);
    console.log(`📊 [Pusher] État avant attente:`, this.getDebugInfo());
    
    const startTime = Date.now();
    const privateChannel = `private-user_${userId}`;
    
    // Force a subscription attempt if not already trying
    if (!this.channels.has(privateChannel) && this.privateChannelStatus.get(privateChannel) !== 'success') {
      console.log(`🔄 [Pusher] Tentative d'abonnement forcé à ${privateChannel}`);
      this.subscribeToUserChannels();
    }
    
    while (Date.now() - startTime < timeoutMs) {
      // Check connection status
      if (!this.isConnected) {
        const elapsed = Date.now() - startTime;
        if (elapsed % 1000 < 200) {
          console.log(`⚠️ [Pusher] En attente de connexion... (${elapsed}ms)`);
        }
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }
      
      // Check if private channel is subscribed
      if (this.isPrivateChannelSubscribed(privateChannel)) {
        console.log(`✅ [Pusher] Canal PRIVÉ ${privateChannel} est prêt après ${Date.now() - startTime}ms`);
        console.log(`📊 [Pusher] État après attente:`, this.getDebugInfo());
        return true;
      }
      
      // Log status every second
      const elapsed = Date.now() - startTime;
      if (elapsed % 1000 < 200) {
        console.log(`⏳ [Pusher] En attente canal ${privateChannel}:`, {
          elapsed: `${elapsed}ms`,
          status: this.privateChannelStatus.get(privateChannel),
          hasChannel: this.channels.has(privateChannel),
          connected: this.isConnected
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`⏰ [Pusher] Délai d'attente dépassé pour ${privateChannel}`);
    console.log(`📊 [Pusher] État final:`, this.getDebugInfo());
    return false;
  }

  // Nettoyer tous les abonnements
  async disconnect() {
    if (this.pusher) {
      try {
        for (const [channelName] of this.channels) {
          await this.unsubscribe(channelName);
        }
        
        await this.pusher.disconnect();
        this.channels.clear();
        this.eventListeners.clear();
        this.connectionCallbacks = [];
        this.isConnected = false;
        this.initializationPromise = null;
        this.subscriptionAttempts.clear();
        this.privateChannelStatus.clear();
        this.userChannelsSubscribed = false;
        console.log('🔌 [Pusher] Déconnecté et nettoyé');
      } catch (error) {
        console.error('❌ [Pusher] Erreur déconnexion:', error);
      }
    }
  }

  // Obtenir le statut de connexion
  getConnectionStatus() {
    return this.isConnected;
  }

  // Obtenir les canaux abonnés
  getSubscribedChannels() {
    return Array.from(this.channels.keys());
  }

  // Méthode principale d'initialisation
  async initForGestionMicroDons() {
    try {
      await this.init();
      await this.subscribeToSystemChannels();
      await this.subscribeToUserChannels();
      
      console.log('📊 [Pusher] État après initialisation:', this.getDebugInfo());
      
      return true;
    } catch (error) {
      console.error('❌ [Pusher] Échec initForGestionMicroDons:', error);
      return false;
    }
  }
}

// Créer une instance singleton
export default new GestionMicroDonsPusherService();