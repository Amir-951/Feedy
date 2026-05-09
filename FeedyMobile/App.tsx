import 'react-native-url-polyfill/auto';
import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
  LogBox,
  Modal,
} from 'react-native';
import { Home, Search, Plus, User as UserIcon, LogOut, MapPin, Sparkles, X, Heart, MessageCircle, ChevronRight, Send, Camera, Info, Check, Clock, UtensilsCrossed, Leaf, List, Trash2, Edit, Settings } from 'lucide-react-native';
import * as ImagePicker from 'react-native-image-picker';
import { launchImageLibrary } from 'react-native-image-picker';
import { decode } from 'base64-arraybuffer';
import Geolocation from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, Session } from '@supabase/supabase-js';

// @ts-ignore
import { GEMINI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

LogBox.ignoreLogs(['AuthApiError: Invalid Refresh Token: Refresh Token Not Found']);


// --- SUPABASE CLIENT ---
const supabaseUrl = SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = SUPABASE_ANON_KEY || 'placeholder';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// --- THEME ---
const COLORS = {
  oat: '#F6F4ED',
  forest: '#1B3C35',
  terracotta: '#D46A55',
  sage: '#8F9B82',
  sand: '#E8E4D9',
  white: '#FFFFFF',
};

// --- GEMINI HELPER ---
const callGemini = async (prompt: string) => {
  if (!GEMINI_API_KEY) return "API Key manquante.";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const payload = { contents: [{ parts: [{ text: prompt }] }] };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Erreur.';
  } catch (err) {
    return "Impossible de joindre l'IA.";
  }
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
    setLoadingProfile(true);
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) {
      setProfile(data);
    } else {
      setProfile(null);
    }
    setInitializing(false);
    setLoadingProfile(false);
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
        <Text style={styles.logoBig}>Feedy.</Text>
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
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8, includeBase64: true });
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
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  // Form States
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('plat');
  const [newDesc, setNewDesc] = useState('');
  const [newPortions, setNewPortions] = useState('');
  const [newAddress, setNewAddress] = useState(profile.address); // Pre-fill with profile address
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // AI States
  const [isEnhancingDesc, setIsEnhancingDesc] = useState(false);
  const [recipeLoadingId, setRecipeLoadingId] = useState<string | null>(null);
  const [generatedRecipes, setGeneratedRecipes] = useState<{ [key: string]: string }>({});
  
  // Advanced Filter States
  const [isHalalFilter, setIsHalalFilter] = useState(false);
  const [sortBy, setSortBy] = useState<'time' | 'distance'>('time');
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
  const [editingDonation, setEditingDonation] = useState<any>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const fetchDonations = async () => {
    const { data, error } = await supabase
      .from('donations')
      .select(`
        *,
        profiles:user_id (username, avatar_url)
      `)
      .order('created_at', { ascending: false });
      
    if (data) {
      setDonations(data);
    }
  };

  useEffect(() => {
    fetchDonations();

    // Supabase Realtime Subscription
    const subscription = supabase
      .channel('donations_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'donations' }, fetchDonations)
      .subscribe();

    // Fetch user location
    Geolocation.requestAuthorization();
    Geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => console.log('Location error:', error.message),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }
    );

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchConversations = async () => {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        donations:donation_id(title, image),
        requester:requester_id(username, avatar_url),
        owner:owner_id(username, avatar_url)
      `)
      .or(`requester_id.eq.${session.user.id},owner_id.eq.${session.user.id}`)
      .order('created_at', { ascending: false });

    if (data) setConversations(data);
  };

  const loadChat = async (conversation: any) => {
    setActiveChat(conversation);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true });
    
    if (data) setChatMessages(data);
  };

  useEffect(() => {
    if (activeTab === 'messages') {
      fetchConversations();
    }
  }, [activeTab]);

  const openRequestModal = (item: any) => {
    setSelectedDonation(item);
    setRequestMsg('Bonjour, je peux venir récupérer dans 10 min');
    setRequestModalVisible(true);
  };

  const handleSendRequest = async () => {
    if (!requestMsg.trim() || !selectedDonation) return;
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
      console.log(e);
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
      }
    } catch(e) {}
  };

  const handleUpdateStatus = async (status: string) => {
    if (!activeChat) return;
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ status })
        .eq('id', activeChat.id);
      if (!error) {
        setActiveChat({ ...activeChat, status });
        fetchConversations();
        showToast(status === 'accepted' ? 'Demande acceptée !' : 'Demande refusée');
      }
    } catch(e) {}
  };

  const filteredDonations = donations.filter((item) => {
    const matchFilter = filter === 'all' || item.type === filter;
    const matchHalal = !isHalalFilter || item.is_halal;
    const matchSearch =
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchFilter && matchHalal && matchSearch;
  }).sort((a, b) => {
    if (sortBy === 'distance' && userLocation) {
      const distA = a.latitude && a.longitude ? calculateDistanceRaw(userLocation.lat, userLocation.lng, a.latitude, a.longitude) : 9999;
      const distB = b.latitude && b.longitude ? calculateDistanceRaw(userLocation.lat, userLocation.lng, b.latitude, b.longitude) : 9999;
      return distA - distB;
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

  const getMockDistance = (id: string) => {
    const num = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const distances = ['300m', '800m', '1.2km', '2.5km', '500m', '4.1km', '150m'];
    return distances[num % distances.length];
  };

  const calculateDistanceRaw = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const d = calculateDistanceRaw(lat1, lon1, lat2, lon2);
    return d < 1 ? `${Math.round(d * 1000)}m` : `${d.toFixed(1)}km`;
  };

  const getRealOrMockDistance = (item: any) => {
    if (userLocation && item.latitude && item.longitude) {
      return calculateDistance(userLocation.lat, userLocation.lng, item.latitude, item.longitude);
    }
    return getMockDistance(item.id);
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const refreshLocation = () => {
    showToast('Mise à jour de votre position...');
    Geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        showToast('Position mise à jour !');
        fetchDonations();
      },
      (error) => showToast('Erreur GPS'),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
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
      }
    } catch(e) {}
  };

  const openEditModal = (item: any) => {
    setEditingDonation(item);
    setNewTitle(item.title);
    setNewDesc(item.description);
    setNewType(item.type);
    setNewPortions(item.portions);
    setIsNewHalal(item.is_halal);
    setNewAddress(item.address);
    setEditModalVisible(true);
  };

  const handleUpdateDonation = async () => {
    if (!editingDonation) return;
    setIsPublishing(true);
    try {
      const { error } = await supabase
        .from('donations')
        .update({
          title: newTitle,
          description: newDesc,
          type: newType,
          portions: newPortions,
          is_halal: isNewHalal,
          address: newAddress,
        })
        .eq('id', editingDonation.id);
      
      if (!error) {
        showToast('Donation mise à jour !');
        setEditModalVisible(false);
        fetchDonations();
        // Clear states
        setNewTitle('');
        setNewDesc('');
        setNewPortions('');
        setEditingDonation(null);
      } else {
        showToast('Erreur lors de la mise à jour');
      }
    } catch (e) {
      showToast('Erreur de connexion');
    } finally {
      setIsPublishing(false);
    }
  };

  const pickImage = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8, includeBase64: true });
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

  const handleAddDonation = async () => {
    if (!newTitle.trim() || !newDesc.trim() || !newAddress.trim()) {
      showToast('Titre, description et adresse requis');
      return;
    }
    
    setIsPublishing(true);

    try {
      let imageUrl = null;
      if (imageBase64) {
        imageUrl = await uploadImage(imageBase64);
      }

      const { error } = await supabase.from('donations').insert({
        title: newTitle,
        type: newType,
        description: newDesc,
        portions: newPortions || 'N/A',
        distance: newAddress,
        image: imageUrl || 'https://images.unsplash.com/photo-1498837167922-41cfa6f31027?ixlib=rb-4.0.3&w=800&q=80',
        user_id: session.user.id,
        latitude: userLocation?.lat,
        longitude: userLocation?.lng,
        is_halal: isNewHalal,
      });

      if (error) throw error;

      setShowSuccess(true);
      setNewTitle('');
      setNewType('plat');
      setNewDesc('');
      setNewPortions('');
      setNewAddress(profile.address); // Reset to default
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
      console.log(e);
    }
    setIsPublishing(false);
  };

  const handleEnhanceDescription = async () => {
    if (!newTitle.trim()) {
      showToast("Veuillez d'abord entrer un titre !");
      return;
    }
    setIsEnhancingDesc(true);
    const typeText = newType === 'plat' ? 'un plat cuisiné' : 'un ingrédient/surplus';
    const prompt = `Tu es un assistant pour une application solidaire de don de nourriture. Rédige une description courte, chaleureuse et engageante (2 à 3 phrases maximum) pour le don suivant : "${newTitle}". Précise que c'est ${typeText}. N'oublie pas d'inviter poliment la personne à ramener ses propres contenants si nécessaire. Ne mets pas de guillemets.`;

    const generatedText = await callGemini(prompt);
    setNewDesc(generatedText.trim());
    setIsEnhancingDesc(false);
  };

  const handleGenerateRecipe = async (item: any) => {
    setRecipeLoadingId(item.id);
    const prompt = `En tant que chef expert en cuisine anti-gaspillage, propose UNE idée de recette simple, rapide et gourmande (maximum 4 phrases claires) que l'on peut préparer en utilisant principalement cet ingrédient à sauver : "${item.title}". Utilise un ton enthousiaste et termine par un petit conseil anti-gaspi.`;

    const recipeText = await callGemini(prompt);
    setGeneratedRecipes((prev) => ({ ...prev, [item.id]: recipeText }));
    setRecipeLoadingId(null);
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
                <Text style={styles.modalDonationMeta}>📍 {getMockDistance(selectedDonation.id)} • {getTimeAgo(selectedDonation.created_at)} • {selectedDonation.portions !== 'N/A' ? `${selectedDonation.portions} pers.` : selectedDonation.type}</Text>

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
          <Text style={styles.logo}>Feedy.</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={() => setActiveTab('my_donations')}>
              <List color={COLORS.forest} size={24} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveTab('profile')}>
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
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.title}>
              Partagez plus, {'\n'}
              <Text style={styles.titleHighlight}>gaspillez moins.</Text>
            </Text>
            <Text style={styles.subtitle}>Découvrez les dons autour de vous aujourd'hui.</Text>

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
                        {item.portions !== 'N/A' && (
                          <View style={styles.portionBadge}>
                            <Text style={styles.portionText}>{item.portions} pers.</Text>
                          </View>
                        )}
                      </View>
                      
                      <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>

                      {item.type === 'surplus' && !generatedRecipes[item.id] && (
                        <TouchableOpacity
                          style={styles.aiButton}
                          onPress={() => handleGenerateRecipe(item)}
                          disabled={recipeLoadingId === item.id}
                        >
                          {recipeLoadingId === item.id ? (
                            <ActivityIndicator color={COLORS.sage} size="small" />
                          ) : (
                            <>
                              <Sparkles color={COLORS.sage} size={16} />
                              <Text style={styles.aiButtonText}>Que cuisiner avec ça ?</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}

                      {generatedRecipes[item.id] && (
                        <View style={styles.recipeBox}>
                          <TouchableOpacity 
                            style={styles.recipeClose}
                            onPress={() => setGeneratedRecipes(prev => { const next = {...prev}; delete next[item.id]; return next; })}
                          >
                            <X color={COLORS.forest} size={16} opacity={0.4} />
                          </TouchableOpacity>
                          <View style={styles.recipeHeader}>
                            <Sparkles color={COLORS.sage} size={14} />
                            <Text style={styles.recipeTitle}>L'IDÉE DU CHEF</Text>
                          </View>
                          <Text style={styles.recipeText}>"{generatedRecipes[item.id]}"</Text>
                        </View>
                      )}

                      <View style={styles.cardFooter}>
                        <View style={styles.userInfo}>
                          <Image source={{ uri: item.profiles?.avatar_url || 'https://ui-avatars.com/api/?name=Anonyme' }} style={styles.userAvatar} />
                          <View>
                            <Text style={styles.userName}>{item.profiles?.username || 'Anonyme'}</Text>
                            <Text style={styles.userMeta}>
                              <MapPin color={COLORS.forest} size={10} opacity={0.5} /> {getRealOrMockDistance(item)} • {getTimeAgo(item.created_at)}
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity style={styles.actionButton} onPress={() => openRequestModal(item)}>
                          <MessageCircle color={COLORS.oat} size={20} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        )}

        {activeTab === 'messages' && (
          <View style={{ flex: 1 }}>
            {activeChat ? (
              <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}>
                <View style={styles.chatHeader}>
                  <TouchableOpacity onPress={() => setActiveChat(null)}>
                    <X color={COLORS.forest} size={24} />
                  </TouchableOpacity>
                  <Text style={styles.chatTitle}>{activeChat.donations?.title}</Text>
                  <Image 
                    source={{ uri: (activeChat.requester_id === session.user.id ? activeChat.owner?.avatar_url : activeChat.requester?.avatar_url) || 'https://ui-avatars.com/api/?name=Anonyme' }} 
                    style={{ width: 32, height: 32, borderRadius: 16 }} 
                  />
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
                
                {conversations.length === 0 ? (
                  <Text style={styles.emptyText}>Aucune conversation.</Text>
                ) : (
                  conversations.map((conv) => {
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
                    <Text style={styles.label}>DESCRIPTION</Text>
                    <TouchableOpacity style={styles.magicBtn} onPress={handleEnhanceDescription} disabled={isEnhancingDesc}>
                      {isEnhancingDesc ? <ActivityIndicator color={COLORS.terracotta} size="small" /> : <Sparkles color={COLORS.terracotta} size={14} />}
                      <Text style={styles.magicBtnText}>Magie IA</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={styles.textArea}
                    placeholder="Quelques détails (allergènes, contenants...)"
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

                  <Text style={[styles.label, { marginTop: 24 }]}>ADRESSE DE RETRAIT</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Votre adresse (pré-remplie)"
                    placeholderTextColor={`${COLORS.forest}40`}
                    value={newAddress}
                    onChangeText={setNewAddress}
                  />

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
              {donations.filter(d => d.user_id === session.user.id).length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Info color={`${COLORS.forest}20`} size={48} />
                  <Text style={styles.emptyText}>Vous n'avez pas encore publié de don.</Text>
                </View>
              ) : (
                donations.filter(d => d.user_id === session.user.id).map((item) => (
                  <View key={item.id} style={styles.manageCard}>
                    <Image source={{ uri: item.image_url || 'https://via.placeholder.com/150' }} style={styles.manageCardImage} />
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
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.profileHeaderPremium}>
              <View style={styles.avatarContainer}>
                <Image source={{ uri: profile?.avatar_url ? profile.avatar_url.replace(/ /g, '%20') : 'https://ui-avatars.com/api/?name=Anonyme' }} style={styles.profileAvatarLarge} />
                <View style={styles.editAvatarBadge}>
                  <Camera color={COLORS.oat} size={14} />
                </View>
              </View>
              <Text style={styles.profileNameLarge}>{profile.username}</Text>
              <View style={styles.locationBadge}>
                <MapPin color={COLORS.forest} size={12} />
                <Text style={styles.locationBadgeText}>{profile.address || 'France'}</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{donations.filter(d => d.user_id === session.user.id).length}</Text>
                <Text style={styles.statLabel}>Dons</Text>
              </View>
              <View style={styles.dividerStat} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>12</Text>
                <Text style={styles.statLabel}>Sauvés</Text>
              </View>
              <View style={styles.dividerStat} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>4.8</Text>
                <Text style={styles.statLabel}>Score</Text>
              </View>
            </View>

            <View style={styles.menuSection}>
              <Text style={styles.menuSectionTitle}>Paramètres</Text>
              
              <TouchableOpacity style={styles.menuItemPremium}>
                <View style={styles.menuIconBoxPremium}><Settings color={COLORS.forest} size={20} /></View>
                <Text style={styles.menuTextPremium}>Préférences</Text>
                <ChevronRight color={`${COLORS.forest}30`} size={20} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItemPremium}>
                <View style={styles.menuIconBoxPremium}><Info color={COLORS.forest} size={20} /></View>
                <Text style={styles.menuTextPremium}>Aide & Support</Text>
                <ChevronRight color={`${COLORS.forest}30`} size={20} />
              </TouchableOpacity>

              <TouchableOpacity style={[styles.menuItemPremium, { marginTop: 12 }]} onPress={onLogout}>
                <View style={[styles.menuIconBoxPremium, { backgroundColor: `${COLORS.terracotta}15` }]}><LogOut color={COLORS.terracotta} size={20} /></View>
                <Text style={[styles.menuTextPremium, { color: COLORS.terracotta }]}>Se déconnecter</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
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

      {/* BOTTOM NAV */}
      {!activeChat && (
        <View style={styles.navContainer}>
          <View style={styles.navBar}>
            <TouchableOpacity style={styles.navItem} onPress={() => { setActiveTab('explore'); setActiveChat(null); }}>
              <Home color={COLORS.oat} size={24} opacity={activeTab === 'explore' ? 1 : 0.5} />
              <Text style={[styles.navText, { opacity: activeTab === 'explore' ? 1 : 0.5 }]}>Explorer</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navPlusWrapper} onPress={() => setActiveTab('give')}>
              <View style={styles.navPlus}>
                <Plus color={COLORS.oat} size={28} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('messages')}>
              <MessageCircle color={COLORS.oat} size={24} opacity={activeTab === 'messages' ? 1 : 0.5} />
              <Text style={[styles.navText, { opacity: activeTab === 'messages' ? 1 : 0.5 }]}>Messages</Text>
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
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${COLORS.sand}40`,
    borderWidth: 1,
    borderColor: COLORS.sand,
    borderStyle: 'dashed',
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 16,
  },
  aiButtonText: {
    color: COLORS.forest,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  recipeBox: {
    backgroundColor: `${COLORS.sage}20`,
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
  },
  recipeClose: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  recipeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recipeTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.sage,
    letterSpacing: 1,
    marginLeft: 6,
  },
  recipeText: {
    fontSize: 14,
    color: COLORS.forest,
    fontStyle: 'italic',
    lineHeight: 22,
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
  magicBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  magicBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.terracotta,
    marginLeft: 4,
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
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.forest,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.forest}10`,
    paddingHorizontal: 12,
    paddingVertical: 4,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(27, 60, 53, 0.4)',
    justifyContent: 'flex-end',
  },
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
  }
});
