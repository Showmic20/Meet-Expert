
import React from 'react'
import { Redirect } from 'expo-router';
import { useAuth } from './lib/AuthProvid';

const Index = () => {
  const{session} = useAuth();
  if(!session)
  return <Redirect href="/(auth)/login" />;
  
}

export default Index