import { View, Text, ActivityIndicator } from 'react-native'
import React from 'react'
import { useAuth } from '../../lib/AuthProvid';
import { Redirect } from 'expo-router';

const Home = () => {
    const{session,loading} = useAuth();
    if(loading){
      return <ActivityIndicator></ActivityIndicator>
    }
    if(!session)
      return <Redirect href="/(auth)/signup" />;

  return (
    <View>
      <Text style={{flex:1, justifyContent: "center"}}>home</Text>
    </View>
  )
}

export default Home