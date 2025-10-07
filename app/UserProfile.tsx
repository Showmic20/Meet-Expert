import { Text, View } from "react-native";
export default function TempUserProfile() {
  console.warn("⚠️ Someone navigated to 'UserProfile'!");
  return <View style={{flex:1,justifyContent:"center",alignItems:"center"}}><Text>UserProfile (temp)</Text></View>;
}
