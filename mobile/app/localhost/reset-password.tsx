import { Redirect, useLocalSearchParams } from 'expo-router';

export default function ResetPasswordCallbackBridge() {
  const params = useLocalSearchParams();

  return <Redirect href={{ pathname: '/reset-password', params }} />;
}
