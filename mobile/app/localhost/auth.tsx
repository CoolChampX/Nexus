import { Redirect, useLocalSearchParams } from 'expo-router';

export default function OAuthCallbackBridge() {
  const params = useLocalSearchParams();

  return <Redirect href={{ pathname: '/auth', params }} />;
}
