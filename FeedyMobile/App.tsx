import 'react-native-url-polyfill/auto';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
  PermissionsAndroid,
  ActivityIndicator,
  LogBox,
  Modal,
  Linking,
  Animated,
} from 'react-native';
import {
  Home, Search, Plus, User as UserIcon, LogOut, MapPin, Navigation, X, Heart,
  MessageCircle, ChevronRight, Send, Camera, Info, Check, Clock,
  UtensilsCrossed, Leaf, List, Trash2, Edit, Settings, Flame, Zap, ArrowRight, Inbox, Package
} from 'lucide-react-native';
import * as ImagePicker from 'react-native-image-picker';
import { launchImageLibrary } from 'react-native-image-picker';
import { decode } from 'base64-arraybuffer';
import Geolocation from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, Session } from '@supabase/supabase-js';

// @ts-ignore
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

LogBox.ignoreLogs(['AuthApiError: Invalid Refresh Token: Refresh Token Not Found']);


// --- SUPABASE CLIENT ---
const supabaseUrl = 'https://uylpjcwtqawcfjzaeuhc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5bHBqY3d0cWF3Y2ZqemFldWhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4Mzk4NzYsImV4cCI6MjA5MzQxNTg3Nn0.tnVnYr0s0pbj-a-XF9mE_PqX6__6_t9F0Hj036SyPK4';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

const cleanupExpiredDonations = async () => {
  try {
    const now = new Date().toISOString();
    await supabase
      .from('donations')
      .delete()
      .lt('expires_at', now);
  } catch (e: any) {
    console.warn('App: Expired donations cleanup error:', e.message || e);
  }
};

// --- THEME ---
const COLORS = {
  oat: '#F6F4ED',
  forest: '#1B3C35',
  terracotta: '#D46A55',
  sage: '#8F9B82',
  sand: '#E8E4D9',
  white: '#FFFFFF',
  orange: '#F97316',
  emerald: '#10B981',
  rose: '#F43F5E',
};

type Coordinates = {
  lat: number;
  lng: number;
};

type GeocodedAddress = Coordinates & {
  label: string;
  city: string;
};

const LOCATION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 20000,
  maximumAge: 10000,
};

const NOMINATIM_HEADERS = {
  'User-Agent': 'AssietteEnPlus/1.0 (FeedyMobile)',
  'Accept-Language': 'fr',
};

const toFiniteNumber = (value: any) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parsePortions = (value: any) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const getDonationCoordinates = (item: any): Coordinates | null => {
  const lat = toFiniteNumber(item?.latitude);
  const lng = toFiniteNumber(item?.longitude);
  return lat === null || lng === null ? null : { lat, lng };
};

const calculateDistanceRaw = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const formatDistanceFromKm = (distanceKm: number) =>
  distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)}km`;

const formatDistance = (from: Coordinates, to: Coordinates) =>
  formatDistanceFromKm(calculateDistanceRaw(from.lat, from.lng, to.lat, to.lng));

const requestCurrentLocation = async (): Promise<Coordinates> => {
  if (Platform.OS === 'android') {
    const permission = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Autoriser la position',
        message: 'Feedy utilise votre position pour calculer les distances des dons proches.',
        buttonPositive: 'Autoriser',
        buttonNegative: 'Refuser',
      },
    );

    if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
      throw new Error('Permission GPS refusée.');
    }
  } else {
    Geolocation.requestAuthorization(
      () => undefined,
      () => undefined,
    );
  }

  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }),
      (error) => reject(new Error(error.message || 'Position GPS indisponible.')),
      LOCATION_OPTIONS,
    );
  });
};

const geocodeAddress = async (address: string): Promise<GeocodedAddress | null> => {
  const query = address.trim();
  if (!query) return null;

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&q=${encodeURIComponent(query)}`,
    { headers: NOMINATIM_HEADERS },
  );

  if (!response.ok) {
    throw new Error('Service de géocodage indisponible.');
  }

  const results = await response.json();
  const first = Array.isArray(results) ? results[0] : null;
  const lat = toFiniteNumber(first?.lat);
  const lng = toFiniteNumber(first?.lon);

  if (lat === null || lng === null) {
    return null;
  }

  const addr = first?.address || {};

  return {
    lat,
    lng,
    label: first?.display_name || query,
    city: addr.city || addr.town || addr.village || '',
  };
};

const reverseGeocode = async ({ lat, lng }: Coordinates) => {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
    { headers: NOMINATIM_HEADERS },
  );

  if (!response.ok) {
    throw new Error('Adresse GPS indisponible.');
  }

  const data = await response.json();
  const addr = data.address || {};
  const street = addr.road || addr.pedestrian || addr.suburb || '';
  const city = addr.city || addr.town || addr.village || '';
  return `${street}${street && city ? ', ' : ''}${city}` || 'Position détectée';
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        setInitializing(false);
        setLoadingProfile(false);
      }
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        setProfile(null);
      }
    });
  }, []);

  useEffect(() => {
    if (session) {
      fetchProfile(session.user.id);
    }
  }, [session?.user?.id]);


  const fetchProfile = async (userId: string) => {
    console.log('App: Fetching profile for', userId);
    setLoadingProfile(true);
    try {
      const { data, error } = await supabase.rpc('get_my_profile').single();
      if (error) {
        console.warn('App: Profile fetch error:', error.message);
        setProfile(null);
      } else if (data && (data as any).id) {
        console.log('App: Profile loaded successfully');
        setProfile(data);
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error('App: Profile fetch crash:', err);
      setProfile(null);
    } finally {
      setInitializing(false);
      setLoadingProfile(false);
    }
  };

  if (initializing || (session && loadingProfile)) {
    return (
      <View style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.forest} />
      </View>
    );
  }

  if (!session || !session.user) {
    return <AuthScreen />;
  }

  if (!profile) {
    return <ProfileSetupScreen session={session} onProfileCreated={(p) => setProfile(p)} />;
  }

  return (
    <MainScreen 
      session={session} 
      profile={profile} 
      onLogout={async () => {
        await supabase.auth.signOut();
        setProfile(null);
        setSession(null);
      }} 
    />
  );
}

// --- AUTH SCREEN ---
function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError('');
    
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      }
    } catch (e: any) {
      setError(e.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.authContainer}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Text style={{ fontSize: 40, fontWeight: '900', color: COLORS.forest, letterSpacing: -1 }}>Assiette</Text>
          <Text style={{ fontSize: 32, fontStyle: 'italic', color: COLORS.emerald, marginHorizontal: 8, fontWeight: '500' }}>en</Text>
          <View style={{ backgroundColor: COLORS.orange, width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '15deg' }] }}>
            <Text style={{ color: COLORS.white, fontWeight: '900', fontSize: 36, marginTop: -4 }}>+</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>Partagez plus, gaspillez moins.</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={`${COLORS.forest}60`}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={[styles.input, { marginTop: 16 }]}
            placeholder="Mot de passe"
            placeholderTextColor={`${COLORS.forest}60`}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity style={styles.submitBtn} onPress={handleAuth} disabled={loading}>
            {loading ? <ActivityIndicator color={COLORS.oat} /> : <Text style={styles.submitBtnText}>{isLogin ? 'Se connecter' : "S'inscrire"}</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={{ marginTop: 24, alignItems: 'center' }}>
            <Text style={{ color: COLORS.forest, fontWeight: '600' }}>
              {isLogin ? "Pas encore de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// --- PROFILE SETUP SCREEN ---
function ProfileSetupScreen({ session, onProfileCreated }: { session: Session, onProfileCreated: (p: any) => void }) {
  const [username, setUsername] = useState('');
  const [address, setAddress] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pickImage = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.5, maxWidth: 800, includeBase64: true });
    if (result.assets && result.assets[0].uri) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 || null);
    }
  };

  const uploadAvatar = async (base64Str: string) => {
    const ext = imageUri?.substring(imageUri.lastIndexOf('.') + 1) || 'jpg';
    const filename = `avatars/${session.user.id}_${Date.now()}.${ext}`;
    
    const { data, error } = await supabase.storage
      .from('images')
      .upload(filename, decode(base64Str), {
        contentType: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
      });

    if (error) {
      throw new Error(`Storage Error: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filename);
    return publicUrl;
  };

  const handleSaveProfile = async () => {
    if (!username.trim() || !address.trim()) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let avatarUrl = `https://ui-avatars.com/api/?name=${username}&background=1B3C35&color=F6F4ED`;
      
      if (imageBase64) {
        avatarUrl = await uploadAvatar(imageBase64);
      }

      const newProfile = {
        id: session.user.id,
        username,
        address,
        avatar_url: avatarUrl
      };

      const { error: dbError } = await supabase.from('profiles').insert(newProfile);
      
      if (dbError) throw dbError;

      onProfileCreated(newProfile);
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la sauvegarde du profil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.authContainer}>
        <Text style={styles.logoBig}>Bienvenue !</Text>
        <Text style={styles.subtitle}>Personnalisez votre profil pour la communauté.</Text>

        <View style={styles.form}>
          <TouchableOpacity style={styles.avatarUploadBox} onPress={pickImage}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.avatarUploadPreview} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Camera color={COLORS.forest} size={32} />
              </View>
            )}
            <Text style={styles.avatarText}>Photo de profil (optionnel)</Text>
          </TouchableOpacity>

          <Text style={styles.label}>VOTRE NOM / PSEUDO</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Amir"
            placeholderTextColor={`${COLORS.forest}60`}
            value={username}
            onChangeText={setUsername}
          />

          <Text style={[styles.label, { marginTop: 24 }]}>ADRESSE PAR DÉFAUT</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 12 Rue de Paris"
            placeholderTextColor={`${COLORS.forest}60`}
            value={address}
            onChangeText={setAddress}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity style={styles.submitBtn} onPress={handleSaveProfile} disabled={loading}>
            {loading ? <ActivityIndicator color={COLORS.oat} /> : <Text style={styles.submitBtnText}>Enregistrer mon profil</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// --- MAIN SCREEN ---
function MainScreen({ session, profile, onLogout }: { session: Session, profile: any, onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState('explore');
  const [donations, setDonations] = useState<any[]>([]);
  const [myDonations, setMyDonations] = useState<any[]>([]);
  const [donationsPage, setDonationsPage] = useState(0);
  const [hasMoreDonations, setHasMoreDonations] = useState(true);
  const [isLoadingMoreDonations, setIsLoadingMoreDonations] = useState(false);
  const DONATIONS_PAGE_SIZE = 15;
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  // Form States
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('plat');
  const [newDesc, setNewDesc] = useState('');
  const [newPortions, setNewPortions] = useState('');
  const [newAddress, setNewAddress] = useState(profile.address); // Pre-fill with profile address
  const [isLocatingAddress, setIsLocatingAddress] = useState(false);
  const [newExpiresAt, setNewExpiresAt] = useState<Date>(() => new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [userInfoModalVisible, setUserInfoModalVisible] = useState(false);
  
  // Advanced Filter States
  const [isHalalFilter, setIsHalalFilter] = useState(false);
  const [sortBy, setSortBy] = useState<'time' | 'distance'>('distance');
  const [isNewHalal, setIsNewHalal] = useState(false);
  
  // Toast
  const [toastMsg, setToastMsg] = useState('');

  // Chat States
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState<any>(null);
  const [requestMsg, setRequestMsg] = useState('Bonjour, je peux venir récupérer dans 10 min');
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [requestedPortions, setRequestedPortions] = useState('1');
  const [msgFilter, setMsgFilter] = useState('all');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [viewingDonation, setViewingDonation] = useState<any>(null);
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [editedUsername, setEditedUsername] = useState(profile.username);
  const [editedAddress, setEditedAddress] = useState(profile.address);
  
  // Premium Features States
  const [karma, setKarma] = useState(1250);
  const [exploreMode, setExploreMode] = useState<'list' | 'swipe'>('list');
  const [swipeIndex, setSwipeIndex] = useState(0);
  const [activeSubPage, setActiveSubPage] = useState<'none' | 'preferences' | 'help' | 'blocked' | 'manage'>('none');
  const [urgentMission, setUrgentMission] = useState<any>(null);
  const [usingGPS, setUsingGPS] = useState(false);
  const [currentAddressName, setCurrentAddressName] = useState('');
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [targetUserStats, setTargetUserStats] = useState({ received: 0, given: 0 });
  const [blockSearch, setBlockSearch] = useState('');
  const [editingDonation, setEditingDonation] = useState<any>(null);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const blinkAnim = useRef(new Animated.Value(1)).current;
  
  // User Preferences Functional States
  const [notifDons, setNotifDons] = useState(true);
  const [notifMsgs, setNotifMsgs] = useState(true);
  const [notifMissions, setNotifMissions] = useState(true);
  const [showGrade, setShowGrade] = useState(true);
  const [shareExactLocation, setShareExactLocation] = useState(true);

  useEffect(() => {
    if (hasNewNotification) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(blinkAnim, { toValue: 0.3, duration: 500, useNativeDriver: true }),
          Animated.timing(blinkAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      blinkAnim.setValue(1);
    }
  }, [hasNewNotification]);

  const getTimeRemaining = (expiresAt: string) => {
    if (!expiresAt) return "24h";
    const remaining = new Date(expiresAt).getTime() - new Date().getTime();
    if (remaining < 0) return "Expiré";
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const fetchDonations = async (page = 0) => {
    if (page === 0) {
      setDonationsPage(0);
      setHasMoreDonations(true);
    } else {
      setIsLoadingMoreDonations(true);
    }

    const { data, error } = await supabase.rpc('get_donations_nearby', {
      user_lat: userLocation?.lat ?? null,
      user_lng: userLocation?.lng ?? null,
      page_size: DONATIONS_PAGE_SIZE,
      page_offset: page * DONATIONS_PAGE_SIZE,
    });

    if (error) {
      console.warn('App: Donations fetch error:', error.message);
      showToast('Impossible de charger les annonces');
      setIsLoadingMoreDonations(false);
      return;
    }

    if (data) {
      setDonations((prev) => (page === 0 ? data : [...prev, ...data]));
      setDonationsPage(page);
      setHasMoreDonations(data.length === DONATIONS_PAGE_SIZE);
      if (page === 0) {
        // Logic for Mission Sauvetage: Find a donation with many portions or very recent
        const urgent = data.find((d: any) => (parsePortions(d.portions) || 0) > 5) || data[0];
        setUrgentMission(urgent);
      }
    }
    setIsLoadingMoreDonations(false);
  };

  const loadMoreDonations = () => {
    if (isLoadingMoreDonations || !hasMoreDonations) return;
    fetchDonations(donationsPage + 1);
  };

  const fetchMyDonations = async () => {
    const { data, error } = await supabase
      .from('donations')
      .select('id, title, type, description, portions, image, user_id, created_at, latitude, longitude, is_halal, city, expires_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('App: My donations fetch error:', error.message);
      return;
    }
    if (data) setMyDonations(data);
  };

  useEffect(() => {
    console.log('App: Main effect running');
    fetchDonations(0);
    fetchMyDonations();
    cleanupExpiredDonations();

    // Supabase Realtime Subscription (Donations)
    let subDonations: any;
    let subMessages: any;
    try {
      subDonations = supabase
        .channel('donations_channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'donations' }, () => {
          fetchDonations(0);
          fetchMyDonations();
        })
        .subscribe();

      subMessages = supabase
        .channel('messages_channel')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          if (payload.new.sender_id !== session.user.id) {
            setHasNewNotification(true);
            if (activeTab !== 'messages') fetchConversations();
          }
        })
        .subscribe();
    } catch (err) {
      console.warn('App: Realtime subscription failed', err);
    }

    requestCurrentLocation()
      .then((coords) => {
        console.log('App: Location received');
        setUserLocation(coords);
      })
      .catch((err) => {
        console.warn('App: Location unavailable:', err.message);
      });

    return () => {
      try {
        if (subDonations) supabase.removeChannel(subDonations);
        if (subMessages) supabase.removeChannel(subMessages);
      } catch (e: any) {
        console.warn('App: Realtime cleanup error:', e.message || e);
      }
    };
  }, []);

  // Re-trie le fil du plus proche au plus loin des que la position
  // GPS reelle est disponible (au demarrage, elle vaut encore null).
  useEffect(() => {
    if (userLocation) fetchDonations(0);
  }, [userLocation]);

  // --- PERSISTENCE & PREFERENCES LOGIC ---
  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const saved = await AsyncStorage.getItem('user_prefs');
        if (saved) {
          const p = JSON.parse(saved);
          if (p.notifDons !== undefined) setNotifDons(p.notifDons);
          if (p.notifMsgs !== undefined) setNotifMsgs(p.notifMsgs);
          if (p.notifMissions !== undefined) setNotifMissions(p.notifMissions);
          if (p.showGrade !== undefined) setShowGrade(p.showGrade);
          if (p.shareExactLocation !== undefined) setShareExactLocation(p.shareExactLocation);
        }
      } catch (e: any) {
        console.warn('App: Preferences load error:', e.message || e);
      }
    };
    loadPrefs();
  }, []);

  useEffect(() => {
    const savePrefs = async () => {
      try {
        const prefs = { notifDons, notifMsgs, notifMissions, showGrade, shareExactLocation };
        await AsyncStorage.setItem('user_prefs', JSON.stringify(prefs));
      } catch (e: any) {
        console.warn('App: Preferences save error:', e.message || e);
      }
    };
    savePrefs();
  }, [notifDons, notifMsgs, notifMissions, showGrade, shareExactLocation]);

  const fetchConversations = async () => {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        donations:donation_id(title, image, portions),
        requester:requester_id(username, avatar_url),
        owner:owner_id(username, avatar_url)
      `)
      .or(`requester_id.eq.${session.user.id},owner_id.eq.${session.user.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('App: Conversations fetch error:', error.message);
      showToast('Impossible de charger les messages');
      return;
    }

    if (data) setConversations(data);
  };

  const loadChat = async (conversation: any) => {
    setActiveChat(conversation);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true });
    if (error) {
      console.warn('App: Chat fetch error:', error.message);
      showToast('Impossible de charger la conversation');
      return;
    }

    if (data) setChatMessages(data);

    // Calculate reciprocity stats
    const otherUserId = conversation.requester_id === session.user.id ? conversation.owner_id : conversation.requester_id;
    const { data: convs } = await supabase.from('conversations').select('*').eq('status', 'accepted');
    if (convs) {
      const received = convs.filter(c => c.requester_id === session.user.id && (c.owner_id === otherUserId)).length;
      const given = convs.filter(c => c.owner_id === session.user.id && (c.requester_id === otherUserId)).length;
      setTargetUserStats({ received, given });
    }
  };

  useEffect(() => {
    if (activeTab === 'messages') {
      fetchConversations();
    }
  }, [activeTab]);

  const openRequestModal = (item: any) => {
    const availablePortions = parsePortions(item.portions);
    if (availablePortions !== null && availablePortions <= 0) {
      showToast('Ce don n’a plus de portions disponibles');
      return;
    }

    setSelectedDonation(item);
    setRequestMsg(`Bonjour, je suis intéressé par ${item.title} !`);
    setRequestedPortions('1');
    setRequestModalVisible(true);
  };

  const handleSendRequest = async () => {
    if (!requestMsg.trim() || !selectedDonation) return;
    const requested = parsePortions(requestedPortions);
    const availablePortions = parsePortions(selectedDonation.portions);

    if (!requested) {
      showToast('Choisissez au moins 1 portion');
      return;
    }

    if (availablePortions !== null && requested > availablePortions) {
      showToast(`Stock insuffisant : ${availablePortions} portion(s) disponible(s)`);
      return;
    }

    setIsPublishing(true);
    
    try {
      let convId;
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('*')
        .eq('donation_id', selectedDonation.id)
        .eq('requester_id', session.user.id)
        .single();
        
      if (existingConv) {
        convId = existingConv.id;
      } else {
        const { data: newConv, error: convErr } = await supabase
          .from('conversations')
          .insert({
            donation_id: selectedDonation.id,
            requester_id: session.user.id,
            owner_id: selectedDonation.user_id,
            requested_portions: requested,
          })
          .select().single();
        if (convErr) throw convErr;
        convId = newConv.id;
      }

      const { error: msgErr } = await supabase
        .from('messages')
        .insert({
          conversation_id: convId,
          sender_id: session.user.id,
          content: requestMsg,
        });
      if (msgErr) throw msgErr;

      showToast("Demande envoyée !");
      setRequestModalVisible(false);
      fetchConversations();
    } catch(e: any) {
      console.warn('App: Request send error:', e.message || e);
      showToast("Erreur lors de l'envoi");
    }
    setIsPublishing(false);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !activeChat) return;
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: activeChat.id,
          sender_id: session.user.id,
          content: chatInput,
        });
      if (!error) {
        setChatInput('');
        loadChat(activeChat); // Reload messages
      } else {
        console.warn('App: Message send error:', error.message);
        showToast("Erreur lors de l'envoi du message");
      }
    } catch(e: any) {
      console.warn('App: Message send crash:', e.message || e);
      showToast("Erreur lors de l'envoi du message");
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!activeChat) return;
    try {
      if (status === 'accepted') {
        // Acceptation + decompte des portions faits atomiquement cote
        // base (verrou de ligne), pour eviter que deux demandes
        // acceptees en meme temps ne survendent le stock disponible.
        const { data, error } = await supabase.rpc('accept_donation_request', {
          p_conversation_id: activeChat.id,
        });
        if (error) throw error;

        const result = data as any;
        if (!result?.success) {
          showToast(result?.message || 'Impossible d\'accepter la demande');
          return;
        }

        setActiveChat({ ...activeChat, status });
        fetchConversations();
        fetchDonations();
        showToast('Demande acceptée ! Portions mises à jour.');
        return;
      }

      const { error } = await supabase
        .from('conversations')
        .update({ status })
        .eq('id', activeChat.id);
      if (!error) {
        setActiveChat({ ...activeChat, status });
        fetchConversations();
        showToast('Demande refusée');
      } else {
        console.warn('App: Conversation status error:', error.message);
        showToast('Impossible de mettre à jour la demande');
      }
    } catch(e: any) {
      console.warn('App: Conversation status crash:', e.message || e);
      showToast('Impossible de mettre à jour la demande');
    }
  };

  const handleDeleteConversation = async (convId: string) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', convId);
      if (!error) {
        showToast("Conversation supprimée");
        setActiveChat(null);
        fetchConversations();
        setUserInfoModalVisible(false);
      } else {
        console.warn('App: Conversation delete error:', error.message);
        showToast('Impossible de supprimer la conversation');
      }
    } catch(e: any) {
      console.warn('App: Conversation delete crash:', e.message || e);
      showToast('Impossible de supprimer la conversation');
    }
  };

  const handleBlockUser = (userId: string) => {
    if (!blockedUsers.includes(userId)) {
      setBlockedUsers([...blockedUsers, userId]);
      showToast("Utilisateur bloqué");
      setActiveChat(null);
    }
  };

  const handleUnblockUser = (userId: string) => {
    setBlockedUsers(blockedUsers.filter(id => id !== userId));
    showToast("Utilisateur débloqué");
  };

  const isExploreMode = (mode: 'list' | 'swipe') => exploreMode === mode;

  const filteredDonations = donations.filter((item) => {
    if (blockedUsers.includes(item.user_id)) return false; // Hide blocked users
    const matchFilter = filter === 'all' || item.type === filter;
    const matchHalal = !isHalalFilter || item.is_halal;
    const matchSearch =
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchFilter && matchHalal && matchSearch;
  }).sort((a, b) => {
    if (sortBy === 'distance' && userLocation) {
      const coordsA = getDonationCoordinates(a);
      const coordsB = getDonationCoordinates(b);
      if (coordsA && coordsB) {
        return (
          calculateDistanceRaw(userLocation.lat, userLocation.lng, coordsA.lat, coordsA.lng) -
          calculateDistanceRaw(userLocation.lat, userLocation.lng, coordsB.lat, coordsB.lng)
        );
      }
      if (coordsA) return -1;
      if (coordsB) return 1;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffInMs = now.getTime() - past.getTime();
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMins < 1) return "À l'instant";
    if (diffInMins < 60) return `Il y a ${diffInMins} min`;
    if (diffInHours < 24) return `Il y a ${diffInHours} h`;
    return `Il y a ${diffInDays} j`;
  };

  const getDonationDistanceLabel = (item: any) => {
    if (!shareExactLocation) return 'À proximité';
    if (!userLocation) return 'Position GPS indisponible';

    const donationCoordinates = getDonationCoordinates(item);
    if (!donationCoordinates) return 'Distance indisponible';

    const distanceLabel = formatDistance(userLocation, donationCoordinates);
    return item.city ? `${item.city} · ${distanceLabel}` : distanceLabel;
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const refreshLocation = async () => {
    showToast('Mise à jour de votre position...');
    try {
      const coords = await requestCurrentLocation();
      setUserLocation(coords);
      setCurrentAddressName(await reverseGeocode(coords));
      setUsingGPS(true);
      setSortBy('distance');
      showToast('Position mise à jour !');
      fetchDonations();
    } catch (e: any) {
      console.warn('App: Location refresh error:', e.message || e);
      setUsingGPS(false);
      showToast(e.message || 'Erreur GPS');
    }
  };

  const handleDeleteDonation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('donations')
        .delete()
        .eq('id', id);
      if (!error) {
        showToast('Publication supprimée');
        fetchDonations();
        fetchMyDonations();
      } else {
        console.warn('App: Donation delete error:', error.message);
        showToast('Impossible de supprimer la publication');
      }
    } catch(e: any) {
      console.warn('App: Donation delete crash:', e.message || e);
      showToast('Impossible de supprimer la publication');
    }
  };

  const openDonationDetails = async (item: any) => {
    setViewingDonation(item);
    setDetailsModalVisible(true);

    const { data: address } = await supabase.rpc('get_donation_address', { donation_id: item.id });
    if (address) setViewingDonation({ ...item, address });
  };

  const openEditModal = async (item: any) => {
    setEditingDonation(item);
    setNewTitle(item.title);
    setNewDesc(item.description);
    setNewType(item.type);
    setNewPortions(item.portions);
    setIsNewHalal(item.is_halal);
    setNewAddress('');
    setEditModalVisible(true);

    const { data: address } = await supabase.rpc('get_donation_address', { donation_id: item.id });
    if (address) {
      setNewAddress(address);
      setEditingDonation({ ...item, address, distance: address });
    }
  };

  const handleUpdateDonation = async () => {
    if (!editingDonation) return;
    if (!newTitle.trim() || !newAddress.trim()) {
      showToast('Titre et adresse requis');
      return;
    }

    setIsPublishing(true);
    try {
      const trimmedAddress = newAddress.trim();
      const previousAddress = String(editingDonation.distance || '').trim();
      const updatePayload: any = {
        title: newTitle,
        description: newDesc,
        type: newType,
        portions: newPortions || 'N/A',
        is_halal: isNewHalal,
        distance: trimmedAddress,
      };

      if (trimmedAddress !== previousAddress || !getDonationCoordinates(editingDonation)) {
        const geocoded = await geocodeAddress(trimmedAddress);
        if (!geocoded) {
          showToast('Adresse introuvable, vérifiez le lieu de retrait');
          return;
        }

        updatePayload.distance = geocoded.label;
        updatePayload.city = geocoded.city;
        updatePayload.latitude = geocoded.lat;
        updatePayload.longitude = geocoded.lng;
      }

      const { error } = await supabase
        .from('donations')
        .update(updatePayload)
        .eq('id', editingDonation.id);
      
      if (!error) {
        showToast('Donation mise à jour !');
        setEditModalVisible(false);
        fetchDonations();
        fetchMyDonations();
        // Clear states
        setNewTitle('');
        setNewDesc('');
        setNewPortions('');
        setEditingDonation(null);
      } else {
        showToast('Erreur lors de la mise à jour');
      }
    } catch (e: any) {
      console.warn('App: Donation update error:', e.message || e);
      showToast('Erreur de connexion');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!editedUsername.trim() || !editedAddress.trim()) return;
    setIsPublishing(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username: editedUsername, address: editedAddress })
        .eq('id', session.user.id);
      
      if (!error) {
        showToast("Profil mis à jour !");
        setEditProfileVisible(false);
        // Refresh donations to reflect the new address context
        fetchDonations();
      } else {
        showToast("Erreur lors de la mise à jour");
      }
    } catch(e) {
      showToast("Erreur de connexion");
    }
    setIsPublishing(false);
  };

  const pickImage = async () => {
    const result = await launchImageLibrary({ 
      mediaType: 'photo', 
      quality: 0.5, 
      maxWidth: 800, 
      includeBase64: true 
    });
    if (result.assets && result.assets[0].uri) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 || null);
    }
  };

  const uploadImage = async (base64Str: string) => {
    const ext = imageUri?.substring(imageUri.lastIndexOf('.') + 1) || 'jpg';
    const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
    
    const { data, error } = await supabase.storage
      .from('images')
      .upload(`donations/${filename}`, decode(base64Str), {
        contentType: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
      });

    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(`donations/${filename}`);
    return publicUrl;
  };

  const handleUseMyLocationForAddress = async () => {
    setIsLocatingAddress(true);
    try {
      const coords = await requestCurrentLocation();
      setNewAddress(await reverseGeocode(coords));
    } catch (e: any) {
      showToast(e.message || 'Position GPS indisponible.');
    }
    setIsLocatingAddress(false);
  };

  const setExpiryDayOffset = (dayOffset: number) => {
    setNewExpiresAt((prev) => {
      const next = new Date();
      next.setDate(next.getDate() + dayOffset);
      next.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
      return next;
    });
  };

  const adjustExpiryHour = (delta: number) => {
    setNewExpiresAt((prev) => {
      const next = new Date(prev);
      next.setHours(next.getHours() + delta);
      return next;
    });
  };

  const adjustExpiryMinute = (delta: number) => {
    setNewExpiresAt((prev) => {
      const next = new Date(prev);
      next.setMinutes(next.getMinutes() + delta);
      return next;
    });
  };

  const formatExpiryLabel = (d: Date) =>
    d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  const handleAddDonation = async () => {
    if (!newTitle.trim() || !newAddress.trim()) {
      showToast('Titre et adresse requis');
      return;
    }

    if (newExpiresAt.getTime() <= Date.now()) {
      showToast('La date/heure limite doit être dans le futur');
      return;
    }

    setIsPublishing(true);

    try {
      const geocoded = await geocodeAddress(newAddress);
      if (!geocoded) {
        showToast('Adresse introuvable, vérifiez le lieu de retrait');
        setIsPublishing(false);
        return;
      }

      let imageUrl = null;
      if (imageBase64) {
        imageUrl = await uploadImage(imageBase64);
      }

      const { error } = await supabase.from('donations').insert({
        title: newTitle,
        type: newType,
        description: newDesc,
        portions: newPortions || 'N/A',
        distance: geocoded.label,
        city: geocoded.city,
        image: imageUrl || 'https://images.unsplash.com/photo-1498837167922-41cfa6f31027?ixlib=rb-4.0.3&w=800&q=80',
        user_id: session.user.id,
        latitude: geocoded.lat,
        longitude: geocoded.lng,
        is_halal: isNewHalal,
        expires_at: newExpiresAt.toISOString(),
      });

      if (error) throw error;

      setShowSuccess(true);
      setNewTitle('');
      setNewType('plat');
      setNewDesc('');
      setNewPortions('');
      setNewAddress(profile.address); // Reset to default
      setNewExpiresAt(new Date(Date.now() + 24 * 60 * 60 * 1000));
      setImageUri(null);
      setImageBase64(null);
      setIsNewHalal(false);

      setTimeout(() => {
        setShowSuccess(false);
        setActiveTab('explore');
        setFilter('all');
      }, 2000);
    } catch (e: any) {
      showToast(`Erreur: ${e.message}`);
      console.warn('App: Donation create error:', e.message || e);
    }
    setIsPublishing(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {toastMsg ? (
        <View style={styles.toast}>
          <Check color={COLORS.terracotta} size={16} />
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      ) : null}

      <Modal visible={requestModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setRequestModalVisible(false)}>
              <X color={COLORS.forest} size={24} />
            </TouchableOpacity>
            
            {selectedDonation && (
              <>
                <Text style={styles.modalTitle}>Demande pour :</Text>
                <Text style={styles.modalDonationTitle}>{selectedDonation.title}</Text>
                <Text style={styles.modalDonationMeta}>📍 {getDonationDistanceLabel(selectedDonation)} • {getTimeAgo(selectedDonation.created_at)} • {selectedDonation.portions} portions dispos</Text>

                <View style={{ marginTop: 20 }}>
                  <Text style={styles.label}>COMBIEN DE PORTIONS ?</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TouchableOpacity 
                      onPress={() => setRequestedPortions(Math.max(1, (parsePortions(requestedPortions) || 1) - 1).toString())}
                      style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: `${COLORS.forest}10`, justifyContent: 'center', alignItems: 'center' }}
                    >
                      <Text style={{ fontSize: 20, fontWeight: 'bold' }}>-</Text>
                    </TouchableOpacity>
                    <Text style={{ fontSize: 24, fontWeight: '900', color: COLORS.forest }}>{requestedPortions}</Text>
                    <TouchableOpacity 
                      onPress={() => setRequestedPortions(Math.min(parsePortions(selectedDonation.portions) || 1, (parsePortions(requestedPortions) || 1) + 1).toString())}
                      style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: `${COLORS.forest}10`, justifyContent: 'center', alignItems: 'center' }}
                    >
                      <Text style={{ fontSize: 20, fontWeight: 'bold' }}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={[styles.label, { marginTop: 24 }]}>VOTRE MESSAGE</Text>
                <TextInput
                  style={styles.textArea}
                  multiline
                  value={requestMsg}
                  onChangeText={setRequestMsg}
                />

                <TouchableOpacity style={styles.submitBtn} onPress={handleSendRequest} disabled={isPublishing}>
                  {isPublishing ? <ActivityIndicator color={COLORS.oat} /> : <Text style={styles.submitBtnText}>Envoyer la demande</Text>}
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {!activeChat && (
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.logo, { fontWeight: '900', letterSpacing: -1 }]}>Assiette</Text>
            <Text style={{ fontSize: 20, fontStyle: 'italic', color: COLORS.emerald, marginHorizontal: 4, fontWeight: '500' }}>en</Text>
            <View style={{ backgroundColor: COLORS.orange, width: 22, height: 22, borderRadius: 6, justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '15deg' }] }}>
              <Text style={{ color: COLORS.white, fontWeight: '900', fontSize: 18, marginTop: -2 }}>+</Text>
            </View>
          </View>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity 
              onPress={() => setActiveSubPage('manage')}
              style={{ backgroundColor: COLORS.white, padding: 8, borderRadius: 12, borderWidth: 1, borderColor: COLORS.sand }}
            >
              <Package color={COLORS.forest} size={20} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveTab('profile')} style={{ padding: 2 }}>
              <Image
                source={{ uri: profile?.avatar_url ? profile.avatar_url.replace(/ /g, '%20') : 'https://ui-avatars.com/api/?name=Anonyme' }}
        style={styles.avatarMini}
              />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.container}>
        {activeTab === 'explore' && (
          activeSubPage === 'manage' ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              <TouchableOpacity onPress={() => setActiveSubPage('none')} style={styles.backBtn}>
                <ArrowRight color={COLORS.forest} size={20} style={{ transform: [{ rotate: '180deg' }] }} />
                <Text style={styles.backBtnText}>Retour</Text>
              </TouchableOpacity>
              <Text style={styles.title}>Mes Annonces</Text>
              <Text style={styles.subtitle}>Gérez vos dons actifs.</Text>

              <View style={{ gap: 16, marginTop: 12 }}>
                {myDonations.length === 0 ? (
                  <View style={{ alignItems: 'center', marginTop: 40, opacity: 0.3 }}>
                    <Package color={COLORS.forest} size={48} />
                    <Text style={{ marginTop: 12, fontWeight: 'bold' }}>Vous n'avez aucun don actif</Text>
                  </View>
                ) : (
                  myDonations.map((item) => (
                    <View key={item.id} style={styles.manageCard}>
                      <Image source={{ uri: item.image }} style={styles.manageCardImage} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.manageCardTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.manageCardMeta}>{item.portions} portions • {getTimeAgo(item.created_at)}</Text>
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                          <TouchableOpacity
                            style={[styles.actionBtnSmall, { backgroundColor: `${COLORS.emerald}10` }]}
                            onPress={() => openEditModal(item)}
                          >
                            <Edit color={COLORS.emerald} size={14} />
                            <Text style={{ color: COLORS.emerald, fontSize: 10, fontWeight: 'bold', marginLeft: 4 }}>MODIFIER</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={[styles.actionBtnSmall, { backgroundColor: `${COLORS.terracotta}10` }]} 
                            onPress={() => handleDeleteDonation(item.id)}
                          >
                            <Trash2 color={COLORS.terracotta} size={14} />
                            <Text style={{ color: COLORS.terracotta, fontSize: 10, fontWeight: 'bold', marginLeft: 4 }}>SUPPRIMER</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          ) : exploreMode === 'list' ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              onScroll={({ nativeEvent }) => {
                const { contentOffset, layoutMeasurement, contentSize } = nativeEvent;
                if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 300) {
                  loadMoreDonations();
                }
              }}
              scrollEventThrottle={200}
            >
              <Text style={styles.title}>
                Partagez plus, {'\n'}
                <Text style={styles.titleHighlight}>gaspillez moins.</Text>
              </Text>
              <Text style={styles.subtitle}>Découvrez les dons autour de vous aujourd'hui.</Text>

              {urgentMission && (
                <View style={{ backgroundColor: COLORS.rose, padding: 16, borderRadius: 24, marginBottom: 20, shadowColor: COLORS.rose, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.white }} />
                    <Text style={{ color: COLORS.white, fontWeight: '900', fontSize: 10, letterSpacing: 1 }}>MISSION SAUVETAGE</Text>
                  </View>
                  <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: '600', marginBottom: 12 }}>
                    <Text style={{ fontWeight: '900' }}>{urgentMission.portions} portions de {urgentMission.title}</Text> d'urgence ! (À {getDonationDistanceLabel(urgentMission)})
                  </Text>
                  <TouchableOpacity 
                    onPress={() => {
                      setSelectedDonation(urgentMission);
                      setRequestMsg(`Je participe à la mission sauvetage pour : ${urgentMission.title} ! Je peux passer rapidement.`);
                      setRequestModalVisible(true);
                    }}
                    style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 10, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}
                  >
                    <Text style={{ color: COLORS.white, fontWeight: '900', fontSize: 12 }}>Je participe</Text>
                    <ArrowRight color={COLORS.white} size={14} />
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.searchBox}>
                <Search color={COLORS.forest} size={20} opacity={0.5} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Rechercher..."
                  placeholderTextColor={`${COLORS.forest}70`}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                <TouchableOpacity onPress={refreshLocation} style={{ padding: 8 }}>
                  <MapPin color={COLORS.terracotta} size={20} />
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: -12, marginBottom: 20, paddingHorizontal: 4 }}>
                <MapPin color={usingGPS ? COLORS.emerald : `${COLORS.forest}30`} size={10} />
                <Text style={{ fontSize: 10, color: `${COLORS.forest}50`, fontWeight: '700' }}>
                  DONS AUTOUR DE : <Text style={{ color: usingGPS ? COLORS.emerald : COLORS.forest, fontWeight: '900' }}>{usingGPS ? (currentAddressName || 'CHARGEMENT...').toUpperCase() : (profile?.address || 'Position inconnue').toUpperCase()}</Text>
                </Text>
                {usingGPS && (
                  <TouchableOpacity onPress={() => { setUsingGPS(false); setSortBy('time'); }}>
                    <Text style={{ fontSize: 10, color: COLORS.terracotta, marginLeft: 8, fontWeight: 'bold' }}>[RÉINITIALISER]</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={{ flexDirection: 'row', backgroundColor: `${COLORS.sand}50`, padding: 4, borderRadius: 16, marginBottom: 20 }}>
                <TouchableOpacity 
                  onPress={() => setExploreMode('list')}
                  style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: isExploreMode('list') ? COLORS.white : 'transparent', borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: isExploreMode('list') ? 0.1 : 0, shadowRadius: 4, elevation: isExploreMode('list') ? 2 : 0 }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '900', color: isExploreMode('list') ? COLORS.forest : `${COLORS.forest}50` }}>Liste</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => { setExploreMode('swipe'); setSwipeIndex(0); }}
                  style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: isExploreMode('swipe') ? COLORS.emerald : 'transparent', borderRadius: 12, shadowColor: COLORS.emerald, shadowOffset: { width: 0, height: 4 }, shadowOpacity: isExploreMode('swipe') ? 0.3 : 0, shadowRadius: 6, elevation: isExploreMode('swipe') ? 4 : 0 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Zap color={isExploreMode('swipe') ? COLORS.white : `${COLORS.forest}50`} size={14} fill={isExploreMode('swipe') ? COLORS.white : 'transparent'} />
                    <Text style={{ fontSize: 12, fontWeight: '900', color: isExploreMode('swipe') ? COLORS.white : `${COLORS.forest}50` }}>Éclair</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                <TouchableOpacity
                  style={[styles.filterBtn, filter === 'all' && styles.filterBtnActive]}
                  onPress={() => setFilter('all')}
                >
                  <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>Tout</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterBtn, isHalalFilter && styles.filterBtnActiveTerracotta]}
                  onPress={() => setIsHalalFilter(!isHalalFilter)}
                >
                  <Text style={[styles.filterText, isHalalFilter && styles.filterTextActive]}>☪️ Halal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterBtn, sortBy === 'distance' && styles.filterBtnActiveSage]}
                  onPress={() => setSortBy(sortBy === 'distance' ? 'time' : 'distance')}
                >
                  <MapPin color={sortBy === 'distance' ? COLORS.oat : COLORS.forest} size={16} style={{ marginRight: 6 }} />
                  <Text style={[styles.filterText, sortBy === 'distance' && styles.filterTextActive]}>Proche</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterBtn, filter === 'plat' && styles.filterBtnActiveTerracotta]}
                  onPress={() => setFilter('plat')}
                >
                  <UtensilsCrossed color={filter === 'plat' ? COLORS.oat : COLORS.forest} size={16} style={{ marginRight: 6 }} />
                  <Text style={[styles.filterText, filter === 'plat' && styles.filterTextActive]}>Plats</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterBtn, filter === 'surplus' && styles.filterBtnActiveSage]}
                  onPress={() => setFilter('surplus')}
                >
                  <Leaf color={filter === 'surplus' ? COLORS.oat : COLORS.forest} size={16} style={{ marginRight: 6 }} />
                  <Text style={[styles.filterText, filter === 'surplus' && styles.filterTextActive]}>Surplus</Text>
                </TouchableOpacity>
              </ScrollView>

              <View style={styles.list}>
                {filteredDonations.length === 0 ? (
                  <Text style={styles.emptyText}>Aucun résultat trouvé.</Text>
                ) : (
                  filteredDonations.map((item) => (
                    <View key={item.id} style={styles.card}>
                      <TouchableOpacity 
                        activeOpacity={0.9} 
                        onPress={() => openDonationDetails(item)}
                        style={{ flex: 1 }}
                      >
                        <View style={styles.cardImageContainer}>
                          <Image source={{ uri: item.image }} style={styles.cardImage} />
                          <View style={styles.cardBadge}>
                            {item.type === 'plat' ? <UtensilsCrossed color={COLORS.terracotta} size={14} /> : <Leaf color={COLORS.sage} size={14} />}
                            <Text style={[styles.cardBadgeText, { color: item.type === 'plat' ? COLORS.terracotta : COLORS.sage }]}>
                              {item.type === 'plat' ? 'Plat Maison' : 'Surplus'}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.cardContent}>
                          <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>{item.title}</Text>
                            {item.portions && item.portions !== 'N/A' && (
                              <View style={styles.portionBadge}>
                                <Text style={styles.portionText}>{item.portions} pers.</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
                          <View style={styles.cardFooter}>
                            <View style={styles.userInfo}>
                              <Image source={{ uri: item.avatar_url || 'https://ui-avatars.com/api/?name=Anonyme' }} style={styles.userAvatar} />
                              <View>
                                <Text style={styles.userName}>{item.username || 'Anonyme'}</Text>
                                <Text style={styles.userMeta}>
                                  <MapPin color={COLORS.forest} size={10} opacity={0.5} /> {getDonationDistanceLabel(item)} • {getTimeAgo(item.created_at)}
                                </Text>
                              </View>
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>

                    </View>
                  ))
                )}
              </View>
              {isLoadingMoreDonations && (
                <ActivityIndicator color={COLORS.forest} style={{ marginVertical: 20 }} />
              )}
            </ScrollView>
          ) : (
            <View style={{ flex: 1, marginTop: 10, minHeight: 500 }}>
              {swipeIndex >= filteredDonations.length ? (
                <View style={{ flex: 1, backgroundColor: COLORS.white, borderRadius: 30, justifyContent: 'center', alignItems: 'center', padding: 40, borderStyle: 'dashed', borderWidth: 2, borderColor: COLORS.sand, minHeight: 400 }}>
                  <Inbox color={COLORS.sage} size={48} />
                  <Text style={{ marginTop: 16, fontSize: 18, fontWeight: 'bold', color: COLORS.forest }}>Tu as tout vu !</Text>
                  <Text style={{ textAlign: 'center', color: `${COLORS.forest}60`, marginTop: 8 }}>Reviens plus tard pour de nouveaux dons.</Text>
                  <TouchableOpacity 
                    onPress={() => { setSwipeIndex(0); setExploreMode('list'); }}
                    style={{ marginTop: 24, backgroundColor: COLORS.forest, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 }}
                  >
                    <Text style={{ color: COLORS.white, fontWeight: 'bold' }}>Retour à la liste</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ flex: 1, backgroundColor: COLORS.white, borderRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 5, overflow: 'hidden', minHeight: 500 }}>
                  <Image source={{ uri: filteredDonations[swipeIndex].image }} style={{ width: '100%', height: '60%' }} />
                  <View style={{ padding: 20, flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 20, fontWeight: '900', color: COLORS.forest }}>{filteredDonations[swipeIndex].title}</Text>
                      <View style={{ backgroundColor: `${COLORS.emerald}15`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                         <Text style={{ color: COLORS.emerald, fontSize: 10, fontWeight: '900' }}>ÉCLAIR</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 14, color: `${COLORS.forest}60`, marginTop: 8, flex: 1 }} numberOfLines={3}>{filteredDonations[swipeIndex].description}</Text>
                    
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                      <TouchableOpacity 
                        onPress={() => setSwipeIndex(prev => prev + 1)}
                        style={{ flex: 1, backgroundColor: `${COLORS.forest}10`, paddingVertical: 16, borderRadius: 20, alignItems: 'center' }}
                      >
                        <Text style={{ fontWeight: '900', color: COLORS.forest }}>Passer</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => openRequestModal(filteredDonations[swipeIndex])}
                        style={{ flex: 1, backgroundColor: COLORS.emerald, paddingVertical: 16, borderRadius: 20, alignItems: 'center', shadowColor: COLORS.emerald, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
                      >
                        <Text style={{ fontWeight: '900', color: COLORS.white }}>Sauver</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )
        )}

        {activeTab === 'messages' && (
          <View style={{ flex: 1 }}>
            {activeChat ? (
              <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}>
                <View style={styles.chatHeader}>
                  <TouchableOpacity onPress={() => setActiveChat(null)} style={{ padding: 8 }}>
                    <ArrowRight color={COLORS.forest} size={24} style={{ transform: [{ rotate: '180deg' }] }} />
                  </TouchableOpacity>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.chatTitle} numberOfLines={1}>{activeChat.donations?.title}</Text>
                    <Text style={{ fontSize: 10, color: COLORS.emerald, fontWeight: 'bold' }}>DEMANDE : {activeChat.requested_portions} PORTION(S)</Text>
                  </View>
                  <TouchableOpacity onPress={() => setUserInfoModalVisible(true)} style={{ padding: 4 }}>
                    <Image 
                      source={{ uri: (activeChat.requester_id === session.user.id ? activeChat.owner?.avatar_url : activeChat.requester?.avatar_url) || 'https://ui-avatars.com/api/?name=Anonyme' }} 
                      style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: COLORS.emerald }} 
                    />
                  </TouchableOpacity>
                </View>

                {activeChat.owner_id === session.user.id && (!activeChat.status || activeChat.status === 'pending') && (
                  <View style={styles.chatActionBox}>
                    <TouchableOpacity style={[styles.chatActionBtn, { backgroundColor: COLORS.terracotta }]} onPress={() => handleUpdateStatus('refused')}>
                      <Text style={styles.chatActionBtnText}>Refuser</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.chatActionBtn, { backgroundColor: COLORS.sage }]} onPress={() => handleUpdateStatus('accepted')}>
                      <Text style={styles.chatActionBtnText}>Accepter</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <ScrollView contentContainerStyle={styles.chatScroll}>
                  {chatMessages.map((msg, index) => {
                    const isMe = msg.sender_id === session.user.id;
                    return (
                      <View key={index} style={[styles.msgBubble, isMe ? styles.msgBubbleMe : styles.msgBubbleOther]}>
                        <Text style={[styles.msgText, isMe ? styles.msgTextMe : styles.msgTextOther]}>{msg.content}</Text>
                      </View>
                    );
                  })}
                </ScrollView>
                <View style={styles.chatInputContainer}>
                  <TextInput
                    style={styles.chatInput}
                    placeholder="Écrivez un message..."
                    placeholderTextColor={`${COLORS.forest}50`}
                    value={chatInput}
                    onChangeText={setChatInput}
                  />
                  <TouchableOpacity style={styles.chatSendBtn} onPress={handleSendMessage}>
                    <Send color={COLORS.oat} size={18} />
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <Text style={styles.title}>Messagerie</Text>
                <Text style={styles.subtitle}>Vos demandes en cours.</Text>
                
                {/* MESSAGES DONATION FILTER */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 16 }}>
                  <TouchableOpacity 
                    onPress={() => setMsgFilter('all')}
                    style={[styles.filterBtn, msgFilter === 'all' && styles.filterBtnActive]}
                  >
                    <Text style={[styles.filterText, msgFilter === 'all' && styles.filterTextActive]}>Tout</Text>
                  </TouchableOpacity>
                  {[...new Set(conversations.map(c => c.donations?.title))].filter(Boolean).map((title: any) => (
                    <TouchableOpacity 
                      key={title}
                      onPress={() => setMsgFilter(title)}
                      style={[styles.filterBtn, msgFilter === title && styles.filterBtnActiveSage]}
                    >
                      <Text style={[styles.filterText, msgFilter === title && styles.filterTextActive]}>{title}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                
                {conversations.filter(c => msgFilter === 'all' || c.donations?.title === msgFilter).length === 0 ? (
                  <Text style={styles.emptyText}>Aucune conversation.</Text>
                ) : (
                  conversations
                    .filter(c => msgFilter === 'all' || c.donations?.title === msgFilter)
                    .map((conv) => {
                    const otherUser = conv.requester_id === session.user.id ? conv.owner : conv.requester;
                    
                    let badgeText = 'En attente';
                    let badgeColor = '#E8A365'; // Orange
                    if (conv.status === 'accepted') { badgeText = 'Acceptée'; badgeColor = COLORS.sage; }
                    else if (conv.status === 'refused') { badgeText = 'Refusée'; badgeColor = COLORS.terracotta; }

                    return (
                      <TouchableOpacity key={conv.id} style={styles.convCard} onPress={() => loadChat(conv)}>
                        <Image source={{ uri: otherUser?.avatar_url || 'https://ui-avatars.com/api/?name=Anonyme' }} style={styles.convAvatar} />
                        <View style={styles.convInfo}>
                          <Text style={styles.convName}>{otherUser?.username || 'Anonyme'}</Text>
                          <Text style={styles.convDonation}>{conv.donations?.title}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: badgeColor }]}>
                          <Text style={styles.statusText}>{badgeText}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            )}
          </View>
        )}

        {activeTab === 'give' && (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              <Text style={styles.title}>Proposer un don</Text>
              <Text style={styles.subtitle}>Chaque portion compte. Partagez ce que vous ne consommerez pas.</Text>

              <View style={{ backgroundColor: `${COLORS.emerald}10`, padding: 12, borderRadius: 16, marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Clock color={COLORS.emerald} size={16} />
                <Text style={{ fontSize: 11, color: COLORS.emerald, fontWeight: 'bold', flex: 1 }}>
                  FRAÎCHEUR GARANTIE : Votre annonce sera visible pendant 24H maximum pour garantir la qualité des dons.
                </Text>
              </View>

              {showSuccess ? (
                <View style={styles.successBox}>
                  <View style={styles.successIcon}>
                    <Check color={COLORS.oat} size={32} />
                  </View>
                  <Text style={styles.successTitle}>Geste solidaire !</Text>
                  <Text style={styles.successDesc}>Votre don a été publié en ligne. La communauté vous remercie.</Text>
                </View>
              ) : (
                <View style={styles.form}>
                  <View style={styles.typeSelector}>
                    <TouchableOpacity
                      style={[styles.typeBox, newType === 'plat' && styles.typeBoxActiveTerracotta]}
                      onPress={() => setNewType('plat')}
                    >
                      <UtensilsCrossed color={newType === 'plat' ? COLORS.terracotta : `${COLORS.forest}40`} size={32} />
                      <Text style={[styles.typeText, newType === 'plat' && { color: COLORS.terracotta }]}>Plat cuisiné</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.typeBox, newType === 'surplus' && styles.typeBoxActiveSage]}
                      onPress={() => setNewType('surplus')}
                    >
                      <Leaf color={newType === 'surplus' ? COLORS.sage : `${COLORS.forest}40`} size={32} />
                      <Text style={[styles.typeText, newType === 'surplus' && { color: COLORS.sage }]}>Surplus / Ingrédient</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.label}>TITRE DU DON</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={newType === 'plat' ? 'Ex: Curry de légumes...' : 'Ex: 1kg de carottes...'}
                    placeholderTextColor={`${COLORS.forest}40`}
                    value={newTitle}
                    onChangeText={setNewTitle}
                  />

                  <View style={styles.labelRow}>
                    <Text style={styles.label}>INGRÉDIENTS (Recommandé)</Text>
                  </View>
                  <TextInput
                    style={styles.textArea}
                    placeholder="Ex: farine, oeufs, lait... (ou précisez les allergènes)"
                    placeholderTextColor={`${COLORS.forest}40`}
                    multiline
                    numberOfLines={4}
                    value={newDesc}
                    onChangeText={setNewDesc}
                  />

                  <TouchableOpacity 
                    style={[styles.halalToggle, isNewHalal && styles.halalToggleActive]} 
                    onPress={() => setIsNewHalal(!isNewHalal)}
                  >
                    <Text style={[styles.halalToggleText, isNewHalal && { color: COLORS.oat }]}>☪️ Certifié Halal</Text>
                    {isNewHalal && <Check color={COLORS.oat} size={16} />}
                  </TouchableOpacity>

                  {newType === 'plat' && (
                    <>
                      <Text style={styles.label}>PORTIONS</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Ex: 2"
                        keyboardType="numeric"
                        placeholderTextColor={`${COLORS.forest}40`}
                        value={newPortions}
                        onChangeText={setNewPortions}
                      />
                    </>
                  )}

                  <View style={styles.labelRow}>
                    <Text style={[styles.label, { marginTop: 24 }]}>ADRESSE DE RETRAIT</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="Votre adresse (pré-remplie)"
                      placeholderTextColor={`${COLORS.forest}40`}
                      value={newAddress}
                      onChangeText={setNewAddress}
                    />
                    <TouchableOpacity
                      onPress={handleUseMyLocationForAddress}
                      disabled={isLocatingAddress}
                      style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: `${COLORS.emerald}15`, justifyContent: 'center', alignItems: 'center' }}
                    >
                      {isLocatingAddress ? (
                        <ActivityIndicator color={COLORS.emerald} size="small" />
                      ) : (
                        <Navigation color={COLORS.emerald} size={18} />
                      )}
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.label, { marginTop: 24 }]}>DISPONIBLE JUSQU'À</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                    {[
                      { label: "Aujourd'hui", offset: 0 },
                      { label: 'Demain', offset: 1 },
                      { label: '+2 jours', offset: 2 },
                      { label: '+3 jours', offset: 3 },
                    ].map(({ label, offset }) => {
                      const target = new Date();
                      target.setDate(target.getDate() + offset);
                      const active = target.toDateString() === newExpiresAt.toDateString();
                      return (
                        <TouchableOpacity
                          key={offset}
                          onPress={() => setExpiryDayOffset(offset)}
                          style={[styles.halalToggle, { flex: 1, marginBottom: 0 }, active && styles.halalToggleActive]}
                        >
                          <Text style={[styles.halalToggleText, active && { color: COLORS.oat }]}>{label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => adjustExpiryHour(-1)}
                        style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: `${COLORS.forest}10`, justifyContent: 'center', alignItems: 'center' }}
                      >
                        <Text style={{ fontSize: 16, fontWeight: 'bold' }}>-</Text>
                      </TouchableOpacity>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.forest, width: 30, textAlign: 'center' }}>H</Text>
                      <TouchableOpacity
                        onPress={() => adjustExpiryHour(1)}
                        style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: `${COLORS.forest}10`, justifyContent: 'center', alignItems: 'center' }}
                      >
                        <Text style={{ fontSize: 16, fontWeight: 'bold' }}>+</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: COLORS.forest }}>{formatExpiryLabel(newExpiresAt)}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => adjustExpiryMinute(-15)}
                        style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: `${COLORS.forest}10`, justifyContent: 'center', alignItems: 'center' }}
                      >
                        <Text style={{ fontSize: 16, fontWeight: 'bold' }}>-</Text>
                      </TouchableOpacity>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.forest, width: 30, textAlign: 'center' }}>MIN</Text>
                      <TouchableOpacity
                        onPress={() => adjustExpiryMinute(15)}
                        style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: `${COLORS.forest}10`, justifyContent: 'center', alignItems: 'center' }}
                      >
                        <Text style={{ fontSize: 16, fontWeight: 'bold' }}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
                    {imageUri ? (
                      <Image source={{ uri: imageUri }} style={styles.uploadImagePreview} />
                    ) : (
                      <>
                        <Camera color={`${COLORS.forest}40`} size={32} />
                        <Text style={styles.uploadText}>Prendre une photo</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.submitBtn} onPress={handleAddDonation} disabled={isPublishing}>
                    {isPublishing ? <ActivityIndicator color={COLORS.oat} /> : <Text style={styles.submitBtnText}>Publier en ligne</Text>}
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        )}

        {activeTab === 'my_donations' && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.sectionHeader}>
              <Text style={styles.title}>Mes <Text style={styles.titleHighlight}>Donations</Text></Text>
              <Text style={styles.subtitle}>Gérez vos publications actives.</Text>
            </View>

            <View style={styles.myDonationsGrid}>
              {myDonations.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Info color={`${COLORS.forest}20`} size={48} />
                  <Text style={styles.emptyText}>Vous n'avez pas encore publié de don.</Text>
                </View>
              ) : (
                myDonations.map((item) => (
                  <View key={item.id} style={styles.manageCard}>
                    <Image source={{ uri: item.image || 'https://via.placeholder.com/150' }} style={styles.manageCardImage} />
                    <View style={styles.manageCardContent}>
                      <Text style={styles.manageCardTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.manageCardMeta}>{getTimeAgo(item.created_at)}</Text>
                      <View style={styles.manageCardActions}>
                        <TouchableOpacity style={styles.actionBtnSmall} onPress={() => openEditModal(item)}>
                          <Edit color={COLORS.forest} size={16} />
                          <Text style={styles.actionBtnTextSmall}>Modifier</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtnSmall, { backgroundColor: `${COLORS.terracotta}10` }]} onPress={() => handleDeleteDonation(item.id)}>
                          <Trash2 color={COLORS.terracotta} size={16} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        )}

        {activeTab === 'profile' && (
          activeSubPage === 'none' ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.profileHeaderPremium}>
              <View style={styles.avatarContainer}>
                <Image source={{ uri: profile?.avatar_url ? profile.avatar_url.replace(/ /g, '%20') : 'https://ui-avatars.com/api/?name=Anonyme' }} style={styles.profileAvatarLarge} />
                <View style={styles.editAvatarBadge}>
                  <Camera color={COLORS.oat} size={14} />
                </View>
              </View>
              <Text style={styles.profileNameLarge}>{profile.username}</Text>
              {showGrade && <Text style={{ color: COLORS.emerald, fontWeight: '900', fontSize: 10, marginTop: 4, textTransform: 'uppercase' }}>Héros Lvl. 5</Text>}
              <TouchableOpacity style={styles.locationBadge} onPress={() => setEditProfileVisible(true)}>
                <MapPin color={COLORS.forest} size={12} />
                <Text style={styles.locationBadgeText}>{profile.address || 'France'}</Text>
                <Edit color={`${COLORS.forest}40`} size={10} style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{myDonations.length}</Text>
                <Text style={styles.statLabel}>Dons</Text>
              </View>
              <View style={styles.dividerStat} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: COLORS.orange }]}>{karma}</Text>
                <Text style={styles.statLabel}>Karma</Text>
              </View>
              <View style={styles.dividerStat} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>12</Text>
                <Text style={styles.statLabel}>Sauvés</Text>
              </View>
            </View>

            <View style={styles.menuSection}>
              <Text style={styles.menuSectionTitle}>Paramètres</Text>
              
              <TouchableOpacity style={styles.menuItemPremium} onPress={() => setActiveSubPage('preferences')}>
                <View style={styles.menuIconBoxPremium}><Settings color={COLORS.forest} size={20} /></View>
                <Text style={styles.menuTextPremium}>Préférences</Text>
                <ChevronRight color={`${COLORS.forest}30`} size={20} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItemPremium} onPress={() => setActiveSubPage('help')}>
                <View style={styles.menuIconBoxPremium}><Info color={COLORS.forest} size={20} /></View>
                <Text style={styles.menuTextPremium}>Aide & Support</Text>
                <ChevronRight color={`${COLORS.forest}30`} size={20} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItemPremium} onPress={() => setActiveSubPage('blocked')}>
                <View style={[styles.menuIconBoxPremium, { backgroundColor: `${COLORS.terracotta}10` }]}><X color={COLORS.terracotta} size={20} /></View>
                <Text style={styles.menuTextPremium}>Utilisateurs bloqués</Text>
                <ChevronRight color={`${COLORS.forest}30`} size={20} />
              </TouchableOpacity>

              <TouchableOpacity style={[styles.menuItemPremium, { marginTop: 12 }]} onPress={onLogout}>
                <View style={[styles.menuIconBoxPremium, { backgroundColor: `${COLORS.terracotta}15` }]}><LogOut color={COLORS.terracotta} size={20} /></View>
                <Text style={[styles.menuTextPremium, { color: COLORS.terracotta }]}>Se déconnecter</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
          ) : activeSubPage === 'preferences' ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              <TouchableOpacity onPress={() => setActiveSubPage('none')} style={styles.backBtn}>
                <ArrowRight color={COLORS.forest} size={20} style={{ transform: [{ rotate: '180deg' }] }} />
                <Text style={styles.backBtnText}>Retour</Text>
              </TouchableOpacity>
              <Text style={styles.title}>Préférences</Text>
              <Text style={styles.subtitle}>Personnalisez votre expérience Assiette en +.</Text>

              <View style={styles.prefSection}>
                <Text style={styles.prefSectionTitle}>NOTIFICATIONS</Text>
                <TouchableOpacity style={styles.prefItem} onPress={() => setNotifDons(!notifDons)}>
                  <Text style={styles.prefItemText}>Nouveaux dons à proximité</Text>
                  <View style={notifDons ? styles.toggleOn : styles.toggleOff} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.prefItem} onPress={() => setNotifMsgs(!notifMsgs)}>
                  <Text style={styles.prefItemText}>Messages des donateurs</Text>
                  <View style={notifMsgs ? styles.toggleOn : styles.toggleOff} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.prefItem} onPress={() => setNotifMissions(!notifMissions)}>
                  <Text style={styles.prefItemText}>Missions Sauvetage</Text>
                  <View style={notifMissions ? styles.toggleOn : styles.toggleOff} />
                </TouchableOpacity>
              </View>

              <View style={[styles.prefSection, { marginTop: 24 }]}>
                <Text style={styles.prefSectionTitle}>CONFIDENTIALITÉ</Text>
                <TouchableOpacity style={styles.prefItem} onPress={() => setShowGrade(!showGrade)}>
                  <Text style={styles.prefItemText}>Afficher mon grade (Héros)</Text>
                  <View style={showGrade ? styles.toggleOn : styles.toggleOff} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.prefItem} onPress={() => setShareExactLocation(!shareExactLocation)}>
                  <Text style={styles.prefItemText}>Partager ma position précise</Text>
                  <View style={shareExactLocation ? styles.toggleOn : styles.toggleOff} />
                </TouchableOpacity>
              </View>

              <View style={[styles.prefSection, { marginTop: 24 }]}>
                <Text style={styles.prefSectionTitle}>APPLICATION</Text>
                <TouchableOpacity style={styles.prefItem}>
                  <Text style={styles.prefItemText}>Langue</Text>
                  <Text style={styles.prefValueText}>Français (FR)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.prefItem}>
                  <Text style={styles.prefItemText}>Mode Sombre</Text>
                  <Text style={styles.prefValueText}>Désactivé</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : activeSubPage === 'help' ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              <TouchableOpacity onPress={() => setActiveSubPage('none')} style={styles.backBtn}>
                <ArrowRight color={COLORS.forest} size={20} style={{ transform: [{ rotate: '180deg' }] }} />
                <Text style={styles.backBtnText}>Retour</Text>
              </TouchableOpacity>
              <Text style={styles.title}>Aide & Support</Text>
              <Text style={styles.subtitle}>Besoin d'un coup de main ? Nous sommes là.</Text>

              <View style={styles.faqList}>
                <TouchableOpacity style={styles.faqItem}>
                  <Text style={styles.faqQuestion}>Comment gagner plus de Karma ?</Text>
                  <ChevronRight color={`${COLORS.forest}30`} size={16} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.faqItem}>
                  <Text style={styles.faqQuestion}>Mes données sont-elles sécurisées ?</Text>
                  <ChevronRight color={`${COLORS.forest}30`} size={16} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.faqItem}>
                  <Text style={styles.faqQuestion}>Un problème lors d'un retrait ?</Text>
                  <ChevronRight color={`${COLORS.forest}30`} size={16} />
                </TouchableOpacity>
              </View>

              <View style={styles.contactCard}>
                <View style={styles.contactIconBox}>
                  <Heart color={COLORS.rose} size={24} fill={COLORS.rose} />
                </View>
                <Text style={styles.contactTitle}>Contacter l'équipe</Text>
                <Text style={styles.contactDesc}>Une question ou une suggestion ? Notre équipe de héros vous répond en moins de 24h.</Text>
                <TouchableOpacity 
                  style={styles.contactBtn} 
                  onPress={() => Linking.openURL('mailto:maakni95130@gmail.com?subject=Aide Assiette en +')}
                >
                  <Text style={styles.contactBtnText}>Envoyer un message</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.versionText}>Version 1.0.2 Premium Edition</Text>
            </ScrollView>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              <TouchableOpacity onPress={() => setActiveSubPage('none')} style={styles.backBtn}>
                <ArrowRight color={COLORS.forest} size={20} style={{ transform: [{ rotate: '180deg' }] }} />
                <Text style={styles.backBtnText}>Retour</Text>
              </TouchableOpacity>
              <Text style={styles.title}>Blocages</Text>
              <Text style={styles.subtitle}>Gérez les comptes que vous avez bloqués.</Text>

              <View style={[styles.searchBox, { height: 48, marginBottom: 24 }]}>
                <Search color={COLORS.forest} size={16} opacity={0.5} />
                <TextInput
                  style={[styles.searchInput, { fontSize: 14 }]}
                  placeholder="Rechercher un utilisateur..."
                  value={blockSearch}
                  onChangeText={setBlockSearch}
                />
              </View>

              {blockedUsers.length === 0 ? (
                <View style={{ alignItems: 'center', marginTop: 40, opacity: 0.3 }}>
                  <Check color={COLORS.forest} size={48} />
                  <Text style={{ marginTop: 12, fontWeight: 'bold' }}>Aucun utilisateur bloqué</Text>
                </View>
              ) : (
                blockedUsers.map((userId) => (
                  <View key={userId} style={styles.menuItemPremium}>
                    <View style={styles.menuIconBoxPremium}><UserIcon color={COLORS.forest} size={20} /></View>
                    <Text style={styles.menuTextPremium}>ID: {userId.substring(0, 8)}...</Text>
                    <TouchableOpacity 
                      onPress={() => handleUnblockUser(userId)}
                      style={{ backgroundColor: `${COLORS.emerald}15`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}
                    >
                      <Text style={{ color: COLORS.emerald, fontWeight: 'bold', fontSize: 11 }}>DÉBLOQUER</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          )
        )}
      </View>

      {/* EDIT MODAL */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentLarge}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifier l'annonce</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <X color={COLORS.forest} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>TITRE DE L'ANNONCE</Text>
              <TextInput
                style={styles.input}
                value={newTitle}
                onChangeText={setNewTitle}
              />

              <Text style={[styles.label, { marginTop: 24 }]}>DESCRIPTION</Text>
              <TextInput
                style={styles.textArea}
                multiline
                value={newDesc}
                onChangeText={setNewDesc}
              />

              <Text style={[styles.label, { marginTop: 24 }]}>TYPE</Text>
              <View style={styles.typeRow}>
                {['plat', 'surplus'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeBtn, newType === t && styles.typeBtnActive]}
                    onPress={() => setNewType(t)}
                  >
                    <Text style={[styles.typeBtnText, newType === t && styles.typeBtnTextActive]}>{t.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity 
                style={[styles.halalToggle, isNewHalal && { backgroundColor: `${COLORS.sage}20`, borderColor: COLORS.sage }]} 
                onPress={() => setIsNewHalal(!isNewHalal)}
              >
                <Text style={[styles.halalToggleText, isNewHalal && { color: COLORS.sage }]}>☪️ CERTIFIÉ HALAL</Text>
                {isNewHalal && <Check color={COLORS.sage} size={16} />}
              </TouchableOpacity>

              <Text style={[styles.label, { marginTop: 24 }]}>ADRESSE DE RETRAIT</Text>
              <TextInput
                style={styles.input}
                value={newAddress}
                onChangeText={setNewAddress}
              />

              <TouchableOpacity style={[styles.submitBtn, { marginTop: 40 }]} onPress={handleUpdateDonation} disabled={isPublishing}>
                {isPublishing ? <ActivityIndicator color={COLORS.oat} /> : <Text style={styles.submitBtnText}>Enregistrer les modifications</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* DONATION DETAILS MODAL */}
      <Modal visible={detailsModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentLarge}>
            <TouchableOpacity onPress={() => setDetailsModalVisible(false)} style={styles.modalCloseBtn}>
              <X color={COLORS.forest} size={24} />
            </TouchableOpacity>

            {viewingDonation && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Image source={{ uri: viewingDonation.image }} style={{ width: '100%', height: 250, borderRadius: 24, marginBottom: 24 }} />
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 24, fontWeight: '900', color: COLORS.forest, flex: 1 }}>{viewingDonation.title}</Text>
                  <View style={{ backgroundColor: `${COLORS.emerald}15`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
                    <Text style={{ color: COLORS.emerald, fontWeight: 'bold', fontSize: 12 }}>{viewingDonation.portions} PORTIONS</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 12, marginVertical: 16 }}>
                   <View style={{ backgroundColor: `${COLORS.terracotta}10`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Clock color={COLORS.terracotta} size={14} />
                      <Text style={{ color: COLORS.terracotta, fontWeight: 'bold', fontSize: 11 }}>IRESTE : {getTimeRemaining(viewingDonation.expires_at)}</Text>
                   </View>
                   <View style={{ backgroundColor: `${COLORS.forest}05`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <MapPin color={COLORS.forest} size={14} />
                      <Text style={{ color: COLORS.forest, fontWeight: 'bold', fontSize: 11 }}>{getDonationDistanceLabel(viewingDonation)}</Text>
                   </View>
                </View>

                <Text style={{ fontSize: 16, color: `${COLORS.forest}80`, lineHeight: 24, marginBottom: 32 }}>
                  {viewingDonation.description}
                </Text>

                <View style={{ backgroundColor: `${COLORS.sand}40`, padding: 20, borderRadius: 24, marginBottom: 32 }}>
                   <Text style={{ fontWeight: 'bold', color: COLORS.forest, marginBottom: 12 }}>INFOS COMPLÉMENTAIRES</Text>
                   <View style={{ gap: 8 }}>
                      <Text style={{ fontSize: 13, color: `${COLORS.forest}60` }}>📍 Adresse : {viewingDonation.address || 'Près de chez vous'}</Text>
                      <Text style={{ fontSize: 13, color: `${COLORS.forest}60` }}>⏳ Publié : {getTimeAgo(viewingDonation.created_at)}</Text>
                      <Text style={{ fontSize: 13, color: `${COLORS.forest}60` }}>🍎 Type : {viewingDonation.type === 'plat' ? 'Plat cuisiné maison' : 'Surplus alimentaire'}</Text>
                   </View>
                </View>

                <TouchableOpacity 
                  style={[styles.submitBtn, { marginBottom: 40 }]} 
                  onPress={() => {
                    setDetailsModalVisible(false);
                    openRequestModal(viewingDonation);
                  }}
                >
                  <Text style={styles.submitBtnText}>Contacter le donateur</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* USER INFO MODAL */}
      <Modal visible={userInfoModalVisible} animationType="fade" transparent>
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setUserInfoModalVisible(false)}
        >
          <View style={[styles.modalContent, { paddingBottom: 32 }]}>
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <Image 
                source={{ uri: (activeChat?.requester_id === session.user.id ? activeChat?.owner?.avatar_url : activeChat?.requester?.avatar_url) || 'https://ui-avatars.com/api/?name=Anonyme' }} 
                style={{ width: 80, height: 80, borderRadius: 40, marginBottom: 12 }} 
              />
              <Text style={{ fontSize: 20, fontWeight: '900', color: COLORS.forest }}>
                {activeChat?.requester_id === session.user.id ? activeChat?.owner?.username : activeChat?.requester?.username}
              </Text>
            </View>

            <View style={{ backgroundColor: `${COLORS.sand}50`, padding: 16, borderRadius: 20, marginBottom: 32 }}>
               <Text style={{ textAlign: 'center', fontSize: 12, fontWeight: 'bold', color: `${COLORS.forest}60`, marginBottom: 8 }}>VOS ÉCHANGES</Text>
               <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 24 }}>
                 <View style={{ alignItems: 'center' }}>
                   <Text style={{ fontSize: 18, fontWeight: '900', color: COLORS.emerald }}>{targetUserStats.received}</Text>
                   <Text style={{ fontSize: 10, color: `${COLORS.forest}40` }}>Reçus</Text>
                 </View>
                 <View style={{ width: 1, height: 30, backgroundColor: `${COLORS.forest}10` }} />
                 <View style={{ alignItems: 'center' }}>
                   <Text style={{ fontSize: 18, fontWeight: '900', color: COLORS.orange }}>{targetUserStats.given}</Text>
                   <Text style={{ fontSize: 10, color: `${COLORS.forest}40` }}>Donnés</Text>
                 </View>
               </View>
            </View>

            <TouchableOpacity 
              style={[styles.menuItemPremium, { borderBottomWidth: 0, backgroundColor: `${COLORS.terracotta}05` }]}
              onPress={() => handleBlockUser(activeChat?.requester_id === session.user.id ? activeChat?.owner_id : activeChat?.requester_id)}
            >
              <View style={[styles.menuIconBoxPremium, { backgroundColor: `${COLORS.terracotta}10` }]}><X color={COLORS.terracotta} size={20} /></View>
              <Text style={[styles.menuTextPremium, { color: COLORS.terracotta }]}>Bloquer ce compte</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuItemPremium, { borderBottomWidth: 0, marginTop: 8 }]}
              onPress={() => handleDeleteConversation(activeChat?.id)}
            >
              <View style={[styles.menuIconBoxPremium, { backgroundColor: `${COLORS.forest}05` }]}><Trash2 color={COLORS.forest} size={20} /></View>
              <Text style={styles.menuTextPremium}>Supprimer la conversation</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* EDIT PROFILE MODAL */}
      <Modal visible={editProfileVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifier mon profil</Text>
              <TouchableOpacity onPress={() => setEditProfileVisible(false)}>
                <X color={COLORS.forest} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>VOTRE NOM / PSEUDO</Text>
              <TextInput
                style={styles.input}
                value={editedUsername}
                onChangeText={setEditedUsername}
              />

              <Text style={[styles.label, { marginTop: 24 }]}>ADRESSE PAR DÉFAUT</Text>
              <TextInput
                style={styles.input}
                value={editedAddress}
                onChangeText={setEditedAddress}
              />

              <TouchableOpacity style={[styles.submitBtn, { marginTop: 40 }]} onPress={handleUpdateProfile} disabled={isPublishing}>
                {isPublishing ? <ActivityIndicator color={COLORS.oat} /> : <Text style={styles.submitBtnText}>Enregistrer les modifications</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* BOTTOM NAV */}
      {!activeChat && (
        <View style={styles.navContainer}>
          <View style={styles.navBar}>
            <TouchableOpacity style={styles.navItem} onPress={() => { setActiveTab('explore'); setActiveChat(null); setActiveSubPage('none'); }}>
              <Home color={COLORS.oat} size={24} opacity={activeTab === 'explore' ? 1 : 0.5} />
              <Text style={[styles.navText, { opacity: activeTab === 'explore' ? 1 : 0.5 }]}>Explorer</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navPlusWrapper} onPress={() => setActiveTab('give')}>
              <View style={styles.navPlus}>
                <Plus color={COLORS.oat} size={28} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.navItem} 
              onPress={() => { 
                setActiveTab('messages'); 
                setActiveChat(null); 
                setActiveSubPage('none'); 
                setHasNewNotification(false);
              }}
            >
              <Animated.View style={{ opacity: hasNewNotification ? blinkAnim : 1 }}>
                <MessageCircle color={COLORS.oat} size={24} opacity={activeTab === 'messages' ? 1 : 0.5} />
              </Animated.View>
              <Text style={[styles.navText, { opacity: activeTab === 'messages' ? 1 : 0.5 }]}>Messages</Text>
              {hasNewNotification && <View style={styles.notifDot} />}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.oat,
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoBig: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.forest,
    textAlign: 'center',
    marginBottom: 8,
  },
  logoBigImage: {
    width: 180,
    height: 80,
    alignSelf: 'center',
    marginBottom: 8,
  },
  container: {
    flex: 1,
  },
  toast: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: 'rgba(27, 60, 53, 0.95)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 100,
  },
  toastText: {
    color: COLORS.oat,
    marginLeft: 8,
    fontWeight: '600',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 10,
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.forest,
  },
  logoImage: {
    width: 100,
    height: 40,
  },
  avatarMini: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
    paddingTop: 10,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.forest,
    lineHeight: 40,
  },
  titleHighlight: {
    color: COLORS.terracotta,
    fontStyle: 'italic',
  },
  subtitle: {
    fontSize: 14,
    color: `${COLORS.forest}80`,
    marginTop: 8,
    marginBottom: 24,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.oat,
    borderWidth: 1,
    borderColor: COLORS.sand,
    borderRadius: 30,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.forest,
  },
  filterScroll: {
    marginBottom: 24,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.sand,
    marginRight: 12,
  },
  filterBtnActive: {
    backgroundColor: COLORS.forest,
    borderColor: COLORS.forest,
  },
  filterBtnActiveTerracotta: {
    backgroundColor: COLORS.terracotta,
    borderColor: COLORS.terracotta,
  },
  filterBtnActiveSage: {
    backgroundColor: COLORS.sage,
    borderColor: COLORS.sage,
  },
  filterText: {
    fontSize: 14,
    color: COLORS.forest,
    fontWeight: '600',
  },
  filterTextActive: {
    color: COLORS.oat,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(27, 60, 53, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.oat,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 32,
    minHeight: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalCloseBtn: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  closeModalBtn: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 14,
    color: `${COLORS.forest}80`,
    fontWeight: '600',
  },
  modalDonationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.forest,
    marginTop: 4,
  },
  modalDonationMeta: {
    fontSize: 14,
    color: `${COLORS.forest}80`,
    marginTop: 8,
    marginBottom: 16,
    fontWeight: 'bold',
  },
  convCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: `${COLORS.sand}20`,
    borderRadius: 20,
    marginBottom: 12,
  },
  convAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 16,
  },
  convInfo: {
    flex: 1,
  },
  convName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.forest,
  },
  convDonation: {
    fontSize: 13,
    color: `${COLORS.forest}80`,
    marginTop: 4,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.sand,
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.forest,
  },
  chatScroll: {
    padding: 24,
    paddingBottom: 40,
  },
  msgBubble: {
    maxWidth: '80%',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
  },
  msgBubbleMe: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.forest,
    borderBottomRightRadius: 4,
  },
  msgBubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: `${COLORS.sand}40`,
    borderBottomLeftRadius: 4,
  },
  msgText: {
    fontSize: 15,
  },
  msgTextMe: {
    color: COLORS.oat,
  },
  msgTextOther: {
    color: COLORS.forest,
  },
  chatInputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.sand,
    alignItems: 'center',
    marginBottom: 20,
  },
  chatInput: {
    flex: 1,
    backgroundColor: `${COLORS.sand}20`,
    borderRadius: 20,
    paddingHorizontal: 20,
    height: 48,
    fontSize: 15,
    color: COLORS.forest,
  },
  chatSendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    color: COLORS.oat,
    fontSize: 11,
    fontWeight: 'bold',
  },
  chatActionBox: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.sand,
    justifyContent: 'center',
    gap: 16,
  },
  chatActionBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  chatActionBtnText: {
    color: COLORS.oat,
    fontWeight: 'bold',
    fontSize: 14,
  },
  list: {
    gap: 24,
  },
  emptyText: {
    textAlign: 'center',
    color: `${COLORS.forest}60`,
    marginTop: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  card: {
    marginBottom: 10,
  },
  cardImageContainer: {
    width: '100%',
    height: 250,
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 16,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(246, 244, 237, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  cardContent: {
    paddingHorizontal: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.forest,
    flex: 1,
  },
  portionBadge: {
    borderWidth: 1,
    borderColor: COLORS.sand,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  portionText: {
    fontSize: 12,
    color: `${COLORS.forest}80`,
    fontWeight: '600',
  },
  cardDesc: {
    fontSize: 14,
    color: `${COLORS.forest}90`,
    lineHeight: 20,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.forest,
  },
  userMeta: {
    fontSize: 11,
    color: `${COLORS.forest}60`,
    marginTop: 2,
    fontWeight: 'bold',
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    marginTop: 10,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  typeBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.sand,
  },
  typeBtnActive: {
    backgroundColor: COLORS.forest,
    borderColor: COLORS.forest,
  },
  typeBtnText: {
    color: COLORS.forest,
    fontSize: 12,
    fontWeight: '800',
  },
  typeBtnTextActive: {
    color: COLORS.oat,
  },
  typeBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.sand,
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBoxActiveTerracotta: {
    borderColor: COLORS.terracotta,
    backgroundColor: `${COLORS.terracotta}10`,
  },
  typeBoxActiveSage: {
    borderColor: COLORS.sage,
    backgroundColor: `${COLORS.sage}10`,
  },
  halalToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${COLORS.forest}20`,
    marginBottom: 20,
  },
  halalToggleActive: {
    backgroundColor: COLORS.terracotta,
    borderColor: COLORS.terracotta,
  },
  halalToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.forest,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
    color: `${COLORS.forest}80`,
    marginTop: 12,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
    marginTop: 16,
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    color: `${COLORS.forest}60`,
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.sand,
    fontSize: 18,
    color: COLORS.forest,
    paddingVertical: 12,
  },
  textArea: {
    borderWidth: 1,
    borderColor: COLORS.sand,
    borderRadius: 20,
    padding: 16,
    fontSize: 15,
    color: COLORS.forest,
    height: 120,
    textAlignVertical: 'top',
  },
  uploadBox: {
    borderWidth: 1,
    borderColor: COLORS.sand,
    borderStyle: 'dashed',
    borderRadius: 30,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    overflow: 'hidden',
  },
  uploadImagePreview: {
    width: '100%',
    height: '100%',
  },
  uploadText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.forest,
    marginTop: 12,
  },
  submitBtn: {
    backgroundColor: COLORS.forest,
    borderRadius: 30,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  submitBtnText: {
    color: COLORS.oat,
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: COLORS.terracotta,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
  successBox: {
    backgroundColor: `${COLORS.sage}10`,
    borderColor: `${COLORS.sage}30`,
    borderWidth: 1,
    borderRadius: 30,
    padding: 32,
    alignItems: 'center',
    marginTop: 40,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.sage,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.forest,
    marginBottom: 8,
  },
  successDesc: {
    fontSize: 14,
    color: `${COLORS.forest}80`,
    textAlign: 'center',
  },
  // --- MY DONATIONS GRID ---
  myDonationsGrid: {
    gap: 16,
    marginTop: 10,
  },
  manageCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.oat,
    borderRadius: 24,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.sand,
    alignItems: 'center',
    shadowColor: COLORS.forest,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  notifDot: {
    position: 'absolute',
    top: 0,
    right: 25,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.terracotta,
    borderWidth: 2,
    borderColor: COLORS.forest,
  },
  manageCardImage: {
    width: 80,
    height: 80,
    borderRadius: 18,
  },
  manageCardContent: {
    flex: 1,
    marginLeft: 16,
  },
  manageCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.forest,
  },
  manageCardMeta: {
    fontSize: 12,
    color: `${COLORS.forest}50`,
    marginTop: 4,
  },
  manageCardActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 10,
  },
  actionBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.forest}10`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  actionBtnTextSmall: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.forest,
  },

  // --- PREMIUM PROFILE ---
  profileHeaderPremium: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileAvatarLarge: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: COLORS.forest,
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.terracotta,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.oat,
  },
  profileNameLarge: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.forest,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginTop: 8,
    gap: 4,
  },
  locationBadgeText: {
    fontSize: 12,
    color: COLORS.forest,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.forest,
    borderRadius: 24,
    paddingVertical: 20,
    marginTop: 32,
    marginHorizontal: 4,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.oat,
  },
  statLabel: {
    fontSize: 11,
    color: `${COLORS.oat}70`,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dividerStat: {
    width: 1,
    height: 30,
    backgroundColor: `${COLORS.oat}20`,
  },
  menuSection: {
    marginTop: 40,
  },
  menuSectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: `${COLORS.forest}40`,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 16,
    marginLeft: 8,
  },
  menuItemPremium: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.oat,
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.sand,
  },
  menuIconBoxPremium: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: `${COLORS.forest}08`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuTextPremium: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.forest,
  },

  // --- MODAL LARGE ---
  modalContentLarge: {
    backgroundColor: COLORS.oat,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    padding: 32,
    paddingTop: 20,
    maxHeight: '90%',
  },
  navContainer: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  navBar: {
    backgroundColor: COLORS.forest,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    height: 64,
    borderRadius: 32,
    width: '100%',
    shadowColor: COLORS.forest,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    color: COLORS.oat,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  navPlusWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  navPlus: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarUploadBox: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${COLORS.forest}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarUploadPreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
  },
  avatarText: {
    color: COLORS.forest,
    fontSize: 14,
    fontWeight: '600',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  backBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.forest,
  },
  prefSection: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 20,
  },
  prefSectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: `${COLORS.forest}30`,
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  prefItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: `${COLORS.sand}50`,
  },
  prefItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.forest,
  },
  prefValueText: {
    fontSize: 14,
    color: COLORS.emerald,
    fontWeight: '900',
  },
  toggleOn: {
    width: 40,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.emerald,
    borderWidth: 2,
    borderColor: COLORS.emerald,
    alignItems: 'flex-end',
    padding: 2,
  },
  toggleOff: {
    width: 40,
    height: 22,
    borderRadius: 11,
    backgroundColor: `${COLORS.forest}10`,
    borderWidth: 2,
    borderColor: `${COLORS.forest}10`,
    alignItems: 'flex-start',
    padding: 2,
  },
  faqList: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  faqItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: `${COLORS.sand}50`,
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.forest,
    flex: 1,
  },
  contactCard: {
    backgroundColor: `${COLORS.rose}10`,
    borderRadius: 30,
    padding: 24,
    marginTop: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${COLORS.rose}20`,
  },
  contactIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.forest,
    marginBottom: 8,
  },
  contactDesc: {
    fontSize: 13,
    color: `${COLORS.forest}60`,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  contactBtn: {
    backgroundColor: COLORS.rose,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  contactBtnText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: `${COLORS.forest}20`,
    marginTop: 32,
    fontWeight: '700',
  }
});
