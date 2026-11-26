import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Switch,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SHADOWS } from '../constants/theme';
import { HeaderBar } from '../components/HeaderBar';
import { FieldRecord, CensusData, CensusAmenities } from '../types';

interface DataCollectionScreenProps {
  onBack: () => void;
  onOpenMenu: () => void;
  isOnline: boolean;
  onSaveRecord: (record: Partial<FieldRecord>, isDraft: boolean) => void;
  initialRecord?: FieldRecord | null;
}

const SOCIAL_CATEGORIES: ('General' | 'OBC' | 'SC' | 'ST')[] = ['General', 'OBC', 'SC', 'ST'];
const HOUSE_TYPES: ('Pucca (Concrete)' | 'Semi-Pucca' | 'Kutcha (Mud/Thatch)')[] = [
  'Pucca (Concrete)',
  'Semi-Pucca',
  'Kutcha (Mud/Thatch)',
];
const INCOME_BRACKETS: ('< ₹50,000' | '₹50,000 - ₹1,50,000' | '₹1,50,000 - ₹3,00,000' | '> ₹3,00,000')[] = [
  '< ₹50,000',
  '₹50,000 - ₹1,50,000',
  '₹1,50,000 - ₹3,00,000',
  '> ₹3,00,000',
];
const OCCUPATIONS: ('Agriculture / Farming' | 'Daily Wage Labour' | 'Government / Public Sector' | 'Private Sector' | 'Self-Employed / Business' | 'Unemployed / Other')[] = [
  'Agriculture / Farming',
  'Daily Wage Labour',
  'Government / Public Sector',
  'Private Sector',
  'Self-Employed / Business',
  'Unemployed / Other',
];

export const DataCollectionScreen: React.FC<DataCollectionScreenProps> = ({
  onBack,
  onOpenMenu,
  isOnline,
  onSaveRecord,
  initialRecord,
}) => {
  const isEditingDraft = Boolean(
    initialRecord && (initialRecord.status === 'draft' || initialRecord.status === 'rejected')
  );
  const d = initialRecord?.data;
  const hasInitialCoords = Boolean(
    initialRecord?.coordinates &&
      (initialRecord.coordinates.latitude !== 0 || initialRecord.coordinates.longitude !== 0)
  );

  // Location & Locality
  const [siteLocation, setSiteLocation] = useState(initialRecord?.siteName || '');
  const [buildingNo, setBuildingNo] = useState(d?.buildingNo || '');
  const [latitude, setLatitude] = useState(
    hasInitialCoords ? initialRecord!.coordinates.latitude : 0
  );
  const [longitude, setLongitude] = useState(
    hasInitialCoords ? initialRecord!.coordinates.longitude : 0
  );
  const [gpsLocked, setGpsLocked] = useState(hasInitialCoords);
  const [gpsAccuracy, setGpsAccuracy] = useState(
    hasInitialCoords && initialRecord?.coordinates?.accuracy
      ? `${initialRecord.coordinates.accuracy}m`
      : 'Not locked'
  );
  const [isLocating, setIsLocating] = useState(false);

  // Head of Family Details (Blank by default)
  const [headName, setHeadName] = useState(d?.headName || '');
  const [aadharNumber, setAadharNumber] = useState(d?.aadharNumber || '');
  const [phoneNumber, setPhoneNumber] = useState(d?.phoneNumber || '');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>(d?.gender || 'Male');
  const [age, setAge] = useState(d?.age || '');

  // Household Details (Blank by default)
  const [totalMembers, setTotalMembers] = useState(d?.totalMembers || '');
  const [adultCount, setAdultCount] = useState(d?.adultCount || '');
  const [childCount, setChildCount] = useState(d?.childCount || '');
  const [socialCategory, setSocialCategory] = useState<'General' | 'OBC' | 'SC' | 'ST'>(d?.socialCategory || 'General');
  const [primaryLanguage, setPrimaryLanguage] = useState(d?.primaryLanguage || '');

  // Housing & Living Conditions
  const [houseType, setHouseType] = useState<'Pucca (Concrete)' | 'Semi-Pucca' | 'Kutcha (Mud/Thatch)'>(
    d?.houseType || 'Pucca (Concrete)'
  );
  const [ownershipStatus, setOwnershipStatus] = useState<'Owned' | 'Rented' | 'Government Allotted' | 'Other'>(
    d?.ownershipStatus || 'Owned'
  );

  // Amenities Checkboxes (All false by default for clean survey)
  const [amenities, setAmenities] = useState<CensusAmenities>(
    d?.amenities || {
      electricity: false,
      pipedWater: false,
      sanitationToilet: false,
      lpgGas: false,
      rationCard: false,
      internetAccess: false,
      solarPower: false,
      bankAccount: false,
    }
  );

  // Socio-Economic Profile
  const [primaryOccupation, setPrimaryOccupation] = useState<'Agriculture / Farming' | 'Daily Wage Labour' | 'Government / Public Sector' | 'Private Sector' | 'Self-Employed / Business' | 'Unemployed / Other'>(
    d?.primaryOccupation || 'Agriculture / Farming'
  );
  const [annualIncomeBracket, setAnnualIncomeBracket] = useState<'< ₹50,000' | '₹50,000 - ₹1,50,000' | '₹1,50,000 - ₹3,00,000' | '> ₹3,00,000'>(
    d?.annualIncomeBracket || '< ₹50,000'
  );
  const [notes, setNotes] = useState(d?.notes || '');

  // Photo state
  const [photoUri, setPhotoUri] = useState<string | null>(initialRecord?.photoUri || null);
  const [photoStats, setPhotoStats] = useState<string | null>(initialRecord?.photoCompressedSize || null);
  const [isPhotoLoading, setIsPhotoLoading] = useState(false);

  // Back button interception: ask to save to draft if anything is typed (Requirement 2)
  const handleBackPress = useCallback(() => {
    const hasInput = Boolean(
      headName.trim() ||
      aadharNumber.trim() ||
      phoneNumber.trim() ||
      siteLocation.trim() ||
      buildingNo.trim() ||
      totalMembers.trim() ||
      age.trim() ||
      notes.trim() ||
      photoUri
    );

    if (hasInput) {
      Alert.alert(
        'Save to Draft?',
        'Do you want to save what you entered as a draft before leaving?',
        [
          {
            text: 'No, Discard',
            style: 'destructive',
            onPress: () => onBack(),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Yes, Save Draft',
            onPress: () => handleSave(true),
          },
        ]
      );
    } else {
      onBack();
    }
  }, [headName, aadharNumber, phoneNumber, siteLocation, buildingNo, totalMembers, age, notes, photoUri, onBack]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBackPress();
      return true;
    });
    return () => sub.remove();
  }, [handleBackPress]);

  // Format Aadhaar: XXXX XXXX XXXX
  const handleAadharChange = (text: string) => {
    const raw = text.replace(/[^0-9]/g, '').slice(0, 12);
    const parts = [];
    for (let i = 0; i < raw.length; i += 4) {
      parts.push(raw.substring(i, i + 4));
    }
    setAadharNumber(parts.join(' '));
  };

  const handleToggleAmenity = (key: keyof CensusAmenities) => {
    setAmenities((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleCaptureGPS = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const lat = parseFloat(loc.coords.latitude.toFixed(4));
        const lng = parseFloat(loc.coords.longitude.toFixed(4));
        setLatitude(lat);
        setLongitude(lng);
        setGpsLocked(true);
        setGpsAccuracy(`${loc.coords.accuracy ? loc.coords.accuracy.toFixed(1) : '3.5'}m`);
        if (!siteLocation.trim()) {
          setSiteLocation(`Geo Coordinates (${lat}, ${lng})`);
        }
        Alert.alert('GPS Coordinates Locked', `Lat: ${lat}° N, Long: ${lng}° E`);
        setIsLocating(false);
        return;
      }
    } catch {}
    setIsLocating(false);
    Alert.alert('GPS Notice', 'Could not access device GPS sensor. Please enter locality manually.');
  };

  const processImageResult = (result: ImagePicker.ImagePickerResult) => {
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      if (asset.base64) {
        const dataUri = `data:image/jpeg;base64,${asset.base64}`;
        setPhotoUri(dataUri);
        const estKb = Math.round((asset.base64.length * 0.75) / 1024);
        setPhotoStats(`Compressed: ${estKb} KB (Sync Ready)`);
      } else {
        setPhotoUri(asset.uri);
        setPhotoStats('Attached');
      }
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please enable camera access.');
        return;
      }
      setIsPhotoLoading(true);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.25,
        base64: true,
      });
      processImageResult(result);
    } catch (err) {
      Alert.alert('Error', 'Could not open camera.');
    } finally {
      setIsPhotoLoading(false);
    }
  };

  const handlePickFromGallery = async () => {
    try {
      setIsPhotoLoading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.25,
        base64: true,
      });
      processImageResult(result);
    } catch (err) {
      Alert.alert('Error', 'Could not access gallery.');
    } finally {
      setIsPhotoLoading(false);
    }
  };

  const commitSave = (isDraft: boolean) => {
    const censusPayload: CensusData = {
      headName: headName.trim(),
      aadharNumber: aadharNumber.trim(),
      phoneNumber: phoneNumber.trim(),
      gender,
      age: age.trim(),
      buildingNo: buildingNo.trim(),
      totalMembers: totalMembers.trim() || '1',
      adultCount: adultCount.trim(),
      childCount: childCount.trim(),
      socialCategory,
      primaryLanguage: primaryLanguage.trim(),
      houseType,
      ownershipStatus,
      amenities,
      primaryOccupation,
      annualIncomeBracket,
      notes: notes.trim(),
    };

    const recordToSave: Partial<FieldRecord> = {
      ...(initialRecord?.id ? { id: initialRecord.id } : {}),
      siteName: `${buildingNo.trim() ? buildingNo.trim() + ', ' : ''}${siteLocation.trim() || 'Survey Site'}`,
      coordinates: {
        latitude,
        longitude,
        accuracy: gpsLocked ? parseFloat(gpsAccuracy) || 4.0 : undefined,
      },
      observationType: 'Digital Census 2026',
      data: censusPayload,
      photoUri: photoUri || undefined,
      photoCompressedSize: photoStats || undefined,
    };

    onSaveRecord(recordToSave, isDraft);
  };

  const handleSave = (isDraft: boolean) => {
    if (!isDraft) {
      if (!headName.trim()) {
        Alert.alert('Required Field', 'Please enter Head of Family Name.');
        return;
      }
      const cleanAadhar = aadharNumber.replace(/\s/g, '');
      if (cleanAadhar.length !== 12) {
        Alert.alert('Required Field', 'Please enter a valid 12-digit Aadhaar Card Number.');
        return;
      }
      if (!phoneNumber.trim() || phoneNumber.replace(/[^0-9]/g, '').length < 10) {
        Alert.alert('Required Field', 'Please enter a 10-digit mobile phone number.');
        return;
      }
      if (!siteLocation.trim()) {
        Alert.alert('Required Field', 'Please enter Locality / Village name.');
        return;
      }
      if (age.trim()) {
        const ageNum = Number(age.trim());
        if (!Number.isFinite(ageNum) || ageNum < 1 || ageNum > 120) {
          Alert.alert('Invalid Age', 'Please enter a valid age between 1 and 120.');
          return;
        }
      }
      if (totalMembers.trim()) {
        const totalNum = Number(totalMembers.trim());
        if (!Number.isInteger(totalNum) || totalNum < 1) {
          Alert.alert('Invalid Family Size', 'Total Members must be at least 1.');
          return;
        }
        if (adultCount.trim() && childCount.trim()) {
          const adults = Number(adultCount.trim());
          const children = Number(childCount.trim());
          if (adults + children !== totalNum) {
            Alert.alert(
              'Member Count Mismatch',
              `Adults (${adults}) + Children (${children}) must equal Total Members (${totalNum}).`
            );
            return;
          }
        }
      }
      if (!gpsLocked) {
        Alert.alert(
          'GPS Location Not Locked',
          'You have not locked GPS coordinates for this household yet.',
          [
            { text: 'Lock GPS Now', onPress: handleCaptureGPS },
            { text: 'Submit Without GPS', onPress: () => commitSave(false) },
          ]
        );
        return;
      }
    }

    commitSave(isDraft);
  };

  return (
    <View style={styles.container}>
      <HeaderBar
        title={isEditingDraft ? 'Edit Census Draft' : 'Census Survey Form'}
        showBack={true}
        onBack={handleBackPress}
        onOpenMenu={onOpenMenu}
        isOnline={isOnline}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={styles.bannerHeader}>
          <View style={styles.bannerIconCircle}>
            <Ionicons name="document-text" size={22} color="#ffffff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>
              {isEditingDraft ? 'Complete Saved Draft' : 'Household Census Enumeration'}
            </Text>
            <Text style={styles.bannerSubtitle}>
              {isEditingDraft
                ? 'Resume and finalize your offline survey submission'
                : 'Form 2B • Enter details as verified with family head'}
            </Text>
          </View>
        </View>

        {/* SECTION 1: Location & Building Details */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="location" size={20} color="#7c3aed" />
            <Text style={styles.cardHeaderTitle}>1. Locality & Building</Text>
          </View>

          <Text style={styles.fieldLabel}>Ward / Village / Census Locality *</Text>
          <TextInput
            style={styles.input}
            value={siteLocation}
            onChangeText={setSiteLocation}
            placeholder="Enter ward, village or street name"
            placeholderTextColor="#9ca3af"
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.fieldLabel}>House / Building No.</Text>
              <TextInput
                style={styles.input}
                value={buildingNo}
                onChangeText={setBuildingNo}
                placeholder="e.g. H-12"
                placeholderTextColor="#9ca3af"
              />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.fieldLabel}>GPS Accuracy</Text>
              <View style={[styles.input, { justifyContent: 'center', backgroundColor: '#f8fafc' }]}>
                <Text style={{ color: gpsLocked ? '#059669' : '#d97706', fontWeight: '700' }}>
                  {gpsLocked ? `± ${gpsAccuracy}` : 'Not locked'}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.gpsButton}
            onPress={handleCaptureGPS}
            disabled={isLocating}
            activeOpacity={0.8}
          >
            {isLocating ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Ionicons name="navigate-circle" size={20} color="#ffffff" />
                <Text style={styles.gpsButtonText}>
                  {gpsLocked
                    ? `GPS Locked (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
                    : 'Tap to Lock GPS Location'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* SECTION 2: Head of Household */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="person" size={20} color="#2563eb" />
            <Text style={styles.cardHeaderTitle}>2. Head of Family Details</Text>
          </View>

          <Text style={styles.fieldLabel}>Full Name of Head of Family *</Text>
          <TextInput
            style={styles.input}
            value={headName}
            onChangeText={setHeadName}
            placeholder="Enter full legal name"
            placeholderTextColor="#9ca3af"
          />

          <Text style={styles.fieldLabel}>Aadhaar Card Number (12 Digits) *</Text>
          <View style={styles.aadharInputWrap}>
            <Ionicons name="card" size={20} color="#7c3aed" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.aadharInput}
              value={aadharNumber}
              onChangeText={handleAadharChange}
              placeholder="XXXX XXXX XXXX"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              maxLength={14}
            />
            {aadharNumber.replace(/\s/g, '').length === 12 && (
              <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
            )}
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1.2, marginRight: 8 }}>
              <Text style={styles.fieldLabel}>Mobile Number *</Text>
              <TextInput
                style={styles.input}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="10-digit Mobile"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
            <View style={{ flex: 0.8, marginLeft: 8 }}>
              <Text style={styles.fieldLabel}>Age</Text>
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={setAge}
                placeholder="Years"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                maxLength={3}
              />
            </View>
          </View>

          <Text style={styles.fieldLabel}>Gender</Text>
          <View style={styles.chipRow}>
            {(['Male', 'Female', 'Other'] as const).map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.chip, gender === g && styles.chipActive]}
                onPress={() => setGender(g)}
              >
                <Text style={[styles.chipText, gender === g && styles.chipTextActive]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* SECTION 3: Household Composition */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="people-circle" size={20} color="#059669" />
            <Text style={styles.cardHeaderTitle}>3. Household Demographics</Text>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 6 }}>
              <Text style={styles.fieldLabel}>Total Members *</Text>
              <TextInput
                style={styles.input}
                value={totalMembers}
                onChangeText={setTotalMembers}
                placeholder="Total"
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1, marginHorizontal: 3 }}>
              <Text style={styles.fieldLabel}>Adults</Text>
              <TextInput
                style={styles.input}
                value={adultCount}
                onChangeText={setAdultCount}
                placeholder="Adults"
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1, marginLeft: 6 }}>
              <Text style={styles.fieldLabel}>Children</Text>
              <TextInput
                style={styles.input}
                value={childCount}
                onChangeText={setChildCount}
                placeholder="Kids"
                keyboardType="numeric"
              />
            </View>
          </View>

          <Text style={styles.fieldLabel}>Social Category</Text>
          <View style={styles.chipRow}>
            {SOCIAL_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, socialCategory === cat && styles.chipActive]}
                onPress={() => setSocialCategory(cat)}
              >
                <Text style={[styles.chipText, socialCategory === cat && styles.chipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Primary Language / Mother Tongue</Text>
          <TextInput
            style={styles.input}
            value={primaryLanguage}
            onChangeText={setPrimaryLanguage}
            placeholder="Enter primary language"
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* SECTION 4: Housing & Infrastructure */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="home" size={20} color="#ea580c" />
            <Text style={styles.cardHeaderTitle}>4. Housing & Living Conditions</Text>
          </View>

          <Text style={styles.fieldLabel}>House Construction Type</Text>
          <View style={styles.chipColumn}>
            {HOUSE_TYPES.map((ht) => (
              <TouchableOpacity
                key={ht}
                style={[styles.chipItemWide, houseType === ht && styles.chipItemWideActive]}
                onPress={() => setHouseType(ht)}
              >
                <Ionicons
                  name={houseType === ht ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={houseType === ht ? '#7c3aed' : '#9ca3af'}
                />
                <Text style={[styles.chipItemWideText, houseType === ht && styles.chipItemWideTextActive]}>
                  {ht}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Ownership Status</Text>
          <View style={styles.chipRow}>
            {(['Owned', 'Rented', 'Government Allotted'] as const).map((own) => (
              <TouchableOpacity
                key={own}
                style={[styles.chip, ownershipStatus === own && styles.chipActive]}
                onPress={() => setOwnershipStatus(own)}
              >
                <Text style={[styles.chipText, ownershipStatus === own && styles.chipTextActive]}>
                  {own}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* SECTION 5: Household Amenities */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="checkbox" size={20} color="#16a34a" />
            <Text style={styles.cardHeaderTitle}>5. Household Amenities & Facilities</Text>
          </View>

          {[
            { key: 'electricity', label: 'Electricity Grid Connection', icon: 'flash' },
            { key: 'pipedWater', label: 'Piped Drinking Water Tap', icon: 'water' },
            { key: 'sanitationToilet', label: 'Individual Household Latrine (IHHL)', icon: 'shield-checkmark' },
            { key: 'lpgGas', label: 'LPG Clean Cooking Gas', icon: 'flame' },
            { key: 'rationCard', label: 'Ration Card Holder (NFSA / BPL / AAY)', icon: 'receipt' },
            { key: 'internetAccess', label: 'Smartphone & Active Internet', icon: 'wifi' },
            { key: 'bankAccount', label: 'Bank Account (Jan Dhan / Savings)', icon: 'wallet' },
            { key: 'solarPower', label: 'Solar Rooftop / Renewable Energy', icon: 'sunny' },
          ].map((item) => {
            const isChecked = Boolean(amenities[item.key as keyof CensusAmenities]);
            return (
              <TouchableOpacity
                key={item.key}
                style={styles.checkboxRow}
                onPress={() => handleToggleAmenity(item.key as keyof CensusAmenities)}
                activeOpacity={0.7}
              >
                <View style={styles.checkboxLeft}>
                  <View style={[styles.amenityIconCircle, isChecked && { backgroundColor: '#f3e8ff' }]}>
                    <Ionicons
                      name={item.icon as any}
                      size={18}
                      color={isChecked ? '#7c3aed' : '#6b7280'}
                    />
                  </View>
                  <Text style={[styles.checkboxLabel, isChecked && { color: COLORS.textPrimary, fontWeight: '600' }]}>
                    {item.label}
                  </Text>
                </View>
                <Switch
                  value={isChecked}
                  onValueChange={() => handleToggleAmenity(item.key as keyof CensusAmenities)}
                  trackColor={{ false: '#e2e8f0', true: '#c084fc' }}
                  thumbColor={isChecked ? '#7c3aed' : '#f8fafc'}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* SECTION 6: Socio-Economic Profile */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="briefcase" size={20} color="#0891b2" />
            <Text style={styles.cardHeaderTitle}>6. Socio-Economic Profile</Text>
          </View>

          <Text style={styles.fieldLabel}>Primary Household Occupation</Text>
          <View style={styles.chipColumn}>
            {OCCUPATIONS.map((occ) => (
              <TouchableOpacity
                key={occ}
                style={[styles.chipItemWide, primaryOccupation === occ && styles.chipItemWideActive]}
                onPress={() => setPrimaryOccupation(occ)}
              >
                <Ionicons
                  name={primaryOccupation === occ ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={primaryOccupation === occ ? '#0891b2' : '#9ca3af'}
                />
                <Text style={[styles.chipItemWideText, primaryOccupation === occ && styles.chipItemWideTextActive]}>
                  {occ}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Annual Household Income Bracket</Text>
          <View style={styles.chipRow}>
            {INCOME_BRACKETS.map((inc) => (
              <TouchableOpacity
                key={inc}
                style={[styles.chip, annualIncomeBracket === inc && styles.chipActive]}
                onPress={() => setAnnualIncomeBracket(inc)}
              >
                <Text style={[styles.chipText, annualIncomeBracket === inc && styles.chipTextActive]}>
                  {inc}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* SECTION 7: Geo-Tagged House Photo */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="camera" size={20} color="#7c3aed" />
            <Text style={styles.cardHeaderTitle}>7. Geo-Tagged House Photo</Text>
          </View>

          {photoUri ? (
            <View style={styles.photoPreviewContainer}>
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
              <View style={styles.photoBadgeRow}>
                <Ionicons name="shield-checkmark" size={16} color="#16a34a" />
                <Text style={styles.photoBadgeText}>
                  {photoStats || 'Photo attached'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="image-outline" size={38} color="#cbd5e1" />
              <Text style={styles.photoPlaceholderText}>No photo attached</Text>
            </View>
          )}

          <View style={styles.photoButtonRow}>
            <TouchableOpacity
              style={styles.photoActionButton}
              onPress={handleTakePhoto}
              activeOpacity={0.8}
            >
              <Ionicons name="camera" size={18} color="#7c3aed" />
              <Text style={styles.photoActionButtonText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.photoActionButton, { backgroundColor: '#f3e8ff' }]}
              onPress={handlePickFromGallery}
              activeOpacity={0.8}
            >
              <Ionicons name="images" size={18} color="#7c3aed" />
              <Text style={styles.photoActionButtonText}>Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SECTION 8: Field Notes */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="document-text" size={20} color="#6b7280" />
            <Text style={styles.cardHeaderTitle}>8. Surveyor Remarks</Text>
          </View>
          <TextInput
            style={[styles.input, { height: 75, textAlignVertical: 'top' }]}
            value={notes}
            onChangeText={setNotes}
            multiline={true}
            placeholder="Enter any additional observations or notes..."
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.draftButton}
            onPress={() => handleSave(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="save-outline" size={18} color="#4b5563" />
            <Text style={styles.draftButtonText}>
              {isEditingDraft ? 'Update Draft' : 'Save Draft'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={() => handleSave(false)}
            activeOpacity={0.85}
          >
            <Ionicons name="cloud-upload" size={18} color="#ffffff" />
            <Text style={styles.submitButtonText}>
              {isEditingDraft ? 'Final Submit' : 'Submit Survey'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    ...SHADOWS.card,
  },
  bannerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#ede9fe',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...SHADOWS.card,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  aadharInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#c084fc',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  aadharInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
    color: '#581c87',
    letterSpacing: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7c3aed',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 12,
    gap: 6,
  },
  gpsButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  chipActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  chipColumn: {
    gap: 8,
    marginTop: 4,
  },
  chipItemWide: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    gap: 10,
  },
  chipItemWideActive: {
    borderColor: '#7c3aed',
    backgroundColor: '#faf5ff',
  },
  chipItemWideText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4b5563',
  },
  chipItemWideTextActive: {
    color: '#7c3aed',
    fontWeight: '700',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  checkboxLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 10,
  },
  amenityIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLabel: {
    fontSize: 13,
    color: '#4b5563',
  },
  photoPreviewContainer: {
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  photoPreview: {
    width: '100%',
    height: 180,
    backgroundColor: '#e2e8f0',
  },
  photoBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 8,
    gap: 6,
  },
  photoBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#16a34a',
  },
  photoPlaceholder: {
    width: '100%',
    height: 110,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    backgroundColor: '#f8fafc',
  },
  photoPlaceholderText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 6,
  },
  photoButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  photoActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#c084fc',
    backgroundColor: '#ffffff',
    gap: 6,
  },
  photoActionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7c3aed',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  draftButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 6,
  },
  draftButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4b5563',
  },
  submitButton: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 6,
    ...SHADOWS.card,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
