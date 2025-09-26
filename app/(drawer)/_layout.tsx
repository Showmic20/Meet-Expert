import { Drawer } from "expo-router/drawer";
import CustomDrawerContent from "../navigation/drawerContent";

export default function DrawerLayout() {
  return (
    <Drawer screenOptions={{ headerShown: false }}
            drawerContent={(p) => <CustomDrawerContent {...p} />}>
      <Drawer.Screen name="(tabs)" options={{ headerShown: false }} />
    </Drawer>
  );
}
