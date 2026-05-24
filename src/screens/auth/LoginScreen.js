import React, { useState, useContext } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useTheme } from 'react-native-paper';
import { LanguageContext } from '../../contexts/LanguageContext';
import { AuthContext } from '../../contexts/AuthContext';
import apiService from '../../services/apiService';

const loginSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  password: Yup.string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

export default function LoginScreen({ navigation }) {
  const theme = useTheme();
  const { t } = useContext(LanguageContext);
  const { login } = useContext(AuthContext);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (values) => {
    setIsSubmitting(true);
    
    try {
      const loginResponse = await apiService.login(values.email, values.password);
      
      if (loginResponse.success) {
        // Pass the complete login response to AuthContext
        const authResult = await login(loginResponse);
        
        if (authResult.success) {
          // Successfully logged in and profile fetched
          console.log('Login successful for user ID:', loginResponse.user_id);
          navigation.replace('Dashboard');
        } else {
          Alert.alert('Login Error', authResult.error || 'Failed to complete login');
        }
      } else {
        // Show specific error messages
        let errorMessage = loginResponse.message || loginResponse.error || 'Login failed';
        
        if (errorMessage?.includes('Invalid credentials') || errorMessage?.includes('invalid')) {
          errorMessage = 'Invalid email or password. Please try again.';
        } else if (errorMessage?.includes('not active')) {
          errorMessage = 'Your account is not active. Please contact support.';
        } else if (loginResponse.offline) {
          errorMessage = 'Unable to connect to server. Please check your internet connection.';
        }
        
        Alert.alert('Login Failed', errorMessage);
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert(
        'Error', 
        'An error occurred during login. Please try again.\n\nError: ' + error.message
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const initialValues = {
    email: '',
    password: '',
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: '#1e3a8a' }]}>
            Welcome Back
          </Text>
          <Text style={[styles.subtitle, { color: '#6b7280' }]}>
            Sign in to your GestionMicroDons account
          </Text>
        </View>

        <Formik
          initialValues={initialValues}
          validationSchema={loginSchema}
          onSubmit={handleLogin}
        >
          {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
            <View style={styles.form}>
              <TextInput
                label="Email Address"
                value={values.email}
                onChangeText={handleChange('email')}
                onBlur={handleBlur('email')}
                error={touched.email && errors.email}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                disabled={isSubmitting}
                style={styles.input}
                left={<TextInput.Icon icon="email" color="#1e3a8a" />}
                outlineColor="#e5e7eb"
                activeOutlineColor="#1e3a8a"
              />
              {touched.email && errors.email && (
                <HelperText type="error" visible={true}>
                  {errors.email}
                </HelperText>
              )}

              <TextInput
                label="Password"
                value={values.password}
                onChangeText={handleChange('password')}
                onBlur={handleBlur('password')}
                error={touched.password && errors.password}
                mode="outlined"
                secureTextEntry={!showPassword}
                disabled={isSubmitting}
                style={styles.input}
                left={<TextInput.Icon icon="lock" color="#1e3a8a" />}
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowPassword(!showPassword)}
                    color="#6b7280"
                  />
                }
                outlineColor="#e5e7eb"
                activeOutlineColor="#1e3a8a"
              />
              {touched.password && errors.password && (
                <HelperText type="error" visible={true}>
                  {errors.password}
                </HelperText>
              )}

              <Button
                mode="text"
                onPress={() => {
                  Alert.alert(
                    'Forgot Password',
                    'Please contact support at support@gestionmicrodons.com to reset your password.',
                    [{ text: 'OK' }]
                  );
                }}
                disabled={isSubmitting}
                style={styles.forgotButton}
                labelStyle={{ color: '#1e3a8a' }}
              >
                Forgot Password?
              </Button>

              <Button
                mode="contained"
                onPress={handleSubmit}
                loading={isSubmitting}
                disabled={isSubmitting}
                style={[styles.loginButton, { backgroundColor: '#1e3a8a' }]}
                contentStyle={styles.loginButtonContent}
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </Button>

              <View style={styles.registerContainer}>
                <Text style={[styles.registerText, { color: '#6b7280' }]}>
                  Don't have an account?{' '}
                </Text>
                <Button
                  mode="text"
                  onPress={() => navigation.navigate('Register')}
                  disabled={isSubmitting}
                  labelStyle={{ color: '#1e3a8a' }}
                >
                  Register
                </Button>
              </View>
            </View>
          )}
        </Formik>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: '#9ca3af' }]}>
            By signing in, you agree to our Terms & Conditions and Privacy Policy
          </Text>
          <View style={styles.securityBadge}>
            <Text style={[styles.securityText, { color: '#10b981' }]}>
              🔒 Secure CRA-Compliant Authentication
            </Text>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.8,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  loginButton: {
    marginBottom: 24,
    borderRadius: 8,
  },
  loginButtonContent: {
    paddingVertical: 8,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  registerText: {
    fontSize: 14,
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
  },
  securityBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  securityText: {
    fontSize: 11,
    fontWeight: '600',
  },
});