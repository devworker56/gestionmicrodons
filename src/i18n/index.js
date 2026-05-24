// i18n.js
import { I18n } from 'i18n-js';

const translations = {
  en: {
    // App interface translations only (NOT charity content)
    welcome: 'Welcome to GestionMicroDons',
    loading: 'Loading...',
    
    dashboard: {
      welcome_user: 'Hello, %{name}',
      welcome_guest: 'Welcome to GestionMicroDons',
      guest_subtitle: 'Sign in to start donating',
      verified: 'Verified',
      total_vouchers: 'Total Vouchers',
      charities: 'Charities',
      total_donated: 'Total Donated',
      tax_impact: 'Tax Impact',
      federal_only: 'Federal Only',
      total_donated_year: 'Total Donated in %{year}',
      estimated_credit: 'Estimated Credit',
      tier_progress: '%{current} of %{next} for next tier',
      max_tier: 'Maximum tier reached',
      view_receipts: 'View Receipts',
      charity_buckets: 'Charity Buckets',
      no_buckets: 'No Charity Buckets',
      start_donating: 'Start donating to create buckets',
      transactions: 'transactions',
      active: 'Active',
      recent_vouchers: 'Recent Vouchers',
      unknown_location: 'Unknown location',
      view_full_ledger: 'View Full Ledger',
      quick_actions: 'Quick Actions',
      scan_qr: 'Scan QR',
      browse_charities: 'Browse Charities',
      my_receipts: 'My Receipts',
      my_profile: 'My Profile',
      get_started: 'Get Started',
      get_started_message: 'Sign up to turn your change into verifiable donations with tax receipts.',
      load_error: 'Error loading dashboard data',
    },
    
    auth: {
      required_title: 'Login Required',
      required_message: 'Please sign in to access this feature.',
      login: 'Login',
      register: 'Register',
    },
    
    receipts: {
      not_ready_title: 'Not Ready Yet',
      not_ready_message: 'This charity bucket is not yet sealed for the year. Receipts are generated annually.',
      generate: 'Generate',
    },
    
    charities: {
      // App interface ONLY - charity content comes from database
      select_title: 'Select Charity for This Session',
      select_subtitle: 'Choose a charity to support with your donation',
      search_placeholder: 'Search charities...',
      total_charities: 'Total',
      verified: 'Verified',
      approved_status: 'Approved & Verified',
      no_description: 'No description available',
      displayed: 'Displayed',
      auth_warning: 'You must be logged in to select a charity',
      logged_in_as: 'Logged in as:',
      session_only: 'Selected charity will be used for this donation session only',
      select_for_session: 'Select for This Session',
      flow_select: 'Select charity for this session',
      flow_scan: 'Scan module QR code at store',
      flow_insert: 'Insert coins into module',
      flow_receipt: 'Receive annual tax receipt',
      session_reminder: 'Important: Charity selection is for this session only. You can choose a different charity for your next donation.',
      
      // Connection and error messages (app interface)
      unavailable: 'No Charities',
      no_charities_message: 'No charities available at the moment.',
      connection_error: 'Connection Error',
      offline_message: 'Unable to load charities. Please check your internet connection.',
      invalid_error: 'Invalid Charity',
      invalid_message: 'Invalid charity data. Please try again.',
      selection_error: 'Failed to select charity. Please try again.',
      no_results: 'No Results',
      no_results_message: 'No charities match your search. Try different keywords.',
      empty_list: 'Empty List',
      empty_list_message: 'No charities available at the moment.',
      result_singular: 'result',
      result_plural: 'results',
      loading: 'Loading charities...',
    },
    
    // Category translations for UI display (not charity content)
    categories: {
      health: 'Health',
      environment: 'Environment',
      education: 'Education',
      animals: 'Animals',
      community: 'Community',
      international: 'International',
      other: 'Other',
    },
    
    // Language labels (app interface)
    languages: {
      english: 'English',
      french: 'Français',
      display_in: 'Displaying in',
      bilingual: 'Bilingual',
      single_language: 'Single language',
      available_in: 'Available in',
      french_only: 'French only',
      english_only: 'English only',
      both_languages: 'French & English',
    },
    
    profile: {
      not_found: 'User profile not found',
    },
    
    common: {
      error: 'Error',
      ok: 'OK',
      cancel: 'Cancel',
      settings: 'Settings',
      profile: 'Profile',
      scan: 'Scan QR',
      ledger: 'Ledger',
      receipts: 'Receipts',
      dashboard: 'Dashboard',
      refresh: 'Refresh',
      retry: 'Retry',
      save: 'Save',
      edit: 'Edit',
      done: 'Done',
    },

    // ==================== NEW: Educational & Motivational Visuals ====================

    // Progress & Goal Tracking
    progress: {
      goal_title: "🎯 {year} DONATION GOAL",
      of_threshold: "of {threshold}",
      remaining_singular: "⏳ Only {remaining} more to reach 29% tax credit rate!",
      remaining_plural: "⏳ Only {remaining} more to reach 29% tax credit rate!",
      current_at: "(Currently at {current} of {threshold})"
    },

    // Milestones
    milestone: {
      congrats: "🏆 MILESTONE UNLOCKED!",
      first_donation: "🎉 First donation! Every coin counts!",
      reached: "✨ {amount} REACHED!",
      percent_way: "You're {percent}% of the way to ${threshold}!",
      close_to_next: "Only {remaining} more to your next milestone!"
    },

    // Threshold Proximity (DonationScreen)
    threshold: {
      title: "📊 PROGRESS TO HIGHER TAX RATE",
      remaining_singular: "🔥 {remaining} more to unlock 29% rate!",
      remaining_plural: "🔥 {remaining} more to unlock 29% rate!",
      already_reached: "🎉 You've reached the 29% tax credit tier!",
      every_extra_dollar: "Every extra dollar you donate now saves you {rate}% in taxes."
    },

    // Impact Messages by Category
    impact: {
      food: {
        singular: "This {amount} donation provides {count} meal for someone in need.",
        plural: "This {amount} donation provides {count} meals for people in need.",
        total: "Total this year: {count} meals"
      },
      environment: {
        singular: "This {amount} donation plants {count} tree.",
        plural: "This {amount} donation plants {count} trees.",
        total: "Total this year: {count} trees"
      },
      health: {
        singular: "This {amount} donation funds {count} vaccine.",
        plural: "This {amount} donation funds {count} vaccines.",
        total: "Total this year: {count} vaccines"
      },
      education: {
        singular: "This {amount} donation buys {count} book.",
        plural: "This {amount} donation buys {count} books.",
        total: "Total this year: {count} books"
      },
      animals: {
        singular: "This {amount} donation provides {count} day of shelter for an animal.",
        plural: "This {amount} donation provides {count} days of shelter for animals.",
        total: "Total this year: {count} shelter days"
      },
      community: {
        singular: "This {amount} donation provides {count} night of housing.",
        plural: "This {amount} donation provides {count} nights of housing.",
        total: "Total this year: {count} housing nights"
      }
    },

    // Year-over-Year Chart
    yearly: {
      title: "📈 YOUR GIVING JOURNEY",
      no_data: "Start donating to see your impact grow over time.",
      growth_positive: "📈 {percent}% increase from last year!",
      growth_negative: "📉 {percent}% decrease from last year",
      growth_neutral: "→ Same as last year. Keep going!"
    },

    // Giving Streak
    streak: {
      title: "🔥 GIVING STREAK",
      months_singular: "{count} consecutive month",
      months_plural: "{count} consecutive months",
      keep_going: "Donate this month to keep your streak alive!",
      new_streak: "Start a streak by donating this month!"
    },

    // "What If?" Calculator (Optimizer Enhancement)
    whatif: {
      title: "💡 WHAT IF YOU COMBINED THESE YEARS?",
      separate: "If claimed separately:",
      combined: "If claimed together:",
      extra: "💰 EXTRA SAVINGS:",
      below_threshold: "Total is below {threshold}. Consider adding more years to reach the higher tax credit tier.",
      above_threshold: "✓ You've reached the {threshold} threshold! Amounts over {threshold} qualify for {rate}% federal credit.",
      add_current_year: "Include {year} donations for even more savings!"
    },

    // Expiry Warnings
    expiry: {
      safe: "Expires {year}",
      warning: "⚠️ Expires next year",
      urgent: "🚨 EXPIRES SOON",
      expired: "❌ EXPIRED"
    },

    // Donation Session Messages
    donation: {
      coin_detected: "Coin detected!",
      quarter: "Quarter",
      loonie: "Loonie",
      toonie: "Toonie",
      nickel: "Nickel",
      dime: "Dime",
      session_active: "Active Donation Session",
      session_expired: "Session Expired",
      time_remaining: "Time remaining: {time}",
      expiring_soon: "⚠️ Expiring soon!",
      ready_for_coins: "Ready to accept coins!",
      complete_donation: "Complete Donation",
      reset_session: "Reset Session & Amount",
      processing: "Processing...",
      no_donation: "No Donation",
      insert_coins: "Please insert coins into the donation module.",
      no_charity: "No Charity Selected",
      select_charity_first: "Please select a charity first.",
      session_expired_message: "Your donation session has expired. Please start a new session."
    },

    // QR Scanner Messages
    scanner: {
      scan_module_title: "Scan Donation Module",
      scan_instruction: "Scan the QR code on the physical donation module",
      waking_module: "Waking up module...",
      module_woken: "Module Awake!",
      waiting_for_module: "Waiting for module response...",
      waiting_for_confirmation: "Confirming with module...",
      this_may_take_a_few_seconds: "This may take a few seconds",
      station_id: "Station ID",
      location: "Location",
      charity: "Charity",
      donating_to: "Donating to:",
      welcome: "Welcome, {name}",
      aligning_qr: "Align QR code within the frame",
      step_1: "Select a charity in the app",
      step_2: "Scan the QR code on the module",
      step_3: "Wait for module to wake up",
      step_4: "Insert your coins",
      invalid_qr_format: "Invalid QR code format",
      invalid_system_message: "This QR code is not from GestionMicroDons",
      missing_station_id: "Missing module ID in QR code",
      invalid_qr_message: "Invalid donation module QR code",
      unknown_location: "Unknown Location"
    },

    // Settings Screen
    settings: {
      title: "Settings",
      subtitle: "Manage your account preferences",
      account_settings: "Account Settings",
      email_notifications: "Email Notifications",
      email_notifications_desc: "Receive updates about your donations",
      language: "Language",
      language_desc: "App interface language",
      dark_mode: "Dark Mode",
      dark_mode_desc: "Switch between light and dark themes",
      privacy_security: "Privacy & Security",
      two_factor: "Two-Factor Authentication",
      two_factor_desc: "Add extra security to your account",
      change_password: "Change Password",
      change_password_desc: "Update your login credentials",
      privacy_settings: "Privacy Settings",
      privacy_settings_desc: "Manage your data and privacy",
      donation_preferences: "Donation Preferences",
      default_charity: "Default Charity",
      default_charity_desc: "Set your preferred charity for quick donations",
      receipt_preferences: "Receipt Preferences",
      receipt_preferences_desc: "How you receive tax receipts",
      about: "About",
      app_version: "App Version",
      terms: "Terms & Conditions",
      privacy_policy: "Privacy Policy",
      secure_verified: "Secure & Verified",
      secure_verified_desc: "All transactions are cryptographically secured with SHA-256"
    },

    // Tax Receipt Screen
    tax_receipt: {
      title: "Tax Receipts",
      subtitle: "Consolidated annual receipts for CRA submission",
      select_year: "Select Tax Year",
      summary: "{year} Summary",
      estimated_credits: "Estimated Tax Credits",
      federal_credit: "Federal Credit:",
      provincial_credit: "Provincial Credit (ON):",
      total_credit: "Total Credit:",
      rate_note: "*Based on current Ontario tax rates. Your actual credit may vary.",
      no_donations: "No donations for {year}. Donate to generate tax receipts.",
      your_receipts: "Your Receipts for {year}",
      issued: "ISSUED",
      pending: "PENDING",
      issued_on: "Issued: {date}",
      view: "View",
      share: "Share",
      pdf: "PDF",
      no_receipts_title: "No Receipts for {year}",
      no_receipts_message: "Consolidated tax receipts are automatically generated each February for the previous year's donations.",
      all_time_summary: "All Time Summary",
      generate: "Generate",
      about_receipts: "About Consolidated Receipts",
      receipt_info_1: "• Receipts are generated annually each February",
      receipt_info_2: "• Each receipt consolidates all micro-donations to a charity",
      receipt_info_3: "• Business numbers are included for CRA validation",
      receipt_info_4: "• Receipts are valid for 5 years from issue date",
      receipt_info_5: "• You can claim both federal and provincial tax credits",
      receipt_details: "Receipt Details",
      receipt_number: "Receipt Number:",
      charity: "Charity:",
      business_number: "Business Number:",
      amount: "Amount:",
      issue_date: "Issue Date:",
      tax_year: "Tax Year:",
      close: "Close"
    },

    // Voucher Ledger Screen
    voucher_ledger: {
      title: "Voucher Ledger",
      subtitle: "Immutable record of all your micro-donations",
      total_donated: "Total Donated",
      transactions: "Transactions",
      charities: "Charities",
      filter: "Filter Transactions",
      all: "All Transactions",
      this_year: "This Year",
      this_month: "This Month",
      by_charity: "By Charity",
      charity_buckets: "Charity Buckets",
      bucket_subtitle: "Aggregated totals for tax receipt generation",
      individual_vouchers: "Individual Vouchers",
      voucher_subtitle: "Immutable blockchain-like transaction records",
      module: "Module:",
      transaction_hash: "Transaction Hash:",
      previous_hash: "Previous Hash:",
      genesis: "Genesis",
      cryptographically_verified: "Cryptographically Verified",
      no_vouchers_title: "No Vouchers Yet",
      no_vouchers_message: "Your donation ledger will appear here after you make your first micro-donation.",
      scan_qr: "Scan QR to Donate",
      immutable_ledger: "Immutable Ledger Technology",
      immutable_ledger_desc: "Each transaction is cryptographically hashed (SHA-256) and linked to the previous one, creating a verifiable, tamper-proof chain.",
      last_donation: "Last: {date}",
      generate_receipt: "Generate Receipt",
      active: "Active",
      receipt: "Receipt",
      view_all: "View All",
      // Donation Bank (Carryforward)
      donation_bank: "Your Donation Bank",
      donation_bank_desc: "Unclaimed donations from previous years. Combine multiple years to reach the $200 threshold and get higher tax credits (29% instead of 15%).",
      select_all: "Select All",
      clear: "Clear",
      optimize_selected: "Optimize Selected ({count})",
      tax_tip: "💡 Tax Tip: Combining donations across years can help you reach the $200 threshold, unlocking higher tax credits (29% instead of 15% on amounts over $200).",
      no_unclaimed_title: "No Unclaimed Donations",
      no_unclaimed_message: "You have no unclaimed donations from previous years. All your donations have been claimed or are from the current year."
    },

    // Donation Bank (Carryforward) - Additional
    donation_bank: {
      title: "Your Donation Bank",
      description: "Unclaimed donations from previous years. Combine multiple years to reach the $200 threshold and get higher tax credits (29% instead of 15%).",
      select_all: "Select All",
      clear: "Clear",
      optimize: "Optimize Selected ({count})",
      tax_tip: "💡 Tax Tip: Combining donations across years can help you reach the $200 threshold, unlocking higher tax credits (29% instead of 15% on amounts over $200).",
      no_unclaimed: "No Unclaimed Donations",
      no_unclaimed_desc: "You have no unclaimed donations from previous years. All your donations have been claimed or are from the current year.",
      loading: "Loading unclaimed donations..."
    },

    // Optimizer Dialog
    optimizer: {
      title: "📊 Tax Optimizer",
      total_combined: "Total Combined:",
      if_claimed_separately: "If claimed separately:",
      if_claimed_together: "If claimed together:",
      extra_savings: "💰 EXTRA SAVINGS:",
      below_threshold: "Total is below $200. Consider adding more years to reach the higher tax credit tier.",
      above_threshold: "✓ You've reached the $200 threshold! Amounts over $200 qualify for 29% federal credit.",
      apply_strategy: "Apply Strategy",
      cancel: "Cancel"
    },

    // Expiring Alert
    expiring_alert: {
      title: "⚠️ Donations Expiring Soon",
      message: "You have {amount} in unclaimed donations from {years} that will expire within the next year.",
      submessage: "Canadian tax rules allow you to carry forward donations for up to 5 years. Don't lose these tax credits!",
      button: "View Donation Bank"
    },

    // Carryforward Info (Tax Receipt Screen)
    carryforward: {
      title: "Donation Carryforward",
      claimed: "✅ Claimed for {year}:",
      unclaimed: "📦 Unclaimed from previous years:",
      from_years: "From: {years}",
      description: "The Canadian government allows you to carry forward unclaimed donations for up to 5 years. Combining donations across years can help you reach the $200 threshold for higher tax credits.",
      button: "View Donation Bank"
    },

    // Claim Preferences (Profile Screen)
    claim_preferences: {
      title: "Tax Claiming Preferences",
      default_claim_year: "Default Claim Year",
      default_claim_year_desc: "Choose which tax year to claim your donations",
      current_year: "Current Year",
      next_year: "Next Year",
      about_carryforward: "About Donation Carryforward",
      about_carryforward_desc: "Learn how to maximize your tax savings",
      unclaimed_summary: "You have {amount} in unclaimed donations",
      unclaimed_subtext: "These donations can be carried forward to future tax years",
      dialog_title: "Default Claim Year",
      dialog_message: "Select which tax year you prefer to claim your donations by default:",
      current_year_option: "Current Tax Year ({year})",
      next_year_option: "Next Tax Year ({year})",
      preference_saved_current: "Your donations will be claimed in the current tax year by default.",
      preference_saved_next: "Your donations will be claimed in the next tax year by default.",
      carryforward_info_title: "Donation Carryforward Rules",
      carryforward_info_message: "Canadian tax rules allow you to carry forward unclaimed donations for up to 5 years.\n\nWhy it matters:\n• Combine multiple years to reach the $200 threshold\n• First $200: 15% federal credit\n• Amounts over $200: 29% federal credit\n\nPro tip: Check your Donation Bank in the Voucher Ledger to optimize your claims."
    }
  },
  
  fr: {
    // App interface translations only (NOT charity content)
    welcome: 'Bienvenue à GestionMicroDons',
    loading: 'Chargement...',
    
    dashboard: {
      welcome_user: 'Bonjour, %{name}',
      welcome_guest: 'Bienvenue sur GestionMicroDons',
      guest_subtitle: 'Connectez-vous pour commencer à donner',
      verified: 'Vérifié',
      total_vouchers: 'Bons totaux',
      charities: 'Organismes',
      total_donated: 'Total donné',
      tax_impact: 'Impact fiscal',
      federal_only: 'Fédéral seulement',
      total_donated_year: 'Total donné en %{year}',
      estimated_credit: 'Crédit estimé',
      tier_progress: '%{current} sur %{next} pour le palier suivant',
      max_tier: 'Palier maximum atteint',
      view_receipts: 'Voir les reçus',
      charity_buckets: 'Comptes des organismes',
      no_buckets: 'Aucun compte d\'organisme',
      start_donating: 'Commencez à donner pour créer des comptes',
      transactions: 'transactions',
      active: 'Actif',
      recent_vouchers: 'Bons récents',
      unknown_location: 'Emplacement inconnu',
      view_full_ledger: 'Voir le registre complet',
      quick_actions: 'Actions rapides',
      scan_qr: 'Scanner QR',
      browse_charities: 'Parcourir les organismes',
      my_receipts: 'Mes reçus',
      my_profile: 'Mon profil',
      get_started: 'Commencer',
      get_started_message: 'Inscrivez-vous pour transformer votre monnaie en dons vérifiables avec reçus fiscaux.',
      load_error: 'Erreur de chargement des données',
    },
    
    auth: {
      required_title: 'Connexion requise',
      required_message: 'Veuillez vous connecter pour accéder à cette fonctionnalité.',
      login: 'Se connecter',
      register: 'S\'inscrire',
    },
    
    receipts: {
      not_ready_title: 'Pas encore prêt',
      not_ready_message: 'Ce compte d\'organisme n\'est pas encore scellé pour l\'année. Les reçus sont générés annuellement.',
      generate: 'Générer',
    },
    
    charities: {
      // App interface ONLY - charity content comes from database
      select_title: 'Sélectionner un organisme pour cette session',
      select_subtitle: 'Choisissez un organisme à soutenir avec votre don',
      search_placeholder: 'Rechercher des organismes...',
      total_charities: 'Total',
      verified: 'Vérifié',
      approved_status: 'Approuvé & Vérifié',
      no_description: 'Aucune description disponible',
      displayed: 'Affichés',
      auth_warning: 'Vous devez être connecté pour sélectionner un organisme',
      logged_in_as: 'Connecté en tant que:',
      session_only: 'L\'organisme sélectionné sera utilisé uniquement pour cette session de don',
      select_for_session: 'Sélectionner pour cette session',
      flow_select: 'Sélectionnez un organisme pour cette session',
      flow_scan: 'Scannez le code QR du module en magasin',
      flow_insert: 'Insérez des pièces dans le module',
      flow_receipt: 'Recevez un reçu fiscal annuel',
      session_reminder: 'Important: La sélection de l\'organisme est pour cette session seulement. Vous pouvez choisir un organisme différent pour votre prochain don.',
      
      // Connection and error messages (app interface)
      unavailable: 'Aucun organisme',
      no_charities_message: 'Aucun organisme disponible pour le moment.',
      connection_error: 'Erreur de connexion',
      offline_message: 'Impossible de charger les organismes. Veuillez vérifier votre connexion internet.',
      invalid_error: 'Organisme invalide',
      invalid_message: 'Données d\'organisme invalides. Veuillez réessayer.',
      selection_error: 'Échec de la sélection de l\'organisme. Veuillez réessayer.',
      no_results: 'Aucun résultat',
      no_results_message: 'Aucun organisme ne correspond à votre recherche. Essayez d\'autres mots-clés.',
      empty_list: 'Liste vide',
      empty_list_message: 'Aucun organisme disponible pour le moment.',
      result_singular: 'résultat',
      result_plural: 'résultats',
      loading: 'Chargement des organismes...',
    },
    
    // Category translations for UI display (not charity content)
    categories: {
      health: 'Santé',
      environment: 'Environnement',
      education: 'Éducation',
      animals: 'Animaux',
      community: 'Communauté',
      international: 'International',
      other: 'Autre',
    },
    
    // Language labels (app interface)
    languages: {
      english: 'English',
      french: 'Français',
      display_in: 'Affichage en',
      bilingual: 'Bilingue',
      single_language: 'Langue unique',
      available_in: 'Disponible en',
      french_only: 'Français seulement',
      english_only: 'Anglais seulement',
      both_languages: 'Français et Anglais',
    },
    
    profile: {
      not_found: 'Profil utilisateur introuvable',
    },
    
    common: {
      error: 'Erreur',
      ok: 'OK',
      cancel: 'Annuler',
      settings: 'Paramètres',
      profile: 'Profil',
      scan: 'Scanner',
      ledger: 'Registre',
      receipts: 'Reçus',
      dashboard: 'Tableau de bord',
      refresh: 'Actualiser',
      retry: 'Réessayer',
      save: 'Enregistrer',
      edit: 'Modifier',
      done: 'Terminé',
    },

    // ==================== NEW: Educational & Motivational Visuals ====================

    // Progress & Goal Tracking
    progress: {
      goal_title: "🎯 OBJECTIF DE DON {year}",
      of_threshold: "sur {threshold}",
      remaining_singular: "⏳ Plus que {remaining} $ à donner pour atteindre le taux de 29 % !",
      remaining_plural: "⏳ Plus que {remaining} $ à donner pour atteindre le taux de 29 % !",
      current_at: "(Actuellement à {current} sur {threshold})"
    },

    // Milestones
    milestone: {
      congrats: "🏆 JALON DÉVERROUILLÉ !",
      first_donation: "🎉 Premier don ! Chaque centime compte !",
      reached: "✨ {amount} ATTEINT !",
      percent_way: "Vous êtes à {percent} % du seuil de {threshold} $ !",
      close_to_next: "Plus que {remaining} $ pour votre prochain jalon !"
    },

    // Threshold Proximity (DonationScreen)
    threshold: {
      title: "📊 PROGRÈS VERS LE TAUX D'IMPÔT SUPÉRIEUR",
      remaining_singular: "🔥 Plus que {remaining} $ pour débloquer le taux de 29 % !",
      remaining_plural: "🔥 Plus que {remaining} $ pour débloquer le taux de 29 % !",
      already_reached: "🎉 Vous avez atteint le palier de crédit d'impôt de 29 % !",
      every_extra_dollar: "Chaque dollar supplémentaire que vous donnez vous économise {rate} % d'impôts."
    },

    // Impact Messages by Category
    impact: {
      food: {
        singular: "Ce don de {amount} $ fournit {count} repas à une personne dans le besoin.",
        plural: "Ce don de {amount} $ fournit {count} repas à des personnes dans le besoin.",
        total: "Total cette année : {count} repas"
      },
      environment: {
        singular: "Ce don de {amount} $ plante {count} arbre.",
        plural: "Ce don de {amount} $ plante {count} arbres.",
        total: "Total cette année : {count} arbres"
      },
      health: {
        singular: "Ce don de {amount} $ finance {count} vaccin.",
        plural: "Ce don de {amount} $ finance {count} vaccins.",
        total: "Total cette année : {count} vaccins"
      },
      education: {
        singular: "Ce don de {amount} $ achète {count} livre.",
        plural: "Ce don de {amount} $ achète {count} livres.",
        total: "Total cette année : {count} livres"
      },
      animals: {
        singular: "Ce don de {amount} $ fournit {count} jour de refuge pour un animal.",
        plural: "Ce don de {amount} $ fournit {count} jours de refuge pour des animaux.",
        total: "Total cette année : {count} jours de refuge"
      },
      community: {
        singular: "Ce don de {amount} $ fournit {count} nuit de logement.",
        plural: "Ce don de {amount} $ fournit {count} nuits de logement.",
        total: "Total cette année : {count} nuits de logement"
      }
    },

    // Year-over-Year Chart
    yearly: {
      title: "📈 VOTRE PARCOURS DE DONS",
      no_data: "Commencez à donner pour voir votre impact grandir.",
      growth_positive: "📈 Augmentation de {percent} % par rapport à l'année dernière !",
      growth_negative: "📉 Diminution de {percent} % par rapport à l'année dernière",
      growth_neutral: "→ Stable par rapport à l'année dernière. Continuez !"
    },

    // Giving Streak
    streak: {
      title: "🔥 SÉQUENCE DE DONS",
      months_singular: "{count} mois consécutif",
      months_plural: "{count} mois consécutifs",
      keep_going: "Donnez ce mois-ci pour maintenir votre séquence !",
      new_streak: "Commencez une séquence en donnant ce mois-ci !"
    },

    // "What If?" Calculator (Optimizer Enhancement)
    whatif: {
      title: "💡 ET SI VOUS COMBINIEZ CES ANNÉES ?",
      separate: "Si déclarés séparément :",
      combined: "Si déclarés ensemble :",
      extra: "💰 ÉCONOMIES SUPPLÉMENTAIRES :",
      below_threshold: "Le total est inférieur à {threshold} $. Ajoutez plus d'années pour atteindre le taux de crédit supérieur.",
      above_threshold: "✓ Vous avez atteint le seuil de {threshold} $ ! Les montants dépassant {threshold} $ donnent droit à un crédit fédéral de {rate} %.",
      add_current_year: "Incluez les dons de {year} pour encore plus d'économies !"
    },

    // Expiry Warnings
    expiry: {
      safe: "Expire en {year}",
      warning: "⚠️ Expire l'année prochaine",
      urgent: "🚨 EXPIRE BIENTÔT",
      expired: "❌ EXPIRÉ"
    },

    // Donation Session Messages
    donation: {
      coin_detected: "Pièce détectée !",
      quarter: "25 cents",
      loonie: "1 dollar",
      toonie: "2 dollars",
      nickel: "5 cents",
      dime: "10 cents",
      session_active: "Session de don active",
      session_expired: "Session expirée",
      time_remaining: "Temps restant : {time}",
      expiring_soon: "⚠️ Expire bientôt !",
      ready_for_coins: "Prêt à accepter les pièces !",
      complete_donation: "Terminer le don",
      reset_session: "Réinitialiser la session",
      processing: "Traitement...",
      no_donation: "Aucun don",
      insert_coins: "Veuillez insérer des pièces dans le module de don.",
      no_charity: "Aucun organisme sélectionné",
      select_charity_first: "Veuillez d'abord sélectionner un organisme.",
      session_expired_message: "Votre session de don a expiré. Veuillez démarrer une nouvelle session."
    },

    // QR Scanner Messages
    scanner: {
      scan_module_title: "Scanner le module de don",
      scan_instruction: "Scannez le code QR sur le module de don physique",
      waking_module: "Réveil du module...",
      module_woken: "Module réveillé !",
      waiting_for_module: "Attente de la réponse du module...",
      waiting_for_confirmation: "Confirmation avec le module...",
      this_may_take_a_few_seconds: "Cela peut prendre quelques secondes",
      station_id: "ID de la station",
      location: "Emplacement",
      charity: "Organisme",
      donating_to: "Don à :",
      welcome: "Bienvenue, {name}",
      aligning_qr: "Alignez le code QR dans le cadre",
      step_1: "Sélectionnez un organisme dans l'application",
      step_2: "Scannez le code QR sur le module",
      step_3: "Attendez que le module se réveille",
      step_4: "Insérez vos pièces",
      invalid_qr_format: "Format de code QR invalide",
      invalid_system_message: "Ce code QR ne provient pas de GestionMicroDons",
      missing_station_id: "ID de module manquant dans le code QR",
      invalid_qr_message: "Code QR de module de don invalide",
      unknown_location: "Emplacement inconnu"
    },

    // Settings Screen
    settings: {
      title: "Paramètres",
      subtitle: "Gérez vos préférences de compte",
      account_settings: "Paramètres du compte",
      email_notifications: "Notifications par courriel",
      email_notifications_desc: "Recevez des mises à jour sur vos dons",
      language: "Langue",
      language_desc: "Langue de l'interface de l'application",
      dark_mode: "Mode sombre",
      dark_mode_desc: "Basculer entre les thèmes clair et sombre",
      privacy_security: "Confidentialité et sécurité",
      two_factor: "Authentification à deux facteurs",
      two_factor_desc: "Ajoutez une sécurité supplémentaire à votre compte",
      change_password: "Changer le mot de passe",
      change_password_desc: "Mettez à jour vos identifiants de connexion",
      privacy_settings: "Paramètres de confidentialité",
      privacy_settings_desc: "Gérez vos données et votre confidentialité",
      donation_preferences: "Préférences de don",
      default_charity: "Organisme par défaut",
      default_charity_desc: "Définissez votre organisme préféré pour les dons rapides",
      receipt_preferences: "Préférences de reçus",
      receipt_preferences_desc: "Comment vous recevez les reçus fiscaux",
      about: "À propos",
      app_version: "Version de l'application",
      terms: "Conditions d'utilisation",
      privacy_policy: "Politique de confidentialité",
      secure_verified: "Sécurisé et vérifié",
      secure_verified_desc: "Toutes les transactions sont cryptographiquement sécurisées avec SHA-256"
    },

    // Tax Receipt Screen
    tax_receipt: {
      title: "Reçus fiscaux",
      subtitle: "Reçus annuels consolidés pour soumission à l'ARC",
      select_year: "Sélectionnez l'année d'imposition",
      summary: "Résumé {year}",
      estimated_credits: "Crédits d'impôt estimés",
      federal_credit: "Crédit fédéral :",
      provincial_credit: "Crédit provincial (ON) :",
      total_credit: "Crédit total :",
      rate_note: "*Basé sur les taux d'imposition actuels de l'Ontario. Votre crédit réel peut varier.",
      no_donations: "Aucun don pour {year}. Donnez pour générer des reçus fiscaux.",
      your_receipts: "Vos reçus pour {year}",
      issued: "ÉMIS",
      pending: "EN ATTENTE",
      issued_on: "Émis le : {date}",
      view: "Voir",
      share: "Partager",
      pdf: "PDF",
      no_receipts_title: "Aucun reçu pour {year}",
      no_receipts_message: "Les reçus fiscaux consolidés sont générés automatiquement chaque février pour les dons de l'année précédente.",
      all_time_summary: "Résumé de tous les temps",
      generate: "Générer",
      about_receipts: "À propos des reçus consolidés",
      receipt_info_1: "• Les reçus sont générés annuellement chaque février",
      receipt_info_2: "• Chaque reçu consolide tous les micro-dons à un organisme",
      receipt_info_3: "• Les numéros d'entreprise sont inclus pour la validation de l'ARC",
      receipt_info_4: "• Les reçus sont valides pendant 5 ans à compter de la date d'émission",
      receipt_info_5: "• Vous pouvez demander les crédits d'impôt fédéral et provincial",
      receipt_details: "Détails du reçu",
      receipt_number: "Numéro de reçu :",
      charity: "Organisme :",
      business_number: "Numéro d'entreprise :",
      amount: "Montant :",
      issue_date: "Date d'émission :",
      tax_year: "Année d'imposition :",
      close: "Fermer"
    },

    // Voucher Ledger Screen
    voucher_ledger: {
      title: "Registre des bons",
      subtitle: "Registre immuable de tous vos micro-dons",
      total_donated: "Total donné",
      transactions: "Transactions",
      charities: "Organismes",
      filter: "Filtrer les transactions",
      all: "Toutes les transactions",
      this_year: "Cette année",
      this_month: "Ce mois-ci",
      by_charity: "Par organisme",
      charity_buckets: "Comptes des organismes",
      bucket_subtitle: "Totaux agrégés pour la génération de reçus fiscaux",
      individual_vouchers: "Bons individuels",
      voucher_subtitle: "Enregistrements de transactions immuables de type blockchain",
      module: "Module :",
      transaction_hash: "Hachage de transaction :",
      previous_hash: "Hachage précédent :",
      genesis: "Genèse",
      cryptographically_verified: "Cryptographiquement vérifié",
      no_vouchers_title: "Aucun bon pour le moment",
      no_vouchers_message: "Votre registre de dons apparaîtra ici après votre premier micro-don.",
      scan_qr: "Scanner QR pour donner",
      immutable_ledger: "Technologie de registre immuable",
      immutable_ledger_desc: "Chaque transaction est hachée cryptographiquement (SHA-256) et liée à la précédente, créant une chaîne vérifiable et infalsifiable.",
      last_donation: "Dernier : {date}",
      generate_receipt: "Générer un reçu",
      active: "Actif",
      receipt: "Reçu",
      view_all: "Voir tout",
      // Donation Bank (Carryforward)
      donation_bank: "Votre banque de dons",
      donation_bank_desc: "Dons non réclamés des années précédentes. Combinez plusieurs années pour atteindre le seuil de 200 $ et obtenir des crédits d'impôt plus élevés (29 % au lieu de 15 %).",
      select_all: "Tout sélectionner",
      clear: "Effacer",
      optimize_selected: "Optimiser la sélection ({count})",
      tax_tip: "💡 Astuce fiscale : Combiner les dons sur plusieurs années peut vous aider à atteindre le seuil de 200 $, débloquant des crédits d'impôt plus élevés (29 % au lieu de 15 % sur les montants dépassant 200 $).",
      no_unclaimed_title: "Aucun don non réclamé",
      no_unclaimed_message: "Vous n'avez aucun don non réclamé des années précédentes. Tous vos dons ont été réclamés ou datent de l'année en cours."
    },

    // Donation Bank (Carryforward) - Additional
    donation_bank: {
      title: "Votre banque de dons",
      description: "Dons non réclamés des années précédentes. Combinez plusieurs années pour atteindre le seuil de 200 $ et obtenir des crédits d'impôt plus élevés (29 % au lieu de 15 %).",
      select_all: "Tout sélectionner",
      clear: "Effacer",
      optimize: "Optimiser la sélection ({count})",
      tax_tip: "💡 Astuce fiscale : Combiner les dons sur plusieurs années peut vous aider à atteindre le seuil de 200 $, débloquant des crédits d'impôt plus élevés (29 % au lieu de 15 % sur les montants dépassant 200 $).",
      no_unclaimed: "Aucun don non réclamé",
      no_unclaimed_desc: "Vous n'avez aucun don non réclamé des années précédentes. Tous vos dons ont été réclamés ou datent de l'année en cours.",
      loading: "Chargement des dons non réclamés..."
    },

    // Optimizer Dialog
    optimizer: {
      title: "📊 Optimiseur fiscal",
      total_combined: "Total combiné :",
      if_claimed_separately: "Si déclarés séparément :",
      if_claimed_together: "Si déclarés ensemble :",
      extra_savings: "💰 ÉCONOMIES SUPPLÉMENTAIRES :",
      below_threshold: "Le total est inférieur à 200 $. Ajoutez plus d'années pour atteindre le palier de crédit d'impôt supérieur.",
      above_threshold: "✓ Vous avez atteint le seuil de 200 $ ! Les montants dépassant 200 $ donnent droit à un crédit fédéral de 29 %.",
      apply_strategy: "Appliquer la stratégie",
      cancel: "Annuler"
    },

    // Expiring Alert
    expiring_alert: {
      title: "⚠️ Dons expirant bientôt",
      message: "Vous avez {amount} en dons non réclamés de {years} qui expireront au cours de la prochaine année.",
      submessage: "Les règles fiscales canadiennes vous permettent de reporter vos dons jusqu'à 5 ans. Ne perdez pas ces crédits d'impôt !",
      button: "Voir la banque de dons"
    },

    // Carryforward Info (Tax Receipt Screen)
    carryforward: {
      title: "Report des dons",
      claimed: "✅ Réclamé pour {year} :",
      unclaimed: "📦 Non réclamé des années précédentes :",
      from_years: "De : {years}",
      description: "Le gouvernement canadien vous permet de reporter vos dons non réclamés jusqu'à 5 ans. Combiner les dons sur plusieurs années peut vous aider à atteindre le seuil de 200 $ pour des crédits d'impôt plus élevés.",
      button: "Voir la banque de dons"
    },

    // Claim Preferences (Profile Screen)
    claim_preferences: {
      title: "Préférences de déclaration fiscale",
      default_claim_year: "Année de déclaration par défaut",
      default_claim_year_desc: "Choisissez l'année d'imposition pour déclarer vos dons",
      current_year: "Année en cours",
      next_year: "Année prochaine",
      about_carryforward: "À propos du report des dons",
      about_carryforward_desc: "Apprenez à maximiser vos économies d'impôt",
      unclaimed_summary: "Vous avez {amount} en dons non réclamés",
      unclaimed_subtext: "Ces dons peuvent être reportés aux années d'imposition futures",
      dialog_title: "Année de déclaration par défaut",
      dialog_message: "Sélectionnez l'année d'imposition pour laquelle vous préférez déclarer vos dons par défaut :",
      current_year_option: "Année d'imposition en cours ({year})",
      next_year_option: "Année d'imposition prochaine ({year})",
      preference_saved_current: "Vos dons seront déclarés dans l'année d'imposition en cours par défaut.",
      preference_saved_next: "Vos dons seront déclarés dans la prochaine année d'imposition par défaut.",
      carryforward_info_title: "Règles de report des dons",
      carryforward_info_message: "Les règles fiscales canadiennes vous permettent de reporter vos dons non réclamés jusqu'à 5 ans.\n\nPourquoi c'est important :\n• Combinez plusieurs années pour atteindre le seuil de 200 $\n• Premiers 200 $ : crédit fédéral de 15 %\n• Montants dépassant 200 $ : crédit fédéral de 29 %\n\nAstuce : Consultez votre banque de dons dans le registre des bons pour optimiser vos déclarations."
    }
  }
};

const i18n = new I18n(translations);

// CRITICAL FIX: Default to English, NOT device language
i18n.locale = 'en';
i18n.enableFallback = true;
i18n.defaultLocale = 'en';
i18n.enableDotNotation = true;

// Safe T Wrapper to prevent "Object" crashes
const originalT = i18n.t.bind(i18n);
i18n.t = (key, params = {}) => {
  try {
    const result = originalT(key, params);
    
    // Handle missing translations
    if (typeof result !== 'string' || result.includes('[missing')) {
      console.warn(`Missing translation: ${key}`);
      const parts = key.split('.');
      const lastPart = parts[parts.length - 1];
      return lastPart.replace(/_/g, ' ');
    }
    
    return result;
  } catch (error) {
    console.error(`Translation error for key ${key}:`, error);
    return key.split('.').pop().replace(/_/g, ' ');
  }
};

export default i18n;