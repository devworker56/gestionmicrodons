import React, { useState, useContext } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { TextInput, Button, Text, HelperText, RadioButton } from 'react-native-paper';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useTheme } from 'react-native-paper';
import { LanguageContext } from '../../contexts/LanguageContext';
import { AuthContext } from '../../contexts/AuthContext';
import apiService from '../../services/apiService';

// Validation schema for CRA-compliant registration
const registrationSchema = Yup.object().shape({
  firstName: Yup.string()
    .required('First name is required')
    .min(2, 'First name must be at least 2 characters'),
  lastName: Yup.string()
    .required('Last name is required')
    .min(2, 'Last name must be at least 2 characters'),
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  password: Yup.string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters'),
  confirmPassword: Yup.string()
    .required('Confirm password is required')
    .oneOf([Yup.ref('password'), null], 'Passwords must match'),
  address: Yup.string()
    .required('Street address is required'),
  city: Yup.string()
    .required('City is required'),
  province: Yup.string()
    .required('Province is required'),
  postalCode: Yup.string()
    .required('Postal code is required')
    .matches(/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/, 'Invalid Canadian postal code'),
  phone: Yup.string()
    .optional()
    .matches(/^(\+?1)?[2-9]\d{9}$/, 'Invalid phone number'),
  termsAccepted: Yup.boolean()
    .oneOf([true], 'You must accept the terms and conditions')
});

// Canadian provinces for selection
const PROVINCES = [
  { value: 'AB', label: 'Alberta' },
  { value: 'BC', label: 'British Columbia' },
  { value: 'MB', label: 'Manitoba' },
  { value: 'NB', label: 'New Brunswick' },
  { value: 'NL', label: 'Newfoundland and Labrador' },
  { value: 'NS', label: 'Nova Scotia' },
  { value: 'ON', label: 'Ontario' },
  { value: 'PE', label: 'Prince Edward Island' },
  { value: 'QC', label: 'Quebec' },
  { value: 'SK', label: 'Saskatchewan' },
  { value: 'NT', label: 'Northwest Territories' },
  { value: 'NU', label: 'Nunavut' },
  { value: 'YT', label: 'Yukon' },
];

export default function RegistrationScreen({ navigation }) {
  const theme = useTheme();
  const { t } = useContext(LanguageContext);
  const { login } = useContext(AuthContext);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async (values) => {
    setIsSubmitting(true);
    try {
      // Call the actual API service for registration
      const registrationResponse = await apiService.register({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
        address: values.address,
        city: values.city,
        province: values.province,
        postalCode: values.postalCode,
        phone: values.phone || '',
        language_preference: 'en',
        optInCharityComms: false
      });
      
      if (registrationResponse.success) {
        console.log('✅ Registration successful:', registrationResponse);
        
        // The API returns token and user_id in registrationResponse
        // Pass this to AuthContext.login()
        const authResult = await login(registrationResponse);
        
        if (authResult.success) {
          // Navigate to dashboard on success
          navigation.replace('Dashboard');
        } else {
          // Registration succeeded but login failed
          Alert.alert(
            'Registration Complete',
            'Your account was created successfully! Please log in.',
            [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
          );
        }
      } else {
        // Registration failed
        Alert.alert(
          'Registration Failed',
          registrationResponse.message || registrationResponse.error || 'Unknown error'
        );
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert(
        'Registration Error',
        'An unexpected error occurred. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const initialValues = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    phone: '',
    termsAccepted: false,
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: theme.colors.primary }]}>
          Create Your Account
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.text }]}>
          CRA-compliant registration for tax receipts
        </Text>

        <Formik
          initialValues={initialValues}
          validationSchema={registrationSchema}
          onSubmit={handleRegister}
        >
          {({ handleChange, handleBlur, handleSubmit, values, errors, touched, setFieldValue }) => (
            <View style={styles.form}>
              {/* Legal Name (CRA Requirement) */}
              <View style={styles.nameRow}>
                <View style={[styles.nameInput, { marginRight: 10 }]}>
                  <TextInput
                    label="First Name *"
                    value={values.firstName}
                    onChangeText={handleChange('firstName')}
                    onBlur={handleBlur('firstName')}
                    error={touched.firstName && errors.firstName}
                    mode="outlined"
                    autoCapitalize="words"
                    disabled={isSubmitting}
                  />
                  {touched.firstName && errors.firstName && (
                    <HelperText type="error" visible={true}>
                      {errors.firstName}
                    </HelperText>
                  )}
                </View>
                <View style={styles.nameInput}>
                  <TextInput
                    label="Last Name *"
                    value={values.lastName}
                    onChangeText={handleChange('lastName')}
                    onBlur={handleBlur('lastName')}
                    error={touched.lastName && errors.lastName}
                    mode="outlined"
                    autoCapitalize="words"
                    disabled={isSubmitting}
                  />
                  {touched.lastName && errors.lastName && (
                    <HelperText type="error" visible={true}>
                      {errors.lastName}
                    </HelperText>
                  )}
                </View>
              </View>

              {/* Contact Information */}
              <TextInput
                label="Email Address *"
                value={values.email}
                onChangeText={handleChange('email')}
                onBlur={handleBlur('email')}
                error={touched.email && errors.email}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                disabled={isSubmitting}
                style={styles.input}
              />
              {touched.email && errors.email && (
                <HelperText type="error" visible={true}>
                  {errors.email}
                </HelperText>
              )}

              <TextInput
                label="Phone Number (Optional)"
                value={values.phone}
                onChangeText={handleChange('phone')}
                onBlur={handleBlur('phone')}
                error={touched.phone && errors.phone}
                mode="outlined"
                keyboardType="phone-pad"
                disabled={isSubmitting}
                style={styles.input}
              />
              {touched.phone && errors.phone && (
                <HelperText type="error" visible={true}>
                  {errors.phone}
                </HelperText>
              )}

              {/* Canadian Address (CRA Requirement) */}
              <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                Canadian Address for Tax Receipts
              </Text>

              <TextInput
                label="Street Address *"
                value={values.address}
                onChangeText={handleChange('address')}
                onBlur={handleBlur('address')}
                error={touched.address && errors.address}
                mode="outlined"
                disabled={isSubmitting}
                style={styles.input}
              />
              {touched.address && errors.address && (
                <HelperText type="error" visible={true}>
                  {errors.address}
                </HelperText>
              )}

              <View style={styles.cityProvinceRow}>
                <View style={[styles.cityInput, { marginRight: 10 }]}>
                  <TextInput
                    label="City *"
                    value={values.city}
                    onChangeText={handleChange('city')}
                    onBlur={handleBlur('city')}
                    error={touched.city && errors.city}
                    mode="outlined"
                    disabled={isSubmitting}
                  />
                  {touched.city && errors.city && (
                    <HelperText type="error" visible={true}>
                      {errors.city}
                    </HelperText>
                  )}
                </View>
                <View style={styles.provinceInput}>
                  <TextInput
                    label="Province *"
                    value={values.province}
                    onChangeText={handleChange('province')}
                    onBlur={handleBlur('province')}
                    error={touched.province && errors.province}
                    mode="outlined"
                    disabled={isSubmitting}
                  />
                  {touched.province && errors.province && (
                    <HelperText type="error" visible={true}>
                      {errors.province}
                    </HelperText>
                  )}
                </View>
              </View>

              <TextInput
                label="Postal Code *"
                value={values.postalCode}
                onChangeText={(text) => {
                  // Auto-format postal code
                  const formatted = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
                  if (formatted.length > 3) {
                    const part1 = formatted.substring(0, 3);
                    const part2 = formatted.substring(3, 6);
                    setFieldValue('postalCode', `${part1} ${part2}`);
                  } else {
                    setFieldValue('postalCode', formatted);
                  }
                }}
                onBlur={handleBlur('postalCode')}
                error={touched.postalCode && errors.postalCode}
                mode="outlined"
                autoCapitalize="characters"
                disabled={isSubmitting}
                style={styles.input}
                maxLength={7}
              />
              {touched.postalCode && errors.postalCode && (
                <HelperText type="error" visible={true}>
                  {errors.postalCode}
                </HelperText>
              )}

              {/* Password */}
              <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                Security
              </Text>

              <TextInput
                label="Password *"
                value={values.password}
                onChangeText={handleChange('password')}
                onBlur={handleBlur('password')}
                error={touched.password && errors.password}
                mode="outlined"
                secureTextEntry={!showPassword}
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
                disabled={isSubmitting}
                style={styles.input}
              />
              {touched.password && errors.password && (
                <HelperText type="error" visible={true}>
                  {errors.password}
                </HelperText>
              )}

              <TextInput
                label="Confirm Password *"
                value={values.confirmPassword}
                onChangeText={handleChange('confirmPassword')}
                onBlur={handleBlur('confirmPassword')}
                error={touched.confirmPassword && errors.confirmPassword}
                mode="outlined"
                secureTextEntry={!showPassword}
                disabled={isSubmitting}
                style={styles.input}
              />
              {touched.confirmPassword && errors.confirmPassword && (
                <HelperText type="error" visible={true}>
                  {errors.confirmPassword}
                </HelperText>
              )}

              {/* Terms and Conditions */}
              <View style={styles.termsContainer}>
                <RadioButton
                  value={values.termsAccepted}
                  status={values.termsAccepted ? 'checked' : 'unchecked'}
                  onPress={() => setFieldValue('termsAccepted', !values.termsAccepted)}
                  disabled={isSubmitting}
                />
                <View style={styles.termsTextContainer}>
                  <Text style={[styles.termsText, { color: theme.colors.text }]}>
                    I agree to the Terms & Conditions and Privacy Policy *
                  </Text>
                  {touched.termsAccepted && errors.termsAccepted && (
                    <HelperText type="error" visible={true}>
                      {errors.termsAccepted}
                    </HelperText>
                  )}
                </View>
              </View>

              {/* Submit Button */}
              <Button
                mode="contained"
                onPress={handleSubmit}
                loading={isSubmitting}
                disabled={isSubmitting}
                style={[styles.submitButton, { backgroundColor: theme.colors.primary }]}
                contentStyle={styles.submitButtonContent}
              >
                {isSubmitting ? 'Creating Account...' : 'Create Account'}
              </Button>

              {/* Login Link */}
              <View style={styles.loginContainer}>
                <Text style={[styles.loginText, { color: theme.colors.text }]}>
                  Already have an account?{' '}
                </Text>
                <Button
                  mode="text"
                  onPress={() => navigation.navigate('Login')}
                  disabled={isSubmitting}
                  labelStyle={{ color: theme.colors.primary }}
                >
                  Login
                </Button>
              </View>
            </View>
          )}
        </Formik>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 30,
    textAlign: 'center',
    opacity: 0.8,
  },
  form: {
    width: '100%',
  },
  nameRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  nameInput: {
    flex: 1,
  },
  input: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 16,
  },
  cityProvinceRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  cityInput: {
    flex: 2,
  },
  provinceInput: {
    flex: 1,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  termsTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  termsText: {
    fontSize: 14,
    lineHeight: 20,
  },
  submitButton: {
    marginTop: 8,
    marginBottom: 24,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginText: {
    fontSize: 14,
  },
});